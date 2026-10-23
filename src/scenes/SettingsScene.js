import { SCENE_KEYS } from '../../../../src/constants/GameConstants.js';
import { GameState } from '../../../../src/core/GameState.js';
import { AudioManager } from '../../../../src/systems/AudioManager.js';
import { FullscreenManager } from '../../../../src/systems/FullscreenManager.js';
import { UIFactory } from '../../../../src/ui/UIFactory.js';
import { BaseScene } from './BaseScene.js';

// 这是旧版设置页：中间会显示深色的弹窗底板。
export class SettingsScene extends BaseScene {
  constructor() { super(SCENE_KEYS.SETTINGS); }

  create() {
    this.createForestBackground();
    UIFactory.createPanel(this, 640, 360, 650, 530);
    this.add.text(640, 165, '设置', { fontFamily: 'Microsoft YaHei', fontSize: '44px', color: '#fff1bd' }).setOrigin(0.5).setDepth(21);
    this.createVolumeRow('背景音乐', 285, 'musicVolume');
    this.createVolumeRow('音效', 385, 'soundVolume');
    const fullScreenText = this.add.text(640, 475, '', { fontFamily: 'Microsoft YaHei', fontSize: '22px', color: '#eaf3d8' }).setOrigin(0.5).setDepth(21);
    const fullScreenHint = this.add.text(640, 515, '', { fontFamily: 'Microsoft YaHei', fontSize: '16px', color: '#c4d7b7' }).setOrigin(0.5).setDepth(21);
    const refreshFullScreenText = () => fullScreenText.setText(`全屏显示：${FullscreenManager.isActive() ? '已开启' : '未开启'}`);
    const saveFullscreenState = () => {
      GameState.settings.fullscreen = FullscreenManager.isActive();
      GameState.save();
      refreshFullScreenText();
      fullScreenHint.setText('');
    };
    refreshFullScreenText();
    document.addEventListener('fullscreenchange', saveFullscreenState);
    document.addEventListener('webkitfullscreenchange', saveFullscreenState);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('fullscreenchange', saveFullscreenState);
      document.removeEventListener('webkitfullscreenchange', saveFullscreenState);
    });
    UIFactory.createButton(this, 485, 570, '切换全屏', async () => {
      try {
        fullScreenHint.setText('正在切换显示模式…');
        await FullscreenManager.toggle();
        this.time.delayedCall(80, saveFullscreenState);
      } catch (error) {
        fullScreenHint.setText('浏览器拒绝了全屏请求，请再点击一次按钮。');
        console.warn('全屏切换失败。', error);
      }
    }, 240);
    UIFactory.createButton(this, 795, 570, '返回菜单', () => this.goMainMenu(), 240);
  }

  createVolumeRow(label, y, settingKey) {
    const valueText = this.add.text(640, y, '', { fontFamily: 'Microsoft YaHei', fontSize: '24px', color: '#eaf3d8' }).setOrigin(0.5).setDepth(21);
    const refresh = () => valueText.setText(`${label}：${Math.round(GameState.settings[settingKey] * 100)}%`);
    refresh();
    UIFactory.createButton(this, 455, y, '－', () => { GameState.settings[settingKey] = Math.max(0, GameState.settings[settingKey] - 0.1); GameState.save(); refresh(); }, 70);
    UIFactory.createButton(this, 825, y, '＋', () => { GameState.settings[settingKey] = Math.min(1, GameState.settings[settingKey] + 0.1); GameState.save(); AudioManager.beep(600); refresh(); }, 70);
  }
}
