# Real-Time Translator App

## Overview

The Real-Time Translator App is a React Native mobile application designed to capture voice input, transcribe it into text in real-time, and then translate that text into English. This allows users to speak and see an English translation of their speech.

The application uses `@react-native-voice/voice` for speech-to-text transcription and Microsoft Translator API for text translation.

## Features

*   **Real-Time Voice Transcription:** Captures audio from the device microphone and transcribes it into text.
*   **Live Partial Results:** Displays transcription results as they are being processed.
*   **Final Transcription:** Shows the final, most accurate transcription after speech input ends.
*   **Translation to English:** Translates the final transcribed text into English using Microsoft Translator API.
*   **Cross-Platform:** Built with React Native for iOS and Android (though iOS build requires a macOS environment).
*   **User-Friendly Interface:** Simple UI to start/stop recording, view transcriptions, and see translations.
*   **Error Handling:** Provides feedback for common errors like permission denial or network issues.

## Setup Instructions

Follow these steps to set up and run the Real-Time Translator App on your local development environment.

### Prerequisites

*   Node.js (LTS version recommended: e.g., 18.x or 20.x)
*   Yarn (or npm)
*   React Native development environment set up (see [React Native Environment Setup](https://reactnative.dev/docs/environment-setup))
*   Android Studio (for Android development) with an emulator or connected device.
*   Xcode (for iOS development - requires macOS) with a simulator or connected device.
*   CocoaPods (for iOS dependency management - install via `sudo gem install cocoapods` if needed on macOS).

### 1. Get the Code

If you have cloned the main repository containing this app:
```bash
# Navigate to the RealTimeTranslatorApp directory within the main project
cd path/to/your/project/RealTimeTranslatorApp 
# (The RealTimeTranslatorApp directory should already exist if you've been following previous steps)
```
If this app were a standalone project (for future reference):
```bash
git clone <repository_url> # Replace <repository_url> with the actual URL
cd RealTimeTranslatorApp
```

### 2. Install Dependencies

Install the project dependencies using Yarn or npm from within the `RealTimeTranslatorApp` directory:
```bash
yarn install
# or
npm install
```

### 3. API Key Configuration (Microsoft Translator)

This application uses the Microsoft Translator API for text translation. You need to obtain an API key (also known as a Subscription Key) and configure it in the application.

**Steps to get an API Key:**

1.  **Azure Account:** If you don't have one, create a free Azure account at [azure.microsoft.com](https://azure.microsoft.com/).
2.  **Create a Translator Resource:**
    *   In the Azure portal, search for "Translator" and select it from the marketplace.
    *   Click "Create" and fill in the required details:
        *   **Subscription:** Choose your Azure subscription.
        *   **Resource group:** Create a new one or select an existing one.
        *   **Region:** Choose a region (e.g., `global` or a specific one like `eastus`). The service is often available globally.
        *   **Name:** Give your Translator resource a unique name.
        *   **Pricing tier:** Select a pricing tier. The **Free (F0)** tier offers 2 million characters per month and is suitable for development and testing.
    *   Review and create the resource.
3.  **Get API Key and Region:**
    *   Once the resource is deployed, go to it in the Azure portal.
    *   Under the "Resource Management" section, navigate to **"Keys and Endpoint"**.
    *   You will find two keys (Key 1, Key 2) and the Location/Region. Copy **Key 1** (or Key 2). Note down the **Location/Region** if it's not 'global'.

**Configure the API Key in the App:**

1.  Open the file: `RealTimeTranslatorApp/src/services/translationService.ts`
2.  Locate the following lines:
    ```typescript
    // IMPORTANT: Replace this placeholder with your actual Microsoft Translator API key (Subscription Key).
    // You can obtain a key from the Azure portal by creating a Translator resource.
    const DEFAULT_TRANSLATOR_API_KEY = 'YOUR_MICROSOFT_TRANSLATOR_API_KEY';

    // Specify the region for your Translator resource if it's not global.
    // For global resources, 'global' can be used, but it's often better to specify the region.
    const TRANSLATOR_REGION = 'global'; 
    ```
3.  **Replace `'YOUR_MICROSOFT_TRANSLATOR_API_KEY'`** with the API key you copied from the Azure portal.
4.  If your Translator resource is regional (not global), update `TRANSLATOR_REGION` with the correct region string (e.g., `'eastus'`). This value is used in the `Ocp-Apim-Subscription-Region` header.

**Example:**
```typescript
const DEFAULT_TRANSLATOR_API_KEY = 'a1b2c3d4e5f67890abcdef1234567890'; // Your actual key
const TRANSLATOR_REGION = 'eastus'; // Your actual region, if not global
```

**Important Security Note:** Do not commit your actual API key to a public Git repository. For production or shared projects, consider using environment variables (e.g., via `.env` files and `react-native-dotenv`) or a secure configuration management system.

### 4. iOS Specific Setup (macOS required)

If you are developing for iOS, you need to install the CocoaPods dependencies. Navigate to the `ios` directory within `RealTimeTranslatorApp` and run:
```bash
cd ios
pod install
cd .. 
```
**Note:** This step requires a macOS environment with CocoaPods installed.

## Running the Application

Ensure you have an emulator/simulator running or a physical device connected and configured for development.

### Android

From the `RealTimeTranslatorApp` directory:
```bash
yarn android
# or
npx react-native run-android
```

### iOS (macOS required)

From the `RealTimeTranslatorApp` directory:
```bash
yarn ios
# or
npx react-native run-ios
```

## Running Tests

To run the unit tests configured for the application using Jest:
From the `RealTimeTranslatorApp` directory:
```bash
yarn test
# or
npm test
```
This will execute tests for services and components, including checks for error handling and helper functions.

---

This README provides a guide to get the Real-Time Translator App up and running. For more detailed information on specific technologies used, refer to their official documentation.
