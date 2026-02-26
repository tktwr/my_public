const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 1280;
const BG_COLOR = "#08101d";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const GRID_BOLD_COLOR = "rgba(255,255,255,0.12)";

const shell = document.getElementById("game-shell");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const hudRes = document.getElementById("hud-res");
const touchLeft = document.getElementById("touch-left");
const joystickEl = document.getElementById("joystick");

if (!ctx) {
  throw new Error("Canvas2D context is not available.");
}

const viewport = {
  cssWidth: 0,
  cssHeight: 0,
  dpr: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const input = {
  keys: {
    left: false,
    right: false,
    up: false,
    down: false,
  },
  touch: {
    pointerId: null,
    active: false,
    centerX: 0,
    centerY: 0,
    x: 0,
    y: 0,
    nx: 0,
    ny: 0,
    radius: 54,
  },
};

const state = {
  paused: false,
  elapsed: 0,
  player: {
    x: VIRTUAL_WIDTH * 0.5,
    y: VIRTUAL_HEIGHT * 0.5,
    radius: 18,
    speed: 320,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resize() {
  const rect = shell.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
  const scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
  const drawWidth = Math.round(VIRTUAL_WIDTH * scale);
  const drawHeight = Math.round(VIRTUAL_HEIGHT * scale);
  const offsetX = Math.floor((width - drawWidth) * 0.5);
  const offsetY = Math.floor((height - drawHeight) * 0.5);

  viewport.cssWidth = width;
  viewport.cssHeight = height;
  viewport.dpr = dpr;
  viewport.scale = scale;
  viewport.offsetX = offsetX;
  viewport.offsetY = offsetY;

  canvas.style.width = `${drawWidth}px`;
  canvas.style.height = `${drawHeight}px`;
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;

  canvas.width = Math.max(1, Math.round(drawWidth * dpr));
  canvas.height = Math.max(1, Math.round(drawHeight * dpr));

  hudRes.textContent = `${VIRTUAL_WIDTH}x${VIRTUAL_HEIGHT} @ ${dpr.toFixed(2)}x`;
}

function setKey(code, pressed) {
  switch (code) {
    case "KeyA":
    case "ArrowLeft":
      input.keys.left = pressed;
      break;
    case "KeyD":
    case "ArrowRight":
      input.keys.right = pressed;
      break;
    case "KeyW":
    case "ArrowUp":
      input.keys.up = pressed;
      break;
    case "KeyS":
    case "ArrowDown":
      input.keys.down = pressed;
      break;
    case "Escape":
      if (pressed) state.paused = !state.paused;
      break;
    default:
      break;
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  setKey(event.code, true);
});

window.addEventListener("keyup", (event) => {
  setKey(event.code, false);
});

window.addEventListener("blur", () => {
  input.keys.left = false;
  input.keys.right = false;
  input.keys.up = false;
  input.keys.down = false;
});

function updateJoystickVisual() {
  if (!input.touch.active) {
    joystickEl.style.display = "none";
    return;
  }
  joystickEl.style.display = "block";
  joystickEl.style.left = `${input.touch.centerX}px`;
  joystickEl.style.top = `${input.touch.centerY}px`;
  joystickEl.style.setProperty("--knob-x", `${input.touch.x - input.touch.centerX}px`);
  joystickEl.style.setProperty("--knob-y", `${input.touch.y - input.touch.centerY}px`);
}

function setTouchVector(clientX, clientY) {
  const dx = clientX - input.touch.centerX;
  const dy = clientY - input.touch.centerY;
  const distance = Math.hypot(dx, dy);
  const radius = input.touch.radius;

  if (distance > radius && distance > 0) {
    const ratio = radius / distance;
    input.touch.x = input.touch.centerX + dx * ratio;
    input.touch.y = input.touch.centerY + dy * ratio;
  } else {
    input.touch.x = clientX;
    input.touch.y = clientY;
  }

  const vx = input.touch.x - input.touch.centerX;
  const vy = input.touch.y - input.touch.centerY;
  const len = Math.hypot(vx, vy);
  if (len > 0) {
    input.touch.nx = vx / radius;
    input.touch.ny = vy / radius;
  } else {
    input.touch.nx = 0;
    input.touch.ny = 0;
  }
  updateJoystickVisual();
}

touchLeft.addEventListener("pointerdown", (event) => {
  if (input.touch.active) return;
  input.touch.pointerId = event.pointerId;
  input.touch.active = true;
  input.touch.centerX = event.clientX;
  input.touch.centerY = event.clientY;
  input.touch.x = event.clientX;
  input.touch.y = event.clientY;
  input.touch.nx = 0;
  input.touch.ny = 0;
  touchLeft.setPointerCapture(event.pointerId);
  updateJoystickVisual();
});

touchLeft.addEventListener("pointermove", (event) => {
  if (!input.touch.active || event.pointerId !== input.touch.pointerId) return;
  setTouchVector(event.clientX, event.clientY);
});

function endTouch(event) {
  if (!input.touch.active || event.pointerId !== input.touch.pointerId) return;
  input.touch.active = false;
  input.touch.pointerId = null;
  input.touch.nx = 0;
  input.touch.ny = 0;
  joystickEl.style.display = "none";
}

touchLeft.addEventListener("pointerup", endTouch);
touchLeft.addEventListener("pointercancel", endTouch);

function getMoveInput() {
  let x = 0;
  let y = 0;
  if (input.keys.left) x -= 1;
  if (input.keys.right) x += 1;
  if (input.keys.up) y -= 1;
  if (input.keys.down) y += 1;

  x += input.touch.nx;
  y += input.touch.ny;

  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

function update(dt) {
  if (state.paused) return;

  state.elapsed += dt;
  const move = getMoveInput();
  state.player.x += move.x * state.player.speed * dt;
  state.player.y += move.y * state.player.speed * dt;

  state.player.x = clamp(state.player.x, state.player.radius, VIRTUAL_WIDTH - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, VIRTUAL_HEIGHT - state.player.radius);
}

function drawGrid() {
  const small = 40;
  const large = 200;
  const t = state.elapsed * 18;
  const ox = (-t * 0.35) % large;
  const oy = (-t * 0.22) % large;

  for (let x = ox - large; x <= VIRTUAL_WIDTH + large; x += small) {
    const bold = Math.round((x - ox) / small) % (large / small) === 0;
    ctx.strokeStyle = bold ? GRID_BOLD_COLOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(Math.floor(x) + 0.5, 0);
    ctx.lineTo(Math.floor(x) + 0.5, VIRTUAL_HEIGHT);
    ctx.stroke();
  }

  for (let y = oy - large; y <= VIRTUAL_HEIGHT + large; y += small) {
    const bold = Math.round((y - oy) / small) % (large / small) === 0;
    ctx.strokeStyle = bold ? GRID_BOLD_COLOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, Math.floor(y) + 0.5);
    ctx.lineTo(VIRTUAL_WIDTH, Math.floor(y) + 0.5);
    ctx.stroke();
  }
}

function drawPlayer() {
  const p = state.player;

  ctx.fillStyle = "#63f0b2";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + p.radius + 10, p.y);
  ctx.stroke();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scalePx = viewport.scale * viewport.dpr;
  ctx.setTransform(scalePx, 0, 0, scalePx, 0, 0);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  drawGrid();
  drawPlayer();

  if (state.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
  }
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(frame);
}

resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  // Orientation changes can lag viewport updates on mobile.
  setTimeout(resize, 50);
});

requestAnimationFrame(frame);
