// FullscreenManager 统一使用浏览器的页面全屏能力，保证画布、视频背景和网页按钮一起进入全屏。
export const FullscreenManager = {
  isActive() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  },

  async toggle() {
    if (this.isActive()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (!exit) throw new Error('当前浏览器不支持退出全屏。');
      await exit.call(document);
      return;
    }

    // 让整个网页根节点全屏，而不是只放大 Phaser 画布，避免透明画布外出现黑屏。
    const target = document.documentElement;
    const request = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!request) throw new Error('当前浏览器不支持全屏显示。');
    await request.call(target);
  },
};
