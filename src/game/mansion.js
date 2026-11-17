// src/game/mansion.js - Procedural Victorian Mansion Environment, Props & Interactive Zones

import * as THREE from 'three';

export class Mansion {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Array of AABB { minX, maxX, minZ, maxZ, name }
    this.interactables = []; // Array of { id, name, position, radius, prompt, callback }
    this.doors = {}; // name -> { mesh, isOpen, openAnim }
    this.pedestalMeshes = [];
    this.diamondMesh = null;
    this.diamondParticles = null;

    this.materials = this.createMaterials();
    this.buildMansion();
  }

  createMaterials() {
    // Generate Rich Procedural Canvas Textures
    const woodTex = this.createWoodTexture();
    const stoneTex = this.createStoneTexture();
    const wallpaperTex = this.createWallpaperTexture();
    const rugTex = this.createRugTexture();

    return {
      woodFloor: new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.55,
        metalness: 0.1
      }),
      darkWall: new THREE.MeshStandardMaterial({
        map: wallpaperTex,
        roughness: 0.75,
        metalness: 0.1
      }),
      woodPanel: new THREE.MeshStandardMaterial({
        color: 0x3d2012,
        roughness: 0.45,
        metalness: 0.15
      }),
      stoneWall: new THREE.MeshStandardMaterial({
        map: stoneTex,
        roughness: 0.85,
        metalness: 0.1
      }),
      rug: new THREE.MeshStandardMaterial({
        map: rugTex,
        roughness: 0.95
      }),
      goldMetal: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.92,
        roughness: 0.22
      }),
      ironMetal: new THREE.MeshStandardMaterial({
        color: 0x1f2229,
        metalness: 0.85,
        roughness: 0.35
      }),
      bookSpine: new THREE.MeshStandardMaterial({
        color: 0x4a1e1b,
        roughness: 0.7
      }),
      glowingBlue: new THREE.MeshStandardMaterial({
        color: 0x00d2ff,
        emissive: 0x0088cc,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.5
      })
    };
  }

  createWoodTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2012';
    ctx.fillRect(0, 0, 512, 512);

    // Planks
    const plankH = 64;
    for (let y = 0; y < 512; y += plankH) {
      ctx.fillStyle = (y / plankH) % 2 === 0 ? '#452616' : '#331c10';
      ctx.fillRect(0, y, 512, plankH - 2);
      ctx.fillStyle = '#1a0e08';
      ctx.fillRect(0, y + plankH - 2, 512, 2); // Groove

      // Grain lines
      ctx.strokeStyle = 'rgba(20, 10, 5, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.random() * plankH);
        ctx.lineTo(512, y + Math.random() * plankH);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  createStoneTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#22252c';
    ctx.fillRect(0, 0, 512, 512);

    // Stone blocks with mortar
    const blockH = 48;
    const blockW = 96;
    for (let row = 0; row < 12; row++) {
      const offsetX = (row % 2) * (blockW / 2);
      for (let col = -1; col < 7; col++) {
        const x = col * blockW + offsetX;
        const y = row * blockH;
        const shade = Math.floor(Math.random() * 20 - 10);
        ctx.fillStyle = `rgb(${40 + shade}, ${44 + shade}, ${50 + shade})`;
        ctx.fillRect(x + 2, y + 2, blockW - 4, blockH - 4);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    return tex;
  }

  createWallpaperTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c2028';
    ctx.fillRect(0, 0, 256, 256);

    // Victorian damask pattern
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
    ctx.lineWidth = 2;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x + 20, y);
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y + 20);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  }

  createRugTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#611616';
    ctx.fillRect(0, 0, 512, 512);

    // Gold borders
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, 480, 480);
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 440, 440);

    // Central medallion
    ctx.fillStyle = '#400d0d';
    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  addCollider(minX, maxX, minZ, maxZ, name = 'wall') {
    this.colliders.push({ minX, maxX, minZ, maxZ, name });
  }

  removeCollider(name) {
    this.colliders = this.colliders.filter(c => c.name !== name);
  }

  buildMansion() {
    this.buildMainHall();
    this.buildLibrary();
    this.buildLaboratory();
    this.buildBasement();
    this.buildTreasureRoom();
  }

  // ==========================================
  // ROOM 1: MAIN HALL
  // Bounds: X [-8, 8], Z [-8, 12]
  // ==========================================
  buildMainHall() {
    const group = new THREE.Group();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 20),
      this.materials.woodFloor
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2);
    floor.receiveShadow = true;
    group.add(floor);

    // Ornate Red Rug in Center
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 12),
      this.materials.rug
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 2);
    rug.receiveShadow = true;
    group.add(rug);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 20),
      this.materials.darkWall
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, 2);
    group.add(ceiling);

    // Walls
    // South Wall (Front Entrance): X [-8, 8], Z = 12
    this.createWallWithDoorway(group, 0, 12, 16, 6, 3.5, 4, 'main_entrance');
    this.addCollider(-8, -2, 11.5, 12.5, 'hall_south_l');
    this.addCollider(2, 8, 11.5, 12.5, 'hall_south_r');

    // Grand Entrance Gate (Escape Exit)
    const gateGeo = new THREE.BoxGeometry(3.6, 3.8, 0.2);
    const gate = new THREE.Mesh(gateGeo, this.materials.ironMetal);
    gate.position.set(0, 1.9, 12);
    group.add(gate);
    this.interactables.push({
      id: 'escape_gate',
      name: 'Mansion Grand Gates',
      position: new THREE.Vector3(0, 1.5, 11),
      radius: 2.5,
      prompt: 'Escape Mansion (Requires Diamond)'
    });

    // West Wall: X = -8, Z [-8, 12]
    this.createSolidWall(group, -8, 2, 0.4, 6, 20, Math.PI / 2);
    this.addCollider(-8.5, -7.5, -8, 12, 'hall_west');

    // East Wall: X = 8, Z [-8, 12]
    this.createSolidWall(group, 8, 2, 0.4, 6, 20, Math.PI / 2);
    this.addCollider(7.5, 8.5, -8, 12, 'hall_east');

    // North Wall (Leading to Library): X [-8, 8], Z = -8 with door opening
    this.createWallWithDoorway(group, 0, -8, 16, 6, 3.2, 4.2, 'library_doorway');
    this.addCollider(-8, -1.8, -8.5, -7.5, 'hall_north_l');
    this.addCollider(1.8, 8, -8.5, -7.5, 'hall_north_r');

    // Library Double Oak Doors (Initially LOCKED, requires Golden Key)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, -8);

    const doorPanelL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 0.18), this.materials.woodPanel);
    doorPanelL.position.set(-0.8, 2, 0);
    const doorPanelR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 0.18), this.materials.woodPanel);
    doorPanelR.position.set(0.8, 2, 0);

    doorGroup.add(doorPanelL);
    doorGroup.add(doorPanelR);
    group.add(doorGroup);

    this.doors['library_door'] = {
      mesh: doorGroup,
      isOpen: false,
      leftPanel: doorPanelL,
      rightPanel: doorPanelR
    };
    this.addCollider(-1.8, 1.8, -8.4, -7.6, 'door_library_locked');

    // Grand Fireplace on West Wall
    this.createFireplace(group, -7.3, 0, 2);

    // Antique Display Cabinet (Holds the Golden Key)
    this.createCabinet(group, 6.8, 0, 4);
    this.interactables.push({
      id: 'golden_key_cabinet',
      name: 'Antique Display Cabinet',
      position: new THREE.Vector3(6.8, 1, 4),
      radius: 2.2,
      prompt: 'Search Display Cabinet'
    });

    // Antique Portraits
    this.createPainting(group, -7.7, 3, 7, 1.8, 2.4, 0x442211);
    this.createPainting(group, 7.7, 3, 8, 2.2, 1.6, 0x112233);

    this.scene.add(group);
  }

  // ==========================================
  // ROOM 2: LIBRARY
  // Bounds: X [-8, 8], Z [-28, -8]
  // ==========================================
  buildLibrary() {
    const group = new THREE.Group();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 20),
      this.materials.woodFloor
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -18);
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 20),
      this.materials.darkWall
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, -18);
    group.add(ceiling);

    // West Wall: X = -8, Z [-28, -8]
    this.createSolidWall(group, -8, -18, 0.4, 6, 20, Math.PI / 2);
    this.addCollider(-8.5, -7.5, -28, -8, 'lib_west');

    // North Wall: Z = -28, X [-8, 8]
    this.createSolidWall(group, 0, -28, 16, 6, 0.4);
    this.addCollider(-8, 8, -28.5, -27.5, 'lib_north');

    // East Wall: X = 8, Z [-28, -8] with Secret Bookshelf passage to Lab at Z = -20
    this.createWallWithDoorway(group, 8, -18, 20, 6, 3.0, 4.2, 'secret_passage_opening', true);
    this.addCollider(7.5, 8.5, -28, -21.5, 'lib_east_1');
    this.addCollider(7.5, 8.5, -18.5, -8, 'lib_east_2');

    // Bookshelf Secret Door (Swings open on Cipher Solved)
    const secretBookcase = this.createBookshelf(group, 8, 0, -20, true);
    this.doors['secret_bookshelf'] = {
      mesh: secretBookcase,
      isOpen: false,
      pivotX: 8,
      pivotZ: -21.5
    };
    this.addCollider(7.6, 8.4, -21.5, -18.5, 'door_bookshelf_locked');

    // Bookshelves lining the walls
    this.createBookshelf(group, -7.3, 0, -12);
    this.createBookshelf(group, -7.3, 0, -16);
    this.createBookshelf(group, -7.3, 0, -20);
    this.createBookshelf(group, -7.3, 0, -24);
    this.createBookshelf(group, -3, 0, -27.3, false, Math.PI / 2);
    this.createBookshelf(group, 3, 0, -27.3, false, Math.PI / 2);

    // Study Table in Center
    this.createTable(group, 0, 0, -18);

    // Grandfather Clock
    this.createClock(group, -7.2, 0, -9.5);

    // Brass Combination Safe (Puzzle 2: Secret Message)
    const safeBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 0.5),
      this.materials.goldMetal
    );
    safeBox.position.set(-7.2, 1.8, -16);
    group.add(safeBox);

    this.interactables.push({
      id: 'library_cipher_safe',
      name: 'Bookshelf Combination Dial',
      position: new THREE.Vector3(-6.8, 1.5, -16),
      radius: 2.2,
      prompt: 'Enter 4-Digit Cipher'
    });

    this.scene.add(group);
  }

  // ==========================================
  // ROOM 3: LABORATORY
  // Bounds: X [8, 26], Z [-28, -12]
  // ==========================================
  buildLaboratory() {
    const group = new THREE.Group();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      this.materials.stoneWall
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(17, 0, -20);
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      this.materials.darkWall
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(17, 6, -20);
    group.add(ceiling);

    // North Wall: Z = -28, X [8, 26]
    this.createSolidWall(group, 17, -28, 18, 6, 0.4);
    this.addCollider(8, 26, -28.5, -27.5, 'lab_north');

    // East Wall: X = 26, Z [-28, -12]
    this.createSolidWall(group, 26, -20, 0.4, 6, 16, Math.PI / 2);
    this.addCollider(25.5, 26.5, -28, -12, 'lab_east');

    // South Wall (Leading to Basement): Z = -12, X [8, 26] with Iron Gate at X = 17
    this.createWallWithDoorway(group, 17, -12, 18, 6, 3.2, 4.2, 'basement_doorway');
    this.addCollider(8, 15.2, -12.5, -11.5, 'lab_south_1');
    this.addCollider(18.8, 26, -12.5, -11.5, 'lab_south_2');

    // Heavy Iron Gate to Basement (Requires Electrical Power Solved)
    const ironGate = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.0, 0.15),
      this.materials.ironMetal
    );
    ironGate.position.set(17, 2, -12);
    group.add(ironGate);

    this.doors['basement_gate'] = {
      mesh: ironGate,
      isOpen: false
    };
    this.addCollider(15.2, 18.8, -12.4, -11.6, 'door_basement_locked');

    // Steampunk Generator & Transformers
    this.createGenerator(group, 24, 0, -24);

    // Electrical Circuit Control Box (Puzzle 3: Connect Wires)
    const circuitPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8, roughness: 0.3 })
    );
    circuitPanel.position.set(24.5, 2.0, -20);
    group.add(circuitPanel);

    // Indicator lights on panel
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3300 })
    );
    led.position.set(24.3, 2.4, -19.8);
    group.add(led);
    this.labLed = led;

    this.interactables.push({
      id: 'lab_circuit_box',
      name: 'Electrical Circuit Grid',
      position: new THREE.Vector3(23.5, 1.5, -20),
      radius: 2.5,
      prompt: 'Repair Electrical Circuits'
    });

    // Lab Workbenches with Beakers & Flasks
    this.createWorkbench(group, 14, 0, -25);
    this.createWorkbench(group, 19, 0, -25);

    this.scene.add(group);
  }

  // ==========================================
  // ROOM 4: SECRET BASEMENT
  // Bounds: X [8, 26], Z [-12, 4]
  // ==========================================
  buildBasement() {
    const group = new THREE.Group();

    // Floor (Ancient flagstones)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      this.materials.stoneWall
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(17, 0, -4);
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      this.materials.darkWall
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(17, 5, -4);
    group.add(ceiling);

    // West Wall: X = 8, Z [-12, 4]
    this.createSolidWall(group, 8, -4, 0.4, 5, 16, Math.PI / 2);
    this.addCollider(7.5, 8.5, -12, 4, 'base_west');

    // South Wall: Z = 4, X [8, 26]
    this.createSolidWall(group, 17, 4, 18, 5, 0.4);
    this.addCollider(8, 26, 3.5, 4.5, 'base_south');

    // East Wall (Leading to Treasure Room): X = 26, Z [-12, 4] with Vault Portal at Z = -4
    this.createWallWithDoorway(group, 26, -4, 16, 5, 3.4, 4.0, 'vault_portal', true);
    this.addCollider(25.5, 26.5, -12, -6, 'base_east_1');
    this.addCollider(25.5, 26.5, -2, 4, 'base_east_2');

    // Grand Circular Vault Door (Puzzle 4: Four-Key Mechanism)
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(26, 2, -4);
    const vaultDoor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.3, 24),
      this.materials.goldMetal
    );
    vaultDoor.rotation.z = Math.PI / 2;
    vaultGroup.add(vaultDoor);
    group.add(vaultGroup);

    this.doors['treasure_vault'] = {
      mesh: vaultGroup,
      isOpen: false
    };
    this.addCollider(25.6, 26.4, -5.8, -2.2, 'door_vault_locked');

    // 4 Pressure Pedestals on the floor for the 4-Player Mechanism
    // Distinct corners:
    // 0: Detective (Orange) at (13, 0, -8)
    // 1: Engineer (Blue) at (21, 0, -8)
    // 2: Explorer (Green) at (13, 0, 0)
    // 3: Analyst (Purple) at (21, 0, 0)
    const pedestalConfigs = [
      { id: 0, role: 'Detective', color: 0xe67e22, x: 13, z: -8 },
      { id: 1, role: 'Engineer', color: 0x3498db, x: 21, z: -8 },
      { id: 2, role: 'Explorer', color: 0x2ecc71, x: 13, z: 0 },
      { id: 3, role: 'Analyst', color: 0x9b59b6, x: 21, z: 0 }
    ];

    pedestalConfigs.forEach(cfg => {
      const ped = this.createPedestal(group, cfg.x, 0, cfg.z, cfg.color, cfg.role);
      this.pedestalMeshes.push(ped);

      this.interactables.push({
        id: `pedestal_${cfg.id}`,
        name: `${cfg.role} Pressure Switch`,
        position: new THREE.Vector3(cfg.x, 0.5, cfg.z),
        radius: 1.8,
        pedestalId: cfg.id,
        prompt: `Hold Switch (${cfg.role})`
      });
    });

    this.scene.add(group);
  }

  // ==========================================
  // ROOM 5: TREASURE ROOM & DIAMOND
  // Bounds: X [26, 38], Z [-10, 2]
  // ==========================================
  buildTreasureRoom() {
    const group = new THREE.Group();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x1f1912, roughness: 0.4, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(32, 0, -4);
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      this.materials.darkWall
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(32, 5, -4);
    group.add(ceiling);

    // Walls
    this.createSolidWall(group, 32, -10, 12, 5, 0.4);
    this.addCollider(26, 38, -10.5, -9.5, 'treas_north');

    this.createSolidWall(group, 32, 2, 12, 5, 0.4);
    this.addCollider(26, 38, 1.5, 2.5, 'treas_south');

    this.createSolidWall(group, 38, -4, 0.4, 5, 12, Math.PI / 2);
    this.addCollider(37.5, 38.5, -10, 2, 'treas_east');

    // Central Ornate Plinth for the Diamond
    const plinthGeo = new THREE.CylinderGeometry(1.2, 1.5, 1.2, 12);
    const plinth = new THREE.Mesh(plinthGeo, this.materials.goldMetal);
    plinth.position.set(32, 0.6, -4);
    group.add(plinth);

    // THE 200-CARAT BLUE STAR DIAMOND!
    const diamondGroup = new THREE.Group();
    diamondGroup.position.set(32, 2.0, -4);

    const diamondGeo = new THREE.OctahedronGeometry(0.55, 1);
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d2ff,
      emissive: 0x0055aa,
      emissiveIntensity: 0.9,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 2.4,
      reflectivity: 0.9
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamondGroup.add(diamond);

    // Particle Glow Sparkles
    const pCount = 30;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 1.6;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x88eeff,
      size: 0.08,
      transparent: true,
      opacity: 0.8
    });
    const particles = new THREE.Points(pGeo, pMat);
    diamondGroup.add(particles);

    group.add(diamondGroup);
    this.diamondMesh = diamondGroup;

    // Treasure Chests in corners
    this.createChest(group, 36, 0, -8);
    this.createChest(group, 36, 0, 0);

    this.interactables.push({
      id: 'priceless_diamond',
      name: '200-Carat Blue Star Diamond',
      position: new THREE.Vector3(32, 1.5, -4),
      radius: 2.5,
      prompt: 'Retrieve the Missing Diamond!'
    });

    this.scene.add(group);
  }

  // ==========================================
  // HELPER MESH BUILDERS
  // ==========================================
  createSolidWall(parent, x, z, width, height, depth, rotY = 0) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.materials.darkWall
    );
    wall.position.set(x, height / 2, z);
    wall.rotation.y = rotY;
    wall.receiveShadow = true;
    parent.add(wall);
  }

  createWallWithDoorway(parent, x, z, totalWidth, height, doorWidth, doorHeight, name, isRotated = false) {
    const sideWidth = (totalWidth - doorWidth) / 2;
    const topHeight = height - doorHeight;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (isRotated) group.rotation.y = Math.PI / 2;

    // Left wall piece
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(sideWidth, height, 0.4),
      this.materials.darkWall
    );
    leftWall.position.set(-totalWidth / 2 + sideWidth / 2, height / 2, 0);
    group.add(leftWall);

    // Right wall piece
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(sideWidth, height, 0.4),
      this.materials.darkWall
    );
    rightWall.position.set(totalWidth / 2 - sideWidth / 2, height / 2, 0);
    group.add(rightWall);

    // Top lintel piece
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, topHeight, 0.4),
      this.materials.darkWall
    );
    lintel.position.set(0, height - topHeight / 2, 0);
    group.add(lintel);

    parent.add(group);
  }

  createFireplace(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = Math.PI / 2;

    // Mantel
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.6, 1.2), this.materials.stoneWall);
    mantel.position.y = 1.3;
    group.add(mantel);

    // Hearth cavity
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.6, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 })
    );
    cavity.position.set(0, 0.9, 0.2);
    group.add(cavity);

    // Glowing Embers
    const fireLight = new THREE.PointLight(0xff5511, 1.6, 6);
    fireLight.position.set(0, 0.8, 0.3);
    group.add(fireLight);

    parent.add(group);
  }

  createCabinet(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = -Math.PI / 2;

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.9), this.materials.woodPanel);
    body.position.y = 1.6;
    group.add(body);

    // Glass panel
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x88bbcc, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.4 })
    );
    glass.position.set(0, 1.8, 0.46);
    group.add(glass);

    // Glowing key inside
    const key = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 8, 16),
      this.materials.goldMetal
    );
    key.position.set(0, 1.8, 0.2);
    group.add(key);

    parent.add(group);
  }

  createBookshelf(parent, x, y, z, isSecret = false, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    // Shelving Unit
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.4, 0.8), this.materials.woodPanel);
    shelf.position.y = 2.2;
    group.add(shelf);

    // Rows of Books
    const bookColors = [0x7a2222, 0x1d3d63, 0x245431, 0x543818];
    for (let row = 0; row < 4; row++) {
      for (let b = 0; b < 9; b++) {
        const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[(row + b) % bookColors.length], roughness: 0.8 });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.6), bookMat);
        book.position.set(-1.1 + b * 0.28, 0.9 + row * 0.95, 0.05);
        group.add(book);
      }
    }

    parent.add(group);
    return group;
  }

  createTable(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const top = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.15, 2.4), this.materials.woodPanel);
    top.position.y = 1.1;
    group.add(top);

    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 1.1, 8);
    const legPositions = [
      [-1.8, 0.55, -1.0],
      [1.8, 0.55, -1.0],
      [-1.8, 0.55, 1.0],
      [1.8, 0.55, 1.0]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, this.materials.woodPanel);
      leg.position.set(...pos);
      group.add(leg);
    });

    this.addCollider(x - 2.1, x + 2.1, z - 1.3, z + 1.3, 'table_center');
    parent.add(group);
  }

  createClock(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.8, 0.7), this.materials.woodPanel);
    body.position.y = 1.9;
    group.add(body);

    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16),
      this.materials.goldMetal
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 3.2, 0.38);
    group.add(clockFace);

    parent.add(group);
  }

  createGenerator(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 2.0), this.materials.ironMetal);
    base.position.y = 0.7;
    group.add(base);

    // Copper Coils
    const coil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 })
    );
    coil.position.set(0, 1.8, 0);
    group.add(coil);

    this.addCollider(x - 1.4, x + 1.4, z - 1.2, z + 1.2, 'generator');
    parent.add(group);
  }

  createWorkbench(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.6), this.materials.woodPanel);
    bench.position.y = 0.6;
    group.add(bench);

    // Beakers
    const beakerGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 8);
    const beakerMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 });
    const beaker = new THREE.Mesh(beakerGeo, beakerMat);
    beaker.position.set(0.6, 1.4, 0);
    group.add(beaker);

    this.addCollider(x - 1.8, x + 1.8, z - 0.9, z + 0.9, 'workbench');
    parent.add(group);
  }

  createPedestal(parent, x, y, z, color, role) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Base plinth
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.25, 16),
      this.materials.ironMetal
    );
    base.position.y = 0.125;
    group.add(base);

    // Pressure plate
    const plateMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2
    });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 16), plateMat);
    plate.position.y = 0.28;
    group.add(plate);

    parent.add(group);
    return { group, plate, plateMat, color };
  }

  createChest(parent, x, y, z) {
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.1), this.materials.woodPanel);
    chest.position.set(x, 0.5, z);
    parent.add(chest);
  }

  createPainting(parent, x, y, z, width, height, frameColor) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, height, width),
      new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.5 })
    );
    frame.position.set(x, y, z);
    parent.add(frame);
  }

  // ==========================================
  // DOOR ANIMATION & UNLOCK STATE HANDLERS
  // ==========================================
  unlockDoor(doorKey) {
    if (doorKey === 'library') {
      const door = this.doors['library_door'];
      if (door && !door.isOpen) {
        door.isOpen = true;
        this.removeCollider('door_library_locked');
        // Swing doors open
        door.leftPanel.rotation.y = -Math.PI / 2.2;
        door.leftPanel.position.set(-1.4, 2, -0.6);
        door.rightPanel.rotation.y = Math.PI / 2.2;
        door.rightPanel.position.set(1.4, 2, -0.6);
      }
    } else if (doorKey === 'laboratory') {
      const door = this.doors['secret_bookshelf'];
      if (door && !door.isOpen) {
        door.isOpen = true;
        this.removeCollider('door_bookshelf_locked');
        // Swing bookcase out into the room
        door.mesh.rotation.y = -Math.PI / 2;
        door.mesh.position.set(6.8, 0, -21.5);
      }
    } else if (doorKey === 'basement') {
      const gate = this.doors['basement_gate'];
      if (gate && !gate.isOpen) {
        gate.isOpen = true;
        this.removeCollider('door_basement_locked');
        // Slide iron gate upward
        gate.mesh.position.y = 5.5;
        if (this.labLed) this.labLed.material.color.setHex(0x00ff00);
      }
    } else if (doorKey === 'treasure_room') {
      const vault = this.doors['treasure_vault'];
      if (vault && !vault.isOpen) {
        vault.isOpen = true;
        this.removeCollider('door_vault_locked');
        // Swing circular vault door wide open
        vault.mesh.position.set(26, 2, -1.8);
        vault.mesh.rotation.y = Math.PI / 2;
      }
    }
  }

  setPedestalActive(id, active) {
    const ped = this.pedestalMeshes[id];
    if (ped) {
      ped.plate.position.y = active ? 0.16 : 0.28;
      ped.plateMat.emissiveIntensity = active ? 1.0 : 0.3;
    }
  }

  hideDiamond() {
    if (this.diamondMesh) {
      this.diamondMesh.visible = false;
    }
  }

  update(delta) {
    // Animate the rotating floating diamond
    if (this.diamondMesh && this.diamondMesh.visible) {
      this.diamondMesh.rotation.y += delta * 1.5;
      this.diamondMesh.position.y = 2.0 + Math.sin(Date.now() * 0.003) * 0.15;
    }
  }

  // Returns true if position (x, z) collides with any wall/door box with character radius
  checkCollision(x, z, radius = 0.45) {
    for (const c of this.colliders) {
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  // Checks nearby interactable object within radius
  getNearbyInteractable(pos, reach = 2.4) {
    for (const item of this.interactables) {
      const dist = pos.distanceTo(item.position);
      if (dist <= (item.radius || reach)) {
        return item;
      }
    }
    return null;
  }
}
