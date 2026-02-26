import { WORLD_DATA } from "./world/data.js";

const VIRTUAL_WIDTH = WORLD_DATA.virtualResolution.width;
const VIRTUAL_HEIGHT = WORLD_DATA.virtualResolution.height;
const BG_COLOR = "#08101d";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const GRID_BOLD_COLOR = "rgba(255,255,255,0.12)";

const shell = document.getElementById("game-shell");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const hudRes = document.getElementById("hud-res");
const hudHp = document.getElementById("hud-hp");
const hudEnemies = document.getElementById("hud-enemies");
const hudKills = document.getElementById("hud-kills");
const hudLevel = document.getElementById("hud-level");
const hudTimer = document.getElementById("hud-timer");
const hudOwnedWeapons = document.getElementById("hud-owned-weapons");
const hudOwnedPassives = document.getElementById("hud-owned-passives");
const hudBestRun = document.getElementById("hud-best-run");
const pauseButton = document.getElementById("pause-button");
const touchLeft = document.getElementById("touch-left");
const joystickEl = document.getElementById("joystick");
const xpLabel = document.getElementById("xp-label");
const xpPickupLabel = document.getElementById("xp-pickup-label");
const xpBarFill = document.getElementById("xp-bar-fill");
const levelUpOverlay = document.getElementById("level-up-overlay");
const levelUpTitle = document.getElementById("levelup-title");
const levelUpChoiceButtons = Array.from(document.querySelectorAll(".levelup-choice"));
const gameOverOverlay = document.getElementById("game-over-overlay");
const resultTitle = document.getElementById("result-title");
const gameOverCopy = document.getElementById("game-over-copy");
const restartButton = document.getElementById("restart-button");
const settingsMuteButton = document.getElementById("settings-mute");
const settingsMasterVolume = document.getElementById("settings-master-volume");
const settingsMasterVolumeValue = document.getElementById("settings-master-volume-value");
const settingsSfxVolume = document.getElementById("settings-sfx-volume");
const settingsSfxVolumeValue = document.getElementById("settings-sfx-volume-value");

if (
  !ctx ||
  !hudRes ||
  !hudHp ||
  !hudEnemies ||
  !hudKills ||
  !hudLevel ||
  !hudTimer ||
  !hudOwnedWeapons ||
  !hudOwnedPassives ||
  !hudBestRun ||
  !pauseButton ||
  !touchLeft ||
  !joystickEl ||
  !xpLabel ||
  !xpPickupLabel ||
  !xpBarFill ||
  !levelUpOverlay ||
  !levelUpTitle ||
  levelUpChoiceButtons.length !== 3 ||
  !gameOverOverlay ||
  !resultTitle ||
  !gameOverCopy ||
  !restartButton ||
  !settingsMuteButton ||
  !settingsMasterVolume ||
  !settingsMasterVolumeValue ||
  !settingsSfxVolume ||
  !settingsSfxVolumeValue
) {
  throw new Error("Canvas2D context is not available.");
}

const WEAPON_DEFS_BY_ID = Object.fromEntries(WORLD_DATA.weaponDefs.map((def) => [def.id, def]));
const PASSIVE_DEFS_BY_ID = Object.fromEntries(WORLD_DATA.passiveDefs.map((def) => [def.id, def]));
const SAVE_KEY = "survivor_zero_dep_save_v1";

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
  gameOver: false,
  victory: false,
  elapsed: 0,
  player: {
    x: VIRTUAL_WIDTH * 0.5,
    y: VIRTUAL_HEIGHT * 0.5,
    radius: WORLD_DATA.player.radius,
    speed: WORLD_DATA.player.speed,
    hp: WORLD_DATA.player.maxHp,
    maxHp: WORLD_DATA.player.maxHp,
    hitCooldown: 0,
    facingX: 1,
    facingY: 0,
  },
  spawn: {
    timer: WORLD_DATA.spawn.startDelaySec,
  },
  weapon: {
    fireCooldown: 0,
    globalDamageMul: 1,
    globalHasteMul: 1,
    globalProjectileSpeedMul: 1,
    globalProjectileSizeMul: 1,
  },
  weaponRuntime: {},
  enemies: [],
  projectiles: [],
  xpGems: [],
  nextEnemyId: 1,
  nearestEnemyId: null,
  kills: 0,
  progression: {
    level: 1,
    xp: 0,
    xpToNext: WORLD_DATA.xp.levelBaseXp,
    levelUpActive: false,
    choices: [],
    pickupRadius: WORLD_DATA.xp.pickupBaseRadius,
    weaponLevels: {},
    passiveLevels: {},
    damageTakenMul: 1,
  },
  stage: {
    durationSec: WORLD_DATA.stage.durationSec,
  },
  settings: {
    mute: false,
    masterVolume: 80,
    sfxVolume: 80,
  },
  bestRun: {
    bestTimeSec: 0,
    bestLevel: 1,
    bestKills: 0,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(whole / 60);
  const ss = whole % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function safeReadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable or full; fail silently to avoid console errors.
  }
}

