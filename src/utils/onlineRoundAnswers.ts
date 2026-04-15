import { OnlineRoom, OnlinePlayer, Avatar } from '../types';

export interface RoundAnswerEntry {
    playerId: string;
    name: string;
    avatar: Avatar;
    clue: string;
}

/** Pistas de la ronda actual en orden de turno (o jugadores activos con pista). */
export function getRoundAnswerEntries(room: OnlineRoom): RoundAnswerEntry[] {
    const players = room.players || {};
    const order = room.turnOrder?.length
        ? [...room.turnOrder]
        : Object.keys(players).filter(id => !players[id]?.isEliminated);

    const seen = new Set<string>();
    const out: RoundAnswerEntry[] = [];

    for (const id of order) {
        const p = players[id];
        if (!p || p.isEliminated) continue;
        const clue = p.clue;
        if (clue == null || clue === '') continue;
        seen.add(id);
        out.push({ playerId: id, name: p.name, avatar: p.avatar, clue });
    }

    for (const p of Object.values(players) as OnlinePlayer[]) {
        if (p.isEliminated || seen.has(p.id)) continue;
        const clue = p.clue;
        if (clue == null || clue === '') continue;
        out.push({ playerId: p.id, name: p.name, avatar: p.avatar, clue });
    }

    return out;
}
