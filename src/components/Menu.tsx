import type { GameMode } from '@/types';
import { Trophy, Settings, BarChart3, User, ChevronRight, Swords, Crown } from 'lucide-react';

interface MenuProps {
  onSelectMode: (mode: GameMode) => void;
  playerName?: string;
  playerElo?: number;
  playerAvatar?: string;
}

const RANK_INFO = (elo: number) => {
  if (elo < 500)  return { title: 'Novato',              color: 'text-gray-400',   bg: 'from-gray-600 to-gray-700' };
  if (elo < 800)  return { title: 'Aprendiz',            color: 'text-green-400',  bg: 'from-green-700 to-green-800' };
  if (elo < 1100) return { title: 'Jugador Casual',      color: 'text-blue-400',   bg: 'from-blue-700 to-blue-800' };
  if (elo < 1300) return { title: 'Competitivo',         color: 'text-purple-400', bg: 'from-purple-700 to-purple-800' };
  if (elo < 1500) return { title: 'Experto',             color: 'text-pink-400',   bg: 'from-pink-700 to-pink-800' };
  return           { title: 'Maestro',                   color: 'text-yellow-400', bg: 'from-yellow-600 to-orange-700' };
};

export function Menu({ onSelectMode, playerName, playerElo, playerAvatar }: MenuProps) {
  const rank = RANK_INFO(playerElo ?? 0);

  const primaryItems = [
    {
      mode: 'game' as GameMode,
      title: 'Partida Rápida',
      description: 'Elige tu rival y juega ahora',
      icon: <Swords className="w-7 h-7" />,
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/30',
    },
    {
      mode: 'championship' as GameMode,
      title: 'Campeonato',
      description: '40 jugadores · 7 rondas · Sistema suizo',
      icon: <Trophy className="w-7 h-7" />,
      gradient: 'from-yellow-500 to-orange-500',
      glow: 'shadow-yellow-500/30',
    },
    {
      mode: 'tournament' as GameMode,
      title: 'Torneo Rápido',
      description: '4 bots en orden de dificultad',
      icon: <Crown className="w-7 h-7" />,
      gradient: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/30',
    },
  ];

  const secondaryItems = [
    { mode: 'custom-bots' as GameMode, title: 'Bots Personalizados', icon: <Settings className="w-5 h-5" />, color: 'text-purple-400' },
    { mode: 'stats' as GameMode,       title: 'Estadísticas',         icon: <BarChart3 className="w-5 h-5" />, color: 'text-green-400' },
    { mode: 'profile' as GameMode,     title: 'Mi Perfil',            icon: <User className="w-5 h-5" />,     color: 'text-pink-400' },
  ];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 pt-10 pb-8">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Logo + título */}
        <div className="relative text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/40 rotate-3">
            ♟️
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Chess Bot Arena</h1>
          <p className="text-gray-400 text-sm mt-1">Club de Ajedrez Siero</p>
        </div>

        {/* Card del jugador */}
        {playerName ? (
          <button
            onClick={() => onSelectMode('profile')}
            className="relative w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              {playerAvatar
                ? <img src={playerAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-white">{playerName.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white text-lg leading-tight">{playerName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold ${rank.color}`}>{rank.title}</span>
                <span className="text-gray-600">•</span>
                <span className="text-yellow-400 font-bold text-sm">{playerElo} ELO</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        ) : (
          <button
            onClick={() => onSelectMode('profile')}
            className="w-full bg-blue-600/20 border border-blue-500/40 rounded-2xl p-4 flex items-center gap-3 hover:bg-blue-600/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-blue-400 font-semibold text-sm">Crear tu perfil</p>
              <p className="text-gray-500 text-xs">Guarda tu progreso y ELO</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </div>

      {/* Modos principales */}
      <div className="px-4 pt-5 space-y-3">
        {primaryItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSelectMode(item.mode)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${item.gradient} shadow-lg ${item.glow} hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-left`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white shrink-0">
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-base">{item.title}</p>
              <p className="text-white/70 text-xs">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        ))}
      </div>

      {/* Modos secundarios */}
      <div className="px-4 pt-3 pb-6">
        <div className="grid grid-cols-3 gap-2">
          {secondaryItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => onSelectMode(item.mode)}
              className="flex flex-col items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all active:scale-[0.97] text-center"
            >
              <div className={`${item.color}`}>{item.icon}</div>
              <p className="text-gray-300 text-xs font-medium leading-tight">{item.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pb-6 text-center text-xs text-gray-600 px-4">
        <p>Hecho con ❤️ para los alumnos del club de ajedrez Siero</p>
      </div>
    </div>
  );
}
