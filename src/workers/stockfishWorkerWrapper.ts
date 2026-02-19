// Wrapper simplificado para Stockfish
// El módulo stockfish se auto-ejecuta cuando se importa
// Al final del módulo ejecuta: "object"==typeof document&&document.currentScript?document.currentScript._exports=t():t()
// Esto significa que cuando se importa dinámicamente, ejecuta t() directamente

export interface StockfishResponse {
  type: 'ready' | 'bestmove' | 'info' | 'error';
  move?: string;
  from?: string;
  to?: string;
  promotion?: string;
  depth?: number;
  score?: number;
  error?: string;
}

// Mapeo de dificultad a parámetros de Stockfish
function getStockfishParams(difficulty: number): { depth: number; movetime: number } {
  if (difficulty <= 2) {
    return { depth: 1, movetime: 100 };
  } else if (difficulty <= 4) {
    return { depth: 2, movetime: 200 };
  } else if (difficulty <= 6) {
    return { depth: 3, movetime: 500 };
  } else if (difficulty <= 8) {
    return { depth: 4, movetime: 1000 };
  } else {
    return { depth: 5, movetime: 2000 };
  }
}

// Clase para manejar Stockfish
export class StockfishEngine {
  private stockfish: any = null;
  private isReady = false;
  private callbacks: Map<string, (response: StockfishResponse) => void> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  async waitForReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async init() {
    try {
      console.log('[Stockfish] Iniciando carga del módulo...');
      
      // Importar el archivo WASM directamente para obtener su URL
      let wasmUrl: string | null = null;
      try {
        // @ts-ignore
        const wasmModule = await import('stockfish/bin/stockfish-18-lite-single.wasm?url');
        wasmUrl = (typeof wasmModule === 'string' ? wasmModule : wasmModule.default || wasmModule) as string;
        console.log('[Stockfish] WASM URL importada:', wasmUrl);
      } catch (e) {
        console.warn('[Stockfish] No se pudo importar WASM directamente:', e);
      }
      
      // Importar Stockfish dinámicamente
      // El módulo se auto-ejecuta cuando se importa
      // @ts-ignore
      const stockfishModule = await import('stockfish/bin/stockfish-18-lite-single.js');
      
      console.log('[Stockfish] Módulo importado:', {
        type: typeof stockfishModule,
        isFunction: typeof stockfishModule === 'function',
        isObject: typeof stockfishModule === 'object',
        keys: stockfishModule ? Object.keys(stockfishModule).slice(0, 20) : [],
        hasDefault: stockfishModule && 'default' in stockfishModule,
        defaultType: stockfishModule && 'default' in stockfishModule ? typeof stockfishModule.default : 'N/A',
        hasCreate: stockfishModule && 'create' in stockfishModule,
        hasFactory: stockfishModule && 'factory' in stockfishModule,
      });
      
      // El módulo stockfish puede retornar la función factory de diferentes formas
      let StockfishFactory: any = null;
      
      // Intentar diferentes formas de obtener la factory
      if (typeof stockfishModule === 'function') {
        StockfishFactory = stockfishModule;
        console.log('[Stockfish] Encontrada función factory directa');
      } else if (stockfishModule && typeof stockfishModule === 'object') {
        // Buscar en diferentes lugares comunes
        if (typeof stockfishModule.default === 'function') {
          StockfishFactory = stockfishModule.default;
          console.log('[Stockfish] Encontrada función factory en default');
        } else if (stockfishModule.Stockfish && typeof stockfishModule.Stockfish === 'function') {
          StockfishFactory = stockfishModule.Stockfish;
          console.log('[Stockfish] Encontrada función factory en Stockfish');
        } else if (stockfishModule.create && typeof stockfishModule.create === 'function') {
          StockfishFactory = stockfishModule.create;
          console.log('[Stockfish] Encontrada función factory en create');
        } else if (stockfishModule.factory && typeof stockfishModule.factory === 'function') {
          StockfishFactory = stockfishModule.factory;
          console.log('[Stockfish] Encontrada función factory en factory');
        } else {
          // Buscar cualquier función exportada que pueda ser la factory
          const functionKeys = Object.keys(stockfishModule).filter(
            key => typeof stockfishModule[key] === 'function'
          );
          console.log('[Stockfish] Funciones encontradas:', functionKeys);
          
          // Si solo hay una función, probablemente sea la factory
          if (functionKeys.length === 1) {
            StockfishFactory = stockfishModule[functionKeys[0]];
            console.log('[Stockfish] Usando única función encontrada:', functionKeys[0]);
          } else if (functionKeys.length > 0) {
            // Intentar con la primera función que parezca una factory
            StockfishFactory = stockfishModule[functionKeys[0]];
            console.log('[Stockfish] Usando primera función encontrada:', functionKeys[0]);
          }
        }
      }
      
      // Si aún no encontramos la factory, verificar si el módulo mismo es el resultado ejecutado
      if (!StockfishFactory || typeof StockfishFactory !== 'function') {
        // Algunas versiones de stockfish ejecutan el módulo y el resultado está en el módulo mismo
        if (stockfishModule && typeof stockfishModule === 'object') {
          // Verificar si hay propiedades que indiquen que es una instancia ejecutada
          if ('postMessage' in stockfishModule || 'ccall' in stockfishModule) {
            console.log('[Stockfish] El módulo parece ser una instancia ejecutada directamente');
            // En este caso, el módulo ya está ejecutado, usar directamente
            this.stockfish = stockfishModule;
            this.isReady = false;
            // Continuar con la inicialización
            this.sendCommand('uci');
            const maxWait = 10000;
            const startTime = Date.now();
            while (!this.isReady && (Date.now() - startTime) < maxWait) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (this.isReady) {
              console.log('[Stockfish] ¡Inicializado correctamente desde módulo ejecutado!');
              return;
            } else {
              console.warn('[Stockfish] No se recibió uciok desde módulo ejecutado, usando fallback');
              this.isReady = false;
              return;
            }
          }
        }
        
        console.error('[Stockfish] ERROR: No se encontró la función factory. Módulo completo:', stockfishModule);
        console.error('[Stockfish] El bot usará el motor de fallback (menos inteligente)');
        // No lanzar error, permitir que use el fallback
        this.isReady = false;
        return;
      }
      
      console.log('[Stockfish] Creando instancia con configuración...');
      
      // Crear instancia con configuración
      const config: any = {
        locateFile: (wasmPath: string) => {
          console.log('[Stockfish] locateFile llamado con:', wasmPath);
          
          // Si es un archivo .wasm y tenemos la URL importada, usarla
          if (wasmPath.endsWith('.wasm') && wasmUrl) {
            console.log('[Stockfish] Usando WASM URL importada:', wasmUrl);
            return wasmUrl;
          }
          
          // Si es un archivo .wasm, intentar construir la ruta
          if (wasmPath.endsWith('.wasm')) {
            // El archivo se llama stockfish.wasm pero el real es stockfish-18-lite-single.wasm
            const wasmFile = wasmPath.replace('stockfish.wasm', 'stockfish-18-lite-single.wasm');
            
            // Intentar usar la ruta relativa desde el módulo
            try {
              // En desarrollo, los archivos están en node_modules
              // En producción, Vite los copia a assets
              const baseUrl = new URL(import.meta.url);
              const wasmUrlCalculated = new URL(
                `../../node_modules/stockfish/bin/${wasmFile}`,
                baseUrl
              ).href;
              
              console.log('[Stockfish] Ruta WASM calculada:', wasmUrlCalculated);
              return wasmUrlCalculated;
            } catch (e) {
              console.error('[Stockfish] Error calculando ruta WASM:', e);
              // Fallback: retornar la ruta original
              return wasmPath;
            }
          }
          
          return wasmPath;
        },
        listener: (line: string) => {
          // Manejar mensajes de Stockfish
          if (typeof line === 'string') {
            console.log('[Stockfish] Mensaje recibido:', line.substring(0, 100));
            this.handleStockfishMessage(line);
          }
        }
      };
      
      // La factory retorna una promesa que se resuelve con el módulo
      let stockfishInstance = StockfishFactory(config);
      
      // Si es una promesa, esperarla
      if (stockfishInstance && typeof stockfishInstance.then === 'function') {
        console.log('[Stockfish] Factory retornó una promesa, esperando...');
        stockfishInstance = await stockfishInstance;
      }
      
      this.stockfish = stockfishInstance;
      
      if (!this.stockfish) {
        console.error('[Stockfish] ERROR: Factory no retornó una instancia');
        throw new Error('Stockfish factory no retornó una instancia');
      }
      
      console.log('[Stockfish] Instancia creada:', {
        type: typeof this.stockfish,
        isPromise: this.stockfish && typeof this.stockfish.then === 'function',
        hasReady: 'ready' in this.stockfish,
        hasPostMessage: 'postMessage' in this.stockfish,
        hasProcessCommand: 'processCommand' in this.stockfish,
        hasCcall: 'ccall' in this.stockfish,
        hasCommand: '_command' in this.stockfish,
        keys: Object.keys(this.stockfish || {}).slice(0, 20)
      });
      
      // Si aún no tiene los métodos, esperar a que el módulo esté completamente inicializado
      if (!this.stockfish.ccall && !this.stockfish.postMessage && !this.stockfish.processCommand) {
        console.log('[Stockfish] Módulo no tiene métodos aún, esperando inicialización...');
        // Esperar un poco más para que el módulo se inicialice completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Revisar de nuevo
        console.log('[Stockfish] Revisando métodos después de esperar:', {
          hasCcall: 'ccall' in this.stockfish,
          hasCommand: '_command' in this.stockfish,
          hasPostMessage: 'postMessage' in this.stockfish,
        });
      }
      
      this.isReady = false;
      
      // Esperar a que esté listo
      if (this.stockfish.ready && this.stockfish.ready instanceof Promise) {
        console.log('[Stockfish] Esperando promesa ready...');
        await this.stockfish.ready;
        console.log('[Stockfish] Promesa ready resuelta');
      } else {
        console.log('[Stockfish] No hay promesa ready, esperando 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Iniciar UCI
      console.log('[Stockfish] Enviando comando UCI...');
      this.sendCommand('uci');
      
      // Esperar hasta recibir uciok o timeout
      const maxWait = 10000;
      const startTime = Date.now();
      while (!this.isReady && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (!this.isReady) {
        console.warn('[Stockfish] No se recibió uciok después de', maxWait, 'ms');
      } else {
        console.log('[Stockfish] ¡Inicializado correctamente!');
      }
      
    } catch (error) {
      console.error('[Stockfish] ERROR en init:', error);
      this.isReady = false;
      throw error;
    }
  }

  private sendCommand(command: string) {
    if (!this.stockfish) {
      console.warn('[Stockfish] No se puede enviar comando, stockfish es null');
      return;
    }
    
    console.log('[Stockfish] Enviando comando:', command);
    
    // Intentar diferentes métodos para enviar comandos
    if (this.stockfish.postMessage) {
      this.stockfish.postMessage(command);
      console.log('[Stockfish] Comando enviado vía postMessage');
    } else if (this.stockfish.processCommand) {
      this.stockfish.processCommand(command);
      console.log('[Stockfish] Comando enviado vía processCommand');
    } else if (this.stockfish.ccall) {
      // ccall es el método de Emscripten para llamar funciones C
      this.stockfish.ccall('command', null, ['string'], [command]);
      console.log('[Stockfish] Comando enviado vía ccall');
    } else if (this.stockfish._command) {
      // _command es la función C compilada directamente
      this.stockfish._command(command);
      console.log('[Stockfish] Comando enviado vía _command');
    } else {
      console.error('[Stockfish] ERROR: No se encontró método para enviar comandos. Métodos disponibles:', Object.keys(this.stockfish).filter(k => typeof this.stockfish[k] === 'function').slice(0, 10));
    }
  }

  private handleStockfishMessage(line: string) {
    if (typeof line !== 'string') {
      return;
    }
    
    if (line.includes('uciok')) {
      console.log('[Stockfish] ¡Recibido uciok!');
      this.isReady = true;
      this.notifyCallbacks('init', { type: 'ready' });
      
      // Configurar Stockfish para máxima fuerza
      this.sendCommand('setoption name Skill Level value 20');
      this.sendCommand('setoption name UCI_LimitStrength value false');
    } else if (line.startsWith('bestmove')) {
      console.log('[Stockfish] Recibido bestmove:', line);
      const move = this.parseBestMove(line);
      if (move) {
        this.notifyCallbacks('go', {
          type: 'bestmove',
          ...move,
        });
      }
    }
  }

  private parseBestMove(line: string): { from: string; to: string; promotion?: string } | null {
    const match = line.match(/bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?/);
    if (match) {
      return {
        from: match[1],
        to: match[2],
        promotion: match[3] || undefined,
      };
    }
    return null;
  }

  private notifyCallbacks(key: string, response: StockfishResponse) {
    const callback = this.callbacks.get(key);
    if (callback) {
      callback(response);
      this.callbacks.delete(key);
    }
  }

  setPosition(fen: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isReady || !this.stockfish) {
        reject(new Error('Stockfish no está listo'));
        return;
      }

      this.sendCommand(`position fen ${fen}`);
      resolve();
    });
  }

