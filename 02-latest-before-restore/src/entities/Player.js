// Player 只负责“女孩显示在哪里、如何平滑移动”。具体能不能走由 GameScene 判断。
export class Player {
  constructor(scene, worldX, worldY) {
    this.scene = scene;
    this.worldX = worldX;
    this.worldY = worldY;
    this.directionName = 'down';
    this.walkFlipX = false;
    this.isWalking = false;

    // 阴影和人物分开移动，能让小女孩更像站在地面上。
    this.shadow = scene.add.ellipse(worldX, worldY + 30, 64, 18, 0x173328, 0.3).setDepth(13);
    this.sprite = scene.add.sprite(worldX, worldY, 'player-idle-5dir', 0).setDepth(14).setScale(0.39);
    this.playAnimation('idle');
  }

  setPosition(worldX, worldY) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.sprite.setPosition(worldX, worldY);
    this.shadow.setPosition(worldX, worldY + 26);
  }

  moveBy(deltaX, deltaY) {
    if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
      this.updateDirection(deltaX, deltaY);
      this.playAnimation('walk');
    } else {
      this.stopMoving();
    }
    this.setPosition(this.worldX + deltaX, this.worldY + deltaY);
  }

  stopMoving() {
    this.playAnimation('idle');
  }

  updateDirection(deltaX, deltaY) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    let nextDirection = 'left';
    // 这组角色素材的侧身方向与最初预估相反，所以向左时才需要水平翻转。
    // 这样按左键会面向左，按右键会面向右，斜向移动也会跟着正确转身。
    let flipX = deltaX < 0;

    if (absY > absX * 1.35) {
      nextDirection = deltaY > 0 ? 'down' : 'up';
      flipX = false;
    } else if (absX > absY * 1.35) {
      nextDirection = 'left';
    } else {
      nextDirection = deltaY > 0 ? 'left-down' : 'left-up';
    }

    this.directionName = nextDirection;
    this.walkFlipX = flipX;
    this.sprite.setFlipX(flipX);
  }

  playAnimation(type) {
    const animationKey = `player-${type}-${this.directionName}`;
    // 待机图和行走图的侧身朝向相反：走路按移动方向翻转，停下时左右要反过来。
    const usesSideFrame = this.directionName.includes('left');
    const shouldFlipX = type === 'idle' && usesSideFrame ? !this.walkFlipX : this.walkFlipX;
    this.sprite.setFlipX(shouldFlipX);
    if (this.sprite.anims.currentAnim?.key === animationKey) return;
    this.sprite.play(animationKey);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