function serializeSave() {
  return {
    settings: {
      mute: !!state.settings.mute,
      masterVolume: clamp(Math.round(state.settings.masterVolume), 0, 100),
      sfxVolume: clamp(Math.round(state.settings.sfxVolume), 0, 100),
    },
    bestRun: {
      bestTimeSec: Math.max(0, Math.floor(state.bestRun.bestTimeSec)),
      bestLevel: Math.max(1, Math.floor(state.bestRun.bestLevel)),
      bestKills: Math.max(0, Math.floor(state.bestRun.bestKills)),
    },
  };
}

function savePersistentState() {
  safeWriteSave(serializeSave());
}

function applySettingsToUi() {
  settingsMuteButton.dataset.on = String(state.settings.mute);
  settingsMuteButton.textContent = state.settings.mute ? "On" : "Off";

  settingsMasterVolume.value = String(state.settings.masterVolume);
  settingsMasterVolumeValue.textContent = String(state.settings.masterVolume);

  settingsSfxVolume.value = String(state.settings.sfxVolume);
  settingsSfxVolumeValue.textContent = String(state.settings.sfxVolume);
}

function loadPersistentState() {
  const saved = safeReadSave();
  if (!saved) {
    applySettingsToUi();
    return;
  }

  const s = saved.settings;
  if (s && typeof s === "object") {
    state.settings.mute = !!s.mute;
    if (typeof s.masterVolume === "number") state.settings.masterVolume = clamp(Math.round(s.masterVolume), 0, 100);
    if (typeof s.sfxVolume === "number") state.settings.sfxVolume = clamp(Math.round(s.sfxVolume), 0, 100);
  }

  const b = saved.bestRun;
  if (b && typeof b === "object") {
    if (typeof b.bestTimeSec === "number") state.bestRun.bestTimeSec = Math.max(0, b.bestTimeSec);
    if (typeof b.bestLevel === "number") state.bestRun.bestLevel = Math.max(1, Math.floor(b.bestLevel));
    if (typeof b.bestKills === "number") state.bestRun.bestKills = Math.max(0, Math.floor(b.bestKills));
  }

  applySettingsToUi();
}

function formatBestRunLine() {
  return `Time ${formatClock(state.bestRun.bestTimeSec)} / Lv ${state.bestRun.bestLevel} / Kills ${state.bestRun.bestKills}`;
}

function updateBestRunStatsForCurrentRun() {
  let changed = false;
  if (state.elapsed > state.bestRun.bestTimeSec) {
    state.bestRun.bestTimeSec = state.elapsed;
    changed = true;
  }
  if (state.progression.level > state.bestRun.bestLevel) {
    state.bestRun.bestLevel = state.progression.level;
    changed = true;
  }
  if (state.kills > state.bestRun.bestKills) {
    state.bestRun.bestKills = state.kills;
    changed = true;
  }
  if (changed) savePersistentState();
}

function getStageProgress01() {
  return clamp(state.elapsed / state.stage.durationSec, 0, 1);
}

function getDifficultyFactor() {
  // Smooth early ramp, stronger later ramp.
  const p = getStageProgress01();
  return p * p * 0.55 + p * 0.45;
}

function isRunEnded() {
  return state.gameOver || state.victory;
}

function canTogglePause() {
  return !isRunEnded() && !state.progression.levelUpActive;
}

function setPaused(nextPaused) {
  state.paused = !!nextPaused;
}

function togglePause() {
  if (!canTogglePause()) return;
  setPaused(!state.paused);
  updateHud();
}

function isSimulationPaused() {
  return isRunEnded() || state.paused || state.progression.levelUpActive;
}

function getXpForLevel(level) {
  return WORLD_DATA.xp.levelBaseXp + (level - 1) * WORLD_DATA.xp.levelStepXp;
}

function getWeaponLevel(id) {
  return state.progression.weaponLevels[id] || 0;
}

