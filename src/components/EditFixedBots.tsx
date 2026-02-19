import { useMemo, useState } from 'react';
import type { Bot } from '@/types';
import { RotateCcw, Save, X } from 'lucide-react';

interface EditFixedBotsProps {
  bots: Bot[];
  onClose: () => void;
  updateFixedBot: (botId: string, updates: Partial<Bot>) => void;
  resetFixedBots: () => void;
}

const FIXED_IDS = new Set(['bot-1', 'bot-2', 'bot-3', 'bot-4']);

export function EditFixedBots({ bots, onClose, updateFixedBot, resetFixedBots }: EditFixedBotsProps) {
  const fixedBots = useMemo(
    () => bots.filter((b) => !b.isCustom && FIXED_IDS.has(b.id)),
    [bots],
  );

  const [drafts, setDrafts] = useState(() =>
    fixedBots.map((b) => ({
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      elo: b.elo,
      difficulty: b.difficulty,
      description: b.description,
      color: b.color,
    })),
  );

  const handleSave = () => {
    for (const d of drafts) {
      updateFixedBot(d.id, {
        name: d.name,
        emoji: d.emoji,
        elo: d.elo,
        difficulty: d.difficulty,
        description: d.description,
        color: d.color,
      });
    }
    onClose();
  };

  const handleReset = () => {
    if (!confirm('¿Restaurar los 4 bots fijos a sus valores por defecto?')) return;
    resetFixedBots();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Editar bots del Torneo Rápido</h3>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          Cambia nombre, emoji, ELO y dificultad. Se guarda en tu navegador.
        </p>

        <div className="space-y-4">
          {drafts.map((d, idx) => (
            <div key={d.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: d.color }}>
                  {d.emoji || '🤖'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Bot #{idx + 1}</p>
                  <p className="text-xs text-gray-400">{d.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                  <input
                    value={d.name}
                    onChange={(e) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)))
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Emoji</label>
                  <input
                    value={d.emoji}
                    onChange={(e) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, emoji: e.target.value } : x)))
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ELO</label>
                  <input
                    type="number"
                    value={d.elo}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, elo: Math.max(100, parseInt(e.target.value || '0', 10)) } : x)),
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    min={100}
                    max={3000}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Dificultad: {d.difficulty}/10</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={d.difficulty}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, difficulty: parseInt(e.target.value, 10) } : x)),
                      )
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                  <input
                    value={d.description}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, description: e.target.value } : x)),
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={60}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={d.color}
                    onChange={(e) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, color: e.target.value } : x)))
                    }
                    className="w-full h-10 bg-gray-900 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

