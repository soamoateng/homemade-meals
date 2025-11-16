// js/app.js

// --- Global/Utility Functions ---

/**
 * Handles basic client-side user authentication and routing.
 */
function checkAuth() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const currentPage = window.location.pathname.split('/').pop();

    if (!user && currentPage !== 'index.html') {
        // Redirect if not logged in and not on the login page
        window.location.href = 'index.html';
    } else if (user && currentPage === 'index.html') {
        // Redirect if logged in and on the login page
        if (user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }
    }
}

/**
 * Clears session and redirects to the login page.
 */
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


// --- Login/Sign Up Modal Logic (index.html) ---

const loginFormModal = document.getElementById('login-form-modal');
const signupFormModal = document.getElementById('signup-form-modal');

if (loginFormModal) {
    // 1. Handle Login Submission from Modal
    loginFormModal.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value; // Get selected role
        
        const users = getData('users');
        const user = users.find(u => 
            u.username === username && 
            u.password === password && 
            u.role === role // Match by role
        );
        const msgEl = document.getElementById('login-message');

        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            msgEl.classList.add('d-none');
            // Hide modal and redirect
            const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
            if (modal) modal.hide();
            checkAuth(); 
        } else {
            msgEl.classList.remove('d-none');
        }
    });

    // 2. Handle Sign Up Submission from Modal
    signupFormModal.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;
        
        let users = getData('users');
        const errorMsgEl = document.getElementById('signup-message');
        const successMsgEl = document.getElementById('signup-success');
        
        // Check if username already exists
        if (users.some(u => u.username === username)) {
            errorMsgEl.classList.remove('d-none');
            successMsgEl.classList.add('d-none');
            return;
        }

        // Create new user
        const newUserId = 'user' + Date.now();
        users.push({ 
            id: newUserId, 
            username: username, 
            password: password, 
            role: role 
        });
        localStorage.setItem('users', JSON.stringify(users));

        // Show success message and reset form
        errorMsgEl.classList.add('d-none');
        successMsgEl.classList.remove('d-none');
        signupFormModal.reset();
        
        // Optionally switch to the login tab automatically
        setTimeout(() => {
            document.getElementById('login-tab').click();
            successMsgEl.classList.add('d-none');
            document.getElementById('login-username').value = username; // Pre-fill login
        }, 1500);
    });
}


// --- Admin Dashboard Logic (admin-dashboard.html) ---

const mealInventoryList = document.getElementById('meal-inventory-list');
const addMealForm = document.getElementById('add-meal-form');
const recentOrdersList = document.getElementById('recent-orders-list');
const customerPlansList = document.getElementById('customer-plans-list');
const adminInventoryDraggable = document.getElementById('admin-inventory-draggable');
const adminWeeklyMenuContainer = document.getElementById('admin-weekly-menu');
const adminMenuForm = document.getElementById('admin-menu-form');

