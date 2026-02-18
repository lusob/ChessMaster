# Instrucciones para Probar la Aplicación

## Prerrequisitos

1. Instalar Node.js (versión 18 o superior)
2. Instalar npm (viene con Node.js)

## Pasos para Probar

### 1. Instalar Dependencias

```bash
cd app
npm install
```

Esto instalará todas las dependencias incluyendo:
- React y React DOM
- chess.js
- react-chessboard
- stockfish.js
- Todas las demás dependencias

### 2. Ejecutar en Modo Desarrollo

```bash
npm run dev
```

Esto iniciará el servidor de desarrollo en `http://localhost:5173` (o el puerto que Vite asigne).

### 3. Probar la Aplicación

1. **Abrir el navegador** en la URL mostrada (normalmente `http://localhost:5173`)

2. **Verificar Prueba de Stockfish**:
   - En la pantalla principal (menú) verás un componente "Prueba de Stockfish"
   - Debería mostrar:
     - "Inicializando Stockfish..." (cargando)
     - "Stockfish está listo. Probando movimiento..." (listo)
     - "Calculando mejor movimiento..." (probando)
     - "¡Stockfish funciona correctamente! Movimiento: [movimiento]" (éxito)
   - Si hay un error, se mostrará en rojo con el mensaje de error

3. **Probar Partida Real**:
   - Haz clic en "Jugar contra Bot"
   - Selecciona cualquier bot (recomendado empezar con "Bot Novato" - dificultad 1)
   - Haz un movimiento (por ejemplo: e4)
   - El bot debería responder con un movimiento válido
   - Verifica que el tablero se actualiza correctamente

4. **Probar Diferentes Niveles**:
   - Prueba con bots de diferentes dificultades (1-10)
   - Los bots de nivel alto deberían tomar más tiempo en pensar
   - Todos deberían responder con movimientos válidos

### 4. Build para Producción

```bash
npm run build
```

Esto creará una carpeta `dist/` con todos los archivos estáticos listos para desplegar.

### 5. Probar Build de Producción

```bash
npm run preview
```

Esto servirá el build de producción localmente para verificar que funciona correctamente.

## Verificaciones Esperadas

### ✅ Prueba de Stockfish Exitosa
- El componente muestra "¡Stockfish funciona correctamente!"
- Muestra un movimiento calculado (ej: "e2e4 → e4 (e4)")
- Muestra el FEN después del movimiento

### ✅ Partida Funcional
- El tablero se renderiza correctamente
- Puedes hacer movimientos arrastrando piezas o haciendo clic
- El bot responde con movimientos válidos
- El juego detecta jaque, jaque mate, tablas, etc.

### ✅ Funcionamiento Offline
- Después de cargar la aplicación, desconecta internet
- La aplicación debería seguir funcionando
- Stockfish debería seguir calculando movimientos
- Los datos se guardan en localStorage

## Solución de Problemas

### Stockfish no se inicializa
- Verifica que `stockfish.js` esté instalado: `npm list stockfish.js`
- Revisa la consola del navegador para errores
- El fallback al motor anterior debería activarse automáticamente

### El bot no responde
- Verifica la consola del navegador para errores
- Asegúrate de que Stockfish se haya inicializado (ver componente de prueba)
- El bot tiene un delay de 600-1000ms antes de responder

### Errores de compilación
- Ejecuta `npm install` nuevamente
- Verifica que todas las dependencias estén instaladas
- Revisa `package.json` para versiones correctas

## Notas

- La primera carga puede tardar unos segundos mientras Stockfish se inicializa
- Los bots de nivel alto (9-10) pueden tardar hasta 2 segundos en pensar
- Todos los datos se guardan en localStorage del navegador
- La aplicación funciona completamente offline después de la primera carga
