"use strict";

const BIRD_IMAGE_SRC = "gautamm.png";

const DIFFICULTIES = {
  easy:   { label:"😎 EASY",   pipeSpd:2.2, gap:190, pipeInterval:100, gravity:0.40, flapPower:-8.5, color:"#6ee7b7" },
  medium: { label:"🔥 MEDIUM", pipeSpd:3.0, gap:170, pipeInterval:90,  gravity:0.50, flapPower:-9.0, color:"#fcd34d" },
  hard:   { label:"💀 HARD",   pipeSpd:4.2, gap:140, pipeInterval:75,  gravity:0.65, flapPower:-9.5, color:"#fca5a5" },
};

const BASE_W      = 480;
const BASE_H      = 640;
const ASPECT      = BASE_W / BASE_H;  

const BIRD_W_BASE = 62;
const BIRD_H_BASE = 48;
const PIPE_W_BASE = 70;
const GROUND_H_BASE = 80;
const GROW_FRAMES = 50;
const GROW_SCALE  = 3.0;

const canvas  = document.getElementById("gameCanvas");
const ctx     = canvas.getContext("2d");
const wrapper = document.getElementById("game-wrapper");


let W = BASE_W, H = BASE_H, SCALE = 1;
let GROUND_H, GROUND_Y, PIPE_W;

function resizeGame() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  
  let w, h;
  if (vw / vh > ASPECT) {
    
    h = Math.min(vh, 760);
    w = h * ASPECT;
  } else {
    
    w = Math.min(vw, 520);
    h = w / ASPECT;
  }

  if (vw <= 600) { w = vw; h = vw / ASPECT; }

  w = Math.floor(w);
  h = Math.floor(h);

  SCALE    = w / BASE_W;
  W        = BASE_W;         
  H        = BASE_H;
  GROUND_H = Math.round(GROUND_H_BASE);
  GROUND_Y = H - GROUND_H;
  PIPE_W   = PIPE_W_BASE;

  wrapper.style.width  = w + "px";
  wrapper.style.height = h + "px";

  canvas.width  = BASE_W;
  canvas.height = BASE_H;
  canvas.style.width  = w + "px";
  canvas.style.height = h + "px";
}

const SND_FLAP      = document.getElementById("snd-flap");
const SND_COLLISION = document.getElementById("snd-collision");
const SND_POINT     = document.getElementById("snd-point");

function playSound(el) {
  if (!el) return;
  try { el.currentTime = 0; el.play().catch(() => {}); } catch (_) {}
}

let birdImg = null;
if (BIRD_IMAGE_SRC) {
  birdImg = new Image();
  birdImg.src = BIRD_IMAGE_SRC;
  birdImg.onerror = () => { birdImg = null; };
}

let state        = "idle";
let score        = 0;
let bestScore    = 0;
let animFrame    = null;
let pipeTimer    = 0;
let groundOff    = 0;
let pipes        = [];
let particles    = [];
let currentDiff  = "easy";
let birdGrowTimer = 0;

const bird = {
  x: 120, y: BASE_H / 2,
  vy: 0, gravity: 0.5, flapPower: -9,
  rotation: 0, wingAngle: 0
};

function getBirdSize() {
  if (birdGrowTimer > 0) {
    const t = birdGrowTimer / GROW_FRAMES;
    const s = 1 + (GROW_SCALE - 1) * t;
    return { w: BIRD_W_BASE * s, h: BIRD_H_BASE * s };
  }
  return { w: BIRD_W_BASE, h: BIRD_H_BASE };
}

function resetBird() {
  bird.x = 120; bird.y = H / 2;
  bird.vy = 0; bird.rotation = 0; bird.wingAngle = 0;
  birdGrowTimer = 0;
}

const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * BASE_W,
  y: Math.random() * (BASE_H - GROUND_H_BASE),
  r: Math.random() * 1.5 + 0.5,
  alpha: Math.random() * 0.6 + 0.3,
  twinkle: Math.random() * Math.PI * 2,
}));

function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    particles.push({
      x, y,
      vx: Math.cos(a) * (Math.random() * 3 + 1),
      vy: Math.sin(a) * (Math.random() * 3 + 1),
      life: 1, color,
      r: Math.random() * 4 + 2
    });
  }
}

function syncLevelBtns(level) {
  document.querySelectorAll("[data-level]").forEach(b =>
    b.classList.toggle("selected", b.dataset.level === level));
  document.querySelectorAll("[data-level2]").forEach(b =>
    b.classList.toggle("selected", b.dataset.level2 === level));
}

