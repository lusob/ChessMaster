# Guía de Despliegue - Chess Master App

Esta aplicación es una **aplicación web estática** que puede desplegarse en cualquier servidor de archivos estáticos. No requiere servidor backend ni base de datos.

## Opciones de Despliegue

### 1. GitHub Pages (Gratis y fácil)

1. **Preparar el repositorio:**
   ```bash
   cd app
   npm run build
   ```

2. **Crear un repositorio en GitHub** (si no lo tienes)

3. **Configurar GitHub Pages:**
   - Ve a Settings → Pages en tu repositorio
   - En "Source", selecciona "Deploy from a branch"
   - Selecciona la rama `main` (o `master`) y la carpeta `/dist`
   - Guarda los cambios

4. **Subir el código:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

5. **Subir solo la carpeta dist:**
   ```bash
   # Crear una rama gh-pages con solo dist
   git subtree push --prefix app/dist origin gh-pages
   ```
   
   O mejor aún, usa GitHub Actions (ver sección de automatización)

**URL resultante:** `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

---

### 2. Netlify (Gratis, muy fácil)

1. **Crear cuenta en [Netlify](https://www.netlify.com/)**

2. **Opción A - Arrastrar y soltar:**
   - Ejecuta `npm run build` en la carpeta `app`
   - Ve a Netlify Dashboard
   - Arrastra la carpeta `dist` a la zona de deploy
   - ¡Listo! Obtendrás una URL automáticamente

3. **Opción B - Conectando GitHub:**
   - Conecta tu repositorio de GitHub
   - Configuración de build:
     - **Build command:** `cd app && npm install && npm run build`
     - **Publish directory:** `app/dist`
   - Deploy automático en cada push

**URL resultante:** `https://TU_PROYECTO.netlify.app`

---

### 3. Vercel (Gratis, muy fácil)

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Desplegar:**
   ```bash
   cd app
   npm run build
   vercel
   ```

3. **O desde el dashboard:**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio de GitHub
   - Configuración:
     - **Root Directory:** `app`
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Deploy automático

**URL resultante:** `https://TU_PROYECTO.vercel.app`

---

### 4. AWS S3 + CloudFront (Para producción)

1. **Crear bucket S3:**
   ```bash
   aws s3 mb s3://chess-master-app
   ```

2. **Configurar bucket para hosting estático:**
   ```bash
   aws s3 website s3://chess-master-app --index-document index.html --error-document index.html
   ```

3. **Subir archivos:**
   ```bash
   cd app
   npm run build
   aws s3 sync dist/ s3://chess-master-app --delete
   ```

4. **Configurar CloudFront** (opcional, para CDN):
   - Crea una distribución CloudFront apuntando al bucket S3
   - Configura el "Default Root Object" como `index.html`

**URL resultante:** `https://TU_DISTRIBUCION.cloudfront.net`

---

### 5. Servidor propio (Nginx, Apache, etc.)

1. **Construir la aplicación:**
   ```bash
   cd app
   npm run build
   ```

2. **Copiar archivos:**
   ```bash
   # Copiar todo el contenido de dist/ a tu servidor web
   scp -r dist/* usuario@servidor:/var/www/html/
   ```

3. **Configurar Nginx** (ejemplo):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       root /var/www/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

---

## Automatización con GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json
      
      - name: Install dependencies
        run: |
          cd app
          npm ci
      
      - name: Build
        run: |
          cd app
          npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./app/dist
```

---

## Notas Importantes

1. **Rutas relativas:** La aplicación ya está configurada con `base: './'` en `vite.config.ts`, por lo que funcionará correctamente en subdirectorios.

2. **Archivos WASM:** Los archivos WebAssembly de Stockfish se empaquetan automáticamente en la carpeta `dist/assets/`.

3. **PWA:** La aplicación incluye un `manifest.json` para funcionar como PWA (Progressive Web App).

4. **Offline:** La aplicación funciona completamente offline una vez cargada.

5. **HTTPS:** Para PWA y WebAssembly, se recomienda usar HTTPS (Netlify, Vercel y GitHub Pages lo proporcionan automáticamente).

---

## Verificación Post-Despliegue

Después de desplegar, verifica:

- ✅ La aplicación carga correctamente
- ✅ Puedes iniciar una partida contra el bot
- ✅ El bot responde con movimientos válidos
- ✅ Los datos se guardan en localStorage (perfil, estadísticas)
- ✅ Funciona en modo offline (después de la primera carga)

---

## Solución de Problemas

**Si la aplicación no carga:**
- Verifica que `index.html` esté en la raíz del directorio publicado
- Verifica que todas las rutas sean relativas (no absolutas)

**Si Stockfish no funciona:**
- Verifica que los archivos `.wasm` se hayan copiado correctamente
- Abre la consola del navegador para ver errores
- Asegúrate de que el servidor sirva archivos `.wasm` con el tipo MIME correcto (`application/wasm`)

**Si hay errores 404:**
- Configura el servidor para redirigir todas las rutas a `index.html` (SPA routing)
