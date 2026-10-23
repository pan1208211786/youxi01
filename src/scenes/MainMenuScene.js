import { SCENE_KEYS } from '../constants/GameConstants.js';
import { LEVELS } from '../data/levels.js';
import { GameState } from '../core/GameState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { MenuDomUI } from '../ui/MenuDomUI.js';
import { BaseScene } from './BaseScene.js';

// 主菜单只负责带玩家进入不同功能，不存放关卡规则。
export class MainMenuScene extends BaseScene {
  constructor() { super(SCENE_KEYS.MAIN_MENU); }

  create() {
    // 主菜单不绘制底色，让 index.html 直接显示用户提供的森林背景图。
    // 这种方式可兼容“直接双击 index.html 打开”的运行方式。
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    const leaveMenu = (nextAction) => {
      // 只在玩家真的选择功能时隐藏网页按钮，不能在场景初始化时提前隐藏。
      MenuDomUI.hide();
      nextAction();
    };
    // 部分浏览器会拒绝自动播放声音。即使声音暂时不能开始，按钮也必须继续跳转。
    const startMusicSafely = () => {
      try {
        AudioManager.startMusic();
      } catch (error) {
        console.warn('背景音乐暂时无法播放，游戏仍可正常继续。', error);
      }
    };
    MenuDomUI.show({
      onStart: () => leaveMenu(() => { startMusicSafely(); this.scene.start(SCENE_KEYS.TUTORIAL); }),
      onContinue: () => leaveMenu(() => { startMusicSafely(); this.scene.start(SCENE_KEYS.GAME, { levelId: Math.min(GameState.unlockedLevel, 10) }); }),
      onLevels: () => leaveMenu(() => this.scene.start(SCENE_KEYS.LEVEL_SELECT)),
      onSettings: () => leaveMenu(() => this.scene.start(SCENE_KEYS.SETTINGS)),
      fragmentCount: GameState.fragments.length,
      fragmentTotal: LEVELS.length,
    });
  }
}
