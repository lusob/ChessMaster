import confetti from 'canvas-confetti';

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

export function fireWinConfetti() {
  if (prefersReducedMotion()) return;
  
  // Asegurar que canvas-confetti esté disponible
  if (typeof confetti === 'undefined' || typeof confetti !== 'function') {
    console.warn('canvas-confetti no está disponible');
    return;
  }

  try {
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    } as const;

    // Disparar confeti múltiple para mejor efecto
    confetti({ ...defaults, particleCount: 50, spread: 55, startVelocity: 35 });
    
    // Segundo disparo con delay para efecto más prolongado
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 30, spread: 80, startVelocity: 25, scalar: 0.9 });
    }, 100);
  } catch (error) {
    console.error('Error disparando confeti:', error);
  }
}

