import type {
  Bot,
  ChampionshipPairing,
  ChampionshipPlayer,
  ChampionshipState,
  CustomChampionshipPlayer,
  PlayerProfile,
} from '@/types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function expectedScore(eloA: number, eloB: number) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// Grupos de jugadores al estilo del Campeonato de Asturias
const DEBUT_NAMES = [
  'Alumno Ansioso', 'Peón Perdido', 'Rey Torpe', 'Alfil Asustado', 'Torre Tímida',
  'Caballo Cojo', 'Gambito Fallido', 'Enroque Olvidado', 'Jaque Novato', 'Apertura Caótica',
  'Blancas Despistadas', 'Negras Confundidas', 'Captura Accidental',
];
const DEBUT_EMOJIS = ['😅', '🐣', '🤓', '😬', '🐢', '😵', '🫣', '🙈', '🐥', '😟', '🤔', '😓', '🐌'];

const MID_NAMES = [
  'Candidato Astuto', 'Jugador Sólido', 'Defensa Tenaz', 'Ataque Pausado', 'Peón Pasado',
  'Mediojuego Firme', 'Torres Activas', 'Alfiles Cruzados', 'Caballo Bien Puesto', 'Táctica Básica',
  'Gambito Aceptado', 'Siciliana Menor', 'Francesa Discreta',
];
const MID_EMOJIS = ['🧐', '🤨', '🎯', '🔍', '🧩', '⚡', '🛡️', '⚔️', '🎲', '🔧', '🦊', '🐺', '🦉'];

const ADV_NAMES = [
  'Maestro Implacable', 'Gran Táctico', 'Estratega Supremo', 'Rey del Final', 'Ataque Brillante',
  'Combinación Mortal', 'Sacrificio Elegante', 'Zugzwang Experto', 'Maniobra Profunda', 'Variante Aguda',
  'Asturiano Feroz', 'Campeón Regional', 'Élite Imparable',
];
const ADV_EMOJIS = ['🏆', '🦁', '👑', '🐉', '🔥', '🧠', '🦾', '🥷', '💎', '⚡', '🦅', '🌟', '💀'];


function colorFromIndex(i: number) {
  const hue = (i * 37) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Genera bots distribuidos en tres grupos al estilo del Campeonato de Asturias:
// Debutantes (ELO 100-499), Intermedios (ELO 500-899), Avanzados (ELO 900-1500)
function createGroupedBots(botCount: number): Array<{ name: string; emoji: string; elo: number }> {
  // Distribución: ~35% debutantes, ~35% intermedios, ~30% avanzados
  const nDebut = Math.round(botCount * 0.35);
  const nMid = Math.round(botCount * 0.35);
  const nAdv = botCount - nDebut - nMid;

  const bots: Array<{ name: string; emoji: string; elo: number }> = [];

  // Debutantes: ELO 100–499, escalonados
  for (let i = 0; i < nDebut; i++) {
    const t = nDebut <= 1 ? 0 : i / (nDebut - 1);
    const base = 100 + t * 399;
    const jitter = (Math.random() - 0.5) * 60;
    const elo = Math.round(clamp(base + jitter, 100, 499));
    bots.push({ name: DEBUT_NAMES[i % DEBUT_NAMES.length], emoji: DEBUT_EMOJIS[i % DEBUT_EMOJIS.length], elo });
  }

  // Intermedios: ELO 500–899, escalonados
  for (let i = 0; i < nMid; i++) {
    const t = nMid <= 1 ? 0 : i / (nMid - 1);
    const base = 500 + t * 399;
    const jitter = (Math.random() - 0.5) * 60;
    const elo = Math.round(clamp(base + jitter, 500, 899));
    bots.push({ name: MID_NAMES[i % MID_NAMES.length], emoji: MID_EMOJIS[i % MID_EMOJIS.length], elo });
  }

  // Avanzados: ELO 900–1500, escalonados
  for (let i = 0; i < nAdv; i++) {
    const t = nAdv <= 1 ? 0 : i / (nAdv - 1);
    const base = 900 + t * 600;
    const jitter = (Math.random() - 0.5) * 60;
    const elo = Math.round(clamp(base + jitter, 900, 1500));
    bots.push({ name: ADV_NAMES[i % ADV_NAMES.length], emoji: ADV_EMOJIS[i % ADV_EMOJIS.length], elo });
  }

  // Mezclar dentro de cada grupo para que las mesas no sean siempre las mismas
  for (let i = bots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bots[i], bots[j]] = [bots[j], bots[i]];
  }

  return bots;
}

