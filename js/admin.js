document.addEventListener('DOMContentLoaded', () => {
    let menu = getMenu();
    let currentSmCategory = 'toast';
    let setMealOptions = getSetMealOptions();
    let drinkSizes = getDrinkSizes();

    // ===== DOM Elements =====
    const tbody = document.getElementById('admin-menu-body');
    const addNewBtn = document.getElementById('add-new-btn');
    const itemFormContainer = document.getElementById('item-form-container');
    const itemForm = document.getElementById('item-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');

    // Form inputs
    const idInput = document.getElementById('item-id');
    const nameInput = document.getElementById('item-name');
    const categoryInput = document.getElementById('item-category');
    const descInput = document.getElementById('item-description');
    const priceInput = document.getElementById('item-price');
    const imageInput = document.getElementById('item-image');

    // ===== MENU MANAGEMENT =====
    function renderAdminMenu() {
        tbody.innerHTML = '';
        menu.forEach(item => {
            const catInfo = getCategoryInfo(item.category);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.name || '未命名'}</strong></td>
                <td>${catInfo.icon} ${catInfo.label}</td>
                <td>NT$ ${item.price || 0}</td>
                <td class="actions">
                    <button class="btn btn-primary" onclick="editItem('${item.id}')">編輯</button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    renderAdminMenu();

    addNewBtn.addEventListener('click', () => {
        itemForm.reset();
        idInput.value = '';
        formTitle.textContent = '新增品項';
        itemFormContainer.style.display = 'block';
    });

    cancelBtn.addEventListener('click', () => {
        itemFormContainer.style.display = 'none';
    });

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Items can be saved independently without all fields
        const newItem = {
            id: idInput.value || Date.now().toString(),
            name: nameInput.value || '',
            category: categoryInput.value || 'drinks',
            description: descInput.value || '',
            price: parseInt(priceInput.value, 10) || 0,
            image: imageInput.value || ''
        };

        if (idInput.value) {
            const index = menu.findIndex(m => m.id === idInput.value);
            if (index !== -1) menu[index] = newItem;
        } else {
            menu.push(newItem);
        }

        saveMenu(menu);
        renderAdminMenu();
        itemFormContainer.style.display = 'none';
        renderPOSMenu(); // update POS if open
    });

    window.editItem = function (id) {
        const item = menu.find(m => m.id === id);
        if (!item) return;

        idInput.value = item.id;
        nameInput.value = item.name;
        categoryInput.value = item.category;
        descInput.value = item.description;
        priceInput.value = item.price;
        imageInput.value = item.image;

        formTitle.textContent = '編輯品項';
        itemFormContainer.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteItem = function (id) {
        if (confirm('確定要刪除這個品項嗎？')) {
            menu = menu.filter(m => m.id !== id);
            saveMenu(menu);
            renderAdminMenu();
            renderPOSMenu();
        }
    };

    // ===== SET MEAL MANAGEMENT =====
    const smCatTabs = document.querySelectorAll('.setmeal-cat-tab');
    const smEditor = document.getElementById('sm-options-editor');
    const smAddBtn = document.getElementById('sm-add-row-btn');
    const smSaveBtn = document.getElementById('sm-save-btn');
    const smDrinkDiscountInput = document.getElementById('sm-drink-discount-input');
    let drinkDiscounts = getDrinkDiscounts();

    function renderSmEditor() {
        smEditor.innerHTML = '';
        const opts = setMealOptions[currentSmCategory] || [];
        opts.forEach((opt, idx) => {
            const row = document.createElement('div');
            row.className = 'setmeal-option-row';
            row.innerHTML = `
                <input type="text" value="${opt.name}" class="sm-name-input" placeholder="套餐名稱">
                <input type="number" value="${opt.price}" class="price-input sm-price-input" placeholder="加價">
                <button class="btn btn-danger" onclick="removeSmRow(${idx})">X</button>
            `;
            smEditor.appendChild(row);
        });
        // Load drink discount for this category
        if (smDrinkDiscountInput) {
            smDrinkDiscountInput.value = drinkDiscounts[currentSmCategory] || 0;
        }
    }

    smCatTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            smCatTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSmCategory = tab.dataset.smCat;
            renderSmEditor();
        });
    });

    smAddBtn.addEventListener('click', () => {
        if (!setMealOptions[currentSmCategory]) setMealOptions[currentSmCategory] = [];
        setMealOptions[currentSmCategory].push({ id: Date.now().toString(), name: '', price: 0 });
        renderSmEditor();
    });

    window.removeSmRow = function (idx) {
        setMealOptions[currentSmCategory].splice(idx, 1);
        renderSmEditor();
    };

    smSaveBtn.addEventListener('click', () => {
        const rows = smEditor.querySelectorAll('.setmeal-option-row');
        const newOpts = [];
        rows.forEach((row, i) => {
            const name = row.querySelector('.sm-name-input').value;
            const price = parseInt(row.querySelector('.sm-price-input').value, 10) || 0;
            const id = setMealOptions[currentSmCategory][i]?.id || Date.now().toString() + i;
            if (name) newOpts.push({ id, name, price });
        });
        setMealOptions[currentSmCategory] = newOpts;
        saveSetMealOptions(setMealOptions);

        // Save drink discount
        if (smDrinkDiscountInput) {
            drinkDiscounts[currentSmCategory] = parseInt(smDrinkDiscountInput.value, 10) || 0;
            saveDrinkDiscounts(drinkDiscounts);
        }

        alert('套餐選項已儲存！');
    });

    renderSmEditor(); // init

    // ===== DRINK SIZE MANAGEMENT =====
    const dsEditor = document.getElementById('drinksize-options-editor');
    const dsAddBtn = document.getElementById('ds-add-row-btn');
    const dsSaveBtn = document.getElementById('ds-save-btn');

    if (dsEditor && dsAddBtn && dsSaveBtn) {
        function renderDsEditor() {
            dsEditor.innerHTML = '';
            drinkSizes.forEach((opt, idx) => {
                const row = document.createElement('div');
                row.className = 'setmeal-option-row';
                row.innerHTML = `
                    <input type="text" value="${opt.name}" class="ds-name-input" placeholder="容量名稱">
                    <input type="number" value="${opt.price}" class="price-input ds-price-input" placeholder="加價">
                    <button class="btn btn-danger" onclick="removeDsRow(${idx})">X</button>
                `;
                dsEditor.appendChild(row);
            });
        }

        dsAddBtn.addEventListener('click', () => {
            drinkSizes.push({ id: 'DS' + Date.now(), name: '', price: 0 });
            renderDsEditor();
        });

        window.removeDsRow = function(idx) {
            drinkSizes.splice(idx, 1);
            renderDsEditor();
        };

        dsSaveBtn.addEventListener('click', () => {
            const rows = dsEditor.querySelectorAll('.setmeal-option-row');
            const newOpts = [];
            rows.forEach((row, i) => {
                const name = row.querySelector('.ds-name-input').value;
                const price = parseInt(row.querySelector('.ds-price-input').value, 10) || 0;
                const id = drinkSizes[i]?.id || 'DS' + Date.now() + i;
                if (name) newOpts.push({ id, name, price });
            });
            drinkSizes = newOpts;
            saveDrinkSizes(drinkSizes);
            alert('飲品容量選項已儲存！');
        });

        renderDsEditor(); // init
    }

    // ===== TABS LOGIC =====
    const mainTabs = document.querySelectorAll('.tabs .tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    mainTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            mainTabs.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.target;
            document.getElementById(target).classList.add('active');

            if (target === 'pos-tab') {
                renderPOSCatTabs();
                renderPOSMenu();
                renderPOSCart();
                if (typeof updatePOSQueueCount === 'function') updatePOSQueueCount();
            } else if (target === 'kitchen-tab') {
                renderKitchen();
            } else if (target === 'settlement-tab') {
                renderSettlement();
            } else if (target === 'revenue-tab') {
                renderRevenue();
            } else if (target === 'projection-tab') {
                renderProjections();
            } else if (target === 'settings-tab') {
                document.getElementById('setting-shop-name').value = getSettings().shopName;
            }
        });
    });

    // ===== POS SYSTEM =====
    const posCatTabsContainer = document.getElementById('pos-cat-tabs');
    const posMenuGrid = document.getElementById('pos-menu-grid');
    const posCartItems = document.getElementById('pos-cart-items');
    const posSubtotalEl = document.getElementById('pos-subtotal');
    const posDiscountAmountEl = document.getElementById('pos-discount-amount');
    const posTotalEl = document.getElementById('pos-total');
    const posCheckoutBtn = document.getElementById('pos-checkout-btn');
    const posClearBtn = document.getElementById('pos-clear-btn');
    const discBtns = document.querySelectorAll('.disc-btn');

    let currentPOSCategory = 'drinks';
    let posCart = [];
    let posDiscountRate = 1.0;

    // Set meal modal for POS
    let posPendingItem = null;
    let posSelectedSm = null;
    const posSmModal = document.getElementById('pos-setmeal-modal');

    // POS Queue Logic
    let loadedPosQueueOrder = null;
    const posToggleQueueBtn = document.getElementById('pos-toggle-queue-btn');
    const posQueueCount = document.getElementById('pos-queue-count');
    const posMenuView = document.getElementById('pos-menu-view');
    const posQueueView = document.getElementById('pos-queue-view');
    const posQueueList = document.getElementById('pos-queue-list');
    let isQueueViewOpen = false;

    if (posToggleQueueBtn) {
        posToggleQueueBtn.addEventListener('click', () => {
            isQueueViewOpen = !isQueueViewOpen;
            if (isQueueViewOpen) {
                posMenuView.style.display = 'none';
                posQueueView.style.display = 'block';
                posToggleQueueBtn.style.background = '#6c757d';
                posToggleQueueBtn.innerHTML = '返回菜單';
                renderPOSQueue();
            } else {
                posQueueView.style.display = 'none';
                posMenuView.style.display = 'flex';
                posToggleQueueBtn.style.background = '#17a2b8';
                updatePOSQueueCount();
            }
        });
    }

    function updatePOSQueueCount() {
        if (!posQueueCount) return;
        const q = getPosQueueOrders();
        posQueueCount.textContent = q.length;
        if (isQueueViewOpen) return;
        posToggleQueueBtn.innerHTML = `前台待結帳訂單 <span class="badge" style="background:red;">${q.length}</span>`;
    }

    function renderPOSQueue() {
        const q = getPosQueueOrders();
        updatePOSQueueCount();
        posQueueList.innerHTML = '';
        if (q.length === 0) {
            posQueueList.innerHTML = '<div style="text-align:center;padding:2rem;color:#888;">目前沒有前台待結帳訂單</div>';
            return;
        }
        q.forEach(order => {
            const card = document.createElement('div');
            card.style.background = 'white';
            card.style.padding = '1rem';
            card.style.borderRadius = '8px';
            card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
            card.style.borderLeft = '4px solid #17a2b8';
            card.style.cursor = 'pointer';

            const timeStr = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <strong style="font-size:1.1rem;">🪑 ${order.tableNumber}</strong>
                    <span style="color:#666; font-size:0.85rem;">${timeStr}</span>
                </div>
                <div style="font-size:0.9rem; color:#444; margin-bottom:0.5rem;">
                    ${order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#e65100;">NT$ ${order.total}</span>
                    <span style="font-size:0.8rem; background:#eee; padding:0.1rem 0.4rem; border-radius:4px;">點擊載入結帳</span>
                </div>
            `;
            card.addEventListener('click', () => loadOrderToPOS(order));
            posQueueList.appendChild(card);
        });
    }

    window.loadOrderToPOS = function (order) {
        loadedPosQueueOrder = order;
        posCart = order.items.map(i => {
            return {
                key: i.id + (i.setMeal ? '_' + i.setMeal.id : '_none'),
                id: i.id,
                name: i.name,
                price: i.price - (i.setMeal ? i.setMeal.price : 0),
                setMeal: i.setMeal,
                qty: i.qty
            };
        });
        document.getElementById('pos-table').value = order.tableNumber;
        document.getElementById('pos-guests').value = order.guests || 1;
        discBtns[0].click(); // reset discount
        renderPOSCart();
        posToggleQueueBtn.click(); // go back to menu
    };

    function renderPOSCatTabs() {
        posCatTabsContainer.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'pos-cat-tab' + (cat.id === currentPOSCategory ? ' active' : '');
            btn.textContent = `${cat.icon} ${cat.label}`;
            btn.addEventListener('click', () => {
                currentPOSCategory = cat.id;
                renderPOSCatTabs();
                renderPOSMenu();
            });
            posCatTabsContainer.appendChild(btn);
        });
    }

    function renderPOSMenu() {
        posMenuGrid.innerHTML = '';
        const filtered = menu.filter(item => item.category === currentPOSCategory);
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'pos-menu-item';
            div.innerHTML = `
                <div class="pos-item-name">${item.name}</div>
                <div class="pos-item-price">NT$ ${item.price}</div>
            `;
            div.addEventListener('click', () => handlePOSAddItem(item));
            posMenuGrid.appendChild(div);
        });
    }

    function handlePOSAddItem(item) {
        const catInfo = getCategoryInfo(item.category);
        if (catInfo.hasSetMeal || item.category === 'drinks') {
            openPOSSetMealModal(item);
        } else {
            addToPOSCart(item, null, false);
        }
    }

    let posSelectedAddons = [];

    function makePOSAddonEl(opt, isDrinkSize = false) {
        const el = document.createElement('div');
        el.className = 'setmeal-option';
        el.innerHTML = `
            <div class="opt-left">
                <div class="opt-check"></div>
                <span class="opt-name">${opt.name}</span>
            </div>
            <span class="opt-price">+NT$ ${opt.price}</span>
        `;
        el.addEventListener('click', () => {
            const idx = posSelectedAddons.findIndex(a => a.id === opt.id);
            if (isDrinkSize) {
                posSelectedAddons = posSelectedAddons.filter(a => !a._isDrinkSize);
                if (idx === -1) {
                    posSelectedAddons.push({ ...opt, _isDrinkSize: true });
                    el.classList.add('selected');
                    list.querySelectorAll('.pos-drink-size-opt').forEach(e => { if (e !== el) e.classList.remove('selected'); });
                }
            } else {
                if (idx === -1) { posSelectedAddons.push(opt); el.classList.add('selected'); }
                else { posSelectedAddons.splice(idx, 1); el.classList.remove('selected'); }
            }
        });
        return el;
    }

    function openPOSSetMealModal(item) {
        posPendingItem = item;
        posSelectedAddons = [];
        document.getElementById('pos-sm-item-name').textContent = item.name;
        document.getElementById('pos-sm-base-price').textContent = `NT$ ${item.price}`;

        const list = document.getElementById('pos-sm-options-list');
        list.innerHTML = '';

        const ecoCupContainer = document.getElementById('pos-eco-cup-container');
        const ecoCupCheckbox = document.getElementById('pos-eco-cup-checkbox');
        if (ecoCupCheckbox) ecoCupCheckbox.checked = false;

        if (item.category === 'drinks') {
            document.getElementById('pos-sm-title').textContent = '選擇容量（必選）';
            if (ecoCupContainer) ecoCupContainer.style.display = 'block';

            const header = document.createElement('div');
            header.className = 'sm-section-header';
            header.textContent = '容量';
            list.appendChild(header);

            drinkSizes.forEach((opt, idx) => {
                const el = makePOSAddonEl({ ...opt, _isDrinkSize: true }, true);
                el.classList.add('pos-drink-size-opt');
                if (idx === 0) { el.classList.add('selected'); posSelectedAddons.push({ ...opt, _isDrinkSize: true }); }
                list.appendChild(el);
            });
        } else {
            document.getElementById('pos-sm-title').textContent = '加點項目（可複選）';
            if (ecoCupContainer) ecoCupContainer.style.display = 'none';

            // Section 1: Drinks with discount
            const drinkItems = menu.filter(m => m.category === 'drinks');
            const ddiscounts = getDrinkDiscounts();
            const drinkDiscount = ddiscounts[item.category] || 0;

            if (drinkItems.length > 0) {
                const h1 = document.createElement('div');
                h1.className = 'sm-section-header';
                h1.textContent = drinkDiscount > 0
                    ? `\u2615 加點飲品（套餐折抵 NT$ ${drinkDiscount}）`
                    : '\u2615 加點飲品';
                list.appendChild(h1);

                drinkItems.forEach(drink => {
                    const discountedPrice = Math.max(0, drink.price - drinkDiscount);
                    const optObj = { id: 'drink_' + drink.id, name: drink.name, price: discountedPrice };
                    const el = makePOSAddonEl(optObj);
                    if (drinkDiscount > 0) {
                        const priceEl = el.querySelector('.opt-price');
                        if (priceEl) priceEl.innerHTML = `<span style="text-decoration:line-through;color:#aaa;font-size:0.8rem;">NT$ ${drink.price}</span> <span style="color:#2e7d32;">NT$ ${discountedPrice}</span>`;
                    }
                    list.appendChild(el);
                });
            }

            // Section 2: Other set meal options
            const opts = setMealOptions[item.category] || [];
            if (opts.length > 0) {
                const h2 = document.createElement('div');
                h2.className = 'sm-section-header';
                h2.textContent = '其他加點';
                list.appendChild(h2);
                opts.forEach(opt => {
                    list.appendChild(makePOSAddonEl(opt));
                });
            }
        }

        posSmModal.style.display = 'flex';
    }

    document.getElementById('close-pos-sm-btn').addEventListener('click', () => posSmModal.style.display = 'none');
    document.getElementById('confirm-pos-sm-btn').addEventListener('click', () => {
        if(posPendingItem) {
            const isEcoCup = document.getElementById('pos-eco-cup-checkbox') ? document.getElementById('pos-eco-cup-checkbox').checked : false;
            addToPOSCart(posPendingItem, posSelectedAddons, isEcoCup);
        }
        posSmModal.style.display = 'none';
    });

    function addToPOSCart(item, addons = [], isEcoCup = false) {
        const addonKey = addons.map(a => a.id).sort().join('+');
        const key = item.id + '_' + (addonKey || 'none') + (isEcoCup ? '_eco' : '');
        const existing = posCart.find(c => c.key === key);
        if (existing) {
            existing.qty += 1;
        } else {
            posCart.push({
                key, id: item.id, name: item.name, price: item.price,
                addons, qty: 1, isEcoCup, category: item.category
            });
        }
        renderPOSCart();
    }

    window.removePOSCartItem = function (key) {
        posCart = posCart.filter(c => c.key !== key);
        renderPOSCart();
    };

    discBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            discBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            posDiscountRate = parseFloat(btn.dataset.rate);
            renderPOSCart();
        });
    });

    function renderPOSCart() {
        posCartItems.innerHTML = '';
        let subtotal = 0;
        posCart.forEach(item => {
            const addonsTotal = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0);
            const itemPrice = item.price + addonsTotal - (item.isEcoCup ? 5 : 0);
            subtotal += itemPrice * item.qty;
            const addonsHtml = (item.addons || []).map(a =>
                `<div class="pos-cart-item-detail">+ ${a.name} (+NT$ ${a.price})</div>`
            ).join('');
            const div = document.createElement('div');
            div.className = 'pos-cart-item';
            div.innerHTML = `
                <div>
                    <div class="pos-cart-item-name">${item.name}</div>
                    ${addonsHtml}
                    ${item.isEcoCup ? `<div class="pos-cart-item-detail" style="color:#2e7d32;">🌱 自備環保杯 (-NT$ 5)</div>` : ''}
                    <div class="pos-cart-item-detail">NT$ ${itemPrice} x ${item.qty}</div>
                </div>
                <div class="pos-cart-item-right">
                    <strong>NT$ ${itemPrice * item.qty}</strong>
                    <button class="btn btn-danger" style="padding:0.15rem 0.4rem;font-size:0.8rem;" onclick="removePOSCartItem('${item.key}')">X</button>
                </div>
            `;
            posCartItems.appendChild(div);
        });

        const discountAmt = subtotal - Math.round(subtotal * posDiscountRate);
        const total = subtotal - discountAmt;

        posSubtotalEl.textContent = `NT$ ${subtotal}`;
        posDiscountAmountEl.textContent = `- NT$ ${discountAmt}`;
        posTotalEl.textContent = `NT$ ${total}`;
    }

    posClearBtn.addEventListener('click', () => {
        if (confirm('確定清除購物車？')) {
            posCart = [];
            loadedPosQueueOrder = null;
            discBtns[0].click(); // reset discount
            renderPOSCart();
        }
    });

    posCheckoutBtn.addEventListener('click', () => {
        if (posCart.length === 0) { alert('購物車是空的！'); return; }

        const type = document.querySelector('input[name="pos-order-type"]:checked').value;
        const tableNum = document.getElementById('pos-table').value || '外帶/未填';
        const guests = parseInt(document.getElementById('pos-guests').value, 10) || 1;

        let subtotal = 0;
        const items = posCart.map(c => {
            const addonsTotal = (c.addons || []).reduce((s, a) => s + (a.price || 0), 0);
            const itemPrice = c.price + addonsTotal - (c.isEcoCup ? 5 : 0);
            subtotal += itemPrice * c.qty;
            return { id: c.id, name: c.name, price: itemPrice, qty: c.qty, addons: c.addons || [], isEcoCup: c.isEcoCup, category: c.category };
        });

        const discountAmt = subtotal - Math.round(subtotal * posDiscountRate);
        const total = subtotal - discountAmt;

        const order = {
            id: loadedPosQueueOrder ? loadedPosQueueOrder.id : 'POS' + Date.now(),
            date: new Date().toISOString(),
            tableNumber: tableNum,
            type: type,
            source: loadedPosQueueOrder ? 'frontend' : 'pos',
            items: items,
            subtotal: subtotal,
            discount: discountAmt,
            total: total,
            guests: guests,
            invoiceType: loadedPosQueueOrder ? loadedPosQueueOrder.invoiceType : 'paper',
            invoiceData: loadedPosQueueOrder ? loadedPosQueueOrder.invoiceData : ''
        };

        const orders = getOrders();
        orders.push(order);
        saveOrders(orders);

        const pending = getPendingOrders();
        pending.push(order);
        savePendingOrders(pending);

        if (loadedPosQueueOrder) {
            let posQ = getPosQueueOrders();
            posQ = posQ.filter(o => o.id !== loadedPosQueueOrder.id);
            savePosQueueOrders(posQ);
            loadedPosQueueOrder = null;
            updatePOSQueueCount();
        }

        alert('結帳成功！訂單編號：' + order.id);

        posCart = [];
        document.getElementById('pos-table').value = '';
        discBtns[0].click();
        renderPOSCart();

        // Auto update kitchen if it's open
        if (document.getElementById('kitchen-tab').classList.contains('active')) {
            renderKitchen();
        }
    });

    // ===== KITCHEN DISPLAY =====
    const pendingList = document.getElementById('pending-orders-list');
    const servedList = document.getElementById('served-orders-list');
    const pendingCountEl = document.getElementById('pending-count');

    function formatTime(isoStr) {
        const d = new Date(isoStr);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    function renderKitchen() {
        const pending = getPendingOrders();
        const served = getServedOrders();

        pendingCountEl.textContent = pending.length;

        // Render Pending
        pendingList.innerHTML = '';
        if (pending.length === 0) {
            pendingList.innerHTML = '<div class="kitchen-empty">目前沒有待出餐訂單</div>';
        } else {
            pending.forEach((order, idx) => {
                const card = document.createElement('div');
                card.className = 'order-card';

                let itemsHtml = '<ul class="order-items-list">';
                order.items.forEach(item => {
                    itemsHtml += `<li><strong>${item.qty}x</strong> ${item.name}`;
                    if (item.setMeal) itemsHtml += ` <span style="color:var(--text-muted);font-size:0.8rem;">(+ ${item.setMeal.name})</span>`;
                    itemsHtml += `</li>`;
                });
                itemsHtml += '</ul>';

                const badgeClass = order.type === '內用' ? 'dine-in' : 'takeout';

                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-table-num">🪑 ${order.tableNumber}</span>
                        <span class="order-time">${formatTime(order.date)}</span>
                    </div>
                    ${itemsHtml}
                    <div class="order-card-footer">
                        <span class="order-type-badge ${badgeClass}">${order.type}</span>
                        <button class="serve-btn" onclick="serveOrder(${idx})">✅ 出餐</button>
                    </div>
                `;
                pendingList.appendChild(card);
            });
        }

        // Render Served
        servedList.innerHTML = '';
        // Sort served by newest first
        const sortedServed = [...served].reverse();
        if (sortedServed.length === 0) {
            servedList.innerHTML = '<div class="kitchen-empty">尚無出餐紀錄</div>';
        } else {
            sortedServed.forEach(order => {
                const card = document.createElement('div');
                card.className = 'order-card';
                let itemsStr = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-table-num">🪑 ${order.tableNumber}</span>
                        <span class="order-time">${formatTime(order.date)}</span>
                    </div>
                    <div style="font-size:0.85rem;color:#666;margin-bottom:0.25rem;">${itemsStr}</div>
                `;
                servedList.appendChild(card);
            });
        }
    }

    window.serveOrder = function (idx) {
        const pending = getPendingOrders();
        const served = getServedOrders();
        const order = pending.splice(idx, 1)[0];
        served.push(order);
        savePendingOrders(pending);
        saveServedOrders(served);
        renderKitchen();
    };

    document.getElementById('refresh-kitchen-btn').addEventListener('click', renderKitchen);
    document.getElementById('clear-served-btn').addEventListener('click', () => {
        if (confirm('確定清除所有出餐紀錄？')) {
            saveServedOrders([]);
            renderKitchen();
        }
    });

    // Auto refresh kitchen every 10s if active
    setInterval(() => {
        if (document.getElementById('kitchen-tab').classList.contains('active')) {
            renderKitchen();
        }
    }, 10000);

    // ===== REVENUE =====
    function renderRevenue() {
        const orders = getOrders();
        const todayStr = new Date().toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7);

        let todayTotal = 0, todayOrders = 0, todayGuests = 0;
        let monthTotal = 0, monthOrders = 0, monthGuests = 0;

        orders.forEach(o => {
            const dateStr = o.date.split('T')[0];
            const mStr = o.date.substring(0, 7);
            const g = o.guests || 1;
            if (dateStr === todayStr) { todayTotal += o.total; todayOrders++; todayGuests += g; }
            if (mStr === monthStr) { monthTotal += o.total; monthOrders++; monthGuests += g; }
        });

        document.getElementById('rev-today-total').textContent = `NT$ ${todayTotal.toLocaleString()}`;
        document.getElementById('rev-today-orders').textContent = todayOrders;
        document.getElementById('rev-today-guests').textContent = todayGuests;
        document.getElementById('rev-today-avg-table').textContent = `NT$ ${todayOrders ? (todayTotal / todayOrders).toFixed(0) : 0}`;

        document.getElementById('rev-month-total').textContent = `NT$ ${monthTotal.toLocaleString()}`;
        document.getElementById('rev-month-orders').textContent = monthOrders;
        document.getElementById('rev-month-guests').textContent = monthGuests;
        document.getElementById('rev-month-avg-table').textContent = `NT$ ${monthOrders ? (monthTotal / monthOrders).toFixed(0) : 0}`;

        const body = document.getElementById('rev-orders-body');
        body.innerHTML = '';
        const recent = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
        recent.forEach(o => {
            const d = new Date(o.date);
            const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${timeStr}</td>
                <td>${o.tableNumber}</td>
                <td>${o.type}</td>
                <td style="color:#e65100">- NT$ ${o.discount || 0}</td>
                <td style="font-weight:bold">NT$ ${o.total}</td>
            `;
            body.appendChild(tr);
        });
    }

    document.getElementById('refresh-revenue-btn').addEventListener('click', renderRevenue);

    // ===== SETTLEMENT TAB =====
    const setDateInput = document.getElementById('settlement-date');
    const refreshSetBtn = document.getElementById('refresh-settlement-btn');
    const printSetBtn = document.getElementById('print-settlement-btn');
    const setPettyCash = document.getElementById('set-petty-cash');
    const setExpenses = document.getElementById('set-expenses');

    if (setDateInput) {
        // Set to local date
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        setDateInput.value = localISOTime;
    }

    window.renderSettlement = function () {
        const targetDate = setDateInput.value;
        const orders = getOrders().filter(o => o.date.startsWith(targetDate));

        let totalRevenue = 0;
        let totalDiscount = 0;
        let totalGuests = 0;
        let dineInCount = 0;
        let takeoutCount = 0;
        const categoryStats = {};
        const itemStats = {};

        orders.forEach(o => {
            totalRevenue += o.total;
            totalDiscount += (o.discount || 0);
            totalGuests += (o.guests || 1);
            if (o.type === '內用') dineInCount++;
            else takeoutCount++;

            o.items.forEach(item => {
                // Item stats
                if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
                itemStats[item.name].qty += item.qty;
                itemStats[item.name].revenue += item.price * item.qty;

                // Category stats (fallback to unknown if item not found, or try to match by menu)
                const menuItem = menu.find(m => m.id === item.id);
                const cat = menuItem ? menuItem.category : 'other';
                if (!categoryStats[cat]) categoryStats[cat] = 0;
                categoryStats[cat] += item.price * item.qty;
            });
        });

        // Basic metrics
        document.getElementById('set-total-revenue').textContent = `NT$ ${totalRevenue.toLocaleString()}`;
        document.getElementById('set-total-discount').textContent = `NT$ ${totalDiscount.toLocaleString()}`;
        document.getElementById('set-total-orders').textContent = `${orders.length} 筆`;
        document.getElementById('set-total-guests').textContent = totalGuests;
        document.getElementById('set-dine-in').textContent = dineInCount;
        document.getElementById('set-takeout').textContent = takeoutCount;

        const avgTable = orders.length ? Math.round(totalRevenue / orders.length) : 0;
        const avgGuest = totalGuests ? Math.round(totalRevenue / totalGuests) : 0;
        document.getElementById('set-avg-table').textContent = `NT$ ${avgTable.toLocaleString()}`;
        document.getElementById('set-avg-guest').textContent = `NT$ ${avgGuest.toLocaleString()}`;

        // Cash calculations
        document.getElementById('set-calc-revenue').value = `NT$ ${totalRevenue.toLocaleString()}`;
        calculateRemittance(totalRevenue);

        // Category breakdown
        const catBody = document.getElementById('set-category-body');
        catBody.innerHTML = '';
        let totalItemRevenue = Object.values(categoryStats).reduce((a, b) => a + b, 0); // before discount
        Object.keys(categoryStats).forEach(catId => {
            const catInfo = getCategoryInfo(catId);
            const amount = categoryStats[catId];
            const pct = totalItemRevenue ? Math.round((amount / totalItemRevenue) * 100) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:0.5rem 0;">${catInfo.icon} ${catInfo.label}</td>
                <td style="padding:0.5rem 0; text-align:right;">NT$ ${amount.toLocaleString()}</td>
                <td style="padding:0.5rem 0; text-align:right;">${pct}%</td>
            `;
            catBody.appendChild(tr);
        });

        // Item breakdown
        const itemBody = document.getElementById('set-items-body');
        itemBody.innerHTML = '';
        const sortedItems = Object.entries(itemStats).sort((a, b) => b[1].revenue - a[1].revenue);
        sortedItems.forEach(([name, stat]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f0f0f0';
            tr.innerHTML = `
                <td style="padding:0.5rem 0;">${name}</td>
                <td style="padding:0.5rem 0; text-align:center;">${stat.qty}</td>
                <td style="padding:0.5rem 0; text-align:right;">NT$ ${stat.revenue.toLocaleString()}</td>
            `;
            itemBody.appendChild(tr);
        });

        document.getElementById('print-date-display').textContent = `報表日期：${targetDate}`;
    };

    function calculateRemittance(revenue) {
        const petty = parseInt(setPettyCash.value, 10) || 0;
        const expenses = parseInt(setExpenses.value, 10) || 0;
        const remit = revenue - petty - expenses;
        document.getElementById('set-remittance').textContent = `NT$ ${remit.toLocaleString()}`;
    }

    if (refreshSetBtn) refreshSetBtn.addEventListener('click', renderSettlement);
    if (setDateInput) setDateInput.addEventListener('change', renderSettlement);
    if (setPettyCash) setPettyCash.addEventListener('input', () => calculateRemittance(parseInt(document.getElementById('set-calc-revenue').value.replace(/\D/g, '')) || 0));
    if (setExpenses) setExpenses.addEventListener('input', () => calculateRemittance(parseInt(document.getElementById('set-calc-revenue').value.replace(/\D/g, '')) || 0));

    if (printSetBtn) {
        printSetBtn.addEventListener('click', () => {
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'block');
            window.print();
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'none');
        });
    }

    const confirmSetBtn = document.getElementById('confirm-settlement-btn');
    if (confirmSetBtn) {
        confirmSetBtn.addEventListener('click', () => {
            const targetDate = setDateInput.value;
            const allOrders = getOrders();
            const unsettledOrders = allOrders.filter(o => o.date.startsWith(targetDate) && !o.isSettled);

            if (unsettledOrders.length === 0) {
                alert('目前沒有可結算的訂單資料！');
                return;
            }

            if (!confirm('確定要進行當日結算嗎？\n結算後這批訂單將不會再出現在結算清單中，並會保存結算紀錄。')) {
                return;
            }

            // Build the snapshots
            let totalRevenue = 0;
            let totalDiscount = 0;
            let totalGuests = 0;
            let dineInCount = 0;
            let takeoutCount = 0;
            const categoryStats = {};
            const itemStats = {};

            unsettledOrders.forEach(o => {
                totalRevenue += o.total;
                totalDiscount += (o.discount || 0);
                totalGuests += (o.guests || 1);
                if (o.type === '內用') dineInCount++;
                else takeoutCount++;

                o.items.forEach(item => {
                    if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
                    itemStats[item.name].qty += item.qty;
                    itemStats[item.name].revenue += item.price * item.qty;

                    const menuItem = menu.find(m => m.id === item.id);
                    const cat = menuItem ? menuItem.category : 'other';
                    if (!categoryStats[cat]) categoryStats[cat] = 0;
                    categoryStats[cat] += item.price * item.qty;
                });
            });

            const petty = parseInt(setPettyCash.value, 10) || 0;
            const expenses = parseInt(setExpenses.value, 10) || 0;
            
            const settlementRecord = {
                id: 'SET' + Date.now(),
                date: targetDate,
                timestamp: new Date().toISOString(),
                revenue: totalRevenue,
                ordersCount: unsettledOrders.length,
                guestsCount: totalGuests,
                dineInCount,
                takeoutCount,
                totalDiscount,
                pettyCash: petty,
                expenses: expenses,
                remittance: totalRevenue - petty - expenses,
                categoryStats,
                itemStats
            };
            const settlements = getSettlements();
            settlements.push(settlementRecord);
            saveSettlements(settlements);

            // Mark orders as settled
            allOrders.forEach(o => {
                if (o.date.startsWith(targetDate) && !o.isSettled) {
                    o.isSettled = true;
                }
            });
            saveOrders(allOrders);

            alert('結算完成！數據已成功留存。');
            
            // Clear page
            setPettyCash.value = '0';
            setExpenses.value = '0';
            renderSettlement();
        });
    }

    // ===== HISTORY LOGIC =====
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const histListModal = document.getElementById('history-list-modal');
    const histListBody = document.getElementById('history-list-body');
    const closeHistListBtn = document.getElementById('close-history-list-btn');

    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            const settlements = getSettlements().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            histListBody.innerHTML = '';
            if (settlements.length === 0) {
                histListBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem;">尚無結算紀錄</td></tr>';
            } else {
                settlements.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #eee';
                    tr.innerHTML = `
                        <td style="padding:0.75rem;">${s.date} <span style="color:#888;font-size:0.8rem;">(${new Date(s.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})</span></td>
                        <td style="padding:0.75rem;">NT$ ${(s.revenue||0).toLocaleString()}</td>
                        <td style="padding:0.75rem; color:#2e7d32; font-weight:bold;">NT$ ${(s.remittance||0).toLocaleString()}</td>
                        <td style="padding:0.75rem; text-align:center;">
                            <button class="btn btn-primary" style="font-size:0.8rem; padding:0.25rem 0.5rem;" onclick="viewHistoryDetail('${s.id}')">🔍 查看明細</button>
                        </td>
                    `;
                    histListBody.appendChild(tr);
                });
            }
            histListModal.style.display = 'flex';
        });
    }

    if (closeHistListBtn) closeHistListBtn.addEventListener('click', () => histListModal.style.display = 'none');

    const histDetailModal = document.getElementById('history-detail-modal');
    const closeHistDetailBtn = document.getElementById('close-history-detail-btn');
    const histDetailPrintArea = document.getElementById('hist-detail-print-area');
    const printHistBtn = document.getElementById('print-hist-btn');

    if (closeHistDetailBtn) closeHistDetailBtn.addEventListener('click', () => histDetailModal.style.display = 'none');
    
    if (printHistBtn) {
        printHistBtn.addEventListener('click', () => {
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'block');
            window.print();
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'none');
        });
    }

    window.viewHistoryDetail = function(id) {
        const s = getSettlements().find(x => x.id === id);
        if(!s) return;

        document.getElementById('hist-detail-title').textContent = `結算明細 - ${s.date}`;
        
        let catHtml = '';
        if (s.categoryStats) {
            let totalItemRev = Object.values(s.categoryStats).reduce((a,b)=>a+b,0);
            Object.keys(s.categoryStats).forEach(catId => {
                const catInfo = getCategoryInfo(catId);
                const amount = s.categoryStats[catId];
                const pct = totalItemRev ? Math.round((amount/totalItemRev)*100) : 0;
                catHtml += `
                    <tr>
                        <td style="padding:0.5rem 0;">${catInfo.icon} ${catInfo.label}</td>
                        <td style="padding:0.5rem 0; text-align:right;">NT$ ${amount.toLocaleString()}</td>
                        <td style="padding:0.5rem 0; text-align:right;">${pct}%</td>
                    </tr>
                `;
            });
        }

        let itemHtml = '';
        if (s.itemStats) {
            const sorted = Object.entries(s.itemStats).sort((a,b)=>b[1].revenue - a[1].revenue);
            sorted.forEach(([name, stat]) => {
                itemHtml += `
                    <tr style="border-bottom:1px solid #f0f0f0;">
                        <td style="padding:0.5rem 0;">${name}</td>
                        <td style="padding:0.5rem 0; text-align:center;">${stat.qty}</td>
                        <td style="padding:0.5rem 0; text-align:right;">NT$ ${stat.revenue.toLocaleString()}</td>
                    </tr>
                `;
            });
        }

        histDetailPrintArea.innerHTML = `
            <h2 class="print-only" style="display:none; text-align:center; margin-bottom:1rem; border-bottom:2px dashed #000; padding-bottom:0.5rem;"><span class="shop-name-display">${getSettings().shopName}</span> - 歷史結算單</h2>
            <p class="print-only" style="display:none; text-align:center; margin-bottom:1rem;">結算日期：${s.date}</p>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
                <div class="stat-card">
                    <h3>💰 總營業額</h3>
                    <div class="val">NT$ ${(s.revenue||0).toLocaleString()}</div>
                    <div class="sub-val">總折扣金額：NT$ ${(s.totalDiscount||0).toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <h3>🧾 總單數 / 人數</h3>
                    <div class="val">${s.ordersCount||0} 筆</div>
                    <div class="sub-val">來客數：${s.guestsCount||0} 人</div>
                </div>
                <div class="stat-card">
                    <h3>🍽️ 訂單類型</h3>
                    <div class="val" style="font-size:1.4rem;">內用：${s.dineInCount||0} 筆</div>
                    <div class="sub-val" style="font-size:1.1rem; color:#444;">外帶：${s.takeoutCount||0} 筆</div>
                </div>
                <div class="stat-card">
                    <h3>👤 平均客單價</h3>
                    <div class="val">NT$ ${(s.guestsCount ? Math.round(s.revenue/s.guestsCount) : 0).toLocaleString()}</div>
                    <div class="sub-val">每桌均價：NT$ ${(s.ordersCount ? Math.round(s.revenue/s.ordersCount) : 0).toLocaleString()}</div>
                </div>
            </div>

            <div style="background:#fff3e0; border-radius:12px; padding:1.5rem; border:2px solid #ffcc80; margin-bottom:2rem;">
                <h3 style="margin-bottom:1rem; color:#e65100;">💼 現金結算與匯款計算</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; align-items:center;">
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">總營業額</label><div style="font-size:1.2rem;font-weight:bold;">NT$ ${(s.revenue||0).toLocaleString()}</div></div>
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">➖ 留存零用金</label><div style="font-size:1.2rem;">NT$ ${(s.pettyCash||0).toLocaleString()}</div></div>
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">➖ 貨款支出</label><div style="font-size:1.2rem;">NT$ ${(s.expenses||0).toLocaleString()}</div></div>
                    <div style="text-align:right;">
                        <label style="display:block; font-weight:600; margin-bottom:0.25rem; color:#2e7d32;">🏦 實際匯款金額</label>
                        <div style="font-size:2rem; font-weight:800; color:#2e7d32;">NT$ ${(s.remittance||0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
                <div style="background:#fff; padding:1.5rem; border-radius:12px; border:1px solid #ddd;">
                    <h3 style="margin-bottom:1rem; border-bottom:2px solid #eee; padding-bottom:0.5rem;">📊 各分類營收</h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr style="border-bottom:2px solid #eee;"><th style="padding:0.5rem 0;">分類</th><th style="padding:0.5rem 0; text-align:right;">營收</th><th style="padding:0.5rem 0; text-align:right;">佔比</th></tr></thead>
                        <tbody>${catHtml}</tbody>
                    </table>
                </div>
                <div style="background:#fff; padding:1.5rem; border-radius:12px; border:1px solid #ddd;">
                    <h3 style="margin-bottom:1rem; border-bottom:2px solid #eee; padding-bottom:0.5rem;">🏆 商品銷售排行</h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr style="border-bottom:2px solid #eee;"><th style="padding:0.5rem 0;">商品名稱</th><th style="padding:0.5rem 0; text-align:center;">數量</th><th style="padding:0.5rem 0; text-align:right;">小計</th></tr></thead>
                        <tbody>${itemHtml}</tbody>
                    </table>
                </div>
            </div>
        `;

        histDetailModal.style.display = 'flex';
    };

    // ===== PROJECTIONS =====
    let projections = getProjections();
    let investment = getInvestment();
    let charts = {};

    function renderProjections() {
        const body = document.getElementById('projection-body');
        body.innerHTML = '';
        const labels = ['每日客流', '月營業天數', '平均客單價', '食材成本(年)', '人事成本(月)', '租金(月)', '水電雜支(年)', '行銷費用(年)'];
        const keys = ['dailyCustomers', 'workDaysPerMonth', 'avgTicketPrice', 'ingredientCost', 'personnelCost', 'rentCost', 'utilityCost', 'marketingCost'];

        labels.forEach((label, i) => {
            const key = keys[i];
            const tr = document.createElement('tr');
            let html = `<td><strong>${label}</strong></td>`;
            projections.forEach((proj, idx) => {
                html += `<td><input type="number" class="form-control proj-input" data-idx="${idx}" data-key="${key}" value="${proj[key]}"></td>`;
            });
            tr.innerHTML = html;
            body.appendChild(tr);
        });

        // Computed rows
        const revTr = document.createElement('tr'); revTr.style.background = '#f0f8ff';
        const costTr = document.createElement('tr'); costTr.style.background = '#fff0f0';
        const profTr = document.createElement('tr'); profTr.style.background = '#f0fff0';

        let revHtml = `<td><strong>年營收 (系統計算)</strong></td>`;
        let costHtml = `<td><strong>總成本 (系統計算)</strong></td>`;
        let profHtml = `<td><strong>淨利 (系統計算)</strong></td>`;

        projections.forEach(p => {
            const rev = p.dailyCustomers * p.avgTicketPrice * p.workDaysPerMonth * 12;
            const cost = p.ingredientCost + (p.personnelCost * 12) + (p.rentCost * 12) + p.utilityCost + p.marketingCost;
            const prof = rev - cost;
            revHtml += `<td>NT$ ${(rev / 10000).toFixed(0)} 萬</td>`;
            costHtml += `<td>NT$ ${(cost / 10000).toFixed(0)} 萬</td>`;
            profHtml += `<td style="color:${prof >= 0 ? 'green' : 'red'};font-weight:bold">NT$ ${(prof / 10000).toFixed(0)} 萬</td>`;
        });
        revTr.innerHTML = revHtml; costTr.innerHTML = costHtml; profTr.innerHTML = profHtml;
        body.appendChild(revTr); body.appendChild(costTr); body.appendChild(profTr);

        investment.deposit = projections[0].rentCost * 2;
        ['decoration', 'equipment', 'deposit', 'misc', 'workingCapital'].forEach(k => {
            const el = document.getElementById(`inv-${k.replace(/[A-Z]/g, l => '-' + l.toLowerCase())}`);
            if (el) el.value = investment[k];
        });

        const totInv = investment.decoration + investment.equipment + investment.deposit + investment.misc + investment.workingCapital;
        document.getElementById('inv-total').textContent = `NT$ ${(totInv / 10000).toFixed(0)} 萬`;

        updateCharts(totInv);
    }

    document.getElementById('save-projection-btn').addEventListener('click', () => {
        document.querySelectorAll('.proj-input').forEach(inp => {
            projections[inp.dataset.idx][inp.dataset.key] = Number(inp.value);
        });
        saveProjections(projections);

        investment.decoration = Number(document.getElementById('inv-decoration').value);
        investment.equipment = Number(document.getElementById('inv-equipment').value);
        investment.misc = Number(document.getElementById('inv-misc').value);
        investment.workingCapital = Number(document.getElementById('inv-working-capital').value);
        saveInvestment(investment);

        alert('營運預測儲存成功！');
        renderProjections();
    });

    function updateCharts(totInv) {
        const revs = projections.map(p => (p.dailyCustomers * p.avgTicketPrice * p.workDaysPerMonth * 12) / 10000);
        const costs = projections.map(p => (p.ingredientCost + (p.personnelCost * 12) + (p.rentCost * 12) + p.utilityCost + p.marketingCost) / 10000);
        const profits = revs.map((r, i) => r - costs[i]);

        const ctxRev = document.getElementById('revenueCostChart');
        if (charts.rev) charts.rev.destroy();
        charts.rev = new Chart(ctxRev, {
            type: 'bar', data: {
                labels: ['第 1 年', '第 2 年', '第 3 年'], datasets: [
                    { label: '營收(萬)', data: revs, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: '成本(萬)', data: costs, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
                ]
            }
        });

        const ctxProf = document.getElementById('profitMarginChart');
        if (charts.prof) charts.prof.destroy();
        charts.prof = new Chart(ctxProf, {
            type: 'line', data: {
                labels: ['第 1 年', '第 2 年', '第 3 年'], datasets: [
                    { label: '淨利率(%)', data: profits.map((p, i) => (p / revs[i]) * 100), borderColor: '#36A2EB' }
                ]
            }
        });

        const ctxInv = document.getElementById('investmentChart');
        if (charts.inv) charts.inv.destroy();
        charts.inv = new Chart(ctxInv, {
            type: 'doughnut', data: {
                labels: ['裝潢', '設備', '押金', '雜支', '週轉金'], datasets: [{
                    data: [investment.decoration, investment.equipment, investment.deposit, investment.misc, investment.workingCapital],
                    backgroundColor: ['#FF9F40', '#4BC0C0', '#36A2EB', '#9966FF', '#FFCD56']
                }]
            }
        });

        const p3 = projections[2];
        const ctxCost = document.getElementById('costStructureChart');
        if (charts.cost) charts.cost.destroy();
        charts.cost = new Chart(ctxCost, {
            type: 'doughnut', data: {
                labels: ['食材', '人事', '租金', '水電雜支', '行銷'], datasets: [{
                    data: [p3.ingredientCost, p3.personnelCost * 12, p3.rentCost * 12, p3.utilityCost, p3.marketingCost],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            }
        });
    }

    // ===== SETTINGS =====
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const name = document.getElementById('setting-shop-name').value.trim() || '毛孩窩';
        saveSettings({ shopName: name });
        document.querySelectorAll('.shop-name-display').forEach(e => e.textContent = name);
        alert('設定已儲存！');
    });

    const settings = getSettings();
    document.querySelectorAll('.shop-name-display').forEach(e => e.textContent = settings.shopName);
});