document.querySelectorAll("[data-level]").forEach(btn =>
  btn.addEventListener("click", e => {
    e.stopPropagation();
    currentDiff = btn.dataset.level;
    syncLevelBtns(currentDiff);
  })
);
document.querySelectorAll("[data-level2]").forEach(btn =>
  btn.addEventListener("click", e => {
    e.stopPropagation();
    currentDiff = btn.dataset.level2;
    syncLevelBtns(currentDiff);
  })
);

function flap() {
  if (state === "dead") return;
  if (state === "idle") { startGame(); return; }
  const cfg = DIFFICULTIES[currentDiff];
  bird.vy = cfg.flapPower;
  bird.rotation = -0.4;
  bird.wingAngle = 0.8;
  spawnParticles(bird.x - 10, bird.y + 10, "#a5f3fc", 5);
  playSound(SND_FLAP);
}

document.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
});
canvas.addEventListener("click", flap);
canvas.addEventListener("touchstart", e => { e.preventDefault(); flap(); }, { passive: false });

function startGame() {
  const cfg = DIFFICULTIES[currentDiff];
  bird.gravity   = cfg.gravity;
  bird.flapPower = cfg.flapPower;
  state = "playing"; score = 0; pipes = []; particles = [];
  pipeTimer = 0; groundOff = 0;
  resetBird();
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.add("hidden");
  cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(loop);
}

function gameOver() {
  state = "dead";
  if (score > bestScore) bestScore = score;
  birdGrowTimer = GROW_FRAMES;
  spawnParticles(bird.x, bird.y, "#f87171", 20);
  spawnParticles(bird.x + 20, bird.y - 10, "#fbbf24", 12);
  spawnParticles(bird.x - 15, bird.y + 10, "#fb923c", 10);
  playSound(SND_COLLISION);
  setTimeout(() => {
    const cfg = DIFFICULTIES[currentDiff];
    document.getElementById("finalScore").textContent = `Score: ${score}`;
    document.getElementById("bestScore").textContent  = `Best: ${bestScore}`;
    document.getElementById("diffLabel").textContent  = `Difficulty: ${cfg.label}`;
    document.getElementById("gameOverScreen").classList.remove("hidden");
  }, 900);
}

function update() {
  if (birdGrowTimer > 0) birdGrowTimer--;
  if (state !== "playing") return;

  const cfg = DIFFICULTIES[currentDiff];

  bird.vy += bird.gravity;
  bird.y  += bird.vy;
  const targetRot = Math.min(Math.PI / 2, bird.vy * 0.06);
  bird.rotation  += (targetRot - bird.rotation) * 0.12;
  if (bird.wingAngle > 0) bird.wingAngle -= 0.08;

  const { h: bH } = getBirdSize();
  if (bird.y + bH / 2 >= GROUND_Y || bird.y - bH / 2 <= 0) { gameOver(); return; }

  pipeTimer++;
  if (pipeTimer >= cfg.pipeInterval) {
    pipeTimer = 0;
    const min = 80, max = H - cfg.gap - 80;
    const topH = Math.floor(Math.random() * (max - min + 1)) + min;
    pipes.push({ x: W + 10, topH, passed: false });
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= cfg.pipeSpd;

    if (!p.passed && p.x + PIPE_W < bird.x) {
      p.passed = true; score++;
      playSound(SND_POINT);
      spawnParticles(bird.x, bird.y - cfg.gap / 2, "#fde68a", 6);
    }

    const { w: bW, h: bHc } = getBirdSize();
    const bL = bird.x - bW / 2 + 6, bR = bird.x + bW / 2 - 6;
    const bT = bird.y - bHc / 2 + 4, bB = bird.y + bHc / 2 - 4;
    if (bR > p.x && bL < p.x + PIPE_W && (bT < p.topH || bB > p.topH + cfg.gap)) {
      gameOver(); return;
    }
    if (p.x + PIPE_W < 0) pipes.splice(i, 1);
  }

  groundOff = (groundOff + cfg.pipeSpd) % 32;

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life -= 0.025;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  stars.forEach(s => s.twinkle += 0.04);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#0c0020");
  sky.addColorStop(0.5, "#1a0040");
  sky.addColorStop(1, "#2d1060");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  stars.forEach(s => {
    const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  });
}

function drawDiffBadge() {
  const cfg = DIFFICULTIES[currentDiff];
  ctx.save();
  ctx.font = "bold 8px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(8, 8, 132, 22);
  ctx.fillStyle = cfg.color;
  ctx.fillText(cfg.label, 14, 24);
  ctx.restore();
}

function drawGround() {
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, "#3b1f0a");
  g.addColorStop(1, "#1a0d00");
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, W, GROUND_H);
  ctx.fillStyle = "#6b3f1a";
  ctx.fillRect(0, GROUND_Y, W, 8);
  ctx.strokeStyle = "rgba(255,200,100,0.12)";
  ctx.lineWidth = 1;
  for (let x = -groundOff; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 8);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

