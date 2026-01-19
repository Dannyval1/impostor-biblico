export const theme = {
    light: {
        background: '#F5F5F5',
        card: '#FFFFFF',
        text: '#333333',
        textSecondary: '#666666',
        primary: '#5B7FDB',
        border: '#E0E0E0',
        success: '#48BB78',
        danger: '#E53E3E',
        warning: '#ECC94B',
    },
    dark: {
        background: '#1A202C',
        card: '#2D3748',
        text: '#F7FAFC',
        textSecondary: '#CBD5E0',
        primary: '#63B3ED', // Brighter blue for dark mode
        border: '#4A5568',
        success: '#68D391',
        danger: '#FC8181',
        warning: '#F6E05E',
    }
};

export const useTheme = (isDark: boolean) => isDark ? theme.dark : theme.light;