function getPassiveLevel(id) {
  return state.progression.passiveLevels[id] || 0;
}

function getWeaponLevelData(id, level = getWeaponLevel(id)) {
  const def = WEAPON_DEFS_BY_ID[id];
  if (!def || level <= 0) return null;
  return def.levels[level - 1] || null;
}

function getOwnedWeaponIds() {
  return WORLD_DATA.weaponDefs
    .map((def) => def.id)
    .filter((id) => getWeaponLevel(id) > 0);
}

function getOwnedPassiveIds() {
  return WORLD_DATA.passiveDefs
    .map((def) => def.id)
    .filter((id) => getPassiveLevel(id) > 0);
}

function formatOwnedList(ids, defsById, getLevelFn, emptyText = "None") {
  if (ids.length === 0) return emptyText;
  return ids.map((id) => `${defsById[id].label} Lv${getLevelFn(id)}`).join(" / ");
}

function updateHud() {
  hudHp.textContent = `HP ${state.player.hp}/${state.player.maxHp}`;
  hudEnemies.textContent = `Enemies ${state.enemies.length}`;
  hudKills.textContent = `Kills ${state.kills}`;
  hudLevel.textContent = `Lv ${state.progression.level}`;
  hudTimer.textContent = formatClock(Math.max(0, state.stage.durationSec - state.elapsed));
  hudOwnedWeapons.textContent = formatOwnedList(getOwnedWeaponIds(), WEAPON_DEFS_BY_ID, getWeaponLevel, "None");
  hudOwnedPassives.textContent = formatOwnedList(getOwnedPassiveIds(), PASSIVE_DEFS_BY_ID, getPassiveLevel, "None");
  hudBestRun.textContent = formatBestRunLine();
  pauseButton.dataset.paused = String(state.paused);
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
  xpLabel.textContent = `XP ${state.progression.xp} / ${state.progression.xpToNext}`;
  xpPickupLabel.textContent = `Pickup ${Math.round(state.progression.pickupRadius)}`;
  xpBarFill.style.width = `${(state.progression.xpToNext > 0 ? (state.progression.xp / state.progression.xpToNext) : 0) * 100}%`;
}

function setGameOverOverlayVisible(visible) {
  gameOverOverlay.classList.toggle("visible", visible);
}

function showResultOverlay(title, copy) {
  resultTitle.textContent = title;
  gameOverCopy.textContent = copy;
  setGameOverOverlayVisible(true);
}

function setLevelUpOverlayVisible(visible) {
  levelUpOverlay.classList.toggle("visible", visible);
}

function fillLevelUpChoicesUI() {
  levelUpTitle.textContent = `LEVEL UP  Lv ${state.progression.level}`;
  for (let i = 0; i < levelUpChoiceButtons.length; i += 1) {
    const button = levelUpChoiceButtons[i];
    const choice = state.progression.choices[i];
    const nameEl = button.querySelector(".levelup-name");
    const descEl = button.querySelector(".levelup-desc");
    if (!nameEl || !descEl) continue;
    if (choice) {
      nameEl.textContent = choice.label;
      descEl.textContent = choice.desc;
      button.disabled = false;
    } else {
      nameEl.textContent = "-";
      descEl.textContent = "-";
      button.disabled = true;
    }
  }
}

function ensureWeaponRuntime(id) {
  if (!state.weaponRuntime[id]) {
    state.weaponRuntime[id] = { cooldown: 0 };
  }
  return state.weaponRuntime[id];
}

function rebuildPassiveDerivedStats() {
  state.weapon.globalDamageMul = 1;
  state.weapon.globalHasteMul = 1;
  state.weapon.globalProjectileSpeedMul = 1;
  state.weapon.globalProjectileSizeMul = 1;
  state.progression.pickupRadius = WORLD_DATA.xp.pickupBaseRadius;
  state.progression.damageTakenMul = 1;

  state.player.speed = WORLD_DATA.player.speed;
  const prevMaxHp = state.player.maxHp;
  state.player.maxHp = WORLD_DATA.player.maxHp;

  for (const def of WORLD_DATA.passiveDefs) {
    const level = getPassiveLevel(def.id);
    for (let i = 0; i < level; i += 1) {
      const lv = def.levels[i];
      if (!lv) continue;
      if (lv.damageMul) state.weapon.globalDamageMul *= lv.damageMul;
      if (lv.hasteMul) state.weapon.globalHasteMul *= lv.hasteMul;
      if (lv.moveSpeedMul) state.player.speed *= lv.moveSpeedMul;
      if (lv.maxHpAdd) state.player.maxHp += lv.maxHpAdd;
      if (lv.magnetAdd) state.progression.pickupRadius += lv.magnetAdd;
      if (lv.projectileSpeedMul) state.weapon.globalProjectileSpeedMul *= lv.projectileSpeedMul;
      if (lv.projectileSizeMul) state.weapon.globalProjectileSizeMul *= lv.projectileSizeMul;
      if (lv.damageTakenMul) state.progression.damageTakenMul *= lv.damageTakenMul;
    }
  }

  if (state.player.maxHp !== prevMaxHp) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp);
  }
}

