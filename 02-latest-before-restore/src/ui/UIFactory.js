import { AudioManager } from '../systems/AudioManager.js';

// 所有菜单按钮都通过这一处制作，颜色和互动效果会保持统一。
export const UIFactory = {
  createButton(scene, x, y, label, onClick, width = 270) {
    const container = scene.add.container(x, y).setDepth(30);
    const background = scene.add.rectangle(0, 0, width, 54, 0x254f3e, 0.96).setStrokeStyle(2, 0xc9e6b3);
    const text = scene.add.text(0, 0, label, { fontFamily: 'Microsoft YaHei', fontSize: '22px', color: '#fff8d8' }).setOrigin(0.5);
    container.add([background, text]).setSize(width, 54).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => { background.setFillStyle(0x3c7657); container.setScale(1.04); });
    container.on('pointerout', () => { background.setFillStyle(0x254f3e); container.setScale(1); });
    container.on('pointerdown', () => { AudioManager.beep(523.25); onClick(); });
    return container;
  },

  // 游戏顶部使用纯图标按钮，避免文字占据地图空间；label 只会在鼠标悬停时作为小提示出现。
  createIconButton(scene, x, y, icon, label, onClick) {
    const container = scene.add.container(x, y).setDepth(30);
    const background = scene.add.graphics();
    const symbol = scene.add.graphics();
    const tooltipBackground = scene.add.rectangle(0, -43, Math.max(76, label.length * 18), 26, 0x0b2019, 0.94)
      .setStrokeStyle(1, 0xc9e6b3)
      .setVisible(false);
    const tooltip = scene.add.text(0, -43, label, {
      fontFamily: 'Microsoft YaHei',
      fontSize: '14px',
      color: '#fff8d8',
    }).setOrigin(0.5).setVisible(false);

    background.fillStyle(0x254f3e, 0.98).fillRoundedRect(-27, -27, 54, 54, 14);
    background.lineStyle(2, 0xc9e6b3, 0.9).strokeRoundedRect(-27, -27, 54, 54, 14);

    if (icon === 'home') {
      // 房子图标代表回到主菜单。
      symbol.fillStyle(0xfff1bd).fillTriangle(0, -17, -18, -1, 18, -1);
      symbol.fillStyle(0xfff1bd).fillRoundedRect(-13, -2, 26, 17, 2);
      symbol.fillStyle(0x254f3e).fillRect(-3, 5, 6, 10);
    } else {
      // 圆形箭头图标代表从头重新开始当前关卡。
      symbol.lineStyle(5, 0xfff1bd, 1).beginPath().arc(0, 0, 14, 0.55, 5.55, false).strokePath();
      symbol.fillStyle(0xfff1bd).fillTriangle(17, -13, 18, 3, 5, -3);
    }

    container.add([background, symbol, tooltipBackground, tooltip]).setSize(54, 54).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      background.clear().fillStyle(0x3c7657, 1).fillRoundedRect(-27, -27, 54, 54, 14).lineStyle(2, 0xe8f4cc, 1).strokeRoundedRect(-27, -27, 54, 54, 14);
      tooltipBackground.setVisible(true);
      tooltip.setVisible(true);
      container.setScale(1.06);
    });
    container.on('pointerout', () => {
      background.clear().fillStyle(0x254f3e, 0.98).fillRoundedRect(-27, -27, 54, 54, 14).lineStyle(2, 0xc9e6b3, 0.9).strokeRoundedRect(-27, -27, 54, 54, 14);
      tooltipBackground.setVisible(false);
      tooltip.setVisible(false);
      container.setScale(1);
    });
    container.on('pointerdown', () => { AudioManager.beep(523.25); onClick(); });
    return container;
  },

  createPanel(scene, x, y, width, height) {
    return scene.add.rectangle(x, y, width, height, 0x102d25, 0.94).setStrokeStyle(3, 0xd7c788).setDepth(20);
  },
};
