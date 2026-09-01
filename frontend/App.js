// App.js
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import { FullFlowScreen, NotFullFlowScreen } from './screens/BranchScreens';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Camera">
        <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Take Photo' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Result' }} />
        <Stack.Screen name="FullFlowScreen" component={FullFlowScreen} options={{ title: 'Full' }} />
        <Stack.Screen name="NotFullFlowScreen" component={NotFullFlowScreen} options={{ title: 'Not Full' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