function grantWeaponLevel(id) {
  const def = WEAPON_DEFS_BY_ID[id];
  if (!def) return;
  const current = getWeaponLevel(id);
  if (current >= def.maxLevel) return;
  state.progression.weaponLevels[id] = current + 1;
  ensureWeaponRuntime(id);
}

function grantPassiveLevel(id) {
  const def = PASSIVE_DEFS_BY_ID[id];
  if (!def) return;
  const current = getPassiveLevel(id);
  if (current >= def.maxLevel) return;
  const nextLevelIndex = current;
  state.progression.passiveLevels[id] = current + 1;
  rebuildPassiveDerivedStats();
  const lv = def.levels[nextLevelIndex];
  if (lv?.heal) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + lv.heal);
  }
}

function rollUpgradeChoices() {
  const pool = [];

  for (const def of WORLD_DATA.weaponDefs) {
    const level = getWeaponLevel(def.id);
    if (level >= def.maxLevel) continue;
    const nextLevel = level + 1;
    pool.push({
      category: "weapon",
      id: def.id,
      label: level === 0 ? `Unlock ${def.label}` : `${def.label} Lv${nextLevel}`,
      desc: level === 0 ? def.baseDesc : `Upgrade to Lv${nextLevel}`,
    });
  }

  for (const def of WORLD_DATA.passiveDefs) {
    const level = getPassiveLevel(def.id);
    if (level >= def.maxLevel) continue;
    const nextLevel = level + 1;
    pool.push({
      category: "passive",
      id: def.id,
      label: `${def.label} Lv${nextLevel}`,
      desc: def.baseDesc,
    });
  }

  const picks = [];
  for (let i = 0; i < 3 && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  state.progression.choices = picks;
  fillLevelUpChoicesUI();
  return picks.length;
}

function enterLevelUp() {
  const count = rollUpgradeChoices();
  if (count <= 0) {
    state.progression.levelUpActive = false;
    state.progression.choices = [];
    setLevelUpOverlayVisible(false);
    return;
  }
  state.progression.levelUpActive = true;
  setLevelUpOverlayVisible(true);
}

function applyUpgrade(choice) {
  if (!choice) return;
  if (choice.category === "weapon") {
    grantWeaponLevel(choice.id);
    return;
  }
  if (choice.category === "passive") {
    grantPassiveLevel(choice.id);
  }
}

function chooseLevelUp(index) {
  if (!state.progression.levelUpActive) return;
  const choice = state.progression.choices[index];
  if (!choice) return;
  applyUpgrade(choice);
  state.progression.levelUpActive = false;
  state.progression.choices = [];
  setLevelUpOverlayVisible(false);
  updateHud();
}

function grantXp(amount) {
  state.progression.xp += amount;
  while (state.progression.xp >= state.progression.xpToNext) {
    state.progression.xp -= state.progression.xpToNext;
    state.progression.level += 1;
    state.progression.xpToNext = getXpForLevel(state.progression.level);
    if (!state.progression.levelUpActive) {
      enterLevelUp();
    }
  }
}

function resetGame() {
  state.paused = false;
  state.gameOver = false;
  state.victory = false;
  state.elapsed = 0;
  state.spawn.timer = WORLD_DATA.spawn.startDelaySec;
  state.weapon.fireCooldown = 0;
  state.weaponRuntime = {};
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.xpGems.length = 0;
  state.nextEnemyId = 1;
  state.nearestEnemyId = null;
  state.kills = 0;
  state.progression.level = 1;
  state.progression.xp = 0;
  state.progression.xpToNext = getXpForLevel(1);
  state.progression.levelUpActive = false;
  state.progression.choices = [];
  state.progression.pickupRadius = WORLD_DATA.xp.pickupBaseRadius;
  state.progression.weaponLevels = {};
  state.progression.passiveLevels = {};
  state.progression.damageTakenMul = 1;
  state.player.x = VIRTUAL_WIDTH * 0.5;
  state.player.y = VIRTUAL_HEIGHT * 0.5;
  state.player.speed = WORLD_DATA.player.speed;
  state.player.maxHp = WORLD_DATA.player.maxHp;
  state.player.hp = WORLD_DATA.player.maxHp;
  state.player.hitCooldown = 0;
  state.player.facingX = 1;
  state.player.facingY = 0;
  state.weapon.globalDamageMul = 1;
  state.weapon.globalHasteMul = 1;
  state.weapon.globalProjectileSpeedMul = 1;
  state.weapon.globalProjectileSizeMul = 1;

  // Start with the basic weapon unlocked.
  grantWeaponLevel(WORLD_DATA.weaponDefs[0].id);
  rebuildPassiveDerivedStats();

  input.touch.active = false;
  input.touch.pointerId = null;
  input.touch.nx = 0;
  input.touch.ny = 0;
  joystickEl.style.display = "none";
  setGameOverOverlayVisible(false);
  setLevelUpOverlayVisible(false);
  updateHud();
}

function triggerGameOver() {
  if (isRunEnded()) return;
  state.gameOver = true;
  state.paused = false;
  state.progression.levelUpActive = false;
  setLevelUpOverlayVisible(false);
  updateBestRunStatsForCurrentRun();
  showResultOverlay(
    "GAME OVER",
    `Time ${formatClock(state.elapsed)}  |  Lv ${state.progression.level}  |  Kills ${state.kills}`,
  );
}

function triggerVictory() {
  if (isRunEnded()) return;
  state.victory = true;
  state.paused = false;
  state.progression.levelUpActive = false;
  setLevelUpOverlayVisible(false);
  updateBestRunStatsForCurrentRun();
  showResultOverlay(
    "VICTORY",
    `Time ${formatClock(state.stage.durationSec)}  |  Lv ${state.progression.level}  |  Kills ${state.kills}`,
  );
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
  if (isRunEnded() && pressed && (code === "KeyR" || code === "Enter" || code === "Space")) {
    resetGame();
    return;
  }
  if (state.progression.levelUpActive && pressed) {
    if (code === "Digit1") chooseLevelUp(0);
    if (code === "Digit2") chooseLevelUp(1);
    if (code === "Digit3") chooseLevelUp(2);
    if (code.startsWith("Digit")) return;
  }
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
      if (pressed) togglePause();
      break;
    default:
      break;
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Digit1", "Digit2", "Digit3"].includes(event.code)) {
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
  if (state.gameOver || state.progression.levelUpActive) return;
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
  if (state.gameOver || state.progression.levelUpActive) return { x: 0, y: 0 };
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

function getSpawnInterval() {
  const s = WORLD_DATA.spawn;
  return clamp(
    s.baseIntervalSec - state.elapsed * s.accelerationPerSec,
    s.minIntervalSec,
    s.baseIntervalSec,
  );
}

function spawnEnemy() {
  if (state.enemies.length >= WORLD_DATA.spawn.maxEnemies) return;

  const diff = getDifficultyFactor();
  const hpScale = 1 + diff * (WORLD_DATA.stage.enemyHpScaleAtEnd - 1);
  const speedScale = 1 + diff * (WORLD_DATA.stage.enemySpeedScaleAtEnd - 1);
  const damageScale = 1 + diff * (WORLD_DATA.stage.enemyDamageScaleAtEnd - 1);
  const angle = Math.random() * Math.PI * 2;
  const distance = WORLD_DATA.spawn.minDistance + Math.random() * (WORLD_DATA.spawn.maxDistance - WORLD_DATA.spawn.minDistance);
  const enemy = {
    id: state.nextEnemyId++,
    x: clamp(state.player.x + Math.cos(angle) * distance, WORLD_DATA.enemy.radius, VIRTUAL_WIDTH - WORLD_DATA.enemy.radius),
    y: clamp(state.player.y + Math.sin(angle) * distance, WORLD_DATA.enemy.radius, VIRTUAL_HEIGHT - WORLD_DATA.enemy.radius),
    radius: WORLD_DATA.enemy.radius,
    speed: WORLD_DATA.enemy.speed * speedScale * (0.92 + Math.random() * 0.22),
    hp: Math.max(1, Math.round(WORLD_DATA.enemy.maxHp * hpScale)),
    maxHp: Math.max(1, Math.round(WORLD_DATA.enemy.maxHp * hpScale)),
    damage: Math.max(1, Math.round(WORLD_DATA.enemy.contactDamage * damageScale)),
    color: WORLD_DATA.enemy.color,
  };

  // Ensure the spawn stays meaningfully away from the player after edge clamping.
  const dx = enemy.x - state.player.x;
  const dy = enemy.y - state.player.y;
  const minGap = 150;
  const len = Math.hypot(dx, dy);
  if (len < minGap) {
    if (len > 0) {
      const ratio = minGap / len;
      enemy.x = clamp(state.player.x + dx * ratio, enemy.radius, VIRTUAL_WIDTH - enemy.radius);
      enemy.y = clamp(state.player.y + dy * ratio, enemy.radius, VIRTUAL_HEIGHT - enemy.radius);
    } else {
      enemy.x = clamp(state.player.x + minGap, enemy.radius, VIRTUAL_WIDTH - enemy.radius);
    }
  }

  state.enemies.push(enemy);
}

function updateSpawnSystem(dt) {
  if (isSimulationPaused()) return;
  state.spawn.timer -= dt;

  const interval = getSpawnInterval();
  let spawnGuard = 0;
  while (state.spawn.timer <= 0 && spawnGuard < 8) {
    spawnEnemy();
    state.spawn.timer += interval;
    spawnGuard += 1;
  }
}

function updateMovementSystem(dt) {
  if (isSimulationPaused()) return;

  state.elapsed += dt;
  const move = getMoveInput();
  if (move.x !== 0 || move.y !== 0) {
    state.player.facingX = move.x;
    state.player.facingY = move.y;
  }
  state.player.x += move.x * state.player.speed * dt;
  state.player.y += move.y * state.player.speed * dt;

  state.player.x = clamp(state.player.x, state.player.radius, VIRTUAL_WIDTH - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, VIRTUAL_HEIGHT - state.player.radius);

  for (const enemy of state.enemies) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.0001) {
      enemy.x += (dx / len) * enemy.speed * dt;
      enemy.y += (dy / len) * enemy.speed * dt;
    }
  }
}

