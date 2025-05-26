import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import {translateText} from '../services/translationService';

/**
 * Helper function to generate more user-friendly speech error messages
 * from the error object provided by react-native-voice.
 * @param {any} errorObj - The error object from react-native-voice.
 * @returns {string} A user-friendly error message string.
 */
const getFriendlySpeechErrorMessage = (errorObj: any): string => {
  if (!errorObj) return 'Unknown speech error.';
  
  // Log the full error object for debugging if needed.
  // console.log('Raw Speech Error Object:', JSON.stringify(errorObj));

  let message = 'Speech recognition failed. Please try again.'; // Default message
  
  // Extract message from common error structures.
  if (typeof errorObj === 'string') {
    message = errorObj;
  } else if (errorObj.message) {
    message = errorObj.message;
  } else if (errorObj.errorDescription) { // iOS specific field
    message = errorObj.errorDescription;
  }

  // Map common error scenarios to more specific user-friendly messages.
  // Note: Exact error messages/codes can vary by platform and library version.
  const lowerCaseMessage = message.toLowerCase();
  if (lowerCaseMessage.includes('permission') || lowerCaseMessage.includes('denied')) {
    return 'Microphone permission denied. Please enable it in your device settings.';
  }
  if (lowerCaseMessage.includes('network') || lowerCaseMessage.includes('connection')) {
    return 'Network error. Please check your internet connection.';
  }
  if (lowerCaseMessage.includes('no match') || lowerCaseMessage.includes('nomatch')) {
    return 'No speech was recognized. Please try speaking louder and clearer.';
  }
  if (lowerCaseMessage.includes('timeout') || lowerCaseMessage.includes('speech timeout')) {
    return 'No speech detected for a while. Please try again.';
  }
  if (lowerCaseMessage.includes('server')) {
    return 'There was an issue with the speech recognition server. Please try again later.';
  }
  if (lowerCaseMessage.includes('busy') || lowerCaseMessage.includes('recognizer is busy')) {
    return 'Speech recognizer is busy. Please try again in a moment.';
  }
  if (lowerCaseMessage.includes('engine')) {
    return 'Speech recognition engine error. Please ensure your device supports speech recognition.';
  }

  // For very long or unclassified errors, provide a generic message.
  return message.length > 120 ? 'Speech recognition error. Please try again.' : message;
};

/**
 * MainScreen component for the Real-Time Voice Translator application.
 * Handles voice input, displays transcribed text, translates it to English,
 * and shows the translated text.
 */
