// src/context/GameContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import * as Audio from 'expo-audio';
import { GameState, GameAction, Player, Word, Category, PlayerRole, Avatar } from '../types';

// Importar las palabras
import freeWordsData from '../data/words-free.json';
import { TOTAL_AVATARS } from '../utils/avatarAssets';

const clickSound = require('../../assets/sounds/click.mp3');
const successSound = require('../../assets/sounds/success.mp3');
const failureSound = require('../../assets/sounds/failure.mp3');

// Helper to get next available avatar or cycle
function getNextAvatar(currentPlayers: Player[]): Avatar {
    const usedAvatars = new Set(currentPlayers.map(p => p.avatar));
    const available: Avatar[] = [];

    for (let i = 1; i <= TOTAL_AVATARS; i++) {
        const candidate = `avatar_${i}` as Avatar;
        if (!usedAvatars.has(candidate)) {
            available.push(candidate);
        }
    }

    // Should not happen if limit is enforced, but safe fallback
    if (available.length === 0) {
        const randomIndex = Math.floor(Math.random() * TOTAL_AVATARS) + 1;
        return `avatar_${randomIndex}` as Avatar;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}

// Helper: Obtener palabra aleatoria de las categorías seleccionadas
function getRandomWord(categories: Category[]): Word {
    const freeWords = freeWordsData as Word[];

    // Filtrar por categorías seleccionadas
    const filtered = freeWords.filter(w => categories.includes(w.category));

    if (filtered.length === 0) {
        // Fallback: devolver la primera palabra disponible
        return freeWords[0];
    }

    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
}

// Estado inicial
const initialState: GameState = {
    settings: {
        mode: 'classic',
        players: [],
        selectedCategories: ['personajes_biblicos', 'libros_biblicos', 'objetos_biblicos'],
        impostorCount: 1,
        gameDuration: 300, // 5 minutos por defecto
        musicEnabled: true,
        soundsEnabled: true,
        language: 'es'
    },
    currentWord: null,
    currentImpostor: null,
    currentImpostors: [],
    gamePhase: 'setup',
    roundNumber: 1,
    votes: {},
    hasLoaded: false,
};

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'ADD_PLAYER': {
            const newId = Date.now().toString();
            // Assign avatar based on count
            const selectedAvatar = getNextAvatar(state.settings.players);

            const newPlayer: Player = {
                id: newId,
                name: action.payload,
                role: 'civilian' as PlayerRole,
                score: 0,
                hasSeenWord: false,
                avatar: selectedAvatar,
            };

            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: [...state.settings.players, newPlayer],
                },
            };
        }

        case 'REMOVE_PLAYER':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: state.settings.players.filter(p => p.id !== action.payload),
                },
            };

        case 'TOGGLE_CATEGORY': {
            const category = action.payload;
            const isSelected = state.settings.selectedCategories.includes(category);

            if (isSelected) {
                // No permitir deseleccionar si solo queda una categoría
                if (state.settings.selectedCategories.length <= 1) {
                    return state;
                }
                return {
                    ...state,
                    settings: {
                        ...state.settings,
                        selectedCategories: state.settings.selectedCategories.filter(c => c !== category),
                    },
                };
            } else {
                return {
                    ...state,
                    settings: {
                        ...state.settings,
                        selectedCategories: [...state.settings.selectedCategories, category],
                    },
                };
            }
        }

        case 'SET_IMPOSTOR_COUNT':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    impostorCount: action.payload,
                },
            };

        case 'SET_GAME_DURATION':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    gameDuration: action.payload,
                },
            };

        case 'START_GAME': {
            const playerCount = state.settings.players.length;
            const impostorCount = state.settings.impostorCount;

            // Seleccionar impostores aleatoriamente
            const shuffled = [...state.settings.players].sort(() => Math.random() - 0.5);
            const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);

            // Asignar roles
            const playersWithRoles = state.settings.players.map(player => ({
                ...player,
                role: (impostorIds.includes(player.id) ? 'impostor' : 'civilian') as PlayerRole,
                hasSeenWord: false,
            }));

            // Cargar palabra aleatoria
            const word = getRandomWord(state.settings.selectedCategories);

            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: playersWithRoles,
                },
                currentWord: word,
                currentImpostor: impostorIds[0], // Por compatibilidad
                currentImpostors: impostorIds,
                gamePhase: 'reveal',
            };
        }

        case 'LOAD_NEW_WORD': {
            // Cargar una nueva palabra aleatoria
            const word = getRandomWord(state.settings.selectedCategories);
            return {
                ...state,
                currentWord: word,
            };
        }

        case 'MARK_PLAYER_SEEN_WORD':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: state.settings.players.map(p =>
                        p.id === action.payload ? { ...p, hasSeenWord: true } : p
                    ),
                },
            };

        case 'SUBMIT_CLUE':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: state.settings.players.map(p =>
                        p.id === action.payload.playerId
                            ? { ...p, clue: action.payload.clue }
                            : p
                    ),
                },
            };

        case 'SUBMIT_VOTE':
            return {
                ...state,
                votes: {
                    ...state.votes,
                    [action.payload.playerId]: action.payload.votedFor,
                },
            };

        case 'NEXT_ROUND': {
            // Resetear jugadores para nueva ronda
            const resetPlayers = state.settings.players.map(p => ({
                ...p,
                hasSeenWord: false,
                clue: undefined,
                votedFor: undefined,
            }));

            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: resetPlayers,
                },
                votes: {},
                roundNumber: state.roundNumber + 1,
                gamePhase: 'setup',
            };
        }

        case 'ELIMINATE_PLAYER':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: state.settings.players.map(p =>
                        p.id === action.payload ? { ...p, isEliminated: true } : p
                    ),
                },
            };

        case 'RESET_GAME':
            return {
                ...state,
                settings: {
                    ...initialState.settings,
                    players: state.settings.players.map(p => ({
                        ...p,
                        isEliminated: false // Reset elimination status
                    }))
                }
            };

        case 'TOGGLE_MUSIC':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    musicEnabled: action.payload,
                },
            };

        case 'TOGGLE_SOUNDS':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    soundsEnabled: action.payload,
                },
            };

        case 'SET_LANGUAGE':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    language: action.payload,
                },
            };

        case 'SET_HAS_LOADED':
            return {
                ...state,
                hasLoaded: true,
            };

        case 'PLAY_CLICK':
            return state;

        default:
            return state;
    }
}

