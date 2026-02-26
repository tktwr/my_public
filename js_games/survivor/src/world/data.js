export const WORLD_DATA = {
  virtualResolution: {
    width: 1280,
    height: 1280,
  },
  player: {
    radius: 18,
    speed: 320,
    maxHp: 5,
    hitInvulnerabilitySec: 0.65,
  },
  enemy: {
    radius: 16,
    speed: 118,
    contactDamage: 1,
    color: "#ff7f90",
  },
  spawn: {
    startDelaySec: 0.45,
    baseIntervalSec: 0.8,
    minIntervalSec: 0.2,
    accelerationPerSec: 0.018,
    minDistance: 460,
    maxDistance: 760,
    maxEnemies: 160,
  },
};
