import { Player } from './scripts/Player.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: true // Showing hitboxes to help testing
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let player;
let cursors;
let score = 0;
let scoreText;

function preload() {
    // Attempting to load assets, fallback to placeholders if they don't exist
    this.load.image('noid', 'assets/noid_sprite.png');
    this.load.image('pepperoni', 'assets/pepperoni.png');
    this.load.image('tileset', 'assets/tileset_port.png');
}

function create() {
    const scene = this;

    // Background
    this.add.rectangle(400, 300, 800, 600, 0x1a2b3c).setScrollFactor(0);

    // Add some "water" at the bottom
    this.add.rectangle(400, 580, 800, 40, 0x0077be, 0.5).setScrollFactor(0);

    // TEST RECTANGLE
    this.add.rectangle(400, 300, 100, 100, 0xff00ff).setScrollFactor(0);

    // Create World Boundaries
    this.matter.world.setBounds(0, 0, 2000, 600);

    // Initial Platforms (Wooden Docks)
    createPlatform(this, 100, 500, 200, 40, 0x8b4513);
    createPlatform(this, 1600, 500, 400, 40, 0x8b4513); // End platform

    // Floating Boats (Moving Platforms)
    createBoat(this, 400, 450, 150, 40, 0x00aaff, 100, 0); // Horizontal boat
    createBoat(this, 800, 400, 150, 40, 0x00aaff, 0, 100);  // Vertical boat
    createBoat(this, 1200, 350, 150, 40, 0x00aaff, 150, 0); // Long horizontal boat

    // Floating Anchor Points for Grappling Hook
    createAnchor(this, 300, 200);
    createAnchor(this, 600, 150);
    createAnchor(this, 900, 200);
    createAnchor(this, 1100, 150);
    createAnchor(this, 1400, 100);

    // Pepperonis (Collectibles)
    this.pepperonis = [];
    spawnPepperoni(this, 400, 380);
    spawnPepperoni(this, 800, 300);
    spawnPepperoni(this, 1200, 280);
    spawnPepperoni(this, 1500, 200);

    // Player
    // player = new Player(this, 100, 400);

    // Camera
    this.cameras.main.setBounds(0, 0, 2000, 600);
    // this.cameras.main.startFollow(player.sprite, true, 0.1, 0.1);

    // UI Reference
    scoreText = document.getElementById('score');

    // Input
    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    /*
    if (player) {
        player.update(cursors);
    }
    */

    // Check Pepperoni Collection
    /*
    this.pepperonis.forEach((pep, index) => {
        if (pep && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, pep.x, pep.y) < 40) {
            pep.destroy();
            this.pepperonis.splice(index, 1);
            score += 10;
            scoreText.innerText = score;
        }
    });
    */
}

function createPlatform(scene, x, y, width, height, color) {
    const plat = scene.add.rectangle(x, y, width, height, color);
    scene.matter.add.gameObject(plat, { isStatic: true });
}

function createBoat(scene, x, y, width, height, color, moveX, moveY) {
    const boat = scene.add.rectangle(x, y, width, height, color);
    scene.matter.add.gameObject(boat, { isStatic: true });

    // Moving boat animation
    scene.tweens.add({
        targets: boat,
        x: x + moveX,
        y: y + moveY,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
            // Necessary to update Matter body position
            boat.setX(boat.x);
            boat.setY(boat.y);
        }
    });
}

function createAnchor(scene, x, y) {
    const anchor = scene.add.circle(x, y, 10, 0xffcc00);
    scene.matter.add.gameObject(anchor, { isStatic: true, label: 'anchor' });
    // Add a little visual effect
    scene.add.circle(x, y, 15, 0xffcc00, 0.2);
}

function spawnPepperoni(scene, x, y) {
    const pep = scene.add.circle(x, y, 8, 0xff3300);
    scene.pepperonis.push(pep);

    // Floating animation
    scene.tweens.add({
        targets: pep,
        y: y - 10,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}
