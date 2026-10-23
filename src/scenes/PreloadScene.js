import { SCENE_KEYS } from '../constants/GameConstants.js';
import { LoadingDomUI } from '../ui/LoadingDomUI.js';

// PreloadScene 负责加载角色序列帧，并用代码画出暂未替换的临时游戏物件。
// 日后替换更多游戏内图形时，可继续在 preload 里加载 assets 下的正式素材。
export class PreloadScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.PRELOAD); }

  preload() {
    // 这里故意不使用 Phaser 的 preload 读取本地 PNG。
    // 玩家直接双击 index.html 打开游戏时，部分浏览器会拦截 Phaser 加载本地图片，导致后面的菜单按钮不显示。
    // 所以角色图会在 create 里用浏览器原生 Image 加载，再交给 Phaser 做成动画纹理。
  }

  create() {
    this.createLoadingScreen();
    this.add.text(640, 330, '正在踏入森林遗迹……', { fontFamily: 'Microsoft YaHei', fontSize: '28px', color: '#fff6d1' }).setOrigin(0.5);
  }

  createLoadingScreen() {
    // 全屏黑色遮罩先盖住场景内容，让玩家只专注看到居中的加载过程。
    LoadingDomUI.show();

    this.prepareGameAssets().then(() => {
      // 游戏地图和图形由代码创建，因此使用启动动画清楚呈现“准备完成后才进入游戏”的过程。
      this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1250,
        ease: 'Quad.Out',
        onUpdate: (tween) => LoadingDomUI.setProgress(tween.getValue()),
        onComplete: () => {
          LoadingDomUI.setProgress(100);
          this.time.delayedCall(180, () => {
            LoadingDomUI.hide();
            this.scene.start(SCENE_KEYS.MAIN_MENU);
          });
        },
      });
    }).catch((error) => {
      console.warn('角色图片加载失败，已使用临时角色保证游戏可进入。', error);
      this.createTextures();
      this.createFallbackPlayerTexture();
      this.createFallbackPlayerAnimations();
      LoadingDomUI.setProgress(100);
      this.time.delayedCall(180, () => {
        LoadingDomUI.hide();
        this.scene.start(SCENE_KEYS.MAIN_MENU);
      });
    });
  }

  async prepareGameAssets() {
    this.createTextures();
    await this.createLevelOneImageTextures();
    await this.createEndPanelImageTextures();
    await this.createPlayerSpriteSheetsFromImages();
    this.createPlayerAnimations();
  }


  async createLevelOneImageTextures() {
    // 第一关正式素材优先使用 index.html 提前加载的内嵌图片数据。
    // 这样直接双击本地 index.html 时，也不会因为浏览器拦截图片路径而显示绿色缺失贴图。
    const embeddedArt = window.LEVEL1_ART_DATA ?? {};
    const assets = [
      { key: 'level1-background', src: embeddedArt.background ?? './assets/images/level-01/background-forest-grid.jpg' },
      { key: 'level1-stones-a', src: embeddedArt.stonesA ?? './assets/images/level-01/obstacle-stones-a.png' },
      { key: 'level1-stones-b', src: embeddedArt.stonesB ?? './assets/images/level-01/obstacle-stones-b.png' },
      { key: 'level1-door', src: embeddedArt.door ?? './assets/images/level-01/door-wood.png' },
      { key: 'level1-key', src: embeddedArt.key ?? './assets/images/level-01/decor-key.png' },
      { key: 'level1-weapon', src: embeddedArt.weapon ?? './assets/images/level-01/decor-weapon.png' },
      { key: 'level1-fragment', src: embeddedArt.fragment ?? './assets/images/level-01/fragment-crystal.png' },
      { key: 'level1-home-button', src: embeddedArt.homeButton ?? './assets/images/level-01/button-home.png' },
      { key: 'level1-restart-button', src: embeddedArt.restartButton ?? './assets/images/level-01/button-restart.png' },
      { key: 'level1-guardian', src: embeddedArt.guardian ?? './assets/images/level-01/decor-guardian.png', frameWidth: 256, frameHeight: 256 },
    ];

    for (const asset of assets) {
      const image = await this.loadBrowserImage(asset.src);
      if (this.textures.exists(asset.key)) this.textures.remove(asset.key);
      if (asset.frameWidth) {
        this.textures.addSpriteSheet(asset.key, image, { frameWidth: asset.frameWidth, frameHeight: asset.frameHeight });
      } else {
        this.textures.addImage(asset.key, image);
      }
    }
  }

  async createEndPanelImageTextures() {
    // 通关和失败弹窗使用正式 UI 图片；即使这些图片加载失败，也不能影响角色素材。
    const embeddedArt = window.END_PANEL_ART_DATA ?? {};
    const assets = [
      { key: 'end-panel-board', src: embeddedArt.board ?? './assets/images/ui/end-panel/panel-board.png' },
      { key: 'end-panel-title-failed', src: embeddedArt.titleFailed ?? './assets/images/ui/end-panel/title-failed.png' },
      { key: 'end-panel-title-success', src: embeddedArt.titleSuccess ?? './assets/images/ui/end-panel/title-success.png' },
      { key: 'end-panel-button-next', src: embeddedArt.buttonNext ?? './assets/images/ui/end-panel/button-next.png' },
      { key: 'end-panel-button-retry', src: embeddedArt.buttonRetry ?? './assets/images/ui/end-panel/button-retry.png' },
      { key: 'end-panel-button-menu', src: embeddedArt.buttonMenu ?? './assets/images/ui/end-panel/button-menu.png' },
    ];

    for (const asset of assets) {
      try {
        const image = await this.loadBrowserImage(asset.src);
        if (this.textures.exists(asset.key)) this.textures.remove(asset.key);
        this.textures.addImage(asset.key, image);
      } catch (error) {
        console.warn(`弹窗图片加载失败，已保留文字弹窗兜底：${asset.key}`, error);
      }
    }
  }

  async createPlayerSpriteSheetsFromImages() {
    // 角色素材是 5 个方向：下、左下、左、左上、上。向右的方向通过水平翻转复用左侧素材。
    const embeddedSprites = window.PLAYER_SPRITE_DATA ?? {};
    const idleImage = await this.loadBrowserImage(embeddedSprites.idle ?? './assets/images/characters/player-idle-5dir.png');
    const walkImage = await this.loadBrowserImage(embeddedSprites.walk ?? './assets/images/characters/player-walk-5dir.png');

    this.addSpriteSheetTexture('player-idle-5dir', idleImage);
    this.addSpriteSheetTexture('player-walk-5dir', walkImage);
  }

  loadBrowserImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法加载图片：${src}`));
      image.src = src;
    });
  }

  addSpriteSheetTexture(key, image) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.addSpriteSheet(key, image, {
      frameWidth: 256,
      frameHeight: 256,
    });
    // 如果没有被正确切成小格，角色会显示成一整条长图，所以这里主动拦截。
    if (!texture || texture.frameTotal <= 1) throw new Error(`角色序列帧切分失败：${key}`);
  }

  createTexture(key, draw) {
    const graphics = this.add.graphics();
    draw(graphics);
    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  createPlayerAnimations() {
    const directions = [
      { name: 'down', row: 0 },
      { name: 'left-down', row: 1 },
      { name: 'left', row: 2 },
      { name: 'left-up', row: 3 },
      { name: 'up', row: 4 },
    ];

    directions.forEach(({ name, row }) => {
      this.anims.create({
        key: `player-idle-${name}`,
        frames: [{ key: 'player-idle-5dir', frame: row }],
        frameRate: 1,
      });
      this.anims.create({
        key: `player-walk-${name}`,
        frames: this.anims.generateFrameNumbers('player-walk-5dir', { start: row * 8, end: row * 8 + 7 }),
        frameRate: 10,
        repeat: -1,
      });
    });
  }

  createFallbackPlayerTexture() {
    // 兜底角色只在真实角色图加载失败时使用，目的是避免菜单和关卡因为素材问题整体消失。
    // 这里只生成单帧，不再生成一整条长图，避免画面上出现一串小人。
    const idle = this.add.graphics();
    this.drawFallbackGirl(idle, 128, 128, 0);
    idle.generateTexture('player-idle-5dir', 256, 256);
    idle.destroy();

    const walk = this.add.graphics();
    this.drawFallbackGirl(walk, 128, 128, 0, 8);
    walk.generateTexture('player-walk-5dir', 256, 256);
    walk.destroy();
  }

  drawFallbackGirl(g, centerX, centerY, directionRow, footOffset = 0) {
    const lookOffsetY = directionRow === 4 ? -8 : directionRow === 0 ? 8 : 0;
    g.fillStyle(0x143428, 0.25).fillEllipse(centerX, centerY + 72, 82, 24);
    g.fillStyle(0x6b4528).fillRoundedRect(centerX + 26, centerY + 10, 34, 48, 9);
    g.fillStyle(0xd9ad69).fillRoundedRect(centerX + 30, centerY + 22, 24, 14, 4);
    g.fillStyle(0x78b7c4).fillRoundedRect(centerX - 30, centerY + 2, 60, 70, 18);
    g.fillStyle(0x4d8998).fillTriangle(centerX - 31, centerY + 54, centerX + 31, centerY + 54, centerX, centerY + 96);
    g.fillStyle(0x2d3438).fillRoundedRect(centerX - 26 + footOffset, centerY + 88, 18, 12, 5);
    g.fillStyle(0x2d3438).fillRoundedRect(centerX + 8 - footOffset, centerY + 88, 18, 12, 5);
    g.fillStyle(0xf2c79f).fillCircle(centerX, centerY - 34, 32);
    g.fillStyle(0x6a3923).fillCircle(centerX, centerY - 55, 36).fillCircle(centerX - 30, centerY - 37, 14).fillCircle(centerX + 30, centerY - 37, 14);
    g.fillStyle(0xf2c79f).fillCircle(centerX, centerY - 28, 27);
    g.fillStyle(0x22323a).fillCircle(centerX - 10, centerY - 33 + lookOffsetY, 4).fillCircle(centerX + 10, centerY - 33 + lookOffsetY, 4);
    g.lineStyle(3, 0xaa5f55).lineBetween(centerX - 8, centerY - 17, centerX + 8, centerY - 17);
  }

  createFallbackPlayerAnimations() {
    const directions = ['down', 'left-down', 'left', 'left-up', 'up'];
    directions.forEach((name) => {
      this.anims.create({
        key: `player-idle-${name}`,
        frames: [{ key: 'player-idle-5dir', frame: 0 }],
        frameRate: 1,
      });
      this.anims.create({
        key: `player-walk-${name}`,
        frames: [{ key: 'player-walk-5dir', frame: 0 }],
        frameRate: 10,
        repeat: -1,
      });
    });
  }

  createTextures() {
    this.createTexture('floor', (g) => {
      g.fillStyle(0x779f64).fillRect(0, 0, 64, 64);
      g.fillStyle(0x8eb776).fillRoundedRect(3, 3, 58, 58, 7);
      g.fillStyle(0xa7c984, 0.55).fillCircle(14, 14, 8).fillCircle(48, 47, 10);
      g.fillStyle(0x658c58, 0.8).fillCircle(10, 48, 4).fillCircle(55, 19, 3);
      g.lineStyle(1, 0xc4dca0, 0.5).lineBetween(9, 28, 16, 22).lineBetween(16, 22, 21, 28).lineBetween(44, 14, 49, 8).lineBetween(49, 8, 53, 14);
      g.lineStyle(2, 0x5e8651, 0.34).strokeRoundedRect(3, 3, 58, 58, 7);
    });
    this.createTexture('floor-alt', (g) => {
      g.fillStyle(0x73965e).fillRect(0, 0, 64, 64);
      g.fillStyle(0x89ad6c).fillRoundedRect(3, 3, 58, 58, 7);
      g.fillStyle(0xb7cc91, 0.55).fillCircle(46, 15, 9).fillCircle(19, 50, 11);
      g.fillStyle(0x697f55).fillEllipse(17, 19, 9, 5).fillEllipse(47, 42, 10, 6);
      g.lineStyle(2, 0x4f7049, 0.48).lineBetween(7, 10, 13, 15).lineBetween(13, 15, 9, 20).lineBetween(54, 50, 58, 55).lineBetween(58, 55, 52, 58);
      g.lineStyle(2, 0x5e8651, 0.34).strokeRoundedRect(3, 3, 58, 58, 7);
    });
    this.createTexture('wall', (g) => {
      g.fillStyle(0x284938).fillRect(0, 0, 64, 64);
      g.fillStyle(0x526d59).fillRoundedRect(3, 3, 58, 58, 8);
      g.fillStyle(0x657e64).fillRoundedRect(6, 6, 25, 18, 4).fillRoundedRect(33, 6, 25, 18, 4).fillRoundedRect(5, 27, 20, 28, 4).fillRoundedRect(27, 27, 30, 28, 4);
      g.lineStyle(2, 0x2f493b).strokeRoundedRect(6, 6, 25, 18, 4).strokeRoundedRect(33, 6, 25, 18, 4).strokeRoundedRect(5, 27, 20, 28, 4).strokeRoundedRect(27, 27, 30, 28, 4);
      g.fillStyle(0x87a568, 0.78).fillCircle(9, 9, 5).fillCircle(57, 28, 5).fillCircle(24, 55, 4);
      g.lineStyle(2, 0x91ad75, 0.68).lineBetween(8, 12, 14, 18).lineBetween(57, 26, 53, 36).lineBetween(24, 53, 19, 58);
      g.lineStyle(3, 0x1f392e).strokeRoundedRect(2, 2, 60, 60, 9);
    });
    this.createTexture('box', (g) => {
      g.fillStyle(0x603821).fillRoundedRect(6, 8, 52, 49, 7);
      g.fillStyle(0xa96b3d).fillRoundedRect(9, 10, 46, 44, 5);
      g.fillStyle(0xce9256).fillRect(13, 14, 38, 7).fillRect(13, 29, 38, 7).fillRect(13, 44, 38, 6);
      g.lineStyle(3, 0x633b24).lineBetween(12, 24, 52, 24).lineBetween(12, 39, 52, 39).lineBetween(20, 12, 20, 52).lineBetween(44, 12, 44, 52);
      g.fillStyle(0xe2ac6a).fillCircle(17, 17, 2).fillCircle(47, 17, 2).fillCircle(17, 48, 2).fillCircle(47, 48, 2);
      g.lineStyle(2, 0x4a2b1b).strokeRoundedRect(6, 8, 52, 49, 7);
    });
    this.createTexture('heavy-box', (g) => {
      g.fillStyle(0x303c40).fillRoundedRect(5, 7, 54, 51, 7);
      g.fillStyle(0x687476).fillRoundedRect(9, 10, 46, 45, 5);
      g.fillStyle(0x8f9c9d).fillRect(14, 16, 36, 8).fillRect(14, 40, 36, 8);
      g.fillStyle(0xbac7c1).fillCircle(17, 17, 4).fillCircle(47, 17, 4).fillCircle(17, 48, 4).fillCircle(47, 48, 4);
      g.lineStyle(3, 0x3d4749).lineBetween(32, 11, 32, 54).lineBetween(10, 32, 54, 32);
      g.lineStyle(2, 0x1f292c).strokeRoundedRect(5, 7, 54, 51, 7);
    });
    this.createTexture('magic-box', (g) => {
      g.fillStyle(0x30265b).fillRoundedRect(6, 7, 52, 51, 8);
      g.fillStyle(0x6d5aaa).fillRoundedRect(9, 10, 46, 45, 6);
      g.lineStyle(2, 0xb6a4e8).strokeRoundedRect(13, 14, 38, 37, 4);
      g.fillStyle(0xc7b9f5).fillCircle(32, 32, 12);
      g.fillStyle(0x6d5aaa).fillCircle(32, 32, 6);
      g.fillStyle(0xdcd5ff).fillCircle(19, 18, 3).fillCircle(46, 18, 3).fillCircle(19, 47, 3).fillCircle(46, 47, 3);
    });
    this.createTexture('magic-box-active', (g) => {
      g.fillStyle(0x40266e).fillRoundedRect(5, 6, 54, 53, 9);
      g.fillStyle(0x8859c3).fillRoundedRect(9, 10, 46, 45, 6);
      g.lineStyle(3, 0xffe77a).strokeRoundedRect(11, 12, 42, 41, 5);
      g.fillStyle(0xfff1a1).fillCircle(32, 32, 13).fillCircle(17, 17, 3).fillCircle(47, 17, 3).fillCircle(17, 47, 3).fillCircle(47, 47, 3);
      g.fillStyle(0x8b4abb).fillCircle(32, 32, 6);
    });
    this.createTexture('button', (g) => { g.fillStyle(0x4a3024).fillEllipse(32, 43, 50, 19); g.fillStyle(0x9f6138).fillEllipse(32, 37, 43, 17); g.fillStyle(0xe8a75e).fillEllipse(32, 34, 32, 10); g.lineStyle(2, 0x69402a).strokeEllipse(32, 37, 43, 17); });
    this.createTexture('button-on', (g) => { g.fillStyle(0x4a3024).fillEllipse(32, 43, 50, 19); g.fillStyle(0x85603a).fillEllipse(32, 39, 43, 14); g.fillStyle(0xffe36e).fillEllipse(32, 38, 32, 8); });
    this.createTexture('special-button', (g) => { g.fillStyle(0x342650).fillEllipse(32, 43, 50, 19); g.fillStyle(0x7454a8).fillEllipse(32, 37, 43, 17); g.fillStyle(0xb79af1).fillEllipse(32, 34, 32, 10); });
    this.createTexture('special-button-on', (g) => { g.fillStyle(0x342650).fillEllipse(32, 43, 50, 19); g.fillStyle(0x62487e).fillEllipse(32, 39, 43, 14); g.fillStyle(0xffe87e).fillEllipse(32, 38, 32, 8); });
    this.createTexture('door-closed', (g) => { g.fillStyle(0x302d2a).fillRoundedRect(10, 2, 44, 60, 7); g.fillStyle(0x784b31).fillRoundedRect(14, 6, 36, 56, 4); g.fillStyle(0xa96b43).fillRect(18, 10, 28, 42); g.lineStyle(3, 0x5a3424).lineBetween(18, 25, 46, 25).lineBetween(18, 42, 46, 42); g.fillStyle(0xffd169).fillCircle(42, 35, 3); });
    this.createTexture('door-open', (g) => { g.fillStyle(0x203e34).fillRoundedRect(7, 2, 50, 60, 7); g.lineStyle(3, 0xdcc46f).strokeRoundedRect(9, 4, 46, 56, 5); g.fillStyle(0x74be7c, 0.75).fillCircle(32, 34, 14); g.lineStyle(2, 0xeef098, 0.8).strokeCircle(32, 34, 10); });
    this.createTexture('special-door-closed', (g) => { g.fillStyle(0x2d254a).fillRoundedRect(10, 2, 44, 60, 7); g.fillStyle(0x564382).fillRoundedRect(14, 6, 36, 56, 4); g.lineStyle(3, 0xc6b0f1).strokeRoundedRect(16, 8, 32, 52, 3); g.fillStyle(0xd4c5ff).fillCircle(32, 30, 10); });
    this.createTexture('special-door-open', (g) => { g.fillStyle(0x213b4c).fillRoundedRect(7, 2, 50, 60, 7); g.lineStyle(3, 0xe8d279).strokeRoundedRect(9, 4, 46, 56, 5); g.fillStyle(0xbaadff, 0.75).fillCircle(32, 34, 14); g.lineStyle(2, 0xf5edaa, 0.85).strokeCircle(32, 34, 10); });
    this.createTexture('exit', (g) => { g.fillStyle(0x254b42).fillCircle(32, 32, 28); g.fillStyle(0x44715d).fillCircle(32, 32, 24); g.lineStyle(4, 0xffdb74).strokeCircle(32, 32, 20); g.fillStyle(0xffed99).fillTriangle(32, 13, 49, 42, 15, 42); g.fillStyle(0xe3a94c).fillCircle(32, 34, 5); });
    this.createTexture('swamp', (g) => { g.fillStyle(0x193c34).fillCircle(32, 32, 29); g.fillStyle(0x335d47).fillCircle(32, 32, 24); g.lineStyle(3, 0x16342d).strokeCircle(32, 32, 19); g.lineStyle(2, 0x6f956c, 0.7).lineBetween(16, 23, 28, 29).lineBetween(42, 21, 32, 30).lineBetween(18, 42, 31, 35).lineBetween(47, 43, 36, 35); });
    this.createTexture('magic-zone', (g) => { g.fillStyle(0x594ea3, 0.32).fillCircle(32, 32, 27); g.fillStyle(0x7a6dca, 0.33).fillCircle(32, 32, 20); g.lineStyle(2, 0xf0d8ff, 0.9).strokeCircle(32, 32, 24).strokeCircle(32, 32, 13); g.fillStyle(0xe0c8ff).fillCircle(32, 8, 2).fillCircle(54, 39, 2).fillCircle(16, 46, 2); });
    // 碎片是每关必拿目标，使用金色菱形让它和钥匙、武器区分开。
    this.createTexture('fragment', (g) => { g.fillStyle(0x7f4f24).fillTriangle(32, 4, 54, 31, 32, 60).fillTriangle(32, 4, 10, 31, 32, 60); g.fillStyle(0xffd86b).fillTriangle(32, 7, 48, 31, 32, 55).fillTriangle(32, 7, 16, 31, 32, 55); g.fillStyle(0xfff3a6).fillTriangle(32, 10, 42, 30, 32, 45).fillCircle(32, 27, 4); g.lineStyle(2, 0xfff0a4).strokeTriangle(32, 4, 54, 31, 32, 60).strokeTriangle(32, 4, 10, 31, 32, 60); });
    // 钥匙会轻轻浮动，提醒玩家这是本关需要优先收集的目标。
    this.createTexture('key', (g) => { g.fillStyle(0x7a4a1d).fillCircle(23, 25, 14); g.fillStyle(0xffd968).fillCircle(23, 25, 11); g.fillStyle(0x7a4a1d).fillCircle(23, 25, 4); g.fillStyle(0xffd968).fillRect(31, 21, 23, 8).fillRect(45, 28, 7, 8).fillRect(37, 28, 6, 5); g.lineStyle(2, 0xfff2a6).strokeCircle(23, 25, 10); });
    // 武器是临时程序图形，后续可以替换成正式的短剑或探险工具素材。
    this.createTexture('weapon', (g) => { g.fillStyle(0x24343a).fillRoundedRect(29, 15, 7, 39, 3); g.fillStyle(0xd7e9ef).fillTriangle(32, 4, 42, 18, 22, 18); g.fillStyle(0xf4fbff).fillTriangle(32, 7, 37, 18, 32, 45); g.fillStyle(0x87552e).fillRoundedRect(20, 44, 24, 8, 3); g.fillStyle(0x6a3e22).fillRoundedRect(27, 49, 10, 12, 3); g.lineStyle(2, 0x17242a).strokeTriangle(32, 4, 42, 18, 22, 18).strokeRoundedRect(20, 44, 24, 8, 3); });
    // 守卫使用深色石像轮廓，与小女孩和草地保持明显的视觉区分。
    this.createTexture('guardian', (g) => { g.fillStyle(0x263d42).fillCircle(32, 18, 15); g.fillStyle(0x405f5f).fillRoundedRect(17, 29, 30, 27, 8); g.fillStyle(0x77918b).fillCircle(27, 18, 3).fillCircle(37, 18, 3); g.fillStyle(0x9bc28a).fillCircle(27, 18, 1.5).fillCircle(37, 18, 1.5); g.lineStyle(3, 0x172b31).strokeCircle(32, 18, 15).strokeRoundedRect(17, 29, 30, 27, 8); g.fillStyle(0x526f65).fillRect(12, 35, 7, 18).fillRect(45, 35, 7, 18); });
  }
}
