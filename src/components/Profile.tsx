import { useState, useRef } from 'react';
import type { Achievement, PlayerProfile } from '@/types';
import { ChevronLeft, User, Check, Crown, Star, Award, Camera, Edit2, X, Trash2, AlertTriangle } from 'lucide-react';

interface ProfileProps {
  profile: PlayerProfile | null;
  onCreateProfile: (name: string) => void;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onResetAllData: () => void;
  onBack: () => void;
  achievements?: Achievement[];
}

const RANK_INFO = (elo: number) => {
  if (elo < 500)  return { title: 'Novato',           color: 'text-gray-400',   bg: 'from-gray-600 to-gray-700' };
  if (elo < 800)  return { title: 'Aprendiz',          color: 'text-green-400',  bg: 'from-green-700 to-green-800' };
  if (elo < 1100) return { title: 'Jugador Casual',    color: 'text-blue-400',   bg: 'from-blue-700 to-blue-800' };
  if (elo < 1300) return { title: 'Competitivo',       color: 'text-purple-400', bg: 'from-purple-700 to-purple-800' };
  if (elo < 1500) return { title: 'Experto',           color: 'text-pink-400',   bg: 'from-pink-700 to-pink-800' };
  return           { title: 'Maestro',                 color: 'text-yellow-400', bg: 'from-yellow-600 to-orange-700' };
};

export function Profile({
  profile,
  onCreateProfile,
  onUpdateProfile,
  onResetAllData,
  onBack,
  achievements = [],
}: ProfileProps) {
  const [createName, setCreateName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name || '');
  const [editingElo, setEditingElo] = useState(false);
  const [eloValue, setEloValue] = useState(String(profile?.elo ?? 1000));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Crear perfil ──────────────────────────────────────────────────────────
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (createName.trim()) onCreateProfile(createName.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tu nombre</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ej: Magnus Carlsen"
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg
                         focus:ring-2 focus:ring-blue-500 outline-none text-center"
              maxLength={20}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!createName.trim()}
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateProfile({ avatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== profile.name) {
      onUpdateProfile({ name: trimmed });
    }
    setEditingName(false);
  };

  const handleSaveElo = () => {
    const parsed = parseInt(eloValue, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 3000 && parsed !== profile.elo) {
      onUpdateProfile({ elo: parsed });
    }
    setEditingElo(false);
  };

  const rank = RANK_INFO(profile.elo);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 pt-10 pb-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
        </div>

        {/* Avatar */}
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600
                            flex items-center justify-center shadow-2xl shadow-purple-500/30">
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-5xl font-black text-white">{profile.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            {/* Botón cámara */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-9 h-9 bg-blue-600 hover:bg-blue-500 rounded-xl
                         flex items-center justify-center shadow-lg transition-colors"
              title="Cambiar foto"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Nombre editable */}
          <div className="mt-4 flex items-center gap-2">
            {editingName ? (
              <>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="px-3 py-1.5 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-lg"
                  maxLength={20}
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
                  <Check className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-white">{profile.name}</h3>
                <button
                  onClick={() => { setNameValue(profile.name); setEditingName(true); }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Editar nombre"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </>
            )}
          </div>

          <p className="text-gray-500 text-xs mt-1">
            Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      {/* ELO + Rango */}
      <div className="px-4 pt-5">
        <div className="bg-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 font-medium">Puntuación ELO</p>
            {!editingElo && (
              <button
                onClick={() => { setEloValue(String(profile.elo)); setEditingElo(true); }}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Editar ELO"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-300" />
              </button>
            )}
          </div>

          {editingElo ? (
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                value={eloValue}
                onChange={(e) => setEloValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveElo(); if (e.key === 'Escape') setEditingElo(false); }}
                min={100}
                max={3000}
                className="flex-1 px-4 py-2 bg-gray-900 text-white text-2xl font-bold rounded-lg
                           focus:ring-2 focus:ring-blue-500 outline-none text-center"
                autoFocus
              />
              <button onClick={handleSaveElo} className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
                <Check className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setEditingElo(false)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <p className="text-5xl font-black text-white mb-3">{profile.elo}</p>
          )}

          <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r ${rank.bg}`}>
            <Crown className="w-4 h-4 text-white/80" />
            <span className="font-bold text-white text-sm">{rank.title}</span>
          </div>
        </div>
      </div>

      {/* Insignias */}
      <div className="px-4 pt-4 pb-2 flex-1">
        <div className="bg-gray-800 rounded-2xl p-4">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Insignias
            <span className="ml-auto text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
              {achievements.length}
            </span>
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
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                    <div className="w-10 h-10 bg-yellow-600/20 rounded-xl flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{a.title}</p>
                      <p className="text-xs text-gray-500 truncate">{a.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {new Date(a.earnedAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      {/* Zona de peligro */}
      <div className="px-4 pt-2 pb-8">
        <div className="border border-red-800/50 rounded-2xl p-4">
          <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Zona de peligro
          </h4>
          <p className="text-gray-500 text-xs mb-3">
            Borra todos tus datos: partidas, ELO, campeonatos, insignias y perfil. Esta acción es irreversible.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 border border-red-700 hover:bg-red-900/30 text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Borrar todos los datos
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-red-400 text-xs font-semibold text-center">¿Estás seguro? No hay vuelta atrás.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { onResetAllData(); onBack(); }}
                  className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sí, borrar todo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
