export const AIRPORTS = [
    // NORTH AMERICA
    { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'USA', region: 'North America', passengers: 62000000, hub: true, lat: 40.64, lon: -73.78, slots: 100 },
    { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'USA', region: 'North America', passengers: 88000000, hub: true, lat: 33.94, lon: -118.41, slots: 100 },
    { code: 'ORD', name: "O'Hare Intl", city: 'Chicago', country: 'USA', region: 'North America', passengers: 83000000, hub: true, lat: 41.97, lon: -87.91, slots: 100 },
    { code: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'USA', region: 'North America', passengers: 110000000, hub: true, lat: 33.64, lon: -84.43, slots: 100 },
    { code: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'USA', region: 'North America', passengers: 73000000, hub: true, lat: 32.90, lon: -97.04, slots: 100 },
    { code: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'USA', region: 'North America', passengers: 52000000, hub: false, lat: 25.80, lon: -80.29, slots: 80 },
    { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'USA', region: 'North America', passengers: 57000000, hub: false, lat: 37.62, lon: -122.38, slots: 80 },
    { code: 'SEA', name: 'Seattle-Tacoma Intl', city: 'Seattle', country: 'USA', region: 'North America', passengers: 52000000, hub: false, lat: 47.45, lon: -122.31, slots: 70 },
    { code: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canada', region: 'North America', passengers: 50000000, hub: false, lat: 43.68, lon: -79.63, slots: 70 },
    { code: 'MEX', name: 'Mexico City Intl', city: 'Mexico City', country: 'Mexico', region: 'North America', passengers: 50000000, hub: false, lat: 19.44, lon: -99.07, slots: 70 },
    { code: 'BOS', name: 'Logan Intl', city: 'Boston', country: 'USA', region: 'North America', passengers: 42000000, hub: false, lat: 42.37, lon: -71.02, slots: 60 },
    { code: 'IAD', name: 'Washington Dulles', city: 'Washington DC', country: 'USA', region: 'North America', passengers: 25000000, hub: false, lat: 38.95, lon: -77.46, slots: 60 },
    { code: 'DEN', name: 'Denver Intl', city: 'Denver', country: 'USA', region: 'North America', passengers: 69000000, hub: false, lat: 39.86, lon: -104.67, slots: 70 },
    { code: 'LAS', name: 'Harry Reid Intl', city: 'Las Vegas', country: 'USA', region: 'North America', passengers: 52000000, hub: false, lat: 36.08, lon: -115.15, slots: 60 },
    { code: 'MSP', name: 'Minneapolis-Saint Paul', city: 'Minneapolis', country: 'USA', region: 'North America', passengers: 38000000, hub: false, lat: 44.88, lon: -93.22, slots: 60 },
    { code: 'DTW', name: 'Detroit Metro', city: 'Detroit', country: 'USA', region: 'North America', passengers: 36000000, hub: false, lat: 42.21, lon: -83.35, slots: 60 },
    { code: 'CLT', name: 'Charlotte Douglas', city: 'Charlotte', country: 'USA', region: 'North America', passengers: 48000000, hub: false, lat: 35.21, lon: -80.94, slots: 60 },
    { code: 'EWR', name: 'Newark Liberty', city: 'Newark', country: 'USA', region: 'North America', passengers: 46000000, hub: false, lat: 40.69, lon: -74.17, slots: 60 },
    { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', country: 'USA', region: 'North America', passengers: 47000000, hub: false, lat: 33.44, lon: -112.01, slots: 60 },
    { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA', region: 'North America', passengers: 45000000, hub: false, lat: 29.98, lon: -95.34, slots: 60 },

    // EUROPE
    { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', region: 'Europe', passengers: 80000000, hub: true, lat: 51.47, lon: -0.46, slots: 100 },
    { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', region: 'Europe', passengers: 76000000, hub: true, lat: 49.01, lon: 2.55, slots: 100 },
    { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', region: 'Europe', passengers: 70000000, hub: true, lat: 50.03, lon: 8.57, slots: 100 },
    { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', passengers: 72000000, hub: true, lat: 52.31, lon: 4.77, slots: 100 },
    { code: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Spain', region: 'Europe', passengers: 60000000, hub: false, lat: 40.47, lon: -3.56, slots: 80 },
    { code: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain', region: 'Europe', passengers: 52000000, hub: false, lat: 41.30, lon: 2.08, slots: 70 },
    { code: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', region: 'Europe', passengers: 43000000, hub: false, lat: 41.80, lon: 12.25, slots: 70 },
    { code: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', region: 'Europe', passengers: 48000000, hub: false, lat: 48.35, lon: 11.79, slots: 70 },
    { code: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'Turkey', region: 'Europe', passengers: 76000000, hub: true, lat: 41.27, lon: 28.74, slots: 100 },
    { code: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland', region: 'Europe', passengers: 31000000, hub: false, lat: 47.46, lon: 8.55, slots: 50 },
    { code: 'VIE', name: 'Vienna', city: 'Vienna', country: 'Austria', region: 'Europe', passengers: 31000000, hub: false, lat: 48.11, lon: 16.57, slots: 50 },
    { code: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', region: 'Europe', passengers: 30000000, hub: false, lat: 55.62, lon: 12.66, slots: 50 },
    { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', region: 'Europe', passengers: 28000000, hub: false, lat: 60.19, lon: 11.10, slots: 40 },
    { code: 'ARN', name: 'Arlanda', city: 'Stockholm', country: 'Sweden', region: 'Europe', passengers: 27000000, hub: false, lat: 59.65, lon: 17.94, slots: 40 },
    { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', region: 'Europe', passengers: 32000000, hub: false, lat: 53.43, lon: -6.27, slots: 50 },
    { code: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal', region: 'Europe', passengers: 31000000, hub: false, lat: 38.78, lon: -9.13, slots: 50 },

    // ASIA
    { code: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'UAE', region: 'Asia', passengers: 87000000, hub: true, lat: 25.25, lon: 55.36, slots: 100 },
    { code: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', region: 'Asia', passengers: 68000000, hub: true, lat: 1.35, lon: 103.99, slots: 100 },
    { code: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', country: 'China', region: 'Asia', passengers: 71000000, hub: true, lat: 22.31, lon: 113.91, slots: 100 },
    { code: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', region: 'Asia', passengers: 44000000, hub: false, lat: 35.77, lon: 140.39, slots: 70 },
    { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', region: 'Asia', passengers: 85000000, hub: true, lat: 35.55, lon: 139.78, slots: 90 },
    { code: 'ICN', name: 'Incheon Intl', city: 'Seoul', country: 'South Korea', region: 'Asia', passengers: 71000000, hub: true, lat: 37.46, lon: 126.44, slots: 90 },
    { code: 'PEK', name: 'Beijing Capital', city: 'Beijing', country: 'China', region: 'Asia', passengers: 100000000, hub: true, lat: 40.08, lon: 116.58, slots: 100 },
    { code: 'PVG', name: 'Pudong', city: 'Shanghai', country: 'China', region: 'Asia', passengers: 76000000, hub: true, lat: 31.14, lon: 121.81, slots: 90 },
    { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', region: 'Asia', passengers: 65000000, hub: false, lat: 13.69, lon: 100.75, slots: 80 },
    { code: 'DEL', name: 'Indira Gandhi Intl', city: 'Delhi', country: 'India', region: 'Asia', passengers: 73000000, hub: false, lat: 28.57, lon: 77.10, slots: 80 },
    { code: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'India', region: 'Asia', passengers: 49000000, hub: false, lat: 19.09, lon: 72.87, slots: 70 },
    { code: 'KUL', name: 'Kuala Lumpur Intl', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', passengers: 48000000, hub: false, lat: 2.75, lon: 101.70, slots: 60 },
    { code: 'CAN', name: 'Guangzhou Baiyun', city: 'Guangzhou', country: 'China', region: 'Asia', passengers: 63000000, hub: false, lat: 23.39, lon: 113.30, slots: 70 },

    // MIDDLE EAST
    { code: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'Qatar', region: 'Middle East', passengers: 46000000, hub: true, lat: 25.27, lon: 51.61, slots: 80 },

    // SOUTH AMERICA
    { code: 'GRU', name: 'Guarulhos', city: 'Sao Paulo', country: 'Brazil', region: 'South America', passengers: 41000000, hub: false, lat: -23.43, lon: -46.47, slots: 70 },
    { code: 'EZE', name: 'Ezeiza', city: 'Buenos Aires', country: 'Argentina', region: 'South America', passengers: 14000000, hub: false, lat: -34.82, lon: -58.54, slots: 50 },
    { code: 'BOG', name: 'El Dorado', city: 'Bogota', country: 'Colombia', region: 'South America', passengers: 35000000, hub: false, lat: 4.70, lon: -74.15, slots: 50 },
    { code: 'SCL', name: 'Arturo Merino Benitez', city: 'Santiago', country: 'Chile', region: 'South America', passengers: 22000000, hub: false, lat: -33.39, lon: -70.79, slots: 40 },
    { code: 'LIM', name: 'Jorge Chavez', city: 'Lima', country: 'Peru', region: 'South America', passengers: 25000000, hub: false, lat: -12.02, lon: -77.11, slots: 40 },

    // AFRICA
    { code: 'JNB', name: 'O.R. Tambo Intl', city: 'Johannesburg', country: 'South Africa', region: 'Africa', passengers: 21000000, hub: false, lat: -26.13, lon: 28.24, slots: 50 },
    { code: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'Egypt', region: 'Africa', passengers: 22000000, hub: false, lat: 30.12, lon: 31.41, slots: 50 },
    { code: 'ADD', name: 'Bole Intl', city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', passengers: 15000000, hub: false, lat: 8.98, lon: 38.80, slots: 40 },

    // OCEANIA
    { code: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', region: 'Oceania', passengers: 44000000, hub: true, lat: -33.95, lon: 151.18, slots: 80 },
    { code: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Australia', region: 'Oceania', passengers: 37000000, hub: false, lat: -37.67, lon: 144.84, slots: 60 },
    { code: 'AKL', name: 'Auckland', city: 'Auckland', country: 'New Zealand', region: 'Oceania', passengers: 21000000, hub: false, lat: -37.01, lon: 174.79, slots: 40 },
];

export const REGIONS = ['North America', 'Europe', 'Asia', 'Middle East', 'South America', 'Africa', 'Oceania'];

export function getAirport(code) {
    return AIRPORTS.find(a => a.code === code);
}

export function getAirportsByRegion(region) {
    return AIRPORTS.filter(a => a.region === region);
}
