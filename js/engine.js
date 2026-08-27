import { AIRCRAFT_DATA } from './aircraft.js';
import { AIRPORTS, getAirport } from './airports.js';

let nextId = 1;

function genId() {
    return nextId++;
}

let currencySymbol = '$';
let currencyCode = 'USD';

export function setCurrency(symbol, code) {
    currencySymbol = symbol;
    currencyCode = code;
}

export function formatMoney(amount) {
    if (Math.abs(amount) >= 1e9) return currencySymbol + (amount / 1e9).toFixed(2) + 'B';
    if (Math.abs(amount) >= 1e6) return currencySymbol + (amount / 1e6).toFixed(1) + 'M';
    if (Math.abs(amount) >= 1e3) return currencySymbol + (amount / 1e3).toFixed(0) + 'K';
    return currencySymbol + amount.toFixed(0);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateDemand(origin, destination, reputation, pricePerKm) {
    const destAirport = getAirport(destination);
    if (!destAirport) return 0;
    
    const baseDemand = Math.min(destAirport.passengers / 1000, 500000);
    const demand = baseDemand * (reputation / 100) * Math.max(0.3, 1 - pricePerKm * 0.5);
    return Math.round(demand * (0.8 + Math.random() * 0.4));
}

function calculateTicketPrice(distance, competition, reputation) {
    const basePricePerKm = 0.08 + (distance / 10000) * 0.02;
    const compFactor = Math.max(0.7, 1 - competition * 0.1);
    const repFactor = 0.8 + (reputation / 100) * 0.4;
    return Math.round(distance * basePricePerKm * compFactor * repFactor);
}

function generateMonthlyRevenue(route, aircraft) {
    const dest = getAirport(route.destination);
    if (!dest) return 0;
    
    const distance = haversineDistance(
        getAirport(route.origin).lat, getAirport(route.origin).lon,
        dest.lat, dest.lon
    );
    
    const demand = calculateDemand(route.origin, route.destination, route.reputation, route.ticketPrice / distance);
    const loadFactor = Math.min(0.95, Math.max(0.3, demand / (aircraft.capacity * 30)));
    const flightsPerMonth = 30 / Math.max(1, Math.ceil(distance / 800) + 1);
    const revenue = Math.round(flightsPerMonth * aircraft.capacity * loadFactor * route.ticketPrice * 0.5);
    
    return revenue;
}

function generateExpenses(aircraftData, staff) {
    const monthlyFuelCost = aircraftData.fuelBurn * 3.2 * 1000 * 30;
    const monthlyMaintenance = aircraftData.maintenanceCost;
    const monthlyStaffCost = staff.reduce((sum, s) => sum + s.salary, 0);
    const monthlyLease = aircraftData.leasePrice || 0;
    
    return {
        fuel: monthlyFuelCost,
        maintenance: monthlyMaintenance,
        staff: monthlyStaffCost,
        lease: monthlyLease,
        total: monthlyFuelCost + monthlyMaintenance + monthlyStaffCost + monthlyLease
    };
}

function generateId(type) {
    return `${type}_${genId()}`;
}

export function createGameState(airlineName, hubCode, currency = { symbol: '$', code: 'USD' }) {
    currencySymbol = currency.symbol;
    currencyCode = currency.code;
    return {
        airline: {
            name: airlineName,
            hub: hubCode,
            reputation: 50,
            currency: currency,
            founded: { month: 1, year: 2025 }
        },
        finances: {
            cash: 500000000,
            debt: 0,
            assets: 0,
            equity: 500000000,
            totalRevenue: 0,
            totalExpenses: 0
        },
        aircraft: [],
        routes: [],
        staff: [],
        events: [],
        news: [],
        transactions: [],
        month: 1,
        year: 2025,
        day: 1,
        speed: 0,
        marketCompetition: generateMarketCompetition(),
        stats: {
            totalPassengers: 0,
            totalFlights: 0,
            monthsPlayed: 0
        }
    };
}

function generateMarketCompetition() {
    const competitors = [
        { name: 'SkyWest Airlines', routes: 15, reputation: 60 },
        { name: 'Atlantic Airways', routes: 25, reputation: 70 },
        { name: 'Pacific Air', routes: 30, reputation: 65 },
        { name: 'EuroJet', routes: 35, reputation: 75 },
        { name: 'Global Wings', routes: 20, reputation: 55 },
        { name: 'Sunrise Airlines', routes: 12, reputation: 50 },
        { name: 'Nordic Air', routes: 18, reputation: 68 },
        { name: 'TransAtlantic', routes: 28, reputation: 72 }
    ];
    return competitors;
}

export function buyAircraft(state, aircraftTypeId) {
    const template = AIRCRAFT_DATA.find(a => a.id === aircraftTypeId);
    if (!template) return { success: false, message: 'Aircraft not found' };
    if (state.finances.cash < template.price) return { success: false, message: 'Insufficient funds' };
    
    const aircraft = {
        id: generateId('ac'),
        typeId: template.id,
        name: template.name,
        manufacturer: template.manufacturer,
        category: template.category,
        capacity: template.capacity,
        range: template.range,
        speed: template.speed,
        fuelBurn: template.fuelBurn,
        purchasePrice: template.price,
        leasePrice: template.leasePrice,
        maintenanceCost: template.maintenanceCost,
        crewRequired: template.crewRequired,
        minRunway: template.minRunway,
        status: 'idle',
        assignedRoute: null,
        age: 0,
        condition: 100,
        totalFlights: 0,
        icon: template.icon
    };
    
    state.aircraft.push(aircraft);
    state.finances.cash -= template.price;
    state.finances.assets += template.price * 0.85;
    
    addTransaction(state, `Purchased ${template.name}`, -template.price, 'asset');
    addNews(state, `Acquired a new ${template.name} for the fleet`, 'positive');
    
    return { success: true, aircraft };
}

export function leaseAircraft(state, aircraftTypeId) {
    const template = AIRCRAFT_DATA.find(a => a.id === aircraftTypeId);
    if (!template) return { success: false, message: 'Aircraft not found' };
    if (state.finances.cash < template.leasePrice * 3) return { success: false, message: 'Need 3 months lease upfront' };
    
    const aircraft = {
        id: generateId('ac'),
        typeId: template.id,
        name: template.name,
        manufacturer: template.manufacturer,
        category: template.category,
        capacity: template.capacity,
        range: template.range,
        speed: template.speed,
        fuelBurn: template.fuelBurn,
        purchasePrice: 0,
        leasePrice: template.leasePrice,
        maintenanceCost: template.maintenanceCost,
        crewRequired: template.crewRequired,
        minRunway: template.minRunway,
        status: 'idle',
        assignedRoute: null,
        age: 0,
        condition: 100,
        totalFlights: 0,
        leased: true,
        icon: template.icon
    };
    
    state.aircraft.push(aircraft);
    state.finances.cash -= template.leasePrice * 3;
    
    addTransaction(state, `Leased ${template.name} (3 months upfront)`, -template.leasePrice * 3, 'expense');
    addNews(state, `Leased a ${template.name} to expand the fleet`, 'positive');
    
    return { success: true, aircraft };
}

export function sellAircraft(state, aircraftId) {
    const idx = state.aircraft.findIndex(a => a.id === aircraftId);
    if (idx === -1) return { success: false, message: 'Aircraft not found' };
    
    const aircraft = state.aircraft[idx];
    if (aircraft.status === 'active') return { success: false, message: 'Cannot sell active aircraft' };
    
    const template = AIRCRAFT_DATA.find(a => a.id === aircraft.typeId);
    const sellPrice = Math.round(template.price * 0.7 * (aircraft.condition / 100));
    
    state.aircraft.splice(idx, 1);
    state.finances.cash += sellPrice;
    state.finances.assets -= template.price * 0.85;
    
    addTransaction(state, `Sold ${aircraft.name}`, sellPrice, 'asset');
    addNews(state, `Sold a ${aircraft.name} from the fleet`, 'neutral');
    
    return { success: true, amount: sellPrice };
}

export function createRoute(state, originCode, destinationCode, aircraftId) {
    const origin = getAirport(originCode);
    const dest = getAirport(destinationCode);
    if (!origin || !dest) return { success: false, message: 'Airport not found' };
    
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return { success: false, message: 'Aircraft not found' };
    
    const distance = haversineDistance(origin.lat, origin.lon, dest.lat, dest.lon);
    
    if (distance > aircraft.range) {
        return { success: false, message: `Distance (${Math.round(distance)}km) exceeds aircraft range (${aircraft.range}km)` };
    }
    
    if (origin.code === destinationCode) {
        return { success: false, message: 'Cannot create route to same airport' };
    }
    
    const existingRoute = state.routes.find(r => 
        (r.origin === originCode && r.destination === destinationCode) ||
        (r.origin === destinationCode && r.destination === originCode)
    );
    if (existingRoute) return { success: false, message: 'Route already exists' };
    
    if (aircraft.assignedRoute) {
        return { success: false, message: 'Aircraft is already assigned to a route' };
    }
    
    const competition = state.marketCompetition.filter(c => {
        const cRoutes = Math.floor(Math.random() * 3);
        return cRoutes > 0 && Math.random() < c.reputation / 200;
    }).length;
    
    const ticketPrice = calculateTicketPrice(distance, competition, state.airline.reputation);
    
    const route = {
        id: generateId('route'),
        origin: originCode,
        destination: destinationCode,
        aircraftId: aircraft.id,
        distance: Math.round(distance),
        ticketPrice: ticketPrice,
        reputation: state.airline.reputation,
        status: 'active',
        monthlyRevenue: 0,
        monthlyPassengers: 0,
        monthlyFlights: 0,
        loadFactor: 0
    };
    
    aircraft.status = 'active';
    aircraft.assignedRoute = route.id;
    
    state.routes.push(route);
    
    const flightTime = Math.ceil(distance / 800) + 1;
    addNews(state, `Opened new route ${originCode}-${destinationCode} (Flight time: ${flightTime}h)`, 'positive');
    
    return { success: true, route, ticketPrice };
}

export function closeRoute(state, routeId) {
    const idx = state.routes.findIndex(r => r.id === routeId);
    if (idx === -1) return { success: false, message: 'Route not found' };
    
    const route = state.routes[idx];
    const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
    if (aircraft) {
        aircraft.status = 'idle';
        aircraft.assignedRoute = null;
    }
    
    state.routes.splice(idx, 1);
    addNews(state, `Closed route ${route.origin}-${route.destination}`, 'neutral');
    
    return { success: true };
}

export function adjustTicketPrice(state, routeId, newPrice) {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return { success: false, message: 'Route not found' };
    
    route.ticketPrice = Math.max(10, Math.round(newPrice));
    return { success: true };
}

export function assignAircraft(state, routeId, aircraftId) {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return { success: false, message: 'Route not found' };
    
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return { success: false, message: 'Aircraft not found' };
    if (aircraft.assignedRoute && aircraft.assignedRoute !== routeId) {
        return { success: false, message: 'Aircraft is assigned to another route' };
    }
    
    const oldAircraft = state.aircraft.find(a => a.id === route.aircraftId);
    if (oldAircraft) {
        oldAircraft.status = 'idle';
        oldAircraft.assignedRoute = null;
    }
    
    route.aircraftId = aircraftId;
    aircraft.status = 'active';
    aircraft.assignedRoute = routeId;
    
    return { success: true };
}

export function hireStaff(state, role) {
    const staffTypes = {
        'Pilot': { salary: 12000, quality: 0.8 },
        'Co-Pilot': { salary: 9000, quality: 0.75 },
        'Flight Engineer': { salary: 8000, quality: 0.7 },
        'Flight Attendant': { salary: 4500, quality: 0.65 },
        'Ground Crew': { salary: 3500, quality: 0.6 },
        'Maintenance Tech': { salary: 5500, quality: 0.7 },
        'Dispatcher': { salary: 6500, quality: 0.75 },
        'Customer Service': { salary: 3200, quality: 0.6 }
    };
    
    const staffDef = staffTypes[role];
    if (!staffDef) return { success: false, message: 'Invalid role' };
    
    if (state.finances.cash < staffDef.salary * 2) {
        return { success: false, message: 'Need 2 months salary upfront' };
    }
    
    const names = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Maria', 'John', 'Anna', 'Robert', 'Lisa',
                   'Thomas', 'Jennifer', 'Chris', 'Amanda', 'Daniel', 'Rachel', 'Mark', 'Nicole', 'Kevin', 'Samantha'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const staff = {
        id: generateId('staff'),
        name: names[Math.floor(Math.random() * names.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)],
        role: role,
        salary: staffDef.salary + Math.round((Math.random() - 0.5) * staffDef.salary * 0.2),
        quality: staffDef.quality + (Math.random() * 0.2 - 0.1),
        hired: `${state.month}/${state.year}`,
        morale: 70 + Math.floor(Math.random() * 20)
    };
    
    state.staff.push(staff);
    state.finances.cash -= staffDef.salary * 2;
    
    addTransaction(state, `Hired ${staff.name} (${role}) - 2 months upfront`, -staffDef.salary * 2, 'expense');
    
    return { success: true, staff };
}

export function fireStaff(state, staffId) {
    const idx = state.staff.findIndex(s => s.id === staffId);
    if (idx === -1) return { success: false, message: 'Staff not found' };
    
    const staff = state.staff[idx];
    state.staff.splice(idx, 1);
    
    addTransaction(state, `Severance for ${staff.name}`, -staff.salary, 'expense');
    
    return { success: true };
}

export function takeLoan(state, amount) {
    if (amount <= 0 || amount > 2000000000) return { success: false, message: 'Invalid loan amount' };
    
    const interestRate = 0.05 + (state.finances.debt / 1000000000) * 0.02;
    state.finances.cash += amount;
    state.finances.debt += amount;
    
    addTransaction(state, `Loan of ${formatMoney(amount)} at ${(interestRate * 100).toFixed(1)}% APR`, amount, 'loan');
    addNews(state, `Secured a loan of ${formatMoney(amount)}`, 'neutral');
    
    return { success: true, interestRate };
}

export function repayLoan(state, amount) {
    if (amount <= 0) return { success: false, message: 'Invalid amount' };
    
    const repayAmount = Math.min(amount, state.finances.debt, state.finances.cash);
    state.finances.cash -= repayAmount;
    state.finances.debt -= repayAmount;
    
    addTransaction(state, `Loan repayment of ${formatMoney(repayAmount)}`, -repayAmount, 'loan');
    
    return { success: true, repaid: repayAmount };
}

export function processMonth(state) {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalPassengers = 0;
    
    // Process each route
    for (const route of state.routes) {
        const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
        const template = AIRCRAFT_DATA.find(a => a.id === aircraft?.typeId);
        if (!aircraft || !template) continue;
        
        const dest = getAirport(route.destination);
        const origin = getAirport(route.origin);
        const distance = haversineDistance(origin.lat, origin.lon, dest.lat, dest.lon);
        
        const flightsPerMonth = 30 / Math.max(1, Math.ceil(distance / 800) + 1);
        const demand = calculateDemand(route.origin, route.destination, route.reputation, route.ticketPrice / distance);
        const loadFactor = Math.min(0.95, Math.max(0.3, demand / (aircraft.capacity * flightsPerMonth)));
        
        const passengers = Math.round(flightsPerMonth * aircraft.capacity * loadFactor);
        const revenue = Math.round(passengers * route.ticketPrice);
        
        // Expenses for this route
        const fuelCost = template.fuelBurn * 3.2 * 1000 * flightsPerMonth * (distance / 800);
        const maintenanceCost = template.maintenanceCost;
        const routeExpenses = fuelCost + maintenanceCost;
        
        route.monthlyRevenue = revenue;
        route.monthlyPassengers = passengers;
        route.monthlyFlights = Math.round(flightsPerMonth);
        route.loadFactor = Math.round(loadFactor * 100);
        
        aircraft.totalFlights += Math.round(flightsPerMonth);
        
        totalRevenue += revenue;
        totalExpenses += routeExpenses;
        totalPassengers += passengers;
    }
    
    // Staff expenses
    const staffExpense = state.staff.reduce((sum, s) => sum + s.salary, 0);
    totalExpenses += staffExpense;
    
    // Lease expenses
    for (const aircraft of state.aircraft) {
        if (aircraft.leased && aircraft.leasePrice) {
            totalExpenses += aircraft.leasePrice;
        }
    }
    
    // Update finances
    state.finances.cash += totalRevenue - totalExpenses;
    state.finances.totalRevenue += totalRevenue;
    state.finances.totalExpenses += totalExpenses;
    state.finances.equity = state.finances.cash + state.finances.assets - state.finances.debt;
    
    // Update reputation based on performance
    const avgLoadFactor = state.routes.length > 0 
        ? state.routes.reduce((sum, r) => sum + r.loadFactor, 0) / state.routes.length 
        : 50;
    
    if (avgLoadFactor > 70) {
        state.airline.reputation = Math.min(100, state.airline.reputation + 0.5);
    } else if (avgLoadFactor < 40) {
        state.airline.reputation = Math.max(0, state.airline.reputation - 0.5);
    }
    
    // Update stats
    state.stats.totalPassengers += totalPassengers;
    state.stats.monthsPlayed++;
    
    // Aircraft aging
    for (const aircraft of state.aircraft) {
        aircraft.age++;
        if (aircraft.age % 12 === 0) {
            aircraft.condition = Math.max(10, aircraft.condition - 2);
        }
    }
    
    // Interest on debt
    if (state.finances.debt > 0) {
        const interest = Math.round(state.finances.debt * 0.005);
        state.finances.cash -= interest;
        state.finances.totalExpenses += interest;
        addTransaction(state, 'Loan interest payment', -interest, 'expense');
    }
    
    // Add monthly summary
    addTransaction(state, 'Monthly revenue', totalRevenue, 'revenue');
    addTransaction(state, 'Monthly expenses', -totalExpenses, 'expense');
    
    // Generate events
    generateEvents(state);
    
    // Update AI competitors
    updateAICompetitors(state);
    
    // Advance time
    state.month++;
    if (state.month > 12) {
        state.month = 1;
        state.year++;
    }
    
    return {
        revenue: totalRevenue,
        expenses: totalExpenses,
        passengers: totalPassengers,
        profit: totalRevenue - totalExpenses
    };
}

function generateEvents(state) {
    const eventPool = [
        { type: 'good', text: 'A major travel expo increased bookings on your routes.', effect: () => { state.airline.reputation = Math.min(100, state.airline.reputation + 2); } },
        { type: 'bad', text: 'Fuel prices spiked temporarily, increasing operating costs.', effect: () => { state.finances.cash -= 500000; } },
        { type: 'neutral', text: 'A new airport terminal opened at one of your destinations.', effect: () => {} },
        { type: 'good', text: 'Your airline received positive media coverage.', effect: () => { state.airline.reputation = Math.min(100, state.airline.reputation + 3); } },
        { type: 'bad', text: 'A competitor launched aggressive pricing on overlapping routes.', effect: () => { state.airline.reputation = Math.max(0, state.airline.reputation - 1); } },
        { type: 'good', text: 'A partnership with a travel agency boosted bookings.', effect: () => { state.finances.cash += 2000000; } },
        { type: 'bad', text: 'A minor maintenance issue grounded one of your aircraft.', effect: () => {
            const ac = state.aircraft.find(a => a.status === 'active');
            if (ac) { ac.condition = Math.max(10, ac.condition - 10); }
        }},
        { type: 'neutral', text: 'Industry analysts predict steady growth in air travel demand.', effect: () => {} },
        { type: 'good', text: 'Your crew won an award for service excellence.', effect: () => { state.airline.reputation = Math.min(100, state.airline.reputation + 1); } },
        { type: 'bad', text: 'Airport fees increased at a major hub.', effect: () => { state.finances.cash -= 300000; } },
        { type: 'neutral', text: 'A competitor merged with another airline.', effect: () => {
            const idx = Math.floor(Math.random() * state.marketCompetition.length);
            state.marketCompetition[idx].routes += 5;
        }},
        { type: 'good', text: 'Holiday season brought a surge in bookings.', effect: () => {
            state.routes.forEach(r => { r.reputation = Math.min(100, r.reputation + 2); });
        }}
    ];
    
    // 30% chance of event each month
    if (Math.random() < 0.3) {
        const event = eventPool[Math.floor(Math.random() * eventPool.length)];
        event.effect();
        
        const newEvent = {
            id: generateId('event'),
            type: event.type,
            text: event.text,
            date: `${state.month}/${state.year}`,
            month: state.month,
            year: state.year
        };
        
        state.events.unshift(newEvent);
        if (state.events.length > 50) state.events.pop();
    }
}

function updateAICompetitors(state) {
    for (const comp of state.marketCompetition) {
        // AI airlines grow/shrink slightly
        const change = Math.floor((Math.random() - 0.45) * 3);
        comp.routes = Math.max(5, comp.routes + change);
        comp.reputation = Math.max(30, Math.min(95, comp.reputation + (Math.random() - 0.5) * 2));
    }
}

function addTransaction(state, description, amount, type) {
    const tx = {
        id: generateId('tx'),
        description,
        amount,
        type,
        date: `${state.month}/${state.year}`,
        balance: state.finances.cash
    };
    state.transactions.unshift(tx);
    if (state.transactions.length > 200) state.transactions.pop();
}

function addNews(state, text, sentiment) {
    const news = {
        id: generateId('news'),
        text,
        sentiment,
        date: `${state.month}/${state.year}`
    };
    state.news.unshift(news);
    if (state.news.length > 30) state.news.pop();
}

export function saveGame(state) {
    try {
        const saveData = JSON.stringify(state);
        localStorage.setItem('skytycoon_save', saveData);
        return true;
    } catch (e) {
        return false;
    }
}

export function loadGame() {
    try {
        const d = localStorage.getItem('skytycoon_save');
        if (!d) return null;
        const parsed = JSON.parse(d);
        if (parsed.airline && parsed.airline.currency) {
            currencySymbol = parsed.airline.currency.symbol;
            currencyCode = parsed.airline.currency.code;
        }
        return parsed;
    } catch (e) {
        return null;
    }
}
}

export function deleteSave() {
    localStorage.removeItem('skytycoon_save');
}

export { formatMoney, haversineDistance };
