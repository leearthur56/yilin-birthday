// Seal & Bunny Birthday Catch
// A small arcade game: slide the seal to catch treats the bunnies toss,
// dodge the pufferfish. Pure canvas + vanilla JS, no dependencies.
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // HUD elements
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const livesEl = document.getElementById('lives');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');

  const BEST_KEY = 'sealCatchBest';
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = best;

  // Item types: weight controls spawn frequency.
  const GOOD = [
    { emoji: '🐟', points: 10, weight: 5 },
    { emoji: '🎂', points: 15, weight: 3 },
    { emoji: '💖', points: 20, weight: 2 },
    { emoji: '🎁', points: 25, weight: 2 },
    { emoji: '⭐', points: 30, weight: 1 }
  ];
  const BAD = { emoji: '🐡', points: 0, weight: 0 };

  // Build a weighted pick list for good items.
  const goodPicker = [];
  GOOD.forEach((g) => { for (let i = 0; i < g.weight; i++) goodPicker.push(g); });

  const seal = {
    x: W / 2,
    y: H - 46,
    w: 92,
    targetX: W / 2,
    speed: 9
  };

  let items = [];
  let particles = [];
  let bunnies = [];

  let score = 0;
  let combo = 1;
  let comboTimer = 0;
  let lives = 3;
  let running = false;
  let spawnTimer = 0;
  let elapsed = 0;
  let lastTime = 0;
  const keys = { left: false, right: false };

  // ---- Bunny tossers along the top iceberg ----
  function initBunnies() {
    bunnies = [
      { x: W * 0.2, bob: 0 },
      { x: W * 0.5, bob: 1.4 },
      { x: W * 0.8, bob: 2.6 }
    ];
  }

  // ---- Input ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if ((e.key === ' ' || e.key === 'Enter') && !running) startGame();
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  function pointerToTarget(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    seal.targetX = (clientX - rect.left) * scale;
  }
  canvas.addEventListener('mousemove', (e) => pointerToTarget(e.clientX));
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) { pointerToTarget(e.touches[0].clientX); e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches[0]) pointerToTarget(e.touches[0].clientX);
  }, { passive: true });

  startBtn.addEventListener('click', startGame);

  // ---- Game lifecycle ----
  function startGame() {
    items = [];
    particles = [];
    score = 0;
    combo = 1;
    comboTimer = 0;
    lives = 3;
    elapsed = 0;
    spawnTimer = 0;
    seal.x = seal.targetX = W / 2;
    running = true;
    initBunnies();
    overlay.classList.add('hidden');
    updateHUD();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
    }
    const newRecord = score >= best && score > 0;
    overlayTitle.textContent = newRecord ? '🏆 New Best Score!' : '🦭 Game Over!';
    overlayText.innerHTML =
      `You caught <strong>${score}</strong> points of birthday treats!<br />` +
      birthdayLine(score) +
      `<br /><span style="color:#38617a">Best: ${best}</span>`;
    startBtn.textContent = 'Play Again ▶';
    overlay.classList.remove('hidden');
    if (window.burstConfetti) window.burstConfetti(newRecord ? 200 : 90);
  }

  function birthdayLine(s) {
    if (s >= 400) return 'Legendary seal! Yilin, you are an absolute treasure. 💎🦭';
    if (s >= 250) return 'Amazing flippers! Hope your birthday is just as brilliant. ✨';
    if (s >= 120) return 'Lovely catching! Wishing you a wonderful year ahead. 🎂';
    return 'Every treat counts — happy birthday, Yilin! 💙';
  }

  function updateHUD() {
    scoreEl.textContent = score;
    comboEl.textContent = 'x' + combo;
    livesEl.textContent = '★'.repeat(lives) + '☆'.repeat(Math.max(0, 3 - lives));
  }

  // ---- Spawning ----
  function spawnItem() {
    // Difficulty: more pufferfish and faster fall over time.
    const badChance = Math.min(0.28, 0.1 + elapsed / 90000);
    const isBad = Math.random() < badChance;
    const type = isBad ? BAD : goodPicker[(Math.random() * goodPicker.length) | 0];
    const bunny = bunnies[(Math.random() * bunnies.length) | 0];
    const fallSpeed = 2.4 + Math.random() * 1.6 + elapsed / 60000;
    items.push({
      x: bunny.x + (Math.random() * 40 - 20),
      y: 70,
      vx: (Math.random() * 2 - 1) * 1.2,
      vy: fallSpeed,
      size: 34,
      emoji: type.emoji,
      points: type.points,
      bad: isBad,
      spin: (Math.random() * 2 - 1) * 0.05,
      rot: 0
    });
  }

  function addParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 1,
        color
      });
    }
  }

  // ---- Update ----
  function update(dt) {
    elapsed += dt;

    // Seal movement: keyboard nudges target, then ease toward target.
    if (keys.left) seal.targetX -= seal.speed * (dt / 16.7);
    if (keys.right) seal.targetX += seal.speed * (dt / 16.7);
    seal.targetX = Math.max(seal.w / 2, Math.min(W - seal.w / 2, seal.targetX));
    seal.x += (seal.targetX - seal.x) * 0.25;

    // Combo decay
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 1;
    }

    // Spawn cadence speeds up gradually.
    spawnTimer -= dt;
    const interval = Math.max(420, 900 - elapsed / 80);
    if (spawnTimer <= 0) {
      spawnItem();
      spawnTimer = interval;
    }

    // Items
    const catchY = seal.y - 6;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.x += it.vx;
      it.y += it.vy;
      it.rot += it.spin;
      if (it.x < it.size / 2 || it.x > W - it.size / 2) it.vx *= -1;

      const caught =
        it.y > catchY - 24 &&
        it.y < catchY + 30 &&
        Math.abs(it.x - seal.x) < seal.w / 2;

      if (caught) {
        if (it.bad) {
          lives--;
          combo = 1;
          comboTimer = 0;
          addParticles(it.x, it.y, '#ff5b6e', 16);
          flash = 1;
          if (lives <= 0) { items.splice(i, 1); updateHUD(); endGame(); return; }
        } else {
          const gained = it.points * combo;
          score += gained;
          combo = Math.min(9, combo + 1);
          comboTimer = 2200;
          addParticles(it.x, it.y, '#ffd86b', 12);
          floats.push({ x: it.x, y: it.y, text: '+' + gained, life: 1 });
        }
        items.splice(i, 1);
        updateHUD();
        continue;
      }

      if (it.y > H + 40) items.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= dt / 700;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Score popups
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 0.7;
      f.life -= dt / 900;
      if (f.life <= 0) floats.splice(i, 1);
    }

    if (flash > 0) flash -= dt / 250;
  }

  let floats = [];
  let flash = 0;

  // ---- Draw ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Iceberg ledge at top
    ctx.fillStyle = '#eafaff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 44);
    ctx.quadraticCurveTo(W * 0.75, 64, W * 0.5, 48);
    ctx.quadraticCurveTo(W * 0.25, 32, 0, 52);
    ctx.closePath();
    ctx.fill();

    // Bunny tossers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bunnies.forEach((b) => {
      const bob = Math.sin(elapsed / 300 + b.bob) * 4;
      ctx.font = '34px serif';
      ctx.fillText('🐰', b.x, 30 + bob);
    });

    // Water line shimmer
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) {
      const y = 70 + Math.sin((x + elapsed / 8) / 40) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Falling items
    items.forEach((it) => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.font = it.size + 'px serif';
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();
    });

    // Particles
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Score popups
    floats.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0a3d62';
      ctx.lineWidth = 3;
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    // The seal (with a tiny reflected shadow)
    ctx.font = '64px serif';
    ctx.fillText('🦭', seal.x, seal.y);

    // Damage flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,80,90,${Math.min(0.4, flash * 0.4)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- Main loop ----
  function loop(now) {
    if (!running) return;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 50) dt = 50; // clamp after tab switches
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Draw an idle frame behind the start overlay.
  initBunnies();
  draw();
})();
