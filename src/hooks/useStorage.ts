import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Bot,
  PlayerStats,
  PlayerProfile,
  ChampionshipState,
  ChampionshipPlayer,
  CustomChampionshipPlayer,
  Achievement,
} from '@/types';
import {
  advanceRound,
  createInitialChampionshipState,
  createCustomChampionshipState,
  generatePairingsForCurrentRound,
  isCurrentRoundComplete,
  recalculateStandings,
  setUserResultForCurrentRound,
  simulateRemainingMatchesForCurrentRound,
} from '@/lib/championship';

const STORAGE_KEYS = {
  BOTS: 'chess_bots',
  PLAYER_STATS: 'chess_player_stats',
  PROFILE: 'chess_profile',
  FIXED_BOTS_OVERRIDE: 'chess_fixed_bots_override',
  CHAMPIONSHIP: 'chess_championship_state',
  CUSTOM_CHAMPIONSHIP: 'chess_custom_championship_state',
  ACHIEVEMENTS: 'chess_achievements',
  CAMPEONATOS: 'chess_campeonatos',
};

// Bots predeterminados del torneo
export const DEFAULT_BOTS: Bot[] = [
  {
    id: 'bot-1',
    name: 'RoboNovato',
    emoji: '🤖',
    difficulty: 2,
    elo: 200,
    description: 'Bot principiante, perfecto para aprender',
    isCustom: false,
    inTournament: true,
    color: '#22c55e',
  },
  {
    id: 'bot-2',
    name: 'Mago del Tablero',
    emoji: '🧙‍♂️',
    difficulty: 4,
    elo: 800,
    description: 'Conoce algunos trucos mágicos',
    isCustom: false,
    inTournament: true,
    color: '#a855f7',
  },
  {
    id: 'bot-3',
    name: 'Ninja Chess',
    emoji: '🥷',
    difficulty: 7,
    elo: 1200,
    description: 'Rápido y letal en el tablero',
    isCustom: false,
    inTournament: true,
    color: '#ef4444',
  },
  {
    id: 'bot-4',
    name: 'Rey Supremo',
    emoji: '👑',
    difficulty: 10,
    elo: 1600,
    description: 'El campeón absoluto del torneo',
    isCustom: false,
    inTournament: true,
    color: '#f59e0b',
  },
];

