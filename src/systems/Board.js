import { TILE_TYPES, TILE_SIZE } from '../constants/GameConstants.js';

// Board 负责把文字地图变成遗迹场景，并集中管理钥匙、出口和守卫等寻路规则。
export class Board {
  constructor(scene, level, offsetX, offsetY, tileSize = TILE_SIZE) {
    this.scene = scene;
    this.level = level;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.tileSize = tileSize;
    this.rows = level.map;
    this.height = this.rows.length;
    this.width = Math.max(...this.rows.map((row) => row.length));
    this.baseTiles = new Map();
    this.tileImages = new Map();
    this.fragments = new Map();
    this.keys = new Map();
    this.weapons = new Map();
    // 守卫巡逻时要绕开仍未收集的武器、钥匙、碎片，避免直接从道具上穿过去。
    this.guardianBlockedPickups = new Set();
    this.guardians = [];
    this.playerStart = { x: 1, y: 1 };
    this.fragmentsCollected = 0;
    this.totalFragments = 0;
    this.keysCollected = 0;
    this.totalKeys = 0;
    this.doorsOpen = false;
    // 第一关使用正式大底图与 PNG 道具素材；其它关卡继续沿用代码生成的临时素材。
    this.isLevelOneArt = level.id === 1;
  }

  build() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.createCell(x, y, this.rows[y][x] ?? TILE_TYPES.WALL);
      }
    }
    if (this.isLevelOneArt) this.createLevelOneStoneDecorations();
    this.updateExit();
  }

  createCell(x, y, char) {
    const position = this.gridToWorld(x, y);
    const key = this.key(x, y);
    const isWall = char === TILE_TYPES.WALL;
    this.baseTiles.set(key, isWall ? TILE_TYPES.WALL : TILE_TYPES.FLOOR);

    if (!this.isLevelOneArt) {
      const groundKey = isWall ? 'wall' : ((x * 3 + y * 5) % 4 === 0 ? 'floor-alt' : 'floor');
      // 地面和墙体铺满整个格子，避免地图放大后出现空隙。
      this.tileImages.set(key, this.scene.add.image(position.x, position.y, groundKey).setDisplaySize(this.tileSize, this.tileSize).setDepth(1));
    } else if (isWall && !this.isLevelOneOuterWall(x, y) && !this.isLevelOneStoneGroupCell(x, y)) {
      // 第一关大背景已经包含草地格子和边缘装饰，这里只补真正会挡路的零散墙体。
      this.tileImages.set(key, this.scene.add.image(position.x, position.y, 'wall').setDisplaySize(this.tileSize, this.tileSize).setAlpha(0.84).setDepth(3));
    }

    if (isWall) return;

    if (char === TILE_TYPES.PLAYER) this.playerStart = { x, y };
    if (char === TILE_TYPES.FRAGMENT || char === TILE_TYPES.KEY || char === TILE_TYPES.WEAPON) this.guardianBlockedPickups.add(key);
    const overlayTexture = this.getOverlayTexture(char);
    if (overlayTexture) {
      const overlay = char === TILE_TYPES.GUARDIAN && this.isLevelOneArt
        ? this.scene.add.sprite(position.x, position.y, overlayTexture, 0)
        : this.scene.add.image(position.x, position.y, overlayTexture);
      overlay.setDepth(char === TILE_TYPES.GUARDIAN ? 7 : 3);
      this.applyLevelOneOverlayStyle(overlay, char);
      this.tileImages.set(`${key}:overlay`, overlay);
      if (char === TILE_TYPES.FRAGMENT || char === TILE_TYPES.KEY || char === TILE_TYPES.WEAPON) {
        this.createPickupFloat(overlay, x, y);
      }
    }

    if (char === TILE_TYPES.FRAGMENT) {
      this.fragments.set(key, this.tileImages.get(`${key}:overlay`));
      this.totalFragments += 1;
    }
    if (char === TILE_TYPES.KEY) {
      this.keys.set(key, this.tileImages.get(`${key}:overlay`));
      this.totalKeys += 1;
    }
    if (char === TILE_TYPES.WEAPON) this.weapons.set(key, this.tileImages.get(`${key}:overlay`));
    if (char === TILE_TYPES.GUARDIAN) this.createGuardian(x, y, this.tileImages.get(`${key}:overlay`));
    if (Object.values(TILE_TYPES).includes(char) && char !== TILE_TYPES.PLAYER) {
      const walkableOverlay = char === TILE_TYPES.FRAGMENT || char === TILE_TYPES.KEY || char === TILE_TYPES.WEAPON || char === TILE_TYPES.GUARDIAN;
      this.baseTiles.set(key, walkableOverlay ? TILE_TYPES.FLOOR : char);
    }
  }

  getOverlayTexture(char) {
    if (this.isLevelOneArt) {
      return {
        [TILE_TYPES.DOOR]: 'level1-door',
        [TILE_TYPES.SWAMP]: 'swamp',
        [TILE_TYPES.FRAGMENT]: 'level1-fragment',
        [TILE_TYPES.KEY]: 'level1-key',
        [TILE_TYPES.WEAPON]: 'level1-weapon',
        [TILE_TYPES.GUARDIAN]: 'level1-guardian',
      }[char];
    }

    return {
      [TILE_TYPES.DOOR]: 'door-closed',
      [TILE_TYPES.SWAMP]: 'swamp',
      [TILE_TYPES.FRAGMENT]: 'fragment',
      [TILE_TYPES.KEY]: 'key',
      [TILE_TYPES.WEAPON]: 'weapon',
      [TILE_TYPES.GUARDIAN]: 'guardian',
    }[char];
  }

  applyLevelOneOverlayStyle(overlay, char) {
    if (!this.isLevelOneArt) return;
    if (char === TILE_TYPES.DOOR) overlay.setScale(0.72);
    if (char === TILE_TYPES.KEY) overlay.setScale(0.58);
    if (char === TILE_TYPES.WEAPON) overlay.setScale(0.56);
    if (char === TILE_TYPES.FRAGMENT) overlay.setScale(0.62);
    if (char === TILE_TYPES.GUARDIAN) overlay.setScale(0.24);

    // PNG 图片的透明边和视觉重心不完全一样，所以第一关按参考图做少量微调。
    const offset = {
      [TILE_TYPES.DOOR]: { x: 0, y: -2 },
      [TILE_TYPES.KEY]: { x: 0, y: -5 },
      [TILE_TYPES.WEAPON]: { x: 0, y: -2 },
      [TILE_TYPES.FRAGMENT]: { x: 4, y: -3 },
      [TILE_TYPES.GUARDIAN]: { x: 0, y: 0 },
    }[char];
    if (offset) overlay.setPosition(overlay.x + offset.x, overlay.y + offset.y);
  }

  createPickupFloat(overlay, gridX, gridY) {
    // 物品基于“微调后的真实位置”轻轻漂浮，避免之前从偏移点跳回格子中心。
    const baseY = overlay.y;
    const phaseDelay = ((gridX * 137 + gridY * 89) % 420);
    this.scene.tweens.add({
      targets: overlay,
      y: baseY - 3,
      duration: 1350,
      delay: phaseDelay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  isLevelOneOuterWall(x, y) {
    // 边界墙只负责挡住玩家，不画出来，避免把正式背景框住。
    return x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1;
  }

  isLevelOneStoneGroupCell(x, y) {
    // 两组横向石头图片覆盖这些墙格，所以不再重复画单格墙。
    return ((y === 1 || y === 3) && x >= 4 && x <= 6);
  }

  createLevelOneStoneDecorations() {
    this.addLevelOneStoneGroup('level1-stones-a', 4, 1, 3, 1);
    this.addLevelOneStoneGroup('level1-stones-b', 4, 3, 3, 1);
  }

  addLevelOneStoneGroup(textureKey, gridX, gridY, gridWidth, gridHeight) {
    const x = this.offsetX + (gridX + gridWidth / 2) * this.tileSize;
    const y = this.offsetY + (gridY + gridHeight / 2) * this.tileSize;
    const stones = this.scene.add.image(x, y, textureKey).setDepth(4);
    // 石头组收在三格内部，外轮廓刚好贴近参考图里的格子边线。
    stones.setDisplaySize(gridWidth * this.tileSize - 18, this.tileSize * 0.98);
    this.tileImages.set(`level1:stones:${gridX},${gridY}`, stones);
  }

  // 守卫会持续定位玩家，并根据地图障碍快速调整追踪方向。
  createGuardian(x, y, sprite) {
    const position = this.gridToWorld(x, y);
    // 守卫脚下增加一层柔和投影，让它和地面更贴合。
    const shadow = this.scene.add.ellipse(position.x, position.y + 16, 42, 13, 0x173328, 0.28).setDepth(6);
    const guardian = {
      worldX: position.x,
      worldY: position.y,
      direction: { x: 0, y: 0 },
      nextTurnAt: 0,
      speed: 88,
      sprite,
      shadow,
    };
    this.chooseGuardianDirection(guardian);
    this.guardians.push(guardian);
  }

  key(x, y) {
    return `${x},${y}`;
  }

  getTile(x, y) {
    return this.baseTiles.get(this.key(x, y)) ?? TILE_TYPES.WALL;
  }

  isBlocked(x, y) {
    const tile = this.getTile(x, y);
    return tile === TILE_TYPES.WALL || (tile === TILE_TYPES.DOOR && !this.doorsOpen);
  }

  getWorldBounds() {
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: this.width * this.tileSize,
      height: this.height * this.tileSize,
      right: this.offsetX + this.width * this.tileSize,
      bottom: this.offsetY + this.height * this.tileSize,
    };
  }

  gridToWorld(x, y) {
    return {
      x: this.offsetX + x * this.tileSize + this.tileSize / 2,
      y: this.offsetY + y * this.tileSize + this.tileSize / 2,
    };
  }

  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor((worldX - this.offsetX) / this.tileSize),
      y: Math.floor((worldY - this.offsetY) / this.tileSize),
    };
  }

  getTileAtWorld(worldX, worldY) {
    const grid = this.worldToGrid(worldX, worldY);
    return this.getTile(grid.x, grid.y);
  }

  isWorldBlocked(worldX, worldY, radius = 18) {
    const samplePoints = [
      { x: worldX, y: worldY },
      { x: worldX - radius, y: worldY - radius },
      { x: worldX + radius, y: worldY - radius },
      { x: worldX - radius, y: worldY + radius },
      { x: worldX + radius, y: worldY + radius },
      { x: worldX, y: worldY - radius },
      { x: worldX, y: worldY + radius },
      { x: worldX - radius, y: worldY },
      { x: worldX + radius, y: worldY },
    ];
    return samplePoints.some((point) => {
      const grid = this.worldToGrid(point.x, point.y);
      return this.isBlocked(grid.x, grid.y);
    });
  }

  collectKeyAtWorld(worldX, worldY) {
    if (!this.areGuardiansCleared()) return false;
    for (const [key, image] of this.keys.entries()) {
      if (Phaser.Math.Distance.Between(worldX, worldY, image.x, image.y) > 38) continue;
      image.destroy();
      this.keys.delete(key);
      this.guardianBlockedPickups.delete(key);
      this.keysCollected += 1;
      this.updateExit();
      return true;
    }
    return false;
  }

  collectFragmentAtWorld(worldX, worldY) {
    for (const [key, image] of this.fragments.entries()) {
      if (Phaser.Math.Distance.Between(worldX, worldY, image.x, image.y) > 42) continue;
      image.destroy();
      this.fragments.delete(key);
      this.guardianBlockedPickups.delete(key);
      this.fragmentsCollected += 1;
      this.updateExit();
      return true;
    }
    return false;
  }

  areFragmentsCollected() {
    return this.fragmentsCollected === this.totalFragments;
  }

  isNearKey(worldX, worldY) {
    return [...this.keys.values()].some((image) => Phaser.Math.Distance.Between(worldX, worldY, image.x, image.y) <= 42);
  }

  collectWeaponAtWorld(worldX, worldY) {
    for (const [key, image] of this.weapons.entries()) {
      if (Phaser.Math.Distance.Between(worldX, worldY, image.x, image.y) > 42) continue;
      image.destroy();
      this.weapons.delete(key);
      this.guardianBlockedPickups.delete(key);
      return true;
    }
    return false;
  }

  areGuardiansCleared() {
    return this.guardians.length === 0;
  }

  isWorldTile(worldX, worldY, tileType) {
    return this.getTileAtWorld(worldX, worldY) === tileType;
  }

  isAtOpenDoor(worldX, worldY) {
    return this.doorsOpen && this.isWorldTile(worldX, worldY, TILE_TYPES.DOOR);
  }

  updateExit() {
    this.doorsOpen = this.keysCollected === this.totalKeys && this.areFragmentsCollected();
    this.baseTiles.forEach((tile, key) => {
      if (tile !== TILE_TYPES.DOOR) return;
      const door = this.tileImages.get(`${key}:overlay`);
      if (!door) return;
      if (this.isLevelOneArt) {
        door.setTexture('level1-door').setAlpha(this.doorsOpen ? 0.46 : 1).setTint(this.doorsOpen ? 0xb7ff9c : 0xffffff);
      } else {
        door.setTexture(this.doorsOpen ? 'door-open' : 'door-closed');
      }
    });
  }

  // 每一帧都让守卫追踪玩家；返回碰到玩家的守卫，交给 GameScene 判断胜负。
  updateGuardians(playerWorldX, playerWorldY, delta) {
    for (const guardian of this.guardians) {
      guardian.nextTurnAt -= delta;
      if (guardian.nextTurnAt <= 0) this.chooseGuardianDirection(guardian, playerWorldX, playerWorldY);

      const distance = guardian.speed * (delta / 1000);
      const nextWorldX = guardian.worldX + guardian.direction.x * distance;
      const nextWorldY = guardian.worldY + guardian.direction.y * distance;
      if (this.isGuardianBlocked(nextWorldX, nextWorldY)) {
        this.chooseGuardianDirection(guardian, playerWorldX, playerWorldY);
      } else {
        guardian.worldX = nextWorldX;
        guardian.worldY = nextWorldY;
        guardian.sprite.setPosition(guardian.worldX, guardian.worldY);
        guardian.shadow?.setPosition(guardian.worldX, guardian.worldY + 16);
      }
      if (Phaser.Math.Distance.Between(playerWorldX, playerWorldY, guardian.worldX, guardian.worldY) < 38) return guardian;
    }
    return null;
  }

  chooseGuardianDirection(guardian, targetWorldX = null, targetWorldY = null) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const availableDirections = directions.filter((direction) => {
      const testX = guardian.worldX + direction.x * 34;
      const testY = guardian.worldY + direction.y * 34;
      return !this.isGuardianBlocked(testX, testY);
    });
    const choices = availableDirections.length > 0 ? availableDirections : directions;
    const hasTarget = Number.isFinite(targetWorldX) && Number.isFinite(targetWorldY);
    const pathDirection = hasTarget ? this.findGuardianPathDirection(guardian, targetWorldX, targetWorldY) : null;
    const matchedPathDirection = pathDirection
      ? choices.find((direction) => direction.x === pathDirection.x && direction.y === pathDirection.y)
      : null;

    if (matchedPathDirection) {
      guardian.direction = matchedPathDirection;
    } else if (hasTarget) {
      // 找不到完整路线时，也优先选择下一步后距离玩家更近的方向。
      guardian.direction = [...choices].sort((a, b) => {
        const nextAX = guardian.worldX + a.x * 34;
        const nextAY = guardian.worldY + a.y * 34;
        const nextBX = guardian.worldX + b.x * 34;
        const nextBY = guardian.worldY + b.y * 34;
        return Phaser.Math.Distance.Between(nextAX, nextAY, targetWorldX, targetWorldY)
          - Phaser.Math.Distance.Between(nextBX, nextBY, targetWorldX, targetWorldY);
      })[0];
    } else {
      guardian.direction = Phaser.Utils.Array.GetRandom(choices);
    }

    // 追踪时频繁重新定位玩家，玩家停住或移动都会被快速锁定。
    guardian.nextTurnAt = hasTarget ? Phaser.Math.Between(120, 240) : Phaser.Math.Between(650, 1500);
    this.updateGuardianFacing(guardian);
  }

  // 通过简单寻路找出守卫下一步该往哪走，让它能更快靠近玩家。
  findGuardianPathDirection(guardian, targetWorldX, targetWorldY) {
    const start = this.worldToGrid(guardian.worldX, guardian.worldY);
    const target = this.worldToGrid(targetWorldX, targetWorldY);
    if (start.x === target.x && start.y === target.y) return null;

    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].sort((a, b) => {
      const nextA = { x: start.x + a.x, y: start.y + a.y };
      const nextB = { x: start.x + b.x, y: start.y + b.y };
      return Math.abs(nextA.x - target.x) + Math.abs(nextA.y - target.y)
        - (Math.abs(nextB.x - target.x) + Math.abs(nextB.y - target.y));
    });
    const queue = [{ x: start.x, y: start.y, firstDirection: null }];
    const visited = new Set([this.key(start.x, start.y)]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const direction of directions) {
        const next = { x: current.x + direction.x, y: current.y + direction.y };
        const nextKey = this.key(next.x, next.y);
        if (visited.has(nextKey) || this.isGuardianGridBlocked(next.x, next.y)) continue;
        const firstDirection = current.firstDirection ?? direction;
        if (next.x === target.x && next.y === target.y) return firstDirection;
        visited.add(nextKey);
        queue.push({ x: next.x, y: next.y, firstDirection });
      }
    }
    return null;
  }

  // 守卫专用阻挡规则：墙、沼泽、门和未收集道具都会让守卫换方向。
  isGuardianGridBlocked(x, y) {
    const tile = this.getTile(x, y);
    const hasPickup = this.guardianBlockedPickups.has(this.key(x, y));
    return hasPickup || tile === TILE_TYPES.WALL || tile === TILE_TYPES.SWAMP || tile === TILE_TYPES.DOOR;
  }

  updateGuardianFacing(guardian) {
    if (!this.isLevelOneArt || !guardian.sprite?.setFrame) return;
    const { x, y } = guardian.direction;
    // decor-guardian.png 是竖排 4 帧：下、左、上、右。
    const frameIndex = Math.abs(x) > Math.abs(y)
      ? (x < 0 ? 1 : 3)
      : (y < 0 ? 2 : 0);
    guardian.sprite.setFlipX(false);
    guardian.sprite.setFrame(frameIndex);
  }

  isGuardianBlocked(worldX, worldY) {
    const samplePoints = [
      { x: worldX, y: worldY },
      { x: worldX - 22, y: worldY - 22 },
      { x: worldX + 22, y: worldY - 22 },
      { x: worldX - 22, y: worldY + 22 },
      { x: worldX + 22, y: worldY + 22 },
    ];
    return samplePoints.some((point) => {
      const grid = this.worldToGrid(point.x, point.y);
      return this.isGuardianGridBlocked(grid.x, grid.y);
    });
  }

  defeatGuardian(guardian) {
    const index = this.guardians.indexOf(guardian);
    if (index === -1) return false;
    this.guardians.splice(index, 1);
    this.scene.tweens.killTweensOf(guardian.sprite);
    this.scene.tweens.killTweensOf(guardian.shadow);
    this.scene.tweens.add({
      targets: [guardian.sprite, guardian.shadow],
      alpha: 0,
      scale: 0.35,
      duration: 180,
      ease: 'Sine.in',
      onComplete: () => {
        guardian.sprite.destroy();
        guardian.shadow?.destroy();
      },
    });
    return true;
  }

  destroy() {
    this.guardians.forEach((guardian) => guardian.shadow?.destroy());
    this.tileImages.forEach((image) => image.destroy());
  }
}
