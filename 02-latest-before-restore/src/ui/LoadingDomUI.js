// LoadingDomUI 控制网页层的加载条，避免本地直接打开游戏时 Phaser 无法读取图片的问题。
export const LoadingDomUI = {
  show() {
    const layer = document.getElementById('loading-ui-layer');
    layer.style.display = 'grid';
    this.setProgress(0);
  },

  setProgress(percent) {
    const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
    document.getElementById('loading-progress-mask').style.width = `${safePercent}%`;
    document.getElementById('loading-progress-text').textContent = `正在进入森林遗迹 ${safePercent}%`;
  },

  hide() {
    document.getElementById('loading-ui-layer').style.display = 'none';
  },
};
