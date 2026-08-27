import { AIRCRAFT_DATA, AIRCRAFT_CATEGORIES, STAFF_REQUIREMENTS, MAX_FLIGHT_HOURS } from './aircraft.js';
import { AIRPORTS, getAirport, REGIONS } from './airports.js';
import {
    buyAircraft, leaseAircraft, sellAircraft,
    createRoute, closeRoute, adjustTicketPrice, adjustFlightsPerDay, assignAircraft,
    hireStaff, fireStaff, takeLoan, repayLoan,
    assignStaffToAircraft, unassignStaffFromAircraft, getAvailableStaff,
    checkStaffRequirements, getAircraftStaff,
    getAircraftCapacityInfo,
    processDay, saveGame, loadGame, deleteSave,
    formatMoney, haversineDistance,
    calculateRequiredCSStaff, CS_PASSENGER_RATIO
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
    document.getElementById('game-date').textContent = `${state.day} ${months[state.month - 1]} ${state.year}`;
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
    const result = processDay(state);
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
    
    // Auto-save every 5 days
    if (state.stats.daysPlayed % 5 === 0) {
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
        saveGame(state);
        renderCurrentScreen();
        updateHeaderStats();
    }
};

window._leaseAircraft = (typeId) => {
    const result = leaseAircraft(state, typeId);
    if (!result.success) {
        alert(result.message);
    } else {
        saveGame(state);
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
    const idleAircraft = state.aircraft.filter(a => a.status === 'idle' || (a.assignedRoutes && a.assignedRoutes.length > 0));
    
    if (idleAircraft.length === 0) {
        showModal('Create Route', '<p class="empty-state">No aircraft available. Buy or lease an aircraft first.</p>', '<button class="btn" onclick="window._closeModal()">Close</button>');
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
                    const capInfo = getAircraftCapacityInfo(state, a.id);
                    return `<option value="${a.id}">${a.name} (${a.capacity} seats, ${capInfo.remainingHours}h available)</option>`;
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
                const ac = ${JSON.stringify(idleAircraft.map(a => ({ id: a.id, range: a.range, capacity: a.capacity, typeId: a.typeId })))}.find(a => a.id === acId);
                
                if (!o || !d || !ac) { preview.style.display = 'none'; return; }
                
                const dist = Math.round(haversine(o.lat, o.lon, d.lat, d.lon));
                const canReach = dist <= ac.range;
                const roundTripTime = (2 * dist / 840).toFixed(1);
                const maxHours = ${JSON.stringify(MAX_FLIGHT_HOURS)};
                const maxH = maxHours[ac.typeId] || 12;
                const flightsPerDay = Math.floor(maxH / roundTripTime);
                
                preview.style.display = 'block';
                preview.innerHTML = \`
                    <div><strong>Distance:</strong> \${dist}km</div>
                    <div><strong>Aircraft Range:</strong> \${ac.range}km</div>
                    <div><strong>Can Reach:</strong> <span style="color: \${canReach ? 'var(--green)' : 'var(--red)'}">\${canReach ? 'Yes' : 'No - Route too long'}</span></div>
                    <div><strong>Round Trip Time:</strong> \${roundTripTime}h</div>
                    <div><strong>Max Flight Hours:</strong> \${maxH}h/day</div>
                    <div><strong>Flights per Day:</strong> \${flightsPerDay}</div>
                    \${flightsPerDay < 1 ? '<div style="color: var(--red); margin-top: 4px"><strong>Warning:</strong> Route too long for available hours</div>' : ''}
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

function showAircraftStaffModal(aircraftId) {
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return;
    
    const requirements = STAFF_REQUIREMENTS[aircraft.typeId] || {};
    const staffCheck = checkStaffRequirements(state, aircraftId);
    
    let html = `
        <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-dark); border-radius: 8px;">
            <div style="font-weight: 600; margin-bottom: 8px">${aircraft.name}</div>
            <div style="font-size: 13px; color: var(--text-muted)">
                ${aircraft.category} • ${(aircraft.assignedRoutes || []).length} route(s)
            </div>
        </div>
        <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px">Staff Requirements</div>`;
    
    for (const [role, count] of Object.entries(requirements)) {
        const assigned = state.staff.filter(s => s.assignedAircraft === aircraftId && s.role === role).length;
        const available = getAvailableStaff(state, role).length;
        const color = assigned >= count ? 'var(--green)' : 'var(--red)';
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                <span>${role}</span>
                <span style="color: ${color}">${assigned}/${count} assigned</span>
                <span style="color: var(--text-muted)">${available} available</span>
            </div>`;
    }
    
    html += `</div>`;
    
    const totalStaff = state.staff.length;
    const unassignedStaff = state.staff.filter(s => !s.assignedAircraft).length;
    
    if (totalStaff === 0) {
        html += `<div style="padding: 16px; text-align: center; color: var(--text-muted);">
            <p>No staff hired yet. Go to the <strong>Staff</strong> tab to hire crew first.</p>
        </div>`;
    } else if (unassignedStaff === 0 && !staffCheck.met) {
        html += `<div style="padding: 16px; text-align: center; color: var(--text-muted);">
            <p>All staff are assigned to other aircraft. Hire more staff or unassign from other aircraft.</p>
        </div>`;
    } else {
        html += `<div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px">Select Staff to Assign</div>`;
        
        for (const [role, count] of Object.entries(requirements)) {
            const available = getAvailableStaff(state, role);
            const alreadyAssigned = state.staff.filter(s => s.assignedAircraft === aircraftId && s.role === role).length;
            const stillNeeded = count - alreadyAssigned;
            
            if (available.length === 0) {
                html += `<div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; color: var(--red); margin-bottom: 4px">${role} — no unassigned ${role}s available (need ${stillNeeded} more)</div>
                </div>`;
                continue;
            }
            
            html += `<div style="margin-bottom: 8px;">
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px">${role} (need ${stillNeeded} more)</div>`;
            
            for (const staff of available) {
                html += `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" class="staff-checkbox" value="${staff.id}" data-role="${staff.role}">
                        ${staff.name} - ${formatMoney(staff.salary)}/mo
                    </label>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }
    
    showModal('Assign Staff to Aircraft', html, `
        <button class="btn" onclick="window._closeModal()">Close</button>
        ${unassignedStaff > 0 ? `<button class="btn btn-primary" onclick="window._assignStaffToAircraft('${aircraftId}')">Assign Staff</button>` : ''}
    `);
}

window._assignStaffToAircraft = (aircraftId) => {
    const checkboxes = document.querySelectorAll('.staff-checkbox:checked');
    const staffIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (staffIds.length === 0) {
        alert('Please select at least one staff member');
        return;
    }
    
    const result = assignStaffToAircraft(state, aircraftId, staffIds);
    if (!result.success) {
        alert(result.message);
    } else {
        saveGame(state);
        _closeModal();
        renderCurrentScreen();
        updateHeaderStats();
    }
};

window._showAircraftStaff = (aircraftId) => {
    showAircraftStaffModal(aircraftId);
};

window._unassignAircraftStaff = (aircraftId) => {
    if (!confirm('Release all staff from this aircraft?')) return;
    const result = unassignStaffFromAircraft(state, aircraftId);
    if (result.success) {
        saveGame(state);
        renderCurrentScreen();
        updateHeaderStats();
    }
};

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
        saveGame(state);
        _closeModal();
        showStaffAssignmentModal(result.route.id);
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
    
    const csStaffCount = state.staff.filter(s => s.role === 'Customer Service').length;
    const monthlyPassengers = state.routes.reduce((sum, r) => sum + (r.monthlyPassengers || 0), 0);
    const requiredCS = calculateRequiredCSStaff(monthlyPassengers);
    
    let html = '';
    
    if (monthlyPassengers > 0) {
        const csColor = csStaffCount === 0 ? 'var(--red)' : csStaffCount < requiredCS ? 'var(--yellow)' : 'var(--green)';
        const csStatus = csStaffCount === 0 
            ? '<span style="color: var(--red)">No CS staff hired - Revenue blocked!</span>'
            : csStaffCount < requiredCS
            ? `<span style="color: var(--yellow)">Understaffed: ${csStaffCount}/${requiredCS} needed</span>`
            : `<span style="color: var(--green)">Adequate: ${csStaffCount}/${requiredCS}</span>`;
        html += `<div style="padding: 12px; background: var(--bg-dark); border-radius: 8px; margin-bottom: 16px; border-left: 3px solid ${csColor};">
            <div style="font-weight: 600; margin-bottom: 4px;">Customer Service Requirement</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px">
                Required: 1 CS staff per ${CS_PASSENGER_RATIO.toLocaleString()} monthly passengers
            </div>
            <div style="font-size: 13px">Current: ${csStatus}</div>
            ${csStaffCount === 0 ? '<div style="font-size: 12px; color: var(--red); margin-top: 4px">Hire at least 1 CS staff to generate revenue!</div>' : ''}
        </div>`;
    }
    
    html += '<div style="display: grid; gap: 8px;">';
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
        saveGame(state);
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
    
    const csStaffCount = state.staff.filter(s => s.role === 'Customer Service').length;
    const monthlyPassengers = state.routes.reduce((sum, r) => sum + (r.monthlyPassengers || 0), 0);
    const requiredCS = calculateRequiredCSStaff(monthlyPassengers);
    const csEl = document.getElementById('dash-cs-staff');
    if (csEl) {
        if (csStaffCount === 0 && monthlyPassengers > 0) {
            csEl.textContent = `0/${requiredCS} (NO REVENUE)`;
            csEl.style.color = 'var(--red)';
        } else if (csStaffCount < requiredCS) {
            csEl.textContent = `${csStaffCount}/${requiredCS}`;
            csEl.style.color = 'var(--yellow)';
        } else {
            csEl.textContent = `${csStaffCount}/${requiredCS}`;
            csEl.style.color = 'var(--green)';
        }
    }
    
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
        routesContainer.innerHTML = state.routes.slice(0, 5).map(route => {
            const profit = route.monthlyProfit || 0;
            const profitColor = profit > 0 ? 'var(--green)' : profit < 0 ? 'var(--red)' : 'var(--text-dim)';
            const loadColor = route.loadFactor > 70 ? 'var(--green)' : route.loadFactor > 40 ? 'var(--yellow)' : 'var(--red)';
            return `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                <span style="font-family: monospace; font-weight: 600">${route.origin}-${route.destination}</span>
                <span style="color: ${loadColor}">${route.loadFactor}% load</span>
                <span style="color: var(--text-dim)">${route.monthlyPassengers} pax</span>
                <span style="color: ${profitColor}">${formatMoney(profit)}/mo</span>
            </div>`;
        }).join('');
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
        const statusClass = ac.assignedRoutes && ac.assignedRoutes.length > 0 ? 'status-active' : ac.status === 'maintenance' ? 'status-maintenance' : 'status-idle';
        const statusText = ac.assignedRoutes && ac.assignedRoutes.length > 0 ? 'Active' : ac.status.charAt(0).toUpperCase() + ac.status.slice(1);
        
        const capInfo = getAircraftCapacityInfo(state, ac.id);
        const hoursPercent = capInfo ? Math.round((capInfo.usedHours / capInfo.maxHours) * 100) : 0;
        const hoursColor = hoursPercent > 90 ? 'var(--red)' : hoursPercent > 70 ? 'var(--yellow)' : 'var(--green)';
        
        const assignedRoutes = (ac.assignedRoutes || []).map(rId => state.routes.find(r => r.id === rId)).filter(Boolean);
        
        let routesHtml = '';
        if (assignedRoutes.length > 0) {
            routesHtml = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px">ASSIGNED ROUTES</div>`;
            for (const route of assignedRoutes) {
                routesHtml += `
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0;">
                        <span style="font-family: monospace; font-weight: 600">${route.origin}-${route.destination}</span>
                        <span style="color: var(--text-dim)">${route.flightsPerDay} flights/day</span>
                    </div>`;
            }
            routesHtml += `</div>`;
        }
        
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
                    ${capInfo ? `<div class="aircraft-spec"><div class="label">Hours</div><div class="value">${capInfo.usedHours}/${capInfo.maxHours}h</div></div>` : ''}
                </div>
                <div style="width: 100%; margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">
                        <span>Daily Hours</span>
                        <span>${capInfo ? capInfo.usedHours : 0}/${capInfo ? capInfo.maxHours : 0}h</span>
                    </div>
                    <div class="progress-bar" style="width: 100%">
                        <div class="fill" style="width: ${hoursPercent}%; background: ${hoursColor}"></div>
                    </div>
                </div>
                ${routesHtml}
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                    <span class="aircraft-status ${statusClass}">${statusText}</span>
                    <button class="btn btn-sm" onclick="window._showAircraftStaff('${ac.id}')">Staff</button>
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
        saveGame(state);
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
        
        const staffCheck = aircraft ? checkStaffRequirements(state, aircraft.id) : { met: false, assigned: 0, required: 0 };
        const staffStatus = staffCheck.met 
            ? '<span style="color: var(--green)">Staffed</span>' 
            : `<span style="color: var(--red)">Understaffed (${staffCheck.assigned}/${staffCheck.required})</span>`;
        
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
                        <span>${route.roundTripTime}h round trip</span>
                        <span>${route.flightsPerDay} flights/day</span>
                    </div>
                </div>
                <div class="route-metrics">
                    <div class="metric"><div class="label">Ticket Price</div><div class="value">$${route.ticketPrice}</div></div>
                    <div class="metric"><div class="label">Load Factor</div><div class="value" style="color: ${route.loadFactor > 70 ? 'var(--green)' : route.loadFactor > 40 ? 'var(--yellow)' : 'var(--red)'}">${route.loadFactor}%</div></div>
                    <div class="metric"><div class="label">Monthly Passengers</div><div class="value">${route.monthlyPassengers.toLocaleString()}</div></div>
                    <div class="metric"><div class="label">Monthly Revenue</div><div class="value" style="color: var(--green)">${formatMoney(route.monthlyRevenue)}</div></div>
                    <div class="metric"><div class="label">Aircraft Staff</div><div class="value">${staffStatus}</div></div>
                    <div class="metric"><div class="label">Flights/Day</div><div class="value">${route.flightsPerDay}/${route.maxFlightsPerDay || '?'}</div></div>
                </div>
                <div class="route-actions">
                    <button class="btn btn-sm" onclick="window._adjustPrice('${route.id}')">Price</button>
                    <button class="btn btn-sm" onclick="window._adjustFlights('${route.id}')">Flights</button>
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
    if (result.success) { saveGame(state); renderCurrentScreen(); }
};

window._adjustFlights = (routeId) => {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return;
    
    const max = route.maxFlightsPerDay || '?';
    const newFlights = prompt(`Set flights per day for ${route.origin}-${route.destination}\nCurrent: ${route.flightsPerDay} (max: ${max})`, route.flightsPerDay);
    if (newFlights === null) return;
    
    const result = adjustFlightsPerDay(state, routeId, parseInt(newFlights));
    if (!result.success) {
        alert(result.message);
    } else {
        saveGame(state);
        renderCurrentScreen();
    }
};

window._closeRoute = (routeId) => {
    if (!confirm('Close this route?')) return;
    const result = closeRoute(state, routeId);
    if (result.success) {
        saveGame(state);
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
        saveGame(state);
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
        saveGame(state);
        renderCurrentScreen();
        updateHeaderStats();
    }
};

// ========== STAFF ==========
function renderStaffCard(staff) {
    const ac = staff.assignedAircraft ? state.aircraft.find(a => a.id === staff.assignedAircraft) : null;
    return `
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
                <button class="btn btn-sm btn-danger" onclick="window._fireStaff('${staff.id}')" ${staff.assignedAircraft ? 'disabled title="Unassign from aircraft first"' : ''}>Fire</button>
            </div>
        </div>`;
}

function renderStaff() {
    const container = document.getElementById('staff-list');
    
    const csStaffCount = state.staff.filter(s => s.role === 'Customer Service').length;
    const monthlyPassengers = state.routes.reduce((sum, r) => sum + (r.monthlyPassengers || 0), 0);
    const requiredCS = calculateRequiredCSStaff(monthlyPassengers);
    
    let csBanner = '';
    if (monthlyPassengers > 0) {
        const csColor = csStaffCount === 0 ? 'var(--red)' : csStaffCount < requiredCS ? 'var(--yellow)' : 'var(--green)';
        const csStatus = csStaffCount === 0
            ? 'No CS staff - Revenue blocked!'
            : csStaffCount < requiredCS
            ? `Understaffed: ${csStaffCount}/${requiredCS} CS staff needed for ${monthlyPassengers.toLocaleString()} monthly passengers`
            : `Adequate: ${csStaffCount}/${requiredCS} CS staff for ${monthlyPassengers.toLocaleString()} monthly passengers`;
        csBanner = `<div style="padding: 12px; background: var(--bg-dark); border-radius: 8px; margin-bottom: 16px; border-left: 3px solid ${csColor};">
            <div style="font-size: 13px; font-weight: 600;">Customer Service Status: <span style="color: ${csColor}">${csStatus}</span></div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">1 CS staff required per ${CS_PASSENGER_RATIO.toLocaleString()} monthly passengers</div>
        </div>`;
    }
    
    if (state.staff.length === 0) {
        container.innerHTML = csBanner + `
            <div class="empty-state">
                <div class="icon">👥</div>
                <p>No staff hired yet. Hire crew and ground staff to operate your airline!</p>
                ${monthlyPassengers > 0 && csStaffCount === 0 ? '<p style="color: var(--red); font-weight: 600">Hire at least 1 Customer Service staff to generate revenue!</p>' : ''}
                <button class="btn btn-primary" onclick="document.getElementById('btn-hire-staff').click()">Hire Staff</button>
            </div>`;
        return;
    }

    const grouped = {};
    const unassigned = [];
    for (const staff of state.staff) {
        if (staff.assignedAircraft) {
            if (!grouped[staff.assignedAircraft]) grouped[staff.assignedAircraft] = [];
            grouped[staff.assignedAircraft].push(staff);
        } else {
            unassigned.push(staff);
        }
    }

    let html = csBanner;

    const assignedAircraftIds = Object.keys(grouped);
    if (assignedAircraftIds.length > 0) {
        html += '<div style="margin-bottom: 16px">';
        for (const acId of assignedAircraftIds) {
            const ac = state.aircraft.find(a => a.id === acId);
            const staffList = grouped[acId];
            const acName = ac ? ac.name : 'Unknown Aircraft';
            const acType = ac ? ac.category : '';
            const routeCount = ac ? (ac.assignedRoutes || []).length : 0;
            const collapseId = `staff-group-${acId}`;
            const salaryTotal = staffList.reduce((s, st) => s + st.salary, 0);

            html += `
                <div class="staff-group" style="margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                    <div style="padding: 10px 14px; background: var(--bg-dark); cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;" onclick="document.getElementById('${collapseId}').classList.toggle('hidden'); this.querySelector('.chevron').textContent = this.querySelector('.chevron').textContent === '▸' ? '▾' : '▸'">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="chevron" style="font-size: 14px; color: var(--text-muted); width: 14px;">▸</span>
                            <div>
                                <div style="font-weight: 600; font-size: 13px;">${acName}</div>
                                <div style="font-size: 11px; color: var(--text-muted)">${acType} • ${staffList.length} staff • ${routeCount} route(s) • ${formatMoney(salaryTotal)}/mo</div>
                            </div>
                        </div>
                    </div>
                    <div id="${collapseId}" class="hidden" style="padding: 4px 0;">
                        ${staffList.map(s => renderStaffCard(s)).join('')}
                    </div>
                </div>`;
        }
        html += '</div>';
    }

    if (unassigned.length > 0) {
        const totalSalary = unassigned.reduce((s, st) => s + st.salary, 0);
        html += `
            <div style="margin-bottom: 16px">
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 8px; padding-left: 4px;">Unassigned Staff (${unassigned.length} • ${formatMoney(totalSalary)}/mo)</div>
                ${unassigned.map(s => renderStaffCard(s)).join('')}
            </div>`;
    }

    container.innerHTML = html;
}

window._fireStaff = (staffId) => {
    if (!confirm('Fire this staff member?')) return;
    const result = fireStaff(state, staffId);
    if (result.success) {
        saveGame(state);
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
