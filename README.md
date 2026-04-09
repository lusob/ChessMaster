# ChessBot Arena

Aplicación web PWA de ajedrez desarrollada con React, TypeScript y Vite. Incluye el motor Stockfish (WebAssembly) y funciona completamente offline tras la primera carga.

🌐 **Demo**: https://lusob.github.io/ChessMaster/

## Características

- **Motor Stockfish 18**: Motor de nivel mundial via WebAssembly, calibrado por ELO del rival
- **Partida Rápida**: Elige cualquier bot y juega directamente
- **Torneo Rápido**: Desafía 4 bots en orden de dificultad creciente
- **Campeonatos**: Sistema suizo FIDE (Dutch Swiss) con múltiples torneos simultáneos:
  - Campeonato Club Siero: 40 jugadores, 7 rondas, modo adaptativo opcional
  - Importar desde info64.org: pega la URL y empieza a jugar
  - Clasificación en tiempo real, historial de rondas, podio animado al finalizar
- **Sistema ELO**: Puntuación ELO con historial y gráfico de evolución
- **Logros**: Sistema de logros desbloqueables
- **Bots personalizables**: Edita nombre, emoji y ELO de los bots fijos; crea bots propios
- **100% Offline**: PWA con Service Worker — funciona sin conexión tras la primera carga
- **Persistencia local**: Todo se guarda en localStorage, sin backend ni cuenta

## Tecnologías

- **React 19** + **TypeScript**
- **Vite** + **vite-plugin-pwa** — build y Service Worker
- **chess.js** — lógica del juego
- **react-chessboard** — tablero interactivo
- **Stockfish 18 lite** — motor de ajedrez compilado a WebAssembly
- **Tailwind CSS** — estilos
- **lucide-react** — iconos

## Instalación y desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción → dist/
npm run preview   # preview del build
npm run lint      # linting
```

## Despliegue

La aplicación genera un build estático en `dist/`. Se puede desplegar en cualquier servidor estático.

### GitHub Pages (configuración actual)

El despliegue está automatizado via GitHub Actions en `.github/workflows/`:

```yaml
- run: npm install
- run: npm run build
- uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./app/dist
```

Cada push a `main` despliega automáticamente.

### Otros servicios

| Servicio | Build command | Publish dir |
|---|---|---|
| Netlify / Vercel | `npm run build` | `dist` |
| Cloudflare Pages | `npm run build` | `dist` |
| S3 | `npm run build` && `aws s3 sync dist/ s3://bucket` | — |

## Motor de ajedrez

Stockfish se controla por **ELO del bot** (no por nivel 1-10):

| ELO bot | UCI_LimitStrength | UCI_Elo | Depth | Movetime |
|---|---|---|---|---|
| < 800 | true | 1320 (mínimo) | 1 | 50 ms |
| 800–1099 | true | 1320 | 2 | 100 ms |
| 1100–1399 | true | ELO exacto | 3 | 300 ms |
| 1400–1699 | true | ELO exacto | 4 | 800 ms |
| ≥ 1700 | false | — | 5 | 2000 ms |

Para bots con ELO < 1320 (por debajo del mínimo de `UCI_LimitStrength`), se añaden movimientos subóptimos ocasionales para simular errores de jugadores novatos, filtrando los movimientos claramente suicidas.

## Sistema suizo (Campeonatos)

Implementación del **Dutch Swiss FIDE**:

- **Ronda 1**: jugadores ordenados por ELO, mitad superior vs mitad inferior (1º vs N/2+1º, etc.)
- **Rondas siguientes**: agrupar por puntos, dentro de cada grupo ordenar por ELO y emparejar mitad superior vs mitad inferior; los grupos impares flotan el último jugador al grupo siguiente
- **Mesa 1** = par con mayor puntuación media (como info64.org)
- **Desempate**: Buchholz (suma de puntos de los rivales)
- Se evitan repeticiones de rival usando el historial de pairings

## Estructura del proyecto

```
app/
├── src/
│   ├── components/
│   │   ├── chess/              # Tablero y lógica de partida
│   │   ├── Campeonatos.tsx     # Gestión de campeonatos (lista, activo, podio)
│   │   ├── Tournament.tsx      # Torneo rápido
│   │   ├── BotSelector.tsx     # Selector de bots para partida rápida
│   │   ├── Menu.tsx            # Menú principal
│   │   └── ...
│   ├── hooks/
│   │   ├── useChessEngine.ts   # Motor de ajedrez + lógica de movimientos
│   │   └── useStorage.ts       # Persistencia (localStorage) y hooks de estado
│   ├── lib/
│   │   └── championship.ts     # Sistema suizo, emparejamientos, standings
│   ├── workers/
│   │   └── stockfishWorkerWrapper.ts  # Wrapper Stockfish WebAssembly
│   └── types/index.ts          # Tipos TypeScript
└── dist/                       # Build de producción (generado)
```

## Licencia

MIT
