import { Category, GenericCategory } from '../types';

export const CATEGORY_IMAGES: Record<Category, any> = {
    'personajes_biblicos': require('../../assets/biblical_categories/cat_personajes_biblicos.png'),
    'libros_biblicos': require('../../assets/biblical_categories/cat_libros_biblicos.png'),
    'objetos_biblicos': require('../../assets/biblical_categories/cat_objetos_biblicos.png'),
    'oficios_biblicos': require('../../assets/biblical_categories/cat_oficios_biblicos.png'),
    'lugares_biblicos': require('../../assets/biblical_categories/cat_lugares_biblicos.png'),
    'conceptos_teologicos': require('../../assets/biblical_categories/cat_conceptos_teologicos.png'),
    'mujeres_biblicas': require('../../assets/biblical_categories/cat_mujeres_biblicas.png'),
    'milagros_biblicos': require('../../assets/biblical_categories/cat_milagros_biblicos.png'),
    'parabolas_jesus': require('../../assets/biblical_categories/cat_parabolas_jesus.png'),

    'animales': require('../../assets/general_categories/cat_gen_animales.png'),
    'deportes': require('../../assets/general_categories/cat_gen_deportes.png'),
    'comida': require('../../assets/general_categories/cat_gen_comida.png'),
    'profesiones': require('../../assets/general_categories/cat_gen_profesiones.png'),
    'herramientas': require('../../assets/general_categories/cat_gen_herramientas.png'),
    'acciones': require('../../assets/general_categories/cat_gen_acciones.png'),
    'objetos': require('../../assets/general_categories/cat_gen_objetos.png'),
    'marcas': require('../../assets/general_categories/cat_gen_marcas.png'),
    'famosos': require('../../assets/general_categories/cat_gen_famosos.png'),
};

export const CATEGORY_COLORS: Record<Category, string> = {
    'personajes_biblicos': '#FFB74D',
    'libros_biblicos': '#F06292',
    'objetos_biblicos': '#7986CB',
    'oficios_biblicos': '#81C784',
    'lugares_biblicos': '#4DD0E1',
    'conceptos_teologicos': '#9575CD',
    'mujeres_biblicas': '#F48FB1',
    'milagros_biblicos': '#4FC3F7',
    'parabolas_jesus': '#A5D6A7',
    // Generic Colors
    'animales': '#AED581',
    'deportes': '#E57373',
    'comida': '#FFD54F',
    'profesiones': '#4DB6AC',
    'herramientas': '#64B5F6',
    'acciones': '#BA68C8',
    'objetos': '#90A4AE',
    'marcas': '#FF8A65',
    'famosos': '#FFD54F',
};

export const CATEGORIES_BIBLICAL: { id: Category; label: string }[] = [
    { id: 'personajes_biblicos', label: 'Personajes bíblicos' },
    { id: 'libros_biblicos', label: 'Libros bíblicos' },
    { id: 'objetos_biblicos', label: 'Objetos bíblicos' },
    { id: 'oficios_biblicos', label: 'Oficios bíblicos' },
    { id: 'lugares_biblicos', label: 'Lugares bíblicos' },
    { id: 'mujeres_biblicas', label: 'Mujeres bíblicas' },
    { id: 'conceptos_teologicos', label: 'Conceptos teológicos' },
    { id: 'milagros_biblicos', label: 'Milagros bíblicos' },
    { id: 'parabolas_jesus', label: 'Parábolas de Jesús' },
];

export const CATEGORIES_GENERAL: { id: GenericCategory; label: string }[] = [
    { id: 'acciones', label: 'Acciones' },
    { id: 'objetos', label: 'Objetos' },
    { id: 'deportes', label: 'Deportes' },
    { id: 'animales', label: 'Animales' },
    { id: 'comida', label: 'Comida' },
    { id: 'profesiones', label: 'Profesiones' },
    { id: 'herramientas', label: 'Herramientas' },
    { id: 'marcas', label: 'Marcas famosas' },
    { id: 'famosos', label: 'Famosos' },
];
