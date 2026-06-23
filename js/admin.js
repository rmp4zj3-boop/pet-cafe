document.addEventListener('DOMContentLoaded', () => {
    // ===== LOGIN VERIFICATION & ROLE PERMISSIONS =====
    const ALL_TABS = [
        { id: 'revenue-tab', label: '📊 營收統計' },
        { id: 'menu-tab', label: '📖 菜單管理' },
        { id: 'pos-tab', label: '🖥️ POS系統' },
        { id: 'kitchen-tab', label: '🍳 出餐點單' },
        { id: 'settlement-tab', label: '📝 當日結算表' },
        { id: 'clockin-tab', label: '⏰ 員工打卡' },
        { id: 'employee-tab', label: '👤 員工資料' },
        { id: 'permission-tab', label: '🔑 權限系統' },
        { id: 'projection-tab', label: '📈 營運預測' },
        { id: 'cost-tab', label: '💰 成本估算' },
        { id: 'settings-tab', label: '⚙️ 基本設定' }
    ];

    const DEFAULT_ROLE_PERMISSIONS = {
        admin:   ['revenue-tab', 'menu-tab', 'pos-tab', 'kitchen-tab', 'settlement-tab', 'clockin-tab', 'employee-tab', 'permission-tab', 'projection-tab', 'cost-tab', 'settings-tab'],
        staff:   ['pos-tab', 'kitchen-tab', 'settlement-tab', 'clockin-tab'],
        kitchen: ['kitchen-tab', 'clockin-tab']
    };

    window.getRolePermissions = function() {
        const saved = localStorage.getItem('petCafeRolePermissions');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return DEFAULT_ROLE_PERMISSIONS;
            }
        }
        return DEFAULT_ROLE_PERMISSIONS;
    };

    window.saveRolePermissions = function(perms) {
        localStorage.setItem('petCafeRolePermissions', JSON.stringify(perms));
    };

    const ROLE_LABELS = { admin: '管理員', staff: '助理', kitchen: '出餐人員' };

    let currentUser = null;
    try {
        const stored = sessionStorage.getItem('petCafeCurrentUser');
        if (stored) currentUser = JSON.parse(stored);
    } catch(e) { currentUser = null; }

    if (!currentUser) {
        // Not logged in — redirect to login page
        window.location.href = 'login.html';
        return;
    }

    // Update sidebar user info
    const badgeEl = document.getElementById('current-user-badge');
    const nameEl = document.getElementById('current-user-name');
    if (badgeEl) badgeEl.textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
    if (nameEl) nameEl.textContent = `👤 ${currentUser.name}（${currentUser.username}）`;

    // Apply role-based tab visibility


    window.applySidebarTabVisibility = function() {
        const rolePermissions = getRolePermissions();
        const allowedTabs = rolePermissions[currentUser.role] || ['kitchen-tab', 'clockin-tab'];
        
        document.querySelectorAll('.tabs .tab-btn[data-target]').forEach(btn => {
            const target = btn.dataset.target;
            if (!allowedTabs.includes(target)) {
                btn.style.setProperty('display', 'none', 'important');
            } else {
                btn.style.removeProperty('display');
            }
        });
        
        // If active tab is hidden, switch to first visible tab
        const activeBtn = document.querySelector('.tabs .tab-btn.active');
        if (activeBtn && activeBtn.style.display === 'none') {
            let newActiveTab = '';
            const allBtns = document.querySelectorAll('.tabs .tab-btn');
            for (let btn of allBtns) {
                if (btn.style.display !== 'none' && btn.dataset.target) {
                    newActiveTab = btn.dataset.target;
                    break;
                }
            }
            if (newActiveTab) {
                const targetBtn = document.querySelector(`.tabs .tab-btn[data-target="${newActiveTab}"]`);
                if (targetBtn) targetBtn.click();
            }
        }
    };

    applySidebarTabVisibility();

    // Activate default tab initially
    const rolePermissions = getRolePermissions();
    const allowedTabs = rolePermissions[currentUser.role] || ['kitchen-tab', 'clockin-tab'];
    let defaultTab = '';
    const initialBtns = document.querySelectorAll('.tabs .tab-btn[data-target]');
    for (let btn of initialBtns) {
        const target = btn.dataset.target;
        if (allowedTabs.includes(target)) {
            defaultTab = target;
            break;
        }
    }
    if (!defaultTab) defaultTab = 'kitchen-tab';

    const allTabBtns = document.querySelectorAll('.tabs .tab-btn');
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabBtns.forEach(b => b.classList.remove('active'));
    allTabContents.forEach(c => c.classList.remove('active'));
    const defaultBtn = document.querySelector(`.tabs .tab-btn[data-target="${defaultTab}"]`);
    if (defaultBtn) defaultBtn.classList.add('active');
    const defaultContent = document.getElementById(defaultTab);
    if (defaultContent) defaultContent.classList.add('active');

    function getLocalDateStr(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const tzoffset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 10);
    }

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
    const syncNotesCheckbox = document.getElementById('sync-notes-to-category');

    // File upload elements
    const imageFileInput = document.getElementById('item-image-file');
    const imagePreviewContainer = document.getElementById('item-image-preview-container');
    const imagePreview = document.getElementById('item-image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');

    // Note groups elements
    const notesContainer = document.getElementById('item-notes-container');
    const addNoteGroupBtn = document.getElementById('add-note-group-btn');

    // ===== MENU MANAGEMENT =====
    function renderAdminMenu() {
        tbody.innerHTML = '';
        menu.forEach(item => {
            const catInfo = getCategoryInfo(item.category);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${item.name || '未命名'}</strong>
                    ${item.isPreparing ? '<span style="background:#e65100;color:white;padding:2px 6px;border-radius:4px;font-size:0.75rem;margin-left:5px;">準備中</span>' : ''}
                </td>
                <td>${catInfo.icon} ${catInfo.label}</td>
                <td>NT$ ${item.price || 0}</td>
                <td class="actions">
                    <button class="btn" style="background:${item.isPreparing ? '#e65100' : '#4caf50'}; color:white; padding:0.25rem 0.5rem; font-size:0.85rem;" onclick="togglePreparing('${item.id}')">
                        ${item.isPreparing ? '🟢 恢復點購' : '🟠 標記準備中'}
                    </button>
                    <button class="btn btn-primary" onclick="editItem('${item.id}')">編輯</button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.togglePreparing = function (id) {
        const item = menu.find(m => m.id === id);
        if (!item) return;
        item.isPreparing = !item.isPreparing;
        saveMenu(menu);
        renderAdminMenu();
        renderPOSMenu(); // update POS if open
    };

    renderAdminMenu();

    function compressImage(base64Str, maxWidth, maxHeight, callback) {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedBase64);
        };
    }

    if (imageFileInput) {
        imageFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    compressImage(event.target.result, 300, 300, (compressedBase64) => {
                        imageInput.value = compressedBase64;
                        imagePreview.src = compressedBase64;
                        imagePreviewContainer.style.display = 'flex';
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
            imageFileInput.value = '';
            imageInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
        });
    }

    function addNoteGroupRow(title = '', choices = '') {
        const row = document.createElement('div');
        row.className = 'note-group-row';
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        row.style.background = '#f8f9fa';
        row.style.padding = '0.5rem';
        row.style.borderRadius = '6px';
        row.style.border = '1px solid #e9ecef';
        
        row.innerHTML = `
            <input type="text" class="form-control note-group-title" placeholder="群組名稱 (如: 甜度)" style="flex:1;" value="${title}">
            <input type="text" class="form-control note-group-choices" placeholder="選項以逗號隔開 (如: 無糖,半糖,正常糖)" style="flex:2;" value="${choices}">
            <button type="button" class="btn btn-danger remove-note-group-btn" style="padding:0.25rem 0.5rem; font-size:0.8rem;">X</button>
        `;
        
        row.querySelector('.remove-note-group-btn').addEventListener('click', () => {
            row.remove();
        });
        
        notesContainer.appendChild(row);
    }

    if (addNoteGroupBtn) {
        addNoteGroupBtn.addEventListener('click', () => {
            addNoteGroupRow();
        });
    }

    function renderNoteGroups(notesArray = []) {
        notesContainer.innerHTML = '';
        if (notesArray && notesArray.length > 0) {
            notesArray.forEach(group => {
                const choicesStr = (group.options || []).join(',');
                addNoteGroupRow(group.title, choicesStr);
            });
        }
    }

    function getNoteGroupsFromForm() {
        const rows = notesContainer.querySelectorAll('.note-group-row');
        const groups = [];
        rows.forEach(row => {
            const title = row.querySelector('.note-group-title').value.trim();
            const choicesVal = row.querySelector('.note-group-choices').value.trim();
            if (title && choicesVal) {
                const options = choicesVal.split(/[,，]/).map(x => x.trim()).filter(Boolean);
                if (options.length > 0) {
                    groups.push({ title, options });
                }
            }
        });
        return groups;
    }

    addNewBtn.addEventListener('click', () => {
        itemForm.reset();
        idInput.value = '';
        imageFileInput.value = '';
        imageInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        notesContainer.innerHTML = '';
        if (syncNotesCheckbox) syncNotesCheckbox.checked = false;
        formTitle.textContent = '新增品項';
        itemFormContainer.style.display = 'block';
    });

    cancelBtn.addEventListener('click', () => {
        itemFormContainer.style.display = 'none';
    });

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const existingItem = idInput.value ? menu.find(m => m.id === idInput.value) : null;
        const isPreparing = existingItem ? (existingItem.isPreparing || false) : false;

        const noteGroups = getNoteGroupsFromForm();
        const newItem = {
            id: idInput.value || Date.now().toString(),
            name: nameInput.value || '',
            category: categoryInput.value || 'coffee',
            description: descInput.value || '',
            price: parseInt(priceInput.value, 10) || 0,
            image: imageInput.value || '',
            isPreparing: isPreparing,
            notes: noteGroups,
            note: noteGroups.map(g => g.options.join(',')).join(',')
        };

        if (idInput.value) {
            const index = menu.findIndex(m => m.id === idInput.value);
            if (index !== -1) menu[index] = newItem;
        } else {
            menu.push(newItem);
        }

        if (syncNotesCheckbox && syncNotesCheckbox.checked) {
            menu.forEach(item => {
                if (item.category === newItem.category) {
                    item.notes = JSON.parse(JSON.stringify(noteGroups));
                    item.note = noteGroups.map(g => g.options.join(',')).join(',');
                }
            });
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
        imageInput.value = item.image || '';
        if (syncNotesCheckbox) syncNotesCheckbox.checked = false;

        if (item.image) {
            imagePreview.src = item.image;
            imagePreviewContainer.style.display = 'flex';
        } else {
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
        }
        imageFileInput.value = '';

        let groups = [];
        if (item.notes && Array.isArray(item.notes)) {
            groups = item.notes;
        } else if (item.note && item.note.trim()) {
            groups = [{ title: '備註', options: item.note.split(/[,，]/).map(x => x.trim()).filter(Boolean) }];
        }
        renderNoteGroups(groups);

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

        window.removeDsRow = function (idx) {
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
                loadSettlementInputsForDate(setDateInput.value);
                renderSettlement();
            } else if (target === 'revenue-tab') {
                renderRevenue();
            } else if (target === 'projection-tab') {
                renderProjections();
            } else if (target === 'cost-tab') {
                renderCostEstimation();
            } else if (target === 'clockin-tab') {
                renderClockIn();
            } else if (target === 'employee-tab') {
                renderPermission();
            } else if (target === 'permission-tab') {
                renderRolePermissionsUI();
                if (btnGenerateSalary) btnGenerateSalary.click();
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

    let currentPOSCategory = 'coffee';
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
                    ${order.items.map(i => {
                const addonNames = (i.addons || []).map(a => a.name).join('+');
                return `${i.qty}x ${i.name}${addonNames ? ` (${addonNames})` : ''}`;
            }).join(', ')}
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
            const addons = i.addons || [];
            const addonKey = addons.map(a => a.id).sort().join('+');
            const noteKey = i.note ? i.note.split(/、/).sort().join('|') : '';
            const key = i.id + '_' + (addonKey || 'none') + (i.isEcoCup ? '_eco' : '') + '_' + (noteKey || 'none');
            const addonsTotal = addons.reduce((s, a) => s + (a.price || 0), 0);
            const menuItem = menu.find(m => m.id === i.id);
            const category = menuItem ? menuItem.category : '';
            return {
                key,
                id: i.id,
                name: i.name,
                price: i.price - addonsTotal + (i.isEcoCup ? 5 : 0),
                addons,
                qty: i.qty,
                isEcoCup: i.isEcoCup || false,
                category,
                note: i.note || ''
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
            div.className = 'pos-menu-item' + (item.isPreparing ? ' preparing' : '');
            if (item.isPreparing) {
                div.style.opacity = '0.5';
                div.style.cursor = 'not-allowed';
                div.style.background = '#f1f1f1';
                div.innerHTML = `
                    <div class="pos-item-name">${item.name}</div>
                    <div class="pos-item-price" style="color:#d32f2f; font-weight:bold;">準備中</div>
                `;
            } else {
                div.innerHTML = `
                    <div class="pos-item-name">${item.name}</div>
                    <div class="pos-item-price">NT$ ${item.price}</div>
                `;
                div.addEventListener('click', () => handlePOSAddItem(item));
            }
            posMenuGrid.appendChild(div);
        });
    }

    function handlePOSAddItem(item) {
        const catInfo = getCategoryInfo(item.category);
        const hasNotes = (item.notes && item.notes.length > 0) || (item.note && item.note.trim().length > 0);
        if (catInfo.hasSetMeal || ['drinks', 'coffee', 'tea'].includes(item.category) || hasNotes) {
            openPOSSetMealModal(item);
        } else {
            addToPOSCart(item, null, false);
        }
    }

    let posSelectedAddons = [];
    let posSelectedNotes = [];

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
                    const optsList = document.getElementById('pos-sm-options-list');
                    if (optsList) {
                        optsList.querySelectorAll('.pos-drink-size-opt').forEach(e => { if (e !== el) e.classList.remove('selected'); });
                    }
                }
            } else {
                if (idx === -1) {
                    posSelectedAddons.push(opt);
                    el.classList.add('selected');
                } else {
                    posSelectedAddons.splice(idx, 1);
                    el.classList.remove('selected');
                }
            }
        });
        return el;
    }

    // ===== SHARED POS NOTE GROUP RENDERER =====
    function renderPOSNoteGroupsIntoList(container, item, sharedNotes) {
        let noteGroups = [];
        if (item.notes && Array.isArray(item.notes) && item.notes.length > 0) {
            noteGroups = item.notes;
        } else if (item.note && item.note.trim().length > 0) {
            noteGroups = [{ title: '備註', options: item.note.split(/[,，]/).map(x => x.trim()).filter(Boolean) }];
        }
        if (noteGroups.length === 0) return;

        const hNote = document.createElement('div');
        hNote.className = 'sm-section-header';
        hNote.textContent = '📝 備註選項';
        container.appendChild(hNote);

        noteGroups.forEach(group => {
            if (!group.options || group.options.length === 0) return;

            // Card wrapper — groups title + tags visually together
            const card = document.createElement('div');
            card.style.cssText = 'background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;padding:0.6rem 0.85rem 0.75rem;margin-bottom:0.6rem;';

            const groupLabel = document.createElement('div');
            groupLabel.style.cssText = 'font-size:0.78rem;color:#888;font-weight:700;margin-bottom:0.5rem;letter-spacing:0.06em;text-transform:uppercase;';
            groupLabel.textContent = group.title;
            card.appendChild(groupLabel);

            const tagRow = document.createElement('div');
            tagRow.style.cssText = 'display:flex;gap:0.4rem;flex-wrap:wrap;';

            let selectedTagEl = null;

            group.options.forEach(optName => {
                const tag = document.createElement('div');
                tag.className = 'note-tag-option';
                tag.textContent = optName;

                tag.addEventListener('click', () => {
                    if (selectedTagEl && selectedTagEl !== tag) {
                        selectedTagEl.classList.remove('selected');
                        const prevIdx = sharedNotes.indexOf(selectedTagEl.textContent);
                        if (prevIdx !== -1) sharedNotes.splice(prevIdx, 1);
                    }
                    if (selectedTagEl === tag) {
                        tag.classList.remove('selected');
                        const idx = sharedNotes.indexOf(optName);
                        if (idx !== -1) sharedNotes.splice(idx, 1);
                        selectedTagEl = null;
                    } else {
                        tag.classList.add('selected');
                        sharedNotes.push(optName);
                        selectedTagEl = tag;
                    }
                });
                tagRow.appendChild(tag);
            });
            card.appendChild(tagRow);
            container.appendChild(card);
        });
    }

    function openPOSSetMealModal(item) {
        posPendingItem = item;
        posSelectedAddons = [];
        posSelectedNotes = [];
        document.getElementById('pos-sm-item-name').textContent = item.name;
        document.getElementById('pos-sm-base-price').textContent = `NT$ ${item.price}`;

        const list = document.getElementById('pos-sm-options-list');
        list.innerHTML = '';

        const ecoCupContainer = document.getElementById('pos-eco-cup-container');
        const ecoCupCheckbox = document.getElementById('pos-eco-cup-checkbox');
        if (ecoCupCheckbox) ecoCupCheckbox.checked = false;

        if (['drinks', 'coffee', 'tea'].includes(item.category)) {
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

            // Note groups for the drink item itself
            renderPOSNoteGroupsIntoList(list, item, posSelectedNotes);

        } else {
            document.getElementById('pos-sm-title').textContent = '加點項目（可複選）';
            if (ecoCupContainer) ecoCupContainer.style.display = 'none';

            // Section 1: Drinks (single-select; shows drink's note groups dynamically)
            const drinkItems = menu.filter(m => ['drinks', 'coffee', 'tea'].includes(m.category) && !m.isPreparing);
            const ddiscounts = getDrinkDiscounts();
            const drinkDiscount = ddiscounts[item.category] || 0;

            if (drinkItems.length > 0) {
                const h1 = document.createElement('div');
                h1.className = 'sm-section-header';
                h1.textContent = drinkDiscount > 0
                    ? `☕ 加點飲品（套餐折抵 NT$ ${drinkDiscount}）`
                    : '☕ 加點飲品';
                list.appendChild(h1);

                let activeDrinkEl = null;
                let activeDrinkNoteCleanup = () => {};

                drinkItems.forEach(drink => {
                    const discountedPrice = Math.max(0, drink.price - drinkDiscount);
                    const optObj = { id: 'drink_' + drink.id, name: drink.name, price: discountedPrice };

                    const drinkEl = document.createElement('div');
                    drinkEl.className = 'setmeal-option pos-drink-addon-opt';
                    drinkEl.innerHTML = `
                        <div class="opt-left">
                            <div class="opt-check"></div>
                            <span class="opt-name">${drink.name}</span>
                        </div>
                        <span class="opt-price">${drinkDiscount > 0
                            ? `<span style="text-decoration:line-through;color:#aaa;font-size:0.8rem;">NT$ ${drink.price}</span> <span style="color:#2e7d32;">NT$ ${discountedPrice}</span>`
                            : `+NT$ ${discountedPrice}`
                        }</span>
                    `;

                    drinkEl.addEventListener('click', () => {
                        const idx = posSelectedAddons.findIndex(a => a.id === optObj.id);

                        // Clean up previous drink's note groups
                        activeDrinkNoteCleanup();
                        if (activeDrinkEl && activeDrinkEl !== drinkEl) {
                            activeDrinkEl.classList.remove('selected');
                            drinkItems.forEach(d => { posSelectedAddons = posSelectedAddons.filter(a => a.id !== 'drink_' + d.id); });
                        }

                        if (idx === -1) {
                            drinkItems.forEach(d => { posSelectedAddons = posSelectedAddons.filter(a => a.id !== 'drink_' + d.id); });
                            list.querySelectorAll('.pos-drink-addon-opt').forEach(e => e.classList.remove('selected'));

                            posSelectedAddons.push(optObj);
                            drinkEl.classList.add('selected');
                            activeDrinkEl = drinkEl;

                            // Insert this drink's note groups right after the drink list
                            const drinkNoteContainer = document.createElement('div');
                            drinkNoteContainer.className = 'pos-drink-note-container';
                            drinkNoteContainer.style.cssText = 'margin:0.25rem 0 0.5rem;padding:0 0.25rem;';
                            renderPOSNoteGroupsIntoList(drinkNoteContainer, drink, posSelectedNotes);

                            const anchor = list.querySelector('#pos-drink-list-end');
                            if (anchor) list.insertBefore(drinkNoteContainer, anchor);
                            else list.appendChild(drinkNoteContainer);

                            activeDrinkNoteCleanup = () => {
                                if (drinkNoteContainer.parentNode) drinkNoteContainer.remove();
                                const dng = drink.notes || [];
                                dng.forEach(g => g.options.forEach(opt => {
                                    const ni = posSelectedNotes.indexOf(opt);
                                    if (ni !== -1) posSelectedNotes.splice(ni, 1);
                                }));
                            };
                        } else {
                            posSelectedAddons.splice(idx, 1);
                            drinkEl.classList.remove('selected');
                            activeDrinkEl = null;
                            activeDrinkNoteCleanup = () => {};
                        }
                    });
                    list.appendChild(drinkEl);
                });

                // Anchor for inserting drink note groups
                const anchor = document.createElement('div');
                anchor.id = 'pos-drink-list-end';
                list.appendChild(anchor);
            }

            // Section 2: Other set meal options
            const opts = setMealOptions[item.category] || [];
            if (opts.length > 0) {
                const h2 = document.createElement('div');
                h2.className = 'sm-section-header';
                h2.textContent = '其他加點';
                list.appendChild(h2);
                opts.forEach(opt => { list.appendChild(makePOSAddonEl(opt)); });
            }

            // Section 3: Note groups for the food item itself
            renderPOSNoteGroupsIntoList(list, item, posSelectedNotes);
        }

        posSmModal.style.display = 'flex';
    }

    document.getElementById('close-pos-sm-btn').addEventListener('click', () => posSmModal.style.display = 'none');

    document.getElementById('confirm-pos-sm-btn').addEventListener('click', () => {
        if (posPendingItem) {
            const isEcoCup = document.getElementById('pos-eco-cup-checkbox') ? document.getElementById('pos-eco-cup-checkbox').checked : false;
            addToPOSCart(posPendingItem, posSelectedAddons, isEcoCup, posSelectedNotes);
        }
        posSmModal.style.display = 'none';
    });

    function addToPOSCart(item, addons = [], isEcoCup = false, chosenNotes = []) {
        const addonKey = addons.map(a => a.id).sort().join('+');
        const noteKey = chosenNotes.sort().join('|');
        const key = item.id + '_' + (addonKey || 'none') + (isEcoCup ? '_eco' : '') + '_' + (noteKey || 'none');
        const existing = posCart.find(c => c.key === key);
        if (existing) {
            existing.qty += 1;
        } else {
            posCart.push({
                key, id: item.id, name: item.name, price: item.price,
                addons, qty: 1, isEcoCup, category: item.category,
                note: chosenNotes.join('、') || ''
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
                    ${item.note ? `<div class="pos-cart-item-detail" style="color:#e65100;background:#fff3e0;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:2px;">📝 備註: ${item.note}</div>` : ''}
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
            return { id: c.id, name: c.name, price: itemPrice, qty: c.qty, addons: c.addons || [], isEcoCup: c.isEcoCup, category: c.category, note: c.note || '' };
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

        // Auto update tabs if active
        if (document.getElementById('kitchen-tab').classList.contains('active')) {
            renderKitchen();
        }
        if (document.getElementById('settlement-tab').classList.contains('active')) {
            renderSettlement();
        }
        if (document.getElementById('revenue-tab').classList.contains('active')) {
            renderRevenue();
        }
        if (document.getElementById('projection-tab').classList.contains('active')) {
            renderProjections();
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

                const drinksArray = [];
                const foodArray = [];

                order.items.forEach(item => {
                    const menuItem = menu.find(m => m.id === item.id);
                    const cat = item.category || (menuItem ? menuItem.category : '');

                    if (['drinks', 'coffee', 'tea'].includes(cat)) {
                        const sizeAddon = (item.addons || []).find(a => a._isDrinkSize || a.id === 'M' || a.id === 'L' || a.id === 'XL');
                        const sizeStr = sizeAddon ? ` (${sizeAddon.name})` : '';
                        const otherAddons = (item.addons || []).filter(a => !(a._isDrinkSize || a.id === 'M' || a.id === 'L' || a.id === 'XL'));
                        const ecoStr = item.isEcoCup ? ' [🌱 環保杯]' : '';

                        let detailStr = sizeStr + ecoStr;
                        if (item.note) {
                            detailStr += ` [📝 ${item.note}]`;
                        }
                        if (otherAddons.length > 0) {
                            detailStr += ` (加點: ${otherAddons.map(a => a.name).join(', ')})`;
                        }

                        drinksArray.push({
                            name: `${item.name}${detailStr}`,
                            qty: item.qty
                        });
                    } else {
                        const drinkAddons = (item.addons || []).filter(a => a.id && a.id.startsWith('drink_'));
                        const foodAddons = (item.addons || []).filter(a => !a.id || !a.id.startsWith('drink_'));

                        let foodAddonStr = foodAddons.length > 0 ? ` (加點: ${foodAddons.map(a => a.name).join(', ')})` : '';
                        if (item.note) {
                            foodAddonStr += ` [📝 ${item.note}]`;
                        }
                        foodArray.push({
                            name: `${item.name}${foodAddonStr}`,
                            qty: item.qty
                        });

                        drinkAddons.forEach(da => {
                            drinksArray.push({
                                name: `${da.name} [套餐加購 - 搭配 ${item.name}]`,
                                qty: item.qty
                            });
                        });
                    }
                });
                const hasDrinks = drinksArray.length > 0;
                const hasFood = foodArray.length > 0;
                const isDrinksServed = !!order.drinksServed;
                const isFoodServed = !!order.foodServed;

                let itemsHtml = '';
                if (hasDrinks) {
                    itemsHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin: 0.5rem 0 0.25rem 0; border-bottom:1px dashed #1976d2; padding-bottom: 2px;">
                            <span style="font-weight:bold; color:#1976d2; font-size:0.85rem;">☕ 飲品/飲料區 ${isDrinksServed ? '✅ 已出餐' : ''}</span>
                            ${!isDrinksServed ? `<button class="serve-btn" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#1976d2;" onclick="servePartialOrder(${idx}, 'drinks')">✅ 飲料出餐</button>` : ''}
                        </div>
                        <ul class="order-items-list" style="margin-bottom: 0.5rem; padding-left: 1.2rem; ${isDrinksServed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                    `;
                    drinksArray.forEach(d => {
                        itemsHtml += `<li><strong>${d.qty}x</strong> ${d.name}</li>`;
                    });
                    itemsHtml += '</ul>';
                }

                if (hasFood) {
                    itemsHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin: 0.5rem 0 0.25rem 0; border-bottom:1px dashed #d84315; padding-bottom: 2px;">
                            <span style="font-weight:bold; color:#d84315; font-size:0.85rem;">🍔 餐點/今日特餐區 ${isFoodServed ? '✅ 已出餐' : ''}</span>
                            ${!isFoodServed ? `<button class="serve-btn" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#d84315;" onclick="servePartialOrder(${idx}, 'food')">✅ 餐點出餐</button>` : ''}
                        </div>
                        <ul class="order-items-list" style="margin-bottom: 0.5rem; padding-left: 1.2rem; ${isFoodServed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                    `;
                    foodArray.forEach(f => {
                        itemsHtml += `<li><strong>${f.qty}x</strong> ${f.name}</li>`;
                    });
                    itemsHtml += '</ul>';
                }

                const badgeClass = order.type === '內用' ? 'dine-in' : 'takeout';
                const guestStr = order.guests ? ` (${order.guests}人)` : '';

                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-table-num">🪑 ${order.tableNumber}${guestStr}</span>
                        <span class="order-time">${formatTime(order.date)}</span>
                    </div>
                    ${itemsHtml}
                    <div class="order-card-footer" style="margin-top:0.75rem; padding-top:0.5rem; border-top: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <span class="order-type-badge ${badgeClass}">${order.type}</span>
                        <span style="font-size:0.8rem; color:#888;">
                            ${(hasDrinks && !isDrinksServed) ? '🍹 待出飲料 ' : ''}
                            ${(hasFood && !isFoodServed) ? '🍛 待出餐點' : ''}
                        </span>
                    </div>
                `;
                pendingList.appendChild(card);
            });
        }

        // Render Served
        servedList.innerHTML = '';
        const sortedServed = [...served].reverse();
        if (sortedServed.length === 0) {
            servedList.innerHTML = '<div class="kitchen-empty">尚無出餐紀錄</div>';
        } else {
            sortedServed.forEach(order => {
                const card = document.createElement('div');
                card.className = 'order-card';

                const drinksArray = [];
                const foodArray = [];

                order.items.forEach(item => {
                    const menuItem = menu.find(m => m.id === item.id);
                    const cat = item.category || (menuItem ? menuItem.category : '');

                    if (['drinks', 'coffee', 'tea'].includes(cat)) {
                        const sizeAddon = (item.addons || []).find(a => a._isDrinkSize || a.id === 'M' || a.id === 'L' || a.id === 'XL');
                        const sizeStr = sizeAddon ? ` (${sizeAddon.name})` : '';
                        const otherAddons = (item.addons || []).filter(a => !(a._isDrinkSize || a.id === 'M' || a.id === 'L' || a.id === 'XL'));
                        const ecoStr = item.isEcoCup ? ' [🌱 環保杯]' : '';

                        let detailStr = sizeStr + ecoStr;
                        if (item.note) {
                            detailStr += ` [📝 ${item.note}]`;
                        }
                        if (otherAddons.length > 0) {
                            detailStr += ` (加點: ${otherAddons.map(a => a.name).join(', ')})`;
                        }

                        drinksArray.push({
                            name: `${item.name}${detailStr}`,
                            qty: item.qty
                        });
                    } else {
                        const drinkAddons = (item.addons || []).filter(a => a.id && a.id.startsWith('drink_'));
                        const foodAddons = (item.addons || []).filter(a => !a.id || !a.id.startsWith('drink_'));

                        let foodAddonStr = foodAddons.length > 0 ? ` (加點: ${foodAddons.map(a => a.name).join(', ')})` : '';
                        if (item.note) {
                            foodAddonStr += ` [📝 ${item.note}]`;
                        }
                        foodArray.push({
                            name: `${item.name}${foodAddonStr}`,
                            qty: item.qty
                        });

                        drinkAddons.forEach(da => {
                            drinksArray.push({
                                name: `${da.name} [套餐加購 - 搭配 ${item.name}]`,
                                qty: item.qty
                            });
                        });
                    }
                });

                let itemsHtml = '';
                if (drinksArray.length > 0) {
                    itemsHtml += `<div style="font-weight:bold; color:#1976d2; margin: 0.25rem 0; font-size:0.8rem;">☕ 飲品/飲料</div>`;
                    itemsHtml += '<ul class="order-items-list" style="margin-bottom: 0.25rem; padding-left: 1.2rem; font-size:0.85rem;">';
                    drinksArray.forEach(d => {
                        itemsHtml += `<li><strong>${d.qty}x</strong> ${d.name}</li>`;
                    });
                    itemsHtml += '</ul>';
                }
                if (foodArray.length > 0) {
                    itemsHtml += `<div style="font-weight:bold; color:#d84315; margin: 0.25rem 0; font-size:0.8rem;">🍔 餐點</div>`;
                    itemsHtml += '<ul class="order-items-list" style="margin-bottom: 0.25rem; padding-left: 1.2rem; font-size:0.85rem;">';
                    foodArray.forEach(f => {
                        itemsHtml += `<li><strong>${f.qty}x</strong> ${f.name}</li>`;
                    });
                    itemsHtml += '</ul>';
                }

                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-table-num">🪑 ${order.tableNumber}</span>
                        <span class="order-time">${formatTime(order.date)}</span>
                    </div>
                    ${itemsHtml}
                `;
                servedList.appendChild(card);
            });
        }
    }

    window.servePartialOrder = function (idx, type) {
        const pending = getPendingOrders();
        const order = pending[idx];
        if (!order) return;

        // Separate items to check what exists
        const drinksArray = [];
        const foodArray = [];
        order.items.forEach(item => {
            const menuItem = menu.find(m => m.id === item.id);
            const cat = item.category || (menuItem ? menuItem.category : '');
            if (['drinks', 'coffee', 'tea'].includes(cat)) {
                drinksArray.push(item);
            } else {
                foodArray.push(item);
                const drinkAddons = (item.addons || []).filter(a => a.id && a.id.startsWith('drink_'));
                if (drinkAddons.length > 0) {
                    drinksArray.push(...drinkAddons);
                }
            }
        });

        const hasDrinks = drinksArray.length > 0;
        const hasFood = foodArray.length > 0;

        if (type === 'drinks') {
            order.drinksServed = true;
        } else if (type === 'food') {
            order.foodServed = true;
        }

        const drinksCompleted = !hasDrinks || order.drinksServed;
        const foodCompleted = !hasFood || order.foodServed;

        if (drinksCompleted && foodCompleted) {
            pending.splice(idx, 1);
            const served = getServedOrders();
            served.push(order);
            savePendingOrders(pending);
            saveServedOrders(served);
        } else {
            savePendingOrders(pending);
        }
        renderKitchen();
    };

    window.serveOrder = function (idx) {
        const pending = getPendingOrders();
        const served = getServedOrders();
        const order = pending.splice(idx, 1)[0];
        if (order) {
            order.drinksServed = true;
            order.foodServed = true;
            served.push(order);
            savePendingOrders(pending);
            saveServedOrders(served);
        }
        renderKitchen();
    };

    document.getElementById('refresh-kitchen-btn').addEventListener('click', renderKitchen);
    document.getElementById('clear-served-btn').addEventListener('click', () => {
        if (confirm('確定清除所有出餐紀錄？')) {
            saveServedOrders([]);
            renderKitchen();
        }
    });

    // ===== 即時同步監聽（Firebase 連線後取代 polling）=====
    let syncListenersStarted = false;

    function startSyncListeners() {
        if (syncListenersStarted || !window.PetCafeSync) return;
        if (!PetCafeSync.isOnline) return;
        syncListenersStarted = true;

        // 廚房：待出餐訂單即時更新
        PetCafeSync.syncListen('pendingOrders', (data) => {
            if (document.getElementById('kitchen-tab').classList.contains('active')) {
                renderKitchen();
            }
            // 更新 POS 數量
            updatePOSQueueCount();
        }, 'petCafePendingOrders');

        // 廚房：已出餐紀錄即時更新
        PetCafeSync.syncListen('servedOrders', (data) => {
            if (document.getElementById('kitchen-tab').classList.contains('active')) {
                renderKitchen();
            }
        }, 'petCafeServedOrders');

        // POS 待結帳隊列即時更新
        PetCafeSync.syncListen('posQueue', (data) => {
            updatePOSQueueCount();
            if (isQueueViewOpen) renderPOSQueue();
        }, 'petCafePosQueue');

        // 訂單（完成）即時更新
        PetCafeSync.syncListen('orders', (data) => {
            if (document.getElementById('revenue-tab').classList.contains('active')) {
                renderRevenue();
            }
            if (document.getElementById('settlement-tab').classList.contains('active')) {
                renderSettlement();
            }
            if (document.getElementById('projection-tab').classList.contains('active')) {
                renderProjections();
            }
        }, 'petCafeOrders');

        // 菜單即時更新（後台編輯由自己觸發，主要是同步給其他後台裝置）
        PetCafeSync.syncListen('menu', (newMenu) => {
            menu = newMenu;
            renderAdminMenu();
            if (document.getElementById('pos-tab').classList.contains('active')) {
                renderPOSCatTabs();
                renderPOSMenu();
            }
        }, 'petCafeMenu');

        console.log('[Admin] Firebase 即時同步監聽已啟動');
    }

    // Firebase 連線後啟動監聽
    if (window.PetCafeSync) {
        PetCafeSync.onStatusChange((online) => {
            if (online) startSyncListeners();
        });
        // 如果已經連線
        setTimeout(() => { if (PetCafeSync.isOnline) startSyncListeners(); }, 1500);
    }

    // Fallback polling（無 Firebase 時每 10 秒更新廚房）
    setInterval(() => {
        if (!syncListenersStarted && document.getElementById('kitchen-tab').classList.contains('active')) {
            renderKitchen();
        }
    }, 10000);


    // ===== REVENUE =====
    function renderRevenue() {
        const orders = getOrders();
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const todayStr = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        const monthStr = todayStr.substring(0, 7);

        let todayTotal = 0, todayOrders = 0, todayGuests = 0;
        let monthTotal = 0, monthOrders = 0, monthGuests = 0;

        orders.forEach(o => {
            const dateStr = getLocalDateStr(o.date);
            const mStr = dateStr.substring(0, 7);
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
            
            const itemDetails = (o.items || []).map(i => {
                const addonsStr = i.addons && i.addons.length > 0 ? ` (+${i.addons.map(a => a.name).join('/')})` : '';
                const noteStr = i.note ? ` [${i.note}]` : '';
                const ecoStr = i.isEcoCup ? ' [🌱環保杯]' : '';
                return `${i.name}${addonsStr}${noteStr}${ecoStr} x${i.qty}`;
            }).join('<br>');

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            tr.innerHTML = `
                <td style="padding:0.5rem;vertical-align:top;">${timeStr}</td>
                <td style="padding:0.5rem;vertical-align:top;">${o.tableNumber}</td>
                <td style="padding:0.5rem;vertical-align:top;">${o.type}</td>
                <td style="padding:0.5rem;vertical-align:top;font-size:0.85rem;color:#555;">${itemDetails}</td>
                <td style="padding:0.5rem;vertical-align:top;color:#e65100">- NT$ ${o.discount || 0}</td>
                <td style="padding:0.5rem;vertical-align:top;font-weight:bold">NT$ ${o.total}</td>
            `;
            body.appendChild(tr);
        });

        // Popularity rankings logic
        const drinksStats = {};
        const foodStats = {};

        orders.forEach(o => {
            o.items.forEach(item => {
                const menuItem = menu.find(m => m.id === item.id);
                const cat = item.category || (menuItem ? menuItem.category : 'other');
                const targetStats = (['drinks', 'coffee', 'tea'].includes(cat)) ? drinksStats : foodStats;

                if (!targetStats[item.id]) {
                    targetStats[item.id] = {
                        name: item.name,
                        orderCount: 0,
                        totalQty: 0,
                        totalRevenue: 0
                    };
                }
                targetStats[item.id].orderCount += 1;
                targetStats[item.id].totalQty += item.qty;
                targetStats[item.id].totalRevenue += (item.price * item.qty);
            });
        });

        const sortedDrinks = Object.values(drinksStats).sort((a, b) => {
            if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
            return b.totalQty - a.totalQty;
        });
        const sortedFood = Object.values(foodStats).sort((a, b) => {
            if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
            return b.totalQty - a.totalQty;
        });

        const renderRanking = (containerId, dataList) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            if (dataList.length === 0) {
                container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#888;">尚無點餐資料</td></tr>';
                return;
            }
            dataList.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';

                let rankBadge = `${index + 1}`;
                if (index === 0) rankBadge = '🥇';
                else if (index === 1) rankBadge = '🥈';
                else if (index === 2) rankBadge = '🥉';

                tr.innerHTML = `
                    <td style="padding:0.6rem; text-align:center; font-size:1.1rem;">${rankBadge}</td>
                    <td style="padding:0.6rem;"><strong>${item.name}</strong></td>
                    <td style="padding:0.6rem; text-align:center; font-weight:600; color:#e65100;">${item.orderCount} 次</td>
                    <td style="padding:0.6rem; text-align:center;">${item.totalQty} 份</td>
                    <td style="padding:0.6rem; text-align:right; font-weight:600; color:#2e7d32;">NT$ ${item.totalRevenue.toLocaleString()}</td>
                `;
                container.appendChild(tr);
            });
        };

        renderRanking('rev-drinks-ranking-body', sortedDrinks);
        renderRanking('rev-food-ranking-body', sortedFood);
    }

    document.getElementById('refresh-revenue-btn').addEventListener('click', renderRevenue);

    // ===== SETTLEMENT TAB =====
    const setDateInput = document.getElementById('settlement-date');
    const refreshSetBtn = document.getElementById('refresh-settlement-btn');
    const printSetBtn = document.getElementById('print-settlement-btn');
    const setPettyCash = document.getElementById('set-petty-cash');
    const setExpenseIngredients = document.getElementById('set-expense-ingredients');
    const setExpenseUtilities = document.getElementById('set-expense-utilities');

    if (setDateInput) {
        // Set to local date
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        setDateInput.value = localISOTime;
    }

    function loadSettlementInputsForDate(date) {
        const existingSettlement = getSettlements().find(s => s.date === date);
        if (existingSettlement) {
            setPettyCash.value = existingSettlement.pettyCash || 0;
            if (setExpenseIngredients) setExpenseIngredients.value = existingSettlement.expenseIngredients !== undefined ? existingSettlement.expenseIngredients : (existingSettlement.expenses || 0);
            if (setExpenseUtilities) setExpenseUtilities.value = existingSettlement.expenseUtilities || 0;
        } else {
            const projections = getProjections();
            const p1 = projections[0];
            const workDays = p1.workDaysPerMonth || 26;
            const defaultIng = Math.round(p1.ingredientCost / workDays) || 0;
            const defaultUtil = Math.round(p1.utilityCost / workDays) || 0;

            setPettyCash.value = 0;
            if (setExpenseIngredients) setExpenseIngredients.value = defaultIng;
            if (setExpenseUtilities) setExpenseUtilities.value = defaultUtil;
        }
    }

    // Initialize settlement inputs for current date
    if (setDateInput) {
        loadSettlementInputsForDate(setDateInput.value);
    }

    window.renderSettlement = function () {
        const targetDate = setDateInput.value;
        const orders = getOrders().filter(o => getLocalDateStr(o.date) === targetDate);

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
        const expIngredients = parseInt(setExpenseIngredients.value, 10) || 0;
        const expUtilities = parseInt(setExpenseUtilities.value, 10) || 0;
        const remit = revenue - petty - expIngredients - expUtilities;
        document.getElementById('set-remittance').textContent = `NT$ ${remit.toLocaleString()}`;
    }

    if (refreshSetBtn) refreshSetBtn.addEventListener('click', renderSettlement);
    if (setDateInput) {
        setDateInput.addEventListener('change', () => {
            loadSettlementInputsForDate(setDateInput.value);
            renderSettlement();
        });
    }
    if (setPettyCash) setPettyCash.addEventListener('input', () => calculateRemittance(parseInt(document.getElementById('set-calc-revenue').value.replace(/\D/g, '')) || 0));
    if (setExpenseIngredients) setExpenseIngredients.addEventListener('input', () => calculateRemittance(parseInt(document.getElementById('set-calc-revenue').value.replace(/\D/g, '')) || 0));
    if (setExpenseUtilities) setExpenseUtilities.addEventListener('input', () => calculateRemittance(parseInt(document.getElementById('set-calc-revenue').value.replace(/\D/g, '')) || 0));

    if (printSetBtn) {
        printSetBtn.addEventListener('click', () => {
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'block');
            window.print();
            document.querySelectorAll('.print-only').forEach(el => el.style.display = 'none');
        });
    }

    function performSettlementForDate(targetDate) {
        const allOrders = getOrders();
        const unsettledOrders = allOrders.filter(o => getLocalDateStr(o.date) === targetDate && !o.isSettled);

        if (unsettledOrders.length === 0) return false;

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
        const expIngredients = parseInt(setExpenseIngredients.value, 10) || 0;
        const expUtilities = parseInt(setExpenseUtilities.value, 10) || 0;

        const settlementRecord = {
            id: 'SET' + Date.now() + Math.random().toString(36).substr(2, 5),
            date: targetDate,
            timestamp: new Date().toISOString(),
            revenue: totalRevenue,
            ordersCount: unsettledOrders.length,
            guestsCount: totalGuests,
            dineInCount,
            takeoutCount,
            totalDiscount,
            pettyCash: petty,
            expenseIngredients: expIngredients,
            expenseUtilities: expUtilities,
            expenses: expIngredients + expUtilities,
            remittance: totalRevenue - petty - expIngredients - expUtilities,
            categoryStats,
            itemStats
        };
        const settlements = getSettlements();
        settlements.push(settlementRecord);
        saveSettlements(settlements);

        // Mark orders as settled
        allOrders.forEach(o => {
            if (getLocalDateStr(o.date) === targetDate && !o.isSettled) {
                o.isSettled = true;
            }
        });
        saveOrders(allOrders);
        return true;
    }

    const confirmSetBtn = document.getElementById('confirm-settlement-btn');
    if (confirmSetBtn) {
        confirmSetBtn.addEventListener('click', () => {
            const targetDate = setDateInput.value;
            const allOrders = getOrders();
            const unsettledOrders = allOrders.filter(o => getLocalDateStr(o.date) === targetDate && !o.isSettled);

            if (unsettledOrders.length === 0) {
                alert('目前沒有可結算的訂單資料！');
                return;
            }

            if (!confirm('確定要進行當日結算嗎？\n結算後這批訂單將不會再出現在結算清單中，並會保存結算紀錄。')) {
                return;
            }

            const success = performSettlementForDate(targetDate);
            if (success) {
                alert('結算完成！數據已成功留存。');
                setPettyCash.value = '0';
                setExpenseIngredients.value = '';
                setExpenseUtilities.value = '';
                renderSettlement();
                if (typeof renderProjections === 'function') renderProjections();
            }
        });
    }

    const clearTodayDataBtn = document.getElementById('clear-today-data-btn');
    if (clearTodayDataBtn) {
        clearTodayDataBtn.addEventListener('click', () => {
            const targetDate = setDateInput.value;
            const allOrders = getOrders();
            const todayOrders = allOrders.filter(o => getLocalDateStr(o.date) === targetDate);

            if (todayOrders.length === 0) {
                alert('今日尚無任何訂單數據可清除！');
                return;
            }

            const unsettledOrders = todayOrders.filter(o => !o.isSettled);
            if (unsettledOrders.length > 0) {
                if (confirm(`系統檢測到今日有 ${unsettledOrders.length} 筆未結算訂單。\n清除數據前，系統將自動進行「當日結算」並存入歷史紀錄，確定要繼續嗎？`)) {
                    performSettlementForDate(targetDate);
                } else {
                    return;
                }
            } else {
                if (!confirm('確定要清除今日的所有訂單數據嗎？（歷史結算紀錄仍會妥善保留）')) {
                    return;
                }
            }

            // Remove today's orders
            const remainingOrders = getOrders().filter(o => getLocalDateStr(o.date) !== targetDate);
            saveOrders(remainingOrders);

            setPettyCash.value = '0';
            setExpenseIngredients.value = '';
            setExpenseUtilities.value = '';

            alert('今日訂單數據已清除，歷史結算紀錄已安全存檔！');
            renderSettlement();
            if (typeof renderRevenue === 'function') renderRevenue();
            if (typeof renderProjections === 'function') renderProjections();
        });
    }

    const clearAllRevenueBtn = document.getElementById('clear-all-revenue-btn');
    if (clearAllRevenueBtn) {
        clearAllRevenueBtn.addEventListener('click', () => {
            const allOrders = getOrders();
            if (allOrders.length === 0) {
                alert('目前沒有任何營收數據可清除！');
                return;
            }

            const unsettledOrders = allOrders.filter(o => !o.isSettled);
            if (unsettledOrders.length > 0) {
                if (confirm(`系統檢測到有 ${unsettledOrders.length} 筆未結算的訂單。\n清除前，系統將自動依據日期將這些訂單全部結算並存入歷史紀錄，然後清除所有原始點單數據。是否繼續？`)) {
                    const unsettledDates = Array.from(new Set(unsettledOrders.map(o => getLocalDateStr(o.date))));
                    unsettledDates.forEach(date => {
                        performSettlementForDate(date);
                    });
                } else {
                    return;
                }
            } else {
                if (!confirm('確認要清除所有歷史點單數據嗎？（已結算之歷史統計報表將予以保留）')) {
                    return;
                }
            }

            saveOrders([]);
            alert('所有點單數據已清除，歷史結算統計報表已妥善保留！');
            
            if (typeof renderRevenue === 'function') renderRevenue();
            if (typeof renderSettlement === 'function') renderSettlement();
            if (typeof renderProjections === 'function') renderProjections();
        });
    }

    // ===== MONTHLY SETTLEMENT LOGIC =====
    const viewMonthlyBtn = document.getElementById('view-monthly-settlement-btn');
    const monthlyModal = document.getElementById('monthly-settlement-modal');
    const closeMonthlyBtn = document.getElementById('close-monthly-settlement-btn');
    const calculateMonthlyBtn = document.getElementById('calculate-monthly-btn');
    const monthlySelect = document.getElementById('monthly-settlement-select');
    const printMonthlyBtn = document.getElementById('print-monthly-btn');

    if (viewMonthlyBtn) {
        viewMonthlyBtn.addEventListener('click', () => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const currentMonthStr = (new Date(Date.now() - tzoffset)).toISOString().substring(0, 7);
            if (monthlySelect) {
                monthlySelect.value = currentMonthStr;
            }
            renderMonthlySettlementReport(currentMonthStr);
            if (monthlyModal) monthlyModal.style.display = 'flex';
        });
    }

    if (closeMonthlyBtn) {
        closeMonthlyBtn.addEventListener('click', () => {
            if (monthlyModal) monthlyModal.style.display = 'none';
        });
    }

    if (calculateMonthlyBtn) {
        calculateMonthlyBtn.addEventListener('click', () => {
            if (monthlySelect) {
                renderMonthlySettlementReport(monthlySelect.value);
            }
        });
    }

    if (printMonthlyBtn) {
        printMonthlyBtn.addEventListener('click', () => {
            const style = document.createElement('style');
            style.innerHTML = `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #monthly-print-area, #monthly-print-area * {
                        visibility: visible;
                    }
                    #monthly-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: #fff !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
            window.print();
            document.head.removeChild(style);
        });
    }

    function renderMonthlySettlementReport(monthStr) {
        const printArea = document.getElementById('monthly-print-area');
        if (!printArea) return;

        const settlements = getSettlements().filter(s => s.date.startsWith(monthStr));
        
        if (settlements.length === 0) {
            printArea.innerHTML = `
                <div style="text-align:center; padding:3rem; background:#fff; border-radius:8px; border:1px solid #ddd; color:#888;">
                    <h3>⚠️ 該月份 (${monthStr}) 尚無任何日結算數據</h3>
                    <p style="margin-top:0.5rem;">請先在當日結算頁面完成每日的「確認結算」。</p>
                </div>
            `;
            return;
        }

        let totalRevenue = 0;
        let totalDiscount = 0;
        let totalOrders = 0;
        let totalGuests = 0;
        let dineInCount = 0;
        let takeoutCount = 0;
        let totalPettyCash = 0;
        let totalIngredients = 0;
        let totalUtilities = 0;
        let totalRemittance = 0;
        
        const categoryStats = {};
        const itemStats = {};

        settlements.forEach(s => {
            totalRevenue += (s.revenue || 0);
            totalDiscount += (s.totalDiscount || 0);
            totalOrders += (s.ordersCount || 0);
            totalGuests += (s.guestsCount || 0);
            dineInCount += (s.dineInCount || 0);
            takeoutCount += (s.takeoutCount || 0);
            totalPettyCash += (s.pettyCash || 0);
            totalIngredients += (s.expenseIngredients !== undefined ? s.expenseIngredients : (s.expenses || 0));
            totalUtilities += (s.expenseUtilities || 0);
            totalRemittance += (s.remittance || 0);

            if (s.categoryStats) {
                Object.entries(s.categoryStats).forEach(([cat, amount]) => {
                    categoryStats[cat] = (categoryStats[cat] || 0) + amount;
                });
            }

            if (s.itemStats) {
                Object.entries(s.itemStats).forEach(([name, stat]) => {
                    if (!itemStats[name]) itemStats[name] = { qty: 0, revenue: 0 };
                    itemStats[name].qty += stat.qty;
                    itemStats[name].revenue += stat.revenue;
                });
            }
        });

        let catHtml = '';
        const totalCatRev = Object.values(categoryStats).reduce((a, b) => a + b, 0);
        Object.keys(categoryStats).forEach(catId => {
            const catInfo = getCategoryInfo(catId);
            const amount = categoryStats[catId];
            const pct = totalCatRev ? Math.round((amount / totalCatRev) * 100) : 0;
            catHtml += `
                <tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:0.6rem 0; text-align:left;">${catInfo.icon} ${catInfo.label}</td>
                    <td style="padding:0.6rem 0; text-align:right; font-weight:600;">NT$ ${amount.toLocaleString()}</td>
                    <td style="padding:0.6rem 0; text-align:right; color:#666;">${pct}%</td>
                </tr>
            `;
        });

        let itemHtml = '';
        const sortedItems = Object.entries(itemStats).sort((a, b) => b[1].revenue - a[1].revenue);
        sortedItems.forEach(([name, stat]) => {
            itemHtml += `
                <tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:0.6rem 0; text-align:left;">${name}</td>
                    <td style="padding:0.6rem 0; text-align:center; font-weight:600;">${stat.qty}</td>
                    <td style="padding:0.6rem 0; text-align:right; font-weight:600; color:#2e7d32;">NT$ ${stat.revenue.toLocaleString()}</td>
                </tr>
            `;
        });

        printArea.innerHTML = `
            <div style="background:#fff; border-radius:12px; padding:2rem; border:1px solid #ddd;">
                <h2 style="text-align:center; margin-bottom:0.25rem; color:#009688;">🐾 <span class="shop-name-display">${getSettings().shopName}</span> - 月底統計結算單</h2>
                <p style="text-align:center; color:#666; margin-bottom:2rem; font-size:1.1rem; font-weight:600;">結算月份：${monthStr}</p>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
                    <div class="stat-card" style="border-top:4px solid #009688; background:#f9f9f9; padding:1rem; border-radius:8px; border-left:1px solid #eee; border-right:1px solid #eee; border-bottom:1px solid #eee;">
                        <h3 style="font-size:0.9rem; color:#666; margin:0;">💰 月總營業額</h3>
                        <div class="val" style="font-size:1.5rem; margin:0.5rem 0; font-weight:bold; color:#00796b;">NT$ ${totalRevenue.toLocaleString()}</div>
                        <div class="sub-val" style="font-size:0.8rem; color:#888;">總折扣額：NT$ ${totalDiscount.toLocaleString()}</div>
                    </div>
                    <div class="stat-card" style="border-top:4px solid #009688; background:#f9f9f9; padding:1rem; border-radius:8px; border-left:1px solid #eee; border-right:1px solid #eee; border-bottom:1px solid #eee;">
                        <h3 style="font-size:0.9rem; color:#666; margin:0;">🧾 月總單數 / 人數</h3>
                        <div class="val" style="font-size:1.5rem; margin:0.5rem 0; font-weight:bold; color:#00796b;">${totalOrders} 筆</div>
                        <div class="sub-val" style="font-size:0.8rem; color:#888;">總來客數：${totalGuests} 人</div>
                    </div>
                    <div class="stat-card" style="border-top:4px solid #009688; background:#f9f9f9; padding:1rem; border-radius:8px; border-left:1px solid #eee; border-right:1px solid #eee; border-bottom:1px solid #eee;">
                        <h3 style="font-size:0.9rem; color:#666; margin:0;">🍽️ 訂單類型佔比</h3>
                        <div class="val" style="font-size:1.2rem; margin:0.5rem 0; font-weight:bold; color:#00796b;">內用：${dineInCount} 筆</div>
                        <div class="sub-val" style="font-size:0.8rem; color:#888;">外帶：${takeoutCount} 筆</div>
                    </div>
                    <div class="stat-card" style="border-top:4px solid #009688; background:#f9f9f9; padding:1rem; border-radius:8px; border-left:1px solid #eee; border-right:1px solid #eee; border-bottom:1px solid #eee;">
                        <h3 style="font-size:0.9rem; color:#666; margin:0;">👤 月均客單價</h3>
                        <div class="val" style="font-size:1.5rem; margin:0.5rem 0; font-weight:bold; color:#00796b;">NT$ ${(totalGuests ? Math.round(totalRevenue / totalGuests) : 0).toLocaleString()}</div>
                        <div class="sub-val" style="font-size:0.8rem; color:#888;">每桌均價：NT$ ${(totalOrders ? Math.round(totalRevenue / totalOrders) : 0).toLocaleString()}</div>
                    </div>
                </div>

                <div style="background:#e0f2f1; border-radius:12px; padding:1.5rem; border:2px solid #80cbc4; margin-bottom:2rem;">
                    <h3 style="margin-top:0; margin-bottom:1rem; color:#00796b;">💼 月度收支與實收統計</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; align-items:center;">
                        <div><label style="display:block; font-weight:600; font-size:0.85rem; color:#00796b; margin-bottom:0.25rem;">總營業額</label><div style="font-size:1.25rem; font-weight:bold;">NT$ ${totalRevenue.toLocaleString()}</div></div>
                        <div><label style="display:block; font-weight:600; font-size:0.85rem; color:#00796b; margin-bottom:0.25rem;">➖ 總留存零用金</label><div style="font-size:1.25rem; color:#555;">NT$ ${totalPettyCash.toLocaleString()}</div></div>
                        <div><label style="display:block; font-weight:600; font-size:0.85rem; color:#00796b; margin-bottom:0.25rem;">➖ 食材總支出</label><div style="font-size:1.25rem; color:#c62828; font-weight:600;">NT$ ${totalIngredients.toLocaleString()}</div></div>
                        <div><label style="display:block; font-weight:600; font-size:0.85rem; color:#00796b; margin-bottom:0.25rem;">➖ 水電雜支總額</label><div style="font-size:1.25rem; color:#ef6c00; font-weight:600;">NT$ ${totalUtilities.toLocaleString()}</div></div>
                        <div style="text-align:right;"><label style="display:block; font-weight:700; font-size:0.9rem; color:#00796b; margin-bottom:0.25rem;">🏦 月度實收總匯款</label><div style="font-size:1.8rem; font-weight:800; color:#00796b;">NT$ ${totalRemittance.toLocaleString()}</div></div>
                    </div>
                </div>

                <div class="grid-responsive-2col">
                    <div style="background:#fff; padding:1.25rem; border-radius:8px; border:1px solid #eee;">
                        <h3 style="margin-top:0; margin-bottom:0.75rem; border-bottom:2px solid #009688; padding-bottom:0.5rem; color:#00796b; font-size:1.05rem;">📊 各分類月營收</h3>
                        <div class="table-responsive">
                            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                                <thead>
                                    <tr style="border-bottom:2px solid #eee; text-align:left;">
                                        <th style="padding:0.5rem 0;">分類</th>
                                        <th style="padding:0.5rem 0; text-align:right;">營收</th>
                                        <th style="padding:0.5rem 0; text-align:right;">佔比</th>
                                    </tr>
                                </thead>
                                <tbody>${catHtml}</tbody>
                            </table>
                        </div>
                    </div>
                    <div style="background:#fff; padding:1.25rem; border-radius:8px; border:1px solid #eee;">
                        <h3 style="margin-top:0; margin-bottom:0.75rem; border-bottom:2px solid #009688; padding-bottom:0.5rem; color:#00796b; font-size:1.05rem;">🏆 當月熱銷排行</h3>
                        <div style="max-height:300px; overflow-y:auto;" class="table-responsive">
                            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                                <thead>
                                    <tr style="border-bottom:2px solid #eee; text-align:left;">
                                        <th style="padding:0.5rem 0;">商品名稱</th>
                                        <th style="padding:0.5rem 0; text-align:center;">數量</th>
                                        <th style="padding:0.5rem 0; text-align:right;">小計</th>
                                    </tr>
                                </thead>
                                <tbody>${itemHtml}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== HISTORY LOGIC =====
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const histListModal = document.getElementById('history-list-modal');
    const histListBody = document.getElementById('history-list-body');
    const closeHistListBtn = document.getElementById('close-history-list-btn');

    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            const settlements = getSettlements().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            histListBody.innerHTML = '';
            if (settlements.length === 0) {
                histListBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem;">尚無結算紀錄</td></tr>';
            } else {
                settlements.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #eee';
                    tr.innerHTML = `
                        <td style="padding:0.75rem;">${s.date} <span style="color:#888;font-size:0.8rem;">(${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span></td>
                        <td style="padding:0.75rem;">NT$ ${(s.revenue || 0).toLocaleString()}</td>
                        <td style="padding:0.75rem; color:#2e7d32; font-weight:bold;">NT$ ${(s.remittance || 0).toLocaleString()}</td>
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

    window.viewHistoryDetail = function (id) {
        const s = getSettlements().find(x => x.id === id);
        if (!s) return;

        document.getElementById('hist-detail-title').textContent = `結算明細 - ${s.date}`;

        let catHtml = '';
        if (s.categoryStats) {
            let totalItemRev = Object.values(s.categoryStats).reduce((a, b) => a + b, 0);
            Object.keys(s.categoryStats).forEach(catId => {
                const catInfo = getCategoryInfo(catId);
                const amount = s.categoryStats[catId];
                const pct = totalItemRev ? Math.round((amount / totalItemRev) * 100) : 0;
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
            const sorted = Object.entries(s.itemStats).sort((a, b) => b[1].revenue - a[1].revenue);
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
                    <div class="val">NT$ ${(s.revenue || 0).toLocaleString()}</div>
                    <div class="sub-val">總折扣金額：NT$ ${(s.totalDiscount || 0).toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <h3>🧾 總單數 / 人數</h3>
                    <div class="val">${s.ordersCount || 0} 筆</div>
                    <div class="sub-val">來客數：${s.guestsCount || 0} 人</div>
                </div>
                <div class="stat-card">
                    <h3>🍽️ 訂單類型</h3>
                    <div class="val" style="font-size:1.4rem;">內用：${s.dineInCount || 0} 筆</div>
                    <div class="sub-val" style="font-size:1.1rem; color:#444;">外帶：${s.takeoutCount || 0} 筆</div>
                </div>
                <div class="stat-card">
                    <h3>👤 平均客單價</h3>
                    <div class="val">NT$ ${(s.guestsCount ? Math.round(s.revenue / s.guestsCount) : 0).toLocaleString()}</div>
                    <div class="sub-val">每桌均價：NT$ ${(s.ordersCount ? Math.round(s.revenue / s.ordersCount) : 0).toLocaleString()}</div>
                </div>
            </div>

            <div style="background:#fff3e0; border-radius:12px; padding:1.5rem; border:2px solid #ffcc80; margin-bottom:2rem;">
                <h3 style="margin-bottom:1rem; color:#e65100;">💼 現金結算與匯款計算</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; align-items:center;">
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">總營業額</label><div style="font-size:1.2rem;font-weight:bold;">NT$ ${(s.revenue || 0).toLocaleString()}</div></div>
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">➖ 留存零用金</label><div style="font-size:1.2rem;">NT$ ${(s.pettyCash || 0).toLocaleString()}</div></div>
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">➖ 食材支出</label><div style="font-size:1.2rem;">NT$ ${(s.expenseIngredients !== undefined ? s.expenseIngredients : (s.expenses || 0)).toLocaleString()}</div></div>
                    <div><label style="display:block; font-weight:600; margin-bottom:0.25rem;">➖ 水電雜支</label><div style="font-size:1.2rem;">NT$ ${(s.expenseUtilities || 0).toLocaleString()}</div></div>
                    <div style="text-align:right;">
                        <label style="display:block; font-weight:600; margin-bottom:0.25rem; color:#2e7d32;">🏦 實際匯款金額</label>
                        <div style="font-size:2rem; font-weight:800; color:#2e7d32;">NT$ ${(s.remittance || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div class="grid-responsive-2col">
                <div style="background:#fff; padding:1.5rem; border-radius:12px; border:1px solid #ddd;">
                    <h3 style="margin-bottom:1rem; border-bottom:2px solid #eee; padding-bottom:0.5rem;">📊 各分類營收</h3>
                    <div class="table-responsive">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead><tr style="border-bottom:2px solid #eee;"><th style="padding:0.5rem 0;">分類</th><th style="padding:0.5rem 0; text-align:right;">營收</th><th style="padding:0.5rem 0; text-align:right;">佔比</th></tr></thead>
                            <tbody>${catHtml}</tbody>
                        </table>
                    </div>
                </div>
                <div style="background:#fff; padding:1.5rem; border-radius:12px; border:1px solid #ddd;">
                    <h3 style="margin-bottom:1rem; border-bottom:2px solid #eee; padding-bottom:0.5rem;">🏆 商品銷售排行</h3>
                    <div class="table-responsive">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead><tr style="border-bottom:2px solid #eee;"><th style="padding:0.5rem 0;">商品名稱</th><th style="padding:0.5rem 0; text-align:center;">數量</th><th style="padding:0.5rem 0; text-align:right;">小計</th></tr></thead>
                            <tbody>${itemHtml}</tbody>
                        </table>
                    </div>
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
        // Load latest projections
        projections = getProjections();
        investment = getInvestment();

        // 0. Check for monthly reset (transitions to a new month) for the first column "一個月"
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const currentMonthStr = (new Date(Date.now() - tzoffset)).toISOString().substring(0, 7);
        const lastResetMonth = localStorage.getItem('petCafeLastResetMonth');
        if (lastResetMonth && lastResetMonth !== currentMonthStr) {
            projections[0].dailyCustomers = 0;
            projections[0].workDaysPerMonth = 0;
            projections[0].avgTicketPrice = 0;
            projections[0].ingredientCost = 0;
            projections[0].personnelCost = 0;
            projections[0].rentCost = 0;
            projections[0].utilityCost = 0;
            saveProjections(projections);
            localStorage.setItem('petCafeLastResetMonth', currentMonthStr);
        } else if (!lastResetMonth) {
            localStorage.setItem('petCafeLastResetMonth', currentMonthStr);
        }

        // 1. Calculate actual statistics for the current month (Link 1: Revenue linkage)
        const currentMonthOrders = getOrders().filter(o => getLocalDateStr(o.date).startsWith(currentMonthStr));
        const uniqueDates = new Set(currentMonthOrders.map(o => getLocalDateStr(o.date)));
        const actualWorkDays = uniqueDates.size;

        const actualTotalRevenue = currentMonthOrders.reduce((sum, o) => sum + o.total, 0);
        const actualTotalGuests = currentMonthOrders.reduce((sum, o) => sum + (o.guests || 1), 0);

        const actualDailyCustomers = actualWorkDays > 0 ? Math.round(actualTotalGuests / actualWorkDays) : 0;
        const actualAvgTicketPrice = actualTotalGuests > 0 ? Math.round(actualTotalRevenue / actualTotalGuests) : 0;

        let syncChanged = false;

        if (actualWorkDays > 0) {
            if (projections[0].dailyCustomers !== actualDailyCustomers ||
                projections[0].workDaysPerMonth !== actualWorkDays ||
                projections[0].avgTicketPrice !== actualAvgTicketPrice) {
                projections[0].dailyCustomers = actualDailyCustomers;
                projections[0].workDaysPerMonth = actualWorkDays;
                projections[0].avgTicketPrice = actualAvgTicketPrice;
                syncChanged = true;
            }
        }

        // 2. Calculate actual expenses for the current month (Link 2: Settlement linkage)
        const monthSettlements = getSettlements().filter(s => s.date.startsWith(currentMonthStr));
        const settledDays = monthSettlements.length;

        if (settledDays > 0) {
            const totalSettledIngredients = monthSettlements.reduce((sum, s) => sum + (s.expenseIngredients || 0), 0);
            const totalSettledUtilities = monthSettlements.reduce((sum, s) => sum + (s.expenseUtilities || 0), 0);

            if (projections[0].ingredientCost !== totalSettledIngredients ||
                projections[0].utilityCost !== totalSettledUtilities) {
                projections[0].ingredientCost = totalSettledIngredients;
                projections[0].utilityCost = totalSettledUtilities;
                syncChanged = true;
            }
        }

        if (syncChanged) {
            saveProjections(projections);
        }

        // 3. Automatically estimate Year 1 (index 1) and Year 2 (index 2) parameters from Column 0 ("一個月")
        const p0 = projections[0];

        // Year 1: Customers +10%, Average Price +5%, Ingredients +10%
        projections[1].dailyCustomers = Math.round(p0.dailyCustomers * 1.1) || 0;
        projections[1].avgTicketPrice = Math.round(p0.avgTicketPrice * 1.05) || 0;
        projections[1].workDaysPerMonth = p0.workDaysPerMonth || 0;
        projections[1].ingredientCost = Math.round(p0.ingredientCost * 1.1) || 0;
        projections[1].personnelCost = p0.personnelCost || 0;
        projections[1].rentCost = p0.rentCost || 0;
        projections[1].utilityCost = p0.utilityCost || 0;

        // Year 2: Customers +30%, Average Price +10%, Ingredients +30%, Rent +5%, Utilities +5%
        projections[2].dailyCustomers = Math.round(p0.dailyCustomers * 1.3) || 0;
        projections[2].avgTicketPrice = Math.round(p0.avgTicketPrice * 1.1) || 0;
        projections[2].workDaysPerMonth = p0.workDaysPerMonth || 0;
        projections[2].ingredientCost = Math.round(p0.ingredientCost * 1.3) || 0;
        projections[2].personnelCost = Math.round(p0.personnelCost * 1.05) || 0;
        projections[2].rentCost = Math.round(p0.rentCost * 1.05) || 0;
        projections[2].utilityCost = Math.round(p0.utilityCost * 1.05) || 0;

        const body = document.getElementById('projection-body');
        body.innerHTML = '';
        const labels = ['每日客流', '月營業天數', '平均客單價', '食材成本(月)', '人事成本(月)', '租金(月)', '水電雜支(月)'];
        const keys = ['dailyCustomers', 'workDaysPerMonth', 'avgTicketPrice', 'ingredientCost', 'personnelCost', 'rentCost', 'utilityCost'];

        labels.forEach((label, i) => {
            const key = keys[i];
            const tr = document.createElement('tr');
            let html = `<td><strong>${label}</strong></td>`;
            projections.forEach((proj, idx) => {
                const isLinked = (idx === 0) && (
                    ((key === 'dailyCustomers' || key === 'workDaysPerMonth' || key === 'avgTicketPrice') && actualWorkDays > 0) ||
                    ((key === 'ingredientCost' || key === 'utilityCost') && settledDays > 0)
                );

                if (idx > 0) {
                    html += `<td><input type="number" class="form-control proj-input" data-idx="${idx}" data-key="${key}" value="${proj[key]}" disabled style="background:#f1f3f5; color:#555;" title="由一個月數據自動估算得出"></td>`;
                } else if (isLinked) {
                    html += `<td><input type="number" class="form-control proj-input" data-idx="${idx}" data-key="${key}" value="${proj[key]}" disabled style="background:#e9ecef; font-weight:bold; color:#1a237e;" title="由實際營收/當日結算自動連動"></td>`;
                } else {
                    html += `<td><input type="number" class="form-control proj-input" data-idx="${idx}" data-key="${key}" value="${proj[key]}"></td>`;
                }
            });
            tr.innerHTML = html;
            body.appendChild(tr);
        });

        // Computed rows
        const revTr = document.createElement('tr'); revTr.style.background = '#f0f8ff';
        const costTr = document.createElement('tr'); costTr.style.background = '#fff0f0';
        const profTr = document.createElement('tr'); profTr.style.background = '#f0fff0';

        let revHtml = `<td><strong>營收 (系統計算)</strong></td>`;
        let costHtml = `<td><strong>總成本 (系統計算)</strong></td>`;
        let profHtml = `<td><strong>淨利 (系統計算)</strong></td>`;

        projections.forEach((p, idx) => {
            const isMonthly = (idx === 0);
            const multiplier = isMonthly ? 1 : 12;
            const rev = p.dailyCustomers * p.avgTicketPrice * p.workDaysPerMonth * multiplier;
            const cost = (p.ingredientCost * multiplier) + (p.personnelCost * multiplier) + (p.rentCost * multiplier) + (p.utilityCost * multiplier);
            const prof = rev - cost;
            const unit = isMonthly ? '萬 /月' : '萬 /年';
            revHtml += `<td>NT$ ${(rev / 10000).toFixed(1)} ${unit}</td>`;
            costHtml += `<td>NT$ ${(cost / 10000).toFixed(1)} ${unit}</td>`;
            profHtml += `<td style="color:${prof >= 0 ? 'green' : 'red'};font-weight:bold">NT$ ${(prof / 10000).toFixed(1)} ${unit}</td>`;
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

        // Calculate and display payback period (ROI) based on monthly run-rate of the "一個月" column
        const p1 = projections[0];
        const revMonth = p1.dailyCustomers * p1.avgTicketPrice * p1.workDaysPerMonth;
        const costMonth = p1.ingredientCost + p1.personnelCost + p1.rentCost + p1.utilityCost;
        const monthlyProfit = revMonth - costMonth;

        const roiEl = document.getElementById('inv-roi');
        if (roiEl) {
            if (monthlyProfit <= 0) {
                roiEl.textContent = '無法回收 (淨利為負)';
                roiEl.style.color = '#d32f2f';
            } else {
                const months = totInv / monthlyProfit;
                if (months < 12) {
                    roiEl.textContent = `${months.toFixed(1)} 個月`;
                } else {
                    const years = Math.floor(months / 12);
                    const remMonths = Math.round(months % 12);
                    roiEl.textContent = `${years} 年 ${remMonths} 個月 (${months.toFixed(1)} 個月)`;
                }
                roiEl.style.color = '#2e7d32';
            }
        }

        updateCharts(totInv);
    }

    document.getElementById('save-projection-btn').addEventListener('click', () => {
        // Read Column 0 inputs
        document.querySelectorAll('.proj-input[data-idx="0"]').forEach(inp => {
            projections[0][inp.dataset.key] = Number(inp.value);
        });

        // Auto calculate Column 1 and Column 2 to make sure it saves the latest estimations
        const p0 = projections[0];
        projections[1].dailyCustomers = Math.round(p0.dailyCustomers * 1.1) || 0;
        projections[1].avgTicketPrice = Math.round(p0.avgTicketPrice * 1.05) || 0;
        projections[1].workDaysPerMonth = p0.workDaysPerMonth || 0;
        projections[1].ingredientCost = Math.round(p0.ingredientCost * 1.1) || 0;
        projections[1].personnelCost = p0.personnelCost || 0;
        projections[1].rentCost = p0.rentCost || 0;
        projections[1].utilityCost = p0.utilityCost || 0;

        projections[2].dailyCustomers = Math.round(p0.dailyCustomers * 1.3) || 0;
        projections[2].avgTicketPrice = Math.round(p0.avgTicketPrice * 1.1) || 0;
        projections[2].workDaysPerMonth = p0.workDaysPerMonth || 0;
        projections[2].ingredientCost = Math.round(p0.ingredientCost * 1.3) || 0;
        projections[2].personnelCost = Math.round(p0.personnelCost * 1.05) || 0;
        projections[2].rentCost = Math.round(p0.rentCost * 1.05) || 0;
        projections[2].utilityCost = Math.round(p0.utilityCost * 1.05) || 0;

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
        const revs = projections.map((p, idx) => {
            const mult = (idx === 0) ? 1 : 12;
            return (p.dailyCustomers * p.avgTicketPrice * p.workDaysPerMonth * mult) / 10000;
        });
        const costs = projections.map((p, idx) => {
            const mult = (idx === 0) ? 1 : 12;
            return ((p.ingredientCost * mult) + (p.personnelCost * mult) + (p.rentCost * mult) + (p.utilityCost * mult)) / 10000;
        });
        const profits = revs.map((r, i) => r - costs[i]);

        const ctxRev = document.getElementById('revenueCostChart');
        if (charts.rev) charts.rev.destroy();
        charts.rev = new Chart(ctxRev, {
            type: 'bar', data: {
                labels: ['一個月', '第一年', '第二年'], datasets: [
                    { label: '營收(萬)', data: revs, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: '成本(萬)', data: costs, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
                ]
            }
        });

        const ctxProf = document.getElementById('profitMarginChart');
        if (charts.prof) charts.prof.destroy();
        charts.prof = new Chart(ctxProf, {
            type: 'line', data: {
                labels: ['一個月', '第一年', '第二年'], datasets: [
                    { label: '淨利率(%)', data: profits.map((p, i) => revs[i] > 0 ? (p / revs[i]) * 100 : 0), borderColor: '#36A2EB' }
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
                labels: ['食材', '人事', '租金', '水電雜支'], datasets: [{
                    data: [p3.ingredientCost * 12, p3.personnelCost * 12, p3.rentCost * 12, p3.utilityCost * 12],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
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

    // ===== INGREDIENTS & COST MATRIX =====
    let ingredients = getIngredients();
    let costMatrix = getCostMatrix();

    function getCostRates() {
        const saved = localStorage.getItem('petCafeCostRates');
        return saved ? JSON.parse(saved) : { drinks: 30, food: 35 };
    }
    
    function saveCostRates(rates) {
        localStorage.setItem('petCafeCostRates', JSON.stringify(rates));
    }

    function saveCurrentIngredientsState() {
        const drinksRows = document.querySelectorAll('#ingredients-editor-list-drinks > div');
        const foodRows = document.querySelectorAll('#ingredients-editor-list-food > div');
        const temp = [];

        const parseRow = (row, type) => {
            const nameInp = row.querySelector('.ing-name-input');
            if (!nameInp) return;
            const name = nameInp.value.trim();
            const weight = parseFloat(row.querySelector('.ing-weight-input').value) || 1;
            const unit = row.querySelector('.ing-unit-input').value.trim();
            const purchasePrice = parseFloat(row.querySelector('.ing-price-input').value) || 0;
            const idx = parseInt(nameInp.dataset.idx, 10);
            const id = ingredients[idx]?.id || 'ing_' + Date.now() + Math.random();
            temp.push({ id, name, weight, unit, purchasePrice, type });
        };

        drinksRows.forEach(row => parseRow(row, 'drinks'));
        foodRows.forEach(row => parseRow(row, 'food'));
        ingredients = temp;
    }

    function renderIngredientsEditor() {
        const drinksListEl = document.getElementById('ingredients-editor-list-drinks');
        const foodListEl = document.getElementById('ingredients-editor-list-food');
        if (!drinksListEl || !foodListEl) return;

        drinksListEl.innerHTML = '';
        foodListEl.innerHTML = '';

        ingredients.forEach((ing, index) => {
            const div = document.createElement('div');
            div.style.display = 'grid';
            div.style.gridTemplateColumns = '2fr 1fr 0.8fr 1.2fr auto';
            div.style.gap = '5px';
            div.style.alignItems = 'center';
            div.style.background = '#fcfcfc';
            div.style.padding = '5px';
            div.style.border = '1px solid #eee';
            div.style.borderRadius = '6px';
            div.style.marginBottom = '2px';
            div.innerHTML = `
                <input type="text" class="form-control ing-name-input" data-idx="${index}" value="${ing.name || ''}" placeholder="原料" style="padding:4px; font-size:0.8rem;">
                <input type="number" class="form-control ing-weight-input" data-idx="${index}" value="${ing.weight !== undefined ? ing.weight : 1}" placeholder="重量" style="padding:4px; font-size:0.8rem; text-align:center;" min="0.001" step="any">
                <input type="text" class="form-control ing-unit-input" data-idx="${index}" value="${ing.unit || ''}" placeholder="單位" style="padding:4px; font-size:0.8rem; text-align:center;">
                <input type="number" class="form-control ing-price-input" data-idx="${index}" value="${ing.purchasePrice !== undefined ? ing.purchasePrice : 0}" placeholder="金額" style="padding:4px; font-size:0.8rem; text-align:right;" min="0" step="any">
                <button class="btn btn-danger" onclick="deleteIngredient(${index})" style="padding:4px 8px; font-size:0.8rem;">X</button>
            `;

            if (ing.type === 'drinks') {
                drinksListEl.appendChild(div);
            } else {
                foodListEl.appendChild(div);
            }
        });
    }

    window.deleteIngredient = function (index) {
        saveCurrentIngredientsState();
        const ing = ingredients[index];
        if (confirm(`確定要刪除「${ing.name}」嗎？這將會清除所有餐點中使用此原料的用量設定。`)) {
            const ingId = ing.id;
            ingredients.splice(index, 1);
            Object.keys(costMatrix).forEach(itemId => {
                if (costMatrix[itemId] && costMatrix[itemId][ingId] !== undefined) {
                    delete costMatrix[itemId][ingId];
                }
            });
            renderIngredientsEditor();
            renderCostMatrixTable();
        }
    };

    const addIngDrinksBtn = document.getElementById('add-ingredient-drinks-btn');
    if (addIngDrinksBtn) {
        addIngDrinksBtn.addEventListener('click', () => {
            saveCurrentIngredientsState();
            ingredients.push({
                id: 'ing_' + Date.now(),
                name: '新飲料原料',
                weight: 1,
                unit: '份',
                purchasePrice: 0,
                type: 'drinks'
            });
            renderIngredientsEditor();
            renderCostMatrixTable();
        });
    }

    const addIngFoodBtn = document.getElementById('add-ingredient-food-btn');
    if (addIngFoodBtn) {
        addIngFoodBtn.addEventListener('click', () => {
            saveCurrentIngredientsState();
            ingredients.push({
                id: 'ing_' + Date.now(),
                name: '新餐點食材',
                weight: 1,
                unit: '份',
                purchasePrice: 0,
                type: 'food'
            });
            renderIngredientsEditor();
            renderCostMatrixTable();
        });
    }

    function renderSingleMatrixTable(table, items, type) {
        if (!table) return;
        table.innerHTML = '';

        if (items.length === 0) {
            table.innerHTML = '<tr><td style="padding:10px; color:#888;">此類別尚無任何品項</td></tr>';
            return;
        }

        const filteredIngredients = ingredients.filter(ing => ing.type === type);
        const rates = getCostRates();
        const targetRate = type === 'drinks' ? rates.drinks : rates.food;

        const thead = document.createElement('thead');
        const headerTr = document.createElement('tr');
        headerTr.style.background = '#f1f3f5';
        headerTr.style.borderBottom = '2px solid #dee2e6';

        let headerHtml = `
            <th style="padding:8px; border:1px solid #dee2e6; text-align:left; min-width:110px;">原料名稱</th>
            <th style="padding:8px; border:1px solid #dee2e6; min-width:80px;">進貨規格</th>
            <th style="padding:8px; border:1px solid #dee2e6; min-width:80px;">單位成本</th>
        `;
        items.forEach(item => {
            headerHtml += `
                <th style="padding:8px; border:1px solid #dee2e6; min-width:100px; max-width:140px; font-weight:600;">
                    ${item.name}
                </th>
            `;
        });
        headerTr.innerHTML = headerHtml;
        thead.appendChild(headerTr);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        filteredIngredients.forEach(ing => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            const unitCost = ing.weight ? (ing.purchasePrice / ing.weight) : 0;

            let rowHtml = `
                <td style="padding:6px; border:1px solid #dee2e6; text-align:left; font-weight:500;">${ing.name}</td>
                <td style="padding:6px; border:1px solid #dee2e6; color:#666;">${ing.weight} ${ing.unit}</td>
                <td style="padding:6px; border:1px solid #dee2e6; text-align:right; color:#666;">NT$ ${unitCost.toFixed(2)} / ${ing.unit}</td>
            `;

            items.forEach(item => {
                const qtyMap = costMatrix[item.id] || {};
                const qty = qtyMap[ing.id] !== undefined ? qtyMap[ing.id] : 0;
                rowHtml += `
                    <td style="padding:6px; border:1px solid #dee2e6;">
                        <input type="number" class="matrix-cell-input" 
                               data-item-id="${item.id}" 
                               data-ing-id="${ing.id}" 
                               value="${qty}" 
                               min="0" step="any"
                               style="width:65px; text-align:center; padding:3px; border:1px solid #ccc; border-radius:4px; font-size:0.8rem;">
                        <span style="font-size:0.75rem; color:#888; margin-left:2px;">${ing.unit}</span>
                    </td>
                `;
            });
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        });

        const costTr = document.createElement('tr');
        costTr.style.background = '#fef9e7';
        costTr.style.borderTop = '2px solid #ccc';
        let costHtml = `
            <td colspan="3" style="padding:8px; border:1px solid #dee2e6; text-align:right; font-weight:bold; color:#b71c1c;">💰 總食材成本</td>
        `;

        const suggestedTr = document.createElement('tr');
        suggestedTr.style.background = '#e3f2fd';
        let suggestedHtml = `
            <td colspan="3" style="padding:8px; border:1px solid #dee2e6; text-align:right; font-weight:bold; color:#0d47a1;">💡 建議售價 (${targetRate}%)</td>
        `;

        const priceTr = document.createElement('tr');
        priceTr.style.background = '#f4f6f9';
        let priceHtml = `
            <td colspan="3" style="padding:8px; border:1px solid #dee2e6; text-align:right; font-weight:bold; color:#1a237e;">🏷️ 販售價格</td>
        `;

        const profitTr = document.createElement('tr');
        profitTr.style.background = '#e8f5e9';
        let profitHtml = `
            <td colspan="3" style="padding:8px; border:1px solid #dee2e6; text-align:right; font-weight:bold; color:#2e7d32;">📈 毛利額</td>
        `;

        const marginTr = document.createElement('tr');
        marginTr.style.background = '#e8f5e9';
        marginTr.style.borderBottom = '2px solid #2e7d32';
        let marginHtml = `
            <td colspan="3" style="padding:8px; border:1px solid #dee2e6; text-align:right; font-weight:bold; color:#2e7d32;">📊 毛利率</td>
        `;

        items.forEach(item => {
            let totalCost = 0;
            ingredients.forEach(ing => {
                const qtyMap = costMatrix[item.id] || {};
                const qty = qtyMap[ing.id] !== undefined ? qtyMap[ing.id] : 0;
                const unitCost = ing.weight ? (ing.purchasePrice / ing.weight) : 0;
                totalCost += qty * unitCost;
            });

            const price = item.price || 0;
            const profit = price - totalCost;
            const marginPct = price ? Math.round((profit / price) * 100) : 0;
            const suggestedPrice = targetRate ? Math.round(totalCost / (targetRate / 100)) : 0;

            costHtml += `
                <td style="padding:8px; border:1px solid #dee2e6; font-weight:bold; color:#b71c1c;" id="total-cost-${item.id}">
                    NT$ ${totalCost.toFixed(1)}
                </td>
            `;
            suggestedHtml += `
                <td style="padding:8px; border:1px solid #dee2e6; font-weight:bold; color:#0d47a1;" id="suggested-price-${item.id}">
                    NT$ ${suggestedPrice}
                </td>
            `;
            priceHtml += `
                <td style="padding:8px; border:1px solid #dee2e6; font-weight:bold; color:#1a237e;">
                    NT$ ${price}
                </td>
            `;
            profitHtml += `
                <td style="padding:8px; border:1px solid #dee2e6; font-weight:bold; color:#2e7d32;" id="profit-val-${item.id}">
                    NT$ ${profit.toFixed(1)}
                </td>
            `;
            marginHtml += `
                <td style="padding:8px; border:1px solid #dee2e6; font-weight:bold; color:${marginPct >= 30 ? '#2e7d32' : '#e65100'};" id="margin-pct-${item.id}">
                    ${marginPct}%
                </td>
            `;
        });

        costTr.innerHTML = costHtml;
        suggestedTr.innerHTML = suggestedHtml;
        priceTr.innerHTML = priceHtml;
        profitTr.innerHTML = profitHtml;
        marginTr.innerHTML = marginHtml;

        tbody.appendChild(costTr);
        tbody.appendChild(suggestedTr);
        tbody.appendChild(priceTr);
        tbody.appendChild(profitTr);
        tbody.appendChild(marginTr);
        table.appendChild(tbody);

        table.querySelectorAll('.matrix-cell-input').forEach(input => {
            input.addEventListener('input', () => {
                const itemId = input.dataset.itemId;
                const ingId = input.dataset.ingId;
                const val = parseFloat(input.value) || 0;

                if (!costMatrix[itemId]) costMatrix[itemId] = {};
                costMatrix[itemId][ingId] = val;

                let newTotalCost = 0;
                ingredients.forEach(ing => {
                    const qty = costMatrix[itemId][ing.id] || 0;
                    const unitCost = ing.weight ? (ing.purchasePrice / ing.weight) : 0;
                    newTotalCost += qty * unitCost;
                });

                const targetItem = items.find(m => m.id === itemId);
                const price = targetItem ? (targetItem.price || 0) : 0;
                const profit = price - newTotalCost;
                const marginPct = price ? Math.round((profit / price) * 100) : 0;
                const suggestedPrice = targetRate ? Math.round(newTotalCost / (targetRate / 100)) : 0;

                const costEl = document.getElementById(`total-cost-${itemId}`);
                if (costEl) costEl.textContent = `NT$ ${newTotalCost.toFixed(1)}`;
                
                const suggestedEl = document.getElementById(`suggested-price-${itemId}`);
                if (suggestedEl) suggestedEl.textContent = `NT$ ${suggestedPrice}`;
                
                const profitEl = document.getElementById(`profit-val-${itemId}`);
                if (profitEl) profitEl.textContent = `NT$ ${profit.toFixed(1)}`;

                const pctEl = document.getElementById(`margin-pct-${itemId}`);
                if (pctEl) {
                    pctEl.textContent = `${marginPct}%`;
                    pctEl.style.color = marginPct >= 30 ? '#2e7d32' : '#e65100';
                }
            });
        });
    }

    function renderCostMatrixTable() {
        const drinksTable = document.getElementById('cost-matrix-table-drinks');
        const foodTable = document.getElementById('cost-matrix-table-food');

        const menuItems = getMenu();
        const drinkItems = menuItems.filter(item => ['drinks', 'coffee', 'tea'].includes(item.category));
        const foodItems = menuItems.filter(item => !['drinks', 'coffee', 'tea'].includes(item.category));

        renderSingleMatrixTable(drinksTable, drinkItems, 'drinks');
        renderSingleMatrixTable(foodTable, foodItems, 'food');
    }

    const saveCostMatrixBtn = document.getElementById('save-cost-matrix-btn');
    if (saveCostMatrixBtn) {
        saveCostMatrixBtn.addEventListener('click', () => {
            const drinksRows = document.querySelectorAll('#ingredients-editor-list-drinks > div');
            const foodRows = document.querySelectorAll('#ingredients-editor-list-food > div');
            const newIngredients = [];
            let hasDuplicate = false;
            const seenNames = new Set();

            const parseRow = (row, type) => {
                const nameInp = row.querySelector('.ing-name-input');
                if (!nameInp) return;
                const name = nameInp.value.trim();
                const weight = parseFloat(row.querySelector('.ing-weight-input').value) || 1;
                const unit = row.querySelector('.ing-unit-input').value.trim();
                const purchasePrice = parseFloat(row.querySelector('.ing-price-input').value) || 0;
                const idx = parseInt(nameInp.dataset.idx, 10);
                const id = ingredients[idx]?.id || 'ing_' + Date.now() + Math.random();

                if (name) {
                    if (seenNames.has(name)) {
                        hasDuplicate = true;
                    }
                    seenNames.add(name);
                    newIngredients.push({ id, name, weight, unit, purchasePrice, type });
                }
            };

            drinksRows.forEach(row => parseRow(row, 'drinks'));
            foodRows.forEach(row => parseRow(row, 'food'));

            if (hasDuplicate) {
                alert('警告：原料清單中有重複的原料名稱！');
            }

            ingredients = newIngredients;
            saveIngredients(ingredients);
            saveCostMatrix(costMatrix);

            alert('原料成本與矩陣設定儲存成功！');
            renderIngredientsEditor();
            renderCostMatrixTable();
        });
    }

    // Set up target rates listeners
    const costRateDrinksInput = document.getElementById('cost-rate-drinks');
    if (costRateDrinksInput) {
        costRateDrinksInput.addEventListener('input', () => {
            const rates = getCostRates();
            rates.drinks = parseInt(costRateDrinksInput.value, 10) || 30;
            saveCostRates(rates);
            renderCostMatrixTable();
        });
    }

    const costRateFoodInput = document.getElementById('cost-rate-food');
    if (costRateFoodInput) {
        costRateFoodInput.addEventListener('input', () => {
            const rates = getCostRates();
            rates.food = parseInt(costRateFoodInput.value, 10) || 35;
            saveCostRates(rates);
            renderCostMatrixTable();
        });
    }

    window.renderCostEstimation = function () {
        ingredients = getIngredients();
        costMatrix = getCostMatrix();
        
        // Sync target rates inputs value
        const rates = getCostRates();
        const rateDrinksEl = document.getElementById('cost-rate-drinks');
        if (rateDrinksEl) rateDrinksEl.value = rates.drinks;
        const rateFoodEl = document.getElementById('cost-rate-food');
        if (rateFoodEl) rateFoodEl.value = rates.food;
        
        renderIngredientsEditor();
        renderCostMatrixTable();
    };

    // ===== 店名設定 =====
    const settings = getSettings();
    document.querySelectorAll('.shop-name-display').forEach(e => e.textContent = settings.shopName);

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const shopName = document.getElementById('setting-shop-name').value.trim() || '毛孩窩';
            saveSettings({ shopName });
            document.querySelectorAll('.shop-name-display').forEach(e => e.textContent = shopName);
            document.title = `後台管理 - ${shopName}`;
            showFirebaseMsg('✅ 店名已儲存！', 'green');
        });
    }

    // ===== Firebase 雲端設定 UI =====

    function showFirebaseMsg(msg, color = '#374151') {
        const el = document.getElementById('firebase-config-msg');
        if (!el) return;
        el.textContent = msg;
        el.style.color = color;
        el.style.fontWeight = '600';
        clearTimeout(el._timer);
        el._timer = setTimeout(() => {
            el.textContent = '';
        }, 4000);
    }

    function updateFirebaseBadge() {
        const badge = document.getElementById('firebase-status-badge');
        if (!badge) return;
        if (window.PetCafeSync && PetCafeSync.isOnline) {
            badge.textContent = '✅ 已連線';
            badge.style.background = '#d1fae5';
            badge.style.color = '#065f46';
            badge.style.border = '1px solid #6ee7b7';
        } else if (window.PetCafeSync && PetCafeSync.getConfig()) {
            badge.textContent = '⚠️ 連線中...';
            badge.style.background = '#fff3cd';
            badge.style.color = '#856404';
            badge.style.border = '1px solid #ffd166';
        } else {
            badge.textContent = '未設定';
            badge.style.background = '#f3f4f6';
            badge.style.color = '#6b7280';
            badge.style.border = '1px solid #d1d5db';
        }
    }

    // 頁面載入就更新 badge
    updateFirebaseBadge();
    if (window.PetCafeSync) {
        PetCafeSync.onStatusChange(() => updateFirebaseBadge());
    }

    // 進入設定 tab 時填入已儲存的 config
    const origTabListener = document.querySelector('[data-target="settings-tab"]');
    const settingsTabBtn = document.querySelector('.tab-btn[data-target="settings-tab"]');
    if (settingsTabBtn) {
        settingsTabBtn.addEventListener('click', () => {
            const cfgInput = document.getElementById('firebase-config-input');
            if (cfgInput && window.PetCafeSync) {
                const existing = PetCafeSync.getConfig();
                if (existing) {
                    cfgInput.value = JSON.stringify(existing, null, 2);
                }
            }
            updateFirebaseBadge();
        });
    }

    // 連線並儲存按鈕
    const firebaseSaveBtn = document.getElementById('firebase-save-btn');
    if (firebaseSaveBtn) {
        firebaseSaveBtn.addEventListener('click', async () => {
            const raw = document.getElementById('firebase-config-input').value.trim();
            if (!raw) { showFirebaseMsg('❗ 請貼入 Firebase 設定內容', '#e65100'); return; }
            firebaseSaveBtn.disabled = true;
            firebaseSaveBtn.textContent = '連線中...';
            try {
                await PetCafeSync.testAndSaveConfig(raw);
                showFirebaseMsg('✅ Firebase 連線成功！將自動即時同步所有裝置。', '#065f46');
                updateFirebaseBadge();
            } catch (err) {
                showFirebaseMsg('❌ 連線失敗：' + err.message, '#dc2626');
            } finally {
                firebaseSaveBtn.disabled = false;
                firebaseSaveBtn.textContent = '🔗 連線並儲存';
            }
        });
    }

    // 測試連線按鈕
    const firebaseTestBtn = document.getElementById('firebase-test-btn');
    if (firebaseTestBtn) {
        firebaseTestBtn.addEventListener('click', () => {
            if (window.PetCafeSync && PetCafeSync.isOnline) {
                showFirebaseMsg('✅ Firebase 連線正常！即時同步運作中。', '#065f46');
            } else if (window.PetCafeSync && PetCafeSync.getConfig()) {
                showFirebaseMsg('⚠️ Firebase 已設定但尚未連線，請檢查網路或 databaseURL 是否正確。', '#856404');
            } else {
                showFirebaseMsg('⚠️ 尚未設定 Firebase，目前使用本機模式。', '#6b7280');
            }
            updateFirebaseBadge();
        });
    }

    // 清除設定按鈕
    const firebaseClearBtn = document.getElementById('firebase-clear-btn');
    if (firebaseClearBtn) {
        firebaseClearBtn.addEventListener('click', () => {
            if (confirm('確定清除 Firebase 設定？將退回本機模式，資料不會被刪除。')) {
                PetCafeSync.clearConfig();
                document.getElementById('firebase-config-input').value = '';
                showFirebaseMsg('ℹ️ 已清除設定，目前使用本機模式。', '#6b7280');
                updateFirebaseBadge();
            }
        });
    }

    // ===== EMPLOYEE CLOCK-IN SYSTEM =====
    let clockInterval = null;
    function startDigitalClock() {
        if (clockInterval) clearInterval(clockInterval);
        
        const dateEl = document.getElementById('clock-date');
        const timeEl = document.getElementById('clock-time');
        
        function updateTime() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            
            const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const dayName = days[now.getDay()];
            
            if (dateEl) {
                dateEl.textContent = `${year}年${month}月${date}日 ${dayName}`;
            }
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
            }
        }
        
        updateTime();
        clockInterval = setInterval(updateTime, 1000);
    }

    window.renderClockIn = function() {
        startDigitalClock();
        
        const empSelect = document.getElementById('clockin-employee-select');
        const todayActiveEl = document.getElementById('clockin-today-active');
        const todayHoursEl = document.getElementById('clockin-today-hours');
        const logsBody = document.getElementById('clockin-logs-body');
        
        if (!empSelect || !logsBody) return;
        
        // 1. Populate active employees select
        const employeesList = getEmployees();
        const activeEmployees = employeesList.filter(e => e.status === 'active');
        
        empSelect.innerHTML = activeEmployees.map(e => `
            <option value="${e.name}">${e.name} (${getRoleLabel(e.role)})</option>
        `).join('');
        
        if (activeEmployees.length === 0) {
            empSelect.innerHTML = `<option value="">(尚無在職員工)</option>`;
        }
        
        // 2. Fetch attendance logs and filter for today
        const logs = getAttendanceLogs();
        const todayStr = getLocalDateStr(new Date());
        
        // Active employees working today (checked in but not checked out)
        const workingToday = logs.filter(log => log.date === todayStr && log.status === 'active');
        todayActiveEl.textContent = `${workingToday.length} 人`;
        
        // Today's total work hours
        let totalHours = 0;
        logs.filter(log => log.date === todayStr).forEach(log => {
            totalHours += Number(log.hours) || 0;
        });
        todayHoursEl.textContent = `${totalHours.toFixed(1)} 小時`;
        
        // 3. Render logs list (newest first)
        const sortedLogs = [...logs].reverse();
        logsBody.innerHTML = sortedLogs.map((log, idx) => {
            const index = logs.length - 1 - idx; // true original index
            const clockOutText = log.clockOut || '-';
            const statusBadge = log.status === 'active' 
                ? '<span style="background:#fff3cd; color:#856404; padding:2px 6px; border-radius:4px; font-size:0.75rem;">工作中</span>'
                : '<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:0.75rem;">已下班</span>';
                
            return `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:0.75rem;"><strong>${log.name}</strong></td>
                    <td style="padding:0.75rem;">${log.date}</td>
                    <td style="padding:0.75rem; color:#2e7d32; font-weight:600;">${log.clockIn}</td>
                    <td style="padding:0.75rem; color:${log.clockOut ? '#c62828' : '#888'}; font-weight:600;">${clockOutText}</td>
                    <td style="padding:0.75rem; font-weight:bold;">${Number(log.hours).toFixed(1)} hrs</td>
                    <td style="padding:0.75rem;">${statusBadge}</td>
                </tr>
            `;
        }).join('');
        
        if (sortedLogs.length === 0) {
            logsBody.innerHTML = `<tr><td colspan="6" style="padding:2rem; text-align:center; color:#888;">目前尚無打卡紀錄</td></tr>`;
        }
    };

    function getRoleLabel(role) {
        switch (role) {
            case 'admin': return '管理員';
            case 'staff': return '助理';
            case 'kitchen': return '出餐人員';
            default: return role;
        }
    }

    // Bind clock-in / out buttons
    const btnClockIn = document.getElementById('btn-clockin');
    const btnClockOut = document.getElementById('btn-clockout');
    
    if (btnClockIn) {
        btnClockIn.addEventListener('click', () => {
            const empSelect = document.getElementById('clockin-employee-select');
            const name = empSelect.value;
            if (!name) {
                alert('請先選擇員工姓名！');
                return;
            }
            
            const logs = getAttendanceLogs();
            const todayStr = getLocalDateStr(new Date());
            
            // Check if already clocked in and not clocked out
            const activeLog = logs.find(log => log.name === name && log.date === todayStr && log.status === 'active');
            if (activeLog) {
                alert(`「${name}」今天已經打卡上班，目前在職中，不需重複打卡！`);
                return;
            }
            
            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
            logs.push({
                name: name,
                date: todayStr,
                clockIn: timeStr,
                clockOut: '',
                hours: 0,
                status: 'active'
            });
            
            saveAttendanceLogs(logs);
            alert(`🎉「${name}」於 ${timeStr} 上班打卡成功！`);
            renderClockIn();
        });
    }
    
    if (btnClockOut) {
        btnClockOut.addEventListener('click', () => {
            const empSelect = document.getElementById('clockin-employee-select');
            const name = empSelect.value;
            if (!name) {
                alert('請先選擇員工姓名！');
                return;
            }
            
            const logs = getAttendanceLogs();
            const todayStr = getLocalDateStr(new Date());
            
            // Find active log for today
            const activeLog = logs.find(log => log.name === name && log.date === todayStr && log.status === 'active');
            if (!activeLog) {
                alert(`找不到「${name}」今天的上班打卡紀錄！請先打卡上班。`);
                return;
            }
            
            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
            
            // Calculate hours
            const [inH, inM, inS] = activeLog.clockIn.split(':').map(Number);
            const [outH, outM, outS] = timeStr.split(':').map(Number);
            const inSec = inH * 3600 + inM * 60 + inS;
            const outSec = outH * 3600 + outM * 60 + outS;
            
            let diffSec = outSec - inSec;
            if (diffSec < 0) diffSec = 0; // Prevent negative time
            
            const hoursDecimal = diffSec / 3600;
            
            activeLog.clockOut = timeStr;
            activeLog.hours = Math.round(hoursDecimal * 10) / 10; // round to 1 decimal place
            activeLog.status = 'completed';
            
            saveAttendanceLogs(logs);
            alert(`🚪「${name}」於 ${timeStr} 下班打卡成功！今日工時 ${activeLog.hours} 小時。`);
            renderClockIn();
        });
    }

    // ===== EMPLOYEE DATA SYSTEM =====
    window.renderPermission = function() {
        const tableBody = document.getElementById('employees-table-body');
        if (!tableBody) return;
        
        const employeesList = getEmployees();
        
        tableBody.innerHTML = employeesList.map((emp, idx) => {
            const roleText = getRoleLabel(emp.role);
            const statusText = emp.status === 'active' 
                ? '<span style="color:#2e7d32; font-weight:bold;">在職</span>' 
                : '<span style="color:#c62828;">離職</span>';
            const phoneText = emp.phone || '<span style="color:#aaa;">-</span>';
            const birthdayText = emp.birthday || '<span style="color:#aaa;">-</span>';
            const rateText = emp.hourlyRate !== undefined ? emp.hourlyRate : 180;
                
            return `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:0.75rem;"><strong>${emp.name}</strong></td>
                    <td style="padding:0.75rem;">${phoneText}</td>
                    <td style="padding:0.75rem;">${birthdayText}</td>
                    <td style="padding:0.75rem; text-align:center;">NT$ ${rateText}</td>
                    <td style="padding:0.75rem;">${roleText} (${emp.username})</td>
                    <td style="padding:0.75rem;">${statusText}</td>
                    <td style="padding:0.75rem; text-align:center;">
                        <button class="btn btn-primary emp-edit-btn" data-idx="${idx}" style="padding:0.25rem 0.6rem; font-size:0.8rem; margin-right:0.25rem;">編輯</button>
                        <button class="btn btn-danger emp-del-btn" data-idx="${idx}" style="padding:0.25rem 0.6rem; font-size:0.8rem;">刪除</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        if (employeesList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="padding:2rem; text-align:center; color:#888;">目前尚無員工資料</td></tr>`;
        }

        // Event delegation — bind after innerHTML is set
        tableBody.querySelectorAll('.emp-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editEmpByIdx(parseInt(btn.dataset.idx, 10)));
        });
        tableBody.querySelectorAll('.emp-del-btn').forEach(btn => {
            btn.addEventListener('click', () => delEmpByIdx(parseInt(btn.dataset.idx, 10)));
        });
    };

    function editEmpByIdx(index) {
        const employeesList = getEmployees();
        const emp = employeesList[index];
        if (!emp) return;
        
        document.getElementById('employee-idx').value = index;
        document.getElementById('employee-name').value = emp.name;
        document.getElementById('employee-phone').value = emp.phone || '';
        document.getElementById('employee-birthday').value = emp.birthday || '';
        document.getElementById('employee-hourly-rate').value = emp.hourlyRate !== undefined ? emp.hourlyRate : 180;
        document.getElementById('employee-role').value = emp.role;
        document.getElementById('employee-username').value = emp.username;
        document.getElementById('employee-password').value = emp.password;
        document.getElementById('employee-status').value = emp.status;
        
        document.getElementById('employee-form-title').textContent = '✏️ 編輯員工資料';
        document.getElementById('btn-cancel-employee').style.display = 'inline-block';
        
        const employeeForm = document.getElementById('employee-form');
        if (employeeForm) {
            employeeForm.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Keep window.editEmployee as alias for backward compatibility
    window.editEmployee = editEmpByIdx;

    function delEmpByIdx(index) {
        const employeesList = getEmployees();
        const emp = employeesList[index];
        if (!emp) return;
        
        if (confirm(`確定要刪除員工「${emp.name}」的帳號嗎？此操作無法復原。`)) {
            employeesList.splice(index, 1);
            saveEmployees(employeesList);
            renderPermission();
            if (document.getElementById('clockin-tab') && document.getElementById('clockin-tab').classList.contains('active')) {
                renderClockIn();
            }
        }
    }
    window.deleteEmployee = delEmpByIdx;

    const employeeForm = document.getElementById('employee-form');
    const btnCancelEmployee = document.getElementById('btn-cancel-employee');
    
    if (employeeForm) {
        employeeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const idxVal = document.getElementById('employee-idx').value;
            const name = document.getElementById('employee-name').value.trim();
            const phone = document.getElementById('employee-phone').value.trim();
            const birthday = document.getElementById('employee-birthday').value;
            const hourlyRate = parseInt(document.getElementById('employee-hourly-rate').value, 10) || 180;
            const role = document.getElementById('employee-role').value;
            const username = document.getElementById('employee-username').value.trim();
            const password = document.getElementById('employee-password').value.trim();
            const status = document.getElementById('employee-status').value;
            
            if (!name || !username || !password) {
                alert('請填寫所有必填欄位 (*)。');
                return;
            }
            
            const employeesList = getEmployees();
            
            // Check for username duplication
            const dupIdx = employeesList.findIndex((emp, index) => {
                return emp.username.toLowerCase() === username.toLowerCase() && String(index) !== idxVal;
            });
            
            if (dupIdx !== -1) {
                alert(`⚠️ 帳號代碼「${username}」已被其他員工「${employeesList[dupIdx].name}」使用，請更換！`);
                return;
            }
            
            const newEmp = { name, phone, birthday, hourlyRate, role, username, password, status };
            
            if (idxVal !== '') {
                employeesList[Number(idxVal)] = newEmp;
                alert('員工資料修改成功！');
            } else {
                employeesList.push(newEmp);
                alert('員工資料新增成功！');
            }
            
            saveEmployees(employeesList);
            resetEmployeeForm();
            renderPermission();
        });
    }
    
    if (btnCancelEmployee) {
        btnCancelEmployee.addEventListener('click', resetEmployeeForm);
    }
    
    function resetEmployeeForm() {
        if (employeeForm) employeeForm.reset();
        document.getElementById('employee-idx').value = '';
        document.getElementById('employee-form-title').textContent = '➕ 增加員工資料';
        document.getElementById('employee-hourly-rate').value = 180;
        if (btnCancelEmployee) btnCancelEmployee.style.display = 'none';
    }

    // ===== SIDEBAR DRAWER TOGGLE LOGIC =====
    const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
    const sidebarWrapper = document.getElementById('sidebar-wrapper');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

    function closeSidebar() {
        if (sidebarWrapper) sidebarWrapper.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    }

    if (mobileHamburgerBtn) {
        mobileHamburgerBtn.addEventListener('click', () => {
            if (sidebarWrapper) sidebarWrapper.classList.add('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
        });
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    // Auto-close sidebar on mobile when a menu item is clicked
    const sidebarMenuBtns = document.querySelectorAll('.sidebar-menu .tab-btn');
    sidebarMenuBtns.forEach(btn => {
        btn.addEventListener('click', closeSidebar);
    });

    // ===== LOGOUT BUTTON =====
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('petCafeCurrentUser');
            window.location.href = 'login.html';
        });
    }

    // ===== MONTHLY SALARY REPORT =====
    const salaryMonthSelect = document.getElementById('salary-month-select');
    const btnGenerateSalary = document.getElementById('btn-generate-salary');
    const btnExportSalaryCsv = document.getElementById('btn-export-salary-csv');
    const salaryReportContainer = document.getElementById('salary-report-container');
    const salaryReportBody = document.getElementById('salary-report-body');
    const salaryReportFoot = document.getElementById('salary-report-foot');

    // Set default to current month
    if (salaryMonthSelect) {
        const now = new Date();
        salaryMonthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function getRoleLabel(role) {
        const map = { admin: '管理員', staff: '助理', kitchen: '出餐人員' };
        return map[role] || role;
    }

    let salaryReportData = [];

    if (btnGenerateSalary) {
        btnGenerateSalary.addEventListener('click', () => {
            const yearMonth = salaryMonthSelect ? salaryMonthSelect.value : '';
            if (!yearMonth) { alert('請選擇月份'); return; }

            const employees = getEmployees();
            const logs = getAttendanceLogs();
            const rates = getHourlyRates();

            // Filter logs for selected month and completed status
            const [year, month] = yearMonth.split('-').map(Number);
            const monthLogs = logs.filter(log => {
                if (!log.date || log.status !== 'completed') return false;
                const [y, m] = log.date.split('-').map(Number);
                return y === year && m === month;
            });

            // Aggregate by employee name
            salaryReportData = employees.map(emp => {
                const empLogs = monthLogs.filter(l => l.employeeName === emp.name);
                const totalHours = empLogs.reduce((s, l) => s + (l.hours || 0), 0);
                const workDays = new Set(empLogs.map(l => l.date)).size;
                const rate = emp.hourlyRate !== undefined ? emp.hourlyRate : (rates[emp.username] || 180);
                const salary = Math.round(totalHours * rate);
                return {
                    name: emp.name,
                    username: emp.username,
                    role: emp.role,
                    workDays,
                    totalHours: Math.round(totalHours * 10) / 10,
                    rate,
                    salary
                };
            });

            // Render table
            if (salaryReportBody) {
                salaryReportBody.innerHTML = salaryReportData.map(row => `
                    <tr style="border-bottom:1px solid #eee; ${row.totalHours === 0 ? 'opacity:0.5;' : ''}">
                        <td style="padding:0.65rem 0.75rem; font-weight:600;">${row.name}</td>
                        <td style="padding:0.65rem 0.75rem; font-family:monospace; color:#666;">${row.username}</td>
                        <td style="padding:0.65rem 0.75rem;">${getRoleLabel(row.role)}</td>
                        <td style="padding:0.65rem 0.75rem; text-align:center;">${row.workDays} 天</td>
                        <td style="padding:0.65rem 0.75rem; text-align:center; font-weight:bold;">${row.totalHours}</td>
                        <td style="padding:0.65rem 0.75rem; text-align:center;">
                            <input type="number" class="salary-rate-inline" data-username="${row.username}" value="${row.rate}" min="0" step="10"
                                style="width:80px; padding:0.2rem 0.4rem; border:1px solid #ddd; border-radius:5px; text-align:center;">
                        </td>
                        <td style="padding:0.65rem 0.75rem; text-align:right; font-weight:800; color:#10352b; font-size:1.05rem;">NT$ ${row.salary.toLocaleString()}</td>
                    </tr>
                `).join('');

                // Wire up inline rate changes to recalculate and save
                document.querySelectorAll('.salary-rate-inline').forEach(inp => {
                    inp.addEventListener('input', () => {
                        const username = inp.dataset.username;
                        const newRate = parseInt(inp.value, 10) || 0;
                        const row = salaryReportData.find(r => r.username === username);
                        if (!row) return;
                        row.rate = newRate;
                        row.salary = Math.round(row.totalHours * newRate);
                        const td = inp.closest('tr').querySelector('td:last-child');
                        if (td) td.textContent = `NT$ ${row.salary.toLocaleString()}`;
                        updateSalaryFooter();

                        // Save to employee profile
                        const emps = getEmployees();
                        const empObj = emps.find(e => e.username === username);
                        if (empObj) {
                            empObj.hourlyRate = newRate;
                            saveEmployees(emps);
                        }

                        // Also update in hourly rates fallback map
                        const ratesMap = getHourlyRates();
                        ratesMap[username] = newRate;
                        saveHourlyRates(ratesMap);
                    });
                });
            }

            updateSalaryFooter();
            if (salaryReportContainer) salaryReportContainer.style.display = 'block';
            if (btnExportSalaryCsv) btnExportSalaryCsv.style.display = 'inline-block';
        });
    }

    function updateSalaryFooter() {
        if (!salaryReportFoot) return;
        const totalSalary = salaryReportData.reduce((s, r) => s + r.salary, 0);
        const totalHrs = salaryReportData.reduce((s, r) => s + r.totalHours, 0);
        salaryReportFoot.innerHTML = `
            <tr style="background:#f0fdf4; font-weight:800; border-top:2px solid #10352b;">
                <td colspan="4" style="padding:0.75rem; text-align:right; color:#10352b;">合計</td>
                <td style="padding:0.75rem; text-align:center; color:#10352b;">${Math.round(totalHrs * 10)/10} 小時</td>
                <td style="padding:0.75rem;"></td>
                <td style="padding:0.75rem; text-align:right; color:#10352b; font-size:1.1rem;">NT$ ${totalSalary.toLocaleString()}</td>
            </tr>
        `;
    }

    if (btnExportSalaryCsv) {
        btnExportSalaryCsv.addEventListener('click', () => {
            if (!salaryReportData.length) return;
            const yearMonth = salaryMonthSelect ? salaryMonthSelect.value : 'unknown';
            const headers = ['員工姓名','帳號','職位','工作天數','總工時(小時)','時薪(NT$/hr)','月薪估算(NT$)'];
            const rows = salaryReportData.map(r => [
                r.name, r.username, getRoleLabel(r.role), r.workDays, r.totalHours, r.rate, r.salary
            ]);
            const totalRow = ['合計','','',
                salaryReportData.reduce((s,r)=>s+r.workDays,0),
                Math.round(salaryReportData.reduce((s,r)=>s+r.totalHours,0)*10)/10,
                '', salaryReportData.reduce((s,r)=>s+r.salary,0)
            ];
            rows.push(totalRow);

            const csvContent = '\uFEFF' + [headers, ...rows]
                .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `月薪報表_${yearMonth}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // ===== ROLE PAGE PERMISSIONS matrix UI =====
    window.renderRolePermissionsUI = function() {
        const roles = ['admin', 'staff', 'kitchen'];
        const perms = getRolePermissions();
        
        roles.forEach(role => {
            const container = document.querySelector(`.role-permission-checkboxes[data-role="${role}"]`);
            if (!container) return;
            
            container.innerHTML = ALL_TABS.map(tab => {
                const checked = perms[role] && perms[role].includes(tab.id) ? 'checked' : '';
                // Safety: prevent admin from unchecking permission-tab to avoid locking themselves out
                const disabled = (role === 'admin' && tab.id === 'permission-tab') ? 'disabled checked' : '';
                return `
                    <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.9rem; margin-bottom:0.25rem;">
                        <input type="checkbox" name="${role}_${tab.id}" value="${tab.id}" ${checked} ${disabled}>
                        <span>${tab.label}</span>
                    </label>
                `;
            }).join('');
        });
    };

    const rolePermissionsForm = document.getElementById('role-permissions-form');
    if (rolePermissionsForm) {
        rolePermissionsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newPerms = {
                admin: ['permission-tab'], // Always keep permission-tab enabled for admin
                staff: [],
                kitchen: []
            };
            
            const roles = ['admin', 'staff', 'kitchen'];
            roles.forEach(role => {
                ALL_TABS.forEach(tab => {
                    if (role === 'admin' && tab.id === 'permission-tab') return;
                    const chk = rolePermissionsForm.querySelector(`input[name="${role}_${tab.id}"]`);
                    if (chk && chk.checked) {
                        newPerms[role].push(tab.id);
                    }
                });
            });
            
            saveRolePermissions(newPerms);
            alert('✅ 權限設定已儲存！');
            applySidebarTabVisibility();
        });
    }
});
