export const AVATAR_ASSETS: Record<string, any> = {
    'avatar_1': require('../../assets/avatars/avatar_1.png'),
    'avatar_2': require('../../assets/avatars/avatar_2.png'),
    'avatar_3': require('../../assets/avatars/avatar_3.png'),
    'avatar_4': require('../../assets/avatars/avatar_4.png'),
    'avatar_5': require('../../assets/avatars/avatar_5.png'),
    'avatar_6': require('../../assets/avatars/avatar_6.png'),
    'avatar_7': require('../../assets/avatars/avatar_7.png'),
    'avatar_8': require('../../assets/avatars/avatar_8.png'),
    'avatar_9': require('../../assets/avatars/avatar_9.png'),
    'avatar_10': require('../../assets/avatars/avatar_10.png'),
    'avatar_11': require('../../assets/avatars/avatar_11.png'),
    'avatar_12': require('../../assets/avatars/avatar_12.png'),
    'avatar_13': require('../../assets/avatars/avatar_13.png'),
    'avatar_14': require('../../assets/avatars/avatar_14.png'),
    'avatar_15': require('../../assets/avatars/avatar_15.png'),
    'avatar_16': require('../../assets/avatars/avatar_16.png'),
    'avatar_17': require('../../assets/avatars/avatar_17.png'),
    'avatar_18': require('../../assets/avatars/avatar_18.png'),
    'avatar_19': require('../../assets/avatars/avatar_19.png'),
    'avatar_20': require('../../assets/avatars/avatar_20.png'),
};

export const TOTAL_AVATARS = 20;

export function getAvatarSource(avatarKey: string) {
    return AVATAR_ASSETS[avatarKey] || AVATAR_ASSETS['avatar_1'];
}
