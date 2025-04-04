/**
 * Utility functions for frontend component testing
 */

/**
 * Simulates a delay for async operations
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after the specified delay
 */
const wait = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Creates a mock response object for fetch mocking
 * @param {Object} data - Data to include in the response
 * @param {Object} options - Additional response options
 * @returns {Object} - Mock response object
 */
const createMockResponse = (data, options = {}) => {
  return {
    ok: options.ok !== undefined ? options.ok : true,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(options.headers || {}),
  };
};

/**
 * Sets up a mock for the fetch API
 * @param {Object} responseData - Data for the response
 * @param {Object} options - Additional response options
 */
const mockFetch = (responseData, options = {}) => {
  global.fetch = jest.fn().mockResolvedValue(
    createMockResponse(responseData, options)
  );
};

/**
 * Sets up an error mock for the fetch API
 * @param {number} status - HTTP status code for the error
 * @param {string} statusText - Status text message
 */
const mockFetchError = (status = 500, statusText = 'Internal Server Error') => {
  global.fetch = jest.fn().mockResolvedValue(
    createMockResponse({}, { ok: false, status, statusText })
  );
};

/**
 * Creates a mock event object
 * @param {string} type - Event type
 * @param {Object} overrides - Additional event properties
 * @returns {Object} - Mock event object
 */
const createMockEvent = (type = 'click', overrides = {}) => {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    type,
    target: document.createElement('div'),
    currentTarget: document.createElement('div'),
    ...overrides,
  };
};

/**
 * Finds all elements matching the specified selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} container - Container element (defaults to document)
 * @returns {Array} - Array of matching elements
 */
const queryAll = (selector, container = document) => {
  return Array.from(container.querySelectorAll(selector));
};

/**
 * Finds the first element matching the specified selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} container - Container element (defaults to document)
 * @returns {HTMLElement|null} - Matching element or null
 */
const query = (selector, container = document) => {
  return container.querySelector(selector);
};

// Export all utilities
module.exports = {
  wait,
  createMockResponse,
  mockFetch,
  mockFetchError,
  createMockEvent,
  queryAll,
  query
}; 