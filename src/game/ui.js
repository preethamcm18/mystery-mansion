// src/game/ui.js - User Interface Controller for Mystery Mansion

import { audio } from './audio.js';

export class UIManager {
  constructor(network, puzzleManager) {
    this.network = network;
    this.puzzleManager = puzzleManager;

    // Screens
    this.screenWelcome = document.getElementById('screen-welcome');
    this.screenMenu = document.getElementById('screen-menu');
    this.screenLobby = document.getElementById('screen-lobby');
    this.screenIntro = document.getElementById('screen-intro');
    this.screenGameHud = document.getElementById('screen-hud');
    this.screenEndGame = document.getElementById('screen-endgame');

    // Modals
    this.modalClues = document.getElementById('modal-clues');
    this.modalInventory = document.getElementById('modal-inventory');
    this.chatDrawer = document.getElementById('chat-drawer');

    // HUD Elements
    this.hudTimer = document.getElementById('hud-timer');
    this.hudObjective = document.getElementById('hud-objective');
    this.hudRoomName = document.getElementById('hud-room-name');
    this.hudRoomCode = document.getElementById('hud-room-code');
    this.hudTeamList = document.getElementById('hud-team-list');
    this.hudInteractPrompt = document.getElementById('hud-interact-prompt');
    this.pedestalBar = document.getElementById('pedestal-bar');

    // Local Player cache
    this.localPlayerName = '';
    this.localPlayerRole = null;
    this.privateClues = [];
    this.sharedInventory = [];

    this.setupEvents();
  }

  updateServerStatus(connected, url) {
    const dot = document.getElementById('server-status-dot');
    const text = document.getElementById('server-status-text');
    if (dot) {
      dot.className = `status-dot ${connected ? 'online' : 'offline'}`;
    }
    if (text) {
      const cleanUrl = url ? url.replace(/^https?:\/\//, '') : 'localhost';
      text.textContent = connected ? `Connected: ${cleanUrl}` : `Reconnecting: ${cleanUrl}`;
    }
  }

  showScreen(screen) {
    const screens = [
      this.screenWelcome,
      this.screenMenu,
      this.screenLobby,
      this.screenIntro,
      this.screenGameHud,
      this.screenEndGame
    ];
    screens.forEach(s => {
      if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
  }

  setupEvents() {
    // Welcome Screen -> Menu
    const btnEnter = document.getElementById('btn-enter-mansion');
    if (btnEnter) {
      btnEnter.addEventListener('click', () => {
        audio.ensureContext();
        audio.playInteract();
        audio.startAmbient();
        this.showScreen(this.screenMenu);
      });
    }

    // Menu: Create Room
    const btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        const nameInput = document.getElementById('input-player-name');
        const name = (nameInput.value || '').trim() || 'Investigator';
        this.localPlayerName = name;
        audio.playInteract();
        this.network.createRoom(name);
      });
    }

    // Menu: Join Room
    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
      btnJoin.addEventListener('click', () => {
        const nameInput = document.getElementById('input-player-name');
        const codeInput = document.getElementById('input-room-code');
        const name = (nameInput.value || '').trim() || 'Investigator';
        const code = (codeInput.value || '').trim().toUpperCase();

        if (!code) {
          this.showToast('Please enter a 5-letter room code.');
          return;
        }

        this.localPlayerName = name;
        audio.playInteract();
        this.network.joinRoom(code, name);
      });
    }

    // Menu: Server Config Toggle & Save
    const btnToggleServer = document.getElementById('btn-toggle-server-settings');
    const serverDrawer = document.getElementById('server-settings-drawer');
    const inputCustomServer = document.getElementById('input-custom-server');
    const btnSaveServer = document.getElementById('btn-save-server');
    const btnResetServer = document.getElementById('btn-reset-server');

    if (inputCustomServer) {
      inputCustomServer.value = localStorage.getItem('mm_custom_server_url') || this.network.serverUrl || '';
    }

