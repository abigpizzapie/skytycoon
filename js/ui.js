import { AIRCRAFT_DATA, AIRCRAFT_CATEGORIES } from './aircraft.js';
import { AIRPORTS, getAirport, REGIONS } from './airports.js';
import {
    buyAircraft, leaseAircraft, sellAircraft,
    createRoute, closeRoute, adjustTicketPrice, assignAircraft,
    hireStaff, fireStaff, takeLoan, repayLoan,
    processMonth, saveGame, loadGame, deleteSave,
    formatMoney, haversineDistance
} from './engine.js';

let state = null;
let gameInterval = null;
let currentScreen = 'dashboard';

export function initUI(gameState) {
    state = gameState;
    setupNavigation();
    setupSpeedControls();
    setupBuyAircraft();
    setupAddRoute();
    setupHireStaff();
    setupModal();
    setupNewGame();
    renderAll();
}

function setupNavigation() {
    document.querySelectorAll('.nav-links li[data-screen]').forEach(li => {
        li.addEventListener('click', () => {
            const screen = li.dataset.screen;
            switchScreen(screen);
        });
    });
}

function setupNewGame() {
    document.getElementById('btn-new-game')?.addEventListener('click', async () => {
        if (!confirm('Start a new game? Your current progress will be lost unless you have a save.')) return;
        await deleteSave();
        location.reload();
    });
}