function drawPipe(p) {
  const cfg = DIFFICULTIES[currentDiff];
  const botY = p.topH + cfg.gap, capH = 28, capW = PIPE_W + 10;

  const tg = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
  tg.addColorStop(0, "#166534"); tg.addColorStop(0.3, "#16a34a");
  tg.addColorStop(0.7, "#15803d"); tg.addColorStop(1, "#052e16");

  const cg = ctx.createLinearGradient(p.x - 5, 0, p.x + capW, 0);
  cg.addColorStop(0, "#166534"); cg.addColorStop(0.3, "#4ade80");
  cg.addColorStop(0.7, "#16a34a"); cg.addColorStop(1, "#052e16");

  ctx.fillStyle = tg; ctx.fillRect(p.x, 0, PIPE_W, p.topH);
  ctx.fillStyle = cg; ctx.fillRect(p.x - 5, p.topH - capH, capW, capH);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + 6, 0, 10, p.topH - capH);
  ctx.fillRect(p.x - 1, p.topH - capH, 14, capH);

  ctx.fillStyle = tg; ctx.fillRect(p.x, botY + capH, PIPE_W, GROUND_Y - botY - capH);
  ctx.fillStyle = cg; ctx.fillRect(p.x - 5, botY, capW, capH);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + 6, botY + capH, 10, GROUND_Y - botY - capH);
  ctx.fillRect(p.x - 1, botY, 14, capH);
}

function drawBird() {
  const { w: bW, h: bH } = getBirdSize();

  let sx = 0, sy = 0;
  if (birdGrowTimer > 0) {
    const shake = (birdGrowTimer / GROW_FRAMES) * 6;
    sx = (Math.random() - 0.5) * shake;
    sy = (Math.random() - 0.5) * shake;
  }

  ctx.save();
  ctx.translate(bird.x + sx, bird.y + sy);
  ctx.rotate(bird.rotation);

  if (birdImg && birdImg.complete && birdImg.naturalWidth > 0) {
    ctx.drawImage(birdImg, -bW / 2, -bH / 2, bW, bH);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();

  if (birdGrowTimer > 0) {
    const t = birdGrowTimer / GROW_FRAMES;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bW / 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251,146,60,${t * 0.8})`;
    ctx.lineWidth = 4 + t * 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bW / 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(248,113,113,${t * 0.4})`;
    ctx.lineWidth = 2 + t * 4;
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  particles.forEach(pt => {
    ctx.save();
    ctx.globalAlpha = pt.life;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fillStyle = pt.color;
    ctx.fill();
    ctx.restore();
  });
}

function drawScore() {
  ctx.save();
  ctx.font = "bold 36px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(score, W / 2 + 2, 78);
  const cfg = DIFFICULTIES[currentDiff];
  const sg = ctx.createLinearGradient(W / 2 - 40, 40, W / 2 + 40, 80);
  sg.addColorStop(0, cfg.color);
  sg.addColorStop(1, "#f59e0b");
  ctx.fillStyle = sg;
  ctx.fillText(score, W / 2, 76);
  ctx.restore();
}

function drawIdleHint() {
  if (state !== "idle") return;
  const t = Date.now() / 600;
  const bobY = Math.sin(t) * 10;
  ctx.save();
  ctx.font = "11px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(245,210,80,${0.6 + 0.4 * Math.abs(Math.sin(t))})`;
  ctx.fillText("TAP  OR  SPACE", W / 2, 430 + bobY);
  ctx.restore();
}

function drawWatermark() {
  ctx.save();
  ctx.font = "bold 10px 'Press Start 2P', monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText("created by Harshsharma-dev", W - 9, H - 11);
  ctx.fillStyle = "rgba(192,132,252,0.5)";
  ctx.fillText("created by Harshsharma-dev", W - 10, H - 12);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  pipes.forEach(drawPipe);
  drawGround();
  drawParticles();
  drawBird();
  if (state === "playing" || state === "dead") drawScore();
  if (state === "playing") drawDiffBadge();
  drawIdleHint();
  drawWatermark();
}

function loop() {
  animFrame = requestAnimationFrame(loop);
  update();
  draw();
}

function idleLoop() {
  animFrame = requestAnimationFrame(idleLoop);
  bird.y = H / 2 + Math.sin(Date.now() / 600) * 16;
  stars.forEach(s => s.twinkle += 0.04);
  draw();
}

document.getElementById("startBtn").addEventListener("click", e => {
  e.stopPropagation(); startGame();
});
document.getElementById("restartBtn").addEventListener("click", e => {
  e.stopPropagation(); startGame();
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeGame();
  }, 100);
});

resizeGame();
idleLoop();