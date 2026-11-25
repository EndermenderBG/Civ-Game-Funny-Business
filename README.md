# Tribal Sovereign & Divine Entropy (Civ Game Prototype)

A turn-based tribal management and divine chaos simulation designed to be played directly in your browser with zero build steps or external dependencies.

This prototype translates the **Civ Game** Play-By-Post text rules and the **Domination Mode simplified** ledger system into a continuous computational simulation.

---

## 🚀 Quick Start (Play in Browser)

You can launch and play the game immediately in any of the following ways:

### Option 1 (Direct Launch - Recommended)
- Double-click **`start_game.bat`** in this folder, or simply double-click **`index.html`** directly.
- It will open immediately in your default web browser (Chrome, Edge, Firefox, Brave, etc.).

### Option 2 (Local Web Server via PowerShell)
- Right-click **`launch_server.ps1`** and choose *Run with PowerShell* (or run `powershell -ExecutionPolicy Bypass -File launch_server.ps1`).
- The game will open at `http://localhost:8080/`.

---

## 🏛️ Architecture & Mechanics Breakdown

### 1. The Continuous Simulation Engine (No Tabletop Dice)
- **Sphere Power Allocation**: Instead of rolling physical $d6$ dice and dividing by 6, the game models civilizational actions with a **continuous sigmoid probability curve**:
  $$P(\text{success}) = \frac{1}{1 + e^{-k(E_{\text{eff}} - D)}}$$
  The Action Planner provides real-time percentage feedback and confidence calculations.
- **Continuous Demographic Growth**: Pops need a balanced diet (3+ food types). Growth accumulates smoothly in a growth pool ($dN/dt$) scaled by territorial carrying capacity.
- **Dynamic Cosmic Chaos Vector**: Replaces static 3d6 event charts. Internal social tension, metaphysical entropy, and divine favor determine annual crisis generation. Extreme statistical tails trigger **Destiny Singularities** (such as whole-bloodline mutations or primordial rift events).
- **Seasonal Spoilage & Winter Thermodynamics**:
  - Fresh food decays by ~45–50% at the end of each season unless sealed in clay pottery jars or stored in insulated storehouses.
  - In Winter, pops consume wood fuel based on ambient temperature and housing insulation. Failing to provide fuel causes frostbite, health loss, and severe social tension.

### 2. Azgaar-Powered Explorable Voronoi World Map (`map/`)
- **Procedural Voronoi Tessellation**: Uses an X-sorted Bowyer-Watson Delaunay/Voronoi dual graph engine (`map/voronoi.js`) inspired by [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator) (MIT License).
- **Physical Simulation (`map/world-generator.js`)**: Simulates heightmaps (Continents, Archipelago, Highlands, River Basin), latitude/altitude temperature lapse rates, wind-carried precipitation with rain shadows, downhill river carving, and Azgaar's biome matrix mapped directly to Civ Game terrains and loot tables.
- **Fog of War & Territory Expansion**: Dispatch scouts using Research power to uncover uncharted regions, discover ancient anomalies and rival clans, claim fertile river cells (which double crop/pasture fertility), build dirt roads, and assign pops directly from the Cell Inspector.

### 3. Map-First HUD & 6 Embedded Sphere Menus
The explorable Voronoi map is always the primary full-screen canvas, surrounded by collapsible glass overlays and a bottom **6-Sphere Command Dock**:
1. **Leadership**: Sovereign & Dynasty, Ashkhan Muntu Bloodline traits, All Factions overview, Continuous Executive Action Planner, and Full Tribal Chronicle.
2. **Development**: Population & Labor assignment, Crops & Pastoral Herds (including slaughter & taming), and Claimed Locations directory.
3. **Military**: Garrisoned units, training, palisade defenses, and Tactical Counter Triangle.
4. **Culture**: Spirits & Pantheon (sacrificial rites, favor, taboos) and 8 Arcane Manas with castable spells.
5. **Research**: Technology Tree progression and Frontier locator.
6. **Commerce**: Workshop Crafting queue, Food Preservation with clay pottery jars, and Resource stockpiles.
