import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { getStockfishEngine, waitForStockfishReady } from '@/workers/stockfishWorkerWrapper';

export type GameStatus = 
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'fifty_moves'
  | 'draw';

export interface Move {
  from: Square;
  to: Square;
  promotion?: string;
}

// Tabla de valores de piezas
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

// Evaluar una posición simple (sin recursión profunda)
function evaluatePositionSimple(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -10000 : 10000;
  }
  if (game.isDraw() || game.isStalemate()) {
    return 0;
  }

  let score = 0;
  const board = game.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const pieceValue = PIECE_VALUES[piece.type] || 0;
        // Bonus por posición avanzada para peones
        let positionBonus = 0;
        if (piece.type === 'p') {
          positionBonus = piece.color === 'w' ? (6 - row) * 10 : (row - 1) * 10;
        }
        // Bonus por centrado para caballos y alfiles
        if (piece.type === 'n' || piece.type === 'b') {
          const centerDist = Math.abs(3.5 - col) + Math.abs(3.5 - row);
          positionBonus = (4 - centerDist) * 5;
        }
        
        if (piece.color === 'w') {
          score += pieceValue + positionBonus;
        } else {
          score -= pieceValue + positionBonus;
        }
      }
    }
  }
  
  // Bonus por control del centro
  const centerSquares = ['d4', 'd5', 'e4', 'e5'];
  centerSquares.forEach(square => {
    try {
      const attackers = game.attackers(square as Square, 'w');
      const defenders = game.attackers(square as Square, 'b');
      score += (attackers.length - defenders.length) * 15;
    } catch {
      // Ignorar errores
    }
  });
  
  return game.turn() === 'w' ? score : -score;
}

// Evaluar un movimiento específico (rápido)
function evaluateMove(game: Chess, move: any): number {
  let score = 0;
  
  // Capturas
  if (move.captured) {
    score += (PIECE_VALUES[move.captured] || 0) * 10;
  }
  
  // Jaque
  if (move.san && move.san.includes('+')) {
    score += 50;
  }
  
  // Jaque mate
  if (move.san && move.san.includes('#')) {
    score += 100000;
  }
  
  // Promoción
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion] || 0;
  }
  
  // Peón avanzado
  if (move.piece === 'p') {
    const row = parseInt(move.to[1]);
    if (game.turn() === 'w') {
      score += (row - 2) * 15;
    } else {
      score += (7 - row) * 15;
    }
  }
  
  return score;
}

// Motor greedy mejorado (sin recursión profunda)
function findGreedyMove(game: Chess, moves: any[]): any {
  // Buscar jaque mate
  const checkmateMove = moves.find(m => m.san && m.san.includes('#'));
  if (checkmateMove) return checkmateMove;
  
  // Evaluar todos los movimientos
  const evaluatedMoves = moves.map(move => ({
    move,
    score: evaluateMove(game, move)
  }));
  
  // Ordenar por puntuación
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  // Tomar el mejor o uno de los mejores con algo de aleatoriedad
  if (Math.random() < 0.8) {
    return evaluatedMoves[0].move;
  } else if (evaluatedMoves.length > 1 && Math.random() < 0.5) {
    return evaluatedMoves[1].move;
  } else {
    return evaluatedMoves[Math.floor(Math.random() * Math.min(3, evaluatedMoves.length))].move;
  }
}

