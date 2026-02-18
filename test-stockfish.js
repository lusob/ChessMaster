// Script simple para probar la lógica de Stockfish (requiere Node.js)
// Este script verifica que la estructura del código es correcta

console.log('🔍 Verificando estructura del código...\n');

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'Wrapper de Stockfish existe',
    file: 'src/workers/stockfishWorkerWrapper.ts',
    check: (content) => content.includes('StockfishEngine') && content.includes('getStockfishEngine')
  },
  {
    name: 'Hook de ajedrez importa Stockfish',
    file: 'src/hooks/useChessEngine.ts',
    check: (content) => content.includes('getStockfishEngine') && content.includes('waitForStockfishReady')
  },
  {
    name: 'Componente de prueba existe',
    file: 'src/components/StockfishTest.tsx',
    check: (content) => content.includes('StockfishTest') && content.includes('waitForStockfishReady')
  },
  {
    name: 'Menu incluye prueba de Stockfish',
    file: 'src/components/Menu.tsx',
    check: (content) => content.includes('StockfishTest')
  },
  {
    name: 'ChessBoard maneja makeBotMove asíncrono',
    file: 'src/components/chess/ChessBoard.tsx',
    check: (content) => content.includes('await makeBotMove')
  },
  {
    name: 'Package.json incluye stockfish.js',
    file: 'package.json',
    check: (content) => content.includes('stockfish.js')
  },
  {
    name: 'Vite configurado para workers',
    file: 'vite.config.ts',
    check: (content) => content.includes('worker') || content.includes('optimizeDeps')
  },
  {
    name: 'Manifest.json existe',
    file: 'public/manifest.json',
    check: (content) => content.includes('Chess Master')
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const filePath = path.join(__dirname, check.file);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (check.check(content)) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name} - No pasa la verificación`);
        failed++;
      }
    } else {
      console.log(`❌ ${check.name} - Archivo no encontrado: ${check.file}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.name} - Error: ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed === 0) {
  console.log('\n✨ ¡Todas las verificaciones pasaron!');
  console.log('💡 Para probar la aplicación completa, ejecuta: npm run dev');
} else {
  console.log('\n⚠️  Algunas verificaciones fallaron. Revisa los errores arriba.');
  process.exit(1);
}
