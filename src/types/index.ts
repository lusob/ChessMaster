// Tipos para la aplicación de ajedrez

export interface Bot {
  id: string;
  name: string;
  emoji: string;
  difficulty: number; // 1-10
  elo: number;
  description: string;
  isCustom: boolean;
  photoUrl?: string;
  inTournament: boolean;
  color: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  elo: number;
  avatar?: string;
  createdAt: number;
}

export interface GameResult {
  result: 'win' | 'loss' | 'draw';
  eloChange: number;
  opponentElo: number;
  opponentName: string;
  date: number;
  moves: number;
}

export interface PlayerStats {
  profile: PlayerProfile;
  games: GameResult[];
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  eloHistory: { date: number; elo: number }[];
  // Gamificación (opcional para mantener compatibilidad con datos antiguos)
  achievements?: Achievement[];
  streaks?: {
    win: number;
    bestWin: number;
  };
}

// Insignias / logros sencillos
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: number;
  // Información opcional (por ejemplo, jugada, rival, apertura, etc.)
  metadata?: Record<string, unknown>;
}

// Estado ligero del campeonato tipo suizo
export interface ChampionshipPlayer {
  id: string;
  name: string;
  emoji: string;
  elo: number;
  isUser: boolean;
  points: number;
  // Para desempates simples
  buchholz: number;
  // Historial para evitar emparejamientos repetidos
  opponents: string[];
}

export interface ChampionshipPairing {
  round: number;
  table: number;
  whiteId: string;
  blackId: string;
  // '1-0' | '0-1' | '1/2-1/2'
  result?: string;
}

export interface ChampionshipState {
  seasonId: string;
  currentRound: number;
  totalRounds: number;
  players: ChampionshipPlayer[];
  pairings: ChampionshipPairing[];
  // Id del jugador usuario para acceso rápido
  userId: string;
  startedAt: number;
  completed: boolean;
  // Color del usuario en la última ronda jugada ('w' | 'b'), para alternar
  lastUserColor?: 'w' | 'b';
}

export interface CustomBotFormData {
  name: string;
  difficulty: number;
  photo?: File;
  addToTournament: boolean;
}

export type GameMode =
  | 'menu'
  | 'game'
  | 'tournament'
  | 'championship'
  | 'custom-bots'
  | 'stats'
  | 'profile';

export interface GameState {
  fen: string;
  history: string[];
  isPlayerTurn: boolean;
  gameOver: boolean;
  result?: 'win' | 'loss' | 'draw' | null;
  opponent: Bot | null;
}

// Tipo para movimientos
export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}