function switchScreen(screen) {
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.querySelector(`.nav-links li[data-screen="${screen}"]`)?.classList.add('active');
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screen}`)?.classList.add('active');
    
    currentScreen = screen;
    renderCurrentScreen();
}

function renderCurrentScreen() {
    switch (currentScreen) {
        case 'dashboard': renderDashboard(); break;
        case 'hangar': renderHangar(); break;
        case 'routes': renderRoutes(); break;
        case 'finances': renderFinances(); break;
        case 'staff': renderStaff(); break;
        case 'market': renderMarket(); break;
        case 'events': renderEvents(); break;
    }
}

function renderAll() {
    updateDate();
    updateHeaderStats();
    renderDashboard();
}

function updateDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    document.getElementById('game-date').textContent = `${months[state.month - 1]} ${state.year}`;
}

function updateHeaderStats() {
    document.getElementById('stat-cash').textContent = formatMoney(state.finances.cash);
    document.getElementById('stat-reputation').textContent = Math.round(state.airline.reputation);
    document.getElementById('stat-passengers').textContent = state.stats.totalPassengers.toLocaleString();
}

function setupSpeedControls() {
    document.getElementById('speed-pause').addEventListener('click', () => setSpeed(0));
    document.getElementById('speed-1x').addEventListener('click', () => setSpeed(1));
    document.getElementById('speed-2x').addEventListener('click', () => setSpeed(2));
    document.getElementById('speed-5x').addEventListener('click', () => setSpeed(5));
}

function setSpeed(speed) {
    state.speed = speed;
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    
    if (speed === 0) {
        document.getElementById('speed-pause').classList.add('active');
        clearInterval(gameInterval);
        gameInterval = null;
    } else {
        const interval = speed === 1 ? 2000 : speed === 2 ? 1000 : 400;
        document.getElementById(`speed-${speed}x`).classList.add('active');
        
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            processTick();
        }, interval);
    }
}

function processTick() {
    const result = processMonth(state);
    updateDate();
    updateHeaderStats();
    
    // Flash cash if profit
    if (result.profit > 0) {
        const cashEl = document.getElementById('stat-cash');
        cashEl.style.color = '#22c55e';
        setTimeout(() => { cashEl.style.color = ''; }, 500);
    } else if (result.profit < 0) {
        const cashEl = document.getElementById('stat-cash');
        cashEl.style.color = '#ef4444';
        setTimeout(() => { cashEl.style.color = ''; }, 500);
    }
    
    renderCurrentScreen();
    
    // Auto-save every 5 ticks
    if (state.stats.monthsPlayed % 5 === 0) {
        saveGame(state);
    }
}

function setupBuyAircraft() {
    document.getElementById('btn-buy-aircraft').addEventListener('click', () => {
        showAircraftMarketModal();
    });
}

function showAircraftMarketModal() {
    let html = '';
    
    for (const cat of AIRCRAFT_CATEGORIES) {
        const aircraft = AIRCRAFT_DATA.filter(a => a.category === cat);
        html += `<h4 style="margin: 16px 0 8px; color: var(--text-muted)">${cat}</h4>`;
        
        for (const ac of aircraft) {
            const canAfford = state.finances.cash >= ac.price;
            html += `
                <div class="market-card">
                    <div class="market-info">
                        <div class="aircraft-icon">${ac.icon}</div>
                        <div>
                            <div class="market-name">${ac.name}</div>
                            <div class="market-manufacturer">${ac.manufacturer}</div>
                        </div>
                    </div>
                    <div class="market-specs">
                        <div class="market-spec"><div class="label">Seats</div><div class="value">${ac.capacity}</div></div>
                        <div class="market-spec"><div class="label">Range</div><div class="value">${ac.range.toLocaleString()}km</div></div>
                        <div class="market-spec"><div class="label">Fuel Burn</div><div class="value">${ac.fuelBurn}t/h</div></div>
                    </div>
                    <div style="text-align: right">
                        <div class="market-price">${formatMoney(ac.price)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px">
                            Lease: ${formatMoney(ac.leasePrice)}/mo
                        </div>
                        <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: flex-end">
                            <button class="btn btn-sm btn-primary" onclick="window._buyAircraft('${ac.id}')" ${!canAfford ? 'disabled' : ''}>Buy</button>
                            <button class="btn btn-sm" onclick="window._leaseAircraft('${ac.id}')">Lease</button>
                        </div>
                    </div>
                </div>`;
        }
    }
    
    showModal('Buy Aircraft', html, '<button class="btn" onclick="window._closeModal()">Close</button>');
}

window._buyAircraft = (typeId) => {
    const result = buyAircraft(state, typeId);
    if (!result.success) {
        alert(result.message);
    } else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

window._leaseAircraft = (typeId) => {
    const result = leaseAircraft(state, typeId);
    if (!result.success) {
        alert(result.message);
    } else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

function setupAddRoute() {
    document.getElementById('btn-add-route').addEventListener('click', () => {
        showCreateRouteModal();
    });
}

function showCreateRouteModal() {
    const idleAircraft = state.aircraft.filter(a => a.status === 'idle');
    
    if (idleAircraft.length === 0) {
        showModal('Create Route', '<p class="empty-state">No idle aircraft available. Buy or lease an aircraft first.</p>', '<button class="btn" onclick="window._closeModal()">Close</button>');
        return;
    }
    
    let html = `
        <div class="form-group">
            <label>Origin Airport</label>
            <select id="route-origin">
                <option value="">Select origin...</option>
                ${AIRPORTS.map(a => `<option value="${a.code}" ${a.code === state.airline.hub ? 'selected' : ''}>${a.code} - ${a.city} (${a.country})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Destination Airport</label>
            <select id="route-dest">
                <option value="">Select destination...</option>
                ${AIRPORTS.map(a => `<option value="${a.code}">${a.code} - ${a.city} (${a.country})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Aircraft</label>
            <select id="route-aircraft">
                ${idleAircraft.map(a => {
                    const origin = document.getElementById('route-origin')?.value || state.airline.hub;
                    return `<option value="${a.id}">${a.name} (${a.capacity} seats, ${a.range}km range)</option>`;
                }).join('')}
            </select>
        </div>
        <div id="route-preview" style="margin-top: 12px; padding: 12px; background: var(--bg-dark); border-radius: 8px; font-size: 13px; display: none;"></div>
        <script>
            const originSel = document.getElementById('route-origin');
            const destSel = document.getElementById('route-dest');
            const aircraftSel = document.getElementById('route-aircraft');
            const preview = document.getElementById('route-preview');
            
            function updatePreview() {
                const origin = originSel.value;
                const dest = destSel.value;
                const acId = aircraftSel.value;
                
                if (!origin || !dest || !acId) { preview.style.display = 'none'; return; }
                
                const o = AIRPORTS.find(a => a.code === origin);
                const d = AIRPORTS.find(a => a.code === dest);
                const ac = ${JSON.stringify(idleAircraft.map(a => ({ id: a.id, range: a.range, capacity: a.capacity })))}.find(a => a.id === acId);
                
                if (!o || !d || !ac) { preview.style.display = 'none'; return; }
                
                const dist = Math.round(haversine(o.lat, o.lon, d.lat, d.lon));
                const canReach = dist <= ac.range;
                
                preview.style.display = 'block';
                preview.innerHTML = \`
                    <div><strong>Distance:</strong> \${dist}km</div>
                    <div><strong>Aircraft Range:</strong> \${ac.range}km</div>
                    <div><strong>Can Reach:</strong> <span style="color: \${canReach ? 'var(--green)' : 'var(--red)'}">\${canReach ? 'Yes' : 'No - Route too long'}</span></div>
                    <div><strong>Flight Time:</strong> ~\${Math.ceil(dist/800)+1} hours</div>
                \`;
            }
            
            originSel.addEventListener('change', updatePreview);
            destSel.addEventListener('change', updatePreview);
            aircraftSel.addEventListener('change', updatePreview);
        </script>
    `;
    
    showModal('Create Route', html, `
        <button class="btn" onclick="window._closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="window._createRoute()">Create Route</button>
    `);
    
    // Setup preview after modal renders
    setTimeout(() => {
        const originSel = document.getElementById('route-origin');
        const destSel = document.getElementById('route-dest');
        const aircraftSel = document.getElementById('route-aircraft');
        if (originSel) originSel.addEventListener('change', updateRoutePreview);
        if (destSel) destSel.addEventListener('change', updateRoutePreview);
        if (aircraftSel) aircraftSel.addEventListener('change', updateRoutePreview);
    }, 50);
}

function updateRoutePreview() {
    // This will be handled inline
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

window._createRoute = () => {
    const origin = document.getElementById('route-origin').value;
    const dest = document.getElementById('route-dest').value;
    const aircraftId = document.getElementById('route-aircraft').value;
    
    if (!origin || !dest || !aircraftId) {
        alert('Please fill all fields');
        return;
    }
    
    const result = createRoute(state, origin, dest, aircraftId);
    if (!result.success) {
        alert(result.message);
    } else {
        _closeModal();
        renderCurrentScreen();
        updateHeaderStats();
    }
};

window.haversine = haversine;
window.AIRPORTS = AIRPORTS;

function setupHireStaff() {
    document.getElementById('btn-hire-staff').addEventListener('click', () => {
        showHireStaffModal();
    });
}

function showHireStaffModal() {
    const roles = ['Pilot', 'Co-Pilot', 'Flight Engineer', 'Flight Attendant', 'Ground Crew', 'Maintenance Tech', 'Dispatcher', 'Customer Service'];
    const salaries = [12000, 9000, 8000, 4500, 3500, 5500, 6500, 3200];
    
    let html = '<div style="display: grid; gap: 8px;">';
    roles.forEach((role, i) => {
        html += `
            <div class="market-card">
                <div class="market-info">
                    <div class="aircraft-icon" style="font-size: 20px">👤</div>
                    <div>
                        <div class="market-name">${role}</div>
                        <div class="market-manufacturer">Salary: ${formatMoney(salaries[i])}/mo</div>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window._hireStaff('${role}')">Hire</button>
            </div>`;
    });
    html += '</div>';
    
    showModal('Hire Staff', html, '<button class="btn" onclick="window._closeModal()">Close</button>');
}

window._hireStaff = (role) => {
    const result = hireStaff(state, role);
    if (!result.success) {
        alert(result.message);
    } else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

function setupModal() {
    document.getElementById('modal-close').addEventListener('click', _closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) _closeModal();
    });
}

window._closeModal = _closeModal;

function _closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function showModal(title, body, footer) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer || '';
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// ========== DASHBOARD ==========
function renderDashboard() {
    document.getElementById('dash-aircraft').textContent = state.aircraft.length;
    document.getElementById('dash-routes').textContent = state.routes.length;
    document.getElementById('dash-staff').textContent = state.staff.length;
    document.getElementById('dash-hub').textContent = state.airline.hub;
    
    // Calculate monthly P&L
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    for (const route of state.routes) {
        totalRevenue += route.monthlyRevenue || 0;
    }
    
    totalExpenses = state.staff.reduce((s, st) => s + st.salary, 0);
    for (const aircraft of state.aircraft) {
        const template = AIRCRAFT_DATA.find(a => a.id === aircraft.typeId);
        if (template) totalExpenses += template.maintenanceCost;
        if (aircraft.leased && aircraft.leasePrice) totalExpenses += aircraft.leasePrice;
    }
    
    document.getElementById('pl-revenue').textContent = formatMoney(totalRevenue);
    document.getElementById('pl-revenue').style.color = 'var(--green)';
    document.getElementById('pl-expenses').textContent = formatMoney(totalExpenses);
    document.getElementById('pl-expenses').style.color = 'var(--red)';
    
    const net = totalRevenue - totalExpenses;
    document.getElementById('pl-net').textContent = formatMoney(net);
    document.getElementById('pl-net').style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
    
    // Active routes summary
    const routesContainer = document.getElementById('dash-routes-container');
    if (state.routes.length === 0) {
        routesContainer.innerHTML = '<div class="empty-state"><p>No active routes yet</p></div>';
    } else {
        routesContainer.innerHTML = state.routes.slice(0, 5).map(route => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                <span style="font-family: monospace; font-weight: 600">${route.origin}-${route.destination}</span>
                <span style="color: var(--text-dim)">${route.monthlyPassengers} pax</span>
                <span style="color: ${route.monthlyRevenue > 0 ? 'var(--green)' : 'var(--text-dim)'}">${formatMoney(route.monthlyRevenue)}</span>
            </div>
        `).join('');
    }
    
    // News feed
    const newsFeed = document.getElementById('news-feed');
    if (state.news.length === 0) {
        newsFeed.innerHTML = '<div class="empty-state"><p>No news yet</p></div>';
    } else {
        newsFeed.innerHTML = state.news.slice(0, 8).map(n => `
            <div class="news-item">
                <div class="news-time">${n.date}</div>
                <div class="news-text news-${n.sentiment}">${n.text}</div>
            </div>
        `).join('');
    }
}

// ========== HANGAR ==========
function renderHangar() {
    const container = document.getElementById('hangar-list');
    
    if (state.aircraft.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">✈</div>
                <p>Your hangar is empty. Purchase your first aircraft to start flying!</p>
                <button class="btn btn-primary" onclick="window._showBuyModal()">Buy Aircraft</button>
            </div>`;
        return;
    }
    
    container.innerHTML = state.aircraft.map(ac => {
        const template = AIRCRAFT_DATA.find(a => a.id === ac.typeId);
        const statusClass = ac.status === 'active' ? 'status-active' : ac.status === 'maintenance' ? 'status-maintenance' : 'status-idle';
        const statusText = ac.status.charAt(0).toUpperCase() + ac.status.slice(1);
        const route = state.routes.find(r => r.id === ac.assignedRoute);
        
        return `
            <div class="aircraft-card">
                <div class="aircraft-info">
                    <div class="aircraft-icon">${ac.icon}</div>
                    <div>
                        <div class="aircraft-name">${ac.name}</div>
                        <div class="aircraft-type">${ac.manufacturer} ${ac.category} ${ac.leased ? '(Leased)' : ''}</div>
                    </div>
                </div>
                <div class="aircraft-specs">
                    <div class="aircraft-spec"><div class="label">Seats</div><div class="value">${ac.capacity}</div></div>
                    <div class="aircraft-spec"><div class="label">Range</div><div class="value">${ac.range.toLocaleString()}km</div></div>
                    <div class="aircraft-spec"><div class="label">Condition</div><div class="value" style="color: ${ac.condition > 80 ? 'var(--green)' : ac.condition > 50 ? 'var(--yellow)' : 'var(--red)'}">${ac.condition}%</div></div>
                    <div class="aircraft-spec"><div class="label">Flights</div><div class="value">${ac.totalFlights}</div></div>
                    ${route ? `<div class="aircraft-spec"><div class="label">Route</div><div class="value" style="font-family: monospace">${route.origin}-${route.destination}</div></div>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="aircraft-status ${statusClass}">${statusText}</span>
                    ${!ac.leased ? `<button class="btn btn-sm btn-danger" onclick="window._sellAircraft('${ac.id}')">Sell</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

window._showBuyModal = showAircraftMarketModal;

window._sellAircraft = (acId) => {
    if (!confirm('Sell this aircraft?')) return;
    const result = sellAircraft(state, acId);
    if (!result.success) {
        alert(result.message);
    } else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

// ========== ROUTES ==========
function renderRoutes() {
    const container = document.getElementById('routes-list');
    
    if (state.routes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛫</div>
                <p>No routes created yet. Open a route to start generating revenue!</p>
                <button class="btn btn-primary" onclick="document.getElementById('btn-add-route').click()">Create Route</button>
            </div>`;
        return;
    }
    
    container.innerHTML = state.routes.map(route => {
        const origin = getAirport(route.origin);
        const dest = getAirport(route.destination);
        const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
        
        return `
            <div class="route-card">
                <div class="route-info">
                    <div class="route-codes">
                        <span>${route.origin}</span>
                        <span class="route-arrow">✈ →</span>
                        <span>${route.destination}</span>
                    </div>
                    <div class="route-details">
                        <span>${origin?.city || ''} → ${dest?.city || ''}</span>
                        <span>${route.distance.toLocaleString()}km</span>
                        ${aircraft ? `<span>${aircraft.name}</span>` : ''}
                    </div>
                </div>
                <div class="route-metrics">
                    <div class="metric"><div class="label">Ticket Price</div><div class="value">$${route.ticketPrice}</div></div>
                    <div class="metric"><div class="label">Load Factor</div><div class="value" style="color: ${route.loadFactor > 70 ? 'var(--green)' : route.loadFactor > 40 ? 'var(--yellow)' : 'var(--red)'}">${route.loadFactor}%</div></div>
                    <div class="metric"><div class="label">Monthly Passengers</div><div class="value">${route.monthlyPassengers.toLocaleString()}</div></div>
                    <div class="metric"><div class="label">Monthly Revenue</div><div class="value" style="color: var(--green)">${formatMoney(route.monthlyRevenue)}</div></div>
                </div>
                <div class="route-actions">
                    <button class="btn btn-sm" onclick="window._adjustPrice('${route.id}')">Price</button>
                    <button class="btn btn-sm btn-danger" onclick="window._closeRoute('${route.id}')">Close</button>
                </div>
            </div>`;
    }).join('');
}

window._adjustPrice = (routeId) => {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return;
    
    const newPrice = prompt(`Set ticket price for ${route.origin}-${route.destination}\nCurrent: $${route.ticketPrice}`, route.ticketPrice);
    if (newPrice === null) return;
    
    const result = adjustTicketPrice(state, routeId, parseInt(newPrice));
    if (result.success) renderCurrentScreen();
};

window._closeRoute = (routeId) => {
    if (!confirm('Close this route?')) return;
    const result = closeRoute(state, routeId);
    if (result.success) {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

// ========== FINANCES ==========
function renderFinances() {
    // Balance sheet
    const bs = document.getElementById('balance-sheet');
    bs.innerHTML = `
        <div class="balance-row"><span>Cash</span><span style="color: var(--green)">${formatMoney(state.finances.cash)}</span></div>
        <div class="balance-row"><span>Assets (Aircraft)</span><span>${formatMoney(state.finances.assets)}</span></div>
        <div class="balance-row"><span>Debt</span><span style="color: var(--red)">${formatMoney(state.finances.debt)}</span></div>
        <div class="balance-row highlight"><span>Net Worth</span><span style="color: var(--accent)">${formatMoney(state.finances.equity)}</span></div>
    `;
    
    // Transactions
    const txList = document.getElementById('transaction-list');
    if (state.transactions.length === 0) {
        txList.innerHTML = '<div class="empty-state"><p>No transactions yet</p></div>';
    } else {
        txList.innerHTML = state.transactions.slice(0, 50).map(tx => `
            <div class="transaction-item">
                <span class="transaction-desc">${tx.description}</span>
                <span class="transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">${tx.amount >= 0 ? '+' : ''}${formatMoney(tx.amount)}</span>
            </div>
        `).join('');
    }
    
    // Loans
    const loans = document.getElementById('loans-panel');
    if (state.finances.debt > 0) {
        loans.innerHTML = `
            <div class="loan-item">
                <div class="loan-row"><span>Outstanding Debt</span><span style="color: var(--red)">${formatMoney(state.finances.debt)}</span></div>
                <div class="loan-row"><span>Interest Rate</span><span>~5.0% APR</span></div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-primary" onclick="window._repayLoan()">Repay</button>
                </div>
            </div>
        `;
    } else {
        loans.innerHTML = `
            <div class="loan-item">
                <div class="loan-row"><span>No outstanding debt</span></div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-success" onclick="window._takeLoan()">Take Loan</button>
                </div>
            </div>
        `;
    }
}

window._takeLoan = () => {
    const amount = prompt('Enter loan amount (max $2B):', '100000000');
    if (amount === null) return;
    
    const result = takeLoan(state, parseInt(amount));
    if (!result.success) alert(result.message);
    else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

window._repayLoan = () => {
    const amount = prompt(`Repay loan (debt: ${formatMoney(state.finances.debt)}, cash: ${formatMoney(state.finances.cash)}):`, Math.min(state.finances.debt, state.finances.cash));
    if (amount === null) return;
    
    const result = repayLoan(state, parseInt(amount));
    if (!result.success) alert(result.message);
    else {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

// ========== STAFF ==========
function renderStaff() {
    const container = document.getElementById('staff-list');
    
    if (state.staff.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">👥</div>
                <p>No staff hired yet. Hire crew and ground staff to operate your airline!</p>
                <button class="btn btn-primary" onclick="document.getElementById('btn-hire-staff').click()">Hire Staff</button>
            </div>`;
        return;
    }
    
    container.innerHTML = state.staff.map(staff => `
        <div class="staff-card">
            <div class="staff-info">
                <div class="staff-avatar">${staff.name.charAt(0)}</div>
                <div>
                    <div class="staff-name">${staff.name}</div>
                    <div class="staff-role">${staff.role} • Hired ${staff.hired}</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="text-align: right">
                    <div style="font-size: 12px; color: var(--text-muted)">Morale</div>
                    <div class="progress-bar" style="width: 80px">
                        <div class="fill ${staff.morale > 70 ? 'green' : staff.morale > 40 ? 'yellow' : 'red'}" style="width: ${staff.morale}%"></div>
                    </div>
                </div>
                <span class="staff-salary">${formatMoney(staff.salary)}/mo</span>
                <button class="btn btn-sm btn-danger" onclick="window._fireStaff('${staff.id}')">Fire</button>
            </div>
        </div>
    `).join('');
}

window._fireStaff = (staffId) => {
    if (!confirm('Fire this staff member?')) return;
    const result = fireStaff(state, staffId);
    if (result.success) {
        renderCurrentScreen();
        updateHeaderStats();
    }
};

// ========== MARKET ==========
function renderMarket() {
    const container = document.getElementById('market-list');
    
    let html = '';
    for (const cat of AIRCRAFT_CATEGORIES) {
        html += `<h3 style="margin: 20px 0 10px; color: var(--text-muted)">${cat}</h3>`;
        
        const aircraft = AIRCRAFT_DATA.filter(a => a.category === cat);
        for (const ac of aircraft) {
            const canAfford = state.finances.cash >= ac.price;
            const canLease = state.finances.cash >= ac.leasePrice * 3;
            
            html += `
                <div class="market-card">
                    <div class="market-info">
                        <div class="aircraft-icon">${ac.icon}</div>
                        <div>
                            <div class="market-name">${ac.name}</div>
                            <div class="market-manufacturer">${ac.manufacturer}</div>
                        </div>
                    </div>
                    <div class="market-specs">
                        <div class="market-spec"><div class="label">Seats</div><div class="value">${ac.capacity}</div></div>
                        <div class="market-spec"><div class="label">Range</div><div class="value">${ac.range.toLocaleString()}km</div></div>
                        <div class="market-spec"><div class="label">Speed</div><div class="value">${ac.speed}km/h</div></div>
                        <div class="market-spec"><div class="label">Fuel Burn</div><div class="value">${ac.fuelBurn}t/h</div></div>
                        <div class="market-spec"><div class="label">Crew</div><div class="value">${ac.crewRequired}</div></div>
                    </div>
                    <div style="text-align: right; min-width: 150px">
                        <div class="market-price">${formatMoney(ac.price)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin: 2px 0">Lease: ${formatMoney(ac.leasePrice)}/mo</div>
                        <div style="font-size: 11px; color: var(--text-muted)">Maint: ${formatMoney(ac.maintenanceCost)}/mo</div>
                        <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: flex-end">
                            <button class="btn btn-sm btn-primary" onclick="window._buyAircraft('${ac.id}')" ${!canAfford ? 'disabled' : ''}>Buy</button>
                            <button class="btn btn-sm" onclick="window._leaseAircraft('${ac.id}')" ${!canLease ? 'disabled' : ''}>Lease</button>
                        </div>
                    </div>
                </div>`;
        }
    }
    
    container.innerHTML = html;
}

// ========== EVENTS ==========
function renderEvents() {
    const container = document.getElementById('events-list');
    
    if (state.events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📢</div>
                <p>No events yet. Events will occur as your airline grows.</p>
            </div>`;
        return;
    }
    
    container.innerHTML = state.events.map(event => `
        <div class="event-item">
            <div class="event-header">
                <span class="event-type ${event.type}">${event.type}</span>
                <span class="event-date">${event.date}</span>
            </div>
            <div class="event-text">${event.text}</div>
        </div>
    `).join('');
}
