// src/game/scene.js - Three.js Scene, Camera, Lighting & Rendering for Mystery Mansion

import * as THREE from 'three';

export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.lights = [];
    this.flickerLights = [];
    this.blackout = false;

    this.setupLighting();
    this.setupResizeListener();
  }

  setupLighting() {
    // Ambient moonlight
    this.ambientLight = new THREE.AmbientLight(0x1a2238, 0.6);
    this.scene.add(this.ambientLight);

    // Hemisphere light for soft gothic ceiling contrast
    const hemiLight = new THREE.HemisphereLight(0x2a334a, 0x110d0a, 0.4);
    this.scene.add(hemiLight);

    // Chandelier 1: Main Hall
    this.createChandelier(0, 5.5, 0, 0xffb359, 2.2, 18);

    // Chandelier 2: Library
    this.createChandelier(0, 5.5, -20, 0xffa44a, 1.9, 16);

    // Chandelier 3: Laboratory
    this.createChandelier(22, 5.5, -20, 0x58c3ff, 2.0, 16);

    // Chandelier 4: Secret Basement & Vault
    this.createChandelier(22, 4.5, 0, 0xba68c8, 2.2, 16);

    // Sconces with warm flicker
    this.createWallSconce(-7.5, 2.8, 4, 0xff9d3b);
    this.createWallSconce(7.5, 2.8, 4, 0xff9d3b);
    this.createWallSconce(-7.5, 2.8, -4, 0xff9d3b);
    this.createWallSconce(7.5, 2.8, -4, 0xff9d3b);

    // Player personal torchlight/flashlight
    this.torchLight = new THREE.PointLight(0xffeedd, 1.2, 10);
    this.torchLight.castShadow = false;
    this.scene.add(this.torchLight);
  }

  createChandelier(x, y, z, color, intensity, distance) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = distance;
    this.scene.add(light);
    this.lights.push({ light, baseIntensity: intensity });

    // Decorative Chandelier model
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const ringGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 24);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f1a14, metalness: 0.85, roughness: 0.3 });
    const ring = new THREE.Mesh(ringGeo, metalMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Candles
    const candleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xded1bd, roughness: 0.9 });
    const flameGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(Math.cos(angle) * 1.2, 0.15, Math.sin(angle) * 1.2);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(Math.cos(angle) * 1.2, 0.35, Math.sin(angle) * 1.2);

      group.add(candle);
      group.add(flame);
    }

    // Suspension chain
    const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 6);
    const chain = new THREE.Mesh(chainGeo, metalMat);
    chain.position.y = 1.25;
    group.add(chain);

    this.scene.add(group);
  }

  createWallSconce(x, y, z, color) {
    const light = new THREE.PointLight(color, 0.9, 8);
    light.position.set(x, y, z);
    this.scene.add(light);
    this.flickerLights.push({ light, baseIntensity: 0.9 });

    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x221a0f, metalness: 0.8, roughness: 0.4 })
    );
    fixture.position.set(x, y, z);
    this.scene.add(fixture);
  }

  setBlackout(enable) {
    this.blackout = enable;
    this.lights.forEach(l => {
      l.light.intensity = enable ? 0.08 : l.baseIntensity;
    });
    this.ambientLight.intensity = enable ? 0.15 : 0.6;
    this.torchLight.intensity = enable ? 2.2 : 1.2;
    this.torchLight.distance = enable ? 14 : 10;
  }

  update(delta, playerPos) {
    // Torch follows player
    if (playerPos) {
      this.torchLight.position.set(playerPos.x, playerPos.y + 1.8, playerPos.z);
    }

    // Candle and sconce subtle atmospheric flicker
    if (!this.blackout) {
      const time = Date.now() * 0.005;
      this.flickerLights.forEach((fl, idx) => {
        const noise = Math.sin(time + idx * 2.1) * 0.15 + (Math.random() - 0.5) * 0.05;
        fl.light.intensity = Math.max(0.2, fl.baseIntensity + noise);
      });
    }
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