function updateCombatSystem(dt) {
  if (isSimulationPaused()) return;

  if (state.player.hitCooldown > 0) {
    state.player.hitCooldown = Math.max(0, state.player.hitCooldown - dt);
  }

  for (const enemy of state.enemies) {
    if (!circlesOverlap(state.player, enemy)) continue;
    if (state.player.hitCooldown > 0) break;

    const dealt = Math.max(1, Math.round(enemy.damage * state.progression.damageTakenMul));
    state.player.hp = Math.max(0, state.player.hp - dealt);
    state.player.hitCooldown = WORLD_DATA.player.hitInvulnerabilitySec;
    if (state.player.hp <= 0) {
      triggerGameOver();
    }
    break;
  }
}

function updateTargetingSystem() {
  let best = null;
  let bestDistSq = Infinity;
  for (const enemy of state.enemies) {
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = enemy;
    }
  }
  state.nearestEnemyId = best ? best.id : null;
}

function spawnXpGem(x, y, value = WORLD_DATA.xp.gemValue) {
  state.xpGems.push({
    x,
    y,
    radius: WORLD_DATA.xp.gemRadius,
    value,
    color: WORLD_DATA.xp.gemColor,
  });
}

function getNearestEnemy() {
  if (state.nearestEnemyId == null) return null;
  for (const enemy of state.enemies) {
    if (enemy.id === state.nearestEnemyId) return enemy;
  }
  return null;
}

