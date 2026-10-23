import { readFileSync } from 'node:fs';

// 自动验证遗迹寻路关卡：
// 1. 每关必须是 15×8 格。
// 2. 每关必须存在武器 W 和守卫 G。
// 3. 必须能按“拿武器 -> 清守卫 -> 收碎片 -> 拿钥匙 -> 到出口”的顺序通关。
// 4. 每关地图内容不能完全重复，避免玩家感觉每关都一样。
const source = readFileSync(new URL('../src/data/levels.js', import.meta.url), 'utf8');
const levels = new Function(source.replace('export const LEVELS =', 'return '))();
const MAP_WIDTH = 15;
const MAP_HEIGHT = 8;
const directions = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

const positionKey = (x, y) => `${x},${y}`;

function solve(level) {
  const fragments = [];
  const keys = [];
  const guardians = [];
  let player;
  let door;
  let hasWeaponOnMap = false;
  level.map.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === 'P') player = { x, y };
    if (tile === 'C') fragments.push(positionKey(x, y));
    if (tile === 'W') hasWeaponOnMap = true;
    if (tile === 'G') guardians.push(positionKey(x, y));
    if (tile === 'K') keys.push(positionKey(x, y));
    if (tile === 'D') door = { x, y };
  }));

  if (!player || !door || fragments.length === 0 || !hasWeaponOnMap || guardians.length === 0 || keys.length === 0) return null;

  const fragmentIndex = new Map(fragments.map((key, index) => [key, index]));
  const keyIndex = new Map(keys.map((key, index) => [key, index]));
  const guardianIndex = new Map(guardians.map((key, index) => [key, index]));
  const allFragmentsMask = (1 << fragments.length) - 1;
  const allKeysMask = (1 << keys.length) - 1;
  const allGuardiansMask = (1 << guardians.length) - 1;
  const queue = [{ ...player, hasWeapon: false, fragmentsMask: 0, guardiansMask: 0, keysMask: 0, steps: 0 }];
  const visited = new Set([`${player.x},${player.y}|0|0|0|0`]);

  for (let index = 0; index < queue.length; index += 1) {
    const state = queue[index];
    if (state.x === door.x && state.y === door.y && state.fragmentsMask === allFragmentsMask && state.keysMask === allKeysMask) return state.steps;

    for (const direction of directions) {
      const x = state.x + direction.x;
      const y = state.y + direction.y;
      const tile = level.map[y]?.[x] ?? '#';
      if (tile === '#' || tile === 'T' || (tile === 'D' && state.keysMask !== allKeysMask)) continue;

      let hasWeapon = state.hasWeapon || tile === 'W';
      let fragmentsMask = state.fragmentsMask;
      let guardiansMask = state.guardiansMask;
      let keysMask = state.keysMask;
      const position = positionKey(x, y);
      const fragmentBit = fragmentIndex.get(position);
      if (fragmentBit !== undefined) fragmentsMask |= 1 << fragmentBit;
      const guardianBit = guardianIndex.get(position);
      if (guardianBit !== undefined) {
        if (!hasWeapon) continue;
        guardiansMask |= 1 << guardianBit;
      }
      const keyBit = keyIndex.get(position);
      if (keyBit !== undefined && guardiansMask === allGuardiansMask) keysMask |= 1 << keyBit;

      const signature = `${x},${y}|${Number(hasWeapon)}|${fragmentsMask}|${guardiansMask}|${keysMask}`;
      if (!visited.has(signature)) {
        visited.add(signature);
        queue.push({ x, y, hasWeapon, fragmentsMask, guardiansMask, keysMask, steps: state.steps + 1 });
      }
    }
  }
  return null;
}

let hasFailure = false;
const seenMaps = new Map();
levels.forEach((level) => {
  const correctSize = level.map.length === MAP_HEIGHT && level.map.every((row) => row.length === MAP_WIDTH);
  if (!correctSize) {
    hasFailure = true;
    console.error(`第 ${level.id} 关地图尺寸错误：必须为 ${MAP_WIDTH}×${MAP_HEIGHT} 格。`);
    return;
  }
  const signature = level.map.join('\n');
  if (seenMaps.has(signature)) {
    hasFailure = true;
    console.error(`第 ${level.id} 关地图和第 ${seenMaps.get(signature)} 关完全相同，请重新设计。`);
    return;
  }
  seenMaps.set(signature, level.id);
  const solutionLength = solve(level);
  if (solutionLength === null) {
    hasFailure = true;
    console.error(`第 ${level.id} 关没有找到“拿武器、清守卫、收碎片、拿钥匙并抵达出口”的路线。`);
    return;
  }
  console.log(`第 ${level.id} 关尺寸正确，且能按新规则通关，最短路线 ${solutionLength} 步。`);
});

if (hasFailure) process.exitCode = 1;
