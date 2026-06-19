// Lightweight confetti burst — no dependencies.
// Exposes window.burstConfetti(count).
(function () {
  const COLORS = ['#ffd86b', '#ff7eb6', '#7ed0ff', '#eafaff', '#9be15d', '#ffffff'];

  function burstConfetti(count = 120) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.getElementById('confettiLayer');
    if (!layer) return;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      piece.style.background = color;
      piece.style.left = Math.random() * 100 + 'vw';
      if (Math.random() < 0.5) piece.style.borderRadius = '50%';

      const drift = (Math.random() * 2 - 1) * 240;
      const duration = 2200 + Math.random() * 1600;
      const rotate = (Math.random() * 2 - 1) * 720;

      layer.appendChild(piece);
      const anim = piece.animate(
        [
          { transform: 'translate(0, -10px) rotate(0deg)', opacity: 1 },
          { transform: `translate(${drift}px, 100vh) rotate(${rotate}deg)`, opacity: 0.9 }
        ],
        { duration, easing: 'cubic-bezier(.2,.6,.4,1)' }
      );
      anim.onfinish = () => piece.remove();
    }
  }

  window.burstConfetti = burstConfetti;
})();
