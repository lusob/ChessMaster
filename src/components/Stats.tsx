import { useMemo, useState } from 'react';
import type { PlayerStats } from '@/types';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface StatsProps {
  stats: PlayerStats | null;
  onBack: () => void;
}

const PAGE_SIZE = 10;

export function Stats({ stats, onBack }: StatsProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss' | 'draw'>('all');

  const eloData = useMemo(() => {
    if (!stats?.eloHistory) return [];
    return stats.eloHistory.map((point, index) => ({
      index: index + 1,
      date: new Date(point.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      elo: point.elo,
    }));
  }, [stats?.eloHistory]);

  const resultsData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Victorias', value: stats.wins, color: '#22c55e' },
      { name: 'Derrotas', value: stats.losses, color: '#ef4444' },
      { name: 'Tablas', value: stats.draws, color: '#6b7280' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const winRate = useMemo(() => {
    if (!stats || stats.totalGames === 0) return 0;
    return Math.round((stats.wins / stats.totalGames) * 100);
  }, [stats]);

  const filteredGames = useMemo(() => {
    if (!stats?.games) return [];
    if (filterResult === 'all') return stats.games;
    return stats.games.filter((g) => g.result === filterResult);
  }, [stats?.games, filterResult]);

  const visibleGames = filteredGames.slice(0, visibleCount);
  const hasMore = visibleCount < filteredGames.length;

  if (!stats) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-400">No hay estadísticas disponibles</p>
          <p className="text-sm text-gray-500 mt-2">Juega algunas partidas primero</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
          <p className="text-sm text-gray-400">Tu progreso en el tablero</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
          <p className="text-xs text-gray-400">Victorias</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
          <p className="text-xs text-gray-400">Derrotas</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.draws}</p>
          <p className="text-xs text-gray-400">Tablas</p>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Win Rate</span>
          <span className="text-xl font-bold text-white">{winRate}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
            style={{ width: `${winRate}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{stats.totalGames} partidas jugadas</p>
      </div>

      {/* Gráfico de ELO */}
      {eloData.length > 1 && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Evolución del ELO
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eloData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line
                  type="monotone"
                  dataKey="elo"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico circular de resultados */}
      {resultsData.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-white mb-4">Distribución de Resultados</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resultsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {resultsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {resultsData.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial completo de partidas */}
      {stats.games.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-xl">
          {/* Cabecera con filtros */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-white">
              Historial de Partidas
              <span className="ml-2 text-xs text-gray-500 font-normal">({filteredGames.length})</span>
            </h3>
            <div className="flex gap-1">
              {(['all', 'win', 'loss', 'draw'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilterResult(f); setVisibleCount(PAGE_SIZE); }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filterResult === f
                      ? f === 'win' ? 'bg-green-600 text-white'
                        : f === 'loss' ? 'bg-red-600 text-white'
                        : f === 'draw' ? 'bg-gray-500 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'win' ? 'Victorias' : f === 'loss' ? 'Derrotas' : 'Tablas'}
                </button>
              ))}
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay partidas con este filtro</p>
          ) : (
            <>
              <div className="space-y-2">
                {visibleGames.map((game, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {game.result === 'win' && <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />}
                      {game.result === 'loss' && <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
                      {game.result === 'draw' && <Minus className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">vs {game.opponentName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{new Date(game.date).toLocaleDateString('es-ES')}</span>
                          <span>·</span>
                          <span>ELO rival: {game.opponentElo}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-semibold ${
                        game.result === 'win' ? 'text-green-400' :
                        game.result === 'loss' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : 'Tablas'}
                      </p>
                      <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                        <span className={game.eloChange > 0 ? 'text-green-400' : game.eloChange < 0 ? 'text-red-400' : 'text-gray-400'}>
                          {game.eloChange > 0 ? '+' : ''}{game.eloChange}
                        </span>
                        <span>·</span>
                        <span>{game.moves} mov</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ver más */}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="w-full mt-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Ver {Math.min(PAGE_SIZE, filteredGames.length - visibleCount)} más
                  <span className="text-gray-500 ml-1">({filteredGames.length - visibleCount} restantes)</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