// Minimax muy ligero (solo profundidad 2)
function findBestMoveLight(game: Chess, moves: any[]): any {
  // Buscar jaque mate inmediato
  const checkmateMove = moves.find(m => m.san && m.san.includes('#'));
  if (checkmateMove) return checkmateMove;
  
  let bestMove = moves[0];
  let bestScore = -Infinity;
  
  // Limitar número de movimientos a evaluar para velocidad
  const movesToEvaluate = moves.slice(0, 15);
  
  for (const move of movesToEvaluate) {
    game.move(move);
    
    // Evaluar posición después del movimiento
    let score = evaluatePositionSimple(game);
    
    // Simular respuesta del oponente (1 nivel)
    const opponentMoves = game.moves({ verbose: true });
    if (opponentMoves.length > 0) {
      // El oponente hará su mejor captura
      const opponentCaptures = opponentMoves.filter(m => m.captured);
      if (opponentCaptures.length > 0) {
        opponentCaptures.sort((a, b) => {
          const valueA = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
          const valueB = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
          return valueB - valueA;
        });
        score -= (opponentCaptures[0].captured ? (PIECE_VALUES[opponentCaptures[0].captured] || 0) : 0);
      }
    }
    
    game.undo();
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

export function useChessEngine() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [isCheck, setIsCheck] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const stockfishRef = useRef<ReturnType<typeof getStockfishEngine> | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializar Stockfish cuando el componente se monta
  useEffect(() => {
    let mounted = true;
    
    const initializeStockfish = async () => {
      try {
        stockfishRef.current = getStockfishEngine();
        // Esperar a que Stockfish esté listo
        const isReady = await waitForStockfishReady();
        if (mounted && isReady) {
          console.log('Stockfish inicializado correctamente');
        } else if (mounted) {
          console.warn('Stockfish no se inicializó a tiempo, usando fallback');
        }
      } catch (error) {
        console.error('Error inicializando Stockfish:', error);
      }
    };

    initializeStockfish();

    return () => {
      mounted = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // Sincronizar estado con el juego
  const syncState = useCallback(() => {
    const game = gameRef.current;
    setFen(game.fen());
    setHistory(game.history());
    setIsPlayerTurn(game.turn() === 'w');
    setIsCheck(game.isCheck());
    setMoveCount(game.history().length);

    // Determinar estado del juego
    if (game.isCheckmate()) {
      setStatus('checkmate');
    } else if (game.isStalemate()) {
      setStatus('stalemate');
    } else if (game.isThreefoldRepetition()) {
      setStatus('threefold_repetition');
    } else if (game.isInsufficientMaterial()) {
      setStatus('insufficient_material');
    } else if (game.isDraw()) {
      setStatus('draw');
    } else {
      setStatus('playing');
    }
  }, []);

  // Reiniciar el juego
  const resetGame = useCallback(() => {
    gameRef.current = new Chess();
    syncState();
  }, [syncState]);

  // Cargar posición FEN
  const loadFen = useCallback((fenString: string) => {
    try {
      gameRef.current = new Chess(fenString);
      syncState();
      return true;
    } catch {
      return false;
    }
  }, [syncState]);

  // Obtener movimientos legales para una pieza
  const getLegalMoves = useCallback((square: Square): Square[] => {
    const game = gameRef.current;
    const moves = game.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  }, []);

  // Realizar un movimiento
  const makeMove = useCallback((move: Move): boolean => {
    const game = gameRef.current;
    
    try {
      const result = game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (result) {
        syncState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [syncState]);

  // Movimiento del bot usando Stockfish
  const makeBotMove = useCallback(async (difficulty: number): Promise<Move | null> => {
    const game = gameRef.current;
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) return null;

    const engine = stockfishRef.current;
    
    // Fallback al motor anterior si Stockfish no está disponible
    if (!engine || !engine.ready) {
      console.warn('Stockfish no está listo, usando motor de respaldo');
      let selectedMove;
      
      if (difficulty <= 2) {
        const captureMoves = moves.filter(m => m.captured);
        if (captureMoves.length > 0 && Math.random() < 0.6) {
          selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }
      } else if (difficulty <= 5) {
        selectedMove = findGreedyMove(game, moves);
      } else if (difficulty <= 8) {
        selectedMove = findBestMoveLight(game, moves);
      } else {
        const captureMoves = moves.filter(m => m.captured);
        if (captureMoves.length > 0) {
          captureMoves.sort((a, b) => {
            const valueA = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
            const valueB = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
            return valueB - valueA;
          });
          selectedMove = captureMoves[0];
        } else {
          const checkMoves = moves.filter(m => m.san && m.san.includes('+'));
          if (checkMoves.length > 0) {
            selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
          } else {
            selectedMove = findGreedyMove(game, moves);
          }
        }
      }

      if (selectedMove) {
        game.move(selectedMove);
        syncState();
        return {
          from: selectedMove.from,
          to: selectedMove.to,
          promotion: selectedMove.promotion,
        };
      }
      return null;
    }

    try {
      // Usar Stockfish para obtener el mejor movimiento
      const currentFen = game.fen();
      await engine.setPosition(currentFen);
      const response = await engine.getBestMove(difficulty);
      
      if (response.type === 'bestmove' && response.from && response.to) {
        // Convertir el movimiento de Stockfish al formato de chess.js
        const move = {
          from: response.from as Square,
          to: response.to as Square,
          promotion: response.promotion || 'q',
        };

        // Verificar que el movimiento es legal
        const legalMove = game.move(move);
        if (legalMove) {
          syncState();
          return {
            from: response.from as Square,
            to: response.to as Square,
            promotion: response.promotion,
          };
        } else {
          // Si Stockfish devuelve un movimiento ilegal, usar fallback
          console.warn('Stockfish devolvió movimiento ilegal, usando fallback');
          const fallbackMove = findGreedyMove(game, moves);
          if (fallbackMove) {
            game.move(fallbackMove);
            syncState();
            return {
              from: fallbackMove.from,
              to: fallbackMove.to,
              promotion: fallbackMove.promotion,
            };
          }
        }
      }
    } catch (error) {
      console.error('Error obteniendo movimiento de Stockfish:', error);
      // Fallback al motor anterior en caso de error
      const fallbackMove = findGreedyMove(game, moves);
      if (fallbackMove) {
        game.move(fallbackMove);
        syncState();
        return {
          from: fallbackMove.from,
          to: fallbackMove.to,
          promotion: fallbackMove.promotion,
        };
      }
    }

    return null;
  }, [syncState]);

  // Verificar si el juego ha terminado
  const isGameOver = useCallback(() => {
    return gameRef.current.isGameOver();
  }, []);

  // Obtener resultado del juego
  const getGameResult = useCallback((): { 
    result: 'win' | 'loss' | 'draw' | null;
    reason: string;
  } => {
    const game = gameRef.current;

    if (game.isCheckmate()) {
      // Si es turno de las blancas y hay jaque mate, ganan negras (bot)
      const winner = game.turn() === 'w' ? 'loss' : 'win';
      return { result: winner, reason: 'Jaque mate' };
    }

    if (game.isStalemate()) {
      return { result: 'draw', reason: 'Ahogado' };
    }

    if (game.isThreefoldRepetition()) {
      return { result: 'draw', reason: 'Repetición triple' };
    }

    if (game.isInsufficientMaterial()) {
      return { result: 'draw', reason: 'Material insuficiente' };
    }

    if (game.isDraw()) {
      return { result: 'draw', reason: 'Tablas' };
    }

    return { result: null, reason: '' };
  }, []);

  // Deshacer último movimiento (para modo análisis)
  const undo = useCallback(() => {
    const result = gameRef.current.undo();
    if (result) {
      syncState();
      return true;
    }
    return false;
  }, [syncState]);

  return {
    fen,
    history,
    isPlayerTurn,
    status,
    isCheck,
    moveCount,
    resetGame,
    loadFen,
    getLegalMoves,
    makeMove,
    makeBotMove,
    isGameOver,
    getGameResult,
    undo,
  };
}

// Hook para manejar el temporizador del bot
export function useBotTimer() {
  const [isThinking, setIsThinking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleBotMove = useCallback((
    callback: () => void | Promise<void>,
    delay: number = 500
  ) => {
    setIsThinking(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      await callback();
      setIsThinking(false);
    }, delay);
  }, []);

  const cancelBotMove = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsThinking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isThinking, scheduleBotMove, cancelBotMove };
}
