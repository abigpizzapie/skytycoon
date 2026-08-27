import { createGameState, saveGame, loadGame, deleteSave, formatMoney } from './engine.js';
import { AIRPORTS } from './airports.js';
import { initUI } from './ui.js';

let state = null;

function init() {
    const savedGame = loadGame();
    
    if (savedGame) {
        state = savedGame;
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
                <input type="text" id="airline-name" placeholder="e.g. Pacific Skies" value="Pacific Skies">
            </div>
            
            <div class="form-group">
                <label>Starting Cash</label>
                <select id="starting-cash">
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
            
            <div style="margin-top: 16px; text-align: center">
                <button class="btn" id="btn-continue" style="display: none">Continue Saved Game</button>
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
        const name = document.getElementById('airline-name').value.trim() || 'Pacific Skies';
        const cash = parseInt(document.getElementById('starting-cash').value);
        const hub = div.querySelector('.airport-option.selected')?.dataset.code || 'JFK';
        
        state = createGameState(name, hub);
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
