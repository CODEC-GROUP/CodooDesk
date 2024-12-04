import '@testing-library/jest-dom';

// Mock the Electron IPC
const mockIpcRenderer = {
  send: jest.fn(),
  on: jest.fn(),
  invoke: jest.fn(),
};

jest.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