function getEffectiveShotStats(levelData) {
  return {
    damage: levelData.damage * state.weapon.globalDamageMul,
    speed: levelData.speed * state.weapon.globalProjectileSpeedMul,
    radius: levelData.size * state.weapon.globalProjectileSizeMul,
    life: levelData.life,
    color: levelData.color,
  };
}

function spawnProjectileAtAngle(angle, shotStats, spawnDistance = null, originX = state.player.x, originY = state.player.y) {
  const distanceFromOrigin = spawnDistance ?? (state.player.radius + shotStats.radius + 2);
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  state.projectiles.push({
    x: originX + nx * distanceFromOrigin,
    y: originY + ny * distanceFromOrigin,
    vx: nx * shotStats.speed,
    vy: ny * shotStats.speed,
    radius: shotStats.radius,
    damage: shotStats.damage,
    life: shotStats.life,
    color: shotStats.color,
  });
  if (state.projectiles.length > 700) {
    state.projectiles.splice(0, state.projectiles.length - 700);
  }
}

function aimAtTarget(target) {
  if (!target) return null;
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return null;
  const angle = Math.atan2(dy, dx);
  state.player.facingX = dx / len;
  state.player.facingY = dy / len;
  return { angle, dx, dy, len };
}

function fireWeapon(def, levelData, runtime, target) {
  const shot = getEffectiveShotStats(levelData);
  const aimed = aimAtTarget(target);

  switch (def.kind) {
    case "target_single":
    case "heavy_single": {
      if (!aimed) return false;
      spawnProjectileAtAngle(aimed.angle, shot);
      return true;
    }
    case "target_dual": {
      if (!aimed) return false;
      const lane = levelData.laneOffset ?? 10;
      const px = -Math.sin(aimed.angle);
      const py = Math.cos(aimed.angle);
      const spawnDist = state.player.radius + shot.radius + 2;
      spawnProjectileAtAngle(
        aimed.angle,
        shot,
        spawnDist,
        state.player.x + px * lane,
        state.player.y + py * lane,
      );
      spawnProjectileAtAngle(
        aimed.angle,
        shot,
        spawnDist,
        state.player.x - px * lane,
        state.player.y - py * lane,
      );
      return true;
    }
    case "target_spread": {
      if (!aimed) return false;
      const shots = levelData.shots ?? 3;
      const spreadRad = ((levelData.spreadDeg ?? 20) * Math.PI) / 180;
      const step = shots > 1 ? spreadRad / (shots - 1) : 0;
      const start = aimed.angle - spreadRad * 0.5;
      for (let i = 0; i < shots; i += 1) {
        spawnProjectileAtAngle(start + step * i, shot);
      }
      return true;
    }
    case "radial_burst": {
      const shots = levelData.shots ?? 8;
      const start = (runtime.spinOffset || 0) % (Math.PI * 2);
      const step = (Math.PI * 2) / shots;
      for (let i = 0; i < shots; i += 1) {
        spawnProjectileAtAngle(start + i * step, shot);
      }
      runtime.spinOffset = start + 0.19;
      return true;
    }
    default:
      return false;
  }
}

