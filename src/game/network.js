// src/game/network.js - Socket.IO Networking Engine for Mystery Mansion

import { io } from 'socket.io-client';

export class Network {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.playerRole = null;
    this.callbacks = {};

    this.lastSentPos = { x: 0, y: 0, z: 0, rotY: 0, anim: 'idle' };
    this.moveThrottleTimer = 0;

    this.initSocket();
  }

  initSocket() {
    // In production or when hosted, VITE_SERVER_URL can point to Render/custom domain
    // Supports environment variable, localStorage override, or current origin
    const customUrl = localStorage.getItem('mm_custom_server_url');
    const envUrl = import.meta.env.VITE_SERVER_URL;
    const serverUrl = customUrl || envUrl || window.location.origin;
    this.serverUrl = serverUrl;

    console.log(`📡 Connecting to multiplayer server at: ${serverUrl}`);
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1500
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.playerId = this.socket.id;
      console.log('✅ Connected to Mystery Mansion server. Socket ID:', this.playerId);
      this.trigger('connect', { id: this.playerId });
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.warn('⚠️ Disconnected from server:', reason);
      this.trigger('disconnect', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      this.trigger('error', { message: 'Could not connect to multiplayer server. Please check your network.' });
    });

    // Room & Lobby
    this.socket.on('room_created', (data) => this.trigger('room_created', data));
    this.socket.on('room_joined', (data) => {
      this.roomCode = data.roomCode;
      this.trigger('room_joined', data);
    });
    this.socket.on('lobby_update', (data) => this.trigger('lobby_update', data));
    this.socket.on('error_message', (msg) => this.trigger('error_message', msg));

    // Gameplay
    this.socket.on('game_started', (data) => {
      this.playerRole = data.player.role;
      this.trigger('game_started', data);
    });
    this.socket.on('player_moved', (data) => this.trigger('player_moved', data));
    this.socket.on('player_disconnected', (data) => this.trigger('player_disconnected', data));
    this.socket.on('chat_message', (data) => this.trigger('chat_message', data));

    // Inventory & Puzzles
    this.socket.on('inventory_updated', (data) => this.trigger('inventory_updated', data));
    this.socket.on('puzzle_solved', (data) => this.trigger('puzzle_solved', data));
    this.socket.on('puzzle_result', (data) => this.trigger('puzzle_result', data));
    this.socket.on('pedestal_state_changed', (data) => this.trigger('pedestal_state_changed', data));
    this.socket.on('four_key_unlocked', (data) => this.trigger('four_key_unlocked', data));

    // Dynamic Events & State
    this.socket.on('mansion_event', (data) => this.trigger('mansion_event', data));
    this.socket.on('timer_sync', (data) => this.trigger('timer_sync', data));
    this.socket.on('objective_updated', (data) => this.trigger('objective_updated', data));
    this.socket.on('game_ended', (data) => this.trigger('game_ended', data));
  }

  setCustomServer(url) {
    if (url && url.trim()) {
      localStorage.setItem('mm_custom_server_url', url.trim());
    } else {
      localStorage.removeItem('mm_custom_server_url');
    }
    this.initSocket();
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  createRoom(playerName) {
    this.socket.emit('create_room', { playerName });
  }

  joinRoom(roomCode, playerName) {
    this.socket.emit('join_room', { roomCode, playerName });
  }

  changeRole(role) {
    this.socket.emit('change_role', { role });
  }

  toggleReady() {
    this.socket.emit('toggle_ready');
  }

  startGame() {
    this.socket.emit('start_game');
  }

  sendMove(x, y, z, rotY, anim) {
    const distSq =
      Math.pow(x - this.lastSentPos.x, 2) +
      Math.pow(z - this.lastSentPos.z, 2) +
      Math.pow(rotY - this.lastSentPos.rotY, 2);

    const animChanged = anim !== this.lastSentPos.anim;

    if (distSq > 0.001 || animChanged) {
      this.lastSentPos = { x, y, z, rotY, anim };
      this.socket.emit('player_move', {
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        z: Number(z.toFixed(3)),
        rotY: Number(rotY.toFixed(3)),
        anim
      });
    }
  }

  sendChat(message) {
    this.socket.emit('send_chat', { message });
  }

  // Puzzles
  interactGoldenKey() {
    this.socket.emit('interact_golden_key');
  }

  submitLibraryCipher(guess) {
    this.socket.emit('submit_library_cipher', { guess });
  }

  submitElectricalGrid(connections) {
    this.socket.emit('submit_electrical_grid', { connections });
  }

  stepOnPedestal(pedestalId) {
    this.socket.emit('step_on_pedestal', { pedestalId });
  }

  stepOffPedestal(pedestalId) {
    this.socket.emit('step_off_pedestal', { pedestalId });
  }

  claimDiamond() {
    this.socket.emit('claim_diamond');
  }

  escapeMansion() {
    this.socket.emit('escape_mansion');
  }
}
