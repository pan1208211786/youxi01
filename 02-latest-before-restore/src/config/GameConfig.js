// 这里是游戏最基础的显示设置。大多数时候不需要修改它。
export const GAME_CONFIG = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: undefined,
  backgroundColor: '#183b31',
  // 主菜单需要透出网页背景图；其他游戏画面会自己绘制不透明底色。
  transparent: true,
  pixelArt: false,
  scale: {
    // 默认保持设计时的 1280 × 720 尺寸；用户点击全屏后才切换为自动适配。
    mode: Phaser.Scale.NONE,
    // 网页 CSS 已经负责居中；关闭 Phaser 的额外边距，避免画面偏到右侧。
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
};
