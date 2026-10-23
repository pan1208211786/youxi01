import { SCENE_KEYS } from '../constants/GameConstants.js';

// BootScene 是极短的启动页，专门负责把游戏带到资源准备画面。
export class BootScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.BOOT); }

  create() {
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
