import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { database, ensureAnonymousAuth } from '../config/firebase';
import {
    ref, set, get, update, onValue, off, remove,
    onDisconnect, serverTimestamp, runTransaction, push, DataSnapshot
} from 'firebase/database';
import {
    OnlineGameState, OnlineRoom, OnlinePlayer, Category, CustomCategory,
    Word, OnlinePlayerRole, Avatar, OnlineReaction, OnlineRoomCloseReason
} from '../types';
import { getLocales } from 'expo-localization';
import { AppState, AppStateStatus, Platform, Alert } from 'react-native';
import { TOTAL_AVATARS } from '../utils/avatarAssets';
import { useGame } from './GameContext';
import { useTranslation } from '../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONLINE_STANDARD_CATEGORY_IDS } from '../utils/categoryMetadata';

import freeWordsDataEs from '../data/words-free-es.json';
import freeWordsDataEn from '../data/words-free-en.json';
import freeWordsDataPt from '../data/words-free-pt.json';
import premiumWordsDataEs from '../data/words-premium.json';
import premiumWordsDataEn from '../data/words-premium-en.json';
import premiumWordsDataPt from '../data/words-premium-pt.json';
import generalWordsDataEs from '../data/words-general-es.json';
import generalWordsDataEn from '../data/words-general-en.json';
import generalWordsDataPt from '../data/words-general-pt.json';
import generalPremiumWordsDataEs from '../data/words-general-premium-es.json';
import generalPremiumWordsDataEn from '../data/words-general-premium-en.json';
import generalPremiumWordsDataPt from '../data/words-general-premium-pt.json';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MAX_PLAYERS_FREE = 6;
const MAX_PLAYERS_PREMIUM = 12;
const HOST_GRACE_PERIOD_MS = 20_000;
const PLAYER_GRACE_PERIOD_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
/** Intervalo de hostHeartbeat en Firebase (menos escrituras que 5s; el watchdog sigue en 20s de estancamiento). */
const HOST_HEARTBEAT_INTERVAL_MS = 12_000;
const INACTIVITY_WAITING_MS = 30 * 60 * 1000;
const INACTIVITY_PLAYING_MS = 2 * 60 * 60 * 1000;
const REACTION_COOLDOWN_MS = 800;
const VOTING_PHASE_TIMEOUT_MS = 30_000;
const ELIMINATION_CHOICE_TIMEOUT_MS = 45_000;

// ─── Context interface ──────────────────────────────────────────────────────────

interface OnlineGameContextProps {
    gameState: OnlineGameState;
    roomClosed: boolean;
    /** Motivo del cierre (solo lectura para el modal). */
    roomCloseReason: OnlineRoomCloseReason | null;
    clearRoomClosed: () => void;
    insufficientPlayers: boolean;
    clearInsufficientPlayers: () => void;
    hostMigrationNotice: string | null;
    clearHostMigrationNotice: () => void;
    createRoom: (playerName: string) => Promise<string>;
    joinRoom: (roomCode: string, playerName: string) => Promise<boolean>;
    /**
     * Salir de la sala en Firebase.
     * `clearLocalSnapshot: false` mantiene `gameState.room` hasta `clearRoomClosed()` (modal informativo sin pantalla blanca).
     */
    leaveRoom: (opts?: { clearLocalSnapshot?: boolean }) => Promise<void>;
    /** Opcional: ajustes recién guardados (evita condición de carrera con el listener de Firebase). */
    startGame: (settingsJustSaved?: Partial<OnlineRoom['settings']>) => void;
    startVoting: () => void;
    submitVote: (votedForId: string) => void;
    playAgain: () => void;
    updateSettings: (settings: Partial<OnlineRoom['settings']>) => void;
    nextRound: () => Promise<void>;
    continueRound: () => void;
    eliminatePlayer: (playerId: string) => void;
    startCluePhase: () => void;
    submitClue: (clue: string) => void;
    advanceTurn: () => void;
    submitRoundDecision: (decision: 'go_vote' | 'another_round') => void;
    submitEliminationChoice: (choice: 'continue_same' | 'reveal_impostor') => void;
    /** Tras ver todas las pistas en modo simultáneo: el host pasa a la votación grupal (modal). */
    openRoundDecisionAfterSimultaneousReveal: () => Promise<void>;
    sendReaction: (emoji: string) => void;
    resetToLobby: () => Promise<void>;
}

const OnlineGameContext = createContext<OnlineGameContextProps | null>(null);

// ─── Helpers ────────────────────────────────────────────────────────────────────

const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
};

const getPlayerId = async (): Promise<string> => {
    try {
        return await ensureAnonymousAuth();
    } catch (e) {
        console.warn('Anonymous auth failed, falling back to device ID:', e);
        const key = 'impostor_device_id';
        let id = await AsyncStorage.getItem(key);
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            await AsyncStorage.setItem(key, id);
        }
        return id;
    }
};

function getNextAvatar(currentPlayers: OnlinePlayer[]): Avatar {
    const usedAvatars = new Set(currentPlayers.map(p => p.avatar));
    const available: Avatar[] = [];
    for (let i = 1; i <= TOTAL_AVATARS; i++) {
        const candidate = `avatar_${i}` as Avatar;
        if (!usedAvatars.has(candidate)) available.push(candidate);
    }
    if (available.length === 0) return `avatar_${Math.floor(Math.random() * TOTAL_AVATARS) + 1}` as Avatar;
    return available[Math.floor(Math.random() * available.length)];
}

function hasPlayableCategorySelection(
    categories: Category[] | undefined,
    customCategories: CustomCategory[] | undefined
): boolean {
    const cats = categories || [];
    if (cats.length === 0) return false;
    const defs = customCategories || [];
    return cats.some(cat => {
        const id = cat as string;
        const def = defs.find(c => c.id === id);
        if (def) return def.words.length > 0;
        return ONLINE_STANDARD_CATEGORY_IDS.has(id);
    });
}