if (mealInventoryList) {
    checkAuth(); // Ensure admin is logged in
    
    // Admin's local menu plan state
    let adminMenuPlan = getData('admin_menu') || {};
    let draggedMealData = null; // Global state for dragged item data

    // --- Inventory Management ---
    
    function renderAdminMeals() {
        const meals = getData('recipes');
        // List for editing/deleting
        mealInventoryList.innerHTML = meals.map(meal => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${meal.name} (Cal: ${meal.calories}, Price: $${meal.price})
                <div>
                    <button class="btn btn-sm btn-info me-2" onclick="editMeal(${meal.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMeal(${meal.id})">Delete</button>
                </div>
            </li>
        `).join('');
    }

    addMealForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('meal-id-edit').value;
        const name = document.getElementById('meal-name').value;
        const calories = parseInt(document.getElementById('meal-calories').value);
        const price = parseFloat(document.getElementById('meal-price').value);

        let meals = getData('recipes');

        if (id) {
            // Update existing meal
            const index = meals.findIndex(m => m.id === parseInt(id));
            if (index !== -1) {
                meals[index] = { ...meals[index], name, calories, price };
            }
            document.getElementById('meal-form-btn').textContent = 'Add Meal';
            document.getElementById('meal-id-edit').value = '';
        } else {
            // Add new meal
            const newId = meals.length ? Math.max(...meals.map(m => m.id)) + 1 : 1;
            meals.push({ id: newId, name, calories, price });
        }
        
        localStorage.setItem('recipes', JSON.stringify(meals));
        addMealForm.reset();
        renderAdminMeals();
        renderAdminDraggableMeals(); // Update draggable list
    });

    window.deleteMeal = (id) => {
        let meals = getData('recipes');
        meals = meals.filter(m => m.id !== id);
        localStorage.setItem('recipes', JSON.stringify(meals));
        renderAdminMeals();
        renderAdminDraggableMeals();
    };

    window.editMeal = (id) => {
        const meals = getData('recipes');
        const meal = meals.find(m => m.id === id);
        if (meal) {
            document.getElementById('meal-id-edit').value = meal.id;
            document.getElementById('meal-name').value = meal.name;
            document.getElementById('meal-calories').value = meal.calories;
            document.getElementById('meal-price').value = meal.price;
            document.getElementById('meal-form-btn').textContent = 'Update Meal';
        }
    };


    // --- Admin Menu Planner D&D ---

    function renderAdminDraggableMeals() {
        const meals = getData('recipes');
        adminInventoryDraggable.innerHTML = meals.map(meal => `
            <li class="list-group-item d-flex justify-content-between align-items-center bg-light" 
                draggable="true" 
                ondragstart="handleAdminDragStart(event, ${meal.id}, '${meal.name}')">
                <span class="fw-bold">${meal.name}</span>
                <span class="badge bg-primary">${meal.calories} Cal</span>
            </li>
        `).join('');
    }

    window.handleAdminDragStart = (e, mealId, mealName) => {
        draggedMealData = { mealId, mealName };
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', mealId);
    };

    function handleAdminDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleAdminDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleAdminDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const day = e.currentTarget.dataset.day;

        if (draggedMealData && day) {
            const newMeal = {
                id: draggedMealData.mealId,
                name: draggedMealData.mealName
            };
            
            if (!adminMenuPlan[day]) {
                adminMenuPlan[day] = [];
            }
            adminMenuPlan[day].push(newMeal);
            renderAdminMenu();
        }
    }

    function attachAdminDropListeners() {
        document.querySelectorAll('.admin-menu-drop-zone').forEach(zone => {
            zone.addEventListener('dragover', handleAdminDragOver);
            zone.addEventListener('dragleave', handleAdminDragLeave);
            zone.addEventListener('drop', handleAdminDrop);
        });
    }

    function renderAdminMenu() {
        adminWeeklyMenuContainer.innerHTML = ALL_DAYS.map(day => {
            const mealsForDay = adminMenuPlan[day] || [];
            
            const mealItems = mealsForDay.map((meal, index) => `
                <span class="badge bg-secondary me-2 mb-1">
                    ${meal.name} 
                    <button type="button" class="btn-close btn-close-white p-0 ps-1" 
                        aria-label="Remove" 
                        onclick="removeAdminMenuItem('${day}', ${index})"></button>
                </span>
            `).join('');

            return `
                <div class="mb-3">
                    <h5 class="mb-1">${day}</h5>
                    <div class="admin-menu-drop-zone" data-day="${day}">
                        ${mealsForDay.length > 0 ? mealItems : '<span class="text-muted small">Drop meals here...</span>'}
                    </div>
                </div>
            `;
        }).join('');
        
        attachAdminDropListeners();
    }

    window.removeAdminMenuItem = (day, index) => {
        if (adminMenuPlan[day]) {
            adminMenuPlan[day].splice(index, 1);
            if (adminMenuPlan[day].length === 0) {
                delete adminMenuPlan[day];
            }
            renderAdminMenu();
        }
    };

    adminMenuForm.addEventListener('submit', function(e) {
        e.preventDefault();
        localStorage.setItem('admin_menu', JSON.stringify(adminMenuPlan));
        
        const msgEl = document.getElementById('menu-save-msg');
        msgEl.classList.remove('d-none');
        setTimeout(() => msgEl.classList.add('d-none'), 3000);
    });

    // --- Order and Customer Plan Views ---

    function renderOrders() {
        const orders = getData('orders');
        if (orders.length === 0) {
            recentOrdersList.innerHTML = '<li class="list-group-item text-muted">No orders yet.</li>';
            return;
        }

        recentOrdersList.innerHTML = orders.slice(-5).reverse().map(order => `
            <li class="list-group-item">
                <strong>Order ID: ${order.id}</strong> (User: ${order.userId})<br>
                Total: $${order.total.toFixed(2)} - Status: <span class="badge bg-primary">New</span>
            </li>
        `).join('');
    }

    function renderCustomerPlans() {
        const allPlans = getData('user_plans');
        const users = getData('users');
        
        customerPlansList.innerHTML = '';

        for (const userId in allPlans) {
            const userPlans = allPlans[userId];
            if (userPlans.length === 0) continue;

            const user = users.find(u => u.id === userId) || { username: 'Unknown User' };

            const dayPlans = userPlans.reduce((acc, p) => {
                acc[p.day] = acc[p.day] || [];
                acc[p.day].push(p.name);
                return acc;
            }, {});

            let detailHtml = Object.keys(dayPlans).map(day => 
                `<span class="d-block small"><strong>${day}:</strong> ${dayPlans[day].join(', ')}</span>`
            ).join('');

            customerPlansList.innerHTML += `
                <li class="list-group-item list-group-item-info mb-2">
                    <h5 class="mb-1">Plan for: **${user.username}**</h5>
                    ${detailHtml}
                </li>
            `;
        }
        
        if (customerPlansList.innerHTML === '') {
             customerPlansList.innerHTML = '<li class="list-group-item text-muted">No weekly plans submitted yet.</li>';
        }
    }


    // Initial load for Admin Dashboard
    renderAdminMeals();
    renderAdminDraggableMeals();
    renderAdminMenu();
    renderOrders();
    renderCustomerPlans();
}


// --- Customer Dashboard Logic (customer-dashboard.html) ---

const availableMealsList = document.getElementById('available-meals-list');
const cartList = document.getElementById('cart-list');

if (availableMealsList) {
    checkAuth();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    document.getElementById('customer-name').textContent = currentUser.username;
    
    let mealPlan = JSON.parse(localStorage.getItem('user_plans'))[currentUser.id] || [];
    let cart = []; // Local cart state
    let draggedMealData = null;


    // --- Drag & Drop Handlers (Customer) ---

    window.handleDragStart = (e, mealId, mealName) => {
        draggedMealData = { mealId, mealName };
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', mealId); 
    };

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = '#d4edda';
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDragLeave(e) {
        e.currentTarget.style.backgroundColor = 'transparent';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = 'transparent';
        
        const day = e.currentTarget.dataset.day;

        if (draggedMealData && day) {
            const newMeal = {
                id: Date.now(),
                day: day,
                mealId: draggedMealData.mealId,
                name: draggedMealData.mealName,
                qty: 1
            };
            mealPlan.push(newMeal);
            saveMealPlan();
            renderMealPlan();
        }
    }

    function attachDropListeners() {
        document.querySelectorAll('.meal-drop-zone').forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    }

    // --- Meal Planning ---

    function renderAvailableMeals() {
        const meals = getData('recipes');
        availableMealsList.innerHTML = meals.map(meal => `
            <li class="list-group-item d-flex flex-column align-items-start" 
                draggable="true" 
                ondragstart="handleDragStart(event, ${meal.id}, '${meal.name}')">
                <span class="fw-bold">${meal.name}</span>
                <span class="badge bg-secondary">${meal.calories} Cal - $${meal.price.toFixed(2)}</span>
                <button class="btn btn-sm btn-success mt-2" onclick="addToCart(${meal.id})">Buy Bulk</button>
            </li>
        `).join('');
    }

    window.removeFromPlan = (planId) => {
        mealPlan = mealPlan.filter(item => item.id !== planId);
        saveMealPlan();
        renderMealPlan();
    };

    function saveMealPlan() {
        const plans = JSON.parse(localStorage.getItem('user_plans'));
        plans[currentUser.id] = mealPlan;
        localStorage.setItem('user_plans', JSON.stringify(plans));
    }

    function renderMealPlan() {
        const meals = getData('recipes');
        let totalCalories = 0;

        ALL_DAYS.forEach(day => {
            const zone = document.querySelector(`.meal-drop-zone[data-day="${day}"]`);
            if (!zone) return; 

            const mealsForDay = mealPlan.filter(p => p.day === day);
            
            if (mealsForDay.length === 0) {
                zone.innerHTML = `<li class="text-muted small">Drop meals here for ${day}</li>`;
                return;
            }

            zone.innerHTML = mealsForDay.map(plan => {
                const meal = meals.find(m => m.id === plan.mealId);
                if (meal) {
                    totalCalories += meal.calories;
                }
                return `
                    <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3">
                        <span class="small">${meal ? meal.name : 'Unknown Meal'}</span>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-info text-dark me-2">${meal ? meal.calories : '-'} Cal</span>
                            <button class="btn btn-sm btn-danger p-1" onclick="removeFromPlan(${plan.id})" title="Remove">
                                &times;
                            </button>
                        </div>
                    </li>
                `;
            }).join('');
        });

        document.getElementById('nutrition-summary').innerHTML = `
            <p class="h6 mb-0 text-center">
                Weekly Total Estimated Calories: <strong>${totalCalories}</strong>
            </p>
        `;
    }

    // --- Ordering / Cart ---

    window.addToCart = (mealId) => {
        const meal = getData('recipes').find(m => m.id === mealId);
        if (meal) {
            cart.push(meal);
            renderCart();
        }
    };

    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        renderCart();
    };

    function renderCart() {
        if (cart.length === 0) {
            cartList.innerHTML = '<li class="list-group-item text-muted">Cart is empty.</li>';
            document.getElementById('cart-total').textContent = '0.00';
            return;
        }

        let total = 0;
        cartList.innerHTML = cart.map((item, index) => {
            total += item.price;
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${item.name} ($${item.price.toFixed(2)})
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">X</button>
                </li>
            `;
        }).join('');

        document.getElementById('cart-total').textContent = total.toFixed(2);
    }

    window.placeOrder = () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const orders = getData('orders');
        const orderTotal = cart.reduce((sum, item) => sum + item.price, 0);
        const newOrder = {
            id: 'ORD-' + Date.now(),
            userId: currentUser.id,
            items: cart,
            total: orderTotal,
            date: new Date().toISOString()
        };

        orders.push(newOrder);
        localStorage.setItem('orders', JSON.stringify(orders));

        cart = [];
        renderCart();

        const msgEl = document.getElementById('order-success-msg');
        msgEl.classList.remove('d-none');
        setTimeout(() => msgEl.classList.add('d-none'), 3000);
    };

    // Initial load for Customer Dashboard
    renderAvailableMeals();
    renderMealPlan();
    renderCart();
    attachDropListeners();
}