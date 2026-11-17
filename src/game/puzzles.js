// src/game/puzzles.js - Interactive Client-Side Puzzles & Modals for Mystery Mansion

import { audio } from './audio.js';

export class PuzzleManager {
  constructor(network) {
    this.network = network;

    // Elements
    this.modalCipher = document.getElementById('modal-library-cipher');
    this.modalGrid = document.getElementById('modal-electrical-grid');

    // Cipher state
    this.cipherCode = '';

    // Electrical grid state
    // Wire connections: { Red: null, Blue: null, Green: null, Yellow: null }
    this.connections = { Red: null, Blue: null, Green: null, Yellow: null };
    this.selectedWire = null;

    this.setupCipherEvents();
    this.setupElectricalGridEvents();
  }

  // ==========================================
  // PUZZLE 2: LIBRARY CIPHER SAFE
  // ==========================================
  openCipherModal() {
    this.cipherCode = '';
    this.updateCipherDisplay();
    const feedback = document.getElementById('cipher-feedback');
    if (feedback) feedback.textContent = 'Enter the 4-digit historical year deduced from team clues.';
    this.modalCipher.classList.remove('hidden');
    audio.playInteract();
  }

  closeCipherModal() {
    this.modalCipher.classList.add('hidden');
  }

  setupCipherEvents() {
    const display = document.getElementById('cipher-code-display');
    const btnClose = document.getElementById('btn-close-cipher');
    const keypad = document.getElementById('cipher-keypad');

    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeCipherModal());
    }

    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const val = btn.dataset.val;
        if (val === 'clear') {
          this.cipherCode = '';
          audio.playInteract();
        } else if (val === 'enter') {
          if (this.cipherCode.length === 4) {
            audio.playInteract();
            this.network.submitLibraryCipher(this.cipherCode);
          } else {
            const fb = document.getElementById('cipher-feedback');
            if (fb) fb.textContent = 'Please enter 4 digits.';
          }
        } else if (val && this.cipherCode.length < 4) {
          this.cipherCode += val;
          audio.playInteract();
        }
        this.updateCipherDisplay();
      });
    }
  }

  updateCipherDisplay() {
    const display = document.getElementById('cipher-code-display');
    if (display) {
      const padded = this.cipherCode.padEnd(4, '_');
      display.textContent = `${padded[0]}  ${padded[1]}  ${padded[2]}  ${padded[3]}`;
    }
  }

  handleCipherResult(success, message) {
    const fb = document.getElementById('cipher-feedback');
    if (fb) {
      fb.textContent = message;
      fb.style.color = success ? '#2ecc71' : '#e74c3c';
    }
    if (success) {
      audio.playDoorUnlock();
      setTimeout(() => this.closeCipherModal(), 1200);
    }
  }

  // ==========================================
  // PUZZLE 3: ELECTRICAL CIRCUIT GRID
  // ==========================================
  openElectricalGridModal(playerRole) {
    this.connections = { Red: null, Blue: null, Green: null, Yellow: null };
    this.selectedWire = null;
    this.renderWireConnections();

    const note = document.getElementById('grid-role-note');
    if (note) {
      if (playerRole === 'engineer') {
        note.innerHTML = `<strong>★ ENGINEER PRIVILEGE:</strong> You can read the master schematic in your private clues! Red wire feeds Terminal 3, Yellow feeds Terminal 2. Ask teammates for remaining terminals.`;
      } else {
        note.innerHTML = `<strong>ASSIST ENGINEER:</strong> Share your private clues via chat so the team wires terminals 1-4 properly!`;
      }
    }

    const fb = document.getElementById('grid-feedback');
    if (fb) {
      fb.textContent = 'Click a colored wire port on the left, then click a terminal socket (1-4) on the right.';
      fb.style.color = '#e0c9a6';
    }

    this.modalGrid.classList.remove('hidden');
    audio.playInteract();
  }

  closeElectricalGridModal() {
    this.modalGrid.classList.add('hidden');
  }

  setupElectricalGridEvents() {
    const btnClose = document.getElementById('btn-close-grid');
    const btnSubmit = document.getElementById('btn-submit-grid');
    const btnReset = document.getElementById('btn-reset-grid');

    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeElectricalGridModal());
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.connections = { Red: null, Blue: null, Green: null, Yellow: null };
        this.selectedWire = null;
        this.renderWireConnections();
        audio.playInteract();
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        // Verify all 4 wires connected
        const count = Object.values(this.connections).filter(v => v !== null).length;
        if (count < 4) {
          const fb = document.getElementById('grid-feedback');
          if (fb) fb.textContent = 'Connect all 4 wires before engaging power switch!';
          return;
        }
        audio.playPedestalClick();
        this.network.submitElectricalGrid(this.connections);
      });
    }

    // Wire source ports
    const wireBtns = document.querySelectorAll('.wire-port');
    wireBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.wire;
        this.selectedWire = color;
        wireBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        audio.playInteract();
      });
    });

    // Terminal target ports
    const termBtns = document.querySelectorAll('.terminal-socket');
    termBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.selectedWire) {
          const fb = document.getElementById('grid-feedback');
          if (fb) fb.textContent = 'Select a wire on the left first!';
          return;
        }
        const termNum = parseInt(btn.dataset.terminal);

        // Remove any existing connection to this terminal
        for (const [col, t] of Object.entries(this.connections)) {
          if (t === termNum) this.connections[col] = null;
        }

        this.connections[this.selectedWire] = termNum;
        this.renderWireConnections();
        audio.playInteract();
      });
    });
  }

  renderWireConnections() {
    // Update terminal labels
    for (let t = 1; t <= 4; t++) {
      const socket = document.querySelector(`.terminal-socket[data-terminal="${t}"]`);
      if (socket) {
        // Find which wire connects here
        const connectedWire = Object.keys(this.connections).find(w => this.connections[w] === t);
        const plugSpan = socket.querySelector('.plug-indicator');
        if (plugSpan) {
          if (connectedWire) {
            plugSpan.textContent = `[${connectedWire}]`;
            plugSpan.style.color = this.getWireHex(connectedWire);
          } else {
            plugSpan.textContent = '[EMPTY]';
            plugSpan.style.color = '#777777';
          }
        }
      }
    }
  }

  getWireHex(color) {
    switch (color) {
      case 'Red': return '#e74c3c';
      case 'Blue': return '#3498db';
      case 'Green': return '#2ecc71';
      case 'Yellow': return '#f1c40f';
      default: return '#ffffff';
    }
  }

  handleGridResult(success, message) {
    const fb = document.getElementById('grid-feedback');
    if (fb) {
      fb.textContent = message;
      fb.style.color = success ? '#2ecc71' : '#e74c3c';
    }
    if (success) {
      audio.playPowerSurge();
      setTimeout(() => this.closeElectricalGridModal(), 1200);
    }
  }
}
