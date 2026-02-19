import { useMemo, useEffect } from 'react';
import type { Bot, ChampionshipState } from '@/types';
import { useChampionshipState } from '@/hooks/useStorage';
import {
  getUserPairingForRound,
  championshipPlayerToBot,
  isCurrentRoundComplete,
} from '@/lib/championship';
import { ChevronLeft, Trophy, Play, Users, Award, TrendingUp } from 'lucide-react';

interface ChampionshipProps {
  userProfile: { id: string; name: string; elo: number };
  onSelectBot: (bot: Bot) => void;
  onBack: () => void;
}

export function Championship({ userProfile, onSelectBot, onBack }: ChampionshipProps) {
  const {
    championship,
    isLoaded,
    startNew,
    reset,
    ensureCurrentRoundPairings,
    submitUserResultAndSimulateRound,
  } = useChampionshipState();

  // Asegurar que los emparejamientos de la ronda actual existan
  useEffect(() => {
    if (championship && !isCurrentRoundComplete(championship)) {
      ensureCurrentRoundPairings();
    }
  }, [championship, ensureCurrentRoundPairings]);

  const currentPairing = useMemo(() => {
    if (!championship) return null;
    return getUserPairingForRound(championship, championship.currentRound);
  }, [championship]);

  const opponentBot = useMemo(() => {
    if (!championship || !currentPairing) return null;
    const opponentId =
      currentPairing.whiteId === championship.userId
        ? currentPairing.blackId
        : currentPairing.whiteId;
    const opponent = championship.players.find((p) => p.id === opponentId);
    return opponent ? championshipPlayerToBot(opponent) : null;
  }, [championship, currentPairing]);

  const topStandings = useMemo(() => {
    if (!championship) return [];
    return [...championship.players]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        return b.elo - a.elo;
      })
      .slice(0, 10);
  }, [championship]);

  const userStanding = useMemo(() => {
    if (!championship) return null;
    return championship.players.find((p) => p.id === championship.userId);
  }, [championship]);

  const userTable = useMemo(() => {
    if (!championship || !currentPairing) return null;
    return currentPairing.table;
  }, [championship, currentPairing]);

  if (!isLoaded) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay campeonato activo, mostrar pantalla de inicio
  if (!championship) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Campeonato</h2>
            <p className="text-sm text-gray-400">Sistema suizo - 40 jugadores, 7 rondas</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl mb-6">
          <div className="text-center mb-4">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
            <h3 className="text-xl font-bold text-white mb-2">Modo Campeonato</h3>
            <p className="text-gray-400 text-sm">
              Compite contra 39 bots en un torneo tipo suizo de 7 rondas. Cada ronda te enfrentarás
              a un oponente de nivel similar según tu progreso.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Participantes</span>
              <span className="text-white font-medium">40 (39 bots + tú)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Rondas</span>
              <span className="text-white font-medium">7</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Sistema</span>
              <span className="text-white font-medium">Suizo</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => startNew(userProfile)}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Trophy className="w-5 h-5" />
          Iniciar Nuevo Campeonato
        </button>
      </div>
    );
  }

  // Si el campeonato está completado
  if (championship.completed) {
    const finalRanking = [...championship.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return b.elo - a.elo;
    });
    const userPosition = finalRanking.findIndex((p) => p.id === championship.userId) + 1;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Campeonato Completado</h2>
            <p className="text-sm text-gray-400">¡Felicidades por completar las 7 rondas!</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 p-6 rounded-2xl mb-6 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h3 className="text-2xl font-bold text-white mb-2">Posición Final</h3>
          <p className="text-4xl font-bold text-yellow-400 mb-2">#{userPosition}</p>
          <p className="text-gray-300">
            {userStanding?.points} puntos • Buchholz: {userStanding?.buchholz.toFixed(1)}
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Top 10 Final
          </h4>
          <div className="space-y-2">
            {finalRanking.slice(0, 10).map((player, idx) => {
              const isUser = player.id === championship.userId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'
                  }`}
                >
                  <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                  <span className="text-xl">{player.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isUser ? 'text-yellow-400' : 'text-white'}`}>
                      {player.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {player.points} pts • ELO {player.elo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            reset();
          }}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Iniciar Nuevo Campeonato
        </button>
      </div>
    );
  }

  // Pantalla de ronda activa
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
          <h2 className="text-2xl font-bold text-white">Campeonato</h2>
          <p className="text-sm text-gray-400">
            Ronda {championship.currentRound} de {championship.totalRounds}
          </p>
        </div>
      </div>

      {/* Progreso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progreso del Campeonato</span>
          <span>
            {championship.currentRound - 1} / {championship.totalRounds} rondas
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
            style={{
              width: `${((championship.currentRound - 1) / championship.totalRounds) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Tu partida */}
      {opponentBot && currentPairing && (
        <div className="bg-gray-800 p-6 rounded-2xl mb-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            Tu Partida
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gray-700">
                {opponentBot.emoji}
              </div>
              <div>
                <p className="font-semibold text-white">{opponentBot.name}</p>
                <p className="text-xs text-gray-400">ELO {opponentBot.elo} • Mesa {userTable}</p>
              </div>
            </div>
            <button
              onClick={() => onSelectBot(opponentBot)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Jugar
            </button>
          </div>
        </div>
      )}

      {/* Tu posición */}
      {userStanding && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Tu Posición
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">
                #{topStandings.findIndex((p) => p.id === userStanding.id) + 1 || '?'}
              </p>
              <p className="text-sm text-gray-400">
                {userStanding.points} puntos • Buchholz {userStanding.buchholz.toFixed(1)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">ELO</p>
              <p className="text-xl font-bold text-white">{userStanding.elo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top 5 Clasificación
        </h4>
        <div className="space-y-2">
          {topStandings.slice(0, 5).map((player, idx) => {
            const isUser = player.id === championship.userId;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'
                }`}
              >
                <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                <span className="text-xl">{player.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isUser ? 'text-yellow-400' : 'text-white'}`}>
                    {player.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {player.points} pts • ELO {player.elo}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón reset (opcional) */}
      <button
        onClick={() => {
          if (confirm('¿Estás seguro de reiniciar el campeonato? Se perderá todo el progreso.')) {
            reset();
          }
        }}
        className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors"
      >
        Reiniciar Campeonato
      </button>
    </div>
  );
}
