/**
 * firebase-sync.js
 * ================
 * 跨裝置即時同步層 (Firebase Realtime Database)
 *
 * 設計原則：
 * 1. 所有操作都向後相容 localStorage
 * 2. 無 Firebase 設定時靜默退回「離線模式」，功能不中斷
 * 3. 透過 window.PetCafeSync 暴露 API，供 data.js 呼叫
 */

(function () {
    'use strict';

    // ===== 設定讀取 =====
    const CONFIG_KEY = 'petCafeFirebaseConfig';

    function getFirebaseConfig() {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (!saved) return null;
        try { return JSON.parse(saved); } catch (e) { return null; }
    }

    function saveFirebaseConfig(cfg) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    }

    // ===== 狀態 =====
    let db = null;                  // Firebase database instance
    let isOnline = false;           // 是否已成功連線 Firebase
    let listeners = {};             // { key: unsubscribeFn }
    let statusCallbacks = [];       // 連線狀態變更回調

    // ===== 初始化 =====
    async function init() {
        const cfg = getFirebaseConfig();
        if (!cfg || !cfg.databaseURL) {
            setStatus(false, 'no-config');
            return;
        }

        try {
            // 動態載入 Firebase SDK (compat v9)
            await loadFirebaseSDK();

            firebase.initializeApp(cfg);
            db = firebase.database();

            // 監聽連線狀態
            db.ref('.info/connected').on('value', snap => {
                const connected = snap.val() === true;
                setStatus(connected, connected ? 'connected' : 'disconnected');
            });

        } catch (err) {
            console.warn('[PetCafeSync] Firebase 初始化失敗，退回離線模式：', err);
            setStatus(false, 'error');
        }
    }

    function loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            // 如果已載入就直接 resolve
            if (window.firebase && window.firebase.database) {
                resolve();
                return;
            }

            const scripts = [
                'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
            ];

            let loaded = 0;
            scripts.forEach(src => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) { loaded++; if (loaded === scripts.length) resolve(); return; }
                const s = document.createElement('script');
                s.src = src;
                s.onload = () => { loaded++; if (loaded === scripts.length) resolve(); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        });
    }

    // ===== 連線狀態管理 =====
    function setStatus(online, reason) {
        isOnline = online;
        updateStatusUI(online, reason);
        statusCallbacks.forEach(cb => cb(online, reason));
    }

    function onStatusChange(cb) {
        statusCallbacks.push(cb);
    }

    function updateStatusUI(online, reason) {
        let indicator = document.getElementById('sync-status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sync-status-indicator';
            indicator.style.cssText = [
                'position:fixed',
                'bottom:1rem',
                'right:1rem',
                'padding:0.4rem 0.85rem',
                'border-radius:20px',
                'font-size:0.78rem',
                'font-weight:600',
                'z-index:9999',
                'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
                'transition:all 0.3s ease',
                'cursor:default',
                'pointer-events:none'
            ].join(';');
            document.body.appendChild(indicator);
        }

        if (online) {
            indicator.textContent = '☁️ 雲端同步中';
            indicator.style.background = '#e8f5e9';
            indicator.style.color = '#2e7d32';
            indicator.style.border = '1px solid #a5d6a7';
            // 3秒後淡出
            clearTimeout(indicator._hideTimer);
            indicator._hideTimer = setTimeout(() => {
                indicator.style.opacity = '0';
            }, 3000);
            indicator.style.opacity = '1';
        } else if (reason === 'no-config') {
            indicator.textContent = '💾 本機模式';
            indicator.style.background = '#f3f4f6';
            indicator.style.color = '#6b7280';
            indicator.style.border = '1px solid #d1d5db';
            indicator.style.opacity = '1';
        } else if (reason === 'disconnected') {
            indicator.textContent = '🔌 連線中斷，使用本機';
            indicator.style.background = '#fff3cd';
            indicator.style.color = '#856404';
            indicator.style.border = '1px solid #ffd166';
            indicator.style.opacity = '1';
        } else {
            indicator.textContent = '⚠️ 同步錯誤，使用本機';
            indicator.style.background = '#fff3cd';
            indicator.style.color = '#856404';
            indicator.style.border = '1px solid #ffd166';
            indicator.style.opacity = '1';
        }
    }

    // ===== 核心 API =====

    /**
     * 寫入資料 — 同時寫到 Firebase + localStorage
     * @param {string} key  - Firebase path key (e.g. 'menu', 'pendingOrders')
     * @param {*} data      - 要儲存的資料
     * @param {string} lsKey - localStorage key（不同時可傳入）
     */
    async function syncWrite(key, data, lsKey) {
        // 永遠先寫 localStorage（離線時也能用）
        const storageKey = lsKey || key;
        localStorage.setItem(storageKey, JSON.stringify(data));

        if (!db || !isOnline) return;

        try {
            await db.ref('petcafe/' + key).set(data);
        } catch (err) {
            console.warn('[PetCafeSync] 寫入 Firebase 失敗：', key, err);
        }
    }

    /**
     * 讀取資料 — 優先從 Firebase，失敗退回 localStorage
     * @param {string} key
     * @param {string} lsKey
     * @returns {Promise<*>}
     */
    async function syncRead(key, lsKey) {
        const storageKey = lsKey || key;

        if (!db || !isOnline) {
            const local = localStorage.getItem(storageKey);
            return local ? JSON.parse(local) : null;
        }

        try {
            const snap = await db.ref('petcafe/' + key).get();
            if (snap.exists()) {
                const data = snap.val();
                // 同步到 localStorage 作為快取
                localStorage.setItem(storageKey, JSON.stringify(data));
                return data;
            }
            // Firebase 沒有資料，用 localStorage 的
            const local = localStorage.getItem(storageKey);
            return local ? JSON.parse(local) : null;
        } catch (err) {
            console.warn('[PetCafeSync] 讀取 Firebase 失敗，退回本機：', key, err);
            const local = localStorage.getItem(storageKey);
            return local ? JSON.parse(local) : null;
        }
    }

    /**
     * 即時監聽 — 當 Firebase 資料變更時觸發 callback
     * @param {string} key
     * @param {Function} callback - 接收最新 data
     * @param {string} lsKey
     */
    function syncListen(key, callback, lsKey) {
        // 先取消舊的監聽
        if (listeners[key]) {
            listeners[key]();
            delete listeners[key];
        }

        if (!db) return; // 離線模式不需要監聽

        const ref = db.ref('petcafe/' + key);
        const handler = ref.on('value', snap => {
            if (!snap.exists()) return;
            const data = snap.val();
            const storageKey = lsKey || key;
            localStorage.setItem(storageKey, JSON.stringify(data));
            callback(data);
        }, err => {
            console.warn('[PetCafeSync] 監聽失敗：', key, err);
        });

        // 取消監聽的 cleanup function
        listeners[key] = () => ref.off('value', handler);
    }

    /**
     * 停止監聽
     */
    function stopListen(key) {
        if (listeners[key]) {
            listeners[key]();
            delete listeners[key];
        }
    }

    /**
     * 從 Firebase 拉取最新資料，并更新 localStorage
     * 用於頁面載入時的初始同步
     */
    async function pullAll() {
        if (!db || !isOnline) return;

        const keys = [
            ['menu',            'petCafeMenu'],
            ['setMealOptions',  'petCafeSetMealOptions'],
            ['drinkSizes',      'petCafeDrinkSizes'],
            ['drinkDiscounts',  'petCafeDrinkDiscounts'],
            ['pendingOrders',   'petCafePendingOrders'],
            ['posQueue',        'petCafePosQueue'],
            ['servedOrders',    'petCafeServedOrders'],
            ['orders',          'petCafeOrders'],
            ['settings',        'petCafeSettings'],
        ];

        await Promise.all(keys.map(([fbKey, lsKey]) => syncRead(fbKey, lsKey)));
    }

    // ===== Firebase 設定驗證 =====
    async function testAndSaveConfig(configJson) {
        let cfg;
        try {
            cfg = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
        } catch (e) {
            throw new Error('JSON 格式有誤，請確認複製完整的設定物件');
        }

        const required = ['apiKey', 'databaseURL', 'projectId'];
        for (const r of required) {
            if (!cfg[r]) throw new Error(`缺少必要欄位：${r}`);
        }

        saveFirebaseConfig(cfg);

        // 重新初始化
        if (window.firebase && firebase.apps && firebase.apps.length > 0) {
            await firebase.app().delete();
        }
        db = null;
        isOnline = false;
        await init();

        return true;
    }

    function clearConfig() {
        localStorage.removeItem(CONFIG_KEY);
        db = null;
        isOnline = false;
        setStatus(false, 'no-config');
    }

    function getConfig() {
        return getFirebaseConfig();
    }

    // ===== 暴露 API =====
    window.PetCafeSync = {
        init,
        syncWrite,
        syncRead,
        syncListen,
        stopListen,
        pullAll,
        testAndSaveConfig,
        clearConfig,
        getConfig,
        onStatusChange,
        get isOnline() { return isOnline; }
    };

    // 自動初始化（DOM 載入後）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
