import { translateText, TranslationError } from './translationService';

// Mock global.fetch
global.fetch = jest.fn();

const PLACEHOLDER_API_KEY = 'YOUR_MICROSOFT_TRANSLATOR_API_KEY';
const MOCK_VALID_API_KEY = 'VALID_API_KEY_FOR_TESTING';

// Helper to create a mock fetch response
const mockFetchResponse = (data: any, ok: boolean = true, status: number = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
};

describe('translationService', () => {
  
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  describe('translateText with a valid API key', () => {
    it('should return translated text on successful API call', async () => {
      (global.fetch as jest.Mock).mockReturnValueOnce(mockFetchResponse([{ translations: [{ text: 'Hola', to: 'es' }] }]));
      
      const result = await translateText('Hello', 'es', 'en', MOCK_VALID_API_KEY);
      expect(result).toBe('Hola');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=es&from=en',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': MOCK_VALID_API_KEY,
          }),
        }),
      );
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should throw TranslationError on API error (e.g., 400)', async () => {
      const errorResponse = { error: { code: 400000, message: 'Invalid target language' } };
      (global.fetch as jest.Mock).mockReturnValueOnce(mockFetchResponse(errorResponse, false, 400));
      
      await expect(translateText('Hello', 'invalid-lang', 'en', MOCK_VALID_API_KEY)).rejects.toThrow(
        'Translation failed: Invalid target language (Status: 400)'
      );
      expect(console.warn).not.toHaveBeenCalled();
    });
    
    it('should throw TranslationError when API returns non-JSON error response', async () => {
      (global.fetch as jest.Mock).mockReturnValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON at position 0")), // Simulate HTML error page
      } as Response);

      await expect(translateText('Hello', 'es', 'en', MOCK_VALID_API_KEY)).rejects.toThrow(
        'Translation failed: HTTP error 500 (Status: 500)'
      );
       expect(console.warn).not.toHaveBeenCalled();
    });

    it('should throw TranslationError on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));
      
      await expect(translateText('Hello', 'es', 'en', MOCK_VALID_API_KEY)).rejects.toThrow(
        'An unexpected error occurred during translation: Network request failed'
      );
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('translateText with placeholder or default API key', () => {
    it('should throw TranslationError with isConfigurationError=true if API key is the default placeholder', async () => {
      // This test calls translateText without the 4th apiKey argument, so it uses the default.
      await expect(translateText('Hello', 'es')).rejects.toThrow(TranslationError);
      try {
        await translateText('Hello', 'es');
      } catch (e: any) {
        expect(e.message).toContain('API key not configured or is placeholder.');
        expect(e.isConfigurationError).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Translation Service: API key not configured or is placeholder.'));
      }
    });

    it('should throw TranslationError with isConfigurationError=true if API key is explicitly the placeholder string', async () => {
      await expect(translateText('Hello', 'es', 'en', PLACEHOLDER_API_KEY)).rejects.toThrow(TranslationError);
      try {
        await translateText('Hello', 'es', 'en', PLACEHOLDER_API_KEY);
      } catch (e: any) {
        expect(e.message).toContain('API key not configured or is placeholder.');
        expect(e.isConfigurationError).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Translation Service: API key not configured or is placeholder.'));
      }
    });
  });

   it('should correctly construct URL without sourceLang if not provided (valid key)', async () => {
      (global.fetch as jest.Mock).mockReturnValueOnce(mockFetchResponse([{ translations: [{ text: 'Hola', to: 'es' }] }]));
      await translateText('Hello', 'es', undefined, MOCK_VALID_API_KEY);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=es',
        expect.anything()
      );
    });
});
