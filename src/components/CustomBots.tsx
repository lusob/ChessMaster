import { useState, useRef } from 'react';
import type { Bot, CustomBotFormData } from '@/types';
import { ChevronLeft, Plus, Trash2, Upload, Bot as BotIcon } from 'lucide-react';

interface CustomBotsProps {
  bots: Bot[];
  onAddBot: (bot: Omit<Bot, 'id' | 'isCustom'>) => void;
  onRemoveBot: (botId: string) => void;
  onBack: () => void;
  onSelectBot?: (bot: Bot) => void;
}

export function CustomBots({ 
  bots, 
  onAddBot, 
  onRemoveBot, 
  onBack,
  onSelectBot 
}: CustomBotsProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CustomBotFormData>({
    name: '',
    difficulty: 5,
    addToTournament: false,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customBots = bots.filter((b) => b.isCustom);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    // Calcular ELO basado en dificultad
    const elo = 400 + formData.difficulty * 200;

    const newBot: Omit<Bot, 'id' | 'isCustom'> = {
      name: formData.name.trim(),
      emoji: previewUrl ? '' : '🤖',
      difficulty: formData.difficulty,
      elo,
      description: `Bot personalizado nivel ${formData.difficulty}/10`,
      photoUrl: previewUrl || undefined,
      inTournament: formData.addToTournament,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    };

    onAddBot(newBot);
    
    // Reset form
    setFormData({ name: '', difficulty: 5, addToTournament: false });
    setPreviewUrl(null);
    setShowForm(false);
  };

  const handleRemove = (botId: string) => {
    if (confirm('¿Eliminar este bot personalizado?')) {
      onRemoveBot(botId);
    }
  };

  const getDifficultyLabel = (diff: number) => {
    if (diff <= 3) return 'Principiante';
    if (diff <= 6) return 'Intermedio';
    if (diff <= 8) return 'Avanzado';
    return 'Experto';
  };

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
          <div>
            <h2 className="text-2xl font-bold text-white">Bots Personalizados</h2>
            <p className="text-sm text-gray-400">Crea tus propios oponentes</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Lista de bots personalizados */}
      {customBots.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
            <BotIcon className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No tienes bots personalizados</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Crea tu primer bot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {customBots.map((bot) => (
            <div
              key={bot.id}
              className="p-4 bg-gray-800 rounded-xl flex items-center gap-4"
            >
              {/* Avatar */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl overflow-hidden"
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
                <h3 className="font-semibold text-white">{bot.name}</h3>
                <p className="text-sm text-gray-400">
                  {getDifficultyLabel(bot.difficulty)} • ELO {bot.elo}
                </p>
                {bot.inTournament && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mt-1 inline-block">
                    En torneo
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                {onSelectBot && (
                  <button
                    onClick={() => onSelectBot(bot)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white 
                               text-sm rounded-lg transition-colors"
                  >
                    Jugar
                  </button>
                )}
                <button
                  onClick={() => handleRemove(bot.id)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 
                             rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 
                        flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Crear Bot Personalizado</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Foto */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Foto del bot</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 mx-auto bg-gray-800 rounded-xl flex items-center justify-center
                             cursor-pointer hover:bg-gray-700 transition-colors overflow-hidden"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Mi Bot Superdotado"
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg 
                             focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength={20}
                />
              </div>

              {/* Dificultad */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Dificultad: {formData.difficulty}/10
                  <span className="ml-2 text-blue-400">
                    ({getDifficultyLabel(formData.difficulty)})
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={formData.difficulty}
                  onChange={(e) => setFormData((prev) => ({ 
                    ...prev, 
                    difficulty: parseInt(e.target.value) 
                  }))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Fácil</span>
                  <span>Difícil</span>
                </div>
              </div>

              {/* Checkbox torneo */}
              <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.addToTournament}
                  onChange={(e) => setFormData((prev) => ({ 
                    ...prev, 
                    addToTournament: e.target.checked 
                  }))}
                  className="w-5 h-5 accent-blue-500"
                />
                <span className="text-white">Añadir al torneo</span>
              </label>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setPreviewUrl(null);
                    setFormData({ name: '', difficulty: 5, addToTournament: false });
                  }}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white 
                             rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                             disabled:cursor-not-allowed text-white rounded-lg 
                             font-medium transition-colors"
                >
                  Crear Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