export function useBots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedCustom = localStorage.getItem(STORAGE_KEYS.BOTS);
    const storedFixedOverride = localStorage.getItem(STORAGE_KEYS.FIXED_BOTS_OVERRIDE);

    let fixedBots = DEFAULT_BOTS;

    // Aplicar overrides de bots fijos si existen
    if (storedFixedOverride) {
      try {
        const overrides: Partial<Bot>[] = JSON.parse(storedFixedOverride);
        fixedBots = DEFAULT_BOTS.map((bot) => {
          const override = overrides.find((o) => o.id === bot.id);
          return override ? { ...bot, ...override } : bot;
        });
      } catch {
        fixedBots = DEFAULT_BOTS;
      }
    }

    if (storedCustom) {
      const customBots: Bot[] = JSON.parse(storedCustom);
      setBots([...fixedBots, ...customBots]);
    } else {
      setBots(fixedBots);
    }
    setIsLoaded(true);
  }, []);

  const addBot = useCallback((bot: Omit<Bot, 'id' | 'isCustom'>) => {
    const newBot: Bot = {
      ...bot,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    
    setBots((prev) => {
      const customBots = prev.filter((b) => b.isCustom);
      const updatedCustomBots = [...customBots, newBot];
      localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(updatedCustomBots));
      return [...DEFAULT_BOTS, ...updatedCustomBots];
    });
    
    return newBot;
  }, []);

  const removeBot = useCallback((botId: string) => {
    setBots((prev) => {
      const updated = prev.filter((b) => b.id !== botId);
      const customBots = updated.filter((b) => b.isCustom);
      localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(customBots));
      return updated;
    });
  }, []);

  const getTournamentBots = useCallback(() => {
    return bots.filter((b) => b.inTournament);
  }, [bots]);

  const updateFixedBot = useCallback((botId: string, updates: Partial<Bot>) => {
    setBots((prev) => {
      const updatedBots = prev.map((bot) =>
        !bot.isCustom && bot.id === botId ? { ...bot, ...updates } : bot,
      );

      // Guardar solo overrides de bots fijos
      const fixedOverrides = updatedBots
        .filter((b) => !b.isCustom)
        .map((b) => ({
          id: b.id,
          name: b.name,
          emoji: b.emoji,
          difficulty: b.difficulty,
          elo: b.elo,
          description: b.description,
          color: b.color,
        }));

      localStorage.setItem(STORAGE_KEYS.FIXED_BOTS_OVERRIDE, JSON.stringify(fixedOverrides));

      // Guardar bots personalizados
      const customBots = updatedBots.filter((b) => b.isCustom);
      localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(customBots));

      return updatedBots;
    });
  }, []);

  const resetFixedBots = useCallback(() => {
    setBots((prev) => {
      const customBots = prev.filter((b) => b.isCustom);
      localStorage.removeItem(STORAGE_KEYS.FIXED_BOTS_OVERRIDE);
      localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(customBots));
      return [...DEFAULT_BOTS, ...customBots];
    });
  }, []);

  return { bots, isLoaded, addBot, removeBot, getTournamentBots, updateFixedBot, resetFixedBots };
}

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_STATS);
    const profileStored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    
    if (stored && profileStored) {
      const parsed = JSON.parse(stored) as PlayerStats;
      // Migración suave: inicializar campos nuevos si no existen
      if (!parsed.streaks) {
        parsed.streaks = { win: 0, bestWin: 0 };
      }
      if (!parsed.achievements) {
        // Mantener un espejo ligero en stats, aunque la fuente de verdad sea STORAGE_KEYS.ACHIEVEMENTS
        parsed.achievements = [];
      }
      setStats(parsed);
    } else if (profileStored) {
      const profile = JSON.parse(profileStored);
      const initialStats: PlayerStats = {
        profile,
        games: [],
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        eloHistory: [{ date: Date.now(), elo: profile.elo }],
        achievements: [],
        streaks: { win: 0, bestWin: 0 },
      };
      setStats(initialStats);
      localStorage.setItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(initialStats));
    }
    setIsLoaded(true);
  }, []);

  const addGameResult = useCallback((
    result: 'win' | 'loss' | 'draw',
    opponentElo: number,
    opponentName: string,
    moves: number,
    onEloUpdated?: (newElo: number) => void,
    historySan?: string[],
  ) => {
    setStats((prev) => {
      if (!prev) return null;

      const eloChange = calculateEloChange(prev.profile.elo, opponentElo, result);
      const newElo = Math.max(100, prev.profile.elo + eloChange);

      const MAX_GAMES = 20;
      const MAX_GAMES_WITH_HISTORY = 5;

      const gameResult = {
        result,
        eloChange,
        opponentElo,
        opponentName,
        date: Date.now(),
        moves,
        ...(historySan && historySan.length > 0 ? { historySan } : {}),
      };

      // Mantener solo las últimas MAX_GAMES partidas.
      // De esas, solo las primeras MAX_GAMES_WITH_HISTORY conservan historySan.
      const allGames = [gameResult, ...prev.games].slice(0, MAX_GAMES).map((g, idx) => {
        if (idx >= MAX_GAMES_WITH_HISTORY && g.historySan) {
          const { historySan: _, ...rest } = g;
          return rest;
        }
        return g;
      });

      const updatedStats: PlayerStats = {
        profile: {
          ...prev.profile,
          elo: newElo,
        },
        games: allGames,
        totalGames: prev.totalGames + 1,
        wins: prev.wins + (result === 'win' ? 1 : 0),
        losses: prev.losses + (result === 'loss' ? 1 : 0),
        draws: prev.draws + (result === 'draw' ? 1 : 0),
        eloHistory: [...prev.eloHistory, { date: Date.now(), elo: newElo }],
        achievements: prev.achievements ?? [],
        streaks: (() => {
          const prevStreaks = prev.streaks ?? { win: 0, bestWin: 0 };
          const newWinStreak = result === 'win' ? prevStreaks.win + 1 : 0;
          return {
            win: newWinStreak,
            bestWin: Math.max(prevStreaks.bestWin, newWinStreak),
          };
        })(),
      };

      localStorage.setItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(updatedStats));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedStats.profile));
      if (onEloUpdated) onEloUpdated(newElo);
      return updatedStats;
    });
  }, []);

  return { stats, isLoaded, addGameResult };
}