    if (btnToggleServer && serverDrawer) {
      btnToggleServer.addEventListener('click', () => {
        serverDrawer.classList.toggle('hidden');
      });
    }

    if (btnSaveServer && inputCustomServer) {
      btnSaveServer.addEventListener('click', () => {
        const url = inputCustomServer.value.trim();
        this.network.setCustomServer(url);
        this.showToast(`Connecting to ${url || 'default server'}...`);
        if (serverDrawer) serverDrawer.classList.add('hidden');
      });
    }

    if (btnResetServer) {
      btnResetServer.addEventListener('click', () => {
        localStorage.removeItem('mm_custom_server_url');
        this.network.setCustomServer('');
        if (inputCustomServer) inputCustomServer.value = '';
        this.showToast('Reset server to default.');
        if (serverDrawer) serverDrawer.classList.add('hidden');
      });
    }

    // Network connection status display
    this.network.on('connect', () => {
      this.updateServerStatus(true, this.network.serverUrl);
    });

    this.network.on('disconnect', () => {
      this.updateServerStatus(false, this.network.serverUrl);
    });

    this.network.on('error', () => {
      this.updateServerStatus(false, this.network.serverUrl);
    });

    // Lobby: Copy Code
    const btnCopyCode = document.getElementById('btn-copy-code');
    if (btnCopyCode) {
      btnCopyCode.addEventListener('click', () => {
        const code = document.getElementById('lobby-code-display').textContent;
        navigator.clipboard.writeText(code).then(() => {
          this.showToast(`Room code ${code} copied to clipboard!`);
          audio.playInteract();
        });
      });
    }

    // Lobby: Role selection cards
    const roleCards = document.querySelectorAll('.role-select-card');
    roleCards.forEach(card => {
      card.addEventListener('click', () => {
        const role = card.dataset.role;
        audio.playInteract();
        this.network.changeRole(role);
      });
    });

    // Lobby: Ready toggle
    const btnReady = document.getElementById('btn-toggle-ready');
    if (btnReady) {
      btnReady.addEventListener('click', () => {
        audio.playInteract();
        this.network.toggleReady();
      });
    }

