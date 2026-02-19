import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Achievement, PlayerStats } from '@/types';
import { evaluateAchievements } from '@/lib/achievements';
import { getStoredAchievements, setStoredAchievements } from '@/hooks/useStorage';

function uniqueByIdKeepFirst(items: Achievement[]) {
  const seen = new Set<string>();
  const out: Achievement[] = [];
  for (const a of items) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

export function useAchievements(stats: PlayerStats | null) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setAchievements(getStoredAchievements());
    setIsLoaded(true);
  }, []);

  const earnedIds = useMemo(() => new Set(achievements.map((a) => a.id)), [achievements]);

  const earn = useCallback((newOnes: Achievement[]) => {
    if (newOnes.length === 0) return;
    setAchievements((prev) => {
      const merged = uniqueByIdKeepFirst([...newOnes, ...prev]);
      setStoredAchievements(merged);
      return merged;
    });
  }, []);

  const processGameEnd = useCallback((payload: {
    result: 'win' | 'loss' | 'draw';
    reason: string;
    moves: number;
    opponentElo: number;
    opponentName: string;
    playerEloBefore: number;
    lastMoveVerbose?: any;
    tournamentCompleted?: boolean;
  }) => {
    const now = Date.now();

    const totalGamesBefore = stats?.totalGames ?? 0;
    const winsBefore = stats?.wins ?? 0;

    const streaks = stats?.streaks ?? { win: 0, bestWin: 0 };
    const currentWinStreakAfter =
      payload.result === 'win' ? streaks.win + 1 : 0;
    const bestWinStreakAfter =
      payload.result === 'win'
        ? Math.max(streaks.bestWin, streaks.win + 1)
        : streaks.bestWin;

    const { achievements: earnedNow, highlight } = evaluateAchievements({
      now,
      result: payload.result,
      reason: payload.reason,
      moves: payload.moves,
      opponentElo: payload.opponentElo,
      opponentName: payload.opponentName,
      playerEloBefore: payload.playerEloBefore,
      totalGamesBefore,
      winsBefore,
      currentWinStreakAfter,
      bestWinStreakAfter,
      lastMoveVerbose: payload.lastMoveVerbose,
      tournamentCompleted: payload.tournamentCompleted,
    });

    // Toast highlight (si aplica)
    if (highlight) {
      toast(`⭐ Jugada excelente: ${highlight.label}`, {
        description: payload.opponentName ? `vs ${payload.opponentName}` : undefined,
      });
    }

    // Toast + persist achievements (solo los nuevos)
    const newlyUnlocked = earnedNow.filter((a) => !earnedIds.has(a.id));
    for (const a of newlyUnlocked) {
      toast.success(`🏅 Insignia desbloqueada: ${a.title}`, {
        description: a.description,
      });
    }
    earn(newlyUnlocked);
  }, [earnedIds, earn, stats]);

  return { achievements, isLoaded, processGameEnd };
}

