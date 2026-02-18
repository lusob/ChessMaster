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
}

export interface CustomBotFormData {
  name: string;
  difficulty: number;
  photo?: File;
  addToTournament: boolean;
}

export type GameMode = 'menu' | 'game' | 'tournament' | 'custom-bots' | 'stats' | 'profile';

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
