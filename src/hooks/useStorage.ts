import { useState, useEffect, useCallback } from 'react';
import type {
  Bot,
  PlayerStats,
  PlayerProfile,
  ChampionshipState,
  ChampionshipPlayer,
  Achievement,
} from '@/types';
import {
  advanceRound,
  createInitialChampionshipState,
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
  ACHIEVEMENTS: 'chess_achievements',
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
    moves: number
  ) => {
    setStats((prev) => {
      if (!prev) return null;

      const eloChange = calculateEloChange(prev.profile.elo, opponentElo, result);
      const newElo = Math.max(100, prev.profile.elo + eloChange);

      const gameResult = {
        result,
        eloChange,
        opponentElo,
        opponentName,
        date: Date.now(),
        moves,
      };

      const updatedStats: PlayerStats = {
        profile: {
          ...prev.profile,
          elo: newElo,
        },
        games: [gameResult, ...prev.games],
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

  return { profile, isLoaded, createProfile, updateProfile };
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

  const startNew = useCallback((userProfile: PlayerProfile) => {
    const initial = createInitialChampionshipState({ userProfile });
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
      if (!prev) return prev;
      let next = generatePairingsForCurrentRound(prev);
      next = setUserResultForCurrentRound(next, result);
      next = simulateRemainingMatchesForCurrentRound(next);
      if (isCurrentRoundComplete(next)) {
        next = advanceRound(next);
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