const MainScreen = () => {
  // --- State Variables ---
  // Speech recognition states
  const [recognized, setRecognized] = useState(''); // Visual cue for recognition event (e.g., '√')
  const [pitch, setPitch] = useState(''); // Current voice pitch (optional display)
  const [speechError, setSpeechError] = useState(''); // Stores speech recognition error messages
  const [speechEnd, setSpeechEnd] = useState(''); // Visual cue for speech end event
  const [started, setStarted] = useState(false); // True if speech recognition is active
  const [results, setResults] = useState<string[]>([]); // Final transcription results from speech-to-text
  const [partialResults, setPartialResults] = useState<string[]>([]); // Partial (live) transcription results

  // Translation states
  const [translatedText, setTranslatedText] = useState(''); // Stores the translated text
  const [isTranslating, setIsTranslating] = useState(false); // True if translation is in progress
  const [translationError, setTranslationError] = useState(''); // Stores translation error messages

  // --- Effects ---
  /**
   * Sets up and tears down listeners for react-native-voice events.
   */
  useEffect(() => {
    // Register event handlers for speech recognition
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

    // Cleanup function: remove all listeners when the component unmounts.
    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(e => console.error("Error destroying voice recognizer on unmount", e));
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  // --- Permission Handling ---
  /**
   * Requests microphone permission on Android.
   * For iOS, permissions are typically handled via Info.plist.
   * @returns {Promise<boolean>} True if permission is granted, false otherwise.
   */
  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for speech recognition.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
            buttonNeutral: 'Ask Me Later' // Optional: allows user to defer decision
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission granted');
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
          setSpeechError('Microphone permission denied by user.');
          return false;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setSpeechError('Microphone permission permanently denied. Please enable it in app settings.');
          return false;
        }
        return false;
      } catch (err) {
        console.warn('Error requesting microphone permission:', err);
        setSpeechError('An error occurred while requesting microphone permission.');
        return false;
      }
    }
    return true; // Assume granted for non-Android platforms (iOS permission is via Info.plist)
  };

  // --- Speech Event Handlers ---
  /** Handler for the speech start event. Clears previous results and errors. */
  const onSpeechStart = (e: any) => {
    console.log('onSpeechStart: ', e);
    setStarted(true);
    setSpeechEnd('');
    setRecognized('');
    setSpeechError('');
    setPartialResults([]);
    setResults([]);
    setTranslatedText('');
    setTranslationError('');
  };

  /** Handler for speech recognized event (often partial, not final). */
  const onSpeechRecognized = (e: any) => {
    console.log('onSpeechRecognized: ', e);
    setRecognized('√'); // Indicates some recognition occurred
  };

  /** Handler for speech end event. */
  const onSpeechEnd = (e: any) => {
    console.log('onSpeechEnd: ', e);
    setSpeechEnd('√');
    setStarted(false); // Mark recognition as stopped
  };

  /** Handler for speech recognition errors. */
  const onSpeechError = (e: any) => {
    console.log('onSpeechError (raw object): ', e);
    const friendlyMessage = getFriendlySpeechErrorMessage(e.error);
    setSpeechError(friendlyMessage);
    setStarted(false);
    setIsTranslating(false); // Stop any pending translation
  };

  /** 
   * Handler for final speech recognition results. 
   * Triggers translation of the recognized text.
   */
  const onSpeechResults = async (e: any) => {
    console.log('onSpeechResults: ', e);
    if (e.value && e.value.length > 0) {
      const bestResult = e.value[0]; // Use the most likely transcription
      setResults(e.value);
      setPartialResults([]); // Clear partial results as final ones are available

      if (bestResult) {
        setIsTranslating(true);
        setTranslatedText('');
        setTranslationError('');
        try {
          // Translate the recognized text to English.
          const translation = await translateText(bestResult, 'en'); 
          setTranslatedText(translation);
        } catch (transErr: any) {
          console.error('Translation error:', transErr);
          setTranslationError(transErr.message || 'Translation failed. Please try again.');
        } finally {
          setIsTranslating(false);
        }
      }
    } else {
      setSpeechError('No recognizable speech detected in final results.');
    }
  };

  /** Handler for partial speech recognition results (live updates). */
  const onSpeechPartialResults = (e: any) => {
    console.log('onSpeechPartialResults: ', e);
    if (e.value) {
      setPartialResults(e.value);
    }
  };

  /** Handler for changes in recognized speech volume/pitch. */
  const onSpeechVolumeChanged = (e: any) => {
    // setPitch(e.value ? e.value.toString() : ''); // Optional: display pitch
  };

  // --- Control Functions ---
  /** 
   * Starts the speech recognition process. 
   * Requests permission if needed and clears previous state.
   */
  const _startRecognizing = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      // Error message is set by requestAudioPermission
      return; 
    }
    // Clear all relevant states before starting a new session
    setRecognized('');
    setPitch('');
    setSpeechError('');
    setResults([]);
    setPartialResults([]);
    setSpeechEnd('');
    setTranslatedText('');
    setTranslationError('');
    setIsTranslating(false);
    
    try {
      // Start listening, assuming input is US English for speech recognition.
      // Other locales can be specified, e.g., 'es-ES'.
      await Voice.start('en-US'); 
      setStarted(true); 
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setSpeechError(getFriendlySpeechErrorMessage(err));
      setStarted(false);
    }
  };

  /** Stops the current speech recognition process. */
  const _stopRecognizing = async () => {
    try {
      await Voice.stop();
      // onSpeechEnd will typically set setStarted(false)
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
      setSpeechError(getFriendlySpeechErrorMessage(e));
    }
  };

  /** Cancels the current speech recognition process. */
  const _cancelRecognizing = async () => {
    try {
      await Voice.cancel();
    } catch (e) {
      console.error('Error cancelling speech recognition:', e);
      setSpeechError(getFriendlySpeechErrorMessage(e));
    } finally {
      setStarted(false); // Ensure UI reflects cancellation
      setIsTranslating(false);
    }
  };

  /** 
   * Resets the component state and destroys the voice recognizer instance.
   * Useful for clearing all data and starting fresh.
   */
  const _resetState = async () => {
    try {
      if(started) { // If recognition is active, try to stop it first
        await Voice.stop();
      }
      await Voice.destroy(); // Destroys the recognizer instance and removes listeners
    } catch (e) {
      console.error('Error destroying voice recognizer:', e);
      setSpeechError(getFriendlySpeechErrorMessage(e)); // Display error if destroy fails
    }
    // Reset all component states to initial values
    setRecognized('');
    setPitch('');
    setSpeechError(''); 
    setResults([]);
    setPartialResults([]);
    setSpeechEnd('');
    setStarted(false);
    setTranslatedText('');
    setTranslationError('');
    setIsTranslating(false);
  };

  // --- UI Rendering ---
  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.welcomeTitle}>Real-Time Voice Translator</Text>
        <Text style={styles.instructionsText}>
          Press 'Start Recording' and speak. Your speech will be transcribed and then translated into English.
        </Text>
      </View>

      {/* Status Display Section */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Status</Text>
        {started && !speechError && <Text style={styles.statusListening}>Listening...</Text>}
        {speechError && <Text style={styles.statusError}>Speech Error!</Text>}
        {!started && !speechError && <Text style={styles.statusIdle}>Idle</Text>}
        {speechError ? <Text style={styles.errorDetailsText}>{speechError}</Text> : null}
      </View>

      {/* Control Buttons Section */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity 
          style={[styles.button, started ? styles.buttonDisabled : styles.buttonPrimary]} 
          onPress={_startRecognizing} 
          disabled={started}>
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, !started ? styles.buttonDisabled : styles.buttonSecondary]} 
          onPress={_stopRecognizing} 
          disabled={!started}>
          <Text style={styles.buttonText}>Stop Recording</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonsRow}>
         <TouchableOpacity 
          style={[styles.button, !started ? styles.buttonDisabled : styles.buttonWarning]} 
          onPress={_cancelRecognizing} 
          disabled={!started}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.buttonNeutral]} 
          onPress={_resetState}>
          <Text style={styles.buttonText}>Clear & Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Transcription Display Section */}
      <View style={styles.transcriptionSection}>
        <Text style={styles.sectionTitle}>Original Transcription (Detected Speech)</Text>
        <View style={styles.textDisplayBox}>
          {partialResults.length > 0 && results.length === 0 && (
            <Text style={styles.transcriptionText}>{partialResults.join(' ')} (live)</Text>
          )}
          {results.length > 0 && (
            <Text style={styles.transcriptionText}>{results[0]}</Text>
          )}
          {!started && partialResults.length === 0 && results.length === 0 && !speechError && (
            <Text style={styles.placeholderText}>Speak to see transcription here...</Text>
          )}
           {started && partialResults.length === 0 && results.length === 0 && !speechError && (
            <Text style={styles.placeholderText}>Listening for speech...</Text>
          )}
          {speechError && results.length === 0 && ( // Show speech error in this box if no results
             <Text style={styles.errorInBoxText}>Could not transcribe: {speechError}</Text>
          )}
        </View>
      </View>

      {/* Translation Display Section */}
      <View style={styles.translationSection}>
        <Text style={styles.sectionTitle}>Translated Text (English)</Text>
        <View style={styles.textDisplayBox}>
          {isTranslating && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}
          {translationError && <Text style={styles.errorInBoxText}>{translationError}</Text>}
          {!isTranslating && !translationError && translatedText ? (
            <Text style={styles.translationOutputText}>{translatedText}</Text>
          ) : ( // Show relevant placeholder based on state
            !isTranslating && !translationError && !results[0] && !speechError && 
            <Text style={styles.placeholderText}>Waiting for original text...</Text>
          )}
           {!isTranslating && !translationError && results[0] && !translatedText && !translationError && (
            <Text style={styles.placeholderText}>Translation will appear here...</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    padding: 15,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#343A40',
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 8,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  statusListening: { fontSize: 18, color: '#28A745', fontWeight: 'bold' },
  statusError: { fontSize: 18, color: '#DC3545', fontWeight: 'bold' },
  statusIdle: { fontSize: 18, color: '#6C757D' },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    minWidth: '46%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonSecondary: { backgroundColor: '#FF3B30' },
  buttonWarning: { backgroundColor: '#FF9500' },
  buttonNeutral: { backgroundColor: '#5A6268' },
  buttonDisabled: { backgroundColor: '#CED4DA' },
  
  transcriptionSection: {
    marginBottom: 15,
    width: '100%',
  },
  translationSection: {
    marginBottom: 15,
    width: '100%',
  },
  textDisplayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
  },
  transcriptionText: {
    fontSize: 17,
    color: '#212529',
    textAlign: 'center',
  },
  translationOutputText: {
    fontSize: 17,
    color: '#17A2B8',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorDetailsText: { 
    fontSize: 14,
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  errorInBoxText: { 
    fontSize: 15,
    color: '#DC3545',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingIndicator: {
    marginVertical: 10,
  }
});

export default MainScreen;
