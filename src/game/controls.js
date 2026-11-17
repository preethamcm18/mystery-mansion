// src/game/controls.js - Desktop WASD + Mouse Look and Mobile Virtual Joystick + Touch Camera

import * as THREE from 'three';
import { audio } from './audio.js';

export class Controls {
  constructor(camera, mansion, onInteract) {
    this.camera = camera;
    this.mansion = mansion;
    this.onInteract = onInteract;

    this.player = null; // Character instance
    this.moveSpeed = 5.2; // units per second
    this.footstepTimer = 0;

    // Camera angles
    this.yaw = 0; // Horizontal orbit around player
    this.pitch = 0.25; // Vertical tilt
    this.cameraDistance = 4.5;
    this.cameraHeight = 1.6;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // Mouse drag state
    this.isMouseDown = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    // Mobile touch joystick
    this.touchJoystick = {
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      vectorX: 0,
      vectorY: 0
    };

    // Mobile touch camera
    this.touchCamera = {
      active: false,
      touchId: null,
      prevX: 0,
      prevY: 0
    };

    this.setupDesktopInputs();
    this.setupMobileInputs();
  }

  setPlayer(player) {
    this.player = player;
    if (player) {
      this.yaw = player.group.rotation.y;
    }
  }

  setupDesktopInputs() {
    window.addEventListener('keydown', (e) => {
      // Don't capture keys if typing in chat input or puzzle input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'KeyE':
          if (this.onInteract) this.onInteract();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
      }
    });

    // Mouse camera rotation (click & drag or right click)
    window.addEventListener('mousedown', (e) => {
      if (['INPUT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName) || e.target.closest('.ui-modal')) {
        return;
      }
      this.isMouseDown = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;

      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.yaw -= deltaX * 0.005;
      this.pitch = Math.max(-0.2, Math.min(0.8, this.pitch + deltaY * 0.005));
    });
  }

  setupMobileInputs() {
    const joystickArea = document.getElementById('joystick-zone');
    const joystickThumb = document.getElementById('joystick-thumb');
    const cameraZone = document.getElementById('camera-touch-zone');
    const actionBtn = document.getElementById('btn-mobile-interact');

    if (actionBtn) {
      actionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.onInteract) this.onInteract();
      });
    }

    if (joystickArea && joystickThumb) {
      joystickArea.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        const rect = joystickArea.getBoundingClientRect();
        this.touchJoystick.active = true;
        this.touchJoystick.touchId = touch.identifier;
        this.touchJoystick.startX = rect.left + rect.width / 2;
        this.touchJoystick.startY = rect.top + rect.height / 2;
        this.touchJoystick.currentX = touch.clientX;
        this.touchJoystick.currentY = touch.clientY;
        this.updateJoystickVisual(joystickThumb);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
            this.touchJoystick.currentX = touch.clientX;
            this.touchJoystick.currentY = touch.clientY;
            this.updateJoystickVisual(joystickThumb);
          } else if (this.touchCamera.active && touch.identifier === this.touchCamera.touchId) {
            const deltaX = touch.clientX - this.touchCamera.prevX;
            const deltaY = touch.clientY - this.touchCamera.prevY;
            this.touchCamera.prevX = touch.clientX;
            this.touchCamera.prevY = touch.clientY;

            this.yaw -= deltaX * 0.007;
            this.pitch = Math.max(-0.2, Math.min(0.8, this.pitch + deltaY * 0.007));
          }
        }
      }, { passive: false });

      const endJoystick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchJoystick.touchId) {
            this.touchJoystick.active = false;
            this.touchJoystick.touchId = null;
            this.touchJoystick.vectorX = 0;
            this.touchJoystick.vectorY = 0;
            if (joystickThumb) {
              joystickThumb.style.transform = 'translate(-50%, -50%)';
            }
          }
        }
      };

      window.addEventListener('touchend', endJoystick);
      window.addEventListener('touchcancel', endJoystick);
    }

    if (cameraZone) {
      cameraZone.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        if (!this.touchCamera.active) {
          this.touchCamera.active = true;
          this.touchCamera.touchId = touch.identifier;
          this.touchCamera.prevX = touch.clientX;
          this.touchCamera.prevY = touch.clientY;
        }
      }, { passive: false });

      const endCamera = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchCamera.touchId) {
            this.touchCamera.active = false;
            this.touchCamera.touchId = null;
          }
        }
      };

      window.addEventListener('touchend', endCamera);
      window.addEventListener('touchcancel', endCamera);
    }
  }

  updateJoystickVisual(thumb) {
    const maxRadius = 45;
    let dx = this.touchJoystick.currentX - this.touchJoystick.startX;
    let dy = this.touchJoystick.currentY - this.touchJoystick.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.touchJoystick.vectorX = dx / maxRadius;
    this.touchJoystick.vectorY = dy / maxRadius;
  }

  update(delta) {
    if (!this.player) return;

    // Compute input direction vector
    let inputX = 0;
    let inputZ = 0;

    if (this.keys.forward) inputZ -= 1;
    if (this.keys.backward) inputZ += 1;
    if (this.keys.left) inputX -= 1;
    if (this.keys.right) inputX += 1;

    // Add mobile joystick vector
    if (this.touchJoystick.active) {
      inputX += this.touchJoystick.vectorX;
      inputZ += this.touchJoystick.vectorY;
    }

    const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
    const isMoving = inputLength > 0.15;

    if (isMoving) {
      // Normalize
      const normX = inputX / (inputLength > 1 ? inputLength : 1);
      const normZ = inputZ / (inputLength > 1 ? inputLength : 1);

      // Rotate move direction relative to camera yaw
      const moveAngle = Math.atan2(normX, normZ) + this.yaw + Math.PI;
      const vx = Math.sin(moveAngle) * this.moveSpeed * delta;
      const vz = Math.cos(moveAngle) * this.moveSpeed * delta;

      // Smoothly rotate character to face movement direction
      this.player.group.rotation.y = moveAngle;

      const currentPos = this.player.group.position;
      const nextX = currentPos.x + vx;
      const nextZ = currentPos.z + vz;

      // Independent axis collision detection for wall sliding
      if (!this.mansion.checkCollision(nextX, currentPos.z)) {
        currentPos.x = nextX;
      }
      if (!this.mansion.checkCollision(currentPos.x, nextZ)) {
        currentPos.z = nextZ;
      }

      this.player.setMoving(true);

      // Footstep audio
      this.footstepTimer += delta;
      if (this.footstepTimer > 0.38) {
        this.footstepTimer = 0;
        audio.playFootstep();
      }
    } else {
      this.player.setMoving(false);
      this.footstepTimer = 0.3;
    }

    // Third-person Camera position update
    const targetPos = this.player.group.position;
    const camX = targetPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;
    const camZ = targetPos.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;
    const camY = targetPos.y + this.cameraHeight + Math.sin(this.pitch) * this.cameraDistance;

    // Smooth lerp camera
    this.camera.position.lerp(new THREE.Vector3(camX, Math.max(0.6, camY), camZ), 0.15);
    this.camera.lookAt(targetPos.x, targetPos.y + 1.4, targetPos.z);
  }
}
