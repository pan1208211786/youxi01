import { SCENE_KEYS } from '../constants/GameConstants.js';
import { TutorialDomUI } from '../ui/TutorialDomUI.js';
import { BaseScene } from './BaseScene.js';

// 探险手册只负责展示操作规则；书页、按钮和文字由网页图片层组合，视觉素材更容易替换。
export class TutorialScene extends BaseScene {
  constructor() { super(SCENE_KEYS.TUTORIAL); }

  create() {
    // 手册不再绘制 Phaser 背景，让 index.html 的菜单视频透过黑色遮罩显示出来。
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    TutorialDomUI.show({
      onStart: () => {
        TutorialDomUI.hide();
        this.scene.start(SCENE_KEYS.GAME, { levelId: 1 });
      },
      onMenu: () => {
        TutorialDomUI.hide();
        this.goMainMenu();
      },
    });
    // 如果场景因其他方式关闭，也必须隐藏网页层，避免它覆盖之后的页面。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => TutorialDomUI.hide());
  }
}