export function createInitialChampionshipState(params: {
  userProfile: PlayerProfile;
  totalRounds?: number;
  totalPlayers?: number;
  adaptive?: boolean;
}): ChampionshipState {
  const {
    userProfile,
    totalRounds = 7,
    totalPlayers = 40,
    adaptive = false,
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
  const groupedBots = createGroupedBots(botCount);

  // En modo adaptativo, escalar los ELOs de los bots para que estén centrados
  // alrededor del ELO del jugador, manteniendo la distribución relativa.
  // Los bots originales van de 100 a 1500 (rango 1400). En modo adaptativo
  // los centramos en playerElo con un rango de ±500 (total 1000).
  const scaledBots = adaptive ? (() => {
    const playerElo = userProfile.elo;
    const origMin = 100, origMax = 1500, origRange = origMax - origMin;
    const targetRange = 1000;
    const targetMin = Math.max(100, playerElo - 500);
    const targetMax = targetMin + targetRange;
    return groupedBots.map((bot) => {
      const t = (bot.elo - origMin) / origRange; // 0..1
      const scaledElo = Math.round(clamp(targetMin + t * targetRange, 100, targetMax));
      return { ...bot, elo: scaledElo };
    });
  })() : groupedBots;

  scaledBots.forEach((bot, i) => {
    players.push({
      id: `champ-bot-${i + 1}`,
      name: bot.name,
      emoji: bot.emoji,
      elo: bot.elo,
      isUser: false,
      points: 0,
      buchholz: 0,
      opponents: [],
    });
  });

  return {
    seasonId: `season-${Date.now()}`,
    currentRound: 1,
    totalRounds,
    players,
    pairings: [],
    userId,
    startedAt: Date.now(),
    completed: false,
    adaptive,
  };
}

// Crea un campeonato personalizado a partir de una lista de jugadores ya definida.
// El jugador usuario se identifica por userId; los demás son bots/rivales.
export function createCustomChampionshipState(params: {
  userProfile: PlayerProfile;
  title: string;
  totalRounds: number;
  opponents: CustomChampionshipPlayer[];
}): ChampionshipState {
  const { userProfile, totalRounds, opponents } = params;
  const userId = userProfile.id;

  const players: ChampionshipPlayer[] = [
    {
      id: userId,
      name: userProfile.name,
      emoji: '🧑‍💻',
      elo: userProfile.elo,
      isUser: true,
      points: 0,
      buchholz: 0,
      opponents: [],
    },
    ...opponents.map((o) => ({
      id: o.id,
      name: o.name,
      emoji: o.emoji || '🤖',
      elo: o.elo,
      isUser: false,
      points: 0,
      buchholz: 0,
      opponents: [],
    })),
  ];

  return {
    seasonId: `custom-${Date.now()}`,
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
    // Reset points, buchholz and opponents — all will be rebuilt from pairings
    playersById.set(p.id, { ...p, points: 0, buchholz: 0, opponents: [] });
  }

  for (const pairing of state.pairings) {
    const white = playersById.get(pairing.whiteId);
    const black = playersById.get(pairing.blackId);
    if (!white || !black) continue;

    // Rebuild opponents from every pairing (regardless of result)
    if (!white.opponents.includes(black.id)) white.opponents.push(black.id);
    if (!black.opponents.includes(white.id)) black.opponents.push(white.id);

    if (!pairing.result) continue;
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

  // Sistema suizo FIDE (Dutch Swiss):
  // Ronda 1: ordenar por ELO, emparejar mitad superior con mitad inferior
  //   (1º vs N/2+1º, 2º vs N/2+2º, ...)
  // Rondas siguientes: agrupar por puntos (grupos de puntuación), dentro de
  //   cada grupo ordenar por ELO y emparejar mitad superior con mitad inferior.
  //   Si el grupo tiene número impar, el jugador sobrante baja al grupo siguiente.

  const allPlayers = Array.from(playersById.values());
  const rawPairs: Array<{ p: ChampionshipPlayer; q: ChampionshipPlayer }> = [];
  const pairedIds = new Set<string>();

  const pairWithinGroup = (group: ChampionshipPlayer[]) => {
    // Ordenar dentro del grupo por ELO desc (mismo criterio FIDE)
    group.sort((a, b) => b.elo - a.elo);
    const mid = Math.floor(group.length / 2);
    const top = group.slice(0, mid);
    const bottom = group.slice(mid);

    // Intentar emparejar top[i] con bottom[i] evitando repetidos
    const usedBottom = new Set<number>();
    for (let i = 0; i < top.length; i++) {
      const p = top[i];
      if (pairedIds.has(p.id)) continue;
      let bestJ = -1;
      // Buscar en bottom empezando por el emparejamiento natural (misma posición)
      for (let offset = 0; offset < bottom.length; offset++) {
        const j = (i + offset) % bottom.length;
        const q = bottom[j];
        if (pairedIds.has(q.id) || usedBottom.has(j)) continue;
        if (alreadyPlayed(p, q) && bottom.length > 1 && offset < bottom.length - 1) continue;
        bestJ = j;
        break;
      }
      if (bestJ === -1) {
        // Fallback: cualquier sin usar, aunque se repita
        for (let j = 0; j < bottom.length; j++) {
          if (!pairedIds.has(bottom[j].id) && !usedBottom.has(j)) {
            bestJ = j;
            break;
          }
        }
      }
      if (bestJ >= 0) {
        const q = bottom[bestJ];
        rawPairs.push({ p, q });
        pairedIds.add(p.id);
        pairedIds.add(q.id);
        usedBottom.add(bestJ);

        const pRef = playersById.get(p.id);
        const qRef = playersById.get(q.id);
        if (pRef && !pRef.opponents.includes(q.id)) pRef.opponents.push(q.id);
        if (qRef && !qRef.opponents.includes(p.id)) qRef.opponents.push(p.id);
      }
    }
  };

  if (round === 1) {
    // Ronda 1: todos ordenados por ELO, mitad superior vs mitad inferior
    const byElo = allPlayers.slice().sort((a, b) => b.elo - a.elo);
    pairWithinGroup(byElo);
  } else {
    // Rondas siguientes: agrupar por puntos (desc), procesar grupo a grupo
    const pointValues = [...new Set(allPlayers.map((p) => p.points))].sort((a, b) => b - a);
    let floaters: ChampionshipPlayer[] = [];

    for (const pts of pointValues) {
      const group = [
        ...floaters,
        ...allPlayers.filter((p) => p.points === pts && !pairedIds.has(p.id)),
      ];
      floaters = [];

      if (group.length === 0) continue;

      if (group.length % 2 !== 0) {
        // El último (ELO más bajo del grupo) flota al siguiente grupo
        group.sort((a, b) => b.elo - a.elo);
        floaters.push(group.pop()!);
      }

      pairWithinGroup(group);
    }

    // Si quedan flotadores sin emparejar (raro), emparejarlos entre sí
    if (floaters.length >= 2) {
      pairWithinGroup(floaters);
    }
  }

  // Emparejar cualquier jugador sin pareja (no debería ocurrir en número par)
  const unpaired = allPlayers.filter((p) => !pairedIds.has(p.id));
  for (let i = 0; i + 1 < unpaired.length; i += 2) {
    rawPairs.push({ p: unpaired[i], q: unpaired[i + 1] });
    const pRef = playersById.get(unpaired[i].id);
    const qRef = playersById.get(unpaired[i + 1].id);
    if (pRef && !pRef.opponents.includes(unpaired[i + 1].id)) pRef.opponents.push(unpaired[i + 1].id);
    if (qRef && !qRef.opponents.includes(unpaired[i].id)) qRef.opponents.push(unpaired[i].id);
  }

  // Determinar color del usuario para esta ronda (alternando respecto a la anterior)
  const userColorThisRound: 'w' | 'b' = state.lastUserColor === 'w' ? 'b' : 'w';
  const newPairings: ChampionshipPairing[] = [];

  // Mesa 1 = la partida más destacada (mayor puntuación media de los dos jugadores)
  // Mismo orden que info64.org: grupo de 1 pto en mesas 1-N, luego 0.5 pto, luego 0 pto
  rawPairs.sort((a, b) => {
    const aAvg = (a.p.points + a.q.points) / 2;
    const bAvg = (b.p.points + b.q.points) / 2;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return Math.max(b.p.elo, b.q.elo) - Math.max(a.p.elo, a.q.elo);
  });

  rawPairs.forEach(({ p, q }, idx) => {
    const table = idx + 1;

    let whiteId = p.id;
    let blackId = q.id;
    if (p.id === state.userId || q.id === state.userId) {
      const opp = p.id === state.userId ? q : p;
      if (userColorThisRound === 'w') {
        whiteId = state.userId;
        blackId = opp.id;
      } else {
        whiteId = opp.id;
        blackId = state.userId;
      }
    } else if (table % 2 === 0) {
      whiteId = q.id;
      blackId = p.id;
    }

    newPairings.push({ round, table, whiteId, blackId });
  });

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

  // Determinar qué color jugó el usuario en este emparejamiento
  const userIsWhite = pairing.whiteId === state.userId;

  const nextPairings = state.pairings.map((p) => {
    if (p.round !== round) return p;
    if (p.table !== pairing.table) return p;

    let r: string;
    if (result === 'win')  r = userIsWhite ? '1-0' : '0-1';
    else if (result === 'loss') r = userIsWhite ? '0-1' : '1-0';
    else r = '1/2-1/2';
    return { ...p, result: r };
  });

  return recalculateStandings({
    ...state,
    pairings: nextPairings,
    lastUserColor: userIsWhite ? 'w' : 'b',
  });
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
  // ELO 100 → difficulty 1, ELO 1500 → difficulty 10, lineal
  const difficulty = clamp(Math.round(((player.elo - 100) / 1400) * 9) + 1, 1, 10);
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

