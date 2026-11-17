// test/multiplayer_test.js - Comprehensive 4-Player Simulation Test

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

function createClient(name) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', () => {
      resolve({ socket, name, id: socket.id });
    });
    socket.on('connect_error', reject);
  });
}

async function runTests() {
  console.log('🚀 Starting Mystery Mansion Multiplayer Test Suite...\n');

  // 1. Connect Player 1
  const p1 = await createClient('Holmes (Detective)');
  console.log('✓ Player 1 connected:', p1.id);

  // Create Room
  let roomCode = null;
  await new Promise((resolve) => {
    p1.socket.emit('create_room', { playerName: p1.name });
    p1.socket.on('room_created', (data) => {
      roomCode = data.roomCode;
      console.log(`✓ Room created with code: ${roomCode}`);
      resolve();
    });
  });

  // 2. Connect Players 2, 3, 4
  const p2 = await createClient('Telsa (Engineer)');
  const p3 = await createClient('Indy (Explorer)');
  const p4 = await createClient('Ada (Analyst)');

  await new Promise((resolve) => {
    p2.socket.emit('join_room', { roomCode, playerName: p2.name });
    p2.socket.on('room_joined', resolve);
  });
  console.log('✓ Player 2 joined room');

  await new Promise((resolve) => {
    p3.socket.emit('join_room', { roomCode, playerName: p3.name });
    p3.socket.on('room_joined', resolve);
  });
  console.log('✓ Player 3 joined room');

  await new Promise((resolve) => {
    p4.socket.emit('join_room', { roomCode, playerName: p4.name });
    p4.socket.on('room_joined', resolve);
  });
  console.log('✓ Player 4 joined room');

  // 3. Test Player 5 Rejection
  const p5 = await createClient('Extra (Fifth)');
  let p5Rejected = false;
  await new Promise((resolve) => {
    p5.socket.emit('join_room', { roomCode, playerName: p5.name });
    p5.socket.on('error_message', (err) => {
      if (err.includes('Room is full')) {
        p5Rejected = true;
        console.log(`✓ TEST PASSED: Player 5 rejected as expected: "${err}"`);
      }
      resolve();
    });
  });
  p5.socket.disconnect();

  if (!p5Rejected) {
    throw new Error('FAILED: Player 5 was not rejected!');
  }

  // 4. Role Assignment & Ready Up
  p1.socket.emit('change_role', { role: 'detective' });
  p2.socket.emit('change_role', { role: 'engineer' });
  p3.socket.emit('change_role', { role: 'explorer' });
  p4.socket.emit('change_role', { role: 'analyst' });

  p1.socket.emit('toggle_ready');
  p2.socket.emit('toggle_ready');
  p3.socket.emit('toggle_ready');
  p4.socket.emit('toggle_ready');

  // Wait 200ms for lobby broadcast
  await new Promise(r => setTimeout(r, 200));

  // 5. Start Game
  console.log('\n--- Starting Game ---');
  let gameStartedCount = 0;
  const gameStartPromises = [p1, p2, p3, p4].map(p => {
    return new Promise((resolve) => {
      p.socket.on('game_started', (data) => {
        gameStartedCount++;
        console.log(`✓ ${p.name} received game_started. Role: ${data.player.role}, Private clues count: ${data.privateClues.length}`);
        resolve(data);
      });
    });
  });

  p1.socket.emit('start_game');
  await Promise.all(gameStartPromises);
  console.log(`✓ All 4 players initialized into the match!`);

  // 6. Test Real-time Movement Sync
  console.log('\n--- Testing Movement Sync ---');
  const movePromise = new Promise((resolve) => {
    p2.socket.on('player_moved', (data) => {
      if (data.id === p1.id && data.x === 2.5) {
        console.log('✓ Player 2 received Player 1 movement sync:', data);
        resolve();
      }
    });
  });

  p1.socket.emit('player_move', { x: 2.5, y: 0, z: 5.0, rotY: 1.2, anim: 'walk' });
  await movePromise;

  // 7. Test Real-time Chat
  console.log('\n--- Testing Chat System ---');
  const chatPromise = new Promise((resolve) => {
    p3.socket.on('chat_message', (data) => {
      if (data.senderId === p1.id && data.message === 'Team, check the cabinet!') {
        console.log(`✓ Player 3 received chat: [${data.roleTitle}] ${data.senderName}: "${data.message}"`);
        resolve();
      }
    });
  });

  p1.socket.emit('send_chat', { message: 'Team, check the cabinet!' });
  await chatPromise;

  // 8. Test Puzzle 1: Golden Key
  console.log('\n--- Testing Puzzle 1: Golden Key ---');
  const keyPromise = new Promise((resolve) => {
    p4.socket.on('inventory_updated', (data) => {
      if (data.inventory.some(i => i.id === 'golden_key')) {
        console.log('✓ Player 4 received inventory update: Golden Key found!');
        console.log('✓ Unlocked doors:', data.unlockedDoors);
        resolve();
      }
    });
  });

  p3.socket.emit('interact_golden_key');
  await keyPromise;

  // 9. Test Puzzle 2: Library Cipher
  console.log('\n--- Testing Puzzle 2: Library Cipher ---');
  const cipherPromise = new Promise((resolve) => {
    p1.socket.on('puzzle_solved', (data) => {
      if (data.puzzle === 'libraryCipher') {
        console.log(`✓ Library cipher solved by ${data.solver}! Door unlocked: ${data.doorUnlocked}`);
        resolve();
      }
    });
  });

  p4.socket.emit('submit_library_cipher', { guess: '1894' });
  await cipherPromise;

  // 10. Test Puzzle 3: Laboratory Electrical Grid
  console.log('\n--- Testing Puzzle 3: Laboratory Electrical Grid ---');
  const gridPromise = new Promise((resolve) => {
    p3.socket.on('puzzle_solved', (data) => {
      if (data.puzzle === 'electricalGrid') {
        console.log(`✓ Electrical grid synchronized by ${data.solver}! Door unlocked: ${data.doorUnlocked}`);
        resolve();
      }
    });
  });

  p2.socket.emit('submit_electrical_grid', {
    connections: { Red: 3, Blue: 1, Green: 4, Yellow: 2 }
  });
  await gridPromise;

  // 11. Test Puzzle 4: Four-Key Simultaneous Mechanism
  console.log('\n--- Testing Puzzle 4: Four-Key Mechanism ---');
  const vaultPromise = new Promise((resolve) => {
    p1.socket.on('four_key_unlocked', (data) => {
      console.log('✓ ALL 4 PEDESTALS ACTIVATED SIMULTANEOUSLY! Grand Vault Unlocked!');
      console.log('✓ Unlocked doors:', data.unlockedDoors);
      resolve();
    });
  });

  // All 4 players step on their corresponding pedestals (0, 1, 2, 3)
  p1.socket.emit('step_on_pedestal', { pedestalId: 0 });
  p2.socket.emit('step_on_pedestal', { pedestalId: 1 });
  p3.socket.emit('step_on_pedestal', { pedestalId: 2 });
  p4.socket.emit('step_on_pedestal', { pedestalId: 3 });
  await vaultPromise;

  // 12. Test Puzzle 5: Retrieve Diamond & Escape
  console.log('\n--- Testing Puzzle 5: Diamond & Escape ---');
  const diamondPromise = new Promise((resolve) => {
    p2.socket.on('inventory_updated', (data) => {
      if (data.inventory.some(i => i.id === 'blue_diamond')) {
        console.log('✓ Blue Star Diamond retrieved into shared satchel!');
        resolve();
      }
    });
  });

  p1.socket.emit('claim_diamond');
  await diamondPromise;

  // Escape front gates
  const victoryPromise = new Promise((resolve) => {
    p4.socket.on('game_ended', (data) => {
      console.log('\n🎉 GAME ENDED WITH VICTORY!');
      console.log(`✓ Won: ${data.won}`);
      console.log(`✓ Final Team Score: ${data.finalScore}`);
      console.log(`✓ Puzzles Solved: ${data.puzzlesSolved}/4`);
      console.log(`✓ Objects Discovered: ${data.itemsFound}`);
      console.log(`✓ Time Elapsed: ${data.timeTaken} seconds`);
      console.log('✓ Player Contributions:', JSON.stringify(data.contributions, null, 2));
      resolve(data);
    });
  });

  p1.socket.emit('escape_mansion');
  await victoryPromise;

  // Clean up
  [p1, p2, p3, p4].forEach(p => p.socket.disconnect());
  console.log('\n🎉 ALL 12 MULTIPLAYER SIMULATION TESTS PASSED FLAWLESSLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
