import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { database, ensureAnonymousAuth, auth } from '../config/firebase';
import {
    ref, set, get, update, onValue, off, remove,
    onDisconnect, serverTimestamp, runTransaction, push, DataSnapshot
} from 'firebase/database';
import {
    OnlineGameState, OnlineRoom, OnlinePlayer, Category, CustomCategory,
    Word, Avatar, OnlineReaction, OnlineMessage, OnlineRoomCloseReason, Language
} from '../types';
import { getLocales } from 'expo-localization';
import { AppState, AppStateStatus, Platform, Alert } from 'react-native';
import { TOTAL_AVATARS } from '../utils/avatarAssets';
import { useGame } from './GameContext';
import { useTranslation } from '../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONLINE_STANDARD_CATEGORY_IDS } from '../utils/categoryMetadata';
import { logOnlineAnalytics } from '../utils/onlineAnalytics';

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

const MAX_PLAYERS_FREE = 7;
const MAX_PLAYERS_PREMIUM = 15;
const CLUE_REVIEW_TIMEOUT_MS = 10_000;
const PLAYER_GRACE_PERIOD_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
/** Intervalo de hostHeartbeat en Firebase (menos escrituras que 5s; el watchdog sigue en 20s de estancamiento). */
const HOST_HEARTBEAT_INTERVAL_MS = 12_000;
/** Sin cambios en `hostHeartbeat` durante este tiempo → cliente considera perdida la conexión con el anfitrión. */
const HOST_HEARTBEAT_STAGNANT_MS = 20_000;
const INACTIVITY_WAITING_MS = 30 * 60 * 1000;
const INACTIVITY_PLAYING_MS = 2 * 60 * 60 * 1000;
const MAX_STALE_SCAN_ROOMS_PER_RUN = 20;
const REACTION_COOLDOWN_MS = 800;
const VOTING_PHASE_TIMEOUT_MS = 30_000;
const ELIMINATION_CHOICE_TIMEOUT_MS = 45_000;
const WORD_HISTORY_LIMIT = 40;
const IMPOSTOR_HISTORY_LIMIT = 60;
const JOIN_AD_STUCK_TIMEOUT_MS = 60_000;

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
    playerPresenceNotice: string | null;
    clearPlayerPresenceNotice: () => void;
    kickedFromRoom: boolean;
    clearKickedFromRoom: () => void;
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
    submitReadyCheck: () => Promise<void>;
    cancelReadyCheck: () => Promise<void>;
    /** Tras ver todas las pistas en modo simultáneo: pasa a revisión grupal y luego al modal Votar / Otra ronda. */
    openRoundDecisionAfterSimultaneousReveal: () => Promise<void>;
    /** Marca “listo” en la fase de revisión de pistas (antes de votar u otra ronda). */
    submitClueReviewReady: () => Promise<void>;
    /** Quita el flag de aviso tras empate en votación (solo anfitrión). */
    clearVoteTieRecovery: () => Promise<void>;
    /** Actualiza el estado de ingreso al lobby para sincronizar Ads y readiness. */
    updateMyJoinState: (state: 'joining' | 'watching_ad' | 'ready') => Promise<void>;
    sendReaction: (emoji: string) => void;
    sendQuickMessage: (messageKey: string, messageText?: string) => void;
    sendChatMessage: (text: string, isUserPremium?: boolean) => void;
    kickPlayer: (playerId: string) => Promise<void>;
    resetToLobby: () => Promise<void>;
    cleanupStaleRooms: (codeToCheck?: string) => Promise<void>;
    /** Draft local de configuración: persiste mientras el provider esté montado (no se pierde al navegar). */
    settingsDraft: OnlineRoom['settings'] | null;
    updateSettingsDraft: (patch: Partial<OnlineRoom['settings']>) => void;
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

/** Descarta nodos nulos, vacíos o sin nombre (carreras al borrar / RTDB). Evita cards en blanco en el lobby. */
function sanitizeOnlinePlayers(raw: Record<string, unknown> | null | undefined): Record<string, OnlinePlayer> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, OnlinePlayer> = {};
    for (const [key, val] of Object.entries(raw)) {
        if (val == null || typeof val !== 'object') continue;
        const v = val as OnlinePlayer;
        const id = typeof v.id === 'string' && v.id.length > 0 ? v.id : key;
        const name = typeof v.name === 'string' ? v.name.trim() : '';
        if (!name) continue;
        out[id] = { ...v, id };
    }
    return out;
}

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

function defaultLanguageFromLocale(): Language {
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? 'es';
    if (code === 'es') return 'es';
    if (code === 'pt') return 'pt';
    return 'en';
}

function normalizeOnlinePlayerName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** Tras empate (o sin votos): misma palabra e impostores, nueva ronda de pistas sin pasar por resultados. */
function buildVoteTieDetails(live: OnlineRoom, pl: OnlinePlayer[]): Array<{ playerId: string; name: string; votes: number }> {
    const voteCounts: Record<string, number> = {};
    pl.forEach(p => {
        if (p.vote) voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
    });
    const maxVotes = Math.max(0, ...Object.values(voteCounts));
    if (maxVotes === 0) return [];
    return Object.entries(voteCounts)
        .filter(([, count]) => count === maxVotes)
        .map(([playerId, votes]) => ({
            playerId,
            name: live.players[playerId]?.name?.trim() || '?',
            votes,
        }));
}

function buildVoteTieRecoveryUpdates(live: OnlineRoom, pl: OnlinePlayer[], nextStreak: number): Record<string, any> {
    const shuffledOrder = [...pl].sort(() => Math.random() - 0.5).map(p => p.id);
    const updates: Record<string, any> = {
        status: 'clues',
        turnOrder: shuffledOrder,
        currentTurnIndex: 0,
        cluePhaseStartTime: serverTimestamp(),
        voteCounts: null,
        voteTieDetails: buildVoteTieDetails(live, pl),
        isTie: null,
        lastEliminatedId: null,
        votingPhaseStartTime: null,
        voteTieRecovery: true,
        voteTieStreak: nextStreak,
        clueReviewReady: null,
        clueReviewStartTime: null,
        lastActivity: serverTimestamp(),
        clueRound: (live.clueRound || 1) + 1,
    };
    pl.forEach(p => {
        updates[`players/${p.id}/vote`] = null;
        updates[`players/${p.id}/clue`] = null;
    });
    return updates;
}