export function useProfile() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (stored) {
      setProfile(JSON.parse(stored));
    }
    setIsLoaded(true);
  }, []);

  const createProfile = useCallback((name: string) => {
    const newProfile: PlayerProfile = {
      id: `player-${Date.now()}`,
      name,
      elo: 1000,
      createdAt: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    setProfile(newProfile);
    
    // Inicializar stats
    const initialStats: PlayerStats = {
      profile: newProfile,
      games: [],
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      eloHistory: [{ date: Date.now(), elo: 1000 }],
    };
    localStorage.setItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(initialStats));
    
    return newProfile;
  }, []);

  const updateProfile = useCallback((updates: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    setProfile(null);
  }, []);

  return { profile, isLoaded, createProfile, updateProfile, resetAllData };
}

export function getStoredAchievements(): Achievement[] {
  const stored = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Achievement[]) : [];
  } catch {
    return [];
  }
}

export function setStoredAchievements(achievements: Achievement[]) {
  localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
}

// ─── Pure localStorage helper — called from App outside any React hook ────
// Reads the active campeonato from localStorage, processes the game result,
// and writes the updated state back. No React state involved.
export function applyChampionatoResult(result: 'win' | 'loss' | 'draw'): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CAMPEONATOS);
    if (!raw) return;
    const stored = JSON.parse(raw) as { entries: import('@/types').CampeonatoEntry[]; activeId: string | null };
    const { entries, activeId } = stored;
    if (!activeId) return;
    const entry = entries.find(e => e.id === activeId);
    if (!entry?.state || entry.state.completed) return;

    let current = migrateState(entry.state);
    let next = generatePairingsForCurrentRound(current);
    next = setUserResultForCurrentRound(next, result);
    next = simulateRemainingMatchesForCurrentRound(next);
    if (isCurrentRoundComplete(next)) {
      next = advanceRound(next);
      if (!next.completed) next = generatePairingsForCurrentRound(next);
    }

    const updatedEntries = entries.map(e => e.id === activeId ? { ...e, state: next } : e);
    localStorage.setItem(STORAGE_KEYS.CAMPEONATOS, JSON.stringify({ entries: updatedEntries, activeId }));
  } catch { /* ignore */ }
}

// ─── Unified Campeonatos hook ──────────────────────────────────────────────

