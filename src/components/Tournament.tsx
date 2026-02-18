import { useState } from 'react';
import type { Bot } from '@/types';
import { ChevronLeft, Lock, Check, Trophy, Star } from 'lucide-react';

interface TournamentProps {
  bots: Bot[];
  onSelectBot: (bot: Bot) => void;
  onBack: () => void;
  completedBots?: string[];
  currentBotIndex?: number;
}

export function Tournament({ 
  bots, 
  onSelectBot, 
  onBack,
  completedBots = [],
  currentBotIndex = 0
}: TournamentProps) {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  // Filtrar solo bots del torneo y ordenar por dificultad
  const tournamentBots = bots
    .filter((b) => b.inTournament)
    .sort((a, b) => a.difficulty - b.difficulty);

  const handleSelectBot = (bot: Bot, index: number) => {
    if (index > currentBotIndex) return; // Bloquear bots futuros
    setSelectedBot(bot);
  };

  const handleStartGame = () => {
    if (selectedBot) {
      onSelectBot(selectedBot);
    }
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
          <h2 className="text-2xl font-bold text-white">Modo Torneo</h2>
          <p className="text-sm text-gray-400">Derrota a todos los bots en orden</p>
        </div>
      </div>

      {/* Progreso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progreso</span>
          <span>{completedBots.length} / {tournamentBots.length}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
            style={{ width: `${(completedBots.length / tournamentBots.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Lista de bots */}
      <div className="space-y-3">
        {tournamentBots.map((bot, index) => {
          const isCompleted = completedBots.includes(bot.id);
          const isCurrent = index === currentBotIndex;
          const isLocked = index > currentBotIndex;
          const isSelected = selectedBot?.id === bot.id;

          return (
            <button
              key={bot.id}
              onClick={() => handleSelectBot(bot, index)}
              disabled={isLocked}
              className={`w-full p-4 rounded-xl transition-all duration-200 text-left
                         ${isSelected 
                           ? 'bg-blue-600 ring-2 ring-blue-400' 
                           : isCompleted
                             ? 'bg-green-900/30 border border-green-600/50'
                             : isCurrent
                               ? 'bg-gray-700 ring-1 ring-yellow-500/50'
                               : 'bg-gray-800 opacity-60'
                         }
                         ${!isLocked && 'hover:bg-gray-700 active:scale-[0.98]'}
                         touch-manipulation
              `}
            >
              <div className="flex items-center gap-4">
                {/* Emoji / Estado */}
                <div 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                             ${isCompleted ? 'bg-green-600' : 
                               isCurrent ? 'bg-yellow-600' : 'bg-gray-600'}`}
                  style={{ backgroundColor: isCompleted ? undefined : bot.color }}
                >
                  {isCompleted ? <Check className="w-6 h-6 text-white" /> : bot.emoji}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{bot.name}</h3>
                    {isCompleted && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  </div>
                  <p className="text-sm text-gray-400">{bot.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs bg-gray-900/50 px-2 py-0.5 rounded text-gray-300">
                      ELO {bot.elo}
                    </span>
                    <span className="text-xs bg-gray-900/50 px-2 py-0.5 rounded text-gray-300">
                      Dif {bot.difficulty}/10
                    </span>
                  </div>
                </div>

                {/* Lock / Number */}
                <div className="text-right">
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-gray-500" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-600">
                      #{index + 1}
                    </span>
                  )}
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
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 
                       hover:from-blue-500 hover:to-blue-600
                       text-white font-bold rounded-xl shadow-lg
                       flex items-center justify-center gap-2
                       active:scale-[0.98] transition-all"
          >
            <Trophy className="w-5 h-5" />
            ¡Retar a {selectedBot.name}!
          </button>
        </div>
      )}

      {/* Spacer para el botón fijo */}
      {selectedBot && <div className="h-20" />}
    </div>
  );
}
