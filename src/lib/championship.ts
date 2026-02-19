import type {
  Bot,
  ChampionshipPairing,
  ChampionshipPlayer,
  ChampionshipState,
  PlayerProfile,
} from '@/types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function expectedScore(eloA: number, eloB: number) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function randomEmoji(i: number) {
  const emojis = ['🤖', '🧠', '🦾', '🧊', '🔥', '🧙‍♂️', '🥷', '🦉', '🐉', '🦊', '🐺', '🦁', '🐼'];
  return emojis[i % emojis.length];
}

function colorFromIndex(i: number) {
  const hue = (i * 37) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function createInitialChampionshipState(params: {
  userProfile: PlayerProfile;
  totalRounds?: number;
  totalPlayers?: number;
  botEloMin?: number;
  botEloMax?: number;
}): ChampionshipState {
  const {
    userProfile,
    totalRounds = 7,
    totalPlayers = 40,
    botEloMin = 200,
    botEloMax = 1500,
  } = params;

  const userId = userProfile.id;
  const players: ChampionshipPlayer[] = [];

  // Usuario
  players.push({
    id: userId,
    name: userProfile.name,
    emoji: '🧑‍💻',
    elo: userProfile.elo,
    isUser: true,
    points: 0,
    buchholz: 0,
    opponents: [],
  });

  const botCount = totalPlayers - 1;
  for (let i = 0; i < botCount; i++) {
    const t = botCount <= 1 ? 0 : i / (botCount - 1);
    const base = botEloMin + t * (botEloMax - botEloMin);
    const jitter = (Math.random() - 0.5) * 60; // ligera variación
    const elo = Math.round(clamp(base + jitter, botEloMin, botEloMax));

    players.push({
      id: `champ-bot-${i + 1}`,
      name: `Bot ${i + 1}`,
      emoji: randomEmoji(i),
      elo,
      isUser: false,
      points: 0,
      buchholz: 0,
      opponents: [],
    });
  }

  return {
    seasonId: `season-${Date.now()}`,
    currentRound: 1,
    totalRounds,
    players,
    pairings: [],
    userId,
    startedAt: Date.now(),
    completed: false,
  };
}

export function recalculateStandings(state: ChampionshipState): ChampionshipState {
  const playersById = new Map<string, ChampionshipPlayer>();
  for (const p of state.players) {
    playersById.set(p.id, { ...p, points: 0, buchholz: 0 });
  }

  for (const pairing of state.pairings) {
    if (!pairing.result) continue;
    const white = playersById.get(pairing.whiteId);
    const black = playersById.get(pairing.blackId);
    if (!white || !black) continue;

    if (pairing.result === '1-0') {
      white.points += 1;
    } else if (pairing.result === '0-1') {
      black.points += 1;
    } else {
      white.points += 0.5;
      black.points += 0.5;
    }
  }

  // Buchholz simple: suma de puntos de rivales ya enfrentados
  for (const p of playersById.values()) {
    let sum = 0;
    for (const oppId of p.opponents) {
      sum += playersById.get(oppId)?.points ?? 0;
    }
    p.buchholz = sum;
  }

  return { ...state, players: Array.from(playersById.values()) };
}

function sortForPairing(players: ChampionshipPlayer[]) {
  return players
    .slice()
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return b.elo - a.elo;
    });
}

function alreadyPlayed(a: ChampionshipPlayer, b: ChampionshipPlayer) {
  return a.opponents.includes(b.id) || b.opponents.includes(a.id);
}

