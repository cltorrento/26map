// RealTimeTranslatorApp/src/services/translationService.ts

// --- Configuration for Microsoft Translator API ---
// IMPORTANT: Replace this placeholder with your actual Microsoft Translator API key (Subscription Key).
// You can obtain a key from the Azure portal by creating a Translator resource.
const DEFAULT_TRANSLATOR_API_KEY = 'YOUR_MICROSOFT_TRANSLATOR_API_KEY';

// Specify the region for your Translator resource if it's not global.
// For global resources, 'global' can be used, but it's often better to specify the region.
const TRANSLATOR_REGION = 'global'; 

// Standard endpoint for the Microsoft Translator API v3.
const TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

/**
 * Custom error class for translation-specific errors.
 * Allows distinguishing translation errors from other types of errors.
 */
export class TranslationError extends Error {
  /**
   * Creates an instance of TranslationError.
   * @param {string} message - The error message.
   * @param {boolean} [isConfigurationError=false] - Indicates if the error is due to missing or invalid configuration (e.g., API key).
   */
  constructor(message: string, public isConfigurationError: boolean = false) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * Interface for the expected structure of a successful translation response item from the API.
 */
interface TranslationResponseItem {
  translations: {
    text: string;
    to: string;
  }[];
  detectedLanguage?: {
    language: string;
    score: number;
  };
}

/**
 * Interface for the expected structure of an error response from the API.
 */
interface TranslationErrorResponse { 
  error: {
    code: number;
    message: string;
  }
}

/**
 * Translates text using the Microsoft Translator API.
 * @async
 * @param {string} text - The text to translate.
 * @param {string} [targetLang='en'] - The target language code (e.g., 'en', 'es', 'fr'). Defaults to 'en'.
 * @param {string} [sourceLang] - Optional. The source language code. If not provided, the API will attempt auto-detection.
 * @param {string} [apiKey=DEFAULT_TRANSLATOR_API_KEY] - Optional. The API key for Microsoft Translator. Defaults to the placeholder key.
 * @returns {Promise<string>} A promise that resolves to the translated text.
 * @throws {TranslationError} If the translation fails, including specific errors for API key configuration or API issues.
 */
export const translateText = async (
  text: string,
  targetLang: string = 'en',
  sourceLang?: string,
  apiKey: string = DEFAULT_TRANSLATOR_API_KEY 
): Promise<string> => {
  // Check if the API key is the placeholder or missing.
  if (!apiKey || apiKey === 'YOUR_MICROSOFT_TRANSLATOR_API_KEY') {
    const configErrorMessage = 'API key not configured or is placeholder. Please set your Microsoft Translator API key in translationService.ts.';
    console.warn(`Translation Service: ${configErrorMessage}`);
    // Throw a specific error for configuration issues.
    throw new TranslationError(configErrorMessage, true);
  }

  // Construct the API request URL.
  let url = `${TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLang}`;
  if (sourceLang) {
    url += `&from=${sourceLang}`;
  }

  const requestBody = [{ Text: text }];

  try {
    // Make the POST request to the Translator API.
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey, 
        'Ocp-Apim-Subscription-Region': TRANSLATOR_REGION, 
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle non-successful HTTP responses.
    if (!response.ok) {
      let errorData: TranslationErrorResponse | null = null;
      try {
        // Attempt to parse the error response body as JSON.
        errorData = await response.json() as TranslationErrorResponse;
      } catch (e) {
        console.error('Translation API: Could not parse error response JSON', e);
      }
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      console.error('Translation API Error:', response.status, errorMessage, errorData);
      throw new TranslationError(`Translation failed: ${errorMessage} (Status: ${response.status})`);
    }

    // Parse the successful JSON response.
    const responseBody: TranslationResponseItem[] = await response.json();
    
    // Validate the structure of the response and extract the translated text.
    if (responseBody && responseBody.length > 0 && responseBody[0].translations && responseBody[0].translations.length > 0) {
      return responseBody[0].translations[0].text;
    } else {
      console.error('Translation result empty or unexpected format:', responseBody);
      throw new TranslationError('Translation result is empty or in an unexpected format.');
    }
  } catch (error) {
    // Catch network errors or other issues during the fetch/processing.
    console.error('Error during translation request execution:', error);
    if (error instanceof TranslationError) { 
      throw error; // Re-throw known TranslationError instances.
    }
    // Wrap other errors in a TranslationError for consistent error handling.
    throw new TranslationError(`An unexpected error occurred during translation: ${error instanceof Error ? error.message : String(error)}`);
  }
};