function updateWeaponSystem(dt) {
  if (isSimulationPaused()) return;

  const target = getNearestEnemy();
  const ownedIds = getOwnedWeaponIds();
  for (const id of ownedIds) {
    const def = WEAPON_DEFS_BY_ID[id];
    const level = getWeaponLevel(id);
    const levelData = getWeaponLevelData(id, level);
    if (!def || !levelData) continue;

    const runtime = ensureWeaponRuntime(id);
    if (runtime.cooldown > 0) {
      runtime.cooldown = Math.max(0, runtime.cooldown - dt);
    }
    if (runtime.cooldown > 0) continue;

    const fired = fireWeapon(def, levelData, runtime, target);
    if (!fired) continue;

    const interval = (levelData.interval || 1) / Math.max(0.2, state.weapon.globalHasteMul);
    runtime.cooldown = Math.max(0.05, interval);
  }
}

function updateProjectileSystem(dt) {
  if (isSimulationPaused()) return;

  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const proj = state.projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;

    const outOfBounds =
      proj.x < -40 || proj.y < -40 || proj.x > VIRTUAL_WIDTH + 40 || proj.y > VIRTUAL_HEIGHT + 40;
    if (proj.life <= 0 || outOfBounds) {
      state.projectiles.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (!circlesOverlap(proj, enemy)) continue;

      enemy.hp -= proj.damage;
      hit = true;
      if (enemy.hp <= 0) {
        spawnXpGem(enemy.x, enemy.y, WORLD_DATA.xp.gemValue);
        state.enemies.splice(j, 1);
        state.kills += 1;
      }
      break;
    }

    if (hit) {
      state.projectiles.splice(i, 1);
    }
  }
}