function getRandomWord(
    categories: Category[],
    language: 'es' | 'en' | 'pt',
    customCategories: CustomCategory[] = [],
    difficulty: 'easy' | 'medium' | 'hard' | 'all' = 'all',
    isPremiumRoom: boolean = false
): Word {
    const standardCategories: Category[] = [];
    const activeCustomCategoryIds: string[] = [];

    categories.forEach(cat => {
        const id = cat as string;
        const customDef = customCategories.find(c => c.id === id);
        if (customDef) {
            activeCustomCategoryIds.push(id);
        } else if (ONLINE_STANDARD_CATEGORY_IDS.has(id)) {
            standardCategories.push(cat);
        }
    });

    const freeWords = (language === 'pt' ? freeWordsDataPt : language === 'en' ? freeWordsDataEn : freeWordsDataEs) as Word[];
    const premiumWords = (language === 'pt' ? premiumWordsDataPt : language === 'en' ? premiumWordsDataEn : premiumWordsDataEs) as Word[];
    const generalWords = (language === 'pt' ? generalWordsDataPt : language === 'en' ? generalWordsDataEn : generalWordsDataEs) as Word[];
    const generalPremiumWords = (language === 'pt' ? generalPremiumWordsDataPt : language === 'en' ? generalPremiumWordsDataEn : generalPremiumWordsDataEs) as Word[];

    const allWords = isPremiumRoom
        ? [...freeWords, ...premiumWords, ...generalWords, ...generalPremiumWords]
        : [...freeWords, ...generalWords];

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
                categoryDisplayName: customCat.name,
                difficulty: 'medium',
                hint: ''
            }));
            availableWords = [...availableWords, ...customWords];
        }
    });

    if (availableWords.length === 0) {
        const fallbackWords = allWords.filter(w => standardCategories.includes(w.category));
        if (fallbackWords.length > 0) {
            return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        }
        return freeWords[0];
    }

    return availableWords[Math.floor(Math.random() * availableWords.length)];
}

// ─── Provider ───────────────────────────────────────────────────────────────────

