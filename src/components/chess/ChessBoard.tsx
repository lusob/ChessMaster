import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { useChessEngine, useBotTimer } from '@/hooks/useChessEngine';
import type { Bot } from '@/types';
import type { Move } from '@/hooks/useChessEngine';
import { Loader2, RotateCcw, List, ChevronLeft, ChevronRight } from 'lucide-react';

interface ChessBoardProps {
  bot: Bot;
  playerColor?: 'w' | 'b';
  onGameEnd?: (payload: {
    result: 'win' | 'loss' | 'draw';
    moves: number;
    reason: string;
    historySan: string[];
    lastMoveVerbose?: any;
  }) => void;
  onMove?: () => void;
}

export function ChessBoard({ 
  bot, 
  playerColor = 'w', 
  onGameEnd,
  onMove 
}: ChessBoardProps) {
  const {
    fen,
    history,
    isPlayerTurn,
    isCheck,
    moveCount,
    getLegalMoves,
    makeMove,
    makeBotMove,
    isGameOver,
    getGameResult,
    getHistoryVerbose,
    resetGame,
    undo,
    goBack,
    goForward,
    isAtLatestPosition,
    canGoBack,
    canGoForward,
  } = useChessEngine();

  const { isThinking, scheduleBotMove } = useBotTimer();
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showMoveHistory, setShowMoveHistory] = useState(false);

  // Reset game when bot changes
  const handleReset = useCallback(() => {
    resetGame();
    setGameEnded(false);
    setMoveFrom(null);
    setOptionSquares({});
  }, [resetGame]);

  // Handle undo - deshacer último par de movimientos (jugador + bot)
  const handleUndo = useCallback(() => {
    if (gameEnded || isThinking || moveCount === 0) return;
    
    // Si es turno del jugador, significa que el último movimiento fue del bot
    // Deshacer bot primero, luego jugador
    if (isPlayerTurn) {
      undo(); // Deshacer movimiento del bot
      undo(); // Deshacer movimiento del jugador
    } else {
      // Si es turno del bot, el último movimiento fue del jugador
      // Solo deshacer el movimiento del jugador (el bot aún no ha movido)
      undo();
    }
  }, [undo, gameEnded, isThinking, isPlayerTurn, moveCount]);

  // Manejar clic en pieza (para móvil)
  const onPieceClick = useCallback((args: { isSparePiece: boolean; piece: any; square: string | null }) => {
    if (!isPlayerTurn || gameEnded || !isAtLatestPosition() || !args.square) return;

    const square = args.square as Square;
    const moves = getLegalMoves(square);
    
    if (moves.length > 0) {
      setMoveFrom(square);
      const newSquares: Record<string, React.CSSProperties> = {};
      
      // Marcar casilla origen
      newSquares[square] = {
        background: 'rgba(255, 255, 0, 0.4)',
      };
      
      // Marcar movimientos posibles
      moves.forEach((move) => {
        newSquares[move] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
          borderRadius: '50%',
        };
      });
      
      setOptionSquares(newSquares);
    }
  }, [isPlayerTurn, gameEnded, getLegalMoves]);

  // Manejar clic en casilla destino
  const onSquareClick = useCallback((args: { piece: any; square: string }) => {
    const square = args.square as Square;
    
    if (!moveFrom || !isPlayerTurn || gameEnded || !isAtLatestPosition()) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    const move: Move = {
      from: moveFrom,
      to: square,
      promotion: 'q', // Auto-promoción a reina
    };

    const success = makeMove(move);

    if (success) {
      setMoveFrom(null);
      setOptionSquares({});
      onMove?.();

      // Verificar fin del juego
      if (isGameOver()) {
        const { result, reason } = getGameResult();
        if (result) {
          setGameEnded(true);
          const verbose = getHistoryVerbose();
          onGameEnd?.({
            result,
            moves: moveCount + 1,
            reason,
            historySan: history,
            lastMoveVerbose: verbose[verbose.length - 1],
          });
        }
        return;
      }

      // Turno del bot
      scheduleBotMove(async () => {
        await makeBotMove(bot.difficulty);
        
        if (isGameOver()) {
          const { result, reason } = getGameResult();
          if (result) {
            setGameEnded(true);
            const verbose = getHistoryVerbose();
            onGameEnd?.({
              result,
              moves: moveCount + 2,
              reason,
              historySan: history,
              lastMoveVerbose: verbose[verbose.length - 1],
            });
          }
        }
      }, 600 + Math.random() * 400);
    } else {
      // Intentar seleccionar nueva pieza
      onPieceClick({ isSparePiece: false, piece: args.piece, square });
    }
  }, [
    moveFrom, 
    history,
    isPlayerTurn, 
    gameEnded, 
    makeMove, 
    onMove, 
    isGameOver, 
    getGameResult, 
    onGameEnd, 
    moveCount,
    scheduleBotMove,
    makeBotMove,
    bot.difficulty,
    getHistoryVerbose,
    onPieceClick,
    isAtLatestPosition
  ]);

  // Movimiento por drag & drop (desktop)
  const onPieceDrop = useCallback((args: { 
    piece: any; 
    sourceSquare: string; 
    targetSquare: string | null;
  }) => {
    if (!isPlayerTurn || gameEnded || !isAtLatestPosition() || !args.targetSquare) return false;

    const move: Move = {
      from: args.sourceSquare as Square,
      to: args.targetSquare as Square,
      promotion: 'q',
    };

    const success = makeMove(move);

    if (success) {
      onMove?.();

      if (isGameOver()) {
        const { result, reason } = getGameResult();
        if (result) {
          setGameEnded(true);
          const verbose = getHistoryVerbose();
          onGameEnd?.({
            result,
            moves: moveCount + 1,
            reason,
            historySan: history,
            lastMoveVerbose: verbose[verbose.length - 1],
          });
        }
        return true;
      }

      scheduleBotMove(async () => {
        await makeBotMove(bot.difficulty);
        
        if (isGameOver()) {
          const { result, reason } = getGameResult();
          if (result) {
            setGameEnded(true);
            const verbose = getHistoryVerbose();
            onGameEnd?.({
              result,
              moves: moveCount + 2,
              reason,
              historySan: history,
              lastMoveVerbose: verbose[verbose.length - 1],
            });
          }
        }
      }, 600 + Math.random() * 400);

      return true;
    }

    return false;
  }, [
    isPlayerTurn, 
    gameEnded, 
    makeMove, 
    onMove, 
    isGameOver, 
    getGameResult, 
    onGameEnd, 
    moveCount,
    scheduleBotMove,
    makeBotMove,
    bot.difficulty,
    history,
    getHistoryVerbose,
    isAtLatestPosition
  ]);

  // Función para verificar si una pieza es arrastrable
  const canDragPiece = (args: { isSparePiece: boolean; piece: any; square: string | null }) => {
    if (!args.square) return false;
    const piece = args.piece;
    return !gameEnded && 
           isPlayerTurn && 
           isAtLatestPosition() &&
           piece && 
           piece.pieceType && 
           piece.pieceType.startsWith(playerColor);
  };

  // Colores personalizados del tablero (modo oscuro)
  const boardStyle = {
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  };

  const darkSquareStyle = { backgroundColor: '#4a5568' };
  const lightSquareStyle = { backgroundColor: '#a0aec0' };

  // Opciones del tablero
  const chessboardOptions = {
    position: fen,
    boardOrientation: (playerColor === 'w' ? 'white' : 'black') as 'white' | 'black',
    boardStyle,
    darkSquareStyle,
    lightSquareStyle,
    squareStyles: optionSquares,
    allowDragging: !gameEnded && isPlayerTurn,
    canDragPiece,
    onPieceDrop,
    onSquareClick,
    onPieceClick,
    showNotation: true,
    animationDurationInMs: 200,
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Info del bot */}
      <div className="flex items-center justify-between mb-4 bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: bot.color }}
          >
            {bot.emoji}
          </div>
          <div>
            <p className="font-semibold text-white">{bot.name}</p>
            <p className="text-xs text-gray-400">ELO: {bot.elo} • Dif: {bot.difficulty}/10</p>
          </div>
        </div>
        {isThinking && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}
      </div>

      {/* Tablero */}
      <div className="relative">
        <Chessboard options={chessboardOptions} />

        {/* Indicador de jaque */}
        {isCheck && !gameEnded && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg
                          animate-pulse pointer-events-none">
            ¡JAQUE!
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex justify-center mt-4 gap-3 flex-wrap">
        {/* Navegación de movimientos */}
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={!canGoBack()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed 
                       text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            title="Movimiento anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed 
                       text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            title="Siguiente movimiento"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isAtLatestPosition() && (
          <div className="px-3 py-2 bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 rounded-lg text-sm">
            Navegando movimientos anteriores
          </div>
        )}
        <button
          onClick={() => setShowMoveHistory(!showMoveHistory)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg 
                     font-medium transition-colors flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          Movimientos
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     font-medium transition-colors flex items-center gap-2"
        >
          <span>🔄</span> Nueva partida
        </button>
      </div>

      {/* Historial de movimientos */}
      {showMoveHistory && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <List className="w-4 h-4" />
            Historial de Movimientos
          </h4>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no hay movimientos</p>
          ) : (
            <div className="space-y-1 text-sm">
              {Array.from({ length: Math.ceil(history.length / 2) }).map((_, movePairIdx) => {
                const whiteMove = history[movePairIdx * 2];
                const blackMove = history[movePairIdx * 2 + 1];
                return (
                  <div
                    key={movePairIdx}
                    className="flex items-center gap-2 p-2 rounded bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                  >
                    <span className="text-gray-500 font-medium w-8">{movePairIdx + 1}.</span>
                    <span className="text-white flex-1">{whiteMove || '-'}</span>
                    <span className="text-gray-300 flex-1">{blackMove || '-'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estado del juego */}
      {gameEnded && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-lg font-bold text-white">
            {getGameResult().result === 'win' && '🎉 ¡Victoria!'}
            {getGameResult().result === 'loss' && '😔 Derrota'}
            {getGameResult().result === 'draw' && '🤝 Tablas'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {getGameResult().reason}
          </p>
        </div>
      )}
    </div>
  );
}
