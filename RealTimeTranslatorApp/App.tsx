import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet, useColorScheme} from 'react-native';
import MainScreen from './src/components/MainScreen'; // Updated import
import {Colors} from 'react-native/Libraries/NewAppScreen';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    flex: 1, // Ensure MainScreen can fill the screen
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <MainScreen />
    </SafeAreaView>
  );
}

export default App;