    // Lobby: Start Game (Host only)
    const btnStart = document.getElementById('btn-start-match');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        audio.playDoorUnlock();
        this.network.startGame();
      });
    }

    // Intro: Skip / Begin button
    const btnBeginGame = document.getElementById('btn-begin-game');
    if (btnBeginGame) {
      btnBeginGame.addEventListener('click', () => {
        audio.playDoorUnlock();
        this.showScreen(this.screenGameHud);
      });
    }

    // In-Game: Clues Drawer Toggle
    const btnOpenClues = document.getElementById('btn-hud-clues');
    const btnCloseClues = document.getElementById('btn-close-clues');
    if (btnOpenClues) {
      btnOpenClues.addEventListener('click', () => {
        audio.playInteract();
        this.renderCluesModal();
        this.modalClues.classList.remove('hidden');
      });
    }
    if (btnCloseClues) {
      btnCloseClues.addEventListener('click', () => {
        this.modalClues.classList.add('hidden');
      });
    }

    // In-Game: Inventory Drawer Toggle
    const btnOpenInv = document.getElementById('btn-hud-inventory');
    const btnCloseInv = document.getElementById('btn-close-inventory');
    if (btnOpenInv) {
      btnOpenInv.addEventListener('click', () => {
        audio.playInteract();
        this.renderInventoryModal();
        this.modalInventory.classList.remove('hidden');
      });
    }
    if (btnCloseInv) {
      btnCloseInv.addEventListener('click', () => {
        this.modalInventory.classList.add('hidden');
      });
    }

    // In-Game: Chat Drawer Toggle
    const btnToggleChat = document.getElementById('btn-toggle-chat');
    if (btnToggleChat) {
      btnToggleChat.addEventListener('click', () => {
        this.chatDrawer.classList.toggle('expanded');
        audio.playInteract();
      });
    }

    // In-Game: Chat Send
    const chatInput = document.getElementById('chat-text-input');
    const btnSendChat = document.getElementById('btn-send-chat');

    const doSendChat = () => {
      const msg = (chatInput.value || '').trim();
      if (msg) {
        this.network.sendChat(msg);
        chatInput.value = '';
        audio.playInteract();
      }
    };

    if (btnSendChat) btnSendChat.addEventListener('click', doSendChat);
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          doSendChat();
        }
      });
    }

    // Quick Chat Phrases
    const quickChips = document.querySelectorAll('.chat-chip');
    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent;
        this.network.sendChat(text);
        audio.playInteract();
      });
    });

    // End-Game: Play Again
    const btnRestart = document.getElementById('btn-play-again');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  // --- LOBBY UPDATE ---
  updateLobby(data) {
    const { roomCode, hostId, players, canStart } = data;

    const codeDisplay = document.getElementById('lobby-code-display');
    if (codeDisplay) codeDisplay.textContent = roomCode;

    const countDisplay = document.getElementById('lobby-player-count');
    if (countDisplay) countDisplay.textContent = `${players.length}/4 Players`;

    // Render Player Cards in Lobby
    const slotsContainer = document.getElementById('lobby-player-slots');
    if (slotsContainer) {
      slotsContainer.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const p = players[i];
        const card = document.createElement('div');
        card.className = `lobby-player-card ${p ? 'filled' : 'empty'}`;

        if (p) {
          card.innerHTML = `
            <div class="card-avatar" style="border-color: ${p.roleColor}">
              <span class="role-icon">${this.getRoleIcon(p.role)}</span>
            </div>
            <div class="card-info">
              <div class="card-name">${p.name} ${p.isHost ? '<span class="badge-host">HOST</span>' : ''}</div>
              <div class="card-role" style="color: ${p.roleColor}">${p.roleTitle}</div>
            </div>
            <div class="card-status ${p.ready ? 'ready' : 'not-ready'}">
              ${p.ready ? '✓ READY' : '⏳ CHOOSING'}
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="card-avatar empty">?</div>
            <div class="card-info">
              <div class="card-name waiting">Waiting for Player ${i + 1}...</div>
              <div class="card-role">Share Room Code</div>
            </div>
          `;
        }
        slotsContainer.appendChild(card);
      }
    }

    // Role selection cards highlight
    const myPlayer = players.find(p => p.id === this.network.playerId);
    if (myPlayer) {
      this.localPlayerRole = myPlayer.role;
      const roleCards = document.querySelectorAll('.role-select-card');
      roleCards.forEach(card => {
        const isMyRole = card.dataset.role === myPlayer.role;
        const isTaken = players.some(p => p.id !== myPlayer.id && p.role === card.dataset.role);
        card.classList.toggle('selected', isMyRole);
        card.classList.toggle('disabled', isTaken);
      });

      const readyBtn = document.getElementById('btn-toggle-ready');
      if (readyBtn) {
        readyBtn.textContent = myPlayer.ready ? 'Cancel Ready' : 'Ready Up';
        readyBtn.classList.toggle('is-ready', myPlayer.ready);
      }
    }

    // Start Button (Host only)
    const startBtn = document.getElementById('btn-start-match');
    if (startBtn) {
      const isHost = this.network.playerId === hostId;
      startBtn.style.display = isHost ? 'block' : 'none';
      startBtn.disabled = !canStart;
      if (canStart) {
        startBtn.classList.add('pulse');
      } else {
        startBtn.classList.remove('pulse');
      }
    }
  }

  // --- GAME START ---
  handleGameStart(data) {
    this.localPlayerRole = data.player.role;
    this.privateClues = data.privateClues || [];
    this.sharedInventory = data.inventory || [];

    if (this.hudRoomCode) this.hudRoomCode.textContent = data.roomCode;

    // Show Cinematic Intro Screen first
    this.renderIntroScreen(data.player.role);
    this.showScreen(this.screenIntro);

    this.renderCluesModal();
    this.renderInventoryModal();
    this.updateTeamList(data.players);
  }

  renderIntroScreen(role) {
    const roleTitle = document.getElementById('intro-role-title');
    const roleMission = document.getElementById('intro-role-mission');
    const roleIcon = document.getElementById('intro-role-icon');

    const details = {
      detective: {
        title: 'DETECTIVE',
        icon: '🔍',
        color: '#e67e22',
        mission: 'You are the Master Investigator. Examine physical evidence, trace the Lord’s footsteps, and inspect antique furniture to uncover secrets.'
      },
      engineer: {
        title: 'ENGINEER',
        icon: '⚙️',
        color: '#3498db',
        mission: 'You understand the mansion’s mechanical heart. The Laboratory power grid requires your diagnostic schematic to restore electricity.'
      },
      explorer: {
        title: 'EXPLORER',
        icon: '🧭',
        color: '#2ecc71',
        mission: 'Your keen eyes spot hidden compartments others miss. Find the Golden Key in the Main Hall and guide the team through secret passages.'
      },
      analyst: {
        title: 'ANALYST',
        icon: '📜',
        color: '#9b59b6',
        mission: 'You decode cryptic ciphers, ancient runes, and historical years. Without your translations, the library safe will remain locked.'
      }
    };

    const d = details[role] || details.detective;
    if (roleTitle) {
      roleTitle.textContent = d.title;
      roleTitle.style.color = d.color;
    }
    if (roleMission) roleMission.textContent = d.mission;
    if (roleIcon) roleIcon.textContent = d.icon;
  }

  // --- HUD UPDATES ---
  updateTimer(timeRemaining) {
    if (!this.hudTimer) return;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.hudTimer.textContent = str;

    if (timeRemaining < 120) {
      this.hudTimer.classList.add('urgent');
    } else {
      this.hudTimer.classList.remove('urgent');
    }
  }

  updateObjective(objText) {
    if (this.hudObjective) {
      this.hudObjective.textContent = objText;
    }
  }

  updateRoomName(name) {
    if (this.hudRoomName) {
      this.hudRoomName.textContent = name;
    }
  }

  updateTeamList(players) {
    if (!this.hudTeamList) return;
    this.hudTeamList.innerHTML = '';

    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'team-member-row';
      row.innerHTML = `
        <span class="status-dot ${p.connected ? 'online' : 'offline'}"></span>
        <span class="member-name">${p.name}</span>
        <span class="member-role" style="color: ${p.roleColor}">[${p.roleTitle || p.role}]</span>
      `;
      this.hudTeamList.appendChild(row);
    });
  }

  showInteractionPrompt(text) {
    if (!this.hudInteractPrompt) return;
    if (text) {
      this.hudInteractPrompt.textContent = text;
      this.hudInteractPrompt.classList.remove('hidden');
    } else {
      this.hudInteractPrompt.classList.add('hidden');
    }
  }

  // --- CHAT MESSAGE ---
  addChatMessage(data) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-bubble ${data.senderRole === 'system' ? 'system-bubble' : ''}`;

    if (data.senderRole === 'system') {
      div.innerHTML = `<span class="system-tag">📜</span> ${data.message}`;
    } else {
      div.innerHTML = `
        <span class="chat-sender" style="color: ${data.roleColor}">[${data.roleTitle}] ${data.senderName}:</span>
        <span class="chat-text">${data.message}</span>
      `;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Toast notice on screen if chat drawer is closed
    if (!this.chatDrawer.classList.contains('expanded') && data.senderRole === 'system') {
      this.showToast(data.message);
    }
  }

  // --- CLUES MODAL ---
  renderCluesModal() {
    const list = document.getElementById('clues-list-container');
    if (!list) return;
    list.innerHTML = '';

    if (this.privateClues.length === 0) {
      list.innerHTML = `<div class="empty-notice">No private clues found yet. Search the mansion rooms!</div>`;
      return;
    }

    this.privateClues.forEach(clue => {
      const card = document.createElement('div');
      card.className = 'clue-card';
      card.innerHTML = `
        <div class="clue-card-title">🔍 ${clue.title}</div>
        <div class="clue-card-text">${clue.text}</div>
        <div class="clue-card-footer">CONFIDENTIAL TO YOUR ROLE — SHARE WITH TEAMMATES VIA CHAT!</div>
      `;
      list.appendChild(card);
    });
  }

  // --- INVENTORY MODAL ---
  renderInventoryModal() {
    const list = document.getElementById('inventory-list-container');
    if (!list) return;
    list.innerHTML = '';

    if (this.sharedInventory.length === 0) {
      list.innerHTML = `<div class="empty-notice">Shared team satchel is empty. Search rooms for keys and tools!</div>`;
      return;
    }

    this.sharedInventory.forEach(item => {
      const card = document.createElement('div');
      card.className = 'inventory-card';
      card.innerHTML = `
        <div class="item-icon">🗝️</div>
        <div class="item-info">
          <div class="item-title">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  updatePedestalStatus(pedestals) {
    if (!this.pedestalBar) return;
    pedestals.forEach(p => {
      const indicator = document.querySelector(`.pedestal-indicator[data-ped="${p.id}"]`);
      if (indicator) {
        indicator.classList.toggle('active', p.active);
        const nameSpan = indicator.querySelector('.ped-user');
        if (nameSpan) {
          nameSpan.textContent = p.active ? p.player : p.role.toUpperCase();
        }
      }
    });
  }

  // --- END GAME SCREEN ---
  renderEndGame(data) {
    const { won, reason, finalScore, timeTaken, puzzlesSolved, itemsFound, contributions, players } = data;

    const banner = document.getElementById('endgame-banner');
    const title = document.getElementById('endgame-title');
    const reasonText = document.getElementById('endgame-reason');
    const scoreVal = document.getElementById('endgame-score');
    const timeVal = document.getElementById('endgame-time');
    const puzzlesVal = document.getElementById('endgame-puzzles');
    const itemsVal = document.getElementById('endgame-items');
    const tableBody = document.getElementById('endgame-contributions');

    if (won) {
      audio.playVictory();
      banner.textContent = '★ VICTORY ACHIEVED ★';
      banner.style.color = '#d4af37';
      title.textContent = 'THE DIAMOND IS SECURED!';
      title.style.color = '#00d2ff';
    } else {
      banner.textContent = '☠ ESCAPE FAILED ☠';
      banner.style.color = '#e74c3c';
      title.textContent = 'TRAPPED IN BLACKWOOD MANOR';
      title.style.color = '#ffffff';
    }

    reasonText.textContent = reason;
    scoreVal.textContent = finalScore.toLocaleString();
    timeVal.textContent = `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`;
    puzzlesVal.textContent = `${puzzlesSolved} Solved`;
    itemsVal.textContent = `${itemsFound} Discovered`;

    if (tableBody) {
      tableBody.innerHTML = '';
      players.forEach(p => {
        const stats = contributions[p.name] || { puzzles: 0, items: 0, cluesShared: 0 };
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${p.name}</strong> <span style="color:${p.roleColor}">(${p.roleTitle || p.role})</span></td>
          <td>${stats.puzzles}</td>
          <td>${stats.items}</td>
          <td>${stats.cluesShared}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    this.showScreen(this.screenEndGame);
  }

  showToast(message) {
    let toast = document.getElementById('ui-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ui-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.className = 'toast';
    }, 3800);
  }

  getRoleIcon(role) {
    switch (role) {
      case 'detective': return '🔍';
      case 'engineer': return '⚙️';
      case 'explorer': return '🧭';
      case 'analyst': return '📜';
      default: return '👤';
    }
  }
}
