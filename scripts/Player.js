export class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Try to load Noid sprite, fallback to rectangle
        this.sprite = scene.matter.add.sprite(x, y, 'noid');

        if (this.sprite.texture.key === '__MISSING') {
            this.sprite.destroy();
            // Create a Matter-wrapped rectangle Game Object
            const rect = scene.add.rectangle(x, y, 32, 48, 0xff4d4d);
            this.sprite = scene.matter.add.gameObject(rect);
            this.sprite.body.label = 'player';
        }

        this.sprite.setFixedRotation();
        this.sprite.setFriction(0.01);
        this.sprite.setBounce(0.1);

        // Movement Settings
        this.speed = 0.01;
        this.jumpForce = 12;
        this.canDoubleJump = false;
        this.isGrounded = false;

        // Grappling Hook Logic
        this.grapplePoint = null;
        this.constraint = null;
        this.line = scene.add.graphics();
        this.isGrappling = false;

        // Input Keys
        this.keys = scene.input.keyboard.addKeys('K,SHIFT,SPACE,W,A,S,D');

        // Floor Detection
        scene.matter.world.on('collisionactive', (event) => {
            event.pairs.forEach(pair => {
                if (pair.bodyA === this.sprite.body || pair.bodyB === this.sprite.body) {
                    this.isGrounded = true;
                    this.canDoubleJump = true;
                }
            });
        });
    }

    update(cursors) {
        // Horizontal Movement
        if (cursors.left.isDown || this.keys.A.isDown) {
            this.sprite.applyForce({ x: -this.speed, y: 0 });
            if (this.sprite.setFlipX) this.sprite.setFlipX(true);
        } else if (cursors.right.isDown || this.keys.D.isDown) {
            this.sprite.applyForce({ x: this.speed, y: 0 });
            if (this.sprite.setFlipX) this.sprite.setFlipX(false);
        }

        // Jump / Double Jump
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
            if (this.isGrounded) {
                this.sprite.setVelocityY(-this.jumpForce);
                this.isGrounded = false;
            } else if (this.canDoubleJump) {
                this.sprite.setVelocityY(-(this.jumpForce * 0.8));
                this.canDoubleJump = false;
            }
        }

        // Grapple Key Logic
        if (Phaser.Input.Keyboard.JustDown(this.keys.K) || Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
            this.startGrapple();
        }
        if (Phaser.Input.Keyboard.JustUp(this.keys.K) || Phaser.Input.Keyboard.JustUp(this.keys.SHIFT)) {
            this.stopGrapple();
        }

        // Draw Grapple Line
        this.line.clear();
        if (this.isGrappling && this.grapplePoint) {
            this.line.lineStyle(3, 0xffffff, 1);
            this.line.beginPath();
            this.line.moveTo(this.sprite.x, this.sprite.y);
            this.line.lineTo(this.grapplePoint.x, this.grapplePoint.y);
            this.line.strokePath();

            // Swing Impulse
            if (cursors.left.isDown || this.keys.A.isDown) {
                this.sprite.applyForce({ x: -0.005, y: 0 });
            } else if (cursors.right.isDown || this.keys.D.isDown) {
                this.sprite.applyForce({ x: 0.005, y: 0 });
            }
        }
    }

    startGrapple() {
        const bodies = this.scene.matter.world.localWorld.bodies;
        let nearestBody = null;
        let minDist = 350;

        bodies.forEach(body => {
            if (body.label === 'anchor') {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, body.position.x, body.position.y);
                if (dist < minDist && body.position.y < this.sprite.y) {
                    minDist = dist;
                    nearestBody = body;
                }
            }
        });

        if (nearestBody) {
            this.isGrappling = true;
            this.grapplePoint = { x: nearestBody.position.x, y: nearestBody.position.y };
            const currentDist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, nearestBody.position.x, nearestBody.position.y);
            this.constraint = this.scene.matter.add.constraint(this.sprite.body, nearestBody, currentDist * 0.8, 0.1);
        }
    }

    stopGrapple() {
        if (this.isGrappling) {
            this.isGrappling = false;
            if (this.constraint) {
                this.scene.matter.world.removeConstraint(this.constraint);
                this.constraint = null;
            }
            const vel = this.sprite.body.velocity;
            this.sprite.setVelocity(vel.x * 1.5, vel.y);
        }
    }
}
