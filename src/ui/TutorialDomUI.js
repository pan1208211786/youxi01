// TutorialDomUI 控制探险手册的网页图片层，避免 Phaser 在本地运行时无法读取 PNG 素材。
export const TutorialDomUI = {
  show({ onStart, onMenu }) {
    const layer = document.getElementById('tutorial-ui-layer');
    document.getElementById('tutorial-start').onclick = onStart;
    document.getElementById('tutorial-menu').onclick = onMenu;
    layer.style.display = 'block';
  },

  hide() {
    const layer = document.getElementById('tutorial-ui-layer');
    layer.style.display = 'none';
    document.getElementById('tutorial-start').onclick = null;
    document.getElementById('tutorial-menu').onclick = null;
  },
};
