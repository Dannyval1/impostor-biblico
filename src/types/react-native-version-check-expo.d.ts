declare module 'react-native-version-check-expo' {
    interface UpdateNeededResult {
        isNeeded: boolean;
        currentVersion: string;
        latestVersion: string;
        storeUrl?: string;
    }

    const VersionCheck: {
        needUpdate(options?: {
            currentVersion?: string;
            latestVersion?: string;
            depth?: number;
            packageName?: string;
            country?: string;
        }): Promise<UpdateNeededResult | null>;
        getLatestVersion(options?: {
            packageName?: string;
            country?: string;
        }): Promise<string>;
        getCurrentVersion(): string;
        getStoreUrl(options?: {
            appID?: string;
            packageName?: string;
        }): Promise<string>;
    };

    export default VersionCheck;
}
