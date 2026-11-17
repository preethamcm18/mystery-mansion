// src/game/characters.js - 3D Character Models, Overhead Badges & Procedural Walking Animations

import * as THREE from 'three';

const ROLE_PALETTES = {
  detective: {
    primary: 0x9e5318, // Brown trenchcoat
    secondary: 0x3d2716, // Dark trousers
    accent: 0xe67e22, // Fedora band & badge
    skin: 0xf5cba7,
    title: 'Detective'
  },
  engineer: {
    primary: 0x2471a3, // Blue mechanic vest
    secondary: 0x1a252f, // Utility pants
    accent: 0x3498db, // Goggles & badge
    skin: 0xfad7a0,
    title: 'Engineer'
  },
  explorer: {
    primary: 0x27ae60, // Khaki adventure jacket
    secondary: 0x4d5656, // Hiking boots & cargo pants
    accent: 0x2ecc71, // Hat ribbon & badge
    skin: 0xedbb99,
    title: 'Explorer'
  },
  analyst: {
    primary: 0x6c3483, // Elegant plum vest & tie
    secondary: 0x1b2631, // Slacks
    accent: 0x9b59b6, // Gold chain & badge
    skin: 0xfdebd0,
    title: 'Analyst'
  }
};

export class Character {
  constructor(scene, role, name, isLocal = false) {
    this.scene = scene;
    this.role = role || 'detective';
    this.name = name || 'Investigator';
    this.isLocal = isLocal;
    this.palette = ROLE_PALETTES[this.role] || ROLE_PALETTES.detective;

    this.group = new THREE.Group();
    this.animTime = 0;
    this.isMoving = false;

    // Target transform for smooth network interpolation
    this.targetPos = new THREE.Vector3();
    this.targetRotY = 0;

    this.buildMesh();
    this.buildNameplate();
    this.scene.add(this.group);
  }

