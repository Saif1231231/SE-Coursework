// Import Jest DOM matchers
require('@testing-library/jest-dom');

// Setup DOM environment for testing
document.body.innerHTML = `
  <div id="app"></div>
`;

// Mock fetch API
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(""),
  })
);

// Create style mock
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 