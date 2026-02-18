import { useState, useEffect, useCallback } from 'react';
import type { Bot, PlayerStats, PlayerProfile } from '@/types';

const STORAGE_KEYS = {
  BOTS: 'chess_bots',
  PLAYER_STATS: 'chess_player_stats',
  PROFILE: 'chess_profile',
};

// Bots predeterminados del torneo
export const DEFAULT_BOTS: Bot[] = [
  {
    id: 'bot-1',
    name: 'RoboNovato',
    emoji: '🤖',
    difficulty: 2,
    elo: 800,
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
    elo: 1200,
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
    elo: 1600,
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
    elo: 2200,
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
    const stored = localStorage.getItem(STORAGE_KEYS.BOTS);
    if (stored) {
      const customBots = JSON.parse(stored);
      setBots([...DEFAULT_BOTS, ...customBots]);
    } else {
      setBots(DEFAULT_BOTS);
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

  return { bots, isLoaded, addBot, removeBot, getTournamentBots };
}

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_STATS);
    const profileStored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    
    if (stored && profileStored) {
      setStats(JSON.parse(stored));
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
