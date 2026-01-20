import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

// TODO: REPLACE WITH YOUR ACTUAL REVENUECAT API KEYS
const API_KEYS = {
    apple: 'test_OkGLKrVtyFpGbdrvnVuFcxOfYVp',
    google: 'test_OkGLKrVtyFpGbdrvnVuFcxOfYVp'
};

interface PurchaseContextType {
    isPremium: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pack: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    isLoading: boolean;
}

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function PurchaseProvider({ children }: { children: ReactNode }) {
    const [isPremium, setIsPremium] = useState(false); // Default to false
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                if (Platform.OS === 'ios') {
                    await Purchases.configure({ apiKey: API_KEYS.apple });
                } else if (Platform.OS === 'android') {
                    await Purchases.configure({ apiKey: API_KEYS.google });
                }

                const info = await Purchases.getCustomerInfo();
                checkPremiumStatus(info);

                await loadOfferings();
            } catch (e) {
                console.log('Error initializing RevenueCat:', e);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length !== 0) {
                setPackages(offerings.current.availablePackages);
            }
        } catch (e) {
            console.log('Error loading offerings:', e);
        }
    };

    const checkPremiumStatus = (customerInfo: CustomerInfo) => {
        // Adjust 'premium' to match your Entitlement Identifier in RevenueCat
        if (customerInfo.entitlements.active['premium']) {
            setIsPremium(true);
        } else {
            setIsPremium(false);
        }
    };

    const purchasePackage = async (pack: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            checkPremiumStatus(customerInfo);
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert('Error', e.message);
            }
            throw e; // Rethrow to let the component know it failed/cancelled
        }
    };

    const restorePurchases = async () => {
        try {
            const customerInfo = await Purchases.restorePurchases();
            checkPremiumStatus(customerInfo);

            if (customerInfo.entitlements.active['premium']) {
                Alert.alert('Success', 'Purchases restored successfully!');
            } else {
                Alert.alert('Info', 'No active purchases found to restore.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <PurchaseContext.Provider value={{ isPremium, packages, purchasePackage, restorePurchases, isLoading }}>
            {children}
        </PurchaseContext.Provider>
    );
}

export function usePurchase() {
    const context = useContext(PurchaseContext);
    if (!context) {
        throw new Error('usePurchase must be used within PurchaseProvider');
    }
    return context;
}
