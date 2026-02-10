import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getLocales } from 'expo-localization';
import { GameState, GameAction, Player, Word, Category, PlayerRole, Avatar, CustomCategory } from '../types';
import { saveCustomCategories, loadCustomCategories, saveGamesPlayed, loadGamesPlayed } from '../utils/storage';
import freeWordsDataEs from '../data/words-free-es.json';
import freeWordsDataEn from '../data/words-free-en.json';
import premiumWordsDataEs from '../data/words-premium.json';
import premiumWordsDataEn from '../data/words-premium-en.json';
import generalWordsDataEs from '../data/words-general-es.json';
import generalWordsDataEn from '../data/words-general-en.json';
import generalPremiumWordsDataEs from '../data/words-general-premium-es.json';
import generalPremiumWordsDataEn from '../data/words-general-premium-en.json';
import { TOTAL_AVATARS } from '../utils/avatarAssets';

const clickSound = require('../../assets/sounds/click.mp3');
const successSound = require('../../assets/sounds/victory.mp3');
const failureSound = require('../../assets/sounds/failure.mp3');
const introSound = require('../../assets/sounds/success.mp3');
const gameMusicSound = require('../../assets/sounds/game_mode.mp3');

function getNextAvatar(currentPlayers: Player[]): Avatar {
    const usedAvatars = new Set(currentPlayers.map(p => p.avatar));
    const available: Avatar[] = [];

    for (let i = 1; i <= TOTAL_AVATARS; i++) {
        const candidate = `avatar_${i}` as Avatar;
        if (!usedAvatars.has(candidate)) {
            available.push(candidate);
        }
    }

    if (available.length === 0) {
        const randomIndex = Math.floor(Math.random() * TOTAL_AVATARS) + 1;
        return `avatar_${randomIndex}` as Avatar;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}

function getRandomWord(categories: Category[], language: 'es' | 'en', customCategories: CustomCategory[] = [], difficulty: 'easy' | 'medium' | 'hard' | 'all' = 'all'): Word {
    const standardCategories: Category[] = [];
    const activeCustomCategoryIds: string[] = [];

    categories.forEach(cat => {
        if (typeof cat === 'string' && customCategories.some(c => c.id === cat)) {
            activeCustomCategoryIds.push(cat);
        } else {
            standardCategories.push(cat);
        }
    });

    const freeWords = (language === 'en' ? freeWordsDataEn : freeWordsDataEs) as Word[];
    const premiumWords = (language === 'en' ? premiumWordsDataEn : premiumWordsDataEs) as Word[];
    const generalWords = (language === 'en' ? generalWordsDataEn : generalWordsDataEs) as Word[];
    const generalPremiumWords = (language === 'en' ? generalPremiumWordsDataEn : generalPremiumWordsDataEs) as Word[];

    const allWords = [...freeWords, ...premiumWords, ...generalWords, ...generalPremiumWords];

    let availableWords = allWords.filter(w => standardCategories.includes(w.category));

    if (difficulty !== 'all') {
        availableWords = availableWords.filter(w => w.difficulty === difficulty);
    }

    activeCustomCategoryIds.forEach(id => {
        const customCat = customCategories.find(c => c.id === id);
        if (customCat && customCat.words.length > 0) {
            const customWords: Word[] = customCat.words.map(w => ({
                id: `${id}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
                word: w,
                category: id as Category, // Cast string to Category
                difficulty: 'medium',
                hint: ''
            }));
            availableWords = [...availableWords, ...customWords];
        }
    });

    if (availableWords.length === 0) {
        const fallbackWords = allWords.filter(w => standardCategories.includes(w.category));
        if (fallbackWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * fallbackWords.length);
            return fallbackWords[randomIndex];
        }
        return freeWords[0];
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex];
}

const deviceLanguage = getLocales()[0]?.languageCode === 'es' ? 'es' : 'en';

const initialState: GameState = {
    settings: {
        mode: 'classic',
        players: [
            { id: '1', name: deviceLanguage === 'es' ? 'Jugador 1' : 'Player 1', role: 'civilian', score: 0, hasSeenWord: false, avatar: 'avatar_1' },
            { id: '2', name: deviceLanguage === 'es' ? 'Jugador 2' : 'Player 2', role: 'civilian', score: 0, hasSeenWord: false, avatar: 'avatar_2' },
            { id: '3', name: deviceLanguage === 'es' ? 'Jugador 3' : 'Player 3', role: 'civilian', score: 0, hasSeenWord: false, avatar: 'avatar_3' },
        ],
        selectedCategories: ['personajes_biblicos', 'libros_biblicos', 'objetos_biblicos'],
        impostorCount: 1,
        gameDuration: null, // Unlimited by default
        musicEnabled: false,
        soundsEnabled: true,
        language: deviceLanguage,
        difficulty: 'all',
    },
    currentWord: null,
    currentImpostor: null,
    currentImpostors: [],
    gamePhase: 'setup',
    roundNumber: 1,
    votes: {},
    hasLoaded: false,
    customCategories: [],
    gamesPlayed: 0,
    isPremium: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'ADD_PLAYER': {
            const newId = Date.now().toString();
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

        case 'UPDATE_PLAYER_NAME':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: state.settings.players.map(p =>
                        p.id === action.payload.id ? { ...p, name: action.payload.name } : p
                    ),
                },
            };

        case 'TOGGLE_CATEGORY': {
            const category = action.payload;
            const isSelected = state.settings.selectedCategories.includes(category);

            if (isSelected) {
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
            const impostorCount = state.settings.impostorCount;

            const shuffled = [...state.settings.players].sort(() => Math.random() - 0.5);
            const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);

            const playersWithRoles = state.settings.players.map(player => ({
                ...player,
                role: (impostorIds.includes(player.id) ? 'impostor' : 'civilian') as PlayerRole,
                hasSeenWord: false,
            }));

            const word = getRandomWord(
                state.settings.selectedCategories,
                state.settings.language,
                state.customCategories,
                state.settings.difficulty
            );

            return {
                ...state,
                settings: {
                    ...state.settings,
                    players: playersWithRoles,
                },
                currentWord: word,
                currentImpostor: impostorIds[0],
                currentImpostors: impostorIds,
                gamePhase: 'reveal',
                gamesPlayed: state.gamesPlayed + 1,
            };
        }

        case 'LOAD_NEW_WORD': {
            const word = getRandomWord(
                state.settings.selectedCategories,
                state.settings.language,
                state.customCategories,
                state.settings.difficulty
            );
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
            const resetPlayers = state.settings.players.map(p => ({
                ...p,
                hasSeenWord: false,
                clue: undefined,
                votedFor: undefined,
                isEliminated: false,
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

        case 'RESET_GAME': {
            const resetPlayers = state.settings.players.map(p => ({
                ...p,
                score: 0,
                role: 'civilian' as PlayerRole,
                hasSeenWord: false,
                clue: undefined,
                votedFor: undefined,
                isEliminated: false
            }));

            return {
                ...initialState,
                settings: {
                    ...state.settings,
                    players: resetPlayers
                },
                hasLoaded: true,
                customCategories: state.customCategories,
                gamesPlayed: state.gamesPlayed,
                isPremium: state.isPremium
            };
        }

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

        case 'SET_DIFFICULTY':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    difficulty: action.payload,
                },
            };

        case 'SET_LANGUAGE': {
            const newLang = action.payload;

            const updatedPlayers = state.settings.players.map(player => {
                const jugadorMatch = player.name.match(/^Jugador (\d+)$/);
                const playerMatch = player.name.match(/^Player (\d+)$/);

                if (jugadorMatch && newLang === 'en') {
                    // Convert Spanish to English
                    return { ...player, name: `Player ${jugadorMatch[1]}` };
                } else if (playerMatch && newLang === 'es') {
                    // Convert English to Spanish
                    return { ...player, name: `Jugador ${playerMatch[1]}` };
                }

                return player;
            });

            return {
                ...state,
                settings: {
                    ...state.settings,
                    language: newLang,
                    players: updatedPlayers,
                },
            };
        }

        case 'SET_HAS_LOADED':
            return {
                ...state,
                hasLoaded: true,
            };

        case 'SET_GAME_PHASE':
            return {
                ...state,
                gamePhase: action.payload,
            };

        case 'PLAY_CLICK':
            return state;

        case 'ADD_CUSTOM_CATEGORY':
            return {
                ...state,
                customCategories: [...state.customCategories, action.payload],
            };

        case 'DELETE_CUSTOM_CATEGORY': {
            const idToDelete = action.payload;
            return {
                ...state,
                customCategories: state.customCategories.filter(c => c.id !== idToDelete),
                settings: {
                    ...state.settings,
                    selectedCategories: state.settings.selectedCategories.filter(c => c !== idToDelete),
                },
            };
        }

        case 'EDIT_CUSTOM_CATEGORY':
            return {
                ...state,
                customCategories: state.customCategories.map(c =>
                    c.id === action.payload.id ? action.payload : c
                ),
            };

        case 'SET_CUSTOM_CATEGORIES':
            return {
                ...state,
                customCategories: action.payload,
            };

        case 'INCREMENT_GAMES_PLAYED':
            return {
                ...state,
                gamesPlayed: state.gamesPlayed + 1,
            };

        case 'SET_GAMES_PLAYED':
            return {
                ...state,
                gamesPlayed: action.payload,
            };

        case 'SET_PREMIUM_STATUS':
            return {
                ...state,
                // We don't have isPremium in state yet, let's add it to settings or root
                // For now, let's assume valid action and we will add type later
                isPremium: action.payload,
            };

        default:
            return state;
    }
}

// Context
const GameContext = createContext<{
    state: GameState;
    addPlayer: (name: string) => void;
    removePlayer: (id: string) => void;
    updatePlayerName: (id: string, name: string) => void;
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
    setDifficulty: (difficulty: 'easy' | 'medium' | 'hard' | 'all') => void;
    setLanguage: (lang: 'es' | 'en') => void;
    setHasLoaded: () => void;
    playClick: () => void;
    playSuccess: () => void;
    playFailure: () => void;
    playIntro: () => void;
    setGamePhase: (phase: import('../types').GamePhase) => void;
    addCustomCategory: (category: CustomCategory) => void;
    editCustomCategory: (category: CustomCategory) => void;
    deleteCustomCategory: (id: string) => void;
    incrementGamesPlayed: () => void;
    resetGamesPlayed: () => void;
} | null>(null);

import { usePurchase } from './PurchaseContext';

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { isPremium } = usePurchase();

    // Sync Premium Status
    React.useEffect(() => {
        dispatch({ type: 'SET_PREMIUM_STATUS', payload: isPremium });
    }, [isPremium]);

    // Audio logic with persistent players
    const clickPlayer = useAudioPlayer(clickSound);
    const successPlayer = useAudioPlayer(successSound);
    // ...
    const failurePlayer = useAudioPlayer(failureSound);
    const introPlayer = useAudioPlayer(introSound);
    const gameMusicPlayer = useAudioPlayer(gameMusicSound);

    // Music Logic
    React.useEffect(() => {
        // Stop all music first
        try {
            gameMusicPlayer.pause();
        } catch (e) {
            console.log('Error pausing music (safe to ignore):', e);
        }

        gameMusicPlayer.loop = true;

        if (state.settings.musicEnabled) {
            // Logic based on game phase
            // Only play during 'voting' as requested by user
            if (state.gamePhase === 'voting') {
                try {
                    gameMusicPlayer.seekTo(0);
                    gameMusicPlayer.play();
                } catch (e) {
                    console.log('Error playing game music:', e);
                }
            } else {
                console.log('Stopping Game Music (Not in Voting Phase)');
                // Music is already paused by default at start of effect, 
                // but we rely on that pause call above.
            }
        } else {
            console.log('Music disabled in settings');
        }

        return () => {
            try {
                gameMusicPlayer.pause();
            } catch (e) {
                // Expected error on cleanup (NativeSharedObjectNotFoundException)
                // console.log('Error cleaning up music:', e);
            }
        };
    }, [state.gamePhase, state.settings.musicEnabled]);

    // Load custom categories on mount
    React.useEffect(() => {
        const loadCategories = async () => {
            const categories = await loadCustomCategories();
            dispatch({ type: 'SET_CUSTOM_CATEGORIES', payload: categories });
        };
        loadCategories();
    }, []);

    // Save custom categories whenever they change
    React.useEffect(() => {
        if (state.hasLoaded) { // Only save if we have loaded at least once or some other check?
            // Actually, we should check if initial load is done to avoid overwriting with empty
            // But here we rely on the fact that SET_CUSTOM_CATEGORIES runs once.
            // Let's rely on checking if it's different or just save.
            saveCustomCategories(state.customCategories);
        }
    }, [state.customCategories, state.hasLoaded]);

    // Load gamesPlayed on mount
    React.useEffect(() => {
        const loadGames = async () => {
            const count = await loadGamesPlayed();
            dispatch({ type: 'SET_GAMES_PLAYED', payload: count });
        };
        loadGames();
    }, []);

    // Save gamesPlayed whenever it changes
    React.useEffect(() => {
        if (state.hasLoaded) {
            saveGamesPlayed(state.gamesPlayed);
        }
    }, [state.gamesPlayed, state.hasLoaded]);

    // Expose intro player control
    const playIntro = () => {
        if (state.settings.musicEnabled) {
            try {
                introPlayer.loop = false; // Ensure it doesn't loop
                introPlayer.seekTo(0);
                introPlayer.play();
            } catch (e) {
                console.log('Error playing intro:', e);
            }
        }
    };

    const playClick = () => {
        if (state.settings.soundsEnabled) {
            try {
                clickPlayer.seekTo(0);
                clickPlayer.play();
            } catch (e) {
                console.log('Error playing click sound:', e);
            }
        } else {
            console.log('Click sound skipped (disabled)');
        }
    };

    const playSuccess = () => {
        if (state.settings.soundsEnabled) {
            try {
                successPlayer.seekTo(0);
                successPlayer.play();
            } catch (e) {
                console.log('Error playing success sound:', e);
            }
        } else {
            console.log('Success sound skipped (disabled)');
        }
    };

    const playFailure = () => {
        if (state.settings.soundsEnabled) {
            try {
                failurePlayer.seekTo(0);
                failurePlayer.play();
            } catch (e) {
                console.log('Error playing failure sound:', e);
            }
        } else {
            console.log('Failure sound skipped (disabled)');
        }
    };

    const value = {
        state,
        addPlayer: (name: string) => dispatch({ type: 'ADD_PLAYER', payload: name }),
        removePlayer: (id: string) => dispatch({ type: 'REMOVE_PLAYER', payload: id }),
        updatePlayerName: (id: string, name: string) => dispatch({ type: 'UPDATE_PLAYER_NAME', payload: { id, name } }),
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
        setDifficulty: (difficulty: 'easy' | 'medium' | 'hard' | 'all') => dispatch({ type: 'SET_DIFFICULTY', payload: difficulty }),
        setLanguage: (lang: 'es' | 'en') => dispatch({ type: 'SET_LANGUAGE', payload: lang }),
        setHasLoaded: () => dispatch({ type: 'SET_HAS_LOADED' }),
        playClick,
        playSuccess,
        playFailure,
        playIntro,
        setGamePhase: (phase: import('../types').GamePhase) => dispatch({ type: 'SET_GAME_PHASE', payload: phase }),
        addCustomCategory: (category: CustomCategory) => dispatch({ type: 'ADD_CUSTOM_CATEGORY', payload: category }),
        editCustomCategory: (category: CustomCategory) => dispatch({ type: 'EDIT_CUSTOM_CATEGORY', payload: category }),
        deleteCustomCategory: (id: string) => dispatch({ type: 'DELETE_CUSTOM_CATEGORY', payload: id }),
        incrementGamesPlayed: () => dispatch({ type: 'INCREMENT_GAMES_PLAYED' }),
        resetGamesPlayed: () => dispatch({ type: 'SET_GAMES_PLAYED', payload: 0 }),
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
