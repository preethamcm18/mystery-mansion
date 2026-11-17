// src/main.js - Mystery Mansion Main Game Client Orchestrator

import { GameScene } from './game/scene.js';
import { Mansion } from './game/mansion.js';
import { CharacterManager } from './game/characters.js';
import { Controls } from './game/controls.js';
import { Network } from './game/network.js';
import { PuzzleManager } from './game/puzzles.js';
import { UIManager } from './game/ui.js';
import { audio } from './game/audio.js';

class MysteryMansionGame {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.gameScene = new GameScene(this.canvas);
    this.mansion = new Mansion(this.gameScene.scene);
    this.charManager = new CharacterManager(this.gameScene.scene);
    this.network = new Network();
    this.puzzleManager = new PuzzleManager(this.network);
    this.ui = new UIManager(this.network, this.puzzleManager);

    this.localPlayer = null;
    this.currentRoom = 'Main Hall';
    this.currentObjective = 'Explore the Main Hall and search for the Golden Key.';
    this.currentPedestalPressed = null;

    this.clock = {
      lastTime: performance.now()
    };

    this.setupNetworkHandlers();
    this.setupControls();

    // Start game loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupControls() {
    this.controls = new Controls(
      this.gameScene.camera,
      this.mansion,
      () => this.handleInteraction()
    );
  }

  handleInteraction() {
    if (!this.localPlayer) return;

    const pos = this.localPlayer.group.position;
    const item = this.mansion.getNearbyInteractable(pos);

    if (!item) {
      this.ui.showToast('Nothing to examine here.');
      return;
    }

    audio.playInteract();

    if (item.id === 'golden_key_cabinet') {
      this.network.interactGoldenKey();
    } else if (item.id === 'library_cipher_safe') {
      this.puzzleManager.openCipherModal();
    } else if (item.id === 'lab_circuit_box') {
      this.puzzleManager.openElectricalGridModal(this.localPlayer.role);
    } else if (item.id.startsWith('pedestal_')) {
      this.network.stepOnPedestal(item.pedestalId);
      audio.playPedestalClick();
    } else if (item.id === 'priceless_diamond') {
      this.network.claimDiamond();
      audio.playVictory();
    } else if (item.id === 'escape_gate') {
      this.network.escapeMansion();
    }
  }

  setupNetworkHandlers() {
    // Room created / joined
    this.network.on('room_created', (data) => {
      this.ui.showScreen(this.ui.screenLobby);
      this.ui.showToast(`Room created! Code: ${data.roomCode}`);
    });

    this.network.on('room_joined', (data) => {
      this.ui.showScreen(this.ui.screenLobby);
      this.ui.showToast(`Joined room ${data.roomCode}!`);
    });

    this.network.on('lobby_update', (data) => {
      this.ui.updateLobby(data);
    });

    this.network.on('error_message', (msg) => {
      this.ui.showToast(`⚠️ ${msg}`);
    });

    // Game started
    this.network.on('game_started', (data) => {
      console.log('🎮 Game started:', data);

      // Spawn local character
      this.localPlayer = this.charManager.spawnLocalPlayer(
        data.player.role,
        data.player.name,
        data.player.x,
        data.player.y,
        data.player.z
      );
      this.controls.setPlayer(this.localPlayer);

      // Spawn other players
      data.players.forEach(p => {
        if (p.id !== this.network.playerId) {
          this.charManager.spawnRemotePlayer(p.id, p.role, p.name, p.x, p.y, p.z);
        }
      });

      // Synchronize already unlocked doors if reconnecting
      if (data.unlockedDoors) {
        data.unlockedDoors.forEach(d => this.mansion.unlockDoor(d));
      }

      this.ui.handleGameStart(data);
      this.ui.updateObjective(this.currentObjective);
    });

    // Remote player moved
    this.network.on('player_moved', (data) => {
      this.charManager.updateRemotePlayer(
        data.id,
        data.x,
        data.y,
        data.z,
        data.rotY,
        data.anim
      );
    });

    // Remote player disconnected
    this.network.on('player_disconnected', (data) => {
      this.charManager.removeRemotePlayer(data.id);
    });

    // Chat
    this.network.on('chat_message', (data) => {
      this.ui.addChatMessage(data);
    });

    // Inventory & Puzzles
    this.network.on('inventory_updated', (data) => {
      this.ui.sharedInventory = data.inventory;
      this.ui.renderInventoryModal();

      if (data.unlockedDoors) {
        data.unlockedDoors.forEach(d => this.mansion.unlockDoor(d));
      }

      // Check if diamond collected
      if (data.inventory.some(i => i.id === 'blue_diamond')) {
        this.mansion.hideDiamond();
        this.currentObjective = 'Run to the Main Hall front entrance gates to ESCAPE!';
        this.ui.updateObjective(this.currentObjective);
      } else if (data.unlockedDoors.includes('library')) {
        this.currentObjective = 'Examine the Library bookshelves and solve the 4-digit secret cipher.';
        this.ui.updateObjective(this.currentObjective);
      }
    });

    this.network.on('puzzle_solved', (data) => {
      if (data.puzzle === 'libraryCipher') {
        this.puzzleManager.handleCipherResult(true, 'Access Granted! Secret Bookshelf Opened!');
        this.mansion.unlockDoor('laboratory');
        this.currentObjective = 'Enter the Laboratory and repair the electrical generator circuits.';
        this.ui.updateObjective(this.currentObjective);
      } else if (data.puzzle === 'electricalGrid') {
        this.puzzleManager.handleGridResult(true, 'Grid Online! Power restored to Secret Basement!');
        this.mansion.unlockDoor('basement');
        this.currentObjective = 'Assemble in the Secret Basement: Stand on all 4 pedestals together!';
        this.ui.updateObjective(this.currentObjective);
      }
    });

    this.network.on('puzzle_result', (data) => {
      if (data.puzzle === 'libraryCipher') {
        this.puzzleManager.handleCipherResult(data.success, data.message);
      } else if (data.puzzle === 'electricalGrid') {
        this.puzzleManager.handleGridResult(data.success, data.message);
      }
    });

    this.network.on('pedestal_state_changed', (data) => {
      this.ui.updatePedestalStatus(data.pedestals);
      data.pedestals.forEach(p => {
        this.mansion.setPedestalActive(p.id, p.active);
      });
    });

    this.network.on('four_key_unlocked', (data) => {
      audio.playDoorUnlock();
      this.mansion.unlockDoor('treasure_room');
      this.currentObjective = 'The Grand Vault is open! Retrieve the 200-Carat Blue Star Diamond!';
      this.ui.updateObjective(this.currentObjective);
    });

    this.network.on('mansion_event', (data) => {
      if (data.type === 'blackout' || data.type === 'flicker') {
        audio.playPowerSurge();
        this.gameScene.setBlackout(true);
        setTimeout(() => {
          this.gameScene.setBlackout(false);
        }, data.duration || 5000);
      }
    });

    this.network.on('timer_sync', (data) => {
      this.ui.updateTimer(data.timeRemaining);
    });

    this.network.on('objective_updated', (data) => {
      this.ui.updateObjective(data.objective);
    });

    this.network.on('game_ended', (data) => {
      this.ui.renderEndGame(data);
    });
  }

  detectCurrentRoom(x, z) {
    if (x > 26) {
      return 'Treasure Vault';
    } else if (x >= 8 && z <= -12) {
      return 'Laboratory';
    } else if (x >= 8 && z > -12) {
      return 'Secret Basement';
    } else if (x < 8 && z <= -8) {
      return 'Library';
    } else {
      return 'Main Hall';
    }
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const delta = Math.min((currentTime - this.clock.lastTime) / 1000, 0.1);
    this.clock.lastTime = currentTime;

    // Controls and local player movement
    if (this.controls) {
      this.controls.update(delta);
    }

    if (this.localPlayer) {
      const pos = this.localPlayer.group.position;
      const rotY = this.localPlayer.group.rotation.y;
      const isMoving = this.localPlayer.isMoving;

      // Broadcast position to server throttled to ~16 Hz (eliminates network lag)
      this.netTimer = (this.netTimer || 0) + delta;
      if (this.netTimer >= 0.06) {
        this.netTimer = 0;
        this.network.sendMove(pos.x, pos.y, pos.z, rotY, isMoving ? 'walk' : 'idle');
      }

      // Update room indicator
      const room = this.detectCurrentRoom(pos.x, pos.z);
      if (room !== this.currentRoom) {
        this.currentRoom = room;
        this.ui.updateRoomName(room);
      }

      // Check nearby interactables for HUD prompt
      const item = this.mansion.getNearbyInteractable(pos);
      if (item) {
        this.ui.showInteractionPrompt(`[E] ${item.prompt}`);
      } else {
        this.ui.showInteractionPrompt(null);
      }

      // Automatic stepping on / off Basement Pedestals
      let onPedestalId = null;
      if (room === 'Secret Basement') {
        // Pedestal centers:
        // 0: (13, -8), 1: (21, -8), 2: (13, 0), 3: (21, 0)
        const pedestals = [
          { id: 0, x: 13, z: -8 },
          { id: 1, x: 21, z: -8 },
          { id: 2, x: 13, z: 0 },
          { id: 3, x: 21, z: 0 }
        ];

        for (const ped of pedestals) {
          const dist = Math.sqrt(Math.pow(pos.x - ped.x, 2) + Math.pow(pos.z - ped.z, 2));
          if (dist < 1.1) {
            onPedestalId = ped.id;
            break;
          }
        }
      }

      if (onPedestalId !== null && this.currentPedestalPressed !== onPedestalId) {
        this.currentPedestalPressed = onPedestalId;
        this.network.stepOnPedestal(onPedestalId);
        audio.playPedestalClick();
      } else if (onPedestalId === null && this.currentPedestalPressed !== null) {
        this.network.stepOffPedestal(this.currentPedestalPressed);
        this.currentPedestalPressed = null;
      }
    }

    // Update characters, mansion, scene
    this.charManager.update(delta);
    this.mansion.update(delta);
    this.gameScene.update(delta, this.localPlayer ? this.localPlayer.group.position : null);

    // Render 3D Scene
    this.gameScene.render();
  }
}

// Initialize when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new MysteryMansionGame();
});
