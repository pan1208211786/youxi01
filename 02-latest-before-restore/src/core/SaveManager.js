// 浏览器自带的 localStorage 能把少量数据保存在这台电脑上。
// 这让玩家关闭网页后，仍然可以从“继续游戏”接着玩。
const SAVE_KEY = 'ruins-trail-save-v1';

export const SaveManager = {
  load() {
    try {
      const rawSave = localStorage.getItem(SAVE_KEY);
      return rawSave ? JSON.parse(rawSave) : {};
    } catch (error) {
      // 即使浏览器不允许存档，游戏也应能正常开始，所以返回空数据。
      console.warn('读取存档失败，将使用新存档。', error);
      return {};
    }
  },

  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('保存进度失败。', error);
    }
  },
};
