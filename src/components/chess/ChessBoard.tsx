import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { useChessEngine, useBotTimer } from '@/hooks/useChessEngine';
import type { Bot } from '@/types';
import type { Move } from '@/hooks/useChessEngine';
import { Loader2 } from 'lucide-react';

interface ChessBoardProps {
  bot: Bot;
  playerColor?: 'w' | 'b';
  onGameEnd?: (result: 'win' | 'loss' | 'draw', moves: number) => void;
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
    isPlayerTurn,
    isCheck,
    moveCount,
    getLegalMoves,
    makeMove,
    makeBotMove,
    isGameOver,
    getGameResult,
    resetGame,
  } = useChessEngine();

  const { isThinking, scheduleBotMove } = useBotTimer();
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [gameEnded, setGameEnded] = useState(false);

  // Reset game when bot changes
  const handleReset = useCallback(() => {
    resetGame();
    setGameEnded(false);
    setMoveFrom(null);
    setOptionSquares({});
  }, [resetGame]);

  // Manejar clic en pieza (para móvil)
  const onPieceClick = useCallback((args: { isSparePiece: boolean; piece: any; square: string | null }) => {
    if (!isPlayerTurn || gameEnded || !args.square) return;

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
    
    if (!moveFrom || !isPlayerTurn || gameEnded) {
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
        const { result } = getGameResult();
        if (result) {
          setGameEnded(true);
          onGameEnd?.(result, moveCount + 1);
        }
        return;
      }

      // Turno del bot
      scheduleBotMove(async () => {
        await makeBotMove(bot.difficulty);
        
        if (isGameOver()) {
          const { result } = getGameResult();
          if (result) {
            setGameEnded(true);
            onGameEnd?.(result, moveCount + 2);
          }
        }
      }, 600 + Math.random() * 400);
    } else {
      // Intentar seleccionar nueva pieza
      onPieceClick({ isSparePiece: false, piece: args.piece, square });
    }
  }, [
    moveFrom, 
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
    onPieceClick
  ]);

  // Movimiento por drag & drop (desktop)
  const onPieceDrop = useCallback((args: { 
    piece: any; 
    sourceSquare: string; 
    targetSquare: string | null;
  }) => {
    if (!isPlayerTurn || gameEnded || !args.targetSquare) return false;

    const move: Move = {
      from: args.sourceSquare as Square,
      to: args.targetSquare as Square,
      promotion: 'q',
    };

    const success = makeMove(move);

    if (success) {
      onMove?.();

      if (isGameOver()) {
        const { result } = getGameResult();
        if (result) {
          setGameEnded(true);
          onGameEnd?.(result, moveCount + 1);
        }
        return true;
      }

      scheduleBotMove(async () => {
        await makeBotMove(bot.difficulty);
        
        if (isGameOver()) {
          const { result } = getGameResult();
          if (result) {
            setGameEnded(true);
            onGameEnd?.(result, moveCount + 2);
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
    bot.difficulty
  ]);

  // Función para verificar si una pieza es arrastrable
  const canDragPiece = (args: { isSparePiece: boolean; piece: any; square: string | null }) => {
    if (!args.square) return false;
    const piece = args.piece;
    return !gameEnded && 
           isPlayerTurn && 
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
      <div className="flex justify-center mt-4 gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     font-medium transition-colors flex items-center gap-2"
        >
          <span>🔄</span> Nueva partida
        </button>
      </div>

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