// Context
const GameContext = createContext<{
    state: GameState;
    addPlayer: (name: string) => void;
    removePlayer: (id: string) => void;
    toggleCategory: (category: Category) => void;
    setImpostorCount: (count: number) => void;
    setGameDuration: (duration: number | null) => void;
    startGame: () => void;
    loadNewWord: () => void;
    markPlayerSeenWord: (playerId: string) => void;
    submitClue: (playerId: string, clue: string) => void;
    submitVote: (playerId: string, votedFor: string) => void;
    eliminatePlayer: (playerId: string) => void;
    nextRound: () => void;
    resetGame: () => void;
    toggleMusic: (enabled: boolean) => void;
    toggleSounds: (enabled: boolean) => void;
    setLanguage: (lang: 'es' | 'en') => void;
    setHasLoaded: () => void;
    playClick: () => void;
    playSuccess: () => void;
    playFailure: () => void;
} | null>(null);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Audio logic
    const playClick = async () => {
        if (state.settings.soundsEnabled) {
            try {
                const sound = Audio.createAudioPlayer(clickSound);
                sound.play();
            } catch (error) {
                console.log('Error playing click sound:', error);
            }
        }
    };

    const playSuccess = async () => {
        if (state.settings.soundsEnabled) {
            try {
                const sound = Audio.createAudioPlayer(successSound);
                sound.play();
            } catch (error) {
                console.log('Error playing success sound:', error);
            }
        }
    };

    const playFailure = async () => {
        if (state.settings.soundsEnabled) {
            try {
                const sound = Audio.createAudioPlayer(failureSound);
                sound.play();
            } catch (error) {
                console.log('Error playing failure sound:', error);
            }
        }
    };

    const value = {
        state,
        addPlayer: (name: string) => dispatch({ type: 'ADD_PLAYER', payload: name }),
        removePlayer: (id: string) => dispatch({ type: 'REMOVE_PLAYER', payload: id }),
        toggleCategory: (category: Category) => dispatch({ type: 'TOGGLE_CATEGORY', payload: category }),
        setImpostorCount: (count: number) => dispatch({ type: 'SET_IMPOSTOR_COUNT', payload: count }),
        setGameDuration: (duration: number | null) => dispatch({ type: 'SET_GAME_DURATION', payload: duration }),
        startGame: () => dispatch({ type: 'START_GAME' }),
        loadNewWord: () => dispatch({ type: 'LOAD_NEW_WORD' }),
        markPlayerSeenWord: (playerId: string) => dispatch({ type: 'MARK_PLAYER_SEEN_WORD', payload: playerId }),
        submitClue: (playerId: string, clue: string) =>
            dispatch({ type: 'SUBMIT_CLUE', payload: { playerId, clue } }),
        submitVote: (playerId: string, votedFor: string) =>
            dispatch({ type: 'SUBMIT_VOTE', payload: { playerId, votedFor } }),
        eliminatePlayer: (playerId: string) => dispatch({ type: 'ELIMINATE_PLAYER', payload: playerId }),
        nextRound: () => dispatch({ type: 'NEXT_ROUND' }),
        resetGame: () => dispatch({ type: 'RESET_GAME' }),
        toggleMusic: (enabled: boolean) => dispatch({ type: 'TOGGLE_MUSIC', payload: enabled }),
        toggleSounds: (enabled: boolean) => dispatch({ type: 'TOGGLE_SOUNDS', payload: enabled }),
        setLanguage: (lang: 'es' | 'en') => dispatch({ type: 'SET_LANGUAGE', payload: lang }),
        setHasLoaded: () => dispatch({ type: 'SET_HAS_LOADED' }),
        playClick,
        playSuccess,
        playFailure,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Hook
export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
}
