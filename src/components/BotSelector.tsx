import { useState } from 'react';
import type { Bot } from '@/types';
import { ChevronLeft, Play, Star, Filter, Zap } from 'lucide-react';

interface BotSelectorProps {
  bots: Bot[];
  playerElo?: number;
  onSelectBot: (bot: Bot, adaptive: boolean) => void;
  onBack: () => void;
}

export function BotSelector({ bots, playerElo = 1000, onSelectBot, onBack }: BotSelectorProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [adaptive, setAdaptive] = useState(false);

  // Filtrar bots
  const filteredBots = bots.filter((bot) => {
    if (difficultyFilter === null) return true;
    if (difficultyFilter === 1) return bot.difficulty <= 3;
    if (difficultyFilter === 2) return bot.difficulty > 3 && bot.difficulty <= 6;
    if (difficultyFilter === 3) return bot.difficulty > 6;
    return true;
  });

  const handleSelectBot = (bot: Bot) => {
    setSelectedBot(bot);
  };

  const handleStartGame = () => {
    if (selectedBot) {
      onSelectBot(selectedBot, adaptive);
    }
  };

  // ELO efectivo del bot seleccionado en modo adaptativo
  const effectiveEloPreview = (bot: Bot) => {
    if (!adaptive) return bot.elo;
    const diff = playerElo - bot.elo;
    const adjustment = Math.round(Math.max(-2, Math.min(2, diff / 200)));
    const effDiff = Math.max(1, Math.min(10, bot.difficulty + adjustment));
    return Math.round(100 + (effDiff - 1) * (1400 / 9));
  };

  const getDifficultyLabel = (diff: number) => {
    if (diff <= 3) return { label: 'Fácil', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (diff <= 6) return { label: 'Medio', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { label: 'Difícil', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Jugar contra Bot</h2>
          <p className="text-sm text-gray-400">Selecciona tu oponente</p>
        </div>
      </div>

      {/* Toggle adaptativo */}
      <button
        onClick={() => setAdaptive((v) => !v)}
        className={`w-full flex items-center justify-between p-3 rounded-xl mb-4 transition-colors border ${
          adaptive
            ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
            : 'bg-gray-800 border-gray-700 text-gray-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${adaptive ? 'text-purple-400' : 'text-gray-500'}`} />
          <div className="text-left">
            <p className={`text-sm font-semibold ${adaptive ? 'text-purple-200' : 'text-gray-300'}`}>
              Modo adaptativo
            </p>
            <p className="text-xs text-gray-500">
              {adaptive
                ? `El bot ajusta su fuerza a tu ELO (${playerElo})`
                : 'El bot juega con su dificultad fija'}
            </p>
          </div>
        </div>
        <div className={`w-10 h-5 rounded-full transition-colors relative ${adaptive ? 'bg-purple-500' : 'bg-gray-600'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${adaptive ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
      </button>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <button
          onClick={() => setDifficultyFilter(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                     transition-colors ${
                       difficultyFilter === null
                         ? 'bg-blue-600 text-white'
                         : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                     }`}
        >
          Todos
        </button>
        <button
          onClick={() => setDifficultyFilter(1)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                     transition-colors ${
                       difficultyFilter === 1
                         ? 'bg-green-600 text-white'
                         : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                     }`}
        >
          Fácil
        </button>
        <button
          onClick={() => setDifficultyFilter(2)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                     transition-colors ${
                       difficultyFilter === 2
                         ? 'bg-yellow-600 text-white'
                         : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                     }`}
        >
          Medio
        </button>
        <button
          onClick={() => setDifficultyFilter(3)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                     transition-colors ${
                       difficultyFilter === 3
                         ? 'bg-red-600 text-white'
                         : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                     }`}
        >
          Difícil
        </button>
      </div>

      {/* Lista de bots */}
      <div className="space-y-3">
        {filteredBots.map((bot) => {
          const diffInfo = getDifficultyLabel(bot.difficulty);
          const isSelected = selectedBot?.id === bot.id;

          return (
            <button
              key={bot.id}
              onClick={() => handleSelectBot(bot)}
              className={`w-full p-4 rounded-xl transition-all duration-200 text-left
                         ${isSelected 
                           ? 'bg-blue-600 ring-2 ring-blue-400' 
                           : 'bg-gray-800 hover:bg-gray-700'
                         }
                         active:scale-[0.98] touch-manipulation
              `}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl overflow-hidden"
                  style={{ backgroundColor: bot.color }}
                >
                  {bot.photoUrl ? (
                    <img src={bot.photoUrl} alt={bot.name} className="w-full h-full object-cover" />
                  ) : (
                    bot.emoji
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{bot.name}</h3>
                    {bot.isCustom && (
                      <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-1">{bot.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${diffInfo.bg} ${diffInfo.color} px-2 py-0.5 rounded`}>
                      {diffInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      ELO {effectiveEloPreview(bot)}
                      {adaptive && effectiveEloPreview(bot) !== bot.elo && (
                        <span className="text-gray-600"> (base {bot.elo})</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Estrellas de dificultad */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex">
                    {[...Array(10)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${
                          i < bot.difficulty 
                            ? 'text-yellow-400 fill-yellow-400' 
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Botón de jugar */}
      {selectedBot && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 
                       hover:from-green-500 hover:to-green-600
                       text-white font-bold rounded-xl shadow-lg
                       flex items-center justify-center gap-2
                       active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5" />
            ¡Jugar contra {selectedBot.name}!
          </button>
        </div>
      )}

      {/* Spacer para el botón fijo */}
      {selectedBot && <div className="h-20" />}
    </div>
  );
}
