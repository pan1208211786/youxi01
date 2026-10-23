// 事件总线像一个“广播站”。不同模块不用直接互相依赖，也能互相通知。
// 例如：玩家通关后，游戏场景发消息，进度系统就能收到并刷新状态。
export const EventBus = new Phaser.Events.EventEmitter();

export const GAME_EVENTS = {
  STATUS_CHANGED: 'status-changed',
  LEVEL_COMPLETED: 'level-completed',
  LEVEL_FAILED: 'level-failed',
};
