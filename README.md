# ChessBot Arena - Aplicación Web de Ajedrez

Aplicación web moderna de ajedrez desarrollada con React, TypeScript y Vite. Incluye un motor de ajedrez potente basado en Stockfish que funciona completamente offline.

## Características

- **Motor Stockfish**: Motor de ajedrez de nivel mundial usando Stockfish.js (WebAssembly)
- **Modo Torneo**: Desafía a 4 bots con dificultades progresivas
- **Bots Personalizados**: Crea tus propios bots con nombre, foto y dificultad personalizada
- **Sistema de ELO**: Rastrea tu progreso con un sistema de puntuación ELO
- **Estadísticas**: Gráficos visuales de tu evolución y rendimiento
- **100% Offline**: Funciona completamente sin conexión después de la primera carga
- **Estático**: Puede desplegarse en cualquier servidor de archivos estáticos

## Tecnologías

- **React 19** + **TypeScript**
- **Vite** - Build tool y dev server
- **chess.js** - Lógica del juego de ajedrez
- **react-chessboard** - Componente de tablero interactivo
- **stockfish.js** - Motor de ajedrez Stockfish compilado para navegador
- **Tailwind CSS** - Estilos modernos
- **Radix UI** - Componentes accesibles

## Instalación

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build de producción
npm run preview
```

## Despliegue en Servidores Estáticos

La aplicación es 100% estática y puede desplegarse en cualquier servidor de archivos estáticos.

### GitHub Pages

1. Construye la aplicación:
   ```bash
   npm run build
   ```

2. Sube el contenido de la carpeta `dist/` a tu repositorio de GitHub

3. Configura GitHub Pages para servir desde la carpeta raíz o desde `dist/`

4. Opcional: Configura un workflow de GitHub Actions para automatizar el despliegue:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '18'
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### Amazon S3

1. Construye la aplicación:
   ```bash
   npm run build
   ```

2. Sube el contenido de `dist/` a un bucket de S3:
   ```bash
   aws s3 sync dist/ s3://tu-bucket-name --delete
   ```

3. Configura el bucket para hosting estático:
   - Habilitar "Static website hosting"
   - Establecer `index.html` como documento índice
   - Configurar políticas de bucket apropiadas

### Netlify / Vercel

1. Conecta tu repositorio a Netlify o Vercel

2. Configura el build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

3. Despliega automáticamente en cada push

### Otros Servidores Estáticos

Cualquier servidor que pueda servir archivos estáticos funcionará:
- Apache
- Nginx
- Surge.sh
- Firebase Hosting
- Cloudflare Pages

Simplemente sube el contenido de `dist/` al servidor.

## Funcionamiento Offline

La aplicación funciona completamente offline después de la primera carga:

- Todos los assets (JS, CSS, imágenes) se empaquetan en el build
- Stockfish.js se ejecuta completamente en el navegador usando WebAssembly
- Los datos se guardan en localStorage del navegador
- No se requieren llamadas a APIs externas

## Estructura del Proyecto

```
app/
├── src/
│   ├── components/        # Componentes React
│   │   ├── chess/        # Componentes del tablero
│   │   ├── Tournament.tsx # Modo torneo
│   │   ├── BotSelector.tsx # Selector de bots
│   │   └── ...
│   ├── hooks/            # Custom hooks
│   │   └── useChessEngine.ts # Hook principal del motor de ajedrez
│   ├── workers/          # Web Workers
│   │   └── stockfishWorkerWrapper.ts # Wrapper de Stockfish
│   ├── types/            # Definiciones de tipos TypeScript
│   └── ...
├── dist/                 # Build de producción (generado)
└── package.json
```

## Motor de Ajedrez

La aplicación usa **Stockfish**, uno de los motores de ajedrez más fuertes del mundo:

- **Niveles 1-2**: Profundidad 1, tiempo ~100ms (Principiante)
- **Niveles 3-4**: Profundidad 2, tiempo ~200ms (Básico)
- **Niveles 5-6**: Profundidad 3, tiempo ~500ms (Intermedio)
- **Niveles 7-8**: Profundidad 4, tiempo ~1000ms (Avanzado)
- **Niveles 9-10**: Profundidad 5, tiempo ~2000ms (Experto)

El motor se ejecuta en el navegador usando WebAssembly, sin necesidad de servidor backend.

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Linting
npm run lint

# Build para producción
npm run build
```

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
