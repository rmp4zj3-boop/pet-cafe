document.addEventListener('DOMContentLoaded', () => {
    let menu = getMenu();

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

    function renderAdminMenu() {
        tbody.innerHTML = '';
        menu.forEach(item => {
            const categoryMap = {
                'drinks': '飲品',
                'food': '主餐',
                'pets': '毛孩專區'
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td><strong>${item.name}</strong></td>
                <td>${categoryMap[item.category]}</td>
                <td>NT$ ${item.price}</td>
                <td class="actions">
                    <button class="btn btn-primary" onclick="editItem('${item.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.9rem;">編輯</button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.9rem;">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderAdminMenu();

    // Show form for new item
    addNewBtn.addEventListener('click', () => {
        itemForm.reset();
        idInput.value = '';
        formTitle.textContent = '新增品項';
        itemFormContainer.style.display = 'block';
    });

    // Hide form
    cancelBtn.addEventListener('click', () => {
        itemFormContainer.style.display = 'none';
    });

    // Handle form submit (Create or Update)
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newItem = {
            id: idInput.value || Date.now().toString(), // Generate simple unique ID if new
            name: nameInput.value,
            category: categoryInput.value,
            description: descInput.value,
            price: parseInt(priceInput.value, 10),
            image: imageInput.value
        };

        if (idInput.value) {
            // Update existing
            const index = menu.findIndex(m => m.id === idInput.value);
            if (index !== -1) {
                menu[index] = newItem;
            }
        } else {
            // Add new
            menu.push(newItem);
        }

        saveMenu(menu);
        renderAdminMenu();
        itemFormContainer.style.display = 'none';
        alert('儲存成功！');
    });

    // Expose edit function globally
    window.editItem = function(id) {
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

    // Expose delete function globally
    window.deleteItem = function(id) {
        if (confirm('確定要刪除這個品項嗎？')) {
            menu = menu.filter(m => m.id !== id);
            saveMenu(menu);
            
            // Also optional: remove from users' carts, but to keep simple we skip or do it lazily
            
            renderAdminMenu();
        }
    };

    // --- Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = '#666';
            });
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });

            btn.classList.add('active');
            btn.style.borderBottomColor = '#ffb347';
            btn.style.color = '#333';
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');
            targetContent.style.display = 'block';

            if (targetId === 'projection-tab') {
                renderProjections();
            } else if (targetId === 'pos-tab') {
                renderPOSMenu();
                renderPOSCart();
            } else if (targetId === 'revenue-tab') {
                renderRevenue();
            }
        });
    });

    // --- Projection Logic ---
    let projections = getProjections();
    let investment = getInvestment();
    const projectionBody = document.getElementById('projection-body');
    const saveProjectionBtn = document.getElementById('save-projection-btn');

    let revenueCostChartInstance = null;
    let profitMarginChartInstance = null;
    let costStructureChartInstance = null;
    let investmentChartInstance = null;

    function renderProjections() {
        projectionBody.innerHTML = '';
        
        const labels = ['每日客流', '月營業天數', '平均客單價', '食材成本 (年)', '人事成本 (月)', '租金 (月)', '水電雜支 (年)', '行銷費用 (年)'];
        const keys = ['dailyCustomers', 'workDaysPerMonth', 'avgTicketPrice', 'ingredientCost', 'personnelCost', 'rentCost', 'utilityCost', 'marketingCost'];

        labels.forEach((label, i) => {
            const key = keys[i];
            const tr = document.createElement('tr');
            let rowHtml = `<td><strong>${label}</strong></td>`;
            
            projections.forEach((proj, yearIndex) => {
                rowHtml += `<td><input type="number" class="form-control proj-input" data-year="${yearIndex}" data-key="${key}" value="${proj[key]}" style="width: 100%;"></td>`;
            });
            
            tr.innerHTML = rowHtml;
            projectionBody.appendChild(tr);
        });

        // Add summary rows (Calculated)
        const revenueTr = document.createElement('tr');
        revenueTr.style.backgroundColor = '#f0f8ff';
        let revenueHtml = `<td><strong>年營收 (系統計算)</strong></td>`;
        
        const costTr = document.createElement('tr');
        costTr.style.backgroundColor = '#fff0f0';
        let costHtml = `<td><strong>總成本 (系統計算)</strong></td>`;

        const profitTr = document.createElement('tr');
        profitTr.style.backgroundColor = '#f0fff0';
        let profitHtml = `<td><strong>淨利 (系統計算)</strong></td>`;

        projections.forEach(proj => {
            const rev = proj.dailyCustomers * proj.avgTicketPrice * proj.workDaysPerMonth * 12;
            const cost = proj.ingredientCost + (proj.personnelCost * 12) + (proj.rentCost * 12) + proj.utilityCost + proj.marketingCost;
            const profit = rev - cost;
            
            revenueHtml += `<td>NT$ ${(rev / 10000).toFixed(0)} 萬</td>`;
            costHtml += `<td>NT$ ${(cost / 10000).toFixed(0)} 萬</td>`;
            profitHtml += `<td style="color: ${profit >= 0 ? 'green' : 'red'}; font-weight: bold;">NT$ ${(profit / 10000).toFixed(0)} 萬</td>`;
        });

        revenueTr.innerHTML = revenueHtml;
        costTr.innerHTML = costHtml;
        profitTr.innerHTML = profitHtml;
        
        projectionBody.appendChild(revenueTr);
        projectionBody.appendChild(costTr);
        projectionBody.appendChild(profitTr);

        renderInvestment();
        updateCharts();
    }

    function renderInvestment() {
        // Automatically sync deposit with Year 1 Rent * 2
        investment.deposit = projections[0].rentCost * 2;
        
        document.getElementById('inv-decoration').value = investment.decoration;
        document.getElementById('inv-equipment').value = investment.equipment;
        document.getElementById('inv-deposit').value = investment.deposit;
        document.getElementById('inv-misc').value = investment.misc;
        document.getElementById('inv-working-capital').value = investment.workingCapital;

        const totalInvestment = investment.decoration + investment.equipment + investment.deposit + investment.misc + investment.workingCapital;
        document.getElementById('inv-total').textContent = `NT$ ${(totalInvestment / 10000).toFixed(0)} 萬`;

        // Calculate ROI (Return on Investment)
        // Profit of Year 1 and Year 2
        const p1_rev = projections[0].dailyCustomers * projections[0].avgTicketPrice * projections[0].workDaysPerMonth * 12;
        const p1_cost = projections[0].ingredientCost + (projections[0].personnelCost * 12) + (projections[0].rentCost * 12) + projections[0].utilityCost + projections[0].marketingCost;
        const p1 = p1_rev - p1_cost;

        const p2_rev = projections[1].dailyCustomers * projections[1].avgTicketPrice * projections[1].workDaysPerMonth * 12;
        const p2_cost = projections[1].ingredientCost + (projections[1].personnelCost * 12) + (projections[1].rentCost * 12) + projections[1].utilityCost + projections[1].marketingCost;
        const p2 = p2_rev - p2_cost;

        const p3_rev = projections[2].dailyCustomers * projections[2].avgTicketPrice * projections[2].workDaysPerMonth * 12;
        const p3_cost = projections[2].ingredientCost + (projections[2].personnelCost * 12) + (projections[2].rentCost * 12) + projections[2].utilityCost + projections[2].marketingCost;
        const p3 = p3_rev - p3_cost;

        let roiText = '';
        if (totalInvestment <= 0) {
            roiText = 'N/A';
        } else if (p1 > 0 && totalInvestment <= p1) {
            const months = (totalInvestment / (p1 / 12)).toFixed(1);
            roiText = `約 ${months} 個月`;
        } else if (p1 + p2 > 0 && totalInvestment <= p1 + p2) {
            const remaining = totalInvestment - p1;
            const months = 12 + (remaining / (p2 / 12));
            roiText = `約 ${months.toFixed(1)} 個月`;
        } else if (p1 + p2 + p3 > 0 && totalInvestment <= p1 + p2 + p3) {
            const remaining = totalInvestment - p1 - p2;
            const months = 24 + (remaining / (p3 / 12));
            roiText = `約 ${months.toFixed(1)} 個月`;
        } else {
            roiText = '超過 3 年';
        }

        document.getElementById('inv-roi').textContent = roiText;
    }

    saveProjectionBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.proj-input');
        inputs.forEach(input => {
            const yearIndex = input.getAttribute('data-year');
            const key = input.getAttribute('data-key');
            projections[yearIndex][key] = Number(input.value);
        });
        saveProjections(projections);

        investment.decoration = Number(document.getElementById('inv-decoration').value);
        investment.equipment = Number(document.getElementById('inv-equipment').value);
        investment.misc = Number(document.getElementById('inv-misc').value);
        investment.workingCapital = Number(document.getElementById('inv-working-capital').value);
        // deposit is auto-calculated, no need to read from input
        saveInvestment(investment);

        alert('營運預測與資金估算已儲存！');
        renderProjections(); // Re-render to update calculations and charts
    });

    function updateCharts() {
        const years = ['第 1 年', '第 2 年', '第 3 年'];
        const revenues = projections.map(p => (p.dailyCustomers * p.avgTicketPrice * p.workDaysPerMonth * 12) / 10000);
        const costs = projections.map(p => (p.ingredientCost + (p.personnelCost * 12) + (p.rentCost * 12) + p.utilityCost + p.marketingCost) / 10000);
        const profits = revenues.map((r, i) => r - costs[i]);
        const margins = profits.map((p, i) => (p / revenues[i]) * 100);

        // Revenue vs Cost Chart
        const rcCtx = document.getElementById('revenueCostChart');
        if (revenueCostChartInstance) revenueCostChartInstance.destroy();
        revenueCostChartInstance = new Chart(rcCtx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: '營收 (萬)', data: revenues, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: '總成本 (萬)', data: costs, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
                ]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });

        // Profit Margin Chart
        const pmCtx = document.getElementById('profitMarginChart');
        if (profitMarginChartInstance) profitMarginChartInstance.destroy();
        profitMarginChartInstance = new Chart(pmCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    { label: '淨利率 (%)', data: margins, borderColor: 'rgba(54, 162, 235, 1)', tension: 0.1, fill: false }
                ]
            },
            options: { responsive: true, scales: { y: { beginAtZero: false } } }
        });

        // Cost Structure Chart (Year 3)
        const csCtx = document.getElementById('costStructureChart');
        const p3 = projections[2];
        if (costStructureChartInstance) costStructureChartInstance.destroy();
        costStructureChartInstance = new Chart(csCtx, {
            type: 'doughnut',
            data: {
                labels: ['食材', '人事', '租金', '水電雜支', '行銷'],
                datasets: [{
                    data: [p3.ingredientCost, p3.personnelCost * 12, p3.rentCost * 12, p3.utilityCost, p3.marketingCost],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Investment Chart
        const invCtx = document.getElementById('investmentChart');
        if (investmentChartInstance) investmentChartInstance.destroy();
        investmentChartInstance = new Chart(invCtx, {
            type: 'doughnut',
            data: {
                labels: ['裝潢與設計', '設備與餐具', '租金押金', '雜支與開辦費', '預備週轉金'],
                datasets: [{
                    data: [investment.decoration, investment.equipment, investment.deposit, investment.misc, investment.workingCapital],
                    backgroundColor: ['#FF9F40', '#4BC0C0', '#36A2EB', '#9966FF', '#FFCD56']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- POS Logic ---
    const posMenuGrid = document.getElementById('pos-menu-grid');
    const posCartItems = document.getElementById('pos-cart-items');
    const posSubtotalEl = document.getElementById('pos-subtotal');
    const posDiscountEl = document.getElementById('pos-discount');
    const posTotalEl = document.getElementById('pos-total');
    const posCheckoutBtn = document.getElementById('pos-checkout-btn');
    const refreshRevenueBtn = document.getElementById('refresh-revenue-btn');
    
    let posCart = [];

    function renderPOSMenu() {
        if (!posMenuGrid) return;
        posMenuGrid.innerHTML = '';
        menu.forEach(item => {
            const btn = document.createElement('button');
            btn.style.padding = '1rem';
            btn.style.border = '1px solid #ddd';
            btn.style.borderRadius = '8px';
            btn.style.background = '#fff';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.gap = '0.5rem';

            btn.innerHTML = `
                <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;">
                <span style="font-weight: bold; font-size: 0.9rem; text-align: center;">${item.name}</span>
                <span style="color: #e65100;">NT$ ${item.price}</span>
            `;
            btn.addEventListener('click', () => addToPOSCart(item));
            posMenuGrid.appendChild(btn);
        });
    }

    function addToPOSCart(item) {
        const existing = posCart.find(cartItem => cartItem.id === item.id);
        if (existing) {
            existing.qty += 1;
        } else {
            posCart.push({ ...item, qty: 1 });
        }
        renderPOSCart();
    }

    function removeFromPOSCart(id) {
        posCart = posCart.filter(item => item.id !== id);
        renderPOSCart();
    }

    function renderPOSCart() {
        if (!posCartItems) return;
        posCartItems.innerHTML = '';
        let subtotal = 0;

        posCart.forEach(item => {
            subtotal += item.price * item.qty;
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '0.5rem 0';
            div.style.borderBottom = '1px solid #eee';

            div.innerHTML = `
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold;">${item.name}</div>
                    <div style="color: #666; font-size: 0.9rem;">NT$ ${item.price} x ${item.qty}</div>
                </div>
                <button class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="removeFromPOSCart('${item.id}')">X</button>
            `;
            posCartItems.appendChild(div);
        });

        posSubtotalEl.textContent = `NT$ ${subtotal}`;
        const discount = Number(posDiscountEl.value) || 0;
        const total = Math.max(0, subtotal - discount);
        posTotalEl.textContent = `NT$ ${total}`;
    }

    if(posDiscountEl) {
        posDiscountEl.addEventListener('input', renderPOSCart);
    }

    window.removeFromPOSCart = removeFromPOSCart;

    if(posCheckoutBtn) {
        posCheckoutBtn.addEventListener('click', () => {
            if (posCart.length === 0) {
                alert('購物車是空的！');
                return;
            }

            let subtotal = 0;
            posCart.forEach(item => subtotal += item.price * item.qty);
            const discount = Number(posDiscountEl.value) || 0;
            const total = Math.max(0, subtotal - discount);
            const type = document.querySelector('input[name="order-type"]:checked').value;
            const guests = Number(document.getElementById('pos-guests').value) || 1;

            const order = {
                id: 'ORD' + Date.now(),
                date: new Date().toISOString(),
                type: type,
                guests: guests,
                items: posCart,
                subtotal: subtotal,
                discount: discount,
                total: total
            };

            const orders = getOrders();
            orders.push(order);
            saveOrders(orders);

            alert('結帳成功！訂單編號：' + order.id);
            
            // Clear cart
            posCart = [];
            posDiscountEl.value = 0;
            document.querySelector('input[name="order-type"][value="內用"]').checked = true;
            document.getElementById('pos-guests').value = 1;
            renderPOSCart();
        });
    }

    // --- Revenue Logic ---
    function renderRevenue() {
        const orders = getOrders();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7);

        let todayTotal = 0;
        let todayOrdersCount = 0;
        let todayGuestsCount = 0;
        let monthTotal = 0;
        let monthOrdersCount = 0;
        let monthGuestsCount = 0;

        orders.forEach(order => {
            const orderDateStr = order.date.split('T')[0];
            const orderMonthStr = order.date.substring(0, 7);
            const guests = order.guests || 1; // Fallback to 1 for older orders

            if (orderDateStr === todayStr) {
                todayTotal += order.total;
                todayOrdersCount++;
                todayGuestsCount += guests;
            }

            if (orderMonthStr === monthStr) {
                monthTotal += order.total;
                monthOrdersCount++;
                monthGuestsCount += guests;
            }
        });

        document.getElementById('rev-today-total').textContent = `NT$ ${todayTotal.toLocaleString()}`;
        document.getElementById('rev-today-orders').textContent = todayOrdersCount;
        document.getElementById('rev-today-guests').textContent = todayGuestsCount;
        const avgTableToday = todayOrdersCount > 0 ? (todayTotal / todayOrdersCount).toFixed(0) : 0;
        document.getElementById('rev-today-avg-table').textContent = `NT$ ${Number(avgTableToday).toLocaleString()}`;
        
        document.getElementById('rev-month-total').textContent = `NT$ ${monthTotal.toLocaleString()}`;
        document.getElementById('rev-month-orders').textContent = monthOrdersCount;
        document.getElementById('rev-month-guests').textContent = monthGuestsCount;
        const avgTableMonth = monthOrdersCount > 0 ? (monthTotal / monthOrdersCount).toFixed(0) : 0;
        document.getElementById('rev-month-avg-table').textContent = `NT$ ${Number(avgTableMonth).toLocaleString()}`;

        const ordersBody = document.getElementById('rev-orders-body');
        ordersBody.innerHTML = '';
        
        const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        
        recentOrders.forEach(order => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            
            const dateObj = new Date(order.date);
            const formattedDate = `${dateObj.getFullYear()}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            
            const itemsCount = order.items.reduce((sum, item) => sum + item.qty, 0);

            tr.innerHTML = `
                <td style="padding: 0.5rem;">${formattedDate}</td>
                <td style="padding: 0.5rem;"><span style="background: ${order.type === '內用' ? '#e6f7ff' : '#fff0f6'}; color: ${order.type === '內用' ? '#1890ff' : '#eb2f96'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${order.type}</span></td>
                <td style="padding: 0.5rem;">${itemsCount} 項</td>
                <td style="padding: 0.5rem;">- NT$ ${order.discount}</td>
                <td style="padding: 0.5rem; font-weight: bold;">NT$ ${order.total}</td>
            `;
            ordersBody.appendChild(tr);
        });
    }

    if(refreshRevenueBtn) {
        refreshRevenueBtn.addEventListener('click', renderRevenue);
    }
});
