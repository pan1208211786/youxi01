import { SCENE_KEYS, TILE_SIZE, TILE_TYPES } from '../constants/GameConstants.js';
import { LEVELS } from '../data/levels.js';
import { GameState } from '../core/GameState.js';
import { EventBus, GAME_EVENTS } from '../core/EventBus.js';
import { Player } from '../entities/Player.js';
import { Board } from '../systems/Board.js';
import { AudioManager } from '../systems/AudioManager.js';
import { UIFactory } from '../ui/UIFactory.js';
import { BaseScene } from './BaseScene.js';

// GameScene 是实际游玩的画面：它协调小女孩、遗迹地图与寻路冒险规则。
export class GameScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  init(data) {
    this.levelId = data.levelId ?? 1;
  }

  create() {
    this.level = LEVELS[this.levelId - 1];
    this.isLevelOneArt = this.level.id === 1;
    this.tileSize = this.isLevelOneArt ? 93 : TILE_SIZE;
    this.isEnded = false;
    this.hasWeapon = false;
    this.hasFragment = false;
    this.lastKeyBlockedAt = 0;
    this.playerSpeed = 190;
    this.createBackground();
    const mapWidth = Math.max(...this.level.map.map((row) => row.length)) * this.tileSize;
    this.offsetX = this.isLevelOneArt ? 100 : Math.floor((1280 - mapWidth) / 2);
    // 第一关参考图是 12×6 方格，这里用 93px 格子和 100/105 起点对齐底图方格。
    // 第一关正式底图的草地从木质提示栏下方开始，其它关卡仍然从画布顶部铺满。
    this.offsetY = this.isLevelOneArt ? 105 : 0;
    this.board = new Board(this, this.level, this.offsetX, this.offsetY, this.tileSize);
    this.board.build();
    const startPosition = this.board.gridToWorld(this.board.playerStart.x, this.board.playerStart.y);
    this.player = new Player(this, startPosition.x, startPosition.y);
    this.createHud();
    this.bindControls();
    AudioManager.startMusic();
  }

  createBackground() {
    if (this.isLevelOneArt) {
      // 第一关直接使用正式森林底图，画面会和参考图一致，不再显示旧的临时地砖底色。
      this.add.image(640, 360, 'level1-background').setDisplaySize(1280, 720).setDepth(0);
      return;
    }
    this.add.rectangle(640, 360, 1280, 720, 0x1b4638);
    this.add.circle(85, 690, 270, 0x6d9860, 0.2);
    this.add.circle(1190, 100, 220, 0x4c8060, 0.23);
  }

  createHud() {
    if (this.isLevelOneArt) {
      this.createLevelOneIconButton(61, 58, 'level1-home-button', () => this.goMainMenu());
      this.createLevelOneIconButton(139, 58, 'level1-restart-button', () => this.restartLevel());
      this.add.text(225, 31, '按住方向键 / WASD：自由移动    收集碎片、击败守卫、拿钥匙开门', {
        fontFamily: 'Microsoft YaHei',
        fontSize: '18px',
        color: '#fff1bd',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(16);
      this.weaponStatusText = this.add.text(225, 66, '碎片：未收集    武器：未找到    守卫：未清除', {
        fontFamily: 'Microsoft YaHei',
        fontSize: '17px',
        color: '#fff1bd',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(16);
      return;
    }

    // 关卡内的顶部区域只承担操作功能，不显示关卡名、步数或逃生门状态。
    this.add.rectangle(640, 40, 1280, 80, 0x102d25, 0.94).setDepth(15);
    UIFactory.createIconButton(this, 55, 40, 'home', '返回菜单', () => this.goMainMenu());
    UIFactory.createIconButton(this, 125, 40, 'restart', '重新开始', () => this.restartLevel());
    this.add.text(180, 28, '按住方向键 / WASD：自由移动    收集碎片、击败守卫、拿钥匙开门', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '16px',
      color: '#dcebc9',
    }).setOrigin(0, 0.5).setDepth(16);
    this.weaponStatusText = this.add.text(180, 58, '碎片：未收集    武器：未找到    守卫：未清除', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '15px',
      color: '#fff1bd',
    }).setOrigin(0, 0.5).setDepth(16);
  }

  createLevelOneIconButton(x, y, textureKey, action) {
    const button = this.add.image(x, y, textureKey).setScale(0.48).setDepth(30).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setScale(0.51));
    button.on('pointerout', () => button.setScale(0.48));
    button.on('pointerdown', () => { AudioManager.beep(523.25); action(); });
    return button;
  }
  bindControls() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
    this.keys.restart.on('down', () => this.restartLevel());
    this.keys.pause.on('down', () => this.showPause());
  }

  update(time, delta) {
    if (this.isEnded || !this.player || !this.keys) return;

    this.updatePlayerMovement(delta);

    const touchedGuardian = this.board.updateGuardians(this.player.worldX, this.player.worldY, delta);
    if (touchedGuardian && this.hasWeapon) {
      this.board.defeatGuardian(touchedGuardian);
      AudioManager.beep(520, 0.2, 0.14);
      this.showHint('击败守卫！现在可以继续寻找钥匙。');
      this.updateWeaponStatus();
    } else if (touchedGuardian) {
      this.failLevel('你被巡逻守卫发现了，快换一条路线吧。');
      return;
    }
    this.checkCurrentArea();
  }

  updatePlayerMovement(delta) {
    const horizontal = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const vertical = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);
    if (horizontal === 0 && vertical === 0) {
      this.player.stopMoving();
      return;
    }

    const vector = new Phaser.Math.Vector2(horizontal, vertical).normalize();
    const moveDistance = this.playerSpeed * (delta / 1000);
    const deltaX = vector.x * moveDistance;
    const deltaY = vector.y * moveDistance;
    this.tryMovePlayer(deltaX, deltaY);
  }

  tryMovePlayer(deltaX, deltaY) {
    let nextX = this.player.worldX;
    let nextY = this.player.worldY;

    // 横向和纵向分开判断，贴着墙移动时会自然滑过去，不会卡得很死。
    if (!this.board.isWorldBlocked(nextX + deltaX, nextY)) nextX += deltaX;
    if (!this.board.isWorldBlocked(nextX, nextY + deltaY)) nextY += deltaY;
    this.player.moveBy(nextX - this.player.worldX, nextY - this.player.worldY);
  }

  checkCurrentArea() {
    if (this.board.isWorldTile(this.player.worldX, this.player.worldY, TILE_TYPES.SWAMP)) {
      this.failLevel('小女孩掉进了沼泽陷坑。');
      return;
    }
    if (!this.hasWeapon && this.board.collectWeaponAtWorld(this.player.worldX, this.player.worldY)) {
      this.hasWeapon = true;
      AudioManager.beep(720, 0.18, 0.14);
      this.showHint('找到了武器！现在碰到守卫可以击败它。');
      this.updateWeaponStatus();
    }
    if (!this.hasFragment && this.board.collectFragmentAtWorld(this.player.worldX, this.player.worldY)) {
      this.hasFragment = true;
      GameState.collectFragment(`level-${this.level.id}`);
      AudioManager.beep(880, 0.2, 0.15);
      this.showHint('收集到本关碎片！继续寻找钥匙和出口。');
      this.updateWeaponStatus();
    }
    if (!this.board.areGuardiansCleared() && this.board.isNearKey(this.player.worldX, this.player.worldY)) {
      this.showKeyBlockedHint();
      return;
    }
    if (this.board.collectKeyAtWorld(this.player.worldX, this.player.worldY)) {
      AudioManager.beep(640, 0.16, 0.14);
    }
    // 收集所有钥匙后出口会打开，走进 D 就立即逃脱成功。
    if (this.board.isAtOpenDoor(this.player.worldX, this.player.worldY)) this.completeLevel();
  }

  updateWeaponStatus() {
    if (!this.weaponStatusText) return;
    const fragmentText = this.hasFragment ? '已收集' : '未收集';
    const weaponText = this.hasWeapon ? '已获得' : '未找到';
    const guardianText = this.board.areGuardiansCleared() ? '已清除' : '未清除';
    this.weaponStatusText.setText(`碎片：${fragmentText}    武器：${weaponText}    守卫：${guardianText}`);
  }

  showKeyBlockedHint() {
    const now = this.time.now;
    if (now - this.lastKeyBlockedAt < 900) return;
    this.lastKeyBlockedAt = now;
    AudioManager.beep(170, 0.07, 0.06);
    this.showHint('守卫还在保护钥匙，先找到武器击败守卫。');
  }

  showHint(message) {
    this.hintText?.destroy();
    this.hintText = this.add.text(640, 108, message, {
      fontFamily: 'Microsoft YaHei',
      fontSize: '18px',
      color: '#fff7d6',
      backgroundColor: 'rgba(14, 43, 34, 0.78)',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: this.hintText,
      alpha: 0,
      duration: 360,
      delay: 950,
      onComplete: () => {
        this.hintText?.destroy();
        this.hintText = null;
      },
    });
  }

  restartLevel() {
    if (this.isEnded) return;
    this.scene.restart({ levelId: this.levelId });
  }

  failLevel(reason) {
    if (this.isEnded) return;
    this.isEnded = true;
    EventBus.emit(GAME_EVENTS.LEVEL_FAILED, { levelId: this.level.id, reason });
    this.showEndPanel({
      type: 'failed',
      title: '本关失败',
      description: reason,
      primaryLabel: '重新挑战',
      primaryAction: () => this.scene.restart({ levelId: this.levelId }),
    });
    AudioManager.beep(120, 0.35, 0.18);
  }

  completeLevel() {
    if (this.isEnded) return;
    this.isEnded = true;
    GameState.completeLevel(this.level.id);
    // 完成关卡后立刻刷新绿色填充部分，让本次成果立即反映在进度条上。
    EventBus.emit(GAME_EVENTS.LEVEL_COMPLETED, { levelId: this.level.id });
    const isLastLevel = this.level.id === LEVELS.length;
    this.showEndPanel({
      type: 'success',
      title: isLastLevel ? '遗迹小径，暂告一段落' : '逃脱成功！',
      description: isLastLevel ? '你已经集齐所有关卡碎片，找到了通往遗迹核心的道路。' : '你收集碎片并找齐钥匙，成功穿过出口。',
      primaryLabel: isLastLevel ? '返回关卡选择' : '下一关',
      primaryAction: () => {
        this.scene.start(isLastLevel ? SCENE_KEYS.LEVEL_SELECT : SCENE_KEYS.GAME, isLastLevel ? undefined : { levelId: this.level.id + 1 });
      },
    });
    AudioManager.beep(784, 0.28, 0.18);
  }

  showPause() {
    if (this.isEnded) return;
    this.isEnded = true;
    this.showEndPanel({
      title: '暂停中',
      description: '慢慢想，不着急。',
      primaryLabel: '继续游戏',
      primaryAction: () => { this.isEnded = false; this.clearOverlay(); },
    });
  }

  showEndPanel({ type = 'default', title, description, primaryLabel, primaryAction }) {
    const canUseImagePanel = (type === 'failed' || type === 'success') && this.textures.exists('end-panel-board');
    if (canUseImagePanel) {
      this.showImageEndPanel(type, description, primaryLabel, primaryAction);
      return;
    }
    this.showTextEndPanel(title, description, primaryLabel, primaryAction);
  }

  showImageEndPanel(type, description, primaryLabel, primaryAction) {
    this.overlay = this.add.container(0, 0).setDepth(40);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071914, 0.52).setInteractive();
    const panel = this.add.image(640, 366, 'end-panel-board').setScale(0.88);
    const titleTexture = type === 'failed' ? 'end-panel-title-failed' : 'end-panel-title-success';
    const heading = this.add.image(640, 226, titleTexture).setScale(1);
    const detail = this.add.text(640, 334, description, {
      fontFamily: 'Microsoft YaHei',
      fontSize: '18px',
      color: '#604323',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 450 },
    }).setOrigin(0.5);
    // 成功和失败弹窗底部保持两个并排按钮，和新的图片 UI 风格统一。
    const primaryTexture = this.getEndPanelButtonTexture(primaryLabel);
    const primary = primaryTexture
      ? this.createEndPanelImageButton(525, 430, primaryTexture, primaryAction)
      : UIFactory.createButton(this, 525, 430, primaryLabel, primaryAction, 240);
    const menu = this.createEndPanelImageButton(755, 430, 'end-panel-button-menu', () => this.scene.start(SCENE_KEYS.MAIN_MENU));
    this.overlay.add([shade, panel, heading, detail, primary, menu]);
  }

  getEndPanelButtonTexture(label) {
    return {
      下一关: 'end-panel-button-next',
      重新挑战: 'end-panel-button-retry',
      返回菜单: 'end-panel-button-menu',
    }[label];
  }

  createEndPanelImageButton(x, y, textureKey, action) {
    const normalScale = 1;
    const hoverScale = 1.04;
    const button = this.add.image(x, y, textureKey).setScale(normalScale).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(normalScale));
    button.on('pointerdown', () => { AudioManager.beep(523.25); action(); });
    return button;
  }

  showTextEndPanel(title, description, primaryLabel, primaryAction) {
    this.overlay = this.add.container(0, 0).setDepth(40);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071914, 0.72).setInteractive();
    const panel = UIFactory.createPanel(this, 640, 360, 560, 310);
    const heading = this.add.text(640, 275, title, { fontFamily: 'Microsoft YaHei', fontSize: '37px', color: '#fff1bd' }).setOrigin(0.5).setDepth(41);
    const detail = this.add.text(640, 340, description, { fontFamily: 'Microsoft YaHei', fontSize: '20px', color: '#e2efd3', align: 'center', wordWrap: { width: 460 } }).setOrigin(0.5).setDepth(41);
    // 暂停等临时弹窗继续使用文字按钮，避免缺少专用图片时影响操作。
    const primary = UIFactory.createButton(this, 500, 450, primaryLabel, primaryAction, 240);
    const menu = UIFactory.createButton(this, 780, 450, '返回菜单', () => this.scene.start(SCENE_KEYS.MAIN_MENU), 240);
    this.overlay.add([shade, panel, heading, detail, primary, menu]);
  }

  clearOverlay() {
    this.overlay?.destroy(true);
    this.overlay = null;
  }
}