export function OnlineGameProvider({ children }: { children: ReactNode }) {
    const [gameState, setGameState] = useState<OnlineGameState>({
        roomCode: null, playerId: null, isHost: false, room: null, error: null,
    });
    const [roomClosed, setRoomClosed] = useState(false);
    const [roomCloseReason, setRoomCloseReason] = useState<OnlineRoomCloseReason | null>(null);
    const [insufficientPlayers, setInsufficientPlayers] = useState(false);
    const clearInsufficientPlayers = () => setInsufficientPlayers(false);

    const clearRoomClosed = () => {
        sessionEndDismissedRef.current = true;
        // Evita un segundo modal por callbacks de Firebase/AppState milisegundos después del OK
        sessionEndCooldownUntilRef.current = Date.now() + 3000;
        sessionEndModalCommittedRef.current = false;
        setInsufficientPlayers(false);
        setRoomClosed(false);
        setRoomCloseReason(null);
        setGameState(prev => ({
            ...prev,
            room: null,
            roomCode: null,
            error: null,
            isHost: false,
        }));
        listenersRef.current = false;
    };

    /** Inicio de una nueva sesión online (crear/unirse): volver a aceptar cierres de sala. */
    const resetSessionEndGuards = () => {
        sessionEndDismissedRef.current = false;
        sessionEndModalCommittedRef.current = false;
        sessionEndCooldownUntilRef.current = 0;
    };

    /** Si devuelve false, no actualizar estado ni modal (doble evento o usuario ya cerró). */
    const tryCommitSessionEndModal = (reason: OnlineRoomCloseReason): boolean => {
        if (Date.now() < sessionEndCooldownUntilRef.current) return false;
        if (sessionEndDismissedRef.current) return false;
        if (sessionEndModalCommittedRef.current) return false;
        sessionEndModalCommittedRef.current = true;
        setRoomCloseReason(reason);
        setInsufficientPlayers(false);
        setRoomClosed(true);
        return true;
    };
    const [hostMigrationNotice, setHostMigrationNotice] = useState<string | null>(null);
    const clearHostMigrationNotice = () => setHostMigrationNotice(null);

    /** Tras pulsar OK en el modal de sala cerrada: ignorar onValue/AppState tardíos (evita segundo flash). */
    const sessionEndDismissedRef = useRef(false);
    /** Primer motivo de cierre gana; no sobrescribir con otro mientras el modal sigue abierto. */
    const sessionEndModalCommittedRef = useRef(false);
    /** Ventana tras OK: no volver a mostrar modal aunque llegue otro evento de cierre. */
    const sessionEndCooldownUntilRef = useRef(0);

    const roomRef = useRef<any>(null);
    const listenersRef = useRef(false);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hostMigrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomDataRef = useRef<OnlineRoom | null>(null);
    const lastReactionTimeRef = useRef(0);
    const { state: globalState } = useGame();
    const isPremiumUser = globalState.isPremium;
    const { t } = useTranslation();

    // Keep roomDataRef in sync
    useEffect(() => { roomDataRef.current = gameState.room; }, [gameState.room]);

    // Salas antiguas sin playerCount: el host escribe el conteo una vez (requerido por reglas RTDB).
    useEffect(() => {
        if (!gameState.isHost || !gameState.roomCode || !gameState.room) return;
        if (typeof gameState.room.playerCount === 'number') return;
        const n = Object.keys(gameState.room.players || {}).length;
        if (n < 1) return;
        update(ref(database, `rooms/${gameState.roomCode}`), { playerCount: n }).catch(() => {});
    }, [gameState.isHost, gameState.roomCode, gameState.room?.playerCount, gameState.room?.players]);

    // ── Init player ID via Anonymous Auth ──────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const uid = await getPlayerId();
            setGameState(prev => ({ ...prev, playerId: uid }));
        };
        init();
    }, []);

    // ── Subscribe to room updates ───────────────────────────────────────────────
    useEffect(() => {
        if (!gameState.roomCode || listenersRef.current) return;

        const rRef = ref(database, `rooms/${gameState.roomCode}`);
        roomRef.current = rRef;

        onValue(rRef, (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameState(prev => ({
                    ...prev,
                    room: data,
                    isHost: data.hostId === prev.playerId
                }));
            } else {
                if (!tryCommitSessionEndModal('room_removed')) {
                    listenersRef.current = false;
                    return;
                }
                // Mantener snapshot de `room` hasta que el usuario pulse OK en el modal (evita pantalla blanca / return null).
                setGameState(prev => ({
                    ...prev,
                    roomCode: null,
                    room: prev.room,
                    error: t.online.errors.room_closed,
                }));
                listenersRef.current = false;
            }
        });

        listenersRef.current = true;

        return () => {
            off(rRef);
            listenersRef.current = false;
        };
    }, [gameState.roomCode]);

    // ── Heartbeat + onDisconnect presence ───────────────────────────────────────
    useEffect(() => {
        if (!gameState.roomCode || !gameState.playerId) return;

        const playerPresenceRef = ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`);

        const markOnline = () => {
            update(playerPresenceRef, {
                lastSeen: serverTimestamp(),
                isConnected: true,
                disconnectedAt: null,
            }).catch(() => {});
        };

        const disconnectHandler = onDisconnect(playerPresenceRef);
        disconnectHandler.update({
            isConnected: false,
            disconnectedAt: serverTimestamp(),
        });

        markOnline();
        const interval = setInterval(markOnline, HEARTBEAT_INTERVAL_MS);
        heartbeatRef.current = interval;

        return () => {
            clearInterval(interval);
            heartbeatRef.current = null;
            disconnectHandler.cancel();
        };
    }, [gameState.roomCode, gameState.playerId]);

    // ── Host Disconnection Monitor (No Migration, Room Closes instead) ─────────
    useEffect(() => {
        if (!gameState.roomCode || !gameState.room) return;
        
        const hostId = gameState.room.hostId;
        const host = gameState.room.players[hostId];

        // 1. HOST: heartbeat periódico (HOST_HEARTBEAT_INTERVAL_MS) para que los clientes detecten anfitrión vivo.
        if (gameState.isHost) {
            const hRef = ref(database, `rooms/${gameState.roomCode}/hostHeartbeat`);
            const interval = setInterval(() => {
                set(hRef, Math.random().toString(36).substring(2)).catch(() => {});
            }, HOST_HEARTBEAT_INTERVAL_MS);
            return () => clearInterval(interval);
        }

        // 2. CLIENT: Monitor the Host's connection and heartbeat
        if (!host) return; 

        // If Firebase already explicitly caught the disconnect (e.g. graceful exit or after 60s timeout)
        if (host.isConnected === false) {
            if (!tryCommitSessionEndModal('host_left')) return;
            leaveRoom({ clearLocalSnapshot: false }).catch(() => {});
            return;
        }

        // 3. CLIENT Heartbeat Watchdog: si el efecto se re-monta (p. ej. reconexión), lastObservedLocalTime
        //    se reinicia aquí; si el beat del host ya estaba estancado, puede pasar ~20s extra antes de
        //    detectar caída (caso benigno; el timeout de 20s es intencional).
        let lastObservedBeat = roomDataRef.current?.hostHeartbeat || '';
        let lastObservedLocalTime = Date.now();

        const watchdog = setInterval(() => {
             const liveRoom = roomDataRef.current;
             if (!liveRoom) return;

             const currentBeat = liveRoom.hostHeartbeat || '';
             if (currentBeat !== lastObservedBeat) {
                 lastObservedBeat = currentBeat;
                 lastObservedLocalTime = Date.now();
             } else {
                 const stagnantMs = Date.now() - lastObservedLocalTime;
                 // If the host hasn't proved to be alive in 20 seconds, they are dead to us.
                 if (stagnantMs > 20000) {
                    clearInterval(watchdog);
                    if (!tryCommitSessionEndModal('connection_lost')) return;
                    leaveRoom({ clearLocalSnapshot: false }).catch(() => {});
                }
             }
        }, 5000);

        return () => clearInterval(watchdog);

    }, [gameState.roomCode, gameState.isHost, gameState.room?.hostId, gameState.room?.players?.[gameState.room?.hostId || '']?.isConnected]);

    // ── Player cleanup: host removes disconnected players after grace period ────
    useEffect(() => {
        if (!gameState.isHost || !gameState.roomCode) return;

        const interval = setInterval(() => {
            const room = roomDataRef.current;
            if (!room) return;
            const now = Date.now();

            Object.entries(room.players).forEach(([id, player]) => {
                if (id === gameState.playerId) return;
                if (player.isConnected === false && player.disconnectedAt) {
                    // Add 5s tolerance for clock skew between serverTimestamp and local Date.now()
                    const disconnectedAge = now - player.disconnectedAt;
                    if (disconnectedAge > PLAYER_GRACE_PERIOD_MS || (disconnectedAge < -5000 && now - (player.lastSeen || 0) > PLAYER_GRACE_PERIOD_MS)) {
                        const code = gameState.roomCode;
                        remove(ref(database, `rooms/${code}/players/${id}`))
                            .then(() => get(ref(database, `rooms/${code}`)))
                            .then(snap => {
                                if (!snap.exists()) return;
                                const r = snap.val() as OnlineRoom;
                                const cnt = Object.keys(r.players || {}).length;
                                return update(ref(database, `rooms/${code}`), { playerCount: cnt });
                            })
                            .catch(() => {});
                    }
                }
            });
        }, 10_000);

        return () => clearInterval(interval);
    }, [gameState.isHost, gameState.roomCode, gameState.playerId]);

    // Track disconnections (with grace period for mobile app backgrounding)
    const prevPlayersRef = useRef<Record<string, OnlinePlayer>>({});
    const disconnectTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const prevStatusRef = useRef<string | null>(null);

    useEffect(() => {
        const room = gameState.room;
        if (!room || !gameState.roomCode) return;

        // Detect game-ending state changes (for ALL clients)
        if (prevStatusRef.current !== 'finished' && room.status === 'finished') {
            if (room.finishReason === 'not_enough_players') {
                Alert.alert('Jugadores Insuficientes', 'Varios jugadores abandonaron y no hay suficientes para continuar.');
            }
            // impostor_disconnected: sin Alert; la UI de resultados ya lo explica.
        }
        prevStatusRef.current = room.status;

        const activeStates: string[] = ['playing', 'clues', 'simultaneous_reveal', 'deciding', 'voting', 'results', 'elimination_choice'];
        
        if (activeStates.includes(room.status)) {
            const oldPlayers = prevPlayersRef.current;
            const newPlayers = room.players || {};

            Object.keys(oldPlayers).forEach(id => {
                const oldPlayer = oldPlayers[id];
                const newPlayer = newPlayers[id];

                const wasConnected = oldPlayer.isConnected !== false;
                const isConnectedNow = newPlayer ? newPlayer.isConnected !== false : false;

                // ── ALL CLIENTS: Detect when a player is finally marked as eliminated due to disconnect
                if (!oldPlayer.isEliminated && newPlayer?.isEliminated && isConnectedNow === false) {
                    Alert.alert('Jugador Desconectado', `El jugador ${oldPlayer.name} abandonó la partida.`);
                }

                // ── HOST ONLY: Manage the 15-second grace period to boot disconnected players
                if (gameState.isHost) {
                    if (wasConnected && !isConnectedNow && !oldPlayer.isEliminated) {
                        if (!disconnectTimersRef.current[id]) {
                            disconnectTimersRef.current[id] = setTimeout(() => {
                                get(ref(database, `rooms/${gameState.roomCode}/players/${id}`)).then(snap => {
                                    const p = snap.val();
                                    if (p && p.isConnected === false && !p.isEliminated) {
                                        const liveRoom = roomDataRef.current;
                                        const isImpostor = (liveRoom?.currentImpostors || []).includes(id);

                                        if (isImpostor) {
                                            update(ref(database, `rooms/${gameState.roomCode}`), {
                                                status: 'finished',
                                                finishReason: 'impostor_disconnected',
                                                lastActivity: serverTimestamp(),
                                            }).catch(() => {});
                                        } else {
                                            const activeCount = Object.values(liveRoom?.players || {}).filter(pl => !pl.isEliminated && pl.isConnected !== false && pl.id !== id).length;
                                            if (activeCount < 3) {
                                                setInsufficientPlayers(true);
                                                update(ref(database, `rooms/${gameState.roomCode}`), {
                                                    status: 'finished',
                                                    finishReason: 'not_enough_players',
                                                    lastActivity: serverTimestamp(),
                                                }).catch(() => {});
                                            } else {
                                                update(ref(database, `rooms/${gameState.roomCode}/players/${id}`), {
                                                    isEliminated: true
                                                }).catch(() => {});
                                            }
                                        }
                                    }
                                });
                            }, 15000);
                        }
                    } else if (!wasConnected && isConnectedNow) {
                        if (disconnectTimersRef.current[id]) {
                            clearTimeout(disconnectTimersRef.current[id]);
                            delete disconnectTimersRef.current[id];
                        }
                    }
                }
            });

            prevPlayersRef.current = newPlayers;
        } else {
            prevPlayersRef.current = room.players || {};
        }

    }, [gameState.room?.players, gameState.room?.status, gameState.roomCode, gameState.isHost]);

    // ── AppState: reconnect on foreground ───────────────────────────────────────
    useEffect(() => {
        const handler = (nextState: AppStateStatus) => {
            if (nextState === 'active' && gameState.roomCode && gameState.playerId) {
                const playerRef = ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`);
                get(ref(database, `rooms/${gameState.roomCode}`)).then(snap => {
                    if (!snap.exists()) {
                        if (!tryCommitSessionEndModal('room_removed')) return;
                        setGameState(prev => ({
                            ...prev,
                            roomCode: null,
                            room: prev.room,
                        }));
                        return;
                    }
                    update(playerRef, {
                        isConnected: true,
                        disconnectedAt: null,
                        lastSeen: serverTimestamp(),
                    }).catch(() => {});

                    const disconnectHandler = onDisconnect(playerRef);
                    disconnectHandler.update({
                        isConnected: false,
                        disconnectedAt: serverTimestamp(),
                    });
                }).catch(() => {});
            }
        };
        const sub = AppState.addEventListener('change', handler);
        return () => sub.remove();
    }, [gameState.roomCode, gameState.playerId]);

    // ── Auto-advance to deciding (simultaneous mode, host only) ─────────────────
    useEffect(() => {
        if (
            gameState.isHost &&
            gameState.room?.status === 'clues' &&
            gameState.room.settings.discussionMode === 'simultaneous'
        ) {
            const players = Object.values(gameState.room.players).filter(p => !p.isEliminated && p.isConnected !== false);
            const allSubmitted = players.length > 0 && players.every(p => p.clue != null);
            if (allSubmitted) {
                update(ref(database, `rooms/${gameState.roomCode}`), {
                    status: 'simultaneous_reveal',
                    lastActivity: serverTimestamp(),
                });
            }
        }
    }, [gameState.room?.players, gameState.room?.status]);

    // ── Resolve round decision (host only) ────────────────────────────────────
    useEffect(() => {
        if (!gameState.isHost || gameState.room?.status !== 'deciding' || !gameState.roomCode) return;

        const room = gameState.room;
        const eligiblePlayers = Object.values(room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        const votes = room.roundDecisionVotes || {};
        const voteCount = Object.keys(votes).filter(id => eligiblePlayers.some(p => p.id === id)).length;
        const allVoted = voteCount >= eligiblePlayers.length && eligiblePlayers.length > 0;

        let goVoteCount = 0;
        let anotherRoundCount = 0;
        Object.entries(votes).forEach(([id, v]) => {
            if (!eligiblePlayers.some(p => p.id === id)) return;
            if (v === 'go_vote') goVoteCount++;
            else if (v === 'another_round') anotherRoundCount++;
        });

        const threshold = Math.floor(eligiblePlayers.length / 2) + 1;
        const strictMajorityReached = goVoteCount >= threshold || anotherRoundCount >= threshold;

        const startTime = room.roundDecisionStartTime || Date.now();
        const elapsed = Date.now() - startTime;
        const DECISION_TIMEOUT_MS = 10_000;

        const resolve = () => {
            if (anotherRoundCount > goVoteCount) {
                const players = eligiblePlayers;
                const shuffledOrder = [...players].sort(() => Math.random() - 0.5).map(p => p.id);
                const updates: Record<string, any> = {
                    status: 'clues',
                    turnOrder: shuffledOrder,
                    currentTurnIndex: 0,
                    cluePhaseStartTime: serverTimestamp(),
                    roundDecisionVotes: null,
                    roundDecisionStartTime: null,
                    clueRound: (room.clueRound || 1) + 1,
                    lastActivity: serverTimestamp(),
                };
                players.forEach(p => { updates[`players/${p.id}/clue`] = null; });
                update(ref(database, `rooms/${gameState.roomCode}`), updates);
            } else {
                update(ref(database, `rooms/${gameState.roomCode}`), {
                    status: 'voting',
                    votingPhaseStartTime: serverTimestamp(),
                    roundDecisionVotes: null,
                    roundDecisionStartTime: null,
                    lastActivity: serverTimestamp(),
                });
            }
        };

        if (allVoted || strictMajorityReached) {
            resolve();
            return;
        }

        const remaining = Math.max(100, DECISION_TIMEOUT_MS - elapsed);
        const timer = setTimeout(resolve, remaining);
        return () => clearTimeout(timer);
    }, [
        gameState.isHost, gameState.room?.status, gameState.roomCode,
        gameState.room?.roundDecisionVotes, gameState.room?.roundDecisionStartTime,
        gameState.room?.players
    ]);

    // ── Resolver votación: todos votaron O se cumple el tiempo máximo (30s) ─────
    useEffect(() => {
        if (!gameState.isHost || gameState.room?.status !== 'voting' || !gameState.roomCode) return;

        const room = gameState.room;
        const players = Object.values(room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        if (players.length === 0) return;

        const votes = players.map(p => p.vote).filter(v => v != null) as string[];
        const allVoted = votes.length === players.length;
        
        const voteCountsTemp: Record<string, number> = {};
        votes.forEach(v => { voteCountsTemp[v] = (voteCountsTemp[v] || 0) + 1; });
        const threshold = Math.floor(players.length / 2) + 1;
        const strictMajorityReached = Object.values(voteCountsTemp).some(count => count >= threshold);

        const startTime = room.votingPhaseStartTime ?? Date.now();
        const elapsed = Date.now() - startTime;
        const timedOut = elapsed >= VOTING_PHASE_TIMEOUT_MS;

        const applyResults = () => {
            const live = roomDataRef.current;
            const code = live?.id || gameState.roomCode;
            if (!live || live.status !== 'voting' || !code) return;

            const pl = Object.values(live.players).filter(p => !p.isEliminated && p.isConnected !== false);
            if (pl.length === 0) return;

            const voteCounts: Record<string, number> = {};
            pl.forEach(p => {
                if (p.vote) voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
            });

            const castVotes = pl.map(p => p.vote).filter(v => v != null);
            if (castVotes.length === 0) {
                update(ref(database, `rooms/${code}`), {
                    status: 'results',
                    voteCounts: {},
                    isTie: true,
                    lastEliminatedId: null,
                    votingPhaseStartTime: null,
                    lastActivity: serverTimestamp(),
                });
                return;
            }

            let maxVotes = 0;
            let eliminatedId: string | null = null;
            let tie = false;

            for (const [id, count] of Object.entries(voteCounts)) {
                if (count > maxVotes) { maxVotes = count; eliminatedId = id; tie = false; }
                else if (count === maxVotes) { tie = true; }
            }

            if (tie) {
                update(ref(database, `rooms/${code}`), {
                    status: 'results',
                    voteCounts,
                    isTie: true,
                    lastEliminatedId: null,
                    votingPhaseStartTime: null,
                    lastActivity: serverTimestamp(),
                });
                return;
            }

            if (!eliminatedId) return;

            const impostorIds = live.currentImpostors || [];
            const eliminatedIsImpostor = impostorIds.includes(eliminatedId);
            const activeBeforeElimination = pl.length;

            const updates: Record<string, any> = {
                voteCounts,
                isTie: false,
                lastEliminatedId: eliminatedId,
                votingPhaseStartTime: null,
                lastActivity: serverTimestamp(),
                [`players/${eliminatedId}/isEliminated`]: true,
                eliminationChoiceVotes: null,
            };

            pl.forEach(p => { updates[`players/${p.id}/vote`] = null; });

            if (eliminatedIsImpostor) {
                // Check if there are MORE active impostors remaining
                const remainingImpostors = impostorIds.filter(
                    id => id !== eliminatedId && !live.players[id]?.isEliminated
                );
                if (remainingImpostors.length === 0) {
                    // All impostors eliminated — civilians win
                    updates.status = 'results';
                    updates.winner = 'civilians';
                    updates.eliminationChoiceStartTime = null;
                } else {
                    // There are still active impostors — game continues
                    // Show results briefly then decide: with 3 active players left game could be risky
                    const activeAfter = activeBeforeElimination - 1;
                    if (activeAfter <= 2) {
                        // Too few players to continue meaningfully
                        updates.status = 'results';
                        updates.winner = 'civilians';
                        updates.eliminationChoiceStartTime = null;
                    } else {
                        // Continue — let players decide next round or vote again
                        updates.status = 'elimination_choice';
                        updates.eliminationChoiceStartTime = serverTimestamp();
                    }
                }
                update(ref(database, `rooms/${code}`), updates);
                return;
            }

            // Civil eliminado: con 3 jugadores en juego la partida termina; con 4+ se decide en grupo.
            if (activeBeforeElimination <= 3) {
                updates.status = 'finished';
                updates.winner = 'impostors';
                updates.eliminationChoiceStartTime = null;
            } else {
                updates.status = 'elimination_choice';
                updates.eliminationChoiceStartTime = serverTimestamp();
            }

            update(ref(database, `rooms/${code}`), updates);
        };

        if (allVoted || strictMajorityReached) {
            applyResults();
            return;
        }

        const remaining = Math.max(50, VOTING_PHASE_TIMEOUT_MS - elapsed);
        const timer = setTimeout(applyResults, remaining);
        return () => clearTimeout(timer);
    }, [
        gameState.isHost,
        gameState.room?.status,
        gameState.roomCode,
        gameState.room?.players,
        gameState.room?.votingPhaseStartTime,
    ]);

    // ── Resolver decisión tras eliminar a un civil (4+ jugadores): continuar o revelar ──
    useEffect(() => {
        if (!gameState.isHost || gameState.room?.status !== 'elimination_choice' || !gameState.roomCode) return;

        const room = gameState.room;
        const eligiblePlayers = Object.values(room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        const votes = room.eliminationChoiceVotes || {};
        const voteCount = Object.keys(votes).filter(id => eligiblePlayers.some(p => p.id === id)).length;
        const allVoted = voteCount >= eligiblePlayers.length && eligiblePlayers.length > 0;

        let continueSameCount = 0;
        let revealCountTotal = 0;
        Object.entries(votes).forEach(([id, v]) => {
            if (!eligiblePlayers.some(p => p.id === id)) return;
            if (v === 'continue_same') continueSameCount++;
            else if (v === 'reveal_impostor') revealCountTotal++;
        });

        const threshold = Math.floor(eligiblePlayers.length / 2) + 1;
        const strictMajorityReached = continueSameCount >= threshold || revealCountTotal >= threshold;

        const startTime = room.eliminationChoiceStartTime || Date.now();
        const elapsed = Date.now() - startTime;

        const resolve = async () => {
            const code = gameState.roomCode;
            if (!code) return;
            const snap = await get(ref(database, `rooms/${code}`));
            if (!snap.exists()) return;
            const live = snap.val() as OnlineRoom;
            if (!live || live.status !== 'elimination_choice') return;

            const elig = Object.values(live.players).filter(p => !p.isEliminated && p.isConnected !== false);
            const v = live.eliminationChoiceVotes || {};
            let continueCount = 0;
            let revealCount = 0;
            Object.entries(v).forEach(([pid, c]) => {
                if (!elig.some(p => p.id === pid)) return;
                if (c === 'continue_same') continueCount++;
                else if (c === 'reveal_impostor') revealCount++;
            });

            // "Si nadie votaba por alguna razón, igual deberíamos pasar a VOTAR automáticamente."
            // So default/tie goes to reveal_impostor (results -> voting modal)
            const goContinue = continueCount > revealCount;

            if (goContinue) {
                const shuffledOrder = [...elig].sort(() => Math.random() - 0.5).map(p => p.id);
                const updates: Record<string, any> = {
                    status: 'clues',
                    turnOrder: shuffledOrder,
                    currentTurnIndex: 0,
                    cluePhaseStartTime: serverTimestamp(),
                    eliminationChoiceVotes: null,
                    eliminationChoiceStartTime: null,
                    lastActivity: serverTimestamp(),
                    clueRound: (live.clueRound || 1) + 1,
                };
                elig.forEach(p => { updates[`players/${p.id}/clue`] = null; });
                await update(ref(database, `rooms/${code}`), updates);
            } else {
                await update(ref(database, `rooms/${code}`), {
                    status: 'results',
                    eliminationChoiceVotes: null,
                    eliminationChoiceStartTime: null,
                    lastActivity: serverTimestamp(),
                });
            }
        };

        if (allVoted || strictMajorityReached) {
            void resolve().catch(() => {});
            return;
        }

        const remaining = Math.max(100, ELIMINATION_CHOICE_TIMEOUT_MS - elapsed);
        const timer = setTimeout(() => { void resolve().catch(() => {}); }, remaining);
        return () => clearTimeout(timer);
    }, [
        gameState.isHost,
        gameState.room?.status,
        gameState.roomCode,
        gameState.room?.eliminationChoiceVotes,
        gameState.room?.eliminationChoiceStartTime,
        gameState.room?.players,
    ]);

    // ── Update lastActivity helper ──────────────────────────────────────────────
    const touchActivity = useCallback(() => {
        if (!gameState.roomCode) return;
        update(ref(database, `rooms/${gameState.roomCode}`), { lastActivity: serverTimestamp() }).catch(() => {});
    }, [gameState.roomCode]);

    // ── Stale room cleanup on any room access ───────────────────────────────────
    const cleanupStaleRooms = useCallback(async (codeToCheck?: string) => {
        if (!codeToCheck) return;
        try {
            const snap = await get(ref(database, `rooms/${codeToCheck}`));
            if (!snap.exists()) return;
            const room = snap.val() as OnlineRoom;
            const now = Date.now();
            const age = now - (room.lastActivity || room.createdAt || 0);
            const isStale =
                (room.status === 'waiting' && age > INACTIVITY_WAITING_MS) ||
                (room.status !== 'waiting' && age > INACTIVITY_PLAYING_MS);
            if (isStale) {
                await remove(ref(database, `rooms/${codeToCheck}`));
            }
        } catch { /* ignore */ }
    }, []);

    // ── createRoom (with transaction for atomicity) ─────────────────────────────
    const createRoom = async (playerName: string): Promise<string> => {
        if (!gameState.playerId) throw new Error("No player ID");
        resetSessionEndGuards();

        const maxRetries = 10;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const roomCode = generateRoomCode();
            const rRef = ref(database, `rooms/${roomCode}`);

            const result = await runTransaction(rRef, (currentData: any) => {
                if (currentData !== null) return;

                const maxPlayers = isPremiumUser ? MAX_PLAYERS_PREMIUM : MAX_PLAYERS_FREE;

                const hostPlayer: OnlinePlayer = {
                    id: gameState.playerId!,
                    name: playerName,
                    avatar: `avatar_${Math.floor(Math.random() * TOTAL_AVATARS) + 1}` as Avatar,
                    isHost: true,
                    isReady: true,
                    score: 0,
                    isEliminated: false,
                    isConnected: true,
                    lastSeen: Date.now(),
                };

                const newRoom: any = {
                    id: roomCode,
                    hostId: gameState.playerId,
                    originalHostId: gameState.playerId,
                    originalHostName: playerName,
                    status: 'waiting',
                    players: { [gameState.playerId!]: hostPlayer },
                    settings: {
                        impostorCount: 1,
                        gameDuration: null,
                        language: (() => { const lc = getLocales()[0]?.languageCode; return lc === 'es' ? 'es' : lc === 'pt' ? 'pt' : 'en'; })(),
                        categories: ['personajes_biblicos', 'libros_biblicos', 'objetos_biblicos'],
                        customCategories: globalState.customCategories?.length
                            ? globalState.customCategories.map(c => ({ ...c }))
                            : [],
                        isPremiumRoom: isPremiumUser,
                        impostorHint: false,
                        isConfigured: false,
                        discussionMode: 'turns',
                        clueDuration: 30,
                        maxPlayers,
                    },
                    playerCount: 1,
                    createdAt: Date.now(),
                    lastActivity: Date.now(),
                };

                return newRoom;
            });

            if (result.committed && result.snapshot.val()) {
                const code = result.snapshot.val().id;
                // Set server timestamps after transaction
                await update(rRef, {
                    createdAt: serverTimestamp(),
                    lastActivity: serverTimestamp(),
                    [`players/${gameState.playerId}/lastSeen`]: serverTimestamp(),
                });
                setGameState(prev => ({ ...prev, roomCode: code, isHost: true }));
                return code;
            }
        }
        throw new Error("Could not create room after retries");
    };

    // ── joinRoom (transaction-based for atomic maxPlayers check) ──────────────
    const joinRoom = async (roomCode: string, playerName: string): Promise<boolean> => {
        if (!gameState.playerId) throw new Error("No player ID");
        resetSessionEndGuards();

        await cleanupStaleRooms(roomCode);

        const playerId = gameState.playerId;
        const rRef = ref(database, `rooms/${roomCode}`);

        // Pre-flight: check room exists
        const preSnap = await get(rRef);
        if (!preSnap.exists()) return false;

        const preRoom = preSnap.val() as OnlineRoom;

        // Expired check
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (preRoom.createdAt && Date.now() - preRoom.createdAt > ONE_DAY_MS) {
            await remove(rRef);
            return false;
        }

        // Re-join: player already exists in the room (e.g. reconnecting)
        if (preRoom.players && preRoom.players[playerId]) {
            await update(ref(database, `rooms/${roomCode}/players/${playerId}`), {
                name: playerName,
                isConnected: true,
                disconnectedAt: null,
                lastSeen: serverTimestamp(),
            });
            await update(rRef, { lastActivity: serverTimestamp() });
            setGameState(prev => ({ ...prev, roomCode, isHost: preRoom.hostId === playerId }));
            return true;
        }

        // New player: must be in waiting status
        if (preRoom.status !== 'waiting') throw new Error("Game already started");

        // Use transaction for atomic player count check
        const avatar = getNextAvatar(Object.values(preRoom.players || {}));
        const result = await runTransaction(rRef, (currentRoom: any) => {
            if (!currentRoom) return currentRoom;

            // Re-validate inside transaction
            if (currentRoom.status !== 'waiting') return; // abort
            const players = currentRoom.players || {};
            const playerCount = Object.keys(players).length;
            const maxPlayers = currentRoom.settings?.maxPlayers || MAX_PLAYERS_FREE;
            if (playerCount >= maxPlayers) return; // abort

            // Add player atomically
            currentRoom.players[playerId] = {
                id: playerId,
                name: playerName,
                avatar,
                isHost: false,
                isReady: true,
                score: 0,
                isEliminated: false,
                isConnected: true,
                lastSeen: Date.now(),
            };
            currentRoom.playerCount = Object.keys(currentRoom.players).length;
            return currentRoom;
        });

        if (!result.committed || !result.snapshot.val()) {
            // Transaction aborted — determine reason
            const freshSnap = await get(rRef);
            if (!freshSnap.exists()) return false;
            const freshRoom = freshSnap.val() as OnlineRoom;
            if (freshRoom.status !== 'waiting') throw new Error("Game already started");
            throw new Error("Room full");
        }

        // Set server timestamps after transaction
        await update(ref(database, `rooms/${roomCode}/players/${playerId}`), { lastSeen: serverTimestamp() });
        await update(rRef, { lastActivity: serverTimestamp() });

        setGameState(prev => ({ ...prev, roomCode, isHost: false }));
        return true;
    };

    // ── leaveRoom: salida voluntaria — el anfitrión CIERRA la sala para todos.
    //    No-host: runTransaction atómica evita sala zombie si dos jugadores salen a la vez (revisión código).
    const leaveRoom = async (opts?: { clearLocalSnapshot?: boolean }) => {
        const clearLocalSnapshot = opts?.clearLocalSnapshot !== false;
        if (!gameState.roomCode || !gameState.playerId) return;

        try {
            if (gameState.isHost) {
                await remove(ref(database, `rooms/${gameState.roomCode}`));
            } else {
                const code = gameState.roomCode;
                const playerId = gameState.playerId;
                const roomRef = ref(database, `rooms/${code}`);
                await runTransaction(roomRef, (current: any) => {
                    if (!current) return;
                    const players = current.players ? { ...current.players } : {};
                    if (!players[playerId]) {
                        return Object.keys(players).length === 0 ? null : current;
                    }
                    delete players[playerId];
                    const nextCount = Object.keys(players).length;
                    if (nextCount === 0) {
                        return null;
                    }
                    return { ...current, players, playerCount: nextCount };
                });
            }
        } catch (e) {
            console.error("Error leaving room:", e);
        }

        setGameState(prev => ({
            ...prev,
            roomCode: null,
            isHost: false,
            ...(clearLocalSnapshot ? { room: null, error: null } : {}),
        }));
        listenersRef.current = false;
    };

    // ── updateSettings (respects premium immutability for migrated hosts) ────────
    const updateSettings = async (settings: Partial<OnlineRoom['settings']>) => {
        if (!gameState.roomCode || !gameState.isHost) return;

        const room = gameState.room;
        if (!room) return;

        const isOriginalHost = room.originalHostId === gameState.playerId;

        if (!isOriginalHost && room.settings.isPremiumRoom) {
            const { categories, customCategories, isPremiumRoom, maxPlayers, ...safeSettings } = settings as any;
            await update(ref(database, `rooms/${gameState.roomCode}/settings`), safeSettings);
        } else {
            await update(ref(database, `rooms/${gameState.roomCode}/settings`), settings);
        }

        touchActivity();
    };

    // ── startGame ───────────────────────────────────────────────────────────────
    const startGame = async (settingsJustSaved?: Partial<OnlineRoom['settings']>) => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        const players = Object.values(gameState.room.players).filter(p => p.isConnected !== false);
        if (players.length < 3) return;

        const settings: OnlineRoom['settings'] = {
            ...gameState.room.settings,
            ...(settingsJustSaved || {}),
        };

        if (!hasPlayableCategorySelection(settings.categories, settings.customCategories)) {
            return;
        }

        const impostorCount = settings.impostorCount;
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);
        const updates: Record<string, any> = {};

        players.forEach(p => {
            updates[`players/${p.id}/role`] = impostorIds.includes(p.id) ? 'impostor' : 'civilian';
            updates[`players/${p.id}/isEliminated`] = false;
            updates[`players/${p.id}/vote`] = null;
        });

        const word = getRandomWord(
            settings.categories,
            settings.language,
            settings.customCategories,
            'all',
            settings.isPremiumRoom
        );

        updates['currentWord'] = word;
        updates['currentImpostors'] = impostorIds;
        updates['status'] = 'playing';
        updates['currentRoundStartTime'] = serverTimestamp();
        updates['turnOrder'] = null;
        updates['currentTurnIndex'] = null;
        updates['cluePhaseStartTime'] = null;
        updates['votingPhaseStartTime'] = null;
        updates['lastActivity'] = serverTimestamp();
        updates['reactions'] = null;
        updates['eliminationChoiceVotes'] = null;
        updates['eliminationChoiceStartTime'] = null;
        
        updates['voteCounts'] = null;
        updates['isTie'] = null;
        updates['lastEliminatedId'] = null;
        updates['winner'] = null;
        updates['finishReason'] = null;
        updates['roundDecisionVotes'] = null;
        updates['roundDecisionStartTime'] = null;
        updates['postResultVotes'] = null;
        updates['postResultStartTime'] = null;
        updates['clueRound'] = null;

        players.forEach(p => { updates[`players/${p.id}/clue`] = null; });

        // Save premium categories snapshot on first game start
        if (!gameState.room.premiumCategoriesSnapshot && settings.isPremiumRoom) {
            updates['premiumCategoriesSnapshot'] = settings.categories;
        }

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    // ── startCluePhase ──────────────────────────────────────────────────────────
    const startCluePhase = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        const players = Object.values(gameState.room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        const shuffledOrder = [...players].sort(() => Math.random() - 0.5).map(p => p.id);

        const updates: Record<string, any> = {
            status: 'clues',
            turnOrder: shuffledOrder,
            currentTurnIndex: 0,
            cluePhaseStartTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
        };
        players.forEach(p => { updates[`players/${p.id}/clue`] = null; });

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    // ── submitClue ──────────────────────────────────────────────────────────────
    const submitClue = async (clue: string) => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`), { clue });
        touchActivity();
    };

    // ── advanceTurn ─────────────────────────────────────────────────────────────
    const advanceTurn = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        const turnOrder = gameState.room.turnOrder || [];
        const currentIndex = gameState.room.currentTurnIndex ?? 0;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= turnOrder.length) {
            await update(ref(database, `rooms/${gameState.roomCode}`), {
                status: 'deciding',
                roundDecisionVotes: null,
                roundDecisionStartTime: serverTimestamp(),
                lastActivity: serverTimestamp(),
            });
        } else {
            await update(ref(database, `rooms/${gameState.roomCode}`), {
                currentTurnIndex: nextIndex,
                cluePhaseStartTime: serverTimestamp(),
                lastActivity: serverTimestamp(),
            });
        }
    };

    // ── submitRoundDecision ──────────────────────────────────────────────────────
    const submitRoundDecision = async (decision: 'go_vote' | 'another_round') => {
        if (!gameState.roomCode || !gameState.playerId) return;
        await update(ref(database, `rooms/${gameState.roomCode}/roundDecisionVotes`), {
            [gameState.playerId]: decision,
        });
    };

    const submitEliminationChoice = async (choice: 'continue_same' | 'reveal_impostor') => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        const me = gameState.room.players[gameState.playerId];
        if (!me || me.isEliminated) return;
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            [`eliminationChoiceVotes/${gameState.playerId}`]: choice,
            lastActivity: serverTimestamp(),
        });
        touchActivity();
    };

    const openRoundDecisionAfterSimultaneousReveal = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        if (gameState.room.status !== 'simultaneous_reveal') return;
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            status: 'deciding',
            roundDecisionVotes: null,
            roundDecisionStartTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
        });
        touchActivity();
    };

    // ── startVoting ─────────────────────────────────────────────────────────────
    const startVoting = async () => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            status: 'voting',
            votingPhaseStartTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
        });
    };

    // ── submitVote ──────────────────────────────────────────────────────────────
    const submitVote = async (votedForId: string) => {
        if (!gameState.roomCode || !gameState.playerId) return;
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`), {
            vote: votedForId
        });
        touchActivity();
    };

    /** Solo modo clásico / uso manual; en online la eliminación la aplica el host vía efecto de resolución de votación (evitar doble escritura). */
    // ── eliminatePlayer ─────────────────────────────────────────────────────────
    const eliminatePlayer = async (playerId: string) => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await update(ref(database, `rooms/${gameState.roomCode}/players/${playerId}`), { isEliminated: true });

        const room = gameState.room!;
        const players = Object.values(room.players);
        const activeImpostors = players.filter(p => p.role === 'impostor' && !p.isEliminated && p.id !== playerId);

        if (activeImpostors.length === 0) {
            // All impostors eliminated
            await update(ref(database, `rooms/${gameState.roomCode}`), {
                status: 'finished',
                winner: 'civilians',
                lastActivity: serverTimestamp(),
            });
        }
        // If impostors remain, game should continue via normal flow
    };

    // ── nextRound ───────────────────────────────────────────────────────────────
    const nextRound = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        if (!hasPlayableCategorySelection(
            gameState.room.settings.categories,
            gameState.room.settings.customCategories
        )) {
            return;
        }

        // Misma convención que startGame: pool = conectados; isEliminated se resetea para todos en el forEach de abajo (nueva partida).
        const players = Object.values(gameState.room.players).filter(p => p.isConnected !== false);

        if (players.length < 3) {
            Alert.alert('Jugadores Insuficientes', 'Se requieren al menos 3 jugadores para iniciar otra partida.');
            return;
        }

        const impostorCount = gameState.room.settings.impostorCount;
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);
        const updates: Record<string, any> = {};

        players.forEach(p => {
            updates[`players/${p.id}/role`] = impostorIds.includes(p.id) ? 'impostor' : 'civilian';
            updates[`players/${p.id}/isEliminated`] = false;
            updates[`players/${p.id}/vote`] = null;
            updates[`players/${p.id}/clue`] = null;
        });

        const word = getRandomWord(
            gameState.room.settings.categories,
            gameState.room.settings.language,
            gameState.room.settings.customCategories,
            'all',
            gameState.room.settings.isPremiumRoom
        );

        updates['currentWord'] = word;
        updates['currentImpostors'] = impostorIds;
        updates['status'] = 'playing';
        updates['currentRoundStartTime'] = serverTimestamp();
        updates['turnOrder'] = null;
        updates['currentTurnIndex'] = null;
        updates['cluePhaseStartTime'] = null;
        updates['lastActivity'] = serverTimestamp();
        updates['reactions'] = null;
        updates['voteCounts'] = null;
        updates['isTie'] = null;
        updates['lastEliminatedId'] = null;
        updates['roundDecisionVotes'] = null;
        updates['roundDecisionStartTime'] = null;
        updates['postResultVotes'] = null;
        updates['postResultStartTime'] = null;
        updates['clueRound'] = null;
        updates['votingPhaseStartTime'] = null;
        updates['eliminationChoiceVotes'] = null;
        updates['eliminationChoiceStartTime'] = null;
        updates['winner'] = null;
        updates['finishReason'] = null;
        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    // ── continueRound ───────────────────────────────────────────────────────────
    const continueRound = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        const updates: Record<string, any> = {};
        const players = Object.values(gameState.room.players);
        players.forEach(p => { updates[`players/${p.id}/vote`] = null; });

        updates['status'] = 'playing';
        updates['currentRoundStartTime'] = serverTimestamp();
        updates['votingPhaseStartTime'] = null;
        updates['lastActivity'] = serverTimestamp();

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    // ── resetToLobby ────────────────────────────────────────────────────────────
    const resetToLobby = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        const updates: Record<string, any> = {
            status: 'waiting',
            currentWord: null,
            currentImpostors: null,
            currentRoundStartTime: null,
            turnOrder: null,
            currentTurnIndex: null,
            cluePhaseStartTime: null,
            voteCounts: null,
            isTie: null,
            lastEliminatedId: null,
            winner: null,
            finishReason: null,
            reactions: null,
            postResultVotes: null,
            postResultStartTime: null,
            roundDecisionVotes: null,
            roundDecisionStartTime: null,
            clueRound: null,
            votingPhaseStartTime: null,
            eliminationChoiceVotes: null,
            eliminationChoiceStartTime: null,
            lastActivity: serverTimestamp(),
        };

        Object.values(gameState.room.players).forEach(p => {
            updates[`players/${p.id}/role`] = null;
            updates[`players/${p.id}/vote`] = null;
            updates[`players/${p.id}/clue`] = null;
            updates[`players/${p.id}/isEliminated`] = false;
        });

        await update(ref(database, `rooms/${gameState.roomCode}`), updates);
    };

    // ── playAgain (alias for startGame) ─────────────────────────────────────────
    const playAgain = async () => {
        if (!gameState.roomCode || !gameState.isHost) return;
        await startGame();
    };

    // ── sendReaction ────────────────────────────────────────────────────────────
    const sendReaction = async (emoji: string) => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;

        const now = Date.now();
        if (now - lastReactionTimeRef.current < REACTION_COOLDOWN_MS) return;
        lastReactionTimeRef.current = now;

        const me = gameState.room.players[gameState.playerId];
        if (!me) return;

        const reactionsRef = ref(database, `rooms/${gameState.roomCode}/reactions`);
        const newRef = push(reactionsRef);
        const reaction: any = {
            emoji,
            playerName: me.name,
            playerId: gameState.playerId,
            timestamp: serverTimestamp(),
        };

        void set(newRef, reaction)
            .then(() => {
                setTimeout(() => {
                    remove(newRef).catch(() => {});
                }, 5000);
            })
            .catch(() => {});
    };

    // ─── Provide context ────────────────────────────────────────────────────────

    return (
        <OnlineGameContext.Provider value={{
            gameState,
            roomClosed,
            roomCloseReason,
            clearRoomClosed,
            insufficientPlayers,
            clearInsufficientPlayers,
            hostMigrationNotice,
            clearHostMigrationNotice,
            createRoom,
            joinRoom,
            leaveRoom,
            startGame,
            startVoting,
            submitVote,
            playAgain,
            updateSettings,
            nextRound,
            continueRound,
            eliminatePlayer,
            startCluePhase,
            submitClue,
            advanceTurn,
            submitRoundDecision,
            submitEliminationChoice,
            openRoundDecisionAfterSimultaneousReveal,
            sendReaction,
            resetToLobby,
        }}>
            {children}
        </OnlineGameContext.Provider>
    );
}

export function useOnlineGame() {
    const context = useContext(OnlineGameContext);
    if (!context) throw new Error('useOnlineGame must be used within OnlineGameProvider');
    return context;
}
