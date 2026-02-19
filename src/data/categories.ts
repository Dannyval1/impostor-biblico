import { Category } from '../types';

export interface CategoryConfig {
    id: Category;
    label: string;
    icon: string;
    isPremium: boolean;
    description: string;
}

export const CATEGORIES: CategoryConfig[] = [
    {
        id: 'personajes_biblicos',
        label: 'Personajes bíblicos',
        icon: '📖',
        isPremium: false,
        description: 'Figuras importantes del Antiguo y Nuevo Testamento',
    },
    {
        id: 'libros_biblicos',
        label: 'Libros bíblicos',
        icon: '📚',
        isPremium: false,
        description: 'Los 66 libros de la Biblia',
    },
    {
        id: 'objetos_biblicos',
        label: 'Objetos bíblicos',
        icon: '📜',
        isPremium: false,
        description: 'Objetos y utensilios mencionados en la Biblia',
    },
    {
        id: 'oficios_biblicos',
        label: 'Oficios bíblicos',
        icon: '⚒️',
        isPremium: true,
        description: 'Trabajos y profesiones mencionados en la Biblia',
    },
    {
        id: 'lugares_biblicos',
        label: 'Lugares bíblicos',
        icon: '🏛️',
        isPremium: true,
        description: 'Ciudades, regiones y sitios bíblicos',
    },
    {
        id: 'mujeres_biblicas',
        label: 'Mujeres bíblicas',
        icon: '👩',
        isPremium: true,
        description: 'Mujeres destacadas de la Biblia',
    },
    {
        id: 'conceptos_teologicos',
        label: 'Conceptos teológicos',
        icon: '💭',
        isPremium: true,
        description: 'Doctrinas y enseñanzas cristianas',
    },
];

export const FREE_CATEGORIES: Category[] = CATEGORIES
    .filter(c => !c.isPremium)
    .map(c => c.id);

export const PREMIUM_CATEGORIES: Category[] = CATEGORIES
    .filter(c => c.isPremium)
    .map(c => c.id);

export function getCategoryConfig(categoryId: Category): CategoryConfig | undefined {
    return CATEGORIES.find(c => c.id === categoryId);
}

export function isPremiumCategory(categoryId: Category): boolean {
    return PREMIUM_CATEGORIES.includes(categoryId);
}