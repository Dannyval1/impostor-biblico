import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { database } from '../config/firebase';
import { ref, set, get, update, onValue, off, remove, child, DataSnapshot } from 'firebase/database';
import { OnlineGameState, OnlineRoom, OnlinePlayer, Category, CustomCategory, Word, OnlinePlayerRole, Avatar } from '../types';
import { getLocales } from 'expo-localization';
import { Alert, Platform } from 'react-native';
import { TOTAL_AVATARS } from '../utils/avatarAssets';
import { useGame } from './GameContext';
import { useTranslation } from '../hooks/useTranslation';

import freeWordsDataEs from '../data/words-free-es.json';
import freeWordsDataEn from '../data/words-free-en.json';
import premiumWordsDataEs from '../data/words-premium.json';
import premiumWordsDataEn from '../data/words-premium-en.json';
import generalWordsDataEs from '../data/words-general-es.json';
import generalWordsDataEn from '../data/words-general-en.json';
import generalPremiumWordsDataEs from '../data/words-general-premium-es.json';
import generalPremiumWordsDataEn from '../data/words-general-premium-en.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnlineGameContextProps {
    gameState: OnlineGameState;
    createRoom: (playerName: string) => Promise<string>;
    joinRoom: (roomCode: string, playerName: string) => Promise<boolean>;
    leaveRoom: () => void;
    startGame: () => void;
    startVoting: () => void;
    submitVote: (votedForId: string) => void;
    playAgain: () => void;
    updateSettings: (settings: Partial<OnlineRoom['settings']>) => void;
    nextRound: () => void;
    eliminatePlayer: (playerId: string) => void;
}

const OnlineGameContext = createContext<OnlineGameContextProps | null>(null);

const generateRoomCode = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const getDeviceId = async () => {
    // Simple persistent ID generation
    const key = 'impostor_device_id';
    let id = await AsyncStorage.getItem(key);
    if (!id) {
        id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        await AsyncStorage.setItem(key, id);
    }
    return id;
};

