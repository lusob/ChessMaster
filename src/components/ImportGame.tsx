import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { ChevronLeft, Upload, Play, X } from 'lucide-react';
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
    const tokens = cleaned.split(/\s+/).filter(t => t && !/^\d+\.+$/.test(t));
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
  const [moves, setMoves] = useState<string[] | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [showContinuePicker, setShowContinuePicker] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');

  const replayFen = useMemo(() => {
    if (!moves) return new Chess().fen();
    const chess = new Chess();
    for (const san of moves.slice(0, replayIndex)) {
      try { chess.move(san); } catch { break; }
    }
    return chess.fen();
  }, [moves, replayIndex]);

  const movePairs = useMemo(() => {
    if (!moves) return [];
    return moves.reduce<{ moveNum: number; white: string; black?: string }[]>((pairs, san, i) => {
      if (i % 2 === 0) pairs.push({ moveNum: Math.floor(i / 2) + 1, white: san });
      else pairs[pairs.length - 1].black = san;
      return pairs;
    }, []);
  }, [moves]);

  const handleLoad = () => {
    const parsed = parseMoves(importText);
    if (!parsed || parsed.length === 0) {
      setImportError('No se pudieron interpretar los movimientos. Usa notación SAN o PGN estándar.');
      return;
    }
    setImportError('');
    setMoves(parsed);
    setReplayIndex(parsed.length);
    setShowContinuePicker(false);
  };

  const isAtEnd = moves !== null && replayIndex === moves.length;

  if (moves) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 shrink-0">
          <button
            onClick={() => { setMoves(null); setImportText(''); setShowContinuePicker(false); }}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">Partida importada</p>
            <p className="text-xs text-gray-400">{moves.length} movimientos</p>
          </div>
          <span className="text-sm text-gray-400 shrink-0">{replayIndex} / {moves.length}</span>
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <div className="w-full max-w-sm">
            <Chessboard options={{ position: replayFen, allowDragging: false, animationDurationInMs: 100 }} />
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 px-4 pb-4 overflow-y-auto max-h-72">
          {/* Navigation */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setReplayIndex(0)} disabled={replayIndex === 0}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors">
              &laquo; Inicio
            </button>
            <button onClick={() => setReplayIndex(i => Math.max(0, i - 1))} disabled={replayIndex === 0}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors">
              &lsaquo; Anterior
            </button>
            <button onClick={() => setReplayIndex(i => Math.min(moves.length, i + 1))} disabled={isAtEnd}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors">
              Siguiente &rsaquo;
            </button>
            <button onClick={() => setReplayIndex(moves.length)} disabled={isAtEnd}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors">
              Final &raquo;
            </button>
          </div>

          {/* Jugar desde aquí — solo visible cuando no estamos al final */}
          {!isAtEnd && (
            <button
              onClick={() => setShowContinuePicker(v => !v)}
              className="w-full mb-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Jugar desde aquí contra un bot
            </button>
          )}

          {showContinuePicker && !isAtEnd && (
            <div className="bg-gray-800 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-400 mb-2">Elige tu color:</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setPlayerColor('w')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${playerColor === 'w' ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  ♔ Blancas
                </button>
                <button onClick={() => setPlayerColor('b')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${playerColor === 'b' ? 'bg-gray-900 text-white border border-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  ♚ Negras
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">Elige el bot rival:</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {bots.map(bot => (
                  <button
                    key={bot.id}
                    onClick={() => onStartGame(moves.slice(0, replayIndex), bot, playerColor)}
                    className="w-full flex items-center gap-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                  >
                    <span className="text-xl">{bot.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{bot.name}</p>
                      <p className="text-xs text-gray-400">ELO {bot.displayElo ?? bot.elo}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Move list */}
          <div className="bg-gray-800 rounded-xl p-3 max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {movePairs.map(pair => (
                <span key={pair.moveNum} className="text-xs whitespace-nowrap">
                  <span className="text-gray-500 mr-0.5">{pair.moveNum}.</span>
                  <button
                    onClick={() => { setReplayIndex(pair.moveNum * 2 - 1); setShowContinuePicker(false); }}
                    className={`px-1 rounded ${replayIndex === pair.moveNum * 2 - 1 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
                  >
                    {pair.white}
                  </button>
                  {pair.black && (
                    <button
                      onClick={() => { setReplayIndex(pair.moveNum * 2); setShowContinuePicker(false); }}
                      className={`px-1 rounded ml-0.5 ${replayIndex === pair.moveNum * 2 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      {pair.black}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
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
          <h2 className="text-2xl font-bold text-white">Importar Partida</h2>
          <p className="text-sm text-gray-400">Pega movimientos para explorar o continuar</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2">
          Movimientos en notación SAN (ej: <span className="font-mono text-gray-300">e4 e5 Nf3 Nc6</span>) o formato PGN completo.
        </p>
        <textarea
          value={importText}
          onChange={e => { setImportText(e.target.value); setImportError(''); }}
          placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5..."
          className="w-full h-36 bg-gray-900 text-white text-sm rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none font-mono"
        />
        {importError && <p className="text-red-400 text-xs mt-1">{importError}</p>}
        <button
          onClick={handleLoad}
          disabled={!importText.trim()}
          className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Explorar partida
        </button>
      </div>
    </div>
  );
}
