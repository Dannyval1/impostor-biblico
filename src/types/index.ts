export type GameMode = 'classic' | 'online';

export type GamePhase = 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';

export type PlayerRole = 'civilian' | 'impostor';

export type StandardCategory =
    | 'personajes_biblicos'
    | 'libros_biblicos'
    | 'objetos_biblicos'
    | 'oficios_biblicos'
    | 'lugares_biblicos'
    | 'conceptos_teologicos';

export type GenericCategory =
    | 'animales'
    | 'deportes'
    | 'comida'
    | 'profesiones'
    | 'herramientas'
    | 'acciones'
    | 'objetos';

export type Category = StandardCategory | GenericCategory | (string & {});

export interface CustomCategory {
    id: string;
    name: string;
    words: string[];
    language: 'es' | 'en';
    type?: 'biblical' | 'general';
}

export type Avatar = `avatar_${number}`;

export interface Player {
    id: string;
    name: string;
    role: PlayerRole;
    score: number;
    hasSeenWord: boolean;
    clue?: string;
    votedFor?: string;
    avatar: Avatar;
    isEliminated?: boolean;
}

export interface Word {
    id: string;
    word: string;
    category: Category;
    difficulty: 'easy' | 'medium' | 'hard';
    hint?: string;
}

export interface GameSettings {
    mode: GameMode;
    players: Player[];
    selectedCategories: Category[];
    impostorCount: number;
    gameDuration: number | null; // null = unlimited time
    musicEnabled: boolean;
    soundsEnabled: boolean;
    language: 'es' | 'en';
    difficulty: 'easy' | 'medium' | 'hard' | 'all';
}

export interface GameState {
    settings: GameSettings;
    currentWord: Word | null;
    currentImpostor: string | null;
    currentImpostors: string[];
    gamePhase: GamePhase;
    roundNumber: number;
    votes: Record<string, string>;
    hasLoaded: boolean;
    customCategories: CustomCategory[];
    gamesPlayed: number;
    isPremium: boolean;
}

export type GameAction =
    | { type: 'ADD_PLAYER'; payload: string }
    | { type: 'REMOVE_PLAYER'; payload: string }
    | { type: 'TOGGLE_CATEGORY'; payload: Category }
    | { type: 'SET_IMPOSTOR_COUNT'; payload: number }
    | { type: 'SET_GAME_DURATION'; payload: number | null }
    | { type: 'START_GAME' }
    | { type: 'LOAD_NEW_WORD' }
    | { type: 'MARK_PLAYER_SEEN_WORD'; payload: string }
    | { type: 'SUBMIT_CLUE'; payload: { playerId: string; clue: string } }
    | { type: 'SUBMIT_VOTE'; payload: { playerId: string; votedFor: string } }
    | { type: 'ELIMINATE_PLAYER'; payload: string }
    | { type: 'NEXT_ROUND' }
    | { type: 'RESET_GAME' }
    | { type: 'TOGGLE_MUSIC'; payload: boolean }
    | { type: 'TOGGLE_SOUNDS'; payload: boolean }
    | { type: 'SET_LANGUAGE'; payload: 'es' | 'en' }
    | { type: 'SET_DIFFICULTY'; payload: 'easy' | 'medium' | 'hard' | 'all' }
    | { type: 'SET_HAS_LOADED' }
    | { type: 'PLAY_CLICK' }
    | { type: 'SET_GAME_PHASE'; payload: GamePhase }
    | { type: 'ADD_CUSTOM_CATEGORY'; payload: CustomCategory }
    | { type: 'DELETE_CUSTOM_CATEGORY'; payload: string }
    | { type: 'SET_CUSTOM_CATEGORIES'; payload: CustomCategory[] }
    | { type: 'INCREMENT_GAMES_PLAYED' }
    | { type: 'SET_GAMES_PLAYED'; payload: number }
    | { type: 'SET_PREMIUM_STATUS'; payload: boolean }
    | { type: 'SET_PREMIUM_STATUS'; payload: boolean }
    | { type: 'EDIT_CUSTOM_CATEGORY'; payload: CustomCategory }
    | { type: 'UPDATE_PLAYER_NAME'; payload: { id: string; name: string } };
