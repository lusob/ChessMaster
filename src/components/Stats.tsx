import { useMemo } from 'react';
import type { PlayerStats } from '@/types';
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

export function Stats({ stats, onBack }: StatsProps) {
  const eloData = useMemo(() => {
    if (!stats?.eloHistory) return [];
    
    return stats.eloHistory.map((point, index) => ({
      index: index + 1,
      date: new Date(point.date).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      }),
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

  const recentGames = useMemo(() => {
    if (!stats?.games) return [];
    return stats.games.slice(0, 10);
  }, [stats?.games]);

  if (!stats) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
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
        <button
          onClick={onBack}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
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
        <p className="text-xs text-gray-500 mt-2">
          {stats.totalGames} partidas jugadas
        </p>
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
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none',
                    borderRadius: '8px'
                  }}
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
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {resultsData.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial reciente */}
      {recentGames.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="font-semibold text-white mb-4">Partidas Recientes</h3>
          <div className="space-y-2">
            {recentGames.map((game, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {game.result === 'win' && (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                  {game.result === 'loss' && (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  {game.result === 'draw' && (
                    <Minus className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm text-white">vs {game.opponentName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(game.date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    game.eloChange > 0 ? 'text-green-400' : 
                    game.eloChange < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {game.eloChange > 0 ? '+' : ''}{game.eloChange}
                  </p>
                  <p className="text-xs text-gray-500">{game.moves} movs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
