import { GAME_CONFIG } from './config/GameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { TutorialScene } from './scenes/TutorialScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameScene } from './scenes/GameScene.js';
import { FullscreenManager } from './systems/FullscreenManager.js';

// 把每个独立画面交给 Phaser 管理。以后新增“剧情页”等画面时，也在这个数组中登记。
const game = new Phaser.Game({
  ...GAME_CONFIG,
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    TutorialScene,
    LevelSelectScene,
    SettingsScene,
    GameScene,
  ],
});

// 防止某些浏览器把 game 判定为“没有被使用”的变量；同时方便在浏览器调试时查看。
window.ruinsTrailGame = game;

// F11 在整个游戏内都可切换页面全屏。阻止默认行为可避免只放大浏览器窗口而不同步游戏界面。
window.addEventListener('keydown', async (event) => {
  if (event.key !== 'F11' || event.repeat) return;
  event.preventDefault();
  try {
    await FullscreenManager.toggle();
  } catch (error) {
    console.warn('F11 全屏切换失败，请使用设置中的切换全屏按钮。', error);
  }
});
