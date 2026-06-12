const DEFAULT_MENU = [
    {
        id: "1",
        name: "焦糖瑪奇朵 (Caramel Macchiato)",
        category: "drinks",
        description: "香濃義式濃縮搭配滑順鮮奶與焦糖醬，暖心首選。",
        price: 150,
        image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=500&q=60"
    },
    {
        id: "2",
        name: "莓果氣泡飲 (Berry Sparkling)",
        category: "drinks",
        description: "新鮮綜合莓果搭配清涼氣泡水，夏日解渴最佳選擇。",
        price: 130,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=60"
    },
    {
        id: "3",
        name: "經典早午餐盤 (Classic Brunch)",
        category: "food",
        description: "炒蛋、香煎培根、烤番茄與手工麵包的完美組合。",
        price: 280,
        image: "https://images.unsplash.com/photo-1640826414986-7a1f5b08c90b?auto=format&fit=crop&w=500&q=60"
    },
    {
        id: "4",
        name: "汪星人特製肉肉漢堡 (Doggy Burger)",
        category: "pets",
        description: "100% 純牛肉手打排，無鹽無調味，搭配新鮮地瓜泥。",
        price: 180,
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=500&q=60"
    },
    {
        id: "5",
        name: "喵咪鮮魚凍 (Cat Fish Jelly)",
        category: "pets",
        description: "新鮮鮪魚與雞湯熬製，補充主子滿滿水分與營養。",
        price: 120,
        image: "https://images.unsplash.com/photo-1548366086-7f1b76106622?auto=format&fit=crop&w=500&q=60"
    }
];

// 初始化或取得菜單資料
function getMenu() {
    const savedMenu = localStorage.getItem('petCafeMenu');
    if (savedMenu) {
        return JSON.parse(savedMenu);
    } else {
        localStorage.setItem('petCafeMenu', JSON.stringify(DEFAULT_MENU));
        return DEFAULT_MENU;
    }
}

// 儲存菜單資料
function saveMenu(menuList) {
    localStorage.setItem('petCafeMenu', JSON.stringify(menuList));
}

// 取得購物車資料 (重新整理保留)
function getCart() {
    const savedCart = localStorage.getItem('petCafeCart');
    return savedCart ? JSON.parse(savedCart) : [];
}

// 儲存購物車資料
function saveCart(cartList) {
    localStorage.setItem('petCafeCart', JSON.stringify(cartList));
}

const DEFAULT_PROJECTIONS = [
    { year: 1, dailyCustomers: 40, workDaysPerMonth: 26, avgTicketPrice: 280, ingredientCost: 1050000, personnelCost: 116667, rentCost: 50000, utilityCost: 350000, marketingCost: 250000 },
    { year: 2, dailyCustomers: 55, workDaysPerMonth: 26, avgTicketPrice: 300, ingredientCost: 1550000, personnelCost: 133333, rentCost: 52500, utilityCost: 400000, marketingCost: 300000 },
    { year: 3, dailyCustomers: 70, workDaysPerMonth: 26, avgTicketPrice: 320, ingredientCost: 2100000, personnelCost: 150000, rentCost: 55000, utilityCost: 450000, marketingCost: 350000 }
];

function getProjections() {
    const saved = localStorage.getItem('petCafeProjectionsV2');
    if (saved) {
        return JSON.parse(saved);
    } else {
        localStorage.setItem('petCafeProjectionsV2', JSON.stringify(DEFAULT_PROJECTIONS));
        return DEFAULT_PROJECTIONS;
    }
}

function saveProjections(data) {
    localStorage.setItem('petCafeProjectionsV2', JSON.stringify(data));
}

const DEFAULT_INVESTMENT = {
    decoration: 1200000,
    equipment: 800000,
    deposit: 100000, // Will be overridden by rent * 2 dynamically
    misc: 150000,
    workingCapital: 600000
};

function getInvestment() {
    const saved = localStorage.getItem('petCafeInvestment');
    if (saved) {
        return JSON.parse(saved);
    } else {
        localStorage.setItem('petCafeInvestment', JSON.stringify(DEFAULT_INVESTMENT));
        return DEFAULT_INVESTMENT;
    }
}

function saveInvestment(data) {
    localStorage.setItem('petCafeInvestment', JSON.stringify(data));
}

function getOrders() {
    const saved = localStorage.getItem('petCafeOrders');
    return saved ? JSON.parse(saved) : [];
}

function saveOrders(ordersList) {
    localStorage.setItem('petCafeOrders', JSON.stringify(ordersList));
}