export function generatePairingsForCurrentRound(state: ChampionshipState): ChampionshipState {
  const round = state.currentRound;
  if (state.completed) return state;
  if (state.pairings.some((p) => p.round === round)) return state; // ya existen

  const playersById = new Map<string, ChampionshipPlayer>(
    state.players.map((p) => [p.id, { ...p, opponents: p.opponents.slice() }] as const),
  );
  const sorted = sortForPairing(Array.from(playersById.values()));
  const unpaired = sorted.slice();
  const newPairings: ChampionshipPairing[] = [];

  const takeNextOpponent = (p: ChampionshipPlayer) => {
    // Preferir misma puntuación, evitando repetidos si se puede.
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < unpaired.length; i++) {
      const q = unpaired[i];
      if (q.id === p.id) continue;
      const repeatPenalty = alreadyPlayed(p, q) ? -1000 : 0;
      const scoreGroupBonus = -Math.abs((p.points ?? 0) - (q.points ?? 0)) * 100;
      const eloBonus = -Math.abs(p.elo - q.elo) * 0.01;
      const score = repeatPenalty + scoreGroupBonus + eloBonus;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  let table = 1;
  while (unpaired.length > 0) {
    const p = unpaired.shift()!;
    const oppIdx = takeNextOpponent(p);
    const q = oppIdx >= 0 ? unpaired.splice(oppIdx, 1)[0] : unpaired.shift()!;

    // Forzar usuario como blancas para simplificar UX (playerColor actual es 'w')
    let whiteId = p.id;
    let blackId = q.id;
    if (p.id === state.userId) {
      whiteId = p.id;
      blackId = q.id;
    } else if (q.id === state.userId) {
      whiteId = q.id;
      blackId = p.id;
    } else {
      // Alternar colores por mesa (simple)
      if (table % 2 === 0) {
        whiteId = q.id;
        blackId = p.id;
      }
    }

    newPairings.push({
      round,
      table,
      whiteId,
      blackId,
    });

    // Registrar rivales para evitar repetidos
    const pRef = playersById.get(p.id);
    const qRef = playersById.get(q.id);
    if (pRef && !pRef.opponents.includes(q.id)) pRef.opponents.push(q.id);
    if (qRef && !qRef.opponents.includes(p.id)) qRef.opponents.push(p.id);

    table++;
  }

  return recalculateStandings({
    ...state,
    players: Array.from(playersById.values()),
    pairings: [...state.pairings, ...newPairings],
  });
}

export function getUserPairingForRound(state: ChampionshipState, round: number) {
  return state.pairings.find(
    (p) => p.round === round && (p.whiteId === state.userId || p.blackId === state.userId),
  );
}

export function setUserResultForCurrentRound(
  state: ChampionshipState,
  result: 'win' | 'loss' | 'draw',
): ChampionshipState {
  const round = state.currentRound;
  const pairing = getUserPairingForRound(state, round);
  if (!pairing) return state;

  const nextPairings = state.pairings.map((p) => {
    if (p.round !== round) return p;
    if (p.table !== pairing.table) return p;

    // Usuario como blancas por diseño
    let r: string;
    if (result === 'win') r = '1-0';
    else if (result === 'loss') r = '0-1';
    else r = '1/2-1/2';
    return { ...p, result: r };
  });

  return recalculateStandings({ ...state, pairings: nextPairings });
}

function simulateResult(a: ChampionshipPlayer, b: ChampionshipPlayer) {
  const diff = Math.abs(a.elo - b.elo);
  const pDraw = clamp(0.08 + (1 - clamp(diff / 600, 0, 1)) * 0.06, 0.06, 0.16);

  const r = Math.random();
  if (r < pDraw) return 'draw' as const;
  const pAWin = expectedScore(a.elo, b.elo);
  return Math.random() < pAWin ? ('a' as const) : ('b' as const);
}

export function simulateRemainingMatchesForCurrentRound(state: ChampionshipState): ChampionshipState {
  const round = state.currentRound;
  const playersById = new Map(state.players.map((p) => [p.id, p] as const));

  const nextPairings = state.pairings.map((p) => {
    if (p.round !== round) return p;
    if (p.result) return p;
    // No simular la partida del usuario
    if (p.whiteId === state.userId || p.blackId === state.userId) return p;

    const white = playersById.get(p.whiteId);
    const black = playersById.get(p.blackId);
    if (!white || !black) return p;

    const sim = simulateResult(white, black);
    if (sim === 'draw') return { ...p, result: '1/2-1/2' };
    if (sim === 'a') return { ...p, result: '1-0' };
    return { ...p, result: '0-1' };
  });

  return recalculateStandings({ ...state, pairings: nextPairings });
}

export function isCurrentRoundComplete(state: ChampionshipState) {
  const round = state.currentRound;
  const roundPairings = state.pairings.filter((p) => p.round === round);
  return roundPairings.length > 0 && roundPairings.every((p) => !!p.result);
}

export function advanceRound(state: ChampionshipState): ChampionshipState {
  if (!isCurrentRoundComplete(state)) return state;
  if (state.currentRound >= state.totalRounds) {
    return { ...state, completed: true };
  }
  return { ...state, currentRound: state.currentRound + 1 };
}

export function championshipPlayerToBot(player: ChampionshipPlayer): Bot {
  const difficulty = clamp(Math.round((player.elo - 200) / 140) + 1, 1, 10);
  return {
    id: player.id,
    name: player.name,
    emoji: player.emoji,
    difficulty,
    elo: player.elo,
    description: 'Rival del Campeonato',
    isCustom: false,
    inTournament: false,
    color: colorFromIndex(parseInt(player.id.replace(/\D+/g, ''), 10) || 1),
  };
}

