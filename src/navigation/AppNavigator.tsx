import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SetupScreen from '../screens/SetupScreen';
import RevealScreen from '../screens/RevealScreen';
import VotingScreen from '../screens/VotingScreen';
import ResultsScreen from '../screens/ResultsScreen';

import PaywallScreen from '../screens/PaywallScreen';
import AdScreen from '../screens/AdScreen';

export type RootStackParamList = {
    Home: undefined;
    Setup: undefined;
    Reveal: undefined;
    Voting: undefined;
    Results: undefined;
    Paywall: undefined;
    Ad: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Setup" component={SetupScreen} />
                <Stack.Screen name="Reveal" component={RevealScreen} />
                <Stack.Screen name="Voting" component={VotingScreen} />
                <Stack.Screen name="Results" component={ResultsScreen} />
                <Stack.Screen name="Paywall" component={PaywallScreen} />
                <Stack.Screen name="Ad" component={AdScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}