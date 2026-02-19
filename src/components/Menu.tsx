import type { GameMode } from '@/types';
import { 
  User, 
  Trophy, 
  Bot, 
  BarChart3, 
  Settings,
  ChevronRight
} from 'lucide-react';

interface MenuProps {
  onSelectMode: (mode: GameMode) => void;
  playerName?: string;
  playerElo?: number;
}

interface MenuItem {
  mode: GameMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function Menu({ onSelectMode, playerName, playerElo }: MenuProps) {
  const menuItems: MenuItem[] = [
    {
      mode: 'game',
      title: 'Jugar contra Bot',
      description: 'Partida rápida contra la IA',
      icon: <Bot className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      mode: 'tournament',
      title: 'Torneo Rápido',
      description: 'Enfrenta a 4 bots en orden de dificultad',
      icon: <Trophy className="w-6 h-6" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    },
    {
      mode: 'championship',
      title: 'Campeonato',
      description: 'Sistema suizo: 40 jugadores, 7 rondas',
      icon: <Trophy className="w-6 h-6" />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      mode: 'custom-bots',
      title: 'Bots Personalizados',
      description: 'Crea y gestiona tus propios bots',
      icon: <Settings className="w-6 h-6" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      mode: 'stats',
      title: 'Estadísticas',
      description: 'Gráficos y análisis de tus partidas',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      mode: 'profile',
      title: 'Mi Perfil',
      description: 'Edita tu nombre y ver tu ELO',
      icon: <User className="w-6 h-6" />,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 
                        rounded-2xl flex items-center justify-center text-4xl shadow-lg">
          ♟️
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Chess Master</h1>
        <p className="text-gray-400">Domina el tablero</p>
        
        {playerName && (
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
            <span className="text-white font-medium">{playerName}</span>
            {playerElo !== undefined && (
              <span className="text-yellow-400 text-sm">{playerElo} ELO</span>
            )}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSelectMode(item.mode)}
            className="w-full flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-700 
                       rounded-xl transition-all duration-200 group text-left
                       active:scale-[0.98] touch-manipulation"
          >
            <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-xl 
                            flex items-center justify-center transition-transform
                            group-hover:scale-110`}>
              {item.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white 
                                     transition-colors" />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Desarrollado con chess.js, react-chessboard y Stockfish</p>
      </div>
    </div>
  );
}
