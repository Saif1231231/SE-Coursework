/**
 * External API Service
 * Provides integration with third-party APIs for weather, geocoding, etc.
 */

const https = require('https');

/**
 * Get weather forecast for a location
 * @param {string} location - Location name or coordinates
 * @returns {Promise<Object>} Weather data
 */
async function getWeatherForecast(location) {
  try {
    // This is a mock implementation - in a real app, you would use a proper API key
    // Example using OpenWeatherMap API: https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}
    
    // For demo purposes, we'll return mock data
    return simulateApiCall({
      location: location,
      current: {
        temp: 19.5,
        conditions: 'Partly Cloudy',
        wind_speed: 12,
        precipitation_chance: 20,
        is_rainy: false
      },
      forecast: [
        { day: 'Today', high: 21, low: 15, conditions: 'Partly Cloudy' },
        { day: 'Tomorrow', high: 24, low: 17, conditions: 'Sunny' }
      ]
    });
  } catch (error) {
    console.error('Weather API error:', error);
    throw error;
  }
}

/**
 * Get geocoding information for a location
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} Geocoding data with coordinates
 */
async function geocodeAddress(address) {
  try {
    // This is a mock implementation - in a real app, you would use a proper API key
    // Example using Google Maps API: https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${API_KEY}
    
    // For demo purposes, we'll return mock data based on the address input
    const mockGeocodeData = {
      'London': { lat: 51.5074, lng: -0.1278 },
      'Manchester': { lat: 53.4808, lng: -2.2426 },
      'Birmingham': { lat: 52.4862, lng: -1.8904 },
      'Leeds': { lat: 53.8008, lng: -1.5491 },
      'Edinburgh': { lat: 55.9533, lng: -3.1883 },
      'Glasgow': { lat: 55.8642, lng: -4.2518 },
      'Liverpool': { lat: 53.4084, lng: -2.9916 },
      'Oxford': { lat: 51.7520, lng: -1.2577 },
      'Cambridge': { lat: 52.2053, lng: 0.1218 },
      'Cardiff': { lat: 51.4816, lng: -3.1791 },
      'Bristol': { lat: 51.4545, lng: -2.5879 },
      'Nottingham': { lat: 52.9548, lng: -1.1581 },
      'Sheffield': { lat: 53.3811, lng: -1.4701 },
      'Newcastle': { lat: 54.9783, lng: -1.6178 },
      'Sunderland': { lat: 54.9066, lng: -1.3833 },
      'Brighton': { lat: 50.8225, lng: -0.1372 },
      'Portsmouth': { lat: 50.8058, lng: -1.0872 },
      'Leicester': { lat: 52.6369, lng: -1.1398 },
      'Coventry': { lat: 52.4068, lng: -1.5197 }
    };
    
    // Look for the address in our mock data
    for (const city in mockGeocodeData) {
      if (address.toLowerCase().includes(city.toLowerCase())) {
        return simulateApiCall({
          input: address,
          formatted_address: city,
          coordinates: mockGeocodeData[city],
          bounds: {
            northeast: {
              lat: mockGeocodeData[city].lat + 0.05,
              lng: mockGeocodeData[city].lng + 0.05
            },
            southwest: {
              lat: mockGeocodeData[city].lat - 0.05,
              lng: mockGeocodeData[city].lng - 0.05
            }
          }
        });
      }
    }
    
    // If no match, return generic UK coordinates
    return simulateApiCall({
      input: address,
      formatted_address: 'Unknown Location',
      coordinates: { lat: 54.7023, lng: -3.2765 }, // UK center point
      bounds: null
    });
  } catch (error) {
    console.error('Geocoding API error:', error);
    throw error;
  }
}

/**
 * Calculate distance between two locations
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Promise<Object>} Distance and duration data
 */
async function calculateDistance(origin, destination) {
  try {
    // This is a mock implementation - in a real app, you would use a proper API
    // Example using Google Distance Matrix API
    
    // Calculate aerial distance (using Haversine formula)
    const distance = haversineDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );
    
    // Mock duration (assume average speed of 50 km/h)
    const durationMinutes = Math.round(distance * 60 / 50);
    
    return simulateApiCall({
      origin: origin,
      destination: destination,
      distance: {
        text: `${distance.toFixed(1)} km`,
        value: Math.round(distance * 1000) // meters
      },
      duration: {
        text: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        value: durationMinutes * 60 // seconds
      }
    });
  } catch (error) {
    console.error('Distance Matrix API error:', error);
    throw error;
  }
}

/**
 * Helper function to calculate distance between coordinates using Haversine formula
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Helper function to simulate an API call with a small delay
 * @param {Object} data - Response data
 * @returns {Promise<Object>} Simulated API response
 */
function simulateApiCall(data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Log API usage
      logApiUsage({
        api: 'mock-api',
        endpoint: 'simulate',
        timestamp: new Date(),
        success: true,
        responseTime: 200
      });
      
      resolve(data);
    }, 200); // Simulate 200ms network delay
  });
}

/**
 * Log API usage for monitoring and potential rate limiting
 * @param {Object} logData - Log data
 * @param {string} logData.api - API name
 * @param {string} logData.endpoint - API endpoint
 * @param {Date} logData.timestamp - Timestamp
 * @param {boolean} logData.success - Whether the call was successful
 * @param {number} logData.responseTime - Response time in ms
 */
function logApiUsage(logData) {
  // In a real app, this would log to a database or monitoring service
  // For this demo, we'll just log to console
  console.log(`[API Usage] ${logData.timestamp.toISOString()} | ${logData.api}/${logData.endpoint} | Success: ${logData.success} | Response time: ${logData.responseTime}ms`);
  
  // Store in memory for basic rate limiting
  // In a real app, this would be stored in Redis or a similar service
  const key = `${logData.api}:${logData.endpoint}`;
  apiCallCounts[key] = (apiCallCounts[key] || 0) + 1;
}

// Simple in-memory tracking of API calls for basic rate limiting
const apiCallCounts = {};

/**
 * Check if an API call would exceed rate limits
 * @param {string} api - API name
 * @param {string} endpoint - API endpoint
 * @returns {boolean} Whether the call would exceed rate limits
 */
function wouldExceedRateLimit(api, endpoint) {
  const key = `${api}:${endpoint}`;
  const count = apiCallCounts[key] || 0;
  
  // Reset counters older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (lastRateLimitReset < oneHourAgo) {
    for (const k in apiCallCounts) {
      apiCallCounts[k] = 0;
    }
    lastRateLimitReset = Date.now();
  }
  
  // Simple rate limit example - in a real app you'd use more sophisticated limits
  // For this demo, limit to 100 calls per hour per endpoint
  return count >= 100;
}

// Track when we last reset rate limit counters
let lastRateLimitReset = Date.now();

module.exports = {
  getWeatherForecast,
  geocodeAddress,
  calculateDistance,
  logApiUsage
}; 