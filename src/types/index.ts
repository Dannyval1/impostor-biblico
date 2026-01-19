export type GameMode = 'classic' | 'online';

export type GamePhase = 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';

export type PlayerRole = 'civilian' | 'impostor';

export type Category =
    | 'personajes_biblicos'
    | 'libros_biblicos'
    | 'objetos_biblicos'
    | 'oficios_biblicos'
    | 'lugares_biblicos'
    | 'conceptos_teologicos';

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
    | { type: 'SET_HAS_LOADED' }
    | { type: 'SET_GAME_PHASE'; payload: GamePhase }
    | { type: 'PLAY_CLICK' };
