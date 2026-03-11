import { Player } from './scripts/Player.js';

class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x1a2b3c);

        this.add.text(width / 2, height / 3, 'YO! NOID:\nHARBOR CHEESE', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            fill: '#ffcc00',
            align: 'center'
        }).setOrigin(0.5);

        const startBtn = this.add.text(width / 2, height * 2 / 3, 'PRESS START', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive();

        this.tweens.add({
            targets: startBtn,
            alpha: 0,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.on('keydown', () => {
            this.scene.start('GameScene');
        });

        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x8b0000);

        this.add.text(width / 2, height / 3, 'YOU DROWNED!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2, `FINAL SCORE: ${window.score || 0}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#ffcc00'
        }).setOrigin(0.5);

        const restartText = this.add.text(width / 2, height * 2 / 3, 'PRESS ANY KEY TO RESTART', {
            fontFamily: '"Press Start 2P"',
            fontSize: '15px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown', () => {
            this.scene.start('GameScene');
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('noid', 'assets/noid_sprite.png');
        this.load.image('pepperoni', 'assets/pepperoni.png');
        this.load.image('tileset', 'assets/tileset_port.png');
    }

    create() {
        window.score = 0;
        const worldWidth = 8000;
        const worldHeight = 600;

        this.lights.enable();
        this.lights.setAmbientColor(0xffffff);

        const bg = this.add.rectangle(worldWidth / 2, 300, worldWidth, 600, 0x87CEEB).setScrollFactor(0.2);
        bg.setPipeline('Light2D');

        for (let i = 0; i < worldWidth; i += 800) {
            const water = this.add.rectangle(i + 400, 580, 800, 40, 0x0077be, 0.6).setScrollFactor(1);
            water.setPipeline('Light2D');
            this.matter.add.gameObject(water, { isStatic: true, isSensor: true, label: 'water' });
        }

        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);

        // --- ENHANCED LEVEL DESIGN ---
        createPlatform(this, 150, 520, 300, 60, 0x5d4037);
        createPlatform(this, 500, 480, 200, 40, 0x5d4037);

        // Bigger Boats
        createBoat(this, 1000, 560, 250, 40, 0x8b4513, 300, 0);
        createBoat(this, 1600, 550, 200, 40, 0x8b4513, 0, -40);
        createBoat(this, 2200, 560, 250, 40, 0x8b4513, -200, 0);

        // More Anchors
        for (let i = 0; i < 10; i++) {
            createAnchor(this, 2800 + (i * 400), 150 + (i % 2 * 100));
        }

        createPlatform(this, 4000, 450, 400, 40, 0x3e2723);

        // Large Mid-Point Ship
        createPlatform(this, 5500, 400, 800, 60, 0x3e2723);
        createPlatform(this, 5500, 300, 400, 30, 0x3e2723);

        // More Boats toward end
        createBoat(this, 6500, 560, 300, 40, 0x8b4513, 400, 0);
        createBoat(this, 7200, 560, 300, 40, 0x8b4513, -300, 0);

        // End Goal
        createPlatform(this, worldWidth - 150, 500, 300, 40, 0x2e7d32);

        // --- MASSIVE PEPPERONI SPAWN ---
        this.pepperonis = [];
        for (let x = 400; x < worldWidth - 400; x += 200) {
            spawnPepperoni(this, x, 250 + Math.random() * 200);
        }

        player = new Player(this, 100, 400);
        player.sprite.setPipeline('Light2D');

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(player.sprite, true, 0.1, 0.1);

        scoreText = document.getElementById('score');
        if (scoreText) scoreText.innerText = '0';

        this.cursors = this.input.keyboard.createCursorKeys();

        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const labels = [pair.bodyA.label, pair.bodyB.label];
                if (labels.includes('player') && labels.includes('water')) {
                    this.scene.start('GameOverScene');
                }
            });
        });
    }

    update() {
        if (player) {
            player.update(this.cursors);
        }

        this.pepperonis.forEach((pep, index) => {
            if (pep && pep.active && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, pep.x, pep.y) < 40) {
                pep.destroy();
                this.pepperonis.splice(index, 1);
                window.score += 10;
                if (scoreText) scoreText.innerText = window.score;
            }
        });
    }
}

function createPlatform(scene, x, y, width, height, color) {
    const plat = scene.add.rectangle(x, y, width, height, color);
    plat.setPipeline('Light2D');
    scene.matter.add.gameObject(plat, { isStatic: true });
}

function createBoat(scene, x, y, width, height, color, moveX, moveY) {
    const boat = scene.add.rectangle(x, y, width, height, color);
    boat.setPipeline('Light2D');
    scene.matter.add.gameObject(boat, { isStatic: true });

    scene.tweens.add({
        targets: boat,
        x: x + moveX,
        y: y + moveY,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
            if (boat.body) {
                boat.setX(boat.x);
                boat.setY(boat.y);
            }
        }
    });
}

function createAnchor(scene, x, y) {
    const anchor = scene.add.circle(x, y, 12, 0xffcc00);
    anchor.setPipeline('Light2D');
    scene.matter.add.gameObject(anchor, { isStatic: true, label: 'anchor' });
}

function spawnPepperoni(scene, x, y) {
    const pep = scene.add.circle(x, y, 12, 0xff3300);
    pep.setPipeline('Light2D');
    scene.pepperonis.push(pep);

    scene.tweens.add({
        targets: pep,
        y: y - 20,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: { gravity: { y: 1 }, debug: false }
    },
    scene: [TitleScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);
let player;
let scoreText;