function updateXpSystem(dt) {
  if (isSimulationPaused()) return;

  const collectRadius = state.player.radius + state.progression.pickupRadius;
  const attractRadius = collectRadius + WORLD_DATA.xp.pickupAttractRadius;

  for (let i = state.xpGems.length - 1; i >= 0; i -= 1) {
    const gem = state.xpGems[i];
    const dx = state.player.x - gem.x;
    const dy = state.player.y - gem.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= collectRadius + gem.radius) {
      grantXp(gem.value);
      state.xpGems.splice(i, 1);
      continue;
    }

    if (dist <= attractRadius && dist > 0.0001) {
      const speed = WORLD_DATA.xp.pickupSpeed + (1 - Math.min(1, dist / attractRadius)) * 260;
      gem.x += (dx / dist) * speed * dt;
      gem.y += (dy / dist) * speed * dt;
    }
  }
}

function update(dt) {
  updateSpawnSystem(dt);
  updateMovementSystem(dt);
  if (!isRunEnded() && state.elapsed >= state.stage.durationSec) {
    state.elapsed = state.stage.durationSec;
    triggerVictory();
    updateHud();
    return;
  }
  updateTargetingSystem();
  updateWeaponSystem(dt);
  updateProjectileSystem(dt);
  updateXpSystem(dt);
  updateCombatSystem(dt);
  updateTargetingSystem();
  updateHud();
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
  const hurtFlash = state.player.hitCooldown > 0 && Math.floor(state.player.hitCooldown * 18) % 2 === 0;

  ctx.fillStyle = hurtFlash ? "#ffb4be" : "#63f0b2";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  const aimLen = p.radius + 12;
  const facingLen = Math.hypot(p.facingX, p.facingY) || 1;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(
    p.x + (p.facingX / facingLen) * aimLen,
    p.y + (p.facingY / facingLen) * aimLen,
  );
  ctx.stroke();

  if (state.player.hitCooldown > 0) {
    ctx.strokeStyle = "rgba(255, 180, 190, 0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies() {
  let targetEnemy = null;
  for (const enemy of state.enemies) {
    if (enemy.id === state.nearestEnemyId) targetEnemy = enemy;
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    const hpRatio = enemy.hp / enemy.maxHp;
    const barW = 24;
    const barH = 4;
    const bx = enemy.x - barW / 2;
    const by = enemy.y - enemy.radius - 10;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? "#ffd56b" : "#ff9ba8";
    ctx.fillRect(bx, by, barW * hpRatio, barH);
  }

  if (!targetEnemy) return;

  ctx.strokeStyle = "rgba(255, 213, 107, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(targetEnemy.x, targetEnemy.y, targetEnemy.radius + 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 213, 107, 0.35)";
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(targetEnemy.x, targetEnemy.y);
  ctx.stroke();
}

function drawProjectiles() {
  for (const proj of state.projectiles) {
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawXpGems() {
  for (const gem of state.xpGems) {
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, gem.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, gem.radius + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayerHpBar() {
  const p = state.player;
  const width = 56;
  const height = 7;
  const x = p.x - width / 2;
  const y = p.y - p.radius - 18;
  const ratio = p.hp / p.maxHp;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = ratio > 0.4 ? "#63f0b2" : "#ff8a99";
  ctx.fillRect(x, y, width * ratio, height);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scalePx = viewport.scale * viewport.dpr;
  ctx.setTransform(scalePx, 0, 0, scalePx, 0, 0);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  drawGrid();
  drawEnemies();
  drawProjectiles();
  drawXpGems();
  drawPlayer();
  drawPlayerHpBar();

  if (!state.gameOver) {
    ctx.strokeStyle = "rgba(99,192,255,0.16)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.radius + state.progression.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  if (state.victory) {
    ctx.fillStyle = "rgba(99, 240, 178, 0.09)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  if (state.progression.levelUpActive) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
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

restartButton.addEventListener("click", () => {
  resetGame();
});

settingsMuteButton.addEventListener("click", () => {
  state.settings.mute = !state.settings.mute;
  applySettingsToUi();
  savePersistentState();
});

settingsMasterVolume.addEventListener("input", () => {
  state.settings.masterVolume = clamp(Number(settingsMasterVolume.value) || 0, 0, 100);
  settingsMasterVolumeValue.textContent = String(state.settings.masterVolume);
  savePersistentState();
});

settingsSfxVolume.addEventListener("input", () => {
  state.settings.sfxVolume = clamp(Number(settingsSfxVolume.value) || 0, 0, 100);
  settingsSfxVolumeValue.textContent = String(state.settings.sfxVolume);
  savePersistentState();
});

for (const button of levelUpChoiceButtons) {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.upgradeIndex);
    if (Number.isFinite(index)) chooseLevelUp(index);
  });
}

loadPersistentState();
resetGame();
requestAnimationFrame(frame);
