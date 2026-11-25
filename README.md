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

### 3. The 11 Ledger Stations
1. **World Map**: Interactive SVG Voronoi map with Pan/Zoom, 4 map modes (Biomes, Territory, Relief, Climate), Fog of War, and Cell Inspector.
2. **Overview & Actions**: Sphere potential gauges (Leadership, Development, Military, Culture, Research, Commerce), Action Planner, and real-time Telemetry.
2. **Territory & Sites**: Geographic cells, biomes, Space Capacity, Fertility, natural sites (fisheries, groves, clay beds), and constructed defenses.
3. **Population & Labor**: ~100-person pop cohorts, Blood traits, housing tiers, tool loadouts, and dietary status.
4. **Crops & Herds**: Field yield accumulation (+35 yield/season), Autumn harvest cycle, and livestock reproduction following logistic capacity.
5. **Factions Council**: Spear Warriors, Shamans, Traders, Elders, and Harvesters with opinion meters, active demands, and political stability effects.
6. **Tech & Workshop**: Continuous Research progression (Herbalism, Agriculture, Husbandry, Pottery, Insulation, Ideograms) and craftable tools/gear.
7. **Military Garrison**: Mobilized units, health, and tactical counter affinities (Spears > Cavalry/Swords > Bows > Spears).
8. **Spirits & Pantheon**: Active river/nature spirits, favor bars, active boons, and divine taboos.
9. **8 Arcane Manas**: Reservoirs for Arcana, Life, Fire, Water, Earth, Light, Dark, and Anarcane.
10. **The Chronicle**: Historical record tracking seasonal outcomes, winter freezes, and divine interventions.
