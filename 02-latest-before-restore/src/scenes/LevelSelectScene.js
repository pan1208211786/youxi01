import { SCENE_KEYS } from '../constants/GameConstants.js';
import { LEVELS } from '../data/levels.js';
import { GameState } from '../core/GameState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { LevelSelectDomUI } from '../ui/LevelSelectDomUI.js';
import { BaseScene } from './BaseScene.js';

// 关卡选择场景只负责读取游戏进度和处理跳转；具体画面由 LevelSelectDomUI 显示。
export class LevelSelectScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.LEVEL_SELECT);
  }

  create() {
    // 让网页的图片层完整覆盖画布，同时保留底层视频作为其他页面的背景。
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    LevelSelectDomUI.show({
      levels: LEVELS,
      unlockedLevel: GameState.unlockedLevel,
      completedLevels: GameState.completedLevels,
      onLevel: (levelId) => {
        AudioManager.beep(523.25);
        LevelSelectDomUI.hide();
        this.scene.start(SCENE_KEYS.GAME, { levelId });
      },
      onBack: () => {
        AudioManager.beep(440);
        LevelSelectDomUI.hide();
        this.goMainMenu();
      },
    });

    // 即使其他代码直接切换场景，也会同步关闭网页界面，避免遮住游戏画面。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => LevelSelectDomUI.hide());
  }
}
