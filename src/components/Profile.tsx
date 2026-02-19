import { useState } from 'react';
import type { Achievement, PlayerProfile } from '@/types';
import { ChevronLeft, User, Edit2, Check, Crown, Star, Award } from 'lucide-react';

interface ProfileProps {
  profile: PlayerProfile | null;
  onCreateProfile: (name: string) => void;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onBack: () => void;
  achievements?: Achievement[];
}

export function Profile({ 
  profile, 
  onCreateProfile, 
  onUpdateProfile,
  onBack,
  achievements = [],
}: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProfile(name.trim());
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name !== profile?.name) {
      onUpdateProfile({ name: name.trim() });
    }
    setIsEditing(false);
  };

  const getRankTitle = (elo: number) => {
    if (elo < 800) return 'Novato';
    if (elo < 1000) return 'Aprendiz';
    if (elo < 1200) return 'Jugador Casual';
    if (elo < 1400) return 'Jugador Competitivo';
    if (elo < 1600) return 'Experto';
    if (elo < 1800) return 'Maestro';
    if (elo < 2000) return 'Gran Maestro';
    return 'Leyenda';
  };

  const getRankColor = (elo: number) => {
    if (elo < 800) return 'text-gray-400';
    if (elo < 1000) return 'text-green-400';
    if (elo < 1200) return 'text-blue-400';
    if (elo < 1400) return 'text-purple-400';
    if (elo < 1600) return 'text-pink-400';
    if (elo < 1800) return 'text-orange-400';
    if (elo < 2000) return 'text-yellow-400';
    return 'text-amber-400';
  };

  // Si no hay perfil, mostrar formulario de creación
  if (!profile) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-bold text-white">Crear Perfil</h2>
        </div>

        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 
                          rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
          <p className="text-gray-400">Crea tu perfil para guardar tu progreso</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tu nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Magnus Carlsen"
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg 
                         focus:ring-2 focus:ring-blue-500 outline-none text-center"
              maxLength={20}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                       disabled:cursor-not-allowed text-white rounded-lg 
                       font-medium transition-colors"
          >
            Crear Perfil
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setName(profile.name);
              setIsEditing(true);
            }}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Avatar y nombre */}
      <div className="text-center mb-8">
        <div className="w-28 h-28 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 
                        rounded-full flex items-center justify-center text-4xl shadow-lg">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        
        {isEditing ? (
          <form onSubmit={handleUpdate} className="flex items-center justify-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg 
                         focus:ring-2 focus:ring-blue-500 outline-none text-center"
              maxLength={20}
              autoFocus
            />
            <button
              type="submit"
              className="p-2 bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </form>
        ) : (
          <h3 className="text-xl font-bold text-white">{profile.name}</h3>
        )}
        
        <p className="text-sm text-gray-400 mt-1">
          Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-ES')}
        </p>
      </div>

      {/* ELO y Rango */}
      <div className="bg-gray-800 p-6 rounded-2xl mb-6">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-400 mb-1">Puntuación ELO</p>
          <p className="text-5xl font-bold text-white">{profile.elo}</p>
        </div>
        
        <div className="flex items-center justify-center gap-2 py-3 bg-gray-900/50 rounded-xl">
          <Crown className={`w-5 h-5 ${getRankColor(profile.elo)}`} />
          <span className={`font-semibold ${getRankColor(profile.elo)}`}>
            {getRankTitle(profile.elo)}
          </span>
        </div>
      </div>

      {/* Logros */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          Insignias
          <span className="ml-auto text-xs text-gray-400">{achievements.length}</span>
        </h4>
        
        {achievements.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-900/50 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">Aún no has desbloqueado insignias</p>
            <p className="text-gray-500 text-xs mt-1">¡Juega partidas y completa retos!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {achievements
              .slice()
              .sort((a, b) => b.earnedAt - a.earnedAt)
              .map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {new Date(a.earnedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
