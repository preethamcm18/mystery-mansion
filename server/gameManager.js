// server/gameManager.js - Authoritative Multiplayer State for Mystery Mansion

const ROLES = ['detective', 'engineer', 'explorer', 'analyst'];

const ROLE_INFO = {
  detective: {
    title: 'Detective',
    color: '#e67e22',
    description: 'Finds hidden clues, analyzes physical evidence, and reconstructs historical timeline.'
  },
  engineer: {
    title: 'Engineer',
    color: '#3498db',
    description: 'Operates electrical mechanisms, restores laboratory power, and repairs complex machinery.'
  },
  explorer: {
    title: 'Explorer',
    color: '#2ecc71',
    description: 'Specializes in uncovering concealed compartments, finding secret keys, and navigating passages.'
  },
  analyst: {
    title: 'Analyst',
    color: '#9b59b6',
    description: 'Decodes ancient ciphers, translates mystical symbols, and solves mathematical locks.'
  }
};

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> roomData
    this.playerRoomMap = new Map(); // socketId -> roomCode
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocket, playerName) {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId: hostSocket.id,
      status: 'lobby', // 'lobby' | 'intro' | 'playing' | 'won' | 'lost'
      players: new Map(), // socketId -> player details
      startTime: null,
      timeRemaining: 15 * 60, // 15 minutes (900 seconds)
      timerInterval: null,
      randomEventInterval: null,
      unlockedDoors: new Set(['main_hall']), // starts in main hall
      inventory: [],
      puzzles: {
        goldenKey: {
          discovered: false,
          discoverer: null
        },
        libraryCipher: {
          solved: false,
          solution: '1894',
          currentInput: '',
          hints: {
            detective: "DETECTIVE'S JOURNAL: 'The eccentric lord vanished at the turn of the century, exactly 6 years before 1900.'",
            engineer: "CIRCUIT LOG: 'The library mechanical vault dial requires a 4-digit year. The last digit is an even integer greater than 2.'",
            explorer: "DISCOVERY LOG: 'Found a brass engraving behind the portrait: Foundation Era 18_ _.'",
            analyst: "CIPHER WHEEL: 'Roman numeral engraving on the bookshelf crown decodes to: MDCCCXCIV (1894).'"
          }
        },
        electricalGrid: {
          solved: false,
          // Wires must match: Red->3, Blue->1, Green->4, Yellow->2
          target: { Red: 3, Blue: 1, Green: 4, Yellow: 2 },
          connections: { Red: null, Blue: null, Green: null, Yellow: null },
          hints: {
            engineer: "ENGINEER SCHEMATIC: Wire Red feeds Terminal 3. Yellow feeds Terminal 2.",
            detective: "CRIME SCENE REPORT: 'Burn marks confirm high-voltage Blue wire connects to Terminal 1.'",
            explorer: "SUB-FLOOR NOTES: 'Conduit label strictly states: Green wire goes directly to Terminal 4.'",
            analyst: "VOLTAGE HARMONICS: 'Terminal ordering follows chromatic frequency: 1:Blue, 2:Yellow, 3:Red, 4:Green.'"
          }
        },
        fourKeyMechanism: {
          solved: false,
          pedestals: [
            { id: 0, role: 'detective', active: false, player: null, activatedAt: 0 },
            { id: 1, role: 'engineer', active: false, player: null, activatedAt: 0 },
            { id: 2, role: 'explorer', active: false, player: null, activatedAt: 0 },
            { id: 3, role: 'analyst', active: false, player: null, activatedAt: 0 }
          ],
          windowMs: 8000 // 8 second window to have all 4 pressed
        },
        diamond: {
          revealed: false,
          collected: false,
          collector: null
        }
      },
      stats: {
        score: 0,
        puzzlesSolved: 0,
        itemsFound: 0,
        messagesCount: 0,
        timeElapsed: 0,
        contributions: {}
      }
    };

    this.rooms.set(code, room);
    this.joinRoom(hostSocket, code, playerName, true);
    return code;
  }

  joinRoom(socket, code, playerName, isHost = false) {
    code = (code || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'Match already in progress.' };
    }

    if (room.players.size >= 4 && !room.players.has(socket.id)) {
      return { success: false, error: 'Room is full! Mystery Mansion is designed for exactly 4 players.' };
    }

    // Assign first available role
    const assignedRoles = Array.from(room.players.values()).map(p => p.role);
    const availableRole = ROLES.find(r => !assignedRoles.includes(r)) || ROLES[room.players.size % 4];

    const player = {
      id: socket.id,
      name: playerName || `Player ${room.players.size + 1}`,
      role: availableRole,
      ready: isHost ? true : false,
      isHost: isHost || room.hostId === socket.id,
      connected: true,
      x: (room.players.size - 1.5) * 2,
      y: 0,
      z: 0,
      rotY: 0,
      anim: 'idle'
    };

    room.players.set(socket.id, player);
    this.playerRoomMap.set(socket.id, code);

    socket.join(code);

    if (!room.stats.contributions[player.name]) {
      room.stats.contributions[player.name] = { puzzles: 0, items: 0, cluesShared: 0 };
    }

    this.broadcastLobbyState(code);
    return { success: true, roomCode: code, player };
  }

  changeRole(socket, role) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'lobby') return;

    if (!ROLES.includes(role)) return;

    // Check if role is taken by another player
    for (const [id, p] of room.players.entries()) {
      if (id !== socket.id && p.role === role) {
        socket.emit('error_message', `Role ${ROLE_INFO[role].title} is already chosen by ${p.name}`);
        return;
      }
    }

    const player = room.players.get(socket.id);
    if (player) {
      player.role = role;
      this.broadcastLobbyState(code);
    }
  }

  toggleReady(socket) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'lobby') return;

    const player = room.players.get(socket.id);
    if (player) {
      player.ready = !player.ready;
      this.broadcastLobbyState(code);
    }
  }

  startGame(socket) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.hostId !== socket.id) {
      socket.emit('error_message', 'Only the host can start the match.');
      return;
    }

    if (room.players.size < 4) {
      // In development or testing, warn if less than 4, but require 4 or allow host override
      // The prompt asks for exactly 4 players. For smooth playability, if 4 are present they start.
      if (room.players.size < 4) {
        socket.emit('error_message', `Waiting for 4 players! Currently ${room.players.size}/4 connected.`);
        return;
      }
    }

    // Ensure all 4 unique roles are assigned
    const rolesUsed = new Set(Array.from(room.players.values()).map(p => p.role));
    if (rolesUsed.size < room.players.size) {
      // Auto-assign distinct roles
      let roleIdx = 0;
      for (const p of room.players.values()) {
        p.role = ROLES[roleIdx++];
      }
    }

    room.status = 'playing';
    room.startTime = Date.now();
    room.timeRemaining = 15 * 60; // 15 mins

    // Set starting positions for 4 players in the Main Hall
    const startSpawns = [
      { x: -3, y: 0, z: 8, rotY: 0 },
      { x: -1, y: 0, z: 8, rotY: 0 },
      { x: 1, y: 0, z: 8, rotY: 0 },
      { x: 3, y: 0, z: 8, rotY: 0 }
    ];
    let idx = 0;
    for (const player of room.players.values()) {
      const spawn = startSpawns[idx % startSpawns.length];
      player.x = spawn.x;
      player.y = spawn.y;
      player.z = spawn.z;
      player.rotY = spawn.rotY;
      idx++;
    }

    this.startTimers(code);

    // Send game start to each player with their specific asymmetric clue
    for (const [id, player] of room.players.entries()) {
      this.io.to(id).emit('game_started', {
        roomCode: code,
        player,
        players: Array.from(room.players.values()),
        roleInfo: ROLE_INFO[player.role],
        privateClues: this.getPrivateCluesForRole(room, player.role),
        inventory: room.inventory,
        unlockedDoors: Array.from(room.unlockedDoors),
        timeRemaining: room.timeRemaining
      });
    }

    this.sendSystemMessage(code, "Welcome to Blackwood Manor. You have 15 minutes to find the missing 200-carat diamond and escape. Communicate with your team!");
  }

  getPrivateCluesForRole(room, role) {
    const clues = [];
    if (role === 'detective') {
      clues.push({
        id: 'det_1',
        title: 'Manor History Record',
        text: room.puzzles.libraryCipher.hints.detective
      });
      clues.push({
        id: 'det_2',
        title: 'Laboratory Burned Blueprint',
        text: room.puzzles.electricalGrid.hints.detective
      });
      clues.push({
        id: 'det_3',
        title: 'Master Chamber Note',
        text: "The final vault responds only when all 4 investigators press the 4 corner pedestals simultaneously."
      });
    } else if (role === 'engineer') {
      clues.push({
        id: 'eng_1',
        title: 'Lock Mechanism Diagram',
        text: room.puzzles.libraryCipher.hints.engineer
      });
      clues.push({
        id: 'eng_2',
        title: 'Power Station Wiring Blueprint',
        text: room.puzzles.electricalGrid.hints.engineer
      });
      clues.push({
        id: 'eng_3',
        title: 'Capacitor Threshold',
        text: "The hydraulic vault seals trigger a reset unless all 4 pressure plates hold within 8 seconds."
      });
    } else if (role === 'explorer') {
      clues.push({
        id: 'exp_1',
        title: 'Hidden Plaque Inscription',
        text: room.puzzles.libraryCipher.hints.explorer
      });
      clues.push({
        id: 'exp_2',
        title: 'Sub-Basement Maintenance Log',
        text: room.puzzles.electricalGrid.hints.explorer
      });
      clues.push({
        id: 'exp_3',
        title: 'Secret Passage Chart',
        text: "The Golden Key is hidden in the Main Hall antique display cabinet near the grand staircase."
      });
    } else if (role === 'analyst') {
      clues.push({
        id: 'ana_1',
        title: 'Spine Cipher Translation',
        text: room.puzzles.libraryCipher.hints.analyst
      });
      clues.push({
        id: 'ana_2',
        title: 'Frequency Resonance Table',
        text: room.puzzles.electricalGrid.hints.analyst
      });
      clues.push({
        id: 'ana_3',
        title: 'Vault Cryptogram',
        text: "Four switches, four hearts. The diamond rests within the central plinth once all gears mesh together."
      });
    }
    return clues;
  }

  startTimers(code) {
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.randomEventInterval) clearInterval(room.randomEventInterval);

    room.timerInterval = setInterval(() => {
      if (room.status !== 'playing') {
        clearInterval(room.timerInterval);
        return;
      }

      room.timeRemaining--;
      room.stats.timeElapsed++;

      if (room.timeRemaining % 5 === 0) {
        this.io.to(code).emit('timer_sync', { timeRemaining: room.timeRemaining });
      }

      if (room.timeRemaining <= 0) {
        this.handleGameOver(code, false, 'Time expired! The manor locked forever.');
      }
    }, 1000);

    // Random atmospheric events every 60-90 seconds (flickering lights, eerie whispers)
    room.randomEventInterval = setInterval(() => {
      if (room.status !== 'playing') {
        clearInterval(room.randomEventInterval);
        return;
      }
      this.triggerRandomMansionEvent(code);
    }, 45000);
  }

  triggerRandomMansionEvent(code) {
    const room = this.rooms.get(code);
    if (!room) return;

    const events = [
      {
        type: 'blackout',
        duration: 6000,
        message: '⚡ The mansion power surged! The lights have temporarily gone dark!'
      },
      {
        type: 'whisper',
        duration: 4000,
        message: '👻 An eerie gust blows through the corridor... a grandfather clock chimes.'
      },
      {
        type: 'flicker',
        duration: 5000,
        message: '💡 The chandeliers flicker violently! Something stirred in the laboratory.'
      }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    this.io.to(code).emit('mansion_event', ev);
    this.sendSystemMessage(code, ev.message);
  }

  handlePlayerMove(socket, data) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.z = data.z;
    player.rotY = data.rotY;
    player.anim = data.anim || 'idle';

    // Broadcast to other players in room
    socket.to(code).emit('player_moved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      z: player.z,
      rotY: player.rotY,
      anim: player.anim
    });
  }

  handleChat(socket, message) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const cleanMsg = (message || '').trim().substring(0, 200);
    if (!cleanMsg) return;

    room.stats.messagesCount++;
    if (room.stats.contributions[player.name]) {
      room.stats.contributions[player.name].cluesShared++;
    }

    this.io.to(code).emit('chat_message', {
      senderId: socket.id,
      senderName: player.name,
      senderRole: player.role,
      roleTitle: ROLE_INFO[player.role].title,
      roleColor: ROLE_INFO[player.role].color,
      message: cleanMsg,
      timestamp: Date.now()
    });
  }

  sendSystemMessage(code, text) {
    this.io.to(code).emit('chat_message', {
      senderId: 'system',
      senderName: 'MANSION',
      senderRole: 'system',
      roleTitle: 'EVENT',
      roleColor: '#d4af37',
      message: text,
      timestamp: Date.now()
    });
  }

  // --- PUZZLE 1: HIDDEN GOLDEN KEY ---
  interactGoldenKey(socket) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (room.puzzles.goldenKey.discovered) {
      socket.emit('interaction_feedback', { success: false, message: 'The cabinet is empty. The Golden Key was already collected.' });
      return;
    }

    const player = room.players.get(socket.id);
    room.puzzles.goldenKey.discovered = true;
    room.puzzles.goldenKey.discoverer = player.name;
    room.inventory.push({ id: 'golden_key', name: 'Golden Manor Key', desc: 'Opens the Library double oak doors.' });
    room.unlockedDoors.add('library');
    room.stats.itemsFound++;
    room.stats.score += 250;
    if (room.stats.contributions[player.name]) {
      room.stats.contributions[player.name].items++;
    }

    this.io.to(code).emit('inventory_updated', {
      inventory: room.inventory,
      unlockedDoors: Array.from(room.unlockedDoors),
      recentItem: 'Golden Manor Key'
    });

    this.sendSystemMessage(code, `🗝️ ${player.name} (${ROLE_INFO[player.role].title}) found the GOLDEN KEY! The Library doors are now unlocked.`);
  }

  // --- PUZZLE 2: LIBRARY SECRET CIPHER ---
  submitLibraryCipher(socket, guess) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (room.puzzles.libraryCipher.solved) {
      socket.emit('puzzle_result', { puzzle: 'libraryCipher', success: true, message: 'The secret bookshelf passage is already open.' });
      return;
    }

    const player = room.players.get(socket.id);
    const cleanGuess = (guess || '').trim();

    if (cleanGuess === room.puzzles.libraryCipher.solution) {
      room.puzzles.libraryCipher.solved = true;
      room.unlockedDoors.add('laboratory');
      room.stats.puzzlesSolved++;
      room.stats.score += 500;
      if (room.stats.contributions[player.name]) {
        room.stats.contributions[player.name].puzzles++;
      }

      this.io.to(code).emit('puzzle_solved', {
        puzzle: 'libraryCipher',
        solver: player.name,
        doorUnlocked: 'laboratory',
        unlockedDoors: Array.from(room.unlockedDoors)
      });

      this.sendSystemMessage(code, `📖 ${player.name} correctly entered passcode "${cleanGuess}"! The secret bookshelf swung open, revealing the LABORATORY!`);
    } else {
      socket.emit('puzzle_result', {
        puzzle: 'libraryCipher',
        success: false,
        message: `Incorrect code "${cleanGuess}". Review your team's historical clues!`
      });
    }
  }

  // --- PUZZLE 3: LABORATORY ELECTRICAL GRID ---
  submitElectricalGrid(socket, connections) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (room.puzzles.electricalGrid.solved) {
      socket.emit('puzzle_result', { puzzle: 'electricalGrid', success: true, message: 'The power generator is already humming at full capacity.' });
      return;
    }

    const player = room.players.get(socket.id);
    // connections: { Red: 3, Blue: 1, Green: 4, Yellow: 2 }
    const target = room.puzzles.electricalGrid.target;
    let isCorrect = true;
    for (const color of ['Red', 'Blue', 'Green', 'Yellow']) {
      if (connections[color] !== target[color]) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      room.puzzles.electricalGrid.solved = true;
      room.puzzles.electricalGrid.connections = { ...connections };
      room.unlockedDoors.add('basement');
      room.stats.puzzlesSolved++;
      room.stats.score += 750;
      if (room.stats.contributions[player.name]) {
        room.stats.contributions[player.name].puzzles++;
      }

      this.io.to(code).emit('puzzle_solved', {
        puzzle: 'electricalGrid',
        solver: player.name,
        doorUnlocked: 'basement',
        unlockedDoors: Array.from(room.unlockedDoors)
      });

      this.sendSystemMessage(code, `⚡ ${player.name} synchronized the circuit grid! Power surges through the mansion, unlocking the SECRET BASEMENT!`);
    } else {
      socket.emit('puzzle_result', {
        puzzle: 'electricalGrid',
        success: false,
        message: 'Sparks fly! Voltage mismatch. Consult the Engineer and teammate frequency logs.'
      });
    }
  }

  // --- PUZZLE 4: FOUR-KEY COOPERATIVE MECHANISM ---
  stepOnPedestal(socket, pedestalId) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (room.puzzles.fourKeyMechanism.solved) return;

    const player = room.players.get(socket.id);
    const ped = room.puzzles.fourKeyMechanism.pedestals.find(p => p.id === pedestalId);
    if (!ped) return;

    const now = Date.now();
    ped.active = true;
    ped.player = player.name;
    ped.activatedAt = now;

    // Check if all 4 pedestals are currently activated within the 8-second time window
    const windowMs = room.puzzles.fourKeyMechanism.windowMs;
    const allActive = room.puzzles.fourKeyMechanism.pedestals.every(p => {
      return p.active && (now - p.activatedAt <= windowMs);
    });

    this.io.to(code).emit('pedestal_state_changed', {
      pedestals: room.puzzles.fourKeyMechanism.pedestals,
      activator: player.name,
      pedestalId
    });

    if (allActive) {
      room.puzzles.fourKeyMechanism.solved = true;
      room.unlockedDoors.add('treasure_room');
      room.puzzles.diamond.revealed = true;
      room.stats.puzzlesSolved++;
      room.stats.score += 1000;

      this.io.to(code).emit('four_key_unlocked', {
        unlockedDoors: Array.from(room.unlockedDoors)
      });

      this.sendSystemMessage(code, `🌟 INCREDIBLE TEAMWORK! All 4 pedestals triggered simultaneously! The Grand Vault has unlocked, revealing the DIAMOND!`);
    }
  }

  stepOffPedestal(socket, pedestalId) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (room.puzzles.fourKeyMechanism.solved) return;

    const ped = room.puzzles.fourKeyMechanism.pedestals.find(p => p.id === pedestalId);
    if (ped) {
      ped.active = false;
      ped.player = null;
      this.io.to(code).emit('pedestal_state_changed', {
        pedestals: room.puzzles.fourKeyMechanism.pedestals,
        pedestalId
      });
    }
  }

  // --- PUZZLE 5: DIAMOND DISCOVERY & ESCAPE ---
  claimDiamond(socket) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (!room.puzzles.diamond.revealed || room.puzzles.diamond.collected) return;

    const player = room.players.get(socket.id);
    room.puzzles.diamond.collected = true;
    room.puzzles.diamond.collector = player.name;
    room.inventory.push({ id: 'blue_diamond', name: '200-Carat Blue Star Diamond', desc: 'The lost treasure of Blackwood Manor!' });
    room.stats.itemsFound++;
    room.stats.score += 2000;
    if (room.stats.contributions[player.name]) {
      room.stats.contributions[player.name].items++;
    }

    this.io.to(code).emit('inventory_updated', {
      inventory: room.inventory,
      unlockedDoors: Array.from(room.unlockedDoors),
      recentItem: '200-Carat Blue Star Diamond'
    });

    this.sendSystemMessage(code, `💎 ${player.name} retrieved the BLUE STAR DIAMOND! Objective updated: Run to the Main Hall front gate to ESCAPE!`);
    this.io.to(code).emit('objective_updated', {
      objective: 'Escape through the Main Hall front entrance with the diamond!'
    });
  }

  escapeMansion(socket) {
    const code = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    if (!room.puzzles.diamond.collected) {
      socket.emit('interaction_feedback', { success: false, message: 'You cannot escape empty-handed! Find the Diamond first.' });
      return;
    }

    this.handleGameOver(code, true, 'The team escaped Blackwood Manor with the priceless diamond!');
  }

  handleGameOver(code, won, reason) {
    const room = this.rooms.get(code);
    if (!room) return;

    room.status = won ? 'won' : 'lost';
    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.randomEventInterval) clearInterval(room.randomEventInterval);

    // Calculate final score
    const timeBonus = won ? Math.max(0, room.timeRemaining) * 5 : 0;
    const finalScore = room.stats.score + timeBonus;

    const results = {
      won,
      reason,
      finalScore,
      timeRemaining: room.timeRemaining,
      timeTaken: 900 - room.timeRemaining,
      puzzlesSolved: room.stats.puzzlesSolved,
      itemsFound: room.stats.itemsFound,
      contributions: room.stats.contributions,
      players: Array.from(room.players.values())
    };

    this.io.to(code).emit('game_ended', results);
  }

  handleDisconnect(socket) {
    const code = this.playerRoomMap.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.connected = false;

      if (room.status === 'lobby') {
        room.players.delete(socket.id);
        this.playerRoomMap.delete(socket.id);

        if (room.players.size === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          if (room.randomEventInterval) clearInterval(room.randomEventInterval);
          this.rooms.delete(code);
          return;
        }

        // If host left, elect new host
        if (room.hostId === socket.id) {
          const firstRemaining = room.players.keys().next().value;
          room.hostId = firstRemaining;
          const newHost = room.players.get(firstRemaining);
          if (newHost) newHost.isHost = true;
        }

        this.broadcastLobbyState(code);
      } else {
        // In game, notify teammates
        this.sendSystemMessage(code, `⚠️ ${player.name} lost connection.`);
        this.io.to(code).emit('player_disconnected', { id: socket.id, name: player.name });
      }
    }
  }

  broadcastLobbyState(code) {
    const room = this.rooms.get(code);
    if (!room) return;

    const playersList = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      roleTitle: ROLE_INFO[p.role].title,
      roleColor: ROLE_INFO[p.role].color,
      ready: p.ready,
      isHost: p.isHost
    }));

    this.io.to(code).emit('lobby_update', {
      roomCode: code,
      hostId: room.hostId,
      players: playersList,
      canStart: playersList.length === 4 && playersList.every(p => p.ready)
    });
  }
}

export default GameManager;
export { ROLE_INFO, ROLES };
