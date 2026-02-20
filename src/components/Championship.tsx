import { useMemo, useEffect, useState } from 'react';
import type { Bot } from '@/types';
import { useChampionshipState } from '@/hooks/useStorage';
import {
  getUserPairingForRound,
  championshipPlayerToBot,
  isCurrentRoundComplete,
} from '@/lib/championship';
import { ChevronLeft, Trophy, Play, Award, TrendingUp, List, BarChart2 } from 'lucide-react';

interface ChampionshipProps {
  userProfile: { id: string; name: string; elo: number; createdAt: number };
  onSelectBot: (bot: Bot) => void;
  onBack: () => void;
}

type ActiveTab = 'partida' | 'clasificacion' | 'historial';

// Animación de podio al finalizar
function PodiumAnimation({ players, userId }: { players: { id: string; name: string; emoji: string; points: number; buchholz: number; elo: number }[]; userId: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1500),
      setTimeout(() => setStep(4), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const top3 = players.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const heights = ['h-32', 'h-24', 'h-20'];
  const colors = [
    'from-yellow-500 to-yellow-600',
    'from-gray-300 to-gray-400',
    'from-amber-600 to-amber-700',
  ];
  // Orden visual del podio: 2º izquierda, 1º centro, 3º derecha
  const podiumOrder = [1, 0, 2];

  return (
    <div className="text-center mb-6">
      <div
        className="text-4xl mb-2 transition-all duration-500"
        style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'scale(1)' : 'scale(0.5)' }}
      >
        🏆
      </div>
      <h3
        className="text-2xl font-bold text-white mb-1 transition-all duration-500"
        style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'translateY(0)' : 'translateY(-20px)' }}
      >
        ¡Campeonato Finalizado!
      </h3>
      <p
        className="text-gray-400 text-sm mb-6 transition-all duration-500"
        style={{ opacity: step >= 1 ? 1 : 0 }}
      >
        Club de Ajedrez Siero
      </p>

      {/* Podio */}
      <div className="flex items-end justify-center gap-2 mb-6 px-4">
        {podiumOrder.map((rankIdx, visualPos) => {
          const player = top3[rankIdx];
          if (!player) return null;
          const isUser = player.id === userId;
          const show = step >= visualPos + 2;
          return (
            <div
              key={player.id}
              className="flex flex-col items-center flex-1 max-w-[110px] transition-all duration-700"
              style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(60px)' }}
            >
              <div className="text-3xl mb-1">{medals[rankIdx]}</div>
              <div
                className={`text-3xl mb-1 transition-all duration-300 ${show ? 'animate-bounce' : ''}`}
                style={{ animationIterationCount: 3 }}
              >
                {player.emoji}
              </div>
              <p className={`text-xs font-bold mb-2 text-center leading-tight ${isUser ? 'text-yellow-400' : 'text-white'}`}>
                {player.name}
              </p>
              <div
                className={`w-full rounded-t-lg bg-gradient-to-b ${colors[rankIdx]} flex items-center justify-center ${heights[rankIdx]}`}
              >
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{rankIdx + 1}º</p>
                  <p className="text-white/80 text-xs">{player.points} pts</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confeti CSS */}
      {step >= 4 && (
        <div className="relative h-8 mb-2 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 w-2 h-2 rounded-sm"
              style={{
                left: `${8 + i * 7.5}%`,
                backgroundColor: ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'][i % 6],
                animation: `fall ${0.8 + (i % 4) * 0.2}s ease-in forwards`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(40px) rotate(180deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function Championship({ userProfile, onSelectBot, onBack }: ChampionshipProps) {
  const {
    championship,
    isLoaded,
    startNew,
    reset,
    ensureCurrentRoundPairings,
  } = useChampionshipState();

  const [activeTab, setActiveTab] = useState<ActiveTab>('partida');
  const [historyRound, setHistoryRound] = useState(1);

  // Asegurar que los emparejamientos de la ronda actual existan
  useEffect(() => {
    if (championship && !isCurrentRoundComplete(championship)) {
      ensureCurrentRoundPairings();
    }
  }, [championship, ensureCurrentRoundPairings]);

  // Resetear tab al volver
  useEffect(() => {
    setActiveTab('partida');
  }, [championship?.currentRound]);

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

  const fullRanking = useMemo(() => {
    if (!championship) return [];
    return [...championship.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return b.elo - a.elo;
    });
  }, [championship]);

  const userStanding = useMemo(() => {
    if (!championship) return null;
    return championship.players.find((p) => p.id === championship.userId);
  }, [championship]);

  const userRank = useMemo(() => {
    if (!championship || !userStanding) return null;
    return fullRanking.findIndex((p) => p.id === championship.userId) + 1;
  }, [fullRanking, championship, userStanding]);

  const userTable = useMemo(() => {
    if (!championship || !currentPairing) return null;
    return currentPairing.table;
  }, [championship, currentPairing]);

  // Historial de rondas jugadas (con resultado del usuario)
  const roundHistory = useMemo(() => {
    if (!championship) return [];
    const rounds = [];
    for (let r = 1; r < championship.currentRound; r++) {
      const pairing = getUserPairingForRound(championship, r);
      if (!pairing || !pairing.result) continue;
      const isWhite = pairing.whiteId === championship.userId;
      const opponentId = isWhite ? pairing.blackId : pairing.whiteId;
      const opponent = championship.players.find((p) => p.id === opponentId);
      let result: 'win' | 'loss' | 'draw';
      if (pairing.result === '1/2-1/2') result = 'draw';
      else if ((pairing.result === '1-0' && isWhite) || (pairing.result === '0-1' && !isWhite)) result = 'win';
      else result = 'loss';
      rounds.push({ round: r, opponent, result, pairing });
    }
    return rounds;
  }, [championship]);

  // Resultados de todas las partidas de una ronda
  const roundPairings = useMemo(() => {
    if (!championship) return [];
    return championship.pairings
      .filter((p) => p.round === historyRound && p.result)
      .map((p) => {
        const white = championship.players.find((pl) => pl.id === p.whiteId);
        const black = championship.players.find((pl) => pl.id === p.blackId);
        return { pairing: p, white, black };
      });
  }, [championship, historyRound]);

  // Stats del usuario
  const userStats = useMemo(() => {
    if (!championship) return null;
    const wins = roundHistory.filter((r) => r.result === 'win').length;
    const losses = roundHistory.filter((r) => r.result === 'loss').length;
    const draws = roundHistory.filter((r) => r.result === 'draw').length;
    return { wins, losses, draws, played: roundHistory.length };
  }, [roundHistory]);

  if (!isLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Sin campeonato activo
  if (!championship) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
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
              Torneo suizo de 7 rondas al estilo del Campeonato de Asturias. 40 jugadores
              repartidos en tres grupos: Debutantes, Intermedios y Avanzados.
            </p>
          </div>
          <div className="space-y-2 mt-6">
            {[
              ['Participantes', '40 (39 bots + tú)', 'text-white'],
              ['Rondas', '7', 'text-white'],
              ['Sistema', 'Suizo', 'text-white'],
              ['😅 Debutantes', 'ELO 100–499', 'text-green-400'],
              ['🧐 Intermedios', 'ELO 500–899', 'text-yellow-400'],
              ['🏆 Avanzados', 'ELO 900–1500', 'text-red-400'],
            ].map(([label, value, cls]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={`font-medium ${cls}`}>{value}</span>
              </div>
            ))}
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

  // Campeonato completado — pantalla con podio animado
  if (championship.completed) {
    const userPosition = fullRanking.findIndex((p) => p.id === championship.userId) + 1;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Resultado Final</h2>
            <p className="text-sm text-gray-400">Club de Ajedrez Siero</p>
          </div>
        </div>

        <PodiumAnimation players={fullRanking} userId={championship.userId} />

        {/* Tu resultado */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 p-4 rounded-2xl mb-4 text-center">
          <p className="text-gray-400 text-sm mb-1">Tu posición final</p>
          <p className="text-5xl font-bold text-yellow-400 mb-1">#{userPosition}</p>
          <p className="text-gray-300 text-sm">
            {userStanding?.points} puntos • Buchholz: {userStanding?.buchholz.toFixed(1)}
          </p>
        </div>

        {/* Top 10 */}
        <div className="bg-gray-800 p-4 rounded-xl mb-4">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Clasificación Final
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {fullRanking.map((player, idx) => {
              const isUser = player.id === championship.userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'
                  }`}
                >
                  <span className="font-bold text-gray-400 w-7 text-xs">
                    {medal ?? `#${idx + 1}`}
                  </span>
                  <span className="text-lg">{player.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isUser ? 'text-yellow-400' : 'text-white'}`}>
                      {player.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">{player.points} pts</p>
                    <p className="text-xs text-gray-500">BH {player.buchholz.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Nuevo Campeonato
        </button>
      </div>
    );
  }

  // Ronda activa — con tabs
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Campeonato</h2>
          <p className="text-sm text-gray-400">
            Ronda {championship.currentRound} de {championship.totalRounds}
          </p>
        </div>
        {userRank && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Tu posición</p>
            <p className="text-xl font-bold text-yellow-400">#{userRank}</p>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
            style={{ width: `${((championship.currentRound - 1) / championship.totalRounds) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{championship.currentRound - 1} rondas completadas</span>
          <span>{championship.totalRounds - (championship.currentRound - 1)} restantes</span>
        </div>
      </div>

      {/* Stats rápidas */}
      {userStats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Jugadas', value: userStats.played, color: 'text-white' },
            { label: 'Victorias', value: userStats.wins, color: 'text-green-400' },
            { label: 'Derrotas', value: userStats.losses, color: 'text-red-400' },
            { label: 'Tablas', value: userStats.draws, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        {([
          { id: 'partida', label: 'Tu partida', icon: <Play className="w-3 h-3" /> },
          { id: 'clasificacion', label: 'Clasificación', icon: <TrendingUp className="w-3 h-3" /> },
          { id: 'historial', label: 'Historial', icon: <List className="w-3 h-3" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Tu partida */}
      {activeTab === 'partida' && (
        <div className="space-y-4">
          {opponentBot && currentPairing ? (
            <div className="bg-gray-800 p-5 rounded-2xl">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
                <Play className="w-4 h-4 text-blue-400" />
                Ronda {championship.currentRound} — Mesa {userTable}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gray-700">
                    {opponentBot.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{opponentBot.name}</p>
                    <p className="text-sm text-gray-400">ELO {opponentBot.elo}</p>
                    <p className="text-xs text-gray-500">
                      {opponentBot.elo < 500 ? '😅 Debutante' : opponentBot.elo < 900 ? '🧐 Intermedio' : '🏆 Avanzado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectBot(opponentBot)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Jugar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-5 rounded-2xl text-center text-gray-400">
              <p>No hay partida asignada para esta ronda.</p>
            </div>
          )}

          {/* Historial de mis partidas (resumen) */}
          {roundHistory.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Mis partidas</h4>
              <div className="space-y-2">
                {roundHistory.map(({ round, opponent, result }) => (
                  <div key={round} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-16 text-xs">Ronda {round}</span>
                    <span className="text-lg">{opponent?.emoji ?? '?'}</span>
                    <span className="flex-1 text-white truncate">{opponent?.name ?? 'Desconocido'}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                      result === 'win' ? 'bg-green-700 text-green-200' :
                      result === 'loss' ? 'bg-red-800 text-red-200' :
                      'bg-yellow-700 text-yellow-200'
                    }`}>
                      {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Tablas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Clasificación */}
      {activeTab === 'clasificacion' && (
        <div className="bg-gray-800 p-4 rounded-xl">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            Clasificación general
          </h4>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {fullRanking.map((player, idx) => {
              const isUser = player.id === championship.userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'
                  }`}
                >
                  <span className="font-bold text-gray-400 w-7 text-xs shrink-0">
                    {medal ?? `#${idx + 1}`}
                  </span>
                  <span className="text-base shrink-0">{player.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate text-xs ${isUser ? 'text-yellow-400' : 'text-white'}`}>
                      {player.name}
                    </p>
                    <p className="text-xs text-gray-500">ELO {player.elo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white text-sm">{player.points} pts</p>
                    <p className="text-xs text-gray-500">BH {player.buchholz.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Historial de rondas */}
      {activeTab === 'historial' && (
        <div className="space-y-3">
          {/* Selector de ronda */}
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: championship.currentRound - 1 }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                onClick={() => setHistoryRound(r)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  historyRound === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                R{r}
              </button>
            ))}
          </div>

          {championship.currentRound <= 1 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">
              Aún no hay rondas completadas.
            </div>
          ) : roundPairings.length === 0 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">
              Sin resultados para esta ronda.
            </div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Resultados — Ronda {historyRound}
              </h4>
              <div className="space-y-2">
                {roundPairings
                  .sort((a, b) => a.pairing.table - b.pairing.table)
                  .map(({ pairing, white, black }) => {
                    const isUserPairing =
                      pairing.whiteId === championship.userId || pairing.blackId === championship.userId;
                    return (
                      <div
                        key={pairing.table}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                          isUserPairing ? 'bg-blue-900/30 border border-blue-500/40' : 'bg-gray-900/50'
                        }`}
                      >
                        <span className="text-gray-500 w-8 shrink-0">M{pairing.table}</span>
                        <span className={`flex-1 text-right truncate font-medium ${
                          pairing.result === '1-0' ? 'text-green-400' : pairing.result === '1/2-1/2' ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {white?.emoji} {white?.name}
                        </span>
                        <span className="text-gray-400 font-bold shrink-0 px-1">
                          {pairing.result === '1-0' ? '1 – 0' : pairing.result === '0-1' ? '0 – 1' : '½ – ½'}
                        </span>
                        <span className={`flex-1 truncate font-medium ${
                          pairing.result === '0-1' ? 'text-green-400' : pairing.result === '1/2-1/2' ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {black?.emoji} {black?.name}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón reset */}
      <button
        onClick={() => {
          if (confirm('¿Reiniciar el campeonato? Se perderá todo el progreso.')) reset();
        }}
        className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
      >
        Reiniciar Campeonato
      </button>
    </div>
  );
}
