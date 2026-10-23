// MenuDomUI 管理主菜单的图片按钮。
// 它使用网页原生图片，能避开直接双击打开网页时 Phaser 读取本地图片失败的问题。
export const MenuDomUI = {
  show({ onStart, onContinue, onLevels, onSettings, fragmentCount, fragmentTotal }) {
    const layer = document.getElementById('menu-ui-layer');
    if (!layer) return;
    layer.style.display = 'block';
    document.getElementById('menu-start').onclick = onStart;
    document.getElementById('menu-continue').onclick = onContinue;
    document.getElementById('menu-levels').onclick = onLevels;
    document.getElementById('menu-settings').onclick = onSettings;
    document.getElementById('fragment-count').textContent = `已收集碎片：${fragmentCount} / ${fragmentTotal}`;
  },

  hide() {
    const layer = document.getElementById('menu-ui-layer');
    if (!layer) return;
    layer.style.display = 'none';
    // 清空点击事件，避免离开主菜单后仍能触发旧场景的功能。
    ['menu-start', 'menu-continue', 'menu-levels', 'menu-settings'].forEach((id) => {
      document.getElementById(id).onclick = null;
    });
  },
};
