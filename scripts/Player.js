export class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Try to load Noid sprite, fallback to rectangle
        this.sprite = scene.matter.add.sprite(x, y, 'noid');

        if (!this.sprite || this.sprite.texture.key === '__MISSING') {
            if (this.sprite) this.sprite.destroy();
            // Create a Matter-wrapped rectangle Game Object
            const rect = scene.add.rectangle(x, y, 32, 48, 0xff4d4d);
            this.sprite = scene.matter.add.gameObject(rect);
        }

        this.sprite.body.label = 'player';

        this.sprite.setFixedRotation();
        this.sprite.setFriction(0.01, 0.02); // Lower horizontal friction, some air resistance
        this.sprite.setBounce(0.05);

        // Movement Settings
        this.moveSpeed = 0.5;
        this.maxVelocityX = 8;
        this.jumpForce = 10;
        this.canDoubleJump = false;
        this.isGrounded = false;

        // Grappling Hook Logic
        this.grapplePoint = null;
        this.constraint = null;
        this.line = scene.add.graphics();
        this.isGrappling = false;

        // Input Keys
        this.keys = scene.input.keyboard.addKeys('K,SHIFT,SPACE,W,A,S,D');

        // Floor Detection - Better logic using sensors or tracking contacts
        scene.matter.world.on('collisionactive', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if (bodyA === this.sprite.body || bodyB === this.sprite.body) {
                    // Check if collision is roughly below the player
                    const otherBody = bodyA === this.sprite.body ? bodyB : bodyA;
                    if (otherBody.position.y > this.sprite.y + 10) {
                        this.isGrounded = true;
                        this.canDoubleJump = true;
                    }
                }
            });
        });

        scene.matter.world.on('collisionend', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if (bodyA === this.sprite.body || bodyB === this.sprite.body) {
                    this.isGrounded = false;
                }
            });
        });
    }

    update(cursors) {
        const vel = this.sprite.body.velocity;
        const jumpJustDown = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W);
        const jumpIsDown = this.keys.SPACE.isDown || cursors.up.isDown || this.keys.W.isDown;

        // Horizontal Movement
        if (cursors.left.isDown || this.keys.A.isDown) {
            this.sprite.setVelocityX(Math.max(vel.x - this.moveSpeed, -this.maxVelocityX));
            if (this.sprite.setFlipX) this.sprite.setFlipX(true);
        } else if (cursors.right.isDown || this.keys.D.isDown) {
            this.sprite.setVelocityX(Math.min(vel.x + this.moveSpeed, this.maxVelocityX));
            if (this.sprite.setFlipX) this.sprite.setFlipX(false);
        } else {
            // Deceleration when not moving
            if (this.isGrounded) {
                this.sprite.setVelocityX(vel.x * 0.9);
            } else {
                this.sprite.setVelocityX(vel.x * 0.98); // Less drag in air
            }
        }

        // Jump / Double Jump
        if (jumpJustDown) {
            if (this.isGrounded) {
                this.sprite.setVelocityY(-this.jumpForce);
                this.isGrounded = false;
            } else if (this.canDoubleJump) {
                this.sprite.setVelocityY(-(this.jumpForce * 0.85));
                this.canDoubleJump = false;
            }
        }

        // Variable Jump Height: If jump button is released while moving up, cut the jump short
        if (!jumpIsDown && vel.y < -3) {
            this.sprite.setVelocityY(vel.y * 0.6);
        }

        // Update player light position if it exists
        if (this.light) {
            this.light.x = this.sprite.x;
            this.light.y = this.sprite.y;
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
            this.line.lineStyle(2, 0xeeeeee, 1);
            this.line.beginPath();
            this.line.moveTo(this.sprite.x, this.sprite.y);
            this.line.lineTo(this.grapplePoint.x, this.grapplePoint.y);
            this.line.strokePath();

            // Swing Impulse - More subtle during grapple
            if (cursors.left.isDown || this.keys.A.isDown) {
                this.sprite.applyForce({ x: -0.002, y: 0 });
            } else if (cursors.right.isDown || this.keys.D.isDown) {
                this.sprite.applyForce({ x: 0.002, y: 0 });
            }
        }
    }

    startGrapple() {
        const bodies = this.scene.matter.world.localWorld.bodies;
        let nearestBody = null;
        let minDist = 450;

        bodies.forEach(body => {
            if (body.label === 'anchor') {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, body.position.x, body.position.y);
                // Can only grapple to things above
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

            // Create a constraint that's slightly elastic
            this.constraint = this.scene.matter.add.constraint(this.sprite.body, nearestBody, currentDist, 0.1);
        }
    }

    stopGrapple() {
        if (this.isGrappling) {
            this.isGrappling = false;
            if (this.constraint) {
                this.scene.matter.world.removeConstraint(this.constraint);
                this.constraint = null;
            }
            // Give a little boost on release
            const vel = this.sprite.body.velocity;
            this.sprite.setVelocity(vel.x * 1.25, vel.y - 2);
        }
    }
}
