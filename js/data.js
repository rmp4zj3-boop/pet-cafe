// ===== CATEGORY DEFINITIONS =====
const CATEGORIES = [
    { id: 'drinks',    label: '飲品',       icon: '☕', hasSetMeal: false },
    { id: 'food',      label: '主餐',       icon: '🍽️', hasSetMeal: false },
    { id: 'toast',     label: '吐司',       icon: '🍞', hasSetMeal: true  },
    { id: 'bagel',     label: '貝果',       icon: '🥯', hasSetMeal: true  },
    { id: 'croissant', label: '可頌',       icon: '🥐', hasSetMeal: true  },
    { id: 'risotto',   label: '燉飯',       icon: '🍚', hasSetMeal: true  },
    { id: 'pasta',     label: '義大利麵',   icon: '🍝', hasSetMeal: true  },
    { id: 'dessert',   label: '甜點',       icon: '🍰', hasSetMeal: false },
    { id: 'pets',      label: '毛孩專區',   icon: '🐾', hasSetMeal: false }
];

// ===== MENU DATA =====
const DEFAULT_MENU = [
    // Drinks
    { id: "1",  name: "焦糖瑪奇朵",        category: "drinks",    description: "香濃義式濃縮搭配滑順鮮奶與焦糖醬。",   price: 150, image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=500&q=60" },
    { id: "2",  name: "莓果氣泡飲",        category: "drinks",    description: "新鮮綜合莓果搭配清涼氣泡水。",         price: 130, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=60" },
    { id: "18", name: "拿鐵咖啡",          category: "drinks",    description: "義式濃縮搭配綿密奶泡。",              price: 140, image: "" },
    { id: "19", name: "抹茶拿鐵",          category: "drinks",    description: "日本抹茶粉搭配鮮奶。",               price: 155, image: "" },
    // Food
    { id: "3",  name: "經典早午餐盤",      category: "food",      description: "炒蛋、香煎培根、烤番茄與手工麵包。", price: 280, image: "https://images.unsplash.com/photo-1640826414986-7a1f5b08c90b?auto=format&fit=crop&w=500&q=60" },
    // Toast
    { id: "6",  name: "法式厚片吐司",      category: "toast",     description: "香濃法式奶油烤製，外酥內軟。",        price: 120, image: "" },
    { id: "7",  name: "蜂蜜核桃吐司",      category: "toast",     description: "天然蜂蜜搭配核桃，香甜可口。",        price: 130, image: "" },
    // Bagel
    { id: "8",  name: "芝麻貝果",          category: "bagel",     description: "Q彈芝麻貝果，附奶油乳酪。",          price: 110, image: "" },
    { id: "9",  name: "全麥貝果",          category: "bagel",     description: "健康全麥，口感紮實有嚼勁。",          price: 120, image: "" },
    // Croissant
    { id: "10", name: "原味可頌",          category: "croissant", description: "層層酥脆，奶香十足。",               price: 100, image: "" },
    { id: "11", name: "火腿起司可頌",      category: "croissant", description: "夾入手工火腿與融化起司。",            price: 145, image: "" },
    // Risotto
    { id: "12", name: "松露奶油燉飯",      category: "risotto",   description: "進口松露醬搭配濃郁奶油燉飯。",        price: 320, image: "" },
    { id: "13", name: "番茄海鮮燉飯",      category: "risotto",   description: "鮮蝦、花枝搭配番茄燉飯。",            price: 350, image: "" },
    // Pasta
    { id: "14", name: "白酒蛤蜊義大利麵",  category: "pasta",     description: "新鮮蛤蜊搭配白酒清炒。",             price: 280, image: "" },
    { id: "15", name: "培根蛋黃義大利麵",  category: "pasta",     description: "正統羅馬風格卡邦尼醬。",             price: 260, image: "" },
    // Dessert
    { id: "16", name: "提拉米蘇",          category: "dessert",   description: "馬斯卡彭起司搭配濃縮咖啡。",          price: 150, image: "" },
    { id: "17", name: "草莓鬆餅",          category: "dessert",   description: "比利時鬆餅搭配新鮮草莓。",            price: 180, image: "" },
    // Pets
    { id: "4",  name: "汪星人特製肉肉漢堡", category: "pets",     description: "100% 純牛肉手打排，無鹽無調味。",     price: 180, image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=500&q=60" },
    { id: "5",  name: "喵咪鮮魚凍",        category: "pets",      description: "新鮮鮪魚與雞湯熬製。",               price: 120, image: "https://images.unsplash.com/photo-1548366086-7f1b76106622?auto=format&fit=crop&w=500&q=60" }
];

// ===== SET MEAL OPTIONS (editable from admin) =====
const DEFAULT_SET_MEAL_OPTIONS = {
    toast:     [ { id: 'ts1', name: '升級飲料（任選）', price: 60 }, { id: 'ts2', name: '加湯品', price: 40 }, { id: 'ts3', name: '飲料＋湯品', price: 90 } ],
    bagel:     [ { id: 'bg1', name: '升級飲料（任選）', price: 60 }, { id: 'bg2', name: '加湯品', price: 40 }, { id: 'bg3', name: '飲料＋湯品', price: 90 } ],
    croissant: [ { id: 'cr1', name: '升級飲料（任選）', price: 60 }, { id: 'cr2', name: '加湯品', price: 40 }, { id: 'cr3', name: '飲料＋湯品', price: 90 } ],
    risotto:   [ { id: 'ri1', name: '升級飲料（任選）', price: 60 }, { id: 'ri2', name: '加湯品', price: 40 }, { id: 'ri3', name: '飲料＋湯品', price: 90 } ],
    pasta:     [ { id: 'pa1', name: '升級飲料（任選）', price: 60 }, { id: 'pa2', name: '加湯品', price: 40 }, { id: 'pa3', name: '飲料＋湯品', price: 90 } ]
};

function getSetMealOptions() {
    const saved = localStorage.getItem('petCafeSetMealOptions');
    return saved ? JSON.parse(saved) : DEFAULT_SET_MEAL_OPTIONS;
}
function saveSetMealOptions(data) {
    localStorage.setItem('petCafeSetMealOptions', JSON.stringify(data));
}

// ===== DRINK SIZES =====
const DEFAULT_DRINK_SIZES = [
    { id: 'M', name: '中杯', price: 0 },
    { id: 'L', name: '大杯', price: 15 },
    { id: 'XL', name: '特大杯', price: 30 }
];

function getDrinkSizes() {
    const saved = localStorage.getItem('petCafeDrinkSizes');
    return saved ? JSON.parse(saved) : DEFAULT_DRINK_SIZES;
}

function saveDrinkSizes(sizes) {
    localStorage.setItem('petCafeDrinkSizes', JSON.stringify(sizes));
}

// ===== DRINK DISCOUNTS (per set meal category) =====
const DEFAULT_DRINK_DISCOUNTS = {
    toast: 0, bagel: 0, croissant: 0, risotto: 0, pasta: 0
};

function getDrinkDiscounts() {
    const saved = localStorage.getItem('petCafeDrinkDiscounts');
    return saved ? JSON.parse(saved) : { ...DEFAULT_DRINK_DISCOUNTS };
}

function saveDrinkDiscounts(discounts) {
    localStorage.setItem('petCafeDrinkDiscounts', JSON.stringify(discounts));
}

// ===== INGREDIENTS & COST MATRIX =====
const DEFAULT_INGREDIENTS = [
    { id: 'ing1', name: '咖啡豆', weight: 1, unit: 'kg', purchasePrice: 600 },
    { id: 'ing2', name: '全脂鮮奶', weight: 1, unit: 'L', purchasePrice: 90 },
    { id: 'ing3', name: '焦糖醬', weight: 100, unit: 'ml', purchasePrice: 50 },
    { id: 'ing4', name: '雞蛋', weight: 10, unit: '顆', purchasePrice: 80 },
    { id: 'ing5', name: '培根', weight: 20, unit: '片', purchasePrice: 300 },
    { id: 'ing6', name: '厚片吐司', weight: 10, unit: '片', purchasePrice: 100 }
];

const DEFAULT_COST_MATRIX = {
    '1': { 'ing1': 0.02, 'ing2': 0.2, 'ing3': 15 },
    '6': { 'ing6': 1, 'ing4': 1 }
};

function getIngredients() {
    const saved = localStorage.getItem('petCafeIngredients');
    if (!saved) return DEFAULT_INGREDIENTS;
    try {
        const parsed = JSON.parse(saved);
        return parsed.map(ing => {
            if (ing.purchasePrice === undefined && ing.unitCost !== undefined) {
                ing.weight = 1;
                ing.purchasePrice = ing.unitCost;
            }
            if (ing.weight === undefined) ing.weight = 1;
            if (ing.purchasePrice === undefined) ing.purchasePrice = 0;
            return ing;
        });
    } catch (e) {
        return DEFAULT_INGREDIENTS;
    }
}

function saveIngredients(list) {
    localStorage.setItem('petCafeIngredients', JSON.stringify(list));
}

function getCostMatrix() {
    const saved = localStorage.getItem('petCafeCostMatrix');
    return saved ? JSON.parse(saved) : DEFAULT_COST_MATRIX;
}

function saveCostMatrix(matrix) {
    localStorage.setItem('petCafeCostMatrix', JSON.stringify(matrix));
}

// ===== MENU =====
function getMenu() {
    const saved = localStorage.getItem('petCafeMenu');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('petCafeMenu', JSON.stringify(DEFAULT_MENU));
    return DEFAULT_MENU;
}
function saveMenu(menuList) {
    localStorage.setItem('petCafeMenu', JSON.stringify(menuList));
}

// ===== CART =====
function getCart() {
    const saved = localStorage.getItem('petCafeCart');
    return saved ? JSON.parse(saved) : [];
}
function saveCart(cartList) {
    localStorage.setItem('petCafeCart', JSON.stringify(cartList));
}

// ===== ORDERS (completed, for revenue) =====
function getOrders() {
    const saved = localStorage.getItem('petCafeOrders');
    return saved ? JSON.parse(saved) : [];
}
function saveOrders(ordersList) {
    localStorage.setItem('petCafeOrders', JSON.stringify(ordersList));
}

// ===== PENDING ORDERS (waiting for kitchen to serve) =====
function getPendingOrders() {
    const saved = localStorage.getItem('petCafePendingOrders');
    return saved ? JSON.parse(saved) : [];
}
function savePendingOrders(list) {
    localStorage.setItem('petCafePendingOrders', JSON.stringify(list));
}

// ===== POS QUEUE ORDERS (waiting for checkout at POS) =====
function getPosQueueOrders() {
    const saved = localStorage.getItem('petCafePosQueue');
    return saved ? JSON.parse(saved) : [];
}
function savePosQueueOrders(list) {
    localStorage.setItem('petCafePosQueue', JSON.stringify(list));
}

// ===== SERVED ORDERS (already served, history) =====
function getServedOrders() {
    const saved = localStorage.getItem('petCafeServedOrders');
    return saved ? JSON.parse(saved) : [];
}
function saveServedOrders(list) {
    localStorage.setItem('petCafeServedOrders', JSON.stringify(list));
}

// ===== SETTLEMENTS (Daily closeouts) =====
function getSettlements() {
    const saved = localStorage.getItem('petCafeSettlements');
    return saved ? JSON.parse(saved) : [];
}
function saveSettlements(list) {
    localStorage.setItem('petCafeSettlements', JSON.stringify(list));
}

// ===== PROJECTIONS =====
const DEFAULT_PROJECTIONS = [
    { year: 1, dailyCustomers: 40, workDaysPerMonth: 26, avgTicketPrice: 280, ingredientCost: 87500, personnelCost: 116667, rentCost: 50000, utilityCost: 29167 },
    { year: 2, dailyCustomers: 55, workDaysPerMonth: 26, avgTicketPrice: 300, ingredientCost: 129167, personnelCost: 133333, rentCost: 52500, utilityCost: 33333 },
    { year: 3, dailyCustomers: 70, workDaysPerMonth: 26, avgTicketPrice: 320, ingredientCost: 175000, personnelCost: 150000, rentCost: 55000, utilityCost: 37500 }
];
function getProjections() {
    const saved = localStorage.getItem('petCafeProjectionsV3');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('petCafeProjectionsV3', JSON.stringify(DEFAULT_PROJECTIONS));
    return DEFAULT_PROJECTIONS;
}
function saveProjections(data) {
    localStorage.setItem('petCafeProjectionsV3', JSON.stringify(data));
}

// ===== INVESTMENT =====
const DEFAULT_INVESTMENT = { decoration: 1200000, equipment: 800000, deposit: 100000, misc: 150000, workingCapital: 600000 };
function getInvestment() {
    const saved = localStorage.getItem('petCafeInvestment');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('petCafeInvestment', JSON.stringify(DEFAULT_INVESTMENT));
    return DEFAULT_INVESTMENT;
}
function saveInvestment(data) {
    localStorage.setItem('petCafeInvestment', JSON.stringify(data));
}

// ===== SETTINGS =====
const DEFAULT_SETTINGS = { shopName: '毛孩窩' };
function getSettings() {
    const saved = localStorage.getItem('petCafeSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
}
function saveSettings(settings) {
    localStorage.setItem('petCafeSettings', JSON.stringify(settings));
}

// ===== HELPERS =====
function getCategoryInfo(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId) || { id: categoryId, label: categoryId, icon: '🍴', hasSetMeal: false };
}
