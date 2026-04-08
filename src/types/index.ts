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
  historySan?: string[]; // Movimientos en notación SAN para replay
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
  // Si el campeonato fue creado en modo adaptativo (ELOs escalados al jugador)
  adaptive?: boolean;
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

// Jugador importado/creado manualmente para torneo personalizado
export interface CustomChampionshipPlayer {
  id: string;
  name: string;
  emoji: string;
  elo: number;
  club?: string;
}

// Una entrada en la lista de campeonatos del usuario
export interface CampeonatoEntry {
  id: string;               // Unique ID for this entry
  name: string;             // Display name
  type: 'siero' | 'custom'; // 'siero' = fixed 40-player Siero club, 'custom' = imported/manual
  adaptive?: boolean;       // Only for 'siero' type
  state: ChampionshipState | null; // null = not started yet / reset
  createdAt: number;
  sourceUrl?: string;       // info64 URL if imported
  // Stored so the championship can be restarted without re-importing
  initialOpponents?: CustomChampionshipPlayer[];
  initialTotalRounds?: number;
}

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
