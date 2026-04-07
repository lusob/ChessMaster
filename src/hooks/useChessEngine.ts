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

export type MoveAnnotation =
  | 'brilliant'   // ✨ Jugada sorprendente y óptima
  | 'excellent'   // !! Excelente
  | 'good'        // ! Buena
  | 'inaccuracy'  // ?! Imprecisión
  | 'mistake'     // ? Error
  | 'blunder';    // ?? Blunder

export interface Move {
  from: Square;
  to: Square;
  promotion?: string;
}

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Calcula la ventaja de material desde la perspectiva de las blancas
function getMaterialAdvantage(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = PIECE_VALUES[piece.type] || 0;
        score += piece.color === 'w' ? value : -value;
      }
    }
  }
  return score;
}

export function useChessEngine(playerColor: 'w' | 'b' = 'w') {
  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;

  const gameRef = useRef(new Chess()); // Juego completo (siempre tiene todos los movimientos)
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerColor === 'w');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [isCheck, setIsCheck] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [materialAdvantage, setMaterialAdvantage] = useState(0); // >0 blancas ganan, <0 negras ganan
  const [lastMoveAnnotation, setLastMoveAnnotation] = useState<MoveAnnotation | null>(null);
  const [moveAnnotations, setMoveAnnotations] = useState<(MoveAnnotation | null)[]>([]); // per-move annotations
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1); // -1 = posición actual, >=0 = navegando
  const historyIndexRef = useRef(-1); // ref síncrono para syncState
  const stockfishRef = useRef<ReturnType<typeof getStockfishEngine> | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [engineError, setEngineError] = useState(false);

  // Inicializar Stockfish cuando el componente se monta
  useEffect(() => {
    let mounted = true;

    const initializeStockfish = async () => {
      try {
        stockfishRef.current = getStockfishEngine();
        const isReady = await waitForStockfishReady();
        if (mounted && !isReady) {
          console.warn('Stockfish no se inicializó correctamente');
          setEngineError(true);
        }
      } catch (error) {
        console.error('Error inicializando Stockfish:', error);
        if (mounted) setEngineError(true);
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
    const fullHistory = game.history();
    const currentHistoryIndex = historyIndexRef.current;

    // Si estamos navegando, mostrar la posición del historial
    if (currentHistoryIndex >= 0 && currentHistoryIndex < fullHistory.length) {
      // Crear un juego temporal hasta el índice especificado
      const tempGame = new Chess();
      for (let i = 0; i <= currentHistoryIndex; i++) {
        tempGame.move(fullHistory[i]);
      }
      setFen(tempGame.fen());
      setHistory(tempGame.history());
      setIsPlayerTurn(tempGame.turn() === playerColorRef.current);
      setIsCheck(tempGame.isCheck());
      setMoveCount(tempGame.history().length);
      setMaterialAdvantage(getMaterialAdvantage(tempGame));
      
      // Determinar estado del juego en esta posición
      if (tempGame.isCheckmate()) {
        setStatus('checkmate');
      } else if (tempGame.isStalemate()) {
        setStatus('stalemate');
      } else if (tempGame.isThreefoldRepetition()) {
        setStatus('threefold_repetition');
      } else if (tempGame.isInsufficientMaterial()) {
        setStatus('insufficient_material');
      } else if (tempGame.isDraw()) {
        setStatus('draw');
      } else {
        setStatus('playing');
      }
    } else {
      // Mostrar posición actual completa
      setFen(game.fen());
      setHistory(fullHistory);
      setIsPlayerTurn(game.turn() === playerColorRef.current);
      setIsCheck(game.isCheck());
      setMoveCount(fullHistory.length);
      setMaterialAdvantage(getMaterialAdvantage(game));
      
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
    }
  }, []);

  const setHistoryIndex = useCallback((index: number) => {
    historyIndexRef.current = index;
    setCurrentHistoryIndex(index);
  }, []);

  // Reiniciar el juego
  const resetGame = useCallback(() => {
    gameRef.current = new Chess();
    setHistoryIndex(-1);
    setLastMoveAnnotation(null);
    setMoveAnnotations([]);
    syncState();
  }, [syncState, setHistoryIndex]);

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
    // Solo permitir movimientos si estamos en la posición actual
    if (historyIndexRef.current !== -1) {
      setHistoryIndex(-1);
    }

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
  }, [syncState, setHistoryIndex]);

  // Movimiento del bot usando Stockfish
  const makeBotMove = useCallback(async (difficulty: number, elo = 1500): Promise<Move | null> => {
    const game = gameRef.current;
    const moves = game.moves({ verbose: true });

    if (moves.length === 0) return null;

    // UCI_LimitStrength soporta mínimo 1320 ELO, así que para bots más débiles
    // añadimos movimientos aleatorios ocasionales para simular errores reales.
    // ELO 200 → ~50% aleatorio, ELO 800 → ~13%, ELO 1320+ → 0%
    const randomChance = elo < 1320 ? (1320 - elo) / 2200 : 0;
    if (randomChance > 0 && Math.random() < randomChance) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const legalMove = game.move({ from: randomMove.from, to: randomMove.to, promotion: 'q' });
      if (legalMove) {
        syncState();
        return { from: randomMove.from as Square, to: randomMove.to as Square };
      }
    }

    const engine = stockfishRef.current;
    if (!engine || !engine.ready) {
      throw new Error('Stockfish no está listo');
    }

    const currentFen = game.fen();
    await engine.setPosition(currentFen);
    const response = await engine.getBestMove(difficulty, elo);

    if (response.type === 'bestmove' && response.from && response.to) {
      const move = {
        from: response.from as Square,
        to: response.to as Square,
        promotion: response.promotion || 'q',
      };
      const legalMove = game.move(move);
      if (legalMove) {
        syncState();
        return {
          from: response.from as Square,
          to: response.to as Square,
          promotion: response.promotion,
        };
      }
      throw new Error('Stockfish devolvió un movimiento ilegal');
    }

    throw new Error('Respuesta inesperada de Stockfish');
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
      // Tras jaque mate, el turno es del bando que acaba de ser matado.
      // Si el turno es del jugador, significa que le acaban de dar mate → derrota.
      // Si el turno es del rival, el jugador dio el mate → victoria.
      const winner = game.turn() === playerColorRef.current ? 'loss' : 'win';
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

  // Navegar hacia atrás en el historial
  const goBack = useCallback(() => {
    const fullHistory = gameRef.current.history();
    const idx = historyIndexRef.current;
    if (idx === -1) {
      if (fullHistory.length > 0) {
        setHistoryIndex(fullHistory.length - 1);
      }
    } else if (idx > 0) {
      setHistoryIndex(idx - 1);
    }
    syncState();
  }, [syncState, setHistoryIndex]);

  // Navegar hacia adelante en el historial
  const goForward = useCallback(() => {
    const fullHistory = gameRef.current.history();
    const idx = historyIndexRef.current;
    if (idx < fullHistory.length - 1) {
      setHistoryIndex(idx + 1);
    } else if (idx === fullHistory.length - 1) {
      setHistoryIndex(-1);
    }
    syncState();
  }, [syncState, setHistoryIndex]);

  // Ir directamente a la última posición
  const goToLatest = useCallback(() => {
    setHistoryIndex(-1);
    syncState();
  }, [syncState, setHistoryIndex]);

  // Verificar si estamos en la última posición (usa ref para ser síncrono)
  const isAtLatestPosition = useCallback(() => {
    return historyIndexRef.current === -1;
  }, []);

  // Verificar si podemos ir hacia atrás
  const canGoBack = useCallback(() => {
    const fullHistory = gameRef.current.history();
    if (currentHistoryIndex === -1) {
      return fullHistory.length > 0;
    }
    return currentHistoryIndex > 0;
  }, [currentHistoryIndex]);

  // Verificar si podemos ir hacia adelante
  const canGoForward = useCallback(() => {
    if (currentHistoryIndex === -1) {
      return false;
    }
    const fullHistory = gameRef.current.history();
    return currentHistoryIndex < fullHistory.length - 1;
  }, [currentHistoryIndex]);

  return {
    fen,
    history,
    engineError,
    isPlayerTurn,
    status,
    isCheck,
    moveCount,
    materialAdvantage,
    lastMoveAnnotation,
    moveAnnotations,
    resetGame,
    loadFen,
    getLegalMoves,
    makeMove,
    makeBotMove,
    isGameOver,
    getGameResult,
    getHistory: () => gameRef.current.history() as string[],
    getHistoryVerbose: () => gameRef.current.history({ verbose: true }) as any[],
    undo,
    goBack,
    goForward,
    goToLatest,
    isAtLatestPosition,
    canGoBack,
    canGoForward,
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
