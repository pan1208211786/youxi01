import { SaveManager } from './SaveManager.js';

// GameState 保存“跨关卡也要记住”的内容，例如已解锁关卡、已通关关卡、碎片和设置。
class GameStateManager {
  constructor() {
    this.reset();
  }

  reset() {
    const save = SaveManager.load();
    this.unlockedLevel = save.unlockedLevel ?? 1;
    this.completedLevels = save.completedLevels ?? [];
    this.fragments = save.fragments ?? [];
    this.settings = save.settings ?? { musicVolume: 0.6, soundVolume: 0.8, fullscreen: false };
  }

  completeLevel(levelId) {
    if (!this.completedLevels.includes(levelId)) this.completedLevels.push(levelId);
    this.unlockedLevel = Math.max(this.unlockedLevel, levelId + 1);
    this.save();
  }

  collectFragment(fragmentId) {
    if (this.fragments.includes(fragmentId)) return false;
    this.fragments.push(fragmentId);
    this.save();
    return true;
  }

  save() {
    SaveManager.save({
      unlockedLevel: this.unlockedLevel,
      completedLevels: this.completedLevels,
      fragments: this.fragments,
      settings: this.settings,
    });
  }
}

export const GameState = new GameStateManager();
