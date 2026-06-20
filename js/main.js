document.addEventListener('DOMContentLoaded', () => {
    // ===== STATE =====
    let menu = getMenu();
    let cart = getCart();
    let currentCategory = 'drinks';
    let pendingSetMealItem = null;
    let selectedAddons = [];   // array of selected addons (drinks + set meal options)
    let selectedNotes = [];    // array of custom selected notes
    let codeReader = null;
    let cameraStream = null;

    // ===== DOM =====
    const menuContainer = document.getElementById('menu-container');
    const categoryTabs = document.getElementById('category-tabs');
    const cartCount = document.getElementById('cart-count');
    const cartSidebar = document.getElementById('cart-sidebar');
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsCont = document.getElementById('cart-items-container');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const tableInput = document.getElementById('table-number-input');
    const tableHint = document.getElementById('table-hint');

    // Invoice
    const invPaper = document.getElementById('inv-paper');
    const invCarrier = document.getElementById('inv-carrier');
    const invUniform = document.getElementById('inv-uniform');
    const carrierRow = document.getElementById('invoice-carrier-row');
    const uniformRow = document.getElementById('invoice-uniform-row');
    const carrierInput = document.getElementById('carrier-number');
    const uniformInput = document.getElementById('uniform-number');
    const scanBtn = document.getElementById('scan-carrier-btn');

    // Set Meal Modal
    const setmealModal = document.getElementById('setmeal-modal');
    const closeSetmealBtn = document.getElementById('close-setmeal-btn');
    const setmealItemName = document.getElementById('setmeal-item-name');
    const setmealBasePrice = document.getElementById('setmeal-base-price');
    const setmealOptsList = document.getElementById('setmeal-options-list');
    const confirmSetmealBtn = document.getElementById('confirm-setmeal-btn');

    // Camera Modal
    const cameraModal = document.getElementById('camera-modal');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    const cameraVideo = document.getElementById('camera-video');
    const cameraResult = document.getElementById('camera-result');

    // Success Modal
    const successModal = document.getElementById('success-modal');
    const successOrderId = document.getElementById('success-order-id');
    const successTable = document.getElementById('success-table');
    const closeSuccessBtn = document.getElementById('close-success-btn');

    // ===== INIT =====
    renderCategoryTabs();
    renderMenu();
    updateCartUI();
    initShopName();

    // ===== CATEGORY TABS =====
    function renderCategoryTabs() {
        categoryTabs.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'cat-tab-btn' + (cat.id === currentCategory ? ' active' : '');
            btn.dataset.cat = cat.id;
            btn.innerHTML = `${cat.icon} ${cat.label}`;
            btn.addEventListener('click', () => {
                currentCategory = cat.id;
                document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderMenu();
            });
            categoryTabs.appendChild(btn);
        });
    }

    // ===== MENU RENDER =====
    function renderMenu() {
        menuContainer.innerHTML = '';
        const filtered = menu.filter(item => item.category === currentCategory);
        const catInfo = getCategoryInfo(currentCategory);

        if (filtered.length === 0) {
            menuContainer.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem;">此分類目前尚無品項</p>';
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-item';
            const hasSetMeal = catInfo.hasSetMeal;
            card.innerHTML = `
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-desc">${item.description || ''}</div>
                <div class="menu-item-bottom">
                    <span class="price">NT$ ${item.price}</span>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;">
                        ${hasSetMeal ? '<span class="set-meal-badge">可加套餐</span>' : ''}
                        <button class="add-btn" data-id="${item.id}">加入購物車</button>
                    </div>
                </div>
            `;
            card.querySelector('.add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleAddItem(item);
            });
            menuContainer.appendChild(card);
        });
    }

    // ===== ADD ITEM =====
    function handleAddItem(item) {
        const catInfo = getCategoryInfo(item.category);
        const hasNotes = (item.notes && item.notes.length > 0) || (item.note && item.note.trim().length > 0);
        if (catInfo.hasSetMeal || item.category === 'drinks' || hasNotes) {
            openSetMealModal(item);
        } else {
            addToCart(item, [], false);
        }
    }

    // ===== SET MEAL MODAL (multi-select) =====
    const smPreview = document.getElementById('sm-selected-preview');

    function makeAddonEl(opt, isDrinkSize = false) {
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
            const idx = selectedAddons.findIndex(a => a.id === opt.id);
            if (isDrinkSize) {
                // For drink sizes on the drink item itself: single-select
                selectedAddons = selectedAddons.filter(a => !a._isDrinkSize);
                if (idx === -1) {
                    selectedAddons.push({ ...opt, _isDrinkSize: true });
                    el.classList.add('selected');
                    setmealOptsList.querySelectorAll('.drink-size-opt').forEach(e => {
                        if (e !== el) e.classList.remove('selected');
                    });
                }
            } else {
                // Multi-select toggle
                if (idx === -1) {
                    selectedAddons.push(opt);
                    el.classList.add('selected');
                } else {
                    selectedAddons.splice(idx, 1);
                    el.classList.remove('selected');
                }
            }
            updateSmPreview();
        });
        return el;
    }

    function updateSmPreview() {
        if (!smPreview) return;
        const addonText = selectedAddons.map(a => a.name).join('、');
        const noteText = selectedNotes.join('、');
        
        let previewStr = '';
        if (addonText) previewStr += `已選加點：${addonText}`;
        if (noteText) {
            if (previewStr) previewStr += ' | ';
            previewStr += `備註：${noteText}`;
        }
        
        if (!previewStr) {
            smPreview.classList.remove('show');
            smPreview.textContent = '';
            return;
        }
        const totalAdd = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
        smPreview.textContent = previewStr + `（+NT$ ${totalAdd}）`;
        smPreview.classList.add('show');
    }

    // ===== SHARED NOTE GROUP RENDERER =====
    // Renders note groups into any container element.
    // Returns an object { getSelected } to read currently selected notes.
    function renderNoteGroupsIntoList(container, item, sharedNotes, onChanged) {
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

            // Card wrapper for the whole group
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
                tag.style.cssText = 'padding:0.35rem 0.75rem;border:1.5px solid #ddd;border-radius:20px;cursor:pointer;background:#fff;font-size:0.88rem;transition:all 0.18s;';
                tag.textContent = optName;

                tag.addEventListener('click', () => {
                    if (selectedTagEl && selectedTagEl !== tag) {
                        selectedTagEl.style.background = '#fff';
                        selectedTagEl.style.color = '';
                        selectedTagEl.style.borderColor = '#ddd';
                        const prevIdx = sharedNotes.indexOf(selectedTagEl.textContent);
                        if (prevIdx !== -1) sharedNotes.splice(prevIdx, 1);
                    }
                    if (selectedTagEl === tag) {
                        tag.style.background = '#fff';
                        tag.style.color = '';
                        tag.style.borderColor = '#ddd';
                        const idx = sharedNotes.indexOf(optName);
                        if (idx !== -1) sharedNotes.splice(idx, 1);
                        selectedTagEl = null;
                    } else {
                        tag.style.background = 'var(--primary-color)';
                        tag.style.color = '#fff';
                        tag.style.borderColor = 'var(--primary-color)';
                        sharedNotes.push(optName);
                        selectedTagEl = tag;
                    }
                    if (onChanged) onChanged();
                });
                tagRow.appendChild(tag);
            });
            card.appendChild(tagRow);
            container.appendChild(card);
        });
    }

    function openSetMealModal(item) {
        pendingSetMealItem = item;
        selectedAddons = [];
        selectedNotes = [];
        setmealItemName.textContent = item.name;
        setmealBasePrice.textContent = `NT$ ${item.price}`;
        setmealOptsList.innerHTML = '';
        if (smPreview) { smPreview.classList.remove('show'); smPreview.textContent = ''; }

        const ecoCupContainer = document.getElementById('eco-cup-container');
        const ecoCupCheckbox = document.getElementById('eco-cup-checkbox');
        if (ecoCupCheckbox) ecoCupCheckbox.checked = false;

        if (item.category === 'drinks') {
            // Drinks: single-select size + eco cup
            document.getElementById('sm-title').textContent = '選擇容量（必選）';
            if (ecoCupContainer) ecoCupContainer.style.display = 'block';

            const header = document.createElement('div');
            header.className = 'sm-section-header';
            header.textContent = '容量';
            setmealOptsList.appendChild(header);

            const sizes = getDrinkSizes();
            sizes.forEach((opt, idx) => {
                const el = makeAddonEl({ ...opt, _isDrinkSize: true }, true);
                el.classList.add('drink-size-opt');
                if (idx === 0) {
                    el.classList.add('selected');
                    selectedAddons.push({ ...opt, _isDrinkSize: true });
                }
                setmealOptsList.appendChild(el);
            });
            updateSmPreview();

            // Note groups for this drink item
            renderNoteGroupsIntoList(setmealOptsList, item, selectedNotes, updateSmPreview);

        } else {
            // Food items: drinks section (single-select) + set meal options (multi)
            document.getElementById('sm-title').textContent = '加點項目（可複選）';
            if (ecoCupContainer) ecoCupContainer.style.display = 'none';

            // Section 1: Drinks from menu (with optional discount, single-select)
            const freshMenu = getMenu();
            const drinkItems = freshMenu.filter(m => m.category === 'drinks');
            const discounts = getDrinkDiscounts();
            const drinkDiscount = discounts[item.category] || 0;

            // Container that holds drink options + dynamic drink note groups below
            const drinkNoteArea = document.createElement('div');
            drinkNoteArea.id = 'drink-note-area';

            if (drinkItems.length > 0) {
                const h1 = document.createElement('div');
                h1.className = 'sm-section-header';
                h1.textContent = drinkDiscount > 0
                    ? `☕ 加點飲品（套餐折抵 NT$ ${drinkDiscount}）`
                    : '☕ 加點飲品';
                setmealOptsList.appendChild(h1);

                // Track selected drink for note rendering
                let activeDrinkEl = null;
                let activeDrinkNoteCleanup = () => {};

                drinkItems.forEach(drink => {
                    const discountedPrice = Math.max(0, drink.price - drinkDiscount);
                    const optObj = { id: 'drink_' + drink.id, name: drink.name, price: discountedPrice };
                    const el = document.createElement('div');
                    el.className = 'setmeal-option';
                    el.innerHTML = `
                        <div class="opt-left">
                            <div class="opt-check"></div>
                            <span class="opt-name">${drink.name}</span>
                        </div>
                        <span class="opt-price">${drinkDiscount > 0
                            ? `<span style="text-decoration:line-through;color:#aaa;font-size:0.8rem;">NT$ ${drink.price}</span> <span style="color:#2e7d32;">NT$ ${discountedPrice}</span>`
                            : `+NT$ ${discountedPrice}`
                        }</span>
                    `;

                    el.addEventListener('click', () => {
                        const idx = selectedAddons.findIndex(a => a.id === optObj.id);

                        // Remove previous drink note groups
                        activeDrinkNoteCleanup();
                        // Remove previous drink selection from selectedNotes
                        if (activeDrinkEl && activeDrinkEl !== el) {
                            activeDrinkEl.classList.remove('selected');
                            selectedAddons = selectedAddons.filter(a => a.id !== selectedAddons.find(x => drinkItems.some(d => 'drink_' + d.id === x.id && activeDrinkEl !== el)));
                        }

                        if (idx === -1) {
                            // Deselect all other drinks first (single-select drinks in set meal)
                            drinkItems.forEach(d => {
                                selectedAddons = selectedAddons.filter(a => a.id !== 'drink_' + d.id);
                            });
                            setmealOptsList.querySelectorAll('.setmeal-option.drink-addon-opt').forEach(e => e.classList.remove('selected'));

                            selectedAddons.push(optObj);
                            el.classList.add('selected');
                            activeDrinkEl = el;

                            // Render this drink's note groups right after the drink list
                            const drinkNoteContainer = document.createElement('div');
                            drinkNoteContainer.className = 'drink-note-container';
                            drinkNoteContainer.style.cssText = 'margin:0.25rem 0 0.5rem;padding:0 0.25rem;';
                            renderNoteGroupsIntoList(drinkNoteContainer, drink, selectedNotes, updateSmPreview);

                            const insertAfter = setmealOptsList.querySelector('#drink-list-end');
                            if (insertAfter) setmealOptsList.insertBefore(drinkNoteContainer, insertAfter);
                            else setmealOptsList.appendChild(drinkNoteContainer);

                            activeDrinkNoteCleanup = () => {
                                if (drinkNoteContainer.parentNode) drinkNoteContainer.remove();
                                // Remove notes that belonged to this drink from selectedNotes
                                const drinkNoteGroups = drink.notes || [];
                                drinkNoteGroups.forEach(g => {
                                    g.options.forEach(opt => {
                                        const ni = selectedNotes.indexOf(opt);
                                        if (ni !== -1) selectedNotes.splice(ni, 1);
                                    });
                                });
                            };
                        } else {
                            // Toggle off
                            selectedAddons.splice(idx, 1);
                            el.classList.remove('selected');
                            activeDrinkEl = null;
                            activeDrinkNoteCleanup = () => {};
                        }
                        updateSmPreview();
                    });

                    el.classList.add('drink-addon-opt');
                    setmealOptsList.appendChild(el);
                });

                // Anchor element so drink note groups are inserted in the right place
                const anchor = document.createElement('div');
                anchor.id = 'drink-list-end';
                setmealOptsList.appendChild(anchor);
            }

            // Section 2: Other set meal options
            const allOpts = getSetMealOptions();
            const opts = allOpts[item.category] || [];
            if (opts.length > 0) {
                const h2 = document.createElement('div');
                h2.className = 'sm-section-header';
                h2.textContent = '其他加點';
                setmealOptsList.appendChild(h2);

                opts.forEach(opt => {
                    const el = makeAddonEl(opt);
                    setmealOptsList.appendChild(el);
                });
            }

            // Section 3: Note groups for the food item itself
            renderNoteGroupsIntoList(setmealOptsList, item, selectedNotes, updateSmPreview);
        }

        setmealModal.style.display = 'flex';
    }

    closeSetmealBtn.addEventListener('click', () => {
        setmealModal.style.display = 'none';
        pendingSetMealItem = null;
    });

    confirmSetmealBtn.addEventListener('click', () => {
        if (!pendingSetMealItem) return;
        const isEcoCup = document.getElementById('eco-cup-checkbox') ? document.getElementById('eco-cup-checkbox').checked : false;
        addToCart(pendingSetMealItem, selectedAddons, isEcoCup, selectedNotes);
        setmealModal.style.display = 'none';
        pendingSetMealItem = null;
    });

    // Click outside modal closes it
    setmealModal.addEventListener('click', (e) => {
        if (e.target === setmealModal) {
            setmealModal.style.display = 'none';
            pendingSetMealItem = null;
        }
    });

    // ===== CART OPERATIONS =====
    function addToCart(item, addons = [], isEcoCup = false, chosenNotes = []) {
        const addonKey = addons.map(a => a.id).sort().join('+');
        const noteKey = chosenNotes.sort().join('|');
        const cartKey = item.id + '_' + (addonKey || 'none') + (isEcoCup ? '_eco' : '') + '_' + (noteKey || 'none');
        const existing = cart.find(c => c.cartKey === cartKey);
        if (existing) {
            existing.quantity += 1;
        } else {
            const addonsTotal = addons.reduce((s, a) => s + (a.price || 0), 0);
            const finalPrice = item.price + addonsTotal - (isEcoCup ? 5 : 0);
            cart.push({
                cartKey,
                id: item.id,
                name: item.name,
                category: item.category,
                basePrice: item.price,
                addons: addons,
                isEcoCup: isEcoCup,
                price: finalPrice,
                quantity: 1,
                note: chosenNotes.join('、') || ''
            });
        }
        saveCart(cart);
        updateCartUI();
        cartSidebar.classList.add('open');
        setTimeout(() => cartSidebar.classList.remove('open'), 1800);
    }

    window.updateQuantity = function (cartKey, delta) {
        const idx = cart.findIndex(c => c.cartKey === cartKey);
        if (idx === -1) return;
        cart[idx].quantity += delta;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
        saveCart(cart);
        updateCartUI();
    };

    function updateCartUI() {
        // Count
        const total = cart.reduce((s, i) => s + i.quantity, 0);
        cartCount.textContent = total;

        // Items
        cartItemsCont.innerHTML = '';
        if (cart.length === 0) {
            cartItemsCont.innerHTML = '<p style="text-align:center;color:var(--text-muted);margin-top:2rem;">購物車目前空空的 🐾</p>';
        } else {
            cart.forEach(item => {
                const el = document.createElement('div');
                el.className = 'cart-item';
                const addonsHtml = (item.addons || []).map(a =>
                    `<div class="setmeal-tag">+ ${a.name} (+NT$ ${a.price})</div>`
                ).join('');
                const noteHtml = item.note ? `<div class="setmeal-tag" style="color:#e65100; background:#fff3e0;">📝 備註: ${item.note}</div>` : '';
                el.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        ${addonsHtml}
                        ${item.isEcoCup ? `<div class="setmeal-tag" style="color:#2e7d32; background:#e8f5e9;">🌱 自備環保杯 (-NT$ 5)</div>` : ''}
                        ${noteHtml}
                        <span class="price" style="font-size:0.95rem;">NT$ ${item.price}</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity('${item.cartKey}', -1)">−</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.cartKey}', 1)">+</button>
                    </div>
                `;
                cartItemsCont.appendChild(el);
            });
        }

        // Total
        const sum = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        cartTotal.textContent = `NT$ ${sum}`;
    }

    // ===== CART OPEN/CLOSE =====
    openCartBtn.addEventListener('click', () => cartSidebar.classList.add('open'));
    closeCartBtn.addEventListener('click', () => cartSidebar.classList.remove('open'));

    // ===== INVOICE RADIO =====
    [invPaper, invCarrier, invUniform].forEach(radio => {
        radio.addEventListener('change', () => {
            carrierRow.style.display = invCarrier.checked ? 'flex' : 'none';
            uniformRow.style.display = invUniform.checked ? 'flex' : 'none';
        });
    });

    // ===== CAMERA SCAN =====
    scanBtn.addEventListener('click', openCamera);
    closeCameraBtn.addEventListener('click', closeCamera);
    cameraModal.addEventListener('click', e => { if (e.target === cameraModal) closeCamera(); });

    function openCamera() {
        cameraResult.textContent = '';
        cameraModal.style.display = 'flex';
        cameraStream = null;

        if (!window.ZXing) {
            alert('條碼掃描元件載入中，請稍後再試');
            cameraModal.style.display = 'none';
            return;
        }

        const hints = new Map();
        codeReader = new ZXing.BrowserMultiFormatReader(hints);
        codeReader.decodeFromVideoDevice(null, 'camera-video', (result, err) => {
            if (result) {
                carrierInput.value = result.getText();
                cameraResult.textContent = '✅ 掃描成功：' + result.getText();
                setTimeout(closeCamera, 1200);
            }
        });
    }

    function closeCamera() {
        if (codeReader) {
            try { codeReader.reset(); } catch (e) { }
            codeReader = null;
        }
        if (cameraVideo.srcObject) {
            cameraVideo.srcObject.getTracks().forEach(t => t.stop());
            cameraVideo.srcObject = null;
        }
        cameraModal.style.display = 'none';
    }

    // ===== CHECKOUT =====
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('購物車是空的喔！先挑選一些美味的餐點吧 🐾');
            return;
        }
        const tableNum = tableInput.value.trim();
        if (!tableNum) {
            tableHint.style.display = 'inline';
            tableInput.focus();
            return;
        }
        tableHint.style.display = 'none';

        // Invoice info
        let invoiceType = 'paper';
        let invoiceData = '';
        if (invCarrier.checked) {
            invoiceType = 'carrier';
            invoiceData = carrierInput.value.trim();
        } else if (invUniform.checked) {
            invoiceType = 'uniform';
            invoiceData = uniformInput.value.trim();
        }

        const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

        const order = {
            id: 'ORD' + Date.now(),
            date: new Date().toISOString(),
            tableNumber: tableNum,
            type: '內用',
            source: 'frontend',
            items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity, addons: i.addons || [], isEcoCup: i.isEcoCup, category: i.category, note: i.note || '' })),
            subtotal,
            discount: 0,
            total: subtotal,
            guests: 1,
            invoiceType,
            invoiceData
        };

        // Save to PosQueue (Wait for POS checkout)
        const posQueue = getPosQueueOrders();
        posQueue.push(order);
        savePosQueueOrders(posQueue);

        // Show success
        successOrderId.textContent = '線上點單已送出，請至櫃檯結帳';
        successTable.textContent = `🪑 桌號 ${tableNum}`;
        successModal.style.display = 'flex';

        // Clear cart
        cart = [];
        saveCart(cart);
        updateCartUI();
        cartSidebar.classList.remove('open');
        carrierInput.value = '';
        uniformInput.value = '';
        invPaper.checked = true;
        carrierRow.style.display = 'none';
        uniformRow.style.display = 'none';
    });

    closeSuccessBtn.addEventListener('click', () => {
        successModal.style.display = 'none';
    });

    // ===== SHOP NAME =====
    function initShopName() {
        const settings = getSettings();
        document.querySelectorAll('.shop-name-display').forEach(el => el.textContent = settings.shopName);
        document.title = `${settings.shopName} | 寵物友善咖啡廳`;
    }
});
