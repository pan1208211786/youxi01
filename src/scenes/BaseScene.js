import { SCENE_KEYS } from '../../../../src/constants/GameConstants.js';

// 这是旧版公共场景底座：它会绘制深绿色背景和两处装饰圆形。
export class BaseScene extends Phaser.Scene {
  createForestBackground() {
    this.add.rectangle(640, 360, 1280, 720, 0x193d31);
    this.add.circle(160, 100, 180, 0x4f8a61, 0.24);
    this.add.circle(1120, 640, 260, 0x7ca96d, 0.18);
  }

  goMainMenu() {
    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }
}
