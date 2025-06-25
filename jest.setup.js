// Jest setup file
// Add any global test configuration here

// Mock DOM for testing frontend JavaScript
global.document = {
  getElementById: jest.fn(() => ({
    addEventListener: jest.fn(),
    click: jest.fn(),
    style: {},
    value: "",
    innerHTML: "",
    textContent: "",
  })),
  querySelector: jest.fn(() => ({
    addEventListener: jest.fn(),
    click: jest.fn(),
    style: {},
    value: "",
    innerHTML: "",
    textContent: "",
  })),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    style: {},
    innerHTML: "",
    textContent: "",
  })),
  addEventListener: jest.fn(),
  body: {
    appendChild: jest.fn(),
    style: {},
  },
};

global.window = {
  location: {
    href: "",
    pathname: "",
    search: "",
    hash: "",
  },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  alert: jest.fn(),
  confirm: jest.fn(),
  addEventListener: jest.fn(),
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