function getNextAvatar(currentPlayers: OnlinePlayer[]): Avatar {
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

// Update signature to accept isPremiumRoom
function getRandomWord(
    categories: Category[],
    language: 'es' | 'en',
    customCategories: CustomCategory[] = [],
    difficulty: 'easy' | 'medium' | 'hard' | 'all' = 'all',
    isPremiumRoom: boolean = false
): Word {
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

    let allWords: Word[];

    if (isPremiumRoom) {
        allWords = [...freeWords, ...premiumWords, ...generalWords, ...generalPremiumWords];
    } else {
        allWords = [...freeWords, ...generalWords];
    }

    let availableWords = allWords.filter(w => standardCategories.includes(w.category));

    if (difficulty !== 'all') {
        availableWords = availableWords.filter(w => w.difficulty === difficulty);
    }

    activeCustomCategoryIds.forEach(id => {
        const customCat = customCategories.find(c => c.id === id);
        if (customCat && customCat.words.length > 0) {
            const customWords: Word[] = customCat.words.map(w => ({
                id: `${id}_${Math.random().toString(36).substr(2, 9)}`,
                word: w,
                category: id as Category,
                difficulty: 'medium',
                hint: ''
            }));
            availableWords = [...availableWords, ...customWords];
        }
    });

    if (availableWords.length === 0) {
        // Fallback
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

// --- Provider ---

export function OnlineGameProvider({ children }: { children: ReactNode }) {
    const [gameState, setGameState] = useState<OnlineGameState>({
        roomCode: null,
        playerId: null,
        isHost: false,
        room: null,
        error: null,
    });

    const roomRef = useRef<any>(null); // Firebase ref
    const listenersRef = useRef<boolean>(false);

    const { state: globalState } = useGame();
    const isPremiumUser = globalState.isPremium;

    const { t } = useTranslation();

    useEffect(() => {
        const init = async () => {
            const id = await getDeviceId();
            setGameState(prev => ({ ...prev, playerId: id }));
        };
        init();
    }, []);

    // Subscribe to room updates
    useEffect(() => {
        if (gameState.roomCode && !listenersRef.current) {
            const rRef = ref(database, `rooms/${gameState.roomCode}`);
            roomRef.current = rRef;

            const unsubscribe = onValue(rRef, (snapshot: DataSnapshot) => {
                const data = snapshot.val();
                if (data) {
                    setGameState(prev => ({
                        ...prev,
                        room: data,
                        isHost: data.hostId === prev.playerId
                    }));
                } else {
                    // Room deleted
                    setGameState(prev => ({ ...prev, room: null, roomCode: null, error: t.online.errors.room_closed }));
                    Alert.alert(t.online.errors.room_closed, t.online.errors.room_closed_desc);
                    listenersRef.current = false;
                }
            });

            listenersRef.current = true;

            return () => {
                off(rRef);
                listenersRef.current = false;
            };
        }
    }, [gameState.roomCode]);

    const createRoom = async (playerName: string): Promise<string> => {
        if (!gameState.playerId) throw new Error("No player ID");

        const roomCode = generateRoomCode();
        const role: OnlinePlayerRole = 'civilian'; // Default
        const avatar = `avatar_${Math.floor(Math.random() * TOTAL_AVATARS) + 1}` as Avatar;

        const hostPlayer: OnlinePlayer = {
            id: gameState.playerId,
            name: playerName,
            avatar: avatar,
            isHost: true,
            isReady: true,
            score: 0,
            isEliminated: false
        };

        const newRoom: OnlineRoom = {
            id: roomCode,
            hostId: gameState.playerId,
            status: 'waiting',
            players: {
                [gameState.playerId]: hostPlayer
            },
            settings: {
                impostorCount: 1,
                gameDuration: 300,
                language: getLocales()[0]?.languageCode === 'es' ? 'es' : 'en',
                categories: ['personajes_biblicos', 'libros_biblicos', 'objetos_biblicos'],
                customCategories: [],
                isPremiumRoom: isPremiumUser // Inherit from Host
            },
            createdAt: Date.now()
        };

        await set(ref(database, `rooms/${roomCode}`), newRoom);
        setGameState(prev => ({ ...prev, roomCode, isHost: true }));
        return roomCode;
    };

    const joinRoom = async (roomCode: string, playerName: string): Promise<boolean> => {
        if (!gameState.playerId) throw new Error("No player ID");

        const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
        if (!roomSnapshot.exists()) {
            return false;
        }

        const roomData = roomSnapshot.val() as OnlineRoom;

        // Auto-cleanup check: If room is older than 24 hours, treat as expired/non-existent and delete it
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - roomData.createdAt > ONE_DAY_MS) {
            await remove(ref(database, `rooms/${roomCode}`));
            return false;
        }

        // Check if game already started
        if (roomData.status !== 'waiting') {
            throw new Error("Game already started");
        }

        // Check if player already in room (re-join)
        if (roomData.players && roomData.players[gameState.playerId]) {
            // Update name just in case
            await update(ref(database, `rooms/${roomCode}/players/${gameState.playerId}`), { name: playerName });
            setGameState(prev => ({ ...prev, roomCode, isHost: roomData.hostId === gameState.playerId }));
            return true;
        }

        // Check player limit (firebase free tier connection limit is 100, checking logical limit here if any)

        const currentPlayers = Object.values(roomData.players || {});
        // Max players 20? 
        if (currentPlayers.length >= 20) {
            throw new Error("Room full");
        }

        const avatar = getNextAvatar(currentPlayers);

        const newPlayer: OnlinePlayer = {
            id: gameState.playerId,
            name: playerName,
            avatar,
            isHost: false,
            isReady: true,
            score: 0,
            isEliminated: false
        };

        await set(ref(database, `rooms/${roomCode}/players/${gameState.playerId}`), newPlayer);
        setGameState(prev => ({ ...prev, roomCode, isHost: false }));
        return true;
    };

    const leaveRoom = async () => {
        if (!gameState.roomCode || !gameState.playerId) return;

        try {
            if (gameState.isHost) {
                // If Host leaves, destroy room for everyone
                await remove(ref(database, `rooms/${gameState.roomCode}`));
            } else {
                // Regular player leaves
                await remove(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`));

                // Check if room is empty after this player leaves (race condition possible but low risk for MVP)
                const roomSnapshot = await get(ref(database, `rooms/${gameState.roomCode}/players`));
                if (!roomSnapshot.exists() || roomSnapshot.size === 0) {
                    await remove(ref(database, `rooms/${gameState.roomCode}`));
                }
            }
        } catch (e) {
            console.error("Error leaving room:", e);
        }

        setGameState(prev => ({ ...prev, roomCode: null, room: null, isHost: false }));
    };

    const updateSettings = async (settings: Partial<OnlineRoom['settings']>) => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await update(ref(database, `rooms/${gameState.roomCode}/settings`), settings);
    };

    const startGame = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        const players = Object.values(gameState.room.players);
        const playerCount = players.length;
        const impostorCount = gameState.room.settings.impostorCount;

        if (playerCount < 3) {
            Alert.alert(t.online.errors.missing_info, t.online.min_players);
            return;
        }

        // Assign roles
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);
        const updates: Record<string, any> = {};

        players.forEach(p => {
            const role = impostorIds.includes(p.id) ? 'impostor' : 'civilian';
            updates[`players/${p.id}/role`] = role;
            updates[`players/${p.id}/isEliminated`] = false;
            updates[`players/${p.id}/vote`] = null;
        });


        const word = getRandomWord(
            gameState.room.settings.categories,
            gameState.room.settings.language,
            gameState.room.settings.customCategories,
            'all',
            gameState.room.settings.isPremiumRoom // Pass premium status
        );

        updates['currentWord'] = word;
        updates['currentImpostors'] = impostorIds;
        updates['status'] = 'playing';

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    const startVoting = async () => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await update(ref(database, `rooms/${gameState.roomCode}`), { status: 'voting' });
    };

    const submitVote = async (votedForId: string) => {
        if (!gameState.roomCode || !gameState.playerId) return;

        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`), {
            vote: votedForId
        });
    };

    // Check for votes completion (Host only)
    useEffect(() => {
        if (gameState.isHost && gameState.room?.status === 'voting') {
            const players = Object.values(gameState.room.players).filter(p => !p.isEliminated);
            const votes = players.map(p => p.vote).filter(v => v !== undefined && v !== null);

            if (votes.length === players.length && players.length > 0) {
                // Optional: Auto-reveal or wait for host?
            }
        }
    }, [gameState.room?.players, gameState.room?.status]);

    const eliminatePlayer = async (playerId: string) => {
        if (!gameState.roomCode || !gameState.isHost) return;

        await update(ref(database, `rooms/${gameState.roomCode}/players/${playerId}`), {
            isEliminated: true
        });

        // Check win condition
        const room = gameState.room!;
        const players = Object.values(room.players);
        const activeImpostors = players.filter(p => p.role === 'impostor' && !p.isEliminated && p.id !== playerId);

        if (activeImpostors.length === 0) {
            await update(ref(database, `rooms/${gameState.roomCode}`), {
                status: 'finished',
                winner: 'civilians'
            });
        }
        // TODO: Check impostor win condition if needed
    };

    const nextRound = async () => {
        if (!gameState.roomCode || !gameState.isHost) return;

        // Reset players
        const updates: Record<string, any> = {};
        const players = Object.values(gameState.room!.players);
        players.forEach(p => {
            updates[`players/${p.id}/vote`] = null;
        });

        updates['status'] = 'playing';

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    const playAgain = async () => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await startGame();
    };

    return (
        <OnlineGameContext.Provider value={{
            gameState,
            createRoom,
            joinRoom,
            leaveRoom,
            startGame,
            startVoting,
            submitVote,
            playAgain,
            updateSettings,
            nextRound,
            eliminatePlayer
        }}>
            {children}
        </OnlineGameContext.Provider>
    );
}

export function useOnlineGame() {
    const context = useContext(OnlineGameContext);
    if (!context) {
        throw new Error('useOnlineGame must be used within OnlineGameProvider');
    }
    return context;
}
