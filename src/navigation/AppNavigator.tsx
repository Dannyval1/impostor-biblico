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
import OnlineResultsScreen from '../screens/OnlineResultsScreen';
import OnlineSetupScreen from '../screens/OnlineSetupScreen';
import OnlineClueScreen from '../screens/OnlineClueScreen';
import { RoomClosedModal } from '../components/RoomClosedModal';
import { InsufficientPlayersModal } from '../components/InsufficientPlayersModal';
import { RoundDecisionModal } from '../components/RoundDecisionModal';
import { HostMigrationNotice } from '../components/HostMigrationNotice';

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
    OnlineResults: undefined;
    OnlineSetup: undefined;
    OnlineClue: undefined;
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
                <Stack.Screen name="OnlineResults" component={OnlineResultsScreen} />
                <Stack.Screen name="OnlineSetup" component={OnlineSetupScreen} />
                <Stack.Screen name="OnlineClue" component={OnlineClueScreen} />
            </Stack.Navigator>
            <RoomClosedModal />
            <InsufficientPlayersModal />
            <RoundDecisionModal />
            <HostMigrationNotice />
        </NavigationContainer>
    );
}