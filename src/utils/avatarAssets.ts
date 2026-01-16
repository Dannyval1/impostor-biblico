// src/utils/avatarAssets.ts

export const AVATAR_ASSETS: Record<string, any> = {
    'avatar_1': require('../../assets/avatar_1.png'),
    'avatar_2': require('../../assets/avatar_2.png'),
    'avatar_3': require('../../assets/avatar_3.png'),
    'avatar_4': require('../../assets/avatar_4.png'),
    'avatar_5': require('../../assets/avatar_5.png'),
    'avatar_6': require('../../assets/avatar_6.png'),
    'avatar_7': require('../../assets/avatar_7.png'),
    'avatar_8': require('../../assets/avatar_8.png'),
    'avatar_9': require('../../assets/avatar_9.png'),
    'avatar_10': require('../../assets/avatar_10.png'),
    'avatar_11': require('../../assets/avatar_11.png'),
    'avatar_12': require('../../assets/avatar_12.png'),
    'avatar_13': require('../../assets/avatar_13.png'),
    'avatar_14': require('../../assets/avatar_14.png'),
    'avatar_15': require('../../assets/avatar_15.png'),
    'avatar_16': require('../../assets/avatar_16.png'),
    'avatar_17': require('../../assets/avatar_17.png'),
    'avatar_18': require('../../assets/avatar_18.png'),
    'avatar_19': require('../../assets/avatar_19.png'),
    'avatar_20': require('../../assets/avatar_20.png'),
};

export const TOTAL_AVATARS = 20;

export function getAvatarSource(avatarKey: string) {
    return AVATAR_ASSETS[avatarKey] || AVATAR_ASSETS['avatar_1'];
}