  buildMesh() {
    const p = this.palette;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.8 });
    const coatMat = new THREE.MeshStandardMaterial({ color: p.primary, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: p.secondary, roughness: 0.7 });
    const accentMat = new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.4, metalness: 0.3 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Torso / Coat
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), coatMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), skinMat);
    this.head.position.y = 1.7;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Role-Specific Hat / Headwear
    if (this.role === 'detective') {
      // Fedora Hat
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.04, 16), coatMat);
      brim.position.y = 1.94;
      this.group.add(brim);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.28, 16), coatMat);
      crown.position.y = 2.08;
      this.group.add(crown);

      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.33, 0.06, 16), accentMat);
      ribbon.position.y = 1.98;
      this.group.add(ribbon);
    } else if (this.role === 'engineer') {
      // Protective Goggles on forehead
      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.15), accentMat);
      goggles.position.set(0, 1.82, 0.2);
      this.group.add(goggles);

      // Tool Belt
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.1, 0.44), accentMat);
      belt.position.y = 0.65;
      this.group.add(belt);
    } else if (this.role === 'explorer') {
      // Safari Bush Hat
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), coatMat);
      brim.position.y = 1.94;
      this.group.add(brim);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.25, 16), coatMat);
      crown.position.y = 2.05;
      this.group.add(crown);

      // Adventurer Backpack
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), coatMat);
      pack.position.set(0, 1.1, -0.32);
      this.group.add(pack);
    } else if (this.role === 'analyst') {
      // Wire Spectacles
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.05), accentMat);
      glasses.position.set(0, 1.72, 0.22);
      this.group.add(glasses);

      // Tie / Cravat
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.04), accentMat);
      tie.position.set(0, 1.25, 0.22);
      this.group.add(tie);
    }

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 1.35, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), coatMat);
    lArmMesh.position.y = -0.35;
    this.leftArm.add(lArmMesh);
    this.group.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 1.35, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), coatMat);
    rArmMesh.position.y = -0.35;
    this.rightArm.add(rArmMesh);
    this.group.add(this.rightArm);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.62, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 0.25), pantsMat);
    lLegMesh.position.y = -0.32;
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.36), shoeMat);
    lBoot.position.set(0, -0.6, 0.05);
    this.leftLeg.add(lLegMesh);
    this.leftLeg.add(lBoot);
    this.group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.62, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 0.25), pantsMat);
    rLegMesh.position.y = -0.32;
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.36), shoeMat);
    rBoot.position.set(0, -0.6, 0.05);
    this.rightLeg.add(rLegMesh);
    this.rightLeg.add(rBoot);
    this.group.add(this.rightLeg);
  }

  buildNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(12, 13, 18, 0.85)';
    ctx.strokeStyle = this.palette.accent ? `#${this.palette.accent.toString(16).padStart(6, '0')}` : '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 364, 108, 24);
    ctx.fill();
    ctx.stroke();

    // Name text
    ctx.font = 'bold 36px "Segoe UI", Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name.substring(0, 14), 192, 54);

    // Role text
    ctx.font = 'bold 24px "Segoe UI", Montserrat, sans-serif';
    ctx.fillStyle = this.palette.accent ? `#${this.palette.accent.toString(16).padStart(6, '0')}` : '#d4af37';
    ctx.fillText(`★ ${this.palette.title.toUpperCase()} ★`, 192, 94);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.nameplate = new THREE.Sprite(spriteMat);
    this.nameplate.position.y = 2.35;
    this.nameplate.scale.set(1.9, 0.65, 1);
    // Hide nameplate on local player to keep screen clean and cinematic
    if (this.isLocal) {
      this.nameplate.visible = false;
    }
    this.group.add(this.nameplate);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    this.targetPos.set(x, y, z);
  }

  setRotation(rotY) {
    this.group.rotation.y = rotY;
    this.targetRotY = rotY;
  }

  setMoving(moving) {
    this.isMoving = moving;
  }

  update(delta) {
    // Remote character position interpolation
    if (!this.isLocal) {
      this.group.position.lerp(this.targetPos, 0.25);
      // Angle interpolation
      let diff = this.targetRotY - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * 0.25;
    }

    // Procedural walking animation
    if (this.isMoving) {
      this.animTime += delta * 10;
      const swing = Math.sin(this.animTime) * 0.55;

      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;

      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;

      this.torso.position.y = 1.05 + Math.abs(Math.sin(this.animTime * 2)) * 0.05;
      this.head.position.y = 1.7 + Math.abs(Math.sin(this.animTime * 2)) * 0.05;
    } else {
      // Smooth return to idle stance
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
      this.leftArm.rotation.x *= 0.8;
      this.rightArm.rotation.x *= 0.8;
      this.torso.position.y = 1.05;
      this.head.position.y = 1.7;
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.localPlayer = null;
    this.remotePlayers = new Map(); // socketId -> Character
  }

  spawnLocalPlayer(role, name, x = 0, y = 0, z = 0) {
    if (this.localPlayer) {
      this.localPlayer.destroy();
    }
    this.localPlayer = new Character(this.scene, role, name, true);
    this.localPlayer.setPosition(x, y, z);
    return this.localPlayer;
  }

  spawnRemotePlayer(id, role, name, x = 0, y = 0, z = 0) {
    if (this.remotePlayers.has(id)) {
      this.remotePlayers.get(id).destroy();
    }
    const char = new Character(this.scene, role, name, false);
    char.setPosition(x, y, z);
    this.remotePlayers.set(id, char);
    return char;
  }

  updateRemotePlayer(id, x, y, z, rotY, anim) {
    const char = this.remotePlayers.get(id);
    if (char) {
      char.targetPos.set(x, y, z);
      char.targetRotY = rotY;
      char.setMoving(anim === 'walk');
    }
  }

  removeRemotePlayer(id) {
    const char = this.remotePlayers.get(id);
    if (char) {
      char.destroy();
      this.remotePlayers.delete(id);
    }
  }

  update(delta) {
    if (this.localPlayer) {
      this.localPlayer.update(delta);
    }
    for (const char of this.remotePlayers.values()) {
      char.update(delta);
    }
  }

  clear() {
    if (this.localPlayer) {
      this.localPlayer.destroy();
      this.localPlayer = null;
    }
    for (const char of this.remotePlayers.values()) {
      char.destroy();
    }
    this.remotePlayers.clear();
  }
}
