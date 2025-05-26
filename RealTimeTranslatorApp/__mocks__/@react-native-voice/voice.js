// RealTimeTranslatorApp/__mocks__/@react-native-voice/voice.js
export default {
  onSpeechStart: jest.fn(),
  onSpeechRecognized: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechError: jest.fn(),
  onSpeechResults: jest.fn(),
  onSpeechPartialResults: jest.fn(),
  onSpeechVolumeChanged: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  removeAllListeners: jest.fn(),
  // Add any other methods from the library that your components might call
};
