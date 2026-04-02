import type { CustomCategory, Word } from '../types';

export function getWordCategoryDisplayLabel(
    word: Pick<Word, 'category' | 'categoryDisplayName'> | null | undefined,
    translatedCategories: Record<string, string>,
    customDefs?: CustomCategory[]
): string {
    if (!word) return '';
    if (word.categoryDisplayName) return word.categoryDisplayName;
    const key = word.category as string;
    const fromCustom = customDefs?.find(c => c.id === key)?.name;
    if (fromCustom) return fromCustom;
    return translatedCategories[key] ?? key;
}
