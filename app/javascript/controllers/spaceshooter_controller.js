import { Controller } from "@hotwired/stimulus";
import Phaser from "phaser";

export default class extends Controller {
  connect() {
    this.startGame();
  }

  disconnect() {
    // If a Phaser game instance was created, destroy it to free resources
    if (this._game) {
      try {
        this._game.destroy(true);
      } catch (e) {
        // ignore
      }
      this._game = null;
    }
  }

  startGame() {
    // avoid double-start
    if (this._game) return;

    const containerId = this.element.id || null;
    const parent = containerId || this.element;

    const controller = this;

    // we'll define the scene functions as closures so they capture controller correctly
    function preload() {
      // no assets
    }

    function create() {
      const scene = this;
      // Player initial position and movement (floats where appropriate)
      scene.playerX = 375.0;
      scene.playerY = 500;
      scene.velocityX = 0.0;
      scene.acceleration = 0.5;
      scene.maxSpeed = 8.0;
      scene.damping = 0.9;

      // Pools
      scene.bulletPool = [];
      scene.enemyPool = [];

      // Create bullet pool (20 bullets)
      for (let i = 0; i < 20; i++) {
        const r = scene.add.rectangle(0, 0, 5, 10, 0xffffff).setOrigin(0, 0).setVisible(false);
        scene.bulletPool.push({ sprite: r, x: 0, y: 0, active: false });
      }

      // Create enemy pool (10 enemies)
      for (let i = 0; i < 10; i++) {
        const r = scene.add.rectangle(0, 0, 40, 40, 0xff0000).setOrigin(0, 0).setVisible(false);
        scene.enemyPool.push({ sprite: r, x: 0, y: 0, active: false });
      }

      // Player rectangle
      scene.playerRect = scene.add.rectangle(scene.playerX, scene.playerY, 50, 50, 0x0000ff).setOrigin(0, 0);

      // Game state
      scene.score = 0;
      scene.lives = 3;
      scene.lastSpawnTime = scene.time.now;
      scene.lastShotTime = scene.time.now;
      scene.spacePressed = false;
      scene.gameOver = false;

      // Speeds and intervals
      scene.bulletSpeed = 12;
      scene.enemySpeed = 3;
      scene.spawnInterval = 1000; // ms
      scene.shotCooldown = 250;   // ms

      // FPS monitoring
      scene.fps = 0;
      scene.frameCount = 0;
      scene.lastFpsTime = scene.time.now;

      // Text
      scene.scoreText = scene.add.text(10, 10, 'Score: 0', { font: '20px Arial', fill: '#ffffff' });
      scene.livesText = scene.add.text(10, 30, 'Lives: 3', { font: '20px Arial', fill: '#ffffff' });
      scene.fpsText = scene.add.text(10, 50, 'FPS: 0', { font: '20px Arial', fill: '#ffffff' });
      scene.gameOverText = scene.add.text(300, 250, 'Game Over', { font: '40px Arial', fill: '#ffffff' }).setVisible(false);
      scene.finalScoreText = scene.add.text(300, 300, '', { font: '20px Arial', fill: '#ffffff' }).setVisible(false);

      // Input
      scene.cursors = scene.input.keyboard.createCursorKeys();
      scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // Bind pointer to allow restarting the game on click after game over
      scene.input.on('pointerdown', function () {
        if (scene.gameOver) {
          restartGame(scene);
        }
      });
    }

    function update(time, delta) {
      const scene = this;
      if (scene.gameOver) return;

      // Player movement with acceleration
      if (scene.cursors.left.isDown) {
        scene.velocityX -= scene.acceleration;
      } else if (scene.cursors.right.isDown) {
        scene.velocityX += scene.acceleration;
      } else {
        scene.velocityX *= scene.damping;
      }

      // Clamp velocity
      scene.velocityX = Phaser.Math.Clamp(scene.velocityX, -scene.maxSpeed, scene.maxSpeed);

      // Update position and clamp
      scene.playerX += scene.velocityX;
      scene.playerX = Phaser.Math.Clamp(scene.playerX, 0.0, 750.0);
      scene.playerRect.x = scene.playerX;

      // Shooting
      if (scene.spaceKey.isDown && !scene.spacePressed && (scene.time.now - scene.lastShotTime) > scene.shotCooldown) {
        spawnBullet(scene);
        scene.lastShotTime = scene.time.now;
        scene.spacePressed = true;
      } else if (!scene.spaceKey.isDown) {
        scene.spacePressed = false;
      }

      // Update bullets
      scene.bulletPool.forEach(b => {
        if (b.active) {
          b.y -= scene.bulletSpeed;
          b.sprite.y = b.y;
          if (b.y < -10) {
            b.active = false;
            b.sprite.setVisible(false);
          }
        }
      });

      // Spawn enemies
      const activeEnemiesCount = scene.enemyPool.filter(e => e.active).length;
      if ((scene.time.now - scene.lastSpawnTime) > scene.spawnInterval && activeEnemiesCount < 6) {
        spawnEnemy(scene);
        scene.lastSpawnTime = scene.time.now;
      }

      // Update enemies
      scene.enemyPool.forEach(e => {
        if (e.active) {
          e.y += scene.enemySpeed;
          e.sprite.y = e.y;
          if (e.y > 600) {
            e.active = false;
            e.sprite.setVisible(false);
            scene.lives -= 1;
            if (scene.lives <= 0) {
              scene.gameOver = true;
              scene.gameOverText.setVisible(true);
              scene.finalScoreText.setText(`Final Score: ${scene.score}`).setVisible(true);
            }
          }
        }
      });

      // Build spatial grid
      const grid = new Map();
      scene.enemyPool.forEach(enemy => {
        if (enemy.active) {
          let cellX = Math.floor(enemy.x / 80);
          cellX = Phaser.Math.Clamp(cellX, 0, 9);
          let cellY = Math.floor(enemy.y / 60);
          cellY = Phaser.Math.Clamp(Math.max(0, cellY), 0, 9);
          const key = `${cellX},${cellY}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(enemy);
        }
      });

      // Collision detection
      scene.bulletPool.forEach(bullet => {
        if (!bullet.active) return;
        let bx = Math.floor(bullet.x / 80);
        bx = Phaser.Math.Clamp(bx, 0, 9);
        let by = Math.floor(bullet.y / 60);
        by = Phaser.Math.Clamp(Math.max(0, by), 0, 9);
        let hit = false;
        for (let dx = -1; dx <= 1 && !hit; dx++) {
          for (let dy = -1; dy <= 1 && !hit; dy++) {
            const cx = Phaser.Math.Clamp(bx + dx, 0, 9);
            const cy = Phaser.Math.Clamp(by + dy, 0, 9);
            const key = `${cx},${cy}`;
            const cellEnemies = grid.get(key);
            if (!cellEnemies) continue;
            for (const enemy of cellEnemies) {
              if (enemy.active && collision(bullet, enemy)) {
                bullet.active = false;
                bullet.sprite.setVisible(false);
                enemy.active = false;
                enemy.sprite.setVisible(false);
                scene.score += 1;
                hit = true;
                break;
              }
            }
          }
        }
      });

      // HUD
      scene.scoreText.setText(`Score: ${scene.score}`);
      scene.livesText.setText(`Lives: ${scene.lives}`);

      // FPS
      scene.frameCount += 1;
      if ((scene.time.now - scene.lastFpsTime) >= 1000) {
        scene.fps = scene.frameCount;
        scene.frameCount = 0;
        scene.lastFpsTime = scene.time.now;
        scene.fpsText.setText(`FPS: ${scene.fps}`);
      }
    }

    // Helpers
    function spawnBullet(scene) {
      const bullet = scene.bulletPool.find(b => !b.active);
      if (bullet) {
        bullet.x = scene.playerX + 22.5;
        bullet.y = scene.playerY;
        bullet.active = true;
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
        bullet.sprite.setVisible(true);
      }
    }

    function spawnEnemy(scene) {
      const enemy = scene.enemyPool.find(e => !e.active);
      if (enemy) {
        const spawnX = Math.floor(Math.random() * 760);
        const spawnPossible = scene.enemyPool.every(e => {
          return !e.active || (Math.abs(e.x - spawnX) >= 100 || e.y >= 100);
        });
        if (spawnPossible) {
          enemy.x = spawnX;
          enemy.y = -40;
          enemy.active = true;
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
          enemy.sprite.setVisible(true);
        }
      }
    }

    function collision(bullet, enemy) {
      return (bullet.x < enemy.x + 40) &&
             (bullet.x + 5 > enemy.x) &&
             (bullet.y < enemy.y + 40) &&
             (bullet.y + 10 > enemy.y);
    }

    function restartGame(scene) {
      scene.score = 0;
      scene.lives = 3;
      scene.gameOver = false;
      scene.gameOverText.setVisible(false);
      scene.finalScoreText.setVisible(false);

      scene.bulletPool.forEach(b => {
        b.active = false;
        b.sprite.setVisible(false);
      });
      scene.enemyPool.forEach(e => {
        e.active = false;
        e.sprite.setVisible(false);
      });

      scene.playerX = 375.0;
      scene.playerRect.x = scene.playerX;
      scene.velocityX = 0.0;

      scene.lastSpawnTime = scene.time.now;
      scene.lastShotTime = scene.time.now;
      scene.spacePressed = false;

      scene.scoreText.setText('Score: 0');
      scene.livesText.setText('Lives: 3');
      scene.fpsText.setText(`FPS: ${scene.fps}`);
    }

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: parent,
      backgroundColor: '#000000',
      scene: { preload, create, update }
    };

    // create the game instance and keep a reference
    try {
      this._game = new Phaser.Game(config);
    } catch (e) {
      // If Phaser fails to initialize (rare), log an error
      // eslint-disable-next-line no-console
      console.error('Phaser failed to start', e);
    }
  }
}