  getBestMove(difficulty: number): Promise<StockfishResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isReady || !this.stockfish) {
        reject(new Error('Stockfish no está listo'));
        return;
      }

      const timeout = setTimeout(() => {
        this.callbacks.delete('go');
        reject(new Error('Timeout esperando respuesta de Stockfish'));
      }, 10000);

      this.callbacks.set('go', (response) => {
        clearTimeout(timeout);
        if (response.type === 'error') {
          reject(new Error(response.error || 'Error obteniendo movimiento'));
        } else {
          resolve(response);
        }
      });

      const params = getStockfishParams(difficulty);
      this.sendCommand(`go depth ${params.depth} movetime ${params.movetime}`);
    });
  }

  stop() {
    if (this.stockfish) {
      this.sendCommand('stop');
    }
  }

  quit() {
    if (this.stockfish) {
      this.sendCommand('quit');
      this.stockfish = null;
      this.isReady = false;
    }
  }

  get ready(): boolean {
    return this.isReady;
  }
}

// Crear instancia global del motor
let engineInstance: StockfishEngine | null = null;

export function getStockfishEngine(): StockfishEngine {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

// Función para esperar a que Stockfish esté listo
export async function waitForStockfishReady(): Promise<boolean> {
  const engine = getStockfishEngine();
  try {
    await engine.waitForReady();
  } catch (error) {
    console.error('[Stockfish] Error en waitForReady:', error);
    return false;
  }
  
  const maxWait = 10000;
  const startTime = Date.now();
  
  while (!engine.ready && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return engine.ready;
}
