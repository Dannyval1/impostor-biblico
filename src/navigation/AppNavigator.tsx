import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SetupScreen from '../screens/SetupScreen';
import RevealScreen from '../screens/RevealScreen';
import VotingScreen from '../screens/VotingScreen';


import PaywallScreen from '../screens/PaywallScreen';
import AdScreen from '../screens/AdScreen';
import OnlineLobbyScreen from '../screens/OnlineLobbyScreen';
import OnlineRevealScreen from '../screens/OnlineRevealScreen';
import OnlineVotingScreen from '../screens/OnlineVotingScreen';

export type RootStackParamList = {
    Home: undefined;
    Setup: undefined;
    Reveal: undefined;
    Voting: undefined;
    Paywall: undefined;
    Ad: undefined;
    OnlineLobby: undefined;
    OnlineReveal: undefined;
    OnlineVoting: undefined;
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
                <Stack.Screen name="Paywall" component={PaywallScreen} />
                <Stack.Screen name="Ad" component={AdScreen} />
                <Stack.Screen name="OnlineLobby" component={OnlineLobbyScreen} />
                <Stack.Screen name="OnlineReveal" component={OnlineRevealScreen} />
                <Stack.Screen name="OnlineVoting" component={OnlineVotingScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}