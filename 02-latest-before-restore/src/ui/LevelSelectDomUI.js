// LevelSelectDomUI 管理关卡选择的网页图片层。
// 采用浏览器原生 img 标签，能兼容用户直接双击 index.html 的运行方式。
export const LevelSelectDomUI = {
  // 保存监听函数，关闭页面时必须移除，避免重复打开关卡页后重复执行。
  _onLayoutChange: null,

  show({ levels, unlockedLevel, completedLevels, onLevel, onBack }) {
    const layer = document.getElementById('level-select-ui-layer');
    const grid = document.getElementById('level-select-grid');
    const backButton = document.getElementById('level-select-back');

    // 每次打开都重新生成卡片，保证进度更新后“已通过”和“未解锁”状态准确。
    grid.replaceChildren();
    levels.forEach((level) => {
      const unlocked = level.id <= unlockedLevel;
      const completed = completedLevels.includes(level.id);
      const card = document.createElement(unlocked ? 'button' : 'div');
      card.className = `level-card ${unlocked ? 'is-unlocked' : 'is-locked'}`;
      card.setAttribute('role', 'listitem');

      const background = document.createElement('img');
      background.src = unlocked
        ? './assets/images/ui/level-select/level-card-unlocked.png'
        : './assets/images/ui/level-select/level-card-locked.png';
      background.alt = '';
      background.draggable = false;
      card.append(background);

      if (unlocked) {
        card.type = 'button';
        card.setAttribute('aria-label', `进入第 ${level.id} 关：${level.name}`);

        const title = document.createElement('span');
        title.className = 'level-card-title';
        title.textContent = `第 ${level.id} 关`;
        card.append(title);

        const name = document.createElement('span');
        name.className = 'level-card-name';
        name.textContent = level.name;
        card.append(name);

        if (completed) {
          const status = document.createElement('span');
          status.className = 'level-card-status';
          status.textContent = '已通过';
          card.append(status);
        }

        card.onclick = () => onLevel(level.id);
      } else {
        card.setAttribute('aria-label', `第 ${level.id} 关尚未解锁`);
      }

      grid.append(card);
    });

    backButton.onclick = onBack;
    layer.style.display = 'block';
    this.bindLayoutEvents();
    this.updateLayout();
  },

  hide() {
    const layer = document.getElementById('level-select-ui-layer');
    const grid = document.getElementById('level-select-grid');
    const backButton = document.getElementById('level-select-back');
    if (!layer) return;

    // 关闭时清理事件和卡片，避免离开本场景后仍触发旧页面的点击逻辑。
    layer.style.display = 'none';
    grid.replaceChildren();
    backButton.onclick = null;
    this.unbindLayoutEvents();
    this.resetLayout();
  },

  // 监听全屏切换和窗口尺寸变化。无论玩家使用按钮进入全屏，还是改变窗口大小，都会重新居中。
  bindLayoutEvents() {
    if (this._onLayoutChange) return;
    this._onLayoutChange = () => this.updateLayout();
    document.addEventListener('fullscreenchange', this._onLayoutChange);
    document.addEventListener('webkitfullscreenchange', this._onLayoutChange);
    window.addEventListener('resize', this._onLayoutChange);
  },

  unbindLayoutEvents() {
    if (!this._onLayoutChange) return;
    document.removeEventListener('fullscreenchange', this._onLayoutChange);
    document.removeEventListener('webkitfullscreenchange', this._onLayoutChange);
    window.removeEventListener('resize', this._onLayoutChange);
    this._onLayoutChange = null;
  },

  // 全屏时保持 1280×720 的设计尺寸，再按屏幕可容纳的最大比例整体放大。
  updateLayout() {
    const layer = document.getElementById('level-select-ui-layer');
    if (!layer) return;

    const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFullscreen) {
      this.resetLayout();
      return;
    }

    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    layer.style.width = '1280px';
    layer.style.height = '720px';
    layer.style.transformOrigin = 'center center';
    layer.style.transform = `translate(-50%, -50%) scale(${scale})`;
  },

  // 回到普通窗口后交还给 CSS 默认布局，避免残留的全屏缩放影响下一次打开。
  resetLayout() {
    const layer = document.getElementById('level-select-ui-layer');
    if (!layer) return;
    layer.style.removeProperty('width');
    layer.style.removeProperty('height');
    layer.style.removeProperty('transform-origin');
    layer.style.removeProperty('transform');
  },
};
