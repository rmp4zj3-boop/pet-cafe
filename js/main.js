document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let menu = getMenu();
    let cart = getCart();
    let currentCategory = 'all';

    // --- DOM Elements ---
    const menuContainer = document.getElementById('menu-container');
    const categoryNav = document.getElementById('category-nav');
    const cartCount = document.getElementById('cart-count');
    const cartSidebar = document.getElementById('cart-sidebar');
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    // --- Initialization ---
    renderMenu();
    updateCartUI();

    // --- Event Listeners ---
    categoryNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            // Update active class
            categoryNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');
            
            currentCategory = e.target.dataset.category;
            renderMenu();
        }
    });

    openCartBtn.addEventListener('click', () => {
        cartSidebar.classList.add('open');
    });

    closeCartBtn.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
    });

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('購物車是空的喔！先挑選一些美味的餐點吧。');
            return;
        }
        alert('感謝您的訂購！您的餐點已經開始準備囉 🐾');
        cart = [];
        saveCart(cart);
        updateCartUI();
        cartSidebar.classList.remove('open');
    });

    // --- Functions ---
    function renderMenu() {
        menuContainer.innerHTML = '';
        
        const filteredMenu = currentCategory === 'all' 
            ? menu 
            : menu.filter(item => item.category === currentCategory);

        filteredMenu.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-item';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="item-bottom">
                        <span class="price">NT$ ${item.price}</span>
                        <button class="add-btn" onclick="addToCart('${item.id}')">加入購物車</button>
                    </div>
                </div>
            `;
            menuContainer.appendChild(card);
        });
    }

    window.addToCart = function(itemId) {
        const item = menu.find(m => m.id === itemId);
        if (!item) return;

        const existingCartItem = cart.find(c => c.id === itemId);
        if (existingCartItem) {
            existingCartItem.quantity += 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        
        saveCart(cart);
        updateCartUI();
        
        // Simple animation feedback
        cartSidebar.classList.add('open');
        setTimeout(() => cartSidebar.classList.remove('open'), 1500);
    };

    window.updateQuantity = function(itemId, delta) {
        const cartItem = cart.find(c => c.id === itemId);
        if (cartItem) {
            cartItem.quantity += delta;
            if (cartItem.quantity <= 0) {
                cart = cart.filter(c => c.id !== itemId);
            }
            saveCart(cart);
            updateCartUI();
        }
    };

    function updateCartUI() {
        // Update count
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;

        // Update items list
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top: 2rem;">購物車目前空空的</p>';
        } else {
            cart.forEach(item => {
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'cart-item';
                cartItemEl.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <span class="price">NT$ ${item.price}</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemEl);
            });
        }

        // Update total
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `NT$ ${totalPrice}`;
    }
});