/** Tercer empate seguido (o tercer bloqueo de votación): partida terminada; la UI revela impostor/palabra en resultados. */
function buildTechnicalTieFinishUpdates(_live: OnlineRoom, pl: OnlinePlayer[]): Record<string, any> {
    const voteCounts: Record<string, number> = {};
    pl.forEach(p => {
        if (p.vote) voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
    });
    const hasVotes = Object.keys(voteCounts).length > 0;
    const updates: Record<string, any> = {
        status: 'finished',
        finishReason: 'technical_tie',
        winner: null,
        votingPhaseStartTime: null,
        voteCounts,
        voteTieDetails: buildVoteTieDetails(_live, pl),
        isTie: hasVotes ? true : null,
        lastEliminatedId: null,
        voteTieRecovery: null,
        voteTieStreak: null,
        lastActivity: serverTimestamp(),
    };
    pl.forEach(p => {
        updates[`players/${p.id}/vote`] = null;
    });
    return updates;
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

function normalizeCustomWordId(word: string): string {
    return word
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function getRandomWord(
    categories: Category[],
    language: Language,
    customCategories: CustomCategory[] = [],
    difficulty: 'easy' | 'medium' | 'hard' | 'all' = 'all',
    isPremiumRoom: boolean = false,
    recentWordIds: string[] = []
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

    const freeWords = (language === 'en' ? freeWordsDataEn : language === 'pt' ? freeWordsDataPt : freeWordsDataEs) as Word[];
    const premiumWords = (language === 'en' ? premiumWordsDataEn : language === 'pt' ? premiumWordsDataPt : premiumWordsDataEs) as Word[];
    const generalWords = (language === 'en' ? generalWordsDataEn : language === 'pt' ? generalWordsDataPt : generalWordsDataEs) as Word[];
    const generalPremiumWords = (language === 'en' ? generalPremiumWordsDataEn : language === 'pt' ? generalPremiumWordsDataPt : generalPremiumWordsDataEs) as Word[];

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
                id: `${id}__${normalizeCustomWordId(w)}`,
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

    const recentWindowSize = Math.min(
        Math.max(4, Math.floor(availableWords.length * 0.35)),
        20
    );
    const recentSet = new Set((recentWordIds || []).slice(-recentWindowSize));
    const nonRecent = availableWords.filter(w => !recentSet.has(w.id));
    const pool = nonRecent.length > 0 ? nonRecent : availableWords;
    return pool[Math.floor(Math.random() * pool.length)];
}

function pickImpostorIds(
    players: OnlinePlayer[],
    impostorCount: number,
    recentImpostorIds: string[] = []
): string[] {
    const activePlayers = players.filter(p => p.isConnected !== false);
    const activeIds = activePlayers.map(p => p.id);
    if (activeIds.length === 0 || impostorCount <= 0) return [];

    const take = Math.min(impostorCount, activeIds.length);
    const historyWindow = Math.max(activeIds.length * 3, 9);
    const recentWindow = (recentImpostorIds || []).slice(-historyWindow);
    const recentCounts = new Map<string, number>();
    recentWindow.forEach(id => {
        recentCounts.set(id, (recentCounts.get(id) || 0) + 1);
    });

    const selected: string[] = [];
    const lastRound = new Set((recentImpostorIds || []).slice(-take));
    const lastOne = (recentImpostorIds || []).at(-1) || null;
    const lastTwo = (recentImpostorIds || []).slice(-2);

    const candidates = [...activeIds];
    while (selected.length < take && candidates.length > 0) {
        // Aleatoriedad ponderada: siempre puede salir cualquiera, pero baja la probabilidad de repetidos recientes.
        const weighted = candidates.map(id => {
            const historyCount = recentCounts.get(id) || 0;
            const isLastRound = lastRound.has(id);
            const repeatedTwice = lastTwo.length === 2 && lastTwo[0] === id && lastTwo[1] === id;
            const isImmediateRepeat = lastOne === id;

            // Base aleatoria + penalizaciones suaves (no exclusión total para evitar patrón predecible).
            let weight = 1;
            weight /= 1 + historyCount * 0.65;
            if (isLastRound) weight *= 0.45;
            if (isImmediateRepeat) weight *= 0.35;
            if (repeatedTwice) weight *= 0.2;
            return { id, weight: Math.max(0.03, weight) };
        });

        const total = weighted.reduce((acc, w) => acc + w.weight, 0);
        let roll = Math.random() * total;
        let picked = weighted[weighted.length - 1].id;
        for (const w of weighted) {
            roll -= w.weight;
            if (roll <= 0) {
                picked = w.id;
                break;
            }
        }
        selected.push(picked);
        const idx = candidates.indexOf(picked);
        if (idx >= 0) candidates.splice(idx, 1);
    }

    return selected;
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
    const [playerPresenceNotice, setPlayerPresenceNotice] = useState<string | null>(null);
    const clearPlayerPresenceNotice = () => setPlayerPresenceNotice(null);
    const [kickedFromRoom, setKickedFromRoom] = useState(false);
    const clearKickedFromRoom = () => setKickedFromRoom(false);

    const [settingsDraft, setSettingsDraft] = useState<OnlineRoom['settings'] | null>(null);
    const settingsDraftInitializedRef = useRef(false);
    const updateSettingsDraft = useCallback((patch: Partial<OnlineRoom['settings']>) => {
        setSettingsDraft(prev => prev ? { ...prev, ...patch } : prev);
    }, []);

    /** Tras pulsar OK en el modal de sala cerrada: ignorar onValue/AppState tardíos (evita segundo flash). */
    const sessionEndDismissedRef = useRef(false);
    /** Primer motivo de cierre gana; no sobrescribir con otro mientras el modal sigue abierto. */
    const sessionEndModalCommittedRef = useRef(false);
    /** Ventana tras OK: no volver a mostrar modal aunque llegue otro evento de cierre. */
    const sessionEndCooldownUntilRef = useRef(0);

    const roomRef = useRef<any>(null);
    /** Una sola transición clues → simultaneous_reveal por fase (evita updates repetidos). */
    const simultaneousRevealCommittedRef = useRef<string | null>(null);
    const listenersRef = useRef(false);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hostMigrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomDataRef = useRef<OnlineRoom | null>(null);
    const lastReactionTimeRef = useRef(0);
    const lastMessageTimeRef = useRef(0);
    const lastChatTimeRef = useRef(0);
    const prevStatusRef = useRef<string | null>(null);
    const prevAnalyticsRoomStatusRef = useRef<string | null>(null);
    const prevPlayersRef = useRef<Record<string, OnlinePlayer>>({});
    const disconnectTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    /** Watchdog del latido del anfitrión (clientes): persiste entre re-renders de `room` por votos, etc. */
    const hostClientWatchRef = useRef({ lastBeat: '', lastTime: 0 });
    const { state: globalState } = useGame();
    const isPremiumUser = globalState.isPremium;
    const { t } = useTranslation();

    // Keep roomDataRef in sync
    useEffect(() => { roomDataRef.current = gameState.room; }, [gameState.room]);

    useEffect(() => {
        const room = gameState.room;
        if (!room) {
            prevAnalyticsRoomStatusRef.current = null;
            return;
        }
        if (!gameState.isHost) {
            prevAnalyticsRoomStatusRef.current = room.status;
            return;
        }
        const status = room.status;
        if (status === 'finished' && prevAnalyticsRoomStatusRef.current !== 'finished') {
            logOnlineAnalytics('online_game_finished', {
                total_rounds: room.clueRound || 1,
            });
        }
        prevAnalyticsRoomStatusRef.current = status;
    }, [gameState.room?.status, gameState.room?.clueRound, gameState.room, gameState.isHost]);

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

    // ── Initialize settingsDraft when room is first loaded, clear on leave ────────
    useEffect(() => {
        if (!gameState.roomCode) {
            settingsDraftInitializedRef.current = false;
            setSettingsDraft(null);
            return;
        }
        if (gameState.room?.settings && !settingsDraftInitializedRef.current) {
            settingsDraftInitializedRef.current = true;
            setSettingsDraft({ ...gameState.room.settings });
        }
    }, [gameState.roomCode, gameState.room?.settings]);

    // ── Subscribe to room updates ───────────────────────────────────────────────
    useEffect(() => {
        if (!gameState.roomCode || listenersRef.current) return;

        const rRef = ref(database, `rooms/${gameState.roomCode}`);
        roomRef.current = rRef;

        onValue(rRef, (snapshot: DataSnapshot) => {
            const raw = snapshot.val();
            if (raw) {
                const data =
                    raw.players != null
                        ? { ...raw, players: sanitizeOnlinePlayers(raw.players as Record<string, unknown>) }
                        : raw;
                const prevRoom = roomDataRef.current;
                if (prevRoom && prevRoom.id === data.id && prevRoom.players && data.players) {
                    const prevPlayers = prevRoom.players;
                    Object.values(data.players as Record<string, OnlinePlayer>).forEach((nextP: OnlinePlayer) => {
                        const prevP = prevPlayers[nextP.id];
                        if (!prevP) return;
                        const wasConnected = prevP.isConnected !== false;
                        const isConnected = nextP.isConnected !== false;
                        const label = nextP.name?.trim() || '?';
                        if (wasConnected && !isConnected) {
                            setPlayerPresenceNotice(
                                t.online.player_reconnecting_notice.replace('{name}', label)
                            );
                        } else if (!wasConnected && isConnected) {
                            setPlayerPresenceNotice(
                                t.online.player_reconnected_notice.replace('{name}', label)
                            );
                        }
                    });
                }
                // Detect kick: player WAS in the previous snapshot but is NOT in the current one.
                // Only checking prevRoom (not first load) prevents false positives when rejoining.
                const myId = gameState.playerId;
                const isCurrentPlayerHost = myId != null && data.hostId === myId;
                if (myId && !isCurrentPlayerHost && data.status === 'waiting' && prevRoom) {
                    const wasInRoom = prevRoom.players != null && myId in prevRoom.players;
                    const isInRoom = data.players != null && myId in data.players;
                    if (wasInRoom && !isInRoom) {
                        setKickedFromRoom(true);
                        return;
                    }
                }

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
            const disconnectedAt = typeof host.disconnectedAt === 'number' ? host.disconnectedAt : Date.now();
            const graceElapsed = Date.now() - disconnectedAt;
            if (graceElapsed <= PLAYER_GRACE_PERIOD_MS) {
                return;
            }
            setInsufficientPlayers(false);
            if (!tryCommitSessionEndModal('host_left')) return;
            leaveRoom({ clearLocalSnapshot: false }).catch(() => {});
            return;
        }

        // 3. CLIENT Heartbeat Watchdog: reiniciar el ref al montar el efecto para evitar falso positivo
        //    cuando lastTime === 0 (estado inicial) y hostHeartbeat aún no existe en Firebase.
        hostClientWatchRef.current = {
            lastBeat: String(roomDataRef.current?.hostHeartbeat ?? ''),
            lastTime: Date.now(),
        };

        const watchdog = setInterval(() => {
             const liveRoom = roomDataRef.current;
             if (!liveRoom) return;

            const currentBeat = String(liveRoom.hostHeartbeat ?? '');
            const st = hostClientWatchRef.current;
            if (currentBeat !== st.lastBeat) {
                st.lastBeat = currentBeat;
                st.lastTime = Date.now();
            } else if (Date.now() - st.lastTime > Math.max(HOST_HEARTBEAT_STAGNANT_MS, PLAYER_GRACE_PERIOD_MS)) {
                clearInterval(watchdog);
                setInsufficientPlayers(false);
                if (!tryCommitSessionEndModal('connection_lost')) return;
                void leaveRoom({ clearLocalSnapshot: false });
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
            /** Solo en espera: borrar jugadores desconectados aquí durante la partida rompe roles / startCluePhase y deja nodos huérfanos. */
            if (room.status !== 'waiting') return;
            Object.entries(room.players).forEach(([id, player]) => {
                if (id === gameState.playerId) return;
                const code = gameState.roomCode!;

                // Remove ghost nodes (onDisconnect-recreated entries with no name).
                if (!player.name?.trim()) {
                    remove(ref(database, `rooms/${code}/players/${id}`))
                        .then(() => get(ref(database, `rooms/${code}`)))
                        .then(snap => {
                            if (!snap.exists()) return;
                            const r = snap.val() as OnlineRoom;
                            const cnt = Object.keys(sanitizeOnlinePlayers(r.players as Record<string, unknown>)).length;
                            return update(ref(database, `rooms/${code}`), { playerCount: cnt });
                        })
                        .catch(() => {});
                    return;
                }

                // No removemos jugadores con nombre por desconexión: pueden volver a la app.
            });
        }, 10_000);

        return () => clearInterval(interval);
    }, [gameState.isHost, gameState.roomCode, gameState.playerId]);

    // ── Lobby waiting/ad fallback (host): evita bloqueo si alguien queda en watching_ad ──
    useEffect(() => {
        if (!gameState.isHost || !gameState.roomCode) return;

        const interval = setInterval(() => {
            const room = roomDataRef.current;
            if (!room || room.status !== 'waiting') return;

            const now = Date.now();
            const updates: Record<string, any> = {};
            let changed = false;
            Object.values(room.players).forEach(p => {
                if (p.isConnected === false) return;
                if (p.joinState !== 'watching_ad') return;
                const since = p.joinStateSince || p.lastSeen || now;
                if (now - since < JOIN_AD_STUCK_TIMEOUT_MS) return;
                updates[`players/${p.id}/joinState`] = 'ready';
                updates[`players/${p.id}/joinStateSince`] = serverTimestamp();
                changed = true;
            });

            if (changed) {
                updates.lastActivity = serverTimestamp();
                update(ref(database, `rooms/${gameState.roomCode}`), updates).catch(() => {});
            }
        }, 10_000);

        return () => clearInterval(interval);
    }, [gameState.isHost, gameState.roomCode]);

    // ── Insufficient players check during active game ─────────────────────────
    // Cuenta solo conexión real al lobby/partida. Los eliminados por voto siguen
    // en la sala (conectados) y NO deben reducir este conteo — si no, al pasar a
    // `results` con 3 jugadores quedarían 2 "activos" y se dispararía por error.
    useEffect(() => {
        if (roomClosed) return;
        // Mismo candado que el modal de fin de sesión: no mezclar con "mínimo 3 jugadores"
        // cuando el anfitrión se fue o la sala se está cerrando.
        if (sessionEndDismissedRef.current) return;

        const room = gameState.room;
        if (!room || !gameState.roomCode) return;

        const activeStates: string[] = ['playing', 'clues', 'simultaneous_reveal', 'clue_review', 'deciding', 'voting', 'results', 'elimination_choice'];
        if (!activeStates.includes(room.status)) return;

        const hostPlayer = room.players[room.hostId];
        // Anfitrión ausente o desconectado: el modal de cierre de sesión ya cubre el caso;
        // no marcar "jugadores insuficientes" (evita falsos positivos al salir el host).
        if (!hostPlayer || hostPlayer.isConnected === false) {
            return;
        }

        prevStatusRef.current = room.status;

        if (activeStates.includes(room.status)) {
            const newPlayers = room.players || {};
            prevPlayersRef.current = newPlayers;
        } else {
            prevPlayersRef.current = room.players || {};
        }

        setInsufficientPlayers(false);

    }, [gameState.room?.players, gameState.room?.status, gameState.roomCode, gameState.isHost, roomClosed]);

    // ── Cleanup all disconnect grace-period timers when room closes or context unmounts ──
    useEffect(() => {
        if (gameState.roomCode) return;
        Object.values(disconnectTimersRef.current).forEach(t => clearTimeout(t));
        disconnectTimersRef.current = {};
    }, [gameState.roomCode]);

    useEffect(() => {
        return () => {
            Object.values(disconnectTimersRef.current).forEach(t => clearTimeout(t));
            disconnectTimersRef.current = {};
        };
    }, []);

    // ── AppState: reconnect on foreground ───────────────────────────────────────
    useEffect(() => {
        const handler = (nextState: AppStateStatus) => {
            if (nextState === 'active' && gameState.roomCode && gameState.playerId) {
                // Cancel stale timers from older app sessions and refresh presence on foreground.
                Object.values(disconnectTimersRef.current).forEach(t => clearTimeout(t));
                disconnectTimersRef.current = {};
                // Reset the player-state baseline so the next effect run doesn't treat
                // connection-state changes from the offline window as "new" disconnects.
                if (roomDataRef.current?.players) {
                    prevPlayersRef.current = { ...roomDataRef.current.players };
                }

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

    // ── Auto-advance a revelación simultánea (host): una vez por fase de pistas ──
    useEffect(() => {
        if (
            !gameState.isHost ||
            gameState.room?.status !== 'clues' ||
            gameState.room.settings.discussionMode !== 'simultaneous' ||
            !gameState.roomCode
        ) {
            return;
        }
        const phaseKey = `${gameState.roomCode}|${gameState.room.cluePhaseStartTime ?? 0}`;
        const players = Object.values(gameState.room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        const allSubmitted = players.length > 0 && players.every(p => p.clue != null);
        if (!allSubmitted) return;
        if (simultaneousRevealCommittedRef.current === phaseKey) return;
        simultaneousRevealCommittedRef.current = phaseKey;
        update(ref(database, `rooms/${gameState.roomCode}`), {
            status: 'simultaneous_reveal',
            lastActivity: serverTimestamp(),
        }).catch(() => {
            simultaneousRevealCommittedRef.current = null;
        });
    }, [gameState.room?.players, gameState.room?.status, gameState.room?.cluePhaseStartTime, gameState.isHost, gameState.roomCode]);

    // ── Tras revisión de pistas: avance automático a votación en 10s ──
    const clueReviewProceedingRef = useRef(false);
    useEffect(() => {
        if (!gameState.isHost || gameState.room?.status !== 'clue_review' || !gameState.roomCode) {
            clueReviewProceedingRef.current = false;
            return;
        }

        const room = gameState.room;
        const startTime = room.clueReviewStartTime || Date.now();
        const elapsed = Date.now() - startTime;

        const proceedToVoting = () => {
            if (clueReviewProceedingRef.current) return;
            const live = roomDataRef.current;
            const code = live?.id || gameState.roomCode;
            if (!live || live.status !== 'clue_review' || !code) return;
            clueReviewProceedingRef.current = true;
            update(ref(database, `rooms/${code}`), {
                status: 'voting',
                votingPhaseStartTime: serverTimestamp(),
                clueReviewReady: null,
                clueReviewStartTime: null,
                lastActivity: serverTimestamp(),
            })
                .catch(() => {
                    clueReviewProceedingRef.current = false;
                });
        };

        if (elapsed >= CLUE_REVIEW_TIMEOUT_MS) {
            proceedToVoting();
            return;
        }

        const remaining = Math.max(80, CLUE_REVIEW_TIMEOUT_MS - elapsed);
        const timer = setTimeout(proceedToVoting, remaining);
        return () => clearTimeout(timer);
    }, [
        gameState.isHost,
        gameState.room?.status,
        gameState.roomCode,
        gameState.room?.clueReviewStartTime,
    ]);

    // ── Resolve round decision (host only): mayoría decide; si no, timeout con desempate ──
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

        let goVote = 0;
        let anotherRound = 0;
        Object.entries(votes).forEach(([id, v]) => {
            if (!eligiblePlayers.some(p => p.id === id)) return;
            if (v === 'go_vote') goVote++;
            else if (v === 'another_round') anotherRound++;
        });

        const n = eligiblePlayers.length;
        const majority = n > 0 ? Math.floor(n / 2) + 1 : 0;

        const startCluesRound = () => {
            const players = eligiblePlayers;
            const shuffledOrder = [...players].sort(() => Math.random() - 0.5).map(p => p.id);
            const updates: Record<string, any> = {
                status: 'clues',
                turnOrder: shuffledOrder,
                currentTurnIndex: 0,
                cluePhaseStartTime: serverTimestamp(),
                roundDecisionVotes: null,
                roundDecisionStartTime: null,
                clueReviewReady: null,
                clueReviewStartTime: null,
                clueRound: (room.clueRound || 1) + 1,
                lastActivity: serverTimestamp(),
            };
            players.forEach(p => { updates[`players/${p.id}/clue`] = null; });
            update(ref(database, `rooms/${gameState.roomCode}`), updates);
        };

        const startVotingPhase = () => {
            update(ref(database, `rooms/${gameState.roomCode}`), {
                status: 'voting',
                votingPhaseStartTime: serverTimestamp(),
                roundDecisionVotes: null,
                roundDecisionStartTime: null,
                lastActivity: serverTimestamp(),
            });
        };

        const resolve = (forceTimeout: boolean) => {
            if (majority > 0 && goVote >= majority) {
                startVotingPhase();
                return true;
            }
            if (majority > 0 && anotherRound >= majority) {
                startCluesRound();
                return true;
            }
            if (!forceTimeout) return false;
            if (anotherRound > goVote) {
                startCluesRound();
            } else {
                startVotingPhase();
            }
            return true;
        };

        if (resolve(false)) return;

        if (allVoted) {
            resolve(true);
            return;
        }

        const remaining = Math.max(100, DECISION_TIMEOUT_MS - elapsed);
        const timer = setTimeout(() => resolve(true), remaining);
        return () => clearTimeout(timer);
    }, [
        gameState.isHost, gameState.room?.status, gameState.roomCode,
        gameState.room?.roundDecisionVotes, gameState.room?.roundDecisionStartTime,
        gameState.room?.players,
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

            const logRoundCompleted = () => {
                logOnlineAnalytics('online_round_completed', { round_number: live.clueRound || 1 });
            };

            const voteCounts: Record<string, number> = {};
            pl.forEach(p => {
                if (p.vote) voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
            });

            const castVotes = pl.map(p => p.vote).filter(v => v != null);
            if (castVotes.length === 0) {
                const streak = live.voteTieStreak || 0;
                if (streak >= 2) {
                    logRoundCompleted();
                    update(ref(database, `rooms/${code}`), buildTechnicalTieFinishUpdates(live, pl));
                } else {
                    logRoundCompleted();
                    update(ref(database, `rooms/${code}`), buildVoteTieRecoveryUpdates(live, pl, streak + 1));
                }
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
                const streak = live.voteTieStreak || 0;
                if (streak >= 2) {
                    logRoundCompleted();
                    update(ref(database, `rooms/${code}`), buildTechnicalTieFinishUpdates(live, pl));
                } else {
                    logRoundCompleted();
                    update(ref(database, `rooms/${code}`), buildVoteTieRecoveryUpdates(live, pl, streak + 1));
                }
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
                voteTieStreak: null,
                [`players/${eliminatedId}/isEliminated`]: true,
                eliminationChoiceVotes: null,
            };

            pl.forEach(p => { updates[`players/${p.id}/vote`] = null; });

            if (eliminatedIsImpostor) {
                /** Solo impostores aún vivos; si no filtramos `isEliminated`, el primero ya expulsado cuenta y el segundo mal dispara otra ronda. */
                const otherImpostorsStillInPlay = impostorIds.filter(id => {
                    if (id === eliminatedId) return false;
                    const p = live.players[id];
                    return !!p && !p.isEliminated;
                });
                if (otherImpostorsStillInPlay.length > 0) {
                    // Sigue habiendo impostores ocultos: misma fase que civil eliminado (votación continuar / revelar solo al terminar).
                    updates.status = 'elimination_choice';
                    updates.eliminationChoiceStartTime = serverTimestamp();
                } else {
                    updates.status = 'results';
                    updates.eliminationChoiceStartTime = null;
                }
                logRoundCompleted();
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

            logRoundCompleted();
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

            const majority = elig.length > 0 ? Math.floor(elig.length / 2) + 1 : 0;
            // Solo se continúa si hay mayoría real. Empate, abstención o mayoría insuficiente revela al impostor.
            const goContinue = majority > 0 && continueCount >= majority;

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
        const isRoomStale = (room: OnlineRoom): boolean => {
            const now = Date.now();
            const age = now - (room.lastActivity || room.createdAt || 0);
            return (
                (room.status === 'waiting' && age > INACTIVITY_WAITING_MS) ||
                (room.status !== 'waiting' && age > INACTIVITY_PLAYING_MS)
            );
        };

        try {
            if (codeToCheck) {
                const snap = await get(ref(database, `rooms/${codeToCheck}`));
                if (!snap.exists()) return;
                const room = snap.val() as OnlineRoom;
                if (isRoomStale(room)) {
                    await remove(ref(database, `rooms/${codeToCheck}`));
                }
                return;
            }

            const roomsSnap = await get(ref(database, 'rooms'));
            if (!roomsSnap.exists()) return;
            const rooms = roomsSnap.val() as Record<string, OnlineRoom>;
            const roomEntries = Object.entries(rooms).slice(0, MAX_STALE_SCAN_ROOMS_PER_RUN);

            await Promise.all(
                roomEntries.map(async ([roomCode, room]) => {
                    try {
                        if (!room || typeof room !== 'object') return;
                        if (!isRoomStale(room)) return;
                        await remove(ref(database, `rooms/${roomCode}`));
                    } catch {
                        // Ignore permisos/errores de red para no interrumpir la corrida pasiva.
                    }
                })
            );
        } catch { /* ignore */ }
    }, []);

    // ── createRoom (with transaction for atomicity) ─────────────────────────────
    const createRoom = async (playerName: string): Promise<string> => {
        if (!gameState.playerId) throw new Error("No player ID");
        resetSessionEndGuards();

        const normalizedName = normalizeOnlinePlayerName(playerName);
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
                    avatar: getNextAvatar([]),
                    isHost: true,
                    isReady: true,
                    score: 0,
                    isEliminated: false,
                    isConnected: true,
                    lastSeen: Date.now(),
                    joinState: 'joining',
                    joinStateSince: Date.now(),
                };

                const newRoom: any = {
                    id: roomCode,
                    hostId: gameState.playerId,
                    originalHostId: gameState.playerId,
                    originalHostName: playerName,
                    status: 'waiting',
                    players: { [gameState.playerId!]: hostPlayer },
                    nameIndex: { [normalizedName]: gameState.playerId },
                    playerNameIndex: { [gameState.playerId!]: normalizedName },
                    settings: {
                        impostorCount: 1,
                        gameDuration: null,
                        language: defaultLanguageFromLocale(),
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
                    [`players/${gameState.playerId}/joinStateSince`]: serverTimestamp(),
                });
                const roomNodeRef = ref(database, `rooms/${code}`);
                onDisconnect(roomNodeRef).update({ hostDisconnectedAt: serverTimestamp() });
                setGameState(prev => ({ ...prev, roomCode: code, isHost: true }));
                return code;
            }
        }
        throw new Error("Could not create room after retries");
    };

    // ── joinRoom ───────────────────────────────────────────────────────────────
    const joinRoom = async (roomCode: string, playerName: string): Promise<boolean> => {
        if (!gameState.playerId) throw new Error("No player ID");
        resetSessionEndGuards();

        await cleanupStaleRooms(roomCode);

        const playerId = gameState.playerId;
        const rRef = ref(database, `rooms/${roomCode}`);
        const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
        const nameKey = normalizeOnlinePlayerName(playerName);

        const [statusSnap, playerCountSnap, maxPlayersSnap, ownPlayerSnap, nameSnap, playersSnap] = await Promise.all([
            get(ref(database, `rooms/${roomCode}/status`)),
            get(ref(database, `rooms/${roomCode}/playerCount`)),
            get(ref(database, `rooms/${roomCode}/settings/maxPlayers`)),
            get(playerRef),
            get(ref(database, `rooms/${roomCode}/nameIndex/${nameKey}`)),
            get(ref(database, `rooms/${roomCode}/players`)),
        ]);
        if (!statusSnap.exists()) return false;

        const roomStatus = statusSnap.val() as OnlineRoom['status'];
        const playerCount = typeof playerCountSnap.val() === 'number' ? playerCountSnap.val() as number : 0;
        const maxPlayers = typeof maxPlayersSnap.val() === 'number' ? maxPlayersSnap.val() as number : MAX_PLAYERS_FREE;
        const currentPlayers = playersSnap.exists()
            ? Object.values(playersSnap.val() as Record<string, OnlinePlayer>)
            : [];
        const indexedPlayerId = nameSnap.exists() ? String(nameSnap.val()) : null;
        if (indexedPlayerId && indexedPlayerId !== playerId) {
            throw new Error("Name taken");
        }

        // Expired check
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const createdAtSnap = await get(ref(database, `rooms/${roomCode}/createdAt`)).catch(() => null);
        const createdAt = createdAtSnap?.exists() ? Number(createdAtSnap.val()) : 0;
        if (createdAt && Date.now() - createdAt > ONE_DAY_MS) {
            await remove(rRef).catch(() => {});
            return false;
        }

        // Re-join: player already exists in the room (e.g. reconnecting)
        if (ownPlayerSnap.exists()) {
            const existing = ownPlayerSnap.val() as OnlinePlayer;
            const previousNameKeySnap = await get(ref(database, `rooms/${roomCode}/playerNameIndex/${playerId}`)).catch(() => null);
            const previousNameKey = previousNameKeySnap?.exists() ? String(previousNameKeySnap.val()) : normalizeOnlinePlayerName(existing.name || '');
            if (previousNameKey !== nameKey) {
                const nameResult = await runTransaction(ref(database, `rooms/${roomCode}/nameIndex/${nameKey}`), current => {
                    if (current && current !== playerId) return current;
                    return playerId;
                });
                if (!nameResult.committed || nameResult.snapshot.val() !== playerId) {
                    throw new Error("Name taken");
                }
                await set(ref(database, `rooms/${roomCode}/playerNameIndex/${playerId}`), nameKey);
                if (previousNameKey) {
                    await remove(ref(database, `rooms/${roomCode}/nameIndex/${previousNameKey}`)).catch(() => {});
                }
            }

            await update(playerRef, {
                name: playerName,
                avatar: existing.avatar || getNextAvatar(currentPlayers),
                isConnected: true,
                disconnectedAt: null,
                lastSeen: serverTimestamp(),
                joinState: roomStatus === 'waiting' ? 'joining' : (existing.joinState || 'ready'),
                joinStateSince: serverTimestamp(),
            });
            await update(rRef, { lastActivity: serverTimestamp() });
            const hostIdSnap = await get(ref(database, `rooms/${roomCode}/hostId`));
            setGameState(prev => ({ ...prev, roomCode, isHost: hostIdSnap.val() === playerId }));
            return true;
        }

        if (playerCount >= maxPlayers) throw new Error("Room full");

        const nameResult = await runTransaction(ref(database, `rooms/${roomCode}/nameIndex/${nameKey}`), current => {
            if (current && current !== playerId) return current;
            return playerId;
        });
        if (!nameResult.committed || nameResult.snapshot.val() !== playerId) {
            throw new Error("Name taken");
        }

        let slotReserved = false;
        try {
            await set(ref(database, `rooms/${roomCode}/playerNameIndex/${playerId}`), nameKey);
            const countResult = await runTransaction(ref(database, `rooms/${roomCode}/playerCount`), current => {
                const count = typeof current === 'number' ? current : playerCount;
                if (count >= maxPlayers) return;
                return count + 1;
            });
            if (!countResult.committed || typeof countResult.snapshot.val() !== 'number') {
                throw new Error("Room full");
            }
            slotReserved = true;

            const joinsAsSpectator = roomStatus !== 'waiting';
            await set(playerRef, {
                id: playerId,
                name: playerName,
                avatar: getNextAvatar(currentPlayers),
                isHost: false,
                isReady: true,
                score: 0,
                isEliminated: joinsAsSpectator,
                isSpectator: joinsAsSpectator,
                isConnected: true,
                lastSeen: serverTimestamp(),
                joinState: joinsAsSpectator ? 'ready' : 'joining',
                joinStateSince: serverTimestamp(),
            });
            await update(rRef, { lastActivity: serverTimestamp() });
        } catch (error) {
            if (slotReserved) {
                await runTransaction(ref(database, `rooms/${roomCode}/playerCount`), current => {
                    const count = typeof current === 'number' ? current : playerCount + 1;
                    return Math.max(0, count - 1);
                }).catch(() => {});
            }
            await remove(ref(database, `rooms/${roomCode}/nameIndex/${nameKey}`)).catch(() => {});
            await remove(ref(database, `rooms/${roomCode}/playerNameIndex/${playerId}`)).catch(() => {});
            throw error;
        }

        setGameState(prev => ({ ...prev, roomCode, isHost: false }));
        return true;
    };

    // ── leaveRoom: salida voluntaria — el anfitrión CIERRA la sala para todos.
    //    No-host: runTransaction atómica evita sala zombie si dos jugadores salen a la vez (revisión código).
    const leaveRoom = async (opts?: { clearLocalSnapshot?: boolean }) => {
        const clearLocalSnapshot = opts?.clearLocalSnapshot !== false;
        if (!gameState.roomCode || !gameState.playerId) return;

        if (clearLocalSnapshot) {
            sessionEndDismissedRef.current = true;
            sessionEndCooldownUntilRef.current = Date.now() + 3000;
            sessionEndModalCommittedRef.current = false;
            setRoomClosed(false);
            setRoomCloseReason(null);
            setInsufficientPlayers(false);
        }

        try {
            if (gameState.isHost) {
                const roomNodeRef = ref(database, `rooms/${gameState.roomCode}`);
                try {
                    await onDisconnect(roomNodeRef).cancel();
                } catch {
                    // Mejor intentar cerrar la sala igual para evitar zombies por fallos transitorios.
                }
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
                    const nameKey = current.playerNameIndex?.[playerId];
                    delete players[playerId];
                    const nameIndex = { ...(current.nameIndex || {}) };
                    const playerNameIndex = { ...(current.playerNameIndex || {}) };
                    if (nameKey) delete nameIndex[nameKey];
                    delete playerNameIndex[playerId];
                    const nextCount = Object.keys(players).length;
                    if (nextCount === 0) {
                        return null;
                    }
                    return { ...current, players, nameIndex, playerNameIndex, playerCount: nextCount };
                });
            }
        } catch (e) {
            console.error("Error leaving room:", e);
        }

        setKickedFromRoom(false);
        setGameState(prev => ({
            ...prev,
            roomCode: null,
            isHost: false,
            ...(clearLocalSnapshot ? { room: null, error: null } : {}),
        }));
        listenersRef.current = false;
    };

    // ── kickPlayer (host only, lobby only) ───────────────────────────────────────
    const kickPlayer = async (playerId: string) => {
        if (!gameState.roomCode || !gameState.isHost) return;
        const roomRef = ref(database, `rooms/${gameState.roomCode}`);
        await runTransaction(roomRef, (current: any) => {
            if (!current) return;
            if (current.status !== 'waiting') return current;
            if (playerId === current.hostId) return current;
            if (!current.players?.[playerId]) return current;
            const nameKey = current.playerNameIndex?.[playerId];
            const players = { ...current.players };
            delete players[playerId];
            const nameIndex = { ...(current.nameIndex || {}) };
            const playerNameIndex = { ...(current.playerNameIndex || {}) };
            if (nameKey) delete nameIndex[nameKey];
            delete playerNameIndex[playerId];
            const nextCount = Object.keys(players).length;
            if (nextCount === 0) return null;
            return { ...current, players, nameIndex, playerNameIndex, playerCount: nextCount };
        });
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

    const requestReadyCheck = async (settingsJustSaved?: Partial<OnlineRoom['settings']>) => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;

        const players = Object.values(gameState.room.players).filter(p => p.isConnected !== false);
        if (players.length < 3) return;
        if (gameState.room.status === 'waiting') {
            const allReadyForStart = players.every(p => (p.joinState || 'ready') === 'ready');
            if (!allReadyForStart) return;
        }
        const settings = {
            ...gameState.room.settings,
            ...(settingsJustSaved || {}),
        };
        if (!hasPlayableCategorySelection(
            settings.categories,
            settings.customCategories
        )) {
            return;
        }

        await update(ref(database, `rooms/${gameState.roomCode}`), {
            status: 'ready_check',
            readyCheckReady: null,
            readyCheckStartTime: serverTimestamp(),
            readyCheckPreviousStatus: gameState.room.status,
            lastActivity: serverTimestamp(),
        });
    };

    const launchReadyCheckedGame = async (roomSnapshot?: OnlineRoom | null) => {
        const room = roomSnapshot || roomDataRef.current || gameState.room;
        const code = gameState.roomCode || room?.id;
        if (!code || !gameState.isHost || !room) return;

        const players = Object.values(room.players).filter(p => p.isConnected !== false);
        if (players.length < 3) return;

        const settings: OnlineRoom['settings'] = {
            ...room.settings,
        };

        if (!hasPlayableCategorySelection(settings.categories, settings.customCategories)) {
            return;
        }

        const impostorCount = settings.impostorCount;
        const impostorIds = pickImpostorIds(players, impostorCount, room.recentImpostorIds || []);
        const updates: Record<string, any> = {};

        players.forEach(p => {
            updates[`players/${p.id}/role`] = impostorIds.includes(p.id) ? 'impostor' : 'civilian';
            updates[`players/${p.id}/isEliminated`] = false;
            updates[`players/${p.id}/isSpectator`] = false;
            updates[`players/${p.id}/vote`] = null;
        });

        const word = getRandomWord(
            settings.categories,
            settings.language,
            settings.customCategories,
            'all',
            settings.isPremiumRoom,
            room.recentWordIds || []
        );
        const nextRecentWordIds = [...(room.recentWordIds || []), word.id].slice(-WORD_HISTORY_LIMIT);
        const nextRecentImpostorIds = [...(room.recentImpostorIds || []), ...impostorIds].slice(-IMPOSTOR_HISTORY_LIMIT);

        updates['currentWord'] = word;
        updates['currentImpostors'] = impostorIds;
        updates['recentWordIds'] = nextRecentWordIds;
        updates['recentImpostorIds'] = nextRecentImpostorIds;
        updates['status'] = 'playing';
        updates['currentRoundStartTime'] = serverTimestamp();
        updates['turnOrder'] = null;
        updates['currentTurnIndex'] = null;
        updates['cluePhaseStartTime'] = null;
        updates['votingPhaseStartTime'] = null;
        updates['lastActivity'] = serverTimestamp();
        updates['reactions'] = null;
        updates['messages'] = null;
        updates['voteCounts'] = null;
        updates['voteTieDetails'] = null;
        updates['isTie'] = null;
        updates['lastEliminatedId'] = null;
        updates['winner'] = null;
        updates['finishReason'] = null;
        updates['eliminationChoiceVotes'] = null;
        updates['eliminationChoiceStartTime'] = null;
        updates['clueReviewReady'] = null;
        updates['clueReviewStartTime'] = null;
        updates['voteTieRecovery'] = null;
        updates['voteTieStreak'] = null;
        updates['roundDecisionVotes'] = null;
        updates['roundDecisionStartTime'] = null;
        updates['postResultVotes'] = null;
        updates['postResultStartTime'] = null;
        updates['readyCheckReady'] = null;
        updates['readyCheckStartTime'] = null;
        updates['readyCheckPreviousStatus'] = null;
        updates['clueRound'] = null;
        players.forEach(p => { updates[`players/${p.id}/clue`] = null; });

        // Save premium categories snapshot on first game start
        if (!room.premiumCategoriesSnapshot && settings.isPremiumRoom) {
            updates['premiumCategoriesSnapshot'] = settings.categories;
        }

        await update(ref(database, `rooms/${code}`), updates);
        logOnlineAnalytics('online_game_started', {
            player_count: players.length,
            is_premium_room: settings.isPremiumRoom,
        });
    };

    // ── startGame ───────────────────────────────────────────────────────────────
    const startGame = async (settingsJustSaved?: Partial<OnlineRoom['settings']>) => {
        await requestReadyCheck(settingsJustSaved);
    };

    useEffect(() => {
        const room = gameState.room;
        if (!gameState.isHost || !gameState.roomCode || room?.status !== 'ready_check') return;
        const players = Object.values(room.players).filter(p => p.isConnected !== false);
        if (players.length < 3) return;
        const ready = room.readyCheckReady || {};
        if (players.every(p => ready[p.id] === true)) {
            void launchReadyCheckedGame(room);
        }
    }, [gameState.isHost, gameState.roomCode, gameState.room?.status, gameState.room?.players, gameState.room?.readyCheckReady]);

    // ── startCluePhase ──────────────────────────────────────────────────────────
    const startCluePhase = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        const players = Object.values(gameState.room.players).filter(p => !p.isEliminated && p.isConnected !== false);
        if (players.length === 0) {
            console.warn('startCluePhase: no hay jugadores conectados');
            return;
        }
        const shuffledOrder = [...players].sort(() => Math.random() - 0.5).map(p => p.id);

        const updates: Record<string, any> = {
            status: 'clues',
            turnOrder: shuffledOrder,
            currentTurnIndex: 0,
            cluePhaseStartTime: serverTimestamp(),
            clueReviewReady: null,
            clueReviewStartTime: null,
            lastActivity: serverTimestamp(),
        };
        players.forEach(p => { updates[`players/${p.id}/clue`] = null; });

        try {
            await update(ref(database, `rooms/${gameState.roomCode}`), updates);
        } catch (e) {
            console.error('startCluePhase: falló el update en Firebase', e);
        }
    };

    // ── submitClue ──────────────────────────────────────────────────────────────
    const submitClue = async (clue: string) => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        const self = gameState.room.players[gameState.playerId];
        if (!self || self.isEliminated) return;
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`), { clue });
        touchActivity();
    };

    // ── advanceTurn ─────────────────────────────────────────────────────────────
    const advanceTurn = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        if (gameState.room.status !== 'clues') return;
        const turnOrder = gameState.room.turnOrder || [];
        const currentIndex = gameState.room.currentTurnIndex ?? 0;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= turnOrder.length) {
            await update(ref(database, `rooms/${gameState.roomCode}`), {
                status: 'clue_review',
                clueReviewReady: null,
                clueReviewStartTime: serverTimestamp(),
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
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        const self = gameState.room.players[gameState.playerId];
        if (!self || self.isEliminated) return;
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
            status: 'clue_review',
            clueReviewReady: null,
            clueReviewStartTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
        });
        touchActivity();
    };

    const submitClueReviewReady = async () => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        if (gameState.room.status !== 'clue_review') return;
        const self = gameState.room.players[gameState.playerId];
        if (!self || self.isEliminated) return;
        await set(ref(database, `rooms/${gameState.roomCode}/clueReviewReady/${gameState.playerId}`), true);
        touchActivity();
    };

    const submitReadyCheck = async () => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        if (gameState.room.status !== 'ready_check') return;
        const self = gameState.room.players[gameState.playerId];
        if (!self || self.isConnected === false) return;
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            [`readyCheckReady/${gameState.playerId}`]: true,
            lastActivity: serverTimestamp(),
        });
        touchActivity();
    };

    const cancelReadyCheck = async () => {
        if (!gameState.roomCode || !gameState.isHost || !gameState.room) return;
        if (gameState.room.status !== 'ready_check') return;
        const previous = gameState.room.readyCheckPreviousStatus;
        const fallback = gameState.room.currentWord ? 'results' : 'waiting';
        const nextStatus = previous && previous !== 'ready_check' ? previous : fallback;
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            status: nextStatus,
            readyCheckReady: null,
            readyCheckStartTime: null,
            readyCheckPreviousStatus: null,
            lastActivity: serverTimestamp(),
        });
        touchActivity();
    };

    const clearVoteTieRecovery = async () => {
        if (!gameState.isHost || !gameState.roomCode) return;
        await update(ref(database, `rooms/${gameState.roomCode}`), { voteTieRecovery: null, voteTieDetails: null });
    };

    const updateMyJoinState = async (state: 'joining' | 'watching_ad' | 'ready') => {
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        if (gameState.room.status !== 'waiting') return;
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerId}`), {
            joinState: state,
            joinStateSince: serverTimestamp(),
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
        if (!gameState.roomCode || !gameState.playerId || !gameState.room) return;
        const self = gameState.room.players[gameState.playerId];
        if (!self || self.isEliminated) return;
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

        await requestReadyCheck();
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
        updates['clueReviewReady'] = null;
        updates['clueReviewStartTime'] = null;
        updates['voteTieRecovery'] = null;
        updates['voteTieDetails'] = null;
        updates['voteTieStreak'] = null;
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
            messages: null,
            postResultVotes: null,
            postResultStartTime: null,
            roundDecisionVotes: null,
            roundDecisionStartTime: null,
            clueRound: null,
            votingPhaseStartTime: null,
            eliminationChoiceVotes: null,
            eliminationChoiceStartTime: null,
            clueReviewReady: null,
            clueReviewStartTime: null,
            voteTieRecovery: null,
            voteTieDetails: null,
            voteTieStreak: null,
            readyCheckReady: null,
            readyCheckStartTime: null,
            readyCheckPreviousStatus: null,
            recentWordIds: null,
            recentImpostorIds: null,
            lastActivity: serverTimestamp(),
        };

        Object.values(gameState.room.players).forEach(p => {
            updates[`players/${p.id}/role`] = null;
            updates[`players/${p.id}/vote`] = null;
            updates[`players/${p.id}/clue`] = null;
            updates[`players/${p.id}/isEliminated`] = false;
            updates[`players/${p.id}/isSpectator`] = false;
            updates[`players/${p.id}/joinState`] = 'ready';
            updates[`players/${p.id}/joinStateSince`] = serverTimestamp();
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

    // ── sendQuickMessage ─────────────────────────────────────────────────────────
    const sendQuickMessage = async (messageKey: string, messageText?: string) => {
        if (!gameState.roomCode || !gameState.room) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const now = Date.now();
        if (now - lastMessageTimeRef.current < 3000) return;
        lastMessageTimeRef.current = now;

        const me = gameState.room.players[uid];
        if (!me) return;

        const messagesRef = ref(database, `rooms/${gameState.roomCode}/messages`);
        const newRef = push(messagesRef);
        const message: OnlineMessage = {
            playerId: uid,
            playerName: me.name,
            messageKey,
            ...(typeof messageText === 'string' && messageText.trim().length > 0
                ? { messageText: messageText.trim().slice(0, 120) }
                : {}),
            timestamp: Date.now(),
        };

        void set(newRef, message)
            .then(() => {
                setTimeout(() => {
                    remove(newRef).catch(() => {});
                }, 6000);
            })
            .catch((e) => {
                console.error('sendQuickMessage: no se pudo publicar mensaje', e);
            });
    };

    // ── sendChatMessage ───────────────────────────────────────────────────────────
    const sendChatMessage = async (text: string, isUserPremium = false) => {
        if (!gameState.roomCode || !gameState.room) return;
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const trimmed = text.trim().slice(0, 160);
        if (!trimmed) return;

        const now = Date.now();
        if (now - lastChatTimeRef.current < 1500) return;
        lastChatTimeRef.current = now;

        const isPremiumRoom = gameState.room.settings.isPremiumRoom ?? false;
        if (!isPremiumRoom && !isUserPremium) {
            const myMessageCount = Object.values(gameState.room.messages || {})
                .filter(m => m.playerId === uid && m.messageKey === 'free_text').length;
            if (myMessageCount >= 10) return;
        }

        const me = gameState.room.players[uid];
        if (!me) return;

        const messagesRef = ref(database, `rooms/${gameState.roomCode}/messages`);
        const newRef = push(messagesRef);
        const message: OnlineMessage = {
            playerId: uid,
            playerName: me.name,
            messageKey: 'free_text',
            messageText: trimmed,
            timestamp: Date.now(),
        };
        void set(newRef, message).catch((e) => {
            console.error('sendChatMessage: failed', e);
        });
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
            playerPresenceNotice,
            clearPlayerPresenceNotice,
            kickedFromRoom,
            clearKickedFromRoom,
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
            submitReadyCheck,
            cancelReadyCheck,
            openRoundDecisionAfterSimultaneousReveal,
            submitClueReviewReady,
            clearVoteTieRecovery,
            updateMyJoinState,
            sendReaction,
            sendQuickMessage,
            sendChatMessage,
            kickPlayer,
            resetToLobby,
            cleanupStaleRooms,
            settingsDraft,
            updateSettingsDraft,
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
