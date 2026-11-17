// server/server.js - Express & Socket.IO Entrypoint for Mystery Mansion

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import GameManager from './gameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);

// Allow CORS from any origin for flexible hosting (e.g. Vercel frontend -> Render backend, or unified)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

app.use(cors());
app.use(express.json());

// Serve built frontend assets in production
app.use(express.static(path.join(rootDir, 'dist')));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    game: 'Mystery Mansion',
    activeRooms: gameManager.rooms.size,
    uptime: process.uptime()
  });
});

// For client-side routing, serve index.html for unknown routes if dist exists
app.use((req, res) => {
  const indexPath = path.join(rootDir, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // In dev mode when dist doesn't exist yet
      res.status(200).send('Mystery Mansion Game Server Running. Use Vite for development or run "npm run build".');
    }
  });
});

const gameManager = new GameManager(io);

io.on('connection', (socket) => {
  // Room Creation
  socket.on('create_room', ({ playerName }) => {
    const code = gameManager.createRoom(socket, playerName);
    socket.emit('room_created', { roomCode: code });
  });

  // Room Joining
  socket.on('join_room', ({ roomCode, playerName }) => {
    const result = gameManager.joinRoom(socket, roomCode, playerName);
    if (!result.success) {
      socket.emit('error_message', result.error);
    } else {
      socket.emit('room_joined', result);
    }
  });

  // Role Change
  socket.on('change_role', ({ role }) => {
    gameManager.changeRole(socket, role);
  });

  // Ready State
  socket.on('toggle_ready', () => {
    gameManager.toggleReady(socket);
  });

  // Start Game
  socket.on('start_game', () => {
    gameManager.startGame(socket);
  });

  // Player Movement & Rotation
  socket.on('player_move', (data) => {
    gameManager.handlePlayerMove(socket, data);
  });

  // Chat
  socket.on('send_chat', ({ message }) => {
    gameManager.handleChat(socket, message);
  });

  // Interaction: Puzzle 1 Golden Key
  socket.on('interact_golden_key', () => {
    gameManager.interactGoldenKey(socket);
  });

  // Interaction: Puzzle 2 Library Cipher
  socket.on('submit_library_cipher', ({ guess }) => {
    gameManager.submitLibraryCipher(socket, guess);
  });

  // Interaction: Puzzle 3 Electrical Grid
  socket.on('submit_electrical_grid', ({ connections }) => {
    gameManager.submitElectricalGrid(socket, connections);
  });

  // Interaction: Puzzle 4 Four-Key Pedestals
  socket.on('step_on_pedestal', ({ pedestalId }) => {
    gameManager.stepOnPedestal(socket, pedestalId);
  });

  socket.on('step_off_pedestal', ({ pedestalId }) => {
    gameManager.stepOffPedestal(socket, pedestalId);
  });

  // Interaction: Puzzle 5 Diamond Collection
  socket.on('claim_diamond', () => {
    gameManager.claimDiamond(socket);
  });

  // Escape front gate
  socket.on('escape_mansion', () => {
    gameManager.escapeMansion(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏰 Mystery Mansion server running on http://localhost:${PORT}`);
});