export function useCampeonatos() {
  const [entries, setEntries] = useState<import('@/types').CampeonatoEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep a ref always in sync so callbacks can read the latest values without
  // depending on stale closures.
  const entriesRef = useRef<import('@/types').CampeonatoEntry[]>([]);
  const activeIdRef = useRef<string | null>(null);

  const setEntriesAndRef = useCallback((next: import('@/types').CampeonatoEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const setActiveIdAndRef = useCallback((next: string | null) => {
    activeIdRef.current = next;
    setActiveId(next);
  }, []);

  const persist = useCallback((
    newEntries: import('@/types').CampeonatoEntry[],
    newActiveId: string | null,
  ) => {
    localStorage.setItem(STORAGE_KEYS.CAMPEONATOS, JSON.stringify({ entries: newEntries, activeId: newActiveId }));
  }, []);

  // Load from localStorage on mount, migrating old keys if needed
  useEffect(() => {
    let loaded: import('@/types').CampeonatoEntry[] = [];
    let active: string | null = null;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMPEONATOS);
      if (raw) {
        const parsed = JSON.parse(raw) as { entries: import('@/types').CampeonatoEntry[]; activeId: string | null };
        loaded = (parsed.entries ?? []).map(e => ({
          ...e,
          state: e.state ? migrateState(e.state) : null,
        }));
        active = parsed.activeId ?? null;
      } else {
        // Migrate old separate keys
        const oldSiero = localStorage.getItem(STORAGE_KEYS.CHAMPIONSHIP);
        const oldCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_CHAMPIONSHIP);
        if (oldSiero) {
          try {
            const s = JSON.parse(oldSiero) as ChampionshipState;
            const entry: import('@/types').CampeonatoEntry = {
              id: 'siero-migrated',
              name: 'Campeonato Club Siero',
              type: 'siero',
              adaptive: s.adaptive,
              state: migrateState(s),
              createdAt: s.startedAt ?? Date.now(),
            };
            loaded.push(entry);
            active = entry.id;
          } catch { /* ignore */ }
        }
        if (oldCustom) {
          try {
            const s = JSON.parse(oldCustom) as ChampionshipState;
            const entry: import('@/types').CampeonatoEntry = {
              id: `custom-migrated-${Date.now()}`,
              name: 'Campeonato importado',
              type: 'custom',
              state: migrateState(s),
              createdAt: s.startedAt ?? Date.now(),
            };
            loaded.push(entry);
            if (!active) active = entry.id;
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    setEntriesAndRef(loaded);
    setActiveIdAndRef(active);
    setIsLoaded(true);
  }, []);

  const createSiero = useCallback((userProfile: PlayerProfile, adaptive = false) => {
    const initial = createInitialChampionshipState({ userProfile, adaptive });
    const state = generatePairingsForCurrentRound(initial);
    const entry: import('@/types').CampeonatoEntry = {
      id: `siero-${Date.now()}`,
      name: 'Campeonato Club Siero',
      type: 'siero',
      adaptive,
      state,
      createdAt: Date.now(),
    };
    const next = [...entriesRef.current, entry];
    setEntriesAndRef(next);
    setActiveIdAndRef(entry.id);
    persist(next, entry.id);
    return entry;
  }, [persist, setEntriesAndRef, setActiveIdAndRef]);

  const createCustom = useCallback((
    userProfile: PlayerProfile,
    name: string,
    totalRounds: number,
    opponents: CustomChampionshipPlayer[],
    sourceUrl?: string,
  ) => {
    const initial = createCustomChampionshipState({ userProfile, title: name, totalRounds, opponents });
    const state = generatePairingsForCurrentRound(initial);
    const entry: import('@/types').CampeonatoEntry = {
      id: `custom-${Date.now()}`,
      name,
      type: 'custom',
      state,
      createdAt: Date.now(),
      sourceUrl,
      initialOpponents: opponents,
      initialTotalRounds: totalRounds,
    };
    const next = [...entriesRef.current, entry];
    setEntriesAndRef(next);
    setActiveIdAndRef(entry.id);
    persist(next, entry.id);
    return entry;
  }, [persist, setEntriesAndRef, setActiveIdAndRef]);

  const deleteEntry = useCallback((id: string) => {
    const next = entriesRef.current.filter(e => e.id !== id);
    const newActive = activeIdRef.current === id ? (next[0]?.id ?? null) : activeIdRef.current;
    setEntriesAndRef(next);
    setActiveIdAndRef(newActive);
    persist(next, newActive);
  }, [persist, setEntriesAndRef, setActiveIdAndRef]);

  const renameEntry = useCallback((id: string, name: string) => {
    const next = entriesRef.current.map(e => e.id === id ? { ...e, name } : e);
    setEntriesAndRef(next);
    persist(next, activeIdRef.current);
  }, [persist, setEntriesAndRef]);

  const selectActive = useCallback((id: string) => {
    setActiveIdAndRef(id);
    persist(entriesRef.current, id);
  }, [persist, setActiveIdAndRef]);

  const resetEntry = useCallback((id: string, userProfile: PlayerProfile) => {
    const entry = entriesRef.current.find(e => e.id === id);
    if (!entry) return;

    let newState: ChampionshipState | null = null;
    if (entry.type === 'siero') {
      const initial = createInitialChampionshipState({ userProfile, adaptive: entry.adaptive ?? false });
      newState = generatePairingsForCurrentRound(initial);
    } else if (entry.initialOpponents && entry.initialTotalRounds) {
      const initial = createCustomChampionshipState({
        userProfile,
        title: entry.name,
        totalRounds: entry.initialTotalRounds,
        opponents: entry.initialOpponents,
      });
      newState = generatePairingsForCurrentRound(initial);
    }

    const next = entriesRef.current.map(e => e.id === id ? { ...e, state: newState } : e);
    setEntriesAndRef(next);
    persist(next, activeIdRef.current);
  }, [persist, setEntriesAndRef]);

  const ensurePairings = useCallback((id: string) => {
    const entry = entriesRef.current.find(e => e.id === id);
    if (!entry?.state) return;
    const newState = generatePairingsForCurrentRound(entry.state);
    // Only update if pairings were actually added
    if (newState === entry.state) return;
    const next = entriesRef.current.map(e => e.id === id ? { ...e, state: newState } : e);
    setEntriesAndRef(next);
    persist(next, activeIdRef.current);
  }, [persist, setEntriesAndRef]);

  const submitResult = useCallback((id: string, result: 'win' | 'loss' | 'draw') => {
    // Read directly from localStorage to always have the freshest state
    // (avoids any stale React state issue)
    let current: ChampionshipState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMPEONATOS);
      if (!raw) return;
      const stored = JSON.parse(raw) as { entries: import('@/types').CampeonatoEntry[]; activeId: string | null };
      const storedEntry = stored.entries.find(e => e.id === id);
      if (!storedEntry?.state || storedEntry.state.completed) return;
      current = migrateState(storedEntry.state);
    } catch { return; }

    if (!current || current.completed) return;

    let next = generatePairingsForCurrentRound(current);
    next = setUserResultForCurrentRound(next, result);
    next = simulateRemainingMatchesForCurrentRound(next);
    if (isCurrentRoundComplete(next)) {
      next = advanceRound(next);
      if (!next.completed) next = generatePairingsForCurrentRound(next);
    }

    // Update React state and localStorage consistently
    const updatedEntries = entriesRef.current.map(e => e.id === id ? { ...e, state: next } : e);
    setEntriesAndRef(updatedEntries);
    persist(updatedEntries, activeIdRef.current);
  }, [persist, setEntriesAndRef]);

  const activeEntry = entries.find(e => e.id === activeId) ?? null;

  return {
    entries,
    activeId,
    activeEntry,
    isLoaded,
    createSiero,
    createCustom,
    deleteEntry,
    renameEntry,
    selectActive,
    resetEntry,
    ensurePairings,
    submitResult,
  };
}

function migrateState(s: ChampionshipState): ChampionshipState {
  return recalculateStandings({
    ...s,
    startedAt: s.startedAt ?? Date.now(),
    completed: s.completed ?? false,
    totalRounds: s.totalRounds && s.totalRounds > 1 ? s.totalRounds : 7,
    players: (s.players ?? []).map((p: ChampionshipPlayer) => ({
      ...p,
      opponents: Array.isArray(p.opponents) ? p.opponents : [],
    })),
  });
}

// ─── Legacy hooks (kept for App.tsx transition, delegating to useCampeonatos) ─

export function useChampionshipState() {
  const [championship, setChampionship] = useState<ChampionshipState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAMPIONSHIP);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChampionshipState;
        // Migración suave: asegurar campos nuevos
        const migrated: ChampionshipState = {
          ...parsed,
          startedAt: parsed.startedAt ?? Date.now(),
          completed: parsed.completed ?? false,
          players: (parsed.players ?? []).map((p: ChampionshipPlayer) => ({
            ...p,
            opponents: Array.isArray(p.opponents) ? p.opponents : [],
          })),
        };
        setChampionship(recalculateStandings(migrated));
      } catch {
        setChampionship(null);
      }
    } else {
      setChampionship(null);
    }
    setIsLoaded(true);
  }, []);

  const persist = useCallback((state: ChampionshipState | null) => {
    if (!state) {
      localStorage.removeItem(STORAGE_KEYS.CHAMPIONSHIP);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.CHAMPIONSHIP, JSON.stringify(state));
  }, []);

  const startNew = useCallback((userProfile: PlayerProfile, adaptive = false) => {
    const initial = createInitialChampionshipState({ userProfile, adaptive });
    const withPairings = generatePairingsForCurrentRound(initial);
    persist(withPairings);
    setChampionship(withPairings);
    return withPairings;
  }, [persist]);

  const reset = useCallback(() => {
    persist(null);
    setChampionship(null);
  }, [persist]);

  const ensureCurrentRoundPairings = useCallback(() => {
    setChampionship((prev) => {
      if (!prev) return prev;
      const next = generatePairingsForCurrentRound(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const submitUserResultAndSimulateRound = useCallback((result: 'win' | 'loss' | 'draw') => {
    setChampionship((prev) => {
      // Siempre leer de localStorage para evitar estado obsoleto cuando hay múltiples
      // instancias del hook (p.ej. App.tsx y Championship.tsx) y una de ellas ha
      // reiniciado/iniciado el campeonato sin que la otra se haya enterado.
      let current: ChampionshipState | null = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CHAMPIONSHIP);
        if (!stored) return prev;
        const parsed = JSON.parse(stored) as ChampionshipState;
        // No procesar un campeonato ya completado
        if (parsed.completed) return prev;
        current = recalculateStandings({
          ...parsed,
          startedAt: parsed.startedAt ?? Date.now(),
          completed: false,
          totalRounds: parsed.totalRounds && parsed.totalRounds > 1 ? parsed.totalRounds : 7,
          players: (parsed.players ?? []).map((p: ChampionshipPlayer) => ({
            ...p,
            opponents: Array.isArray(p.opponents) ? p.opponents : [],
          })),
        });
      } catch {
        return prev;
      }
      if (!current || current.completed) return prev;
      let next = generatePairingsForCurrentRound(current);
      next = setUserResultForCurrentRound(next, result);
      next = simulateRemainingMatchesForCurrentRound(next);
      if (isCurrentRoundComplete(next)) {
        next = advanceRound(next);
        // Generar pairings de la nueva ronda inmediatamente
        if (!next.completed) {
          next = generatePairingsForCurrentRound(next);
        }
      }
      persist(next);
      return next;
    });
  }, [persist]);

  return {
    championship,
    isLoaded,
    startNew,
    reset,
    ensureCurrentRoundPairings,
    submitUserResultAndSimulateRound,
  };
}

export function useCustomChampionshipState() {
  const [championship, setChampionship] = useState<ChampionshipState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_CHAMPIONSHIP);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChampionshipState;
        const migrated: ChampionshipState = {
          ...parsed,
          startedAt: parsed.startedAt ?? Date.now(),
          completed: parsed.completed ?? false,
          players: (parsed.players ?? []).map((p: ChampionshipPlayer) => ({
            ...p,
            opponents: Array.isArray(p.opponents) ? p.opponents : [],
          })),
        };
        setChampionship(recalculateStandings(migrated));
      } catch {
        setChampionship(null);
      }
    }
    setIsLoaded(true);
  }, []);

  const persist = useCallback((state: ChampionshipState | null) => {
    if (!state) {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_CHAMPIONSHIP);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CHAMPIONSHIP, JSON.stringify(state));
  }, []);

  const startNew = useCallback((
    userProfile: PlayerProfile,
    title: string,
    totalRounds: number,
    opponents: CustomChampionshipPlayer[],
  ) => {
    const initial = createCustomChampionshipState({ userProfile, title, totalRounds, opponents });
    const withPairings = generatePairingsForCurrentRound(initial);
    persist(withPairings);
    setChampionship(withPairings);
    return withPairings;
  }, [persist]);

  const reset = useCallback(() => {
    persist(null);
    setChampionship(null);
  }, [persist]);

  const ensureCurrentRoundPairings = useCallback(() => {
    setChampionship((prev) => {
      if (!prev) return prev;
      const next = generatePairingsForCurrentRound(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const submitUserResultAndSimulateRound = useCallback((result: 'win' | 'loss' | 'draw') => {
    setChampionship((prev) => {
      let current: ChampionshipState | null = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_CHAMPIONSHIP);
        if (!stored) return prev;
        const parsed = JSON.parse(stored) as ChampionshipState;
        if (parsed.completed) return prev;
        current = recalculateStandings({
          ...parsed,
          startedAt: parsed.startedAt ?? Date.now(),
          completed: false,
          totalRounds: parsed.totalRounds && parsed.totalRounds > 1 ? parsed.totalRounds : 7,
          players: (parsed.players ?? []).map((p: ChampionshipPlayer) => ({
            ...p,
            opponents: Array.isArray(p.opponents) ? p.opponents : [],
          })),
        });
      } catch {
        return prev;
      }
      if (!current || current.completed) return prev;
      let next = generatePairingsForCurrentRound(current);
      next = setUserResultForCurrentRound(next, result);
      next = simulateRemainingMatchesForCurrentRound(next);
      if (isCurrentRoundComplete(next)) {
        next = advanceRound(next);
        if (!next.completed) {
          next = generatePairingsForCurrentRound(next);
        }
      }
      persist(next);
      return next;
    });
  }, [persist]);

  return {
    championship,
    isLoaded,
    startNew,
    reset,
    ensureCurrentRoundPairings,
    submitUserResultAndSimulateRound,
  };
}

// Fórmula de cálculo de ELO
function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const K = 32; // Factor de ajuste
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  
  let actualScore: number;
  switch (result) {
    case 'win':
      actualScore = 1;
      break;
    case 'draw':
      actualScore = 0.5;
      break;
    case 'loss':
      actualScore = 0;
      break;
  }
  
  return Math.round(K * (actualScore - expectedScore));
}
