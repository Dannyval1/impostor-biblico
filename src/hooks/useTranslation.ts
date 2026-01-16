// src/hooks/useTranslation.ts
import { useGame } from '../context/GameContext';
import { translations, TranslationKeys } from '../i18n/translations';

export function useTranslation() {
    const { state } = useGame();
    const language = state.settings.language || 'es';

    const t = translations[language as keyof typeof translations] as TranslationKeys;

    return { t, language };
}
