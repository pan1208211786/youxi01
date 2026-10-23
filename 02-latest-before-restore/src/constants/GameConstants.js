// 所有场景名字都集中在这里，避免手写名字时打错字。
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  TUTORIAL: 'TutorialScene',
  LEVEL_SELECT: 'LevelSelectScene',
  SETTINGS: 'SettingsScene',
  GAME: 'GameScene',
};

// 游戏格子的统一尺寸。当前 15×8 的地图使用 90 像素地块，能把 1280×720 画布铺满。
export const TILE_SIZE = 90;

// 地图字符和含义放在一起，读关卡数据时会更容易理解。
export const TILE_TYPES = {
  WALL: '#',
  FLOOR: '.',
  PLAYER: 'P',
  // C 是每关必须收集的遗迹碎片，没拿到就不能最终通关。
  FRAGMENT: 'C',
  // K 是遗迹钥匙，收集完所有钥匙后才能打开唯一的出口 D。
  KEY: 'K',
  // W 是地图中的武器，找到它以后才能击败守卫。
  WEAPON: 'W',
  // G 是会来回巡逻的遗迹守卫，碰到守卫会失败。
  GUARDIAN: 'G',
  // D 是每一关唯一的出口。钥匙没有收齐时不能通过。
  DOOR: 'D',
  SWAMP: 'T',
};

// 方向键和 WASD 最后都会转换成这四种方向。
export const DIRECTIONS = {
  up: { x: 0, y: -1, name: '上' },
  down: { x: 0, y: 1, name: '下' },
  left: { x: -1, y: 0, name: '左' },
  right: { x: 1, y: 0, name: '右' },
};
