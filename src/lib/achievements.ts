import type { Achievement } from '@/types';

export type ExcellentMoveHighlight =
  | { type: 'checkmate'; label: string }
  | { type: 'queen-capture'; label: string }
  | { type: 'promotion'; label: string }
  | { type: 'check'; label: string }
  | null;

export interface EvaluateAchievementsInput {
  now: number;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  moves: number;
  opponentElo: number;
  opponentName: string;
  playerEloBefore: number;
  totalGamesBefore: number;
  winsBefore: number;
  currentWinStreakAfter: number;
  bestWinStreakAfter: number;
  lastMoveVerbose?: any;
  tournamentCompleted?: boolean;
}

export interface EvaluateAchievementsOutput {
  achievements: Achievement[];
  highlight: ExcellentMoveHighlight;
}

function createAchievement(
  now: number,
  id: string,
  title: string,
  description: string,
  metadata?: Record<string, unknown>,
): Achievement {
  return { id, title, description, earnedAt: now, metadata };
}

export function evaluateAchievements(input: EvaluateAchievementsInput): EvaluateAchievementsOutput {
  const {
    now,
    result,
    reason,
    moves,
    opponentElo,
    opponentName,
    playerEloBefore,
    totalGamesBefore,
    winsBefore,
    currentWinStreakAfter,
    bestWinStreakAfter,
    lastMoveVerbose,
    tournamentCompleted,
  } = input;

  const achievements: Achievement[] = [];

  // Highlights (no se guardan como "achievement" por defecto, solo UX)
  let highlight: ExcellentMoveHighlight = null;
  const san = (lastMoveVerbose?.san as string | undefined) ?? '';
  if (san.includes('#')) {
    highlight = { type: 'checkmate', label: '¡Jaque mate!' };
  } else if (lastMoveVerbose?.captured === 'q') {
    highlight = { type: 'queen-capture', label: 'Captura de dama' };
  } else if (lastMoveVerbose?.promotion) {
    highlight = { type: 'promotion', label: '¡Promoción!' };
  } else if (san.includes('+')) {
    highlight = { type: 'check', label: 'Jaque fuerte' };
  }

  // Achievements
  if (totalGamesBefore === 0) {
    achievements.push(
      createAchievement(now, 'first-game', 'Primeros pasos', 'Juega tu primera partida.'),
    );
  }

  if (result === 'win' && winsBefore === 0) {
    achievements.push(
      createAchievement(now, 'first-win', 'Primera victoria', 'Gana tu primera partida.'),
    );
  }

  if (result === 'win' && reason === 'Jaque mate') {
    achievements.push(
      createAchievement(now, 'checkmate-win', 'Mate', 'Gana por jaque mate.'),
    );
  }

  if (result === 'win' && moves <= 20) {
    achievements.push(
      createAchievement(now, 'fast-win', 'Rayo', 'Gana en 20 movimientos o menos.', {
        moves,
      }),
    );
  }

  if (result === 'win' && opponentElo - playerEloBefore >= 200) {
    achievements.push(
      createAchievement(now, 'giant-slayer', 'Cazagigantes', `Vence a un rival mucho más fuerte.`, {
        opponentElo,
        opponentName,
        playerEloBefore,
      }),
    );
  }

  if (result === 'win' && currentWinStreakAfter === 3) {
    achievements.push(
      createAchievement(now, 'win-streak-3', 'Racha x3', 'Gana 3 partidas seguidas.'),
    );
  }

  if (result === 'win' && currentWinStreakAfter === 5) {
    achievements.push(
      createAchievement(now, 'win-streak-5', 'Imparable', 'Gana 5 partidas seguidas.'),
    );
  }

  if (result === 'win' && bestWinStreakAfter >= 7 && currentWinStreakAfter === bestWinStreakAfter) {
    achievements.push(
      createAchievement(now, 'win-streak-7', 'Leyenda', 'Alcanza una racha de 7 victorias.'),
    );
  }

  if (tournamentCompleted) {
    achievements.push(
      createAchievement(now, 'quick-tournament-complete', 'Campeón del Torneo Rápido', 'Derrota a los 4 bots del torneo.'),
    );
  }

  return { achievements, highlight };
}

