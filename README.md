# 🏛️ MYSTERY MANSION
### Four Players. One Mansion. Countless Secrets.
**Trust Your Team. Share Your Clues. Discover The Truth.**

A real-time, browser-based 3D cooperative multiplayer mystery adventure built with **Three.js**, **Node.js**, **Express**, and **Socket.IO**. Designed specifically for **EXACTLY FOUR PLAYERS**.

---

## 🎮 Core Gameplay Overview

Four investigators enter the abandoned Victorian estate of Lord Blackwood, who vanished mysteriously 20 years ago leaving behind a legendary **200-carat Blue Star Diamond**.

- **Game Duration:** 15-Minute Synchronized Countdown.
- **Players:** Exactly 4 per room (5th player is rejected by the authoritative backend).
- **Camera:** Third-person 3D with smooth lerp tracking.
- **Controls:** Desktop (WASD + Mouse) & Mobile (Virtual Joystick + Touch Orbit Drag + Action Buttons).
- **Zero Installation Required:** Runs in any modern desktop or mobile web browser.

---

## 🕵️ Four Distinct Asymmetric Roles

Each player receives confidential clues unique to their role. **No single player can solve the mystery alone.**

| Role | Theme Color | Specialization | Private Clue Domain |
| :--- | :--- | :--- | :--- |
| **Detective** | 🟠 Orange | Evidence & History | Historical timeline, crime scene burn marks, room origins. |
| **Engineer** | 🔵 Blue | Circuits & Machines | Laboratory power schematics, electrical dial constraints, capacitor timing. |
| **Explorer** | 🟢 Green | Hidden Passages | Golden Key hiding spots, sub-floor notes, secret passage locations. |
| **Analyst** | 🟣 Purple | Ciphers & Codes | Book spine Roman numerals, frequency harmonics, vault cryptograms. |

---

## 🏰 Mansion Architecture & Connected Rooms

1. **Main Hall:** Grand fireplace, chandelier, antique display cabinet (where the Golden Key is hidden), and the iron Front Escape Gates.
2. **Library:** Bookshelves, grandfather clock, reading table, and the brass 4-digit combination dial that unlocks the secret bookcase into the Laboratory.
3. **Laboratory:** Steampunk power generator, copper coils, bubbling beakers, and the 4-wire electrical circuit grid that restores power to the basement.
4. **Secret Basement:** Ancient flagstone cellar with 4 color-coded pressure pedestals requiring all 4 investigators to trigger simultaneously.
5. **Treasure Room:** Marble plinth holding the hovering, illuminated 200-carat Blue Star Diamond with particle aura.

---

## 🧩 Progressive Cooperative Puzzles

1. **Puzzle 1 – The Hidden Key (Main Hall):**
   - Explorer's clues reveal the location in the antique display cabinet.
   - Collecting it updates the team's shared satchel and unlocks the double oak Library doors.

2. **Puzzle 2 – Secret Library Cipher (Library):**
   - Analyst decodes Roman numerals (`MDCCCXCIV = 1894`).
   - Detective notes Lord Blackwood disappeared 6 years before 1900 (`1894`).
   - Engineer & Explorer verify the digits and plaque. Entering `1894` swings the secret bookcase open!

3. **Puzzle 3 – Electrical Generator Power Grid (Laboratory):**
   - Color conduits: Red, Blue, Green, Yellow -> Terminals 1, 2, 3, 4.
   - Correct wiring: `Blue -> 1`, `Yellow -> 2`, `Red -> 3`, `Green -> 4`.
   - Engineer leads the circuit configuration with team notes to lift the heavy iron gate to the basement.

4. **Puzzle 4 – Four-Key Simultaneous Pedestal Mechanism (Basement):**
   - 4 pressure pedestals spaced across the basement floor.
   - All 4 players must stand on their respective switch within an 8-second synchronized time window.
   - The authoritative server validates simultaneous presence and unseals the Grand Vault.

5. **Puzzle 5 – The Priceless Diamond & Escape:**
   - Retrieve the 200-carat Blue Star Diamond from the central plinth.
   - Sprint back to the Main Hall front gates to escape before the 15-minute timer expires!

---

## 💻 Tech Stack

- **Client:**
  - Three.js (Procedural 3D Victorian environments, characters, lighting, shadows, particle sparks)
  - Vite (Fast bundling & ES module build)
  - Web Audio API (100% procedural sound synthesis: footsteps, ambient drone, power surges, chimes, victory fanfare)
  - Socket.IO-Client (Real-time movement interpolation, chat, puzzle synchronization)
- **Server:**
  - Node.js & Express (Authoritative game engine, room management, static asset delivery)
  - Socket.IO (Authoritative multiplayer state, room codes, 4-player quota validation, disconnect handling)

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Start Multiplayer Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser!

### 4. Run Automated Multiplayer Test Suite
```bash
node test/multiplayer_test.js
```
*Executes all 15 acceptance criteria with 4 simulated socket clients!*

---

## 🌐 Public Deployment Guide

Mystery Mansion is built with a flexible, production-ready full-stack architecture that can be deployed in two standard ways:

### Option A: Unified Deployment on Render / Railway / Fly.io (Recommended)
Because `server/server.js` serves both the WebSocket API and the pre-built `dist/` frontend on the same port, you can deploy it as a single Web Service with zero CORS configuration:
1. Push this repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Connect your repository.
4. Set **Build Command:** `npm install && npm run build`
5. Set **Start Command:** `node server/server.js`
6. Render will assign an HTTPS URL (e.g. `https://mystery-mansion.onrender.com`).

### Option B: Split Deployment (Vercel Frontend + Render Backend)
1. Deploy the backend on Render as a Web Service (e.g. `https://mystery-mansion-backend.onrender.com`).
2. Deploy the frontend on [Vercel](https://vercel.com).
3. In Vercel Project Settings, add Environment Variable:
   ```
   VITE_SERVER_URL=https://mystery-mansion-backend.onrender.com
   ```
4. Vercel builds the client and connects directly to the persistent WebSocket server.

> **Note on Free Hosting Tiers:** Free plans on Render or Glitch spin down after 15 minutes of inactivity. When visiting the URL after dormancy, the first request may take 30-50 seconds while the server spins up. For permanent 24/7 uptime without sleep delays, upgrade to Render's Individual tier ($7/mo) or Railway.

---

## 📱 Controls Summary

### Desktop
- **W / A / S / D** or **Arrow Keys**: Move investigator
- **Mouse Drag**: Rotate 3rd-person camera orbit
- **E**: Examine / Interact with objects, safes, and mechanisms
- **Enter**: Send team chat message
- **HUD Buttons**: Quick access to Private Clues, Shared Satchel, and Team Chat

### Mobile / Tablets
- **Virtual Joystick (Bottom Left)**: 360-degree analog character movement
- **Touch & Drag (Right Screen)**: Smooth camera orbit
- **Action Button [E] (Bottom Right)**: Large tap target for examining and interacting
- **Chat Chips**: Tap pre-set messages ("I found a clue!", "Come to Library!", "Step on switch!")
