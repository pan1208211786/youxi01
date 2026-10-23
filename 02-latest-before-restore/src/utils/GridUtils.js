import { TILE_SIZE } from '../constants/GameConstants.js';

// 网格坐标用来计算规则，例如“右边一格是否有墙”；像素坐标用来画在屏幕上。
export const GridUtils = {
  key(x, y) {
    return `${x},${y}`;
  },

  toPixel(x, y, offsetX = 0, offsetY = 0) {
    return {
      x: offsetX + x * TILE_SIZE + TILE_SIZE / 2,
      y: offsetY + y * TILE_SIZE + TILE_SIZE / 2,
    };
  },

  inBounds(x, y, width, height) {
    return x >= 0 && y >= 0 && x < width && y < height;
  },
};
