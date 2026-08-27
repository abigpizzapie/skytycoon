import { AIRCRAFT_DATA, STAFF_REQUIREMENTS, MAX_FLIGHT_HOURS } from './aircraft.js';
import { AIRPORTS, getAirport } from './airports.js';

let nextId = 1;

function genId() {
    return nextId++;
}

function restoreNextId(state) {
    let maxId = 0;
    const allIds = [
        ...(state.aircraft || []).map(a => a.id),
        ...(state.routes || []).map(r => r.id),
        ...(state.staff || []).map(s => s.id),
        ...(state.events || []).map(e => e.id),
        ...(state.news || []).map(n => n.id),
        ...(state.transactions || []).map(t => t.id)
    ];
    for (const id of allIds) {
        const match = id.match(/_(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxId) maxId = num;
        }
    }
    nextId = maxId + 1;
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

const CS_PASSENGER_RATIO = 5000;

function calculateRequiredCSStaff(monthlyPassengers) {
    return Math.ceil(monthlyPassengers / CS_PASSENGER_RATIO);
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

function calculateFlightTime(distance, speed) {
    return (2 * distance) / speed;
}

function calculateFlightsPerDay(roundTripTime, maxHours) {
    if (roundTripTime <= 0) return 0;
    return Math.floor(maxHours / roundTripTime);
}

function getAircraftUsedHours(aircraft, routes) {
    if (!aircraft.assignedRoutes || aircraft.assignedRoutes.length === 0) return 0;
    let totalHours = 0;
    for (const routeId of aircraft.assignedRoutes) {
        const route = routes.find(r => r.id === routeId);
        if (route) totalHours += route.roundTripTime * route.flightsPerDay;
    }
    return totalHours;
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
            daysPlayed: 0,
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
        assignedRoutes: [],
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
        assignedRoutes: [],
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
    if (aircraft.assignedRoutes && aircraft.assignedRoutes.length > 0) return { success: false, message: 'Cannot sell aircraft with active routes' };
    
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
    
    const roundTripTime = calculateFlightTime(distance, aircraft.speed);
    const maxHours = MAX_FLIGHT_HOURS[aircraft.typeId] || 12;
    const maxFlightsPerDay = calculateFlightsPerDay(roundTripTime, maxHours);
    
    if (maxFlightsPerDay < 1) {
        return { success: false, message: `Route requires ${roundTripTime.toFixed(1)}h round trip but aircraft only has ${maxHours}h/day` };
    }
    
    const usedHours = getAircraftUsedHours(aircraft, state.routes);
    const remainingHours = maxHours - usedHours;
    
    if (roundTripTime > remainingHours) {
        return { success: false, message: `Aircraft has ${remainingHours.toFixed(1)}h remaining today but this route needs ${roundTripTime.toFixed(1)}h round trip` };
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
        roundTripTime: Math.round(roundTripTime * 10) / 10,
        flightsPerDay: 1,
        maxFlightsPerDay: maxFlightsPerDay,
        monthlyFlights: 0,
        monthlyRevenue: 0,
        monthlyPassengers: 0,
        loadFactor: 0,
        staffAssigned: []
    };
    
    aircraft.assignedRoutes.push(route.id);
    if (aircraft.status === 'idle') aircraft.status = 'active';
    
    state.routes.push(route);
    
    addNews(state, `Opened new route ${originCode}-${destinationCode} (1 flight/day, ${roundTripTime.toFixed(1)}h round trip)`, 'positive');
    
    return { success: true, route, ticketPrice, roundTripTime, flightsPerDay: 1 };
}

export function closeRoute(state, routeId) {
    const idx = state.routes.findIndex(r => r.id === routeId);
    if (idx === -1) return { success: false, message: 'Route not found' };
    
    const route = state.routes[idx];
    const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
    if (aircraft) {
        aircraft.assignedRoutes = aircraft.assignedRoutes.filter(rId => rId !== routeId);
        if (aircraft.assignedRoutes.length === 0) {
            aircraft.status = 'idle';
        }
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

export function adjustFlightsPerDay(state, routeId, newFlights) {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return { success: false, message: 'Route not found' };
    
    const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
    if (!aircraft) return { success: false, message: 'Aircraft not found' };
    
    const maxHours = MAX_FLIGHT_HOURS[aircraft.typeId] || 12;
    const maxFlightsForRoute = route.maxFlightsPerDay || calculateFlightsPerDay(route.roundTripTime, maxHours);
    
    if (newFlights < 1) return { success: false, message: 'Minimum 1 flight per day' };
    if (newFlights > maxFlightsForRoute) return { success: false, message: `Maximum ${maxFlightsForRoute} flights per day for this route` };
    
    const currentUsedHours = getAircraftUsedHours(aircraft, state.routes);
    const routeCurrentHours = route.roundTripTime * route.flightsPerDay;
    const routeNewHours = route.roundTripTime * newFlights;
    const totalAfter = currentUsedHours - routeCurrentHours + routeNewHours;
    
    if (totalAfter > maxHours) {
        const remainingAfter = Math.round((maxHours - currentUsedHours + routeCurrentHours) * 10) / 10;
        return { success: false, message: `Aircraft would use ${totalAfter.toFixed(1)}h/day but only has ${maxHours}h max. Reduce other routes or choose fewer flights.` };
    }
    
    route.flightsPerDay = newFlights;
    return { success: true, flightsPerDay: newFlights, maxFlightsPerDay: maxFlightsForRoute };
}

export function assignAircraft(state, routeId, aircraftId) {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return { success: false, message: 'Route not found' };
    
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return { success: false, message: 'Aircraft not found' };
    
    if (aircraft.id === route.aircraftId) {
        return { success: false, message: 'Aircraft is already assigned to this route' };
    }
    
    const maxHours = MAX_FLIGHT_HOURS[aircraft.typeId] || 12;
    const usedHours = getAircraftUsedHours(aircraft, state.routes);
    const routeHoursNeeded = route.roundTripTime * route.flightsPerDay;
    if (routeHoursNeeded > (maxHours - usedHours)) {
        return { success: false, message: `Aircraft has ${(maxHours - usedHours).toFixed(1)}h remaining but route needs ${routeHoursNeeded.toFixed(1)}h (${route.flightsPerDay} flights × ${route.roundTripTime}h)` };
    }
    
    const oldAircraft = state.aircraft.find(a => a.id === route.aircraftId);
    if (oldAircraft) {
        oldAircraft.assignedRoutes = oldAircraft.assignedRoutes.filter(rId => rId !== routeId);
        if (oldAircraft.assignedRoutes.length === 0) {
            oldAircraft.status = 'idle';
        }
    }
    
    route.aircraftId = aircraftId;
    aircraft.assignedRoutes.push(routeId);
    aircraft.status = 'active';
    
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
    if (staff.assignedAircraft) {
        return { success: false, message: 'Cannot fire staff assigned to an aircraft. Unassign them first.' };
    }
    state.staff.splice(idx, 1);
    
    addTransaction(state, `Severance for ${staff.name}`, -staff.salary, 'expense');
    
    return { success: true };
}

export function getAvailableStaff(state, role) {
    return state.staff.filter(s => s.role === role && !s.assignedAircraft);
}

export function checkStaffRequirements(state, aircraftId) {
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return { met: false, missing: {}, assigned: 0, required: 0 };
    
    const requirements = STAFF_REQUIREMENTS[aircraft.typeId] || {};
    const missing = {};
    let totalRequired = 0;
    let totalAssigned = 0;
    
    for (const [role, count] of Object.entries(requirements)) {
        const assignedCount = state.staff.filter(s => 
            s.assignedAircraft === aircraftId && s.role === role
        ).length;
        totalRequired += count;
        totalAssigned += assignedCount;
        if (assignedCount < count) {
            missing[role] = count - assignedCount;
        }
    }
    
    return {
        met: Object.keys(missing).length === 0,
        missing,
        assigned: totalAssigned,
        required: totalRequired
    };
}

export function getAircraftStaff(state, aircraftId) {
    return state.staff.filter(s => s.assignedAircraft === aircraftId);
}

export function assignStaffToAircraft(state, aircraftId, staffIds) {
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return { success: false, message: 'Aircraft not found' };
    
    for (const staffId of staffIds) {
        const staff = state.staff.find(s => s.id === staffId);
        if (!staff) return { success: false, message: `Staff ${staffId} not found` };
        if (staff.assignedAircraft && staff.assignedAircraft !== aircraftId) {
            return { success: false, message: `${staff.name} is already assigned to another aircraft` };
        }
    }
    
    for (const staffId of staffIds) {
        const staff = state.staff.find(s => s.id === staffId);
        if (staff) staff.assignedAircraft = aircraftId;
    }
    
    return { success: true };
}

export function unassignStaffFromAircraft(state, aircraftId) {
    for (const staff of state.staff) {
        if (staff.assignedAircraft === aircraftId) {
            staff.assignedAircraft = null;
        }
    }
    return { success: true };
}

export function getAircraftCapacityInfo(state, aircraftId) {
    const aircraft = state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return null;
    
    const maxHours = MAX_FLIGHT_HOURS[aircraft.typeId] || 12;
    const usedHours = getAircraftUsedHours(aircraft, state.routes);
    
    return {
        maxHours,
        usedHours: Math.round(usedHours * 10) / 10,
        remainingHours: Math.round((maxHours - usedHours) * 10) / 10,
        routeCount: aircraft.assignedRoutes.length
    };
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

export function processDay(state) {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalPassengers = 0;
    const routeBreakdown = [];
    const expenseBreakdown = { routes: [], staff: 0, lease: 0, interest: 0 };
    
    for (const route of state.routes) {
        const aircraft = state.aircraft.find(a => a.id === route.aircraftId);
        const template = AIRCRAFT_DATA.find(a => a.id === aircraft?.typeId);
        if (!aircraft || !template) continue;
        
        const aircraftStaff = state.staff.filter(s => s.assignedAircraft === aircraft.id);
        if (aircraftStaff.length === 0) continue;
        
        const dailyFlights = route.flightsPerDay;
        
        const demand = calculateDemand(route.origin, route.destination, route.reputation, route.ticketPrice / route.distance);
        const loadFactor = Math.min(0.95, Math.max(0.3, demand / (aircraft.capacity * dailyFlights * 30)));
        
        const passengers = Math.round(dailyFlights * aircraft.capacity * loadFactor);
        const revenue = Math.round(passengers * route.ticketPrice);
        
        const fuelCost = template.fuelBurn * 3.2 * 1000 * dailyFlights * (route.distance / aircraft.speed);
        const maintenanceCost = template.maintenanceCost / 30;
        const routeExpenses = fuelCost + maintenanceCost;
        
        route.monthlyRevenue = Math.round(revenue * 30);
        route.monthlyExpenses = Math.round(routeExpenses * 30);
        route.monthlyProfit = Math.round((revenue - routeExpenses) * 30);
        route.monthlyPassengers = passengers * 30;
        route.monthlyFlights = dailyFlights * 30;
        route.loadFactor = Math.round(loadFactor * 100);
        
        aircraft.totalFlights += dailyFlights;
        
        totalRevenue += revenue;
        totalExpenses += routeExpenses;
        totalPassengers += passengers;
        
        routeBreakdown.push({
            route: `${route.origin}-${route.destination}`,
            passengers,
            revenue,
            fuel: Math.round(fuelCost),
            maintenance: Math.round(maintenanceCost),
            profit: Math.round(revenue - routeExpenses),
            loadFactor: Math.round(loadFactor * 100)
        });
        expenseBreakdown.routes.push({
            route: `${route.origin}-${route.destination}`,
            fuel: Math.round(fuelCost),
            maintenance: Math.round(maintenanceCost),
            total: Math.round(routeExpenses)
        });
    }
    
    const csStaffCount = state.staff.filter(s => s.role === 'Customer Service').length;
    const monthlyPassengers = totalPassengers * 30;
    const requiredCS = calculateRequiredCSStaff(monthlyPassengers);

    if (csStaffCount === 0 && monthlyPassengers > 0) {
        totalRevenue = 0;
        state.airline.reputation = Math.max(0, state.airline.reputation - 0.1);
        if (state.day === 1) {
            addNews(state, 'No Customer Service staff hired - all revenue has been blocked! Hire CS staff immediately.', 'bad');
        }
    } else if (csStaffCount > 0 && csStaffCount < requiredCS && monthlyPassengers > 0) {
        const ratio = csStaffCount / requiredCS;
        const penalty = (1 - ratio) * 0.05;
        state.airline.reputation = Math.max(0, state.airline.reputation - penalty);
    }

    const dailyStaffExpense = state.staff.reduce((sum, s) => sum + s.salary, 0) / 30;
    totalExpenses += dailyStaffExpense;
    expenseBreakdown.staff = Math.round(dailyStaffExpense);
    
    for (const aircraft of state.aircraft) {
        if (aircraft.leased && aircraft.leasePrice) {
            const dailyLease = aircraft.leasePrice / 30;
            totalExpenses += dailyLease;
            expenseBreakdown.lease += Math.round(dailyLease);
        }
    }
    
    state.finances.cash += totalRevenue - totalExpenses;
    state.finances.totalRevenue += totalRevenue;
    state.finances.totalExpenses += totalExpenses;
    state.finances.equity = state.finances.cash + state.finances.assets - state.finances.debt;
    
    const avgLoadFactor = state.routes.length > 0 
        ? state.routes.reduce((sum, r) => sum + r.loadFactor, 0) / state.routes.length 
        : 50;
    
    if (avgLoadFactor > 70) {
        state.airline.reputation = Math.min(100, state.airline.reputation + 0.017);
    } else if (avgLoadFactor < 40) {
        state.airline.reputation = Math.max(0, state.airline.reputation - 0.017);
    }
    
    state.stats.totalPassengers += totalPassengers;
    state.stats.daysPlayed = (state.stats.daysPlayed || 0) + 1;
    
    for (const aircraft of state.aircraft) {
        aircraft.age++;
        if (aircraft.age % 360 === 0) {
            aircraft.condition = Math.max(10, aircraft.condition - 2);
        }
    }
    
    if (state.finances.debt > 0) {
        const interest = Math.round(state.finances.debt * 0.05 / 365);
        state.finances.cash -= interest;
        state.finances.totalExpenses += interest;
        expenseBreakdown.interest = interest;
        addTransaction(state, 'Loan interest', -interest, 'expense');
    }
    
    addTransaction(state, 'Daily revenue', totalRevenue, 'revenue', { routes: routeBreakdown, totalPassengers });
    addTransaction(state, 'Daily expenses', -totalExpenses, 'expense', expenseBreakdown);
    
    generateEvents(state);
    
    updateAICompetitors(state);
    
    state.day++;
    if (state.day > 30) {
        state.day = 1;
        state.month++;
        if (state.month > 12) {
            state.month = 1;
            state.year++;
        }
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
            const ac = state.aircraft.find(a => a.assignedRoutes && a.assignedRoutes.length > 0);
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
    
    // ~1% chance of event each day (roughly 30% per month)
    if (Math.random() < 0.01) {
        const event = eventPool[Math.floor(Math.random() * eventPool.length)];
        event.effect();
        
        const newEvent = {
            id: generateId('event'),
            type: event.type,
            text: event.text,
            date: `${state.day}/${state.month}/${state.year}`,
            month: state.month,
            year: state.year,
            day: state.day
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

function addTransaction(state, description, amount, type, details) {
    const tx = {
        id: generateId('tx'),
        description,
        amount,
        type,
        date: `${state.day}/${state.month}/${state.year}`,
        balance: state.finances.cash,
        details: details || null
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

function getPlayerId() {
    let id = localStorage.getItem('skytycoon_player_id');
    if (!id) {
        id = 'player_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('skytycoon_player_id', id);
    }
    return id;
}

const API_BASE = window.location.origin + '/api/save.php';

export async function saveGame(state) {
    const data = JSON.stringify(state);
    try { localStorage.setItem('skytycoon_save', data); } catch (e) {}
    const playerId = getPlayerId();
    const url = `${API_BASE}?player=${playerId}`;
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            signal: AbortSignal.timeout(5000)
        });
        const text = await resp.text();
        console.log('[Save]', resp.status, text);
        const result = JSON.parse(text);
        return result.ok === true;
    } catch (e) {
        console.error('[Save] Failed:', e.message);
        return true;
    }
}

export async function loadGame() {
    const playerId = getPlayerId();
    const url = `${API_BASE}?player=${playerId}`;
    console.log('[Load] Fetching:', url);
    try {
        const resp = await fetch(url, {
            signal: AbortSignal.timeout(5000)
        });
        const text = await resp.text();
        console.log('[Load]', resp.status, text.substring(0, 200));
        if (resp.ok) {
            const data = JSON.parse(text);
            if (data && data.airline) {
                if (data.airline.currency) {
                    currencySymbol = data.airline.currency.symbol;
                    currencyCode = data.airline.currency.code;
                }
                restoreNextId(data);
                try { localStorage.setItem('skytycoon_save', JSON.stringify(data)); } catch (e) {}
                return data;
            }
        }
    } catch (e) {
        console.error('[Load] Failed:', e.message);
    }
    try {
        const d = localStorage.getItem('skytycoon_save');
        if (!d) return null;
        const parsed = JSON.parse(d);
        if (parsed.airline && parsed.airline.currency) {
            currencySymbol = parsed.airline.currency.symbol;
            currencyCode = parsed.airline.currency.code;
        }
        restoreNextId(parsed);
        return parsed;
    } catch (e) {
        return null;
    }
}

export async function deleteSave() {
    const playerId = getPlayerId();
    localStorage.removeItem('skytycoon_save');
    try {
        await fetch(`${API_BASE}?player=${playerId}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(5000)
        });
    } catch (e) {}
}

export { haversineDistance, calculateRequiredCSStaff, CS_PASSENGER_RATIO };
