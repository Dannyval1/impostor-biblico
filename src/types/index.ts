export type GameMode = 'classic' | 'online';

/** Por qué se cerró la sala online (modal informativo para no anfitriones). */
export type OnlineRoomCloseReason = 'host_left' | 'connection_lost' | 'room_removed';

export type GamePhase = 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';

export type PlayerRole = 'civilian' | 'impostor';

export type Language = 'es' | 'en' | 'pt';

export type StandardCategory =
    | 'personajes_biblicos'
    | 'libros_biblicos'
    | 'objetos_biblicos'
    | 'oficios_biblicos'
    | 'lugares_biblicos'
    | 'mujeres_biblicas'
    | 'conceptos_teologicos'
    | 'milagros_biblicos'
    | 'parabolas_jesus';

export type GenericCategory =
    | 'animales'
    | 'deportes'
    | 'comida'
    | 'profesiones'
    | 'herramientas'
    | 'acciones'
    | 'objetos'
    | 'marcas'
    | 'famosos';

export type Category = StandardCategory | GenericCategory | (string & {});

export interface CustomCategory {
    id: string;
    name: string;
    words: string[];
    language: Language;
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
    /** Nombre legible para categorías personalizadas (Firebase / UI). */
    categoryDisplayName?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    hint?: string;
    impostorHint?: string;
}

export interface GameSettings {
    mode: GameMode;
    players: Player[];
    selectedCategories: Category[];
    impostorCount: number;
    gameDuration: number | null; // null = unlimited time
    musicEnabled: boolean;
    soundsEnabled: boolean;
    language: Language;
    difficulty: 'easy' | 'medium' | 'hard' | 'all';
    impostorHintEnabled: boolean;
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
    recentImpostors: string[];
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
    | { type: 'SET_LANGUAGE'; payload: Language }
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
    | { type: 'EDIT_CUSTOM_CATEGORY'; payload: CustomCategory }
    | { type: 'UPDATE_PLAYER_NAME'; payload: { id: string; name: string } }
    | { type: 'TOGGLE_IMPOSTOR_HINT'; payload: boolean }
    | { type: 'FORCE_REMOVE_CATEGORY'; payload: Category };

// Online Mode Types

export type OnlinePlayerRole = 'civilian' | 'impostor';

export interface OnlinePlayer {
    id: string;
    name: string;
    avatar: import('./index').Avatar;
    isHost: boolean;
    isReady: boolean;
    role?: OnlinePlayerRole;
    vote?: string | null;
    isEliminated: boolean;
    score: number;
    clue?: string | null;
    lastSeen?: number;
    isConnected?: boolean;
    disconnectedAt?: number;
    /** Estado de ingreso al lobby para sincronizar anuncios y habilitar inicio de partida. */
    joinState?: 'joining' | 'watching_ad' | 'ready';
    /** Timestamp local/servidor del último cambio de `joinState`. */
    joinStateSince?: number;
}

export type DiscussionMode = 'turns' | 'simultaneous';

export type RoomStatus =
    | 'waiting'
    | 'playing'
    | 'clues'
    | 'simultaneous_reveal'
    /** Revisión de pistas antes del modal Votar / Otra ronda */
    | 'clue_review'
    | 'deciding'
    | 'voting'
    | 'results'
    | 'elimination_choice'
    | 'finished';

/** Tras eliminar a un civil (4+ jugadores): seguir con la misma palabra o revelar impostor. */
export type EliminationChoiceVote = 'continue_same' | 'reveal_impostor';

export type RoundDecisionVote = 'go_vote' | 'another_round';
export type PostResultVote = 'play_again' | 'leave';

export interface OnlineReaction {
    emoji: string;
    playerName: string;
    playerId: string;
    timestamp: number;
}

export interface OnlineMessage {
    playerId: string;
    playerName: string;
    messageKey: string;
    /** Texto libre opcional para mensajes dinámicos (p. ej. nombres de jugadores). */
    messageText?: string;
    timestamp: number;
}

export interface OnlineRoom {
    id: string;
    /** Conteo de jugadores; usado por reglas RTDB (no existe numChildren() en rules). */
    playerCount?: number;
    hostId: string;
    hostHeartbeat?: string | number;
    originalHostId: string;
    originalHostName: string;
    status: RoomStatus;
    players: Record<string, OnlinePlayer>;
    settings: {
        impostorCount: number;
        gameDuration: number | null;
        language: Language;
        categories: Category[];
        customCategories: CustomCategory[];
        isPremiumRoom: boolean;
        impostorHint: boolean;
        isConfigured: boolean;
        discussionMode: DiscussionMode;
        clueDuration: number;
        maxPlayers: number;
    };
    premiumCategoriesSnapshot?: Category[];
    currentWord?: Word;
    currentImpostors?: string[];
    currentRoundStartTime?: number;
    createdAt: number;
    lastActivity?: number;
    winner?: 'impostors' | 'civilians';
    /** Por qué terminó la partida en resultados (p. ej. jugadores insuficientes). */
    finishReason?: 'impostor_disconnected' | 'not_enough_players' | 'technical_tie';
    lastEliminatedId?: string | null;
    voteCounts?: Record<string, number>;
    isTie?: boolean;
    turnOrder?: string[];
    currentTurnIndex?: number;
    cluePhaseStartTime?: number;
    /** Inicio de la fase de votación (ms); el anfitrión cierra a los 30s aunque falten votos. */
    votingPhaseStartTime?: number;
    reactions?: Record<string, OnlineReaction>;
    messages?: Record<string, OnlineMessage>;
    roundDecisionVotes?: Record<string, RoundDecisionVote>;
    roundDecisionStartTime?: number;
    clueRound?: number;
    postResultVotes?: Record<string, PostResultVote>;
    postResultStartTime?: number;
    eliminationChoiceVotes?: Record<string, EliminationChoiceVote>;
    eliminationChoiceStartTime?: number;
    /** Jugadores activos marcan listo tras revisar pistas (antes de `deciding`). */
    clueReviewReady?: Record<string, boolean>;
    clueReviewStartTime?: number;
    /** Tras empate en votación: nueva ronda de pistas sin revelar impostor; la UI muestra aviso y el host limpia el flag. */
    voteTieRecovery?: boolean;
    /** Cuenta empates seguidos sin eliminación; al llegar a 3 → `finishReason: technical_tie`. */
    voteTieStreak?: number;
    /** Historial acotado de ids de palabra para reducir repeticiones entre rondas. */
    recentWordIds?: string[];
    /** Historial acotado de ids de impostor para balancear asignaciones. */
    recentImpostorIds?: string[];
}

export interface OnlineGameState {
    roomCode: string | null;
    playerId: string | null;
    isHost: boolean;
    room: OnlineRoom | null;
    error: string | null;
}
