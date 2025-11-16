// js/db.js

/**
 * Initializes the simulated database (using localStorage).
 * Creates initial tables (keys) if they don't exist.
 */
function initDB() {
    // Stores all available recipes/food items (Inventory)
    if (!localStorage.getItem('recipes')) {
        localStorage.setItem('recipes', JSON.stringify([
            { id: 1, name: 'Chicken & Veggies', calories: 450, protein: 40, fat: 15, carbs: 40, price: 12.99, prepTime: '30m' },
            { id: 2, name: 'Vegan Lentil Soup', calories: 300, protein: 15, fat: 5, carbs: 50, price: 9.50, prepTime: '45m' },
            { id: 3, name: 'Steak with Asparagus', calories: 600, protein: 60, fat: 35, carbs: 10, price: 18.50, prepTime: '25m' },
        ]));
    }

    // Stores user meal plans (customer specific, day-based)
    if (!localStorage.getItem('user_plans')) {
        localStorage.setItem('user_plans', JSON.stringify({})); // { 'user_id': [...] }
    }

    // Stores Admin's published weekly menu
    if (!localStorage.getItem('admin_menu')) {
         localStorage.setItem('admin_menu', JSON.stringify({})); // { 'Monday': [meals], ... }
    }

    // Stores orders made by customers
    if (!localStorage.getItem('orders')) {
        localStorage.setItem('orders', JSON.stringify([]));
    }

    // Stores registered users (simple login/role check)
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([
            { id: 'admin001', username: 'admin', password: 'password', role: 'admin' },
            { id: 'cust001', username: 'customer', password: 'password', role: 'customer' },
        ]));
    }
}

/**
 * Basic function to retrieve data from a "table" (localStorage key).
 * @param {string} table The key in localStorage (e.g., 'recipes').
 * @returns {Array<Object>|Object} The parsed data.
 */
function getData(table) {
    const data = localStorage.getItem(table);
    // Return Object for plans/menu, Array for others
    return data ? JSON.parse(data) : (table === 'user_plans' || table === 'admin_menu' ? {} : []);
}

// Initialize the database on script load
initDB();