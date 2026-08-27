import { createGameState, saveGame, loadGame, deleteSave, formatMoney } from './engine.js';
import { AIRPORTS } from './airports.js';
import { initUI } from './ui.js';

const CURRENCIES = [
    { symbol: '$', code: 'USD', name: 'US Dollar' },
    { symbol: '€', code: 'EUR', name: 'Euro' },
    { symbol: '£', code: 'GBP', name: 'British Pound' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
    { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
    { symbol: '₩', code: 'KRW', name: 'South Korean Won' }
];

let state = null;

function migrateState(data) {
    if (data.aircraft) {
        for (const ac of data.aircraft) {
            if (ac.assignedRoute && !ac.assignedRoutes) {
                ac.assignedRoutes = [ac.assignedRoute];
                delete ac.assignedRoute;
            } else if (!ac.assignedRoutes) {
                ac.assignedRoutes = [];
            }
        }
    }
    if (data.staff) {
        for (const s of data.staff) {
            if (s.assignedRoute && !s.assignedAircraft) {
                const route = data.routes?.find(r => r.id === s.assignedRoute);
                s.assignedAircraft = route ? route.aircraftId : null;
                delete s.assignedRoute;
            } else if (!s.assignedAircraft) {
                s.assignedAircraft = null;
            }
        }
    }
    if (data.routes) {
        for (const route of data.routes) {
            if (route.roundTripTime === undefined) {
                const aircraft = data.aircraft?.find(a => a.id === route.aircraftId);
                if (aircraft) {
                    route.roundTripTime = Math.round((2 * route.distance / aircraft.speed) * 10) / 10;
                    const maxH = aircraft.category === 'Widebody' ? 16 : aircraft.category === 'Narrowbody' ? 14 : 10;
                    route.maxFlightsPerDay = Math.max(1, Math.floor(maxH / route.roundTripTime));
                    if (!route.flightsPerDay || route.flightsPerDay > route.maxFlightsPerDay) {
                        route.flightsPerDay = 1;
                    }
                } else {
                    route.roundTripTime = 4;
                    route.flightsPerDay = 1;
                    route.maxFlightsPerDay = 3;
                }
            }
            if (route.maxFlightsPerDay === undefined) {
                const aircraft = data.aircraft?.find(a => a.id === route.aircraftId);
                if (aircraft) {
                    const maxH = aircraft.category === 'Widebody' ? 16 : aircraft.category === 'Narrowbody' ? 14 : 10;
                    route.maxFlightsPerDay = Math.max(1, Math.floor(maxH / route.roundTripTime));
                    if (route.flightsPerDay > route.maxFlightsPerDay) {
                        route.flightsPerDay = 1;
                    }
                }
            }
            if (route.staffAssigned !== undefined) {
                delete route.staffAssigned;
            }
        }
    }
    if (data.stats) {
        if (data.stats.daysPlayed === undefined) {
            data.stats.daysPlayed = (data.stats.monthsPlayed || 0) * 30;
        }
    }
    return data;
}

async function init() {
    const savedGame = await loadGame();
    
    if (savedGame) {
        state = migrateState(savedGame);
        initUI(state);
        return;
    }
    
    showSetupScreen();
}

function showSetupScreen() {
    const setupScreen = document.getElementById('setup-screen') || createSetupScreen();
    setupScreen.classList.add('active');
    setupScreen.style.display = 'flex';
}

function createSetupScreen() {
    const div = document.createElement('div');
    div.id = 'setup-screen';
    div.innerHTML = `
        <div class="setup-card">
            <div style="font-size: 48px; margin-bottom: 16px">✈</div>
            <h1>SkyTycoon</h1>
            <p class="subtitle">Offline Airline Management Simulator</p>
            
            <div class="form-group">
                <label>Airline Name</label>
                <input type="text" id="airline-name" placeholder="Enter your airline name..." value="" style="font-size: 16px; padding: 12px; text-align: center;">
            </div>
            
            <div class="form-group">
                <label>Currency</label>
                <select id="game-currency" style="font-size: 16px; padding: 12px;">
                    ${CURRENCIES.map((c, i) => `<option value="${i}" ${c.code === 'USD' ? 'selected' : ''}>${c.symbol}  ${c.name} (${c.code})</option>`).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Starting Cash</label>
                <select id="starting-cash" style="font-size: 16px; padding: 12px;">
                    <option value="200000000">Small ($200M) - Challenge Mode</option>
                    <option value="500000000" selected>Medium ($500M) - Balanced</option>
                    <option value="1000000000">Large ($1B) - Comfortable</option>
                    <option value="2000000000">Tycoon ($2B) - Sandbox</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Home Hub</label>
                <div class="airport-select-grid" id="hub-select">
                    ${getHubOptions()}
                </div>
            </div>
            
            <div style="margin-top: 24px; display: flex; gap: 8px; justify-content: center">
                <button class="btn btn-primary" id="btn-start-game" style="padding: 12px 32px; font-size: 16px">
                    Start Game
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(div);
    
    // Select first airport by default
    const firstAirport = div.querySelector('.airport-option');
    if (firstAirport) firstAirport.classList.add('selected');
    
    // Airport selection
    div.querySelectorAll('.airport-option').forEach(opt => {
        opt.addEventListener('click', () => {
            div.querySelectorAll('.airport-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
    
    // Start button
    document.getElementById('btn-start-game').addEventListener('click', () => {
        const name = document.getElementById('airline-name').value.trim();
        if (!name) {
            document.getElementById('airline-name').style.borderColor = '#ef4444';
            document.getElementById('airline-name').focus();
            return;
        }
        const cash = parseInt(document.getElementById('starting-cash').value);
        const hub = div.querySelector('.airport-option.selected')?.dataset.code || 'JFK';
        const currencyIdx = parseInt(document.getElementById('game-currency').value);
        const currency = CURRENCIES[currencyIdx];
        
        state = createGameState(name, hub, currency);
        state.finances.cash = cash;
        state.finances.equity = cash;
        
        saveGame(state);
        
        div.style.display = 'none';
        div.classList.remove('active');
        
        initUI(state);
    });
    
    return div;
}

function getHubOptions() {
    const hubs = AIRPORTS.filter(a => a.hub).slice(0, 12);
    return hubs.map(a => `
        <div class="airport-option" data-code="${a.code}">
            <div class="code">${a.code}</div>
            <div class="city">${a.city}</div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', init);
