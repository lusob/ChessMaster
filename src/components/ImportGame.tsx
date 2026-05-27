import { useState } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, Upload } from 'lucide-react';
import type { Bot } from '@/types';

interface ImportGameProps {
  bots: Bot[];
  onBack: () => void;
  onStartGame: (moves: string[], bot: Bot, playerColor: 'w' | 'b') => void;
}

function parseMoves(text: string): string[] | null {
  try {
    const chess = new Chess();
    const cleaned = text
      .replace(/\[.*?\]/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\$\d+/g, '')
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .trim();
    const tokens = cleaned
      .split(/\s+/)
      .filter(t => t && !/^\d+\.+$/.test(t));
    for (const san of tokens) {
      if (!chess.move(san)) return null;
    }
    return chess.history();
  } catch {
    return null;
  }
}

export function ImportGame({ bots, onBack, onStartGame }: ImportGameProps) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [parsedMoves, setParsedMoves] = useState<string[] | null>(null);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');

  const handleLoad = () => {
    const moves = parseMoves(importText);
    if (!moves || moves.length === 0) {
      setImportError('No se pudieron interpretar los movimientos. Usa notación SAN o PGN estándar.');
      setParsedMoves(null);
      return;
    }
    setImportError('');
    setParsedMoves(moves);
  };

  const handleStart = () => {
    if (!parsedMoves || !selectedBot) return;
    onStartGame(parsedMoves, selectedBot, playerColor);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Importar Partida</h2>
          <p className="text-sm text-gray-400">Pega movimientos y juega desde cualquier posición</p>
        </div>
      </div>

      {/* Textarea */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-400 mb-2">
          Movimientos en notación SAN (ej: <span className="font-mono text-gray-300">e4 e5 Nf3 Nc6</span>) o formato PGN completo.
        </p>
        <textarea
          value={importText}
          onChange={e => { setImportText(e.target.value); setImportError(''); setParsedMoves(null); }}
          placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5...'}
          className="w-full h-36 bg-gray-900 text-white text-sm rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none font-mono"
        />
        {importError && <p className="text-red-400 text-xs mt-1">{importError}</p>}
        {parsedMoves && (
          <p className="text-green-400 text-xs mt-1">
            {parsedMoves.length} movimientos cargados correctamente.
          </p>
        )}
        <button
          onClick={handleLoad}
          disabled={!importText.trim()}
          className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Cargar partida
        </button>
      </div>

      {/* Opciones para continuar — solo visibles si los movimientos se cargaron */}
      {parsedMoves && (
        <>
          {/* Color */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-3">Tu color</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPlayerColor('w')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${playerColor === 'w' ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                ♔ Blancas
              </button>
              <button
                onClick={() => setPlayerColor('b')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${playerColor === 'b' ? 'bg-gray-900 text-white border border-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                ♚ Negras
              </button>
            </div>
          </div>

          {/* Selección de bot */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-3">Elige el bot rival</p>
            <div className="space-y-2">
              {bots.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${selectedBot?.id === bot.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <span className="text-xl">{bot.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{bot.name}</p>
                    <p className="text-xs text-gray-300">ELO {bot.displayElo ?? bot.elo}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedBot}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-base font-bold transition-colors"
          >
            Jugar desde esta posición
          </button>
        </>
      )}
    </div>
  );
}
