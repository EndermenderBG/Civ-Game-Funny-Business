/* ==========================================================================
   TRIBAL SOVEREIGN & DIVINE ENTROPY - GAME ENGINE & SIMULATION
   Continuous mathematical state machine translating the Civ Game prototype.
   ========================================================================== */

// --- CONTINUOUS MATH & PROBABILITY HELPER FUNCTIONS ---
const MathUtils = {
  // Sigmoid / Logistic function for probability curve
  sigmoid(x, k = 0.3) {
    return 1 / (1 + Math.exp(-k * x));
  },
  
  // Box-Muller transform for Gaussian random variable N(mean, stdev^2)
  gaussianRandom(mean = 0, stdev = 1) {
    let u1 = 1 - Math.random();
    let u2 = 1 - Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return mean + stdev * randStdNormal;
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  round(val, decimals = 1) {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }
};

// --- INITIAL GAME STATE SCHEMA ---
const GameState = {
  // Temporal State
  turn: 0, // 0 = Spring, 1 = Summer, 2 = Autumn, 3 = Winter
  seasons: ["Spring", "Summer", "Autumn", "Winter"],
  year: 1,
  decade: 1,

  // Ruler & Dynasty
  leader: {
    name: "Kiwele the Unchosen",
    dynasty: "House of Janas",
    age: 32,
    level: 1,
    socialSkill: 3,
    strength: "Charismatic Voice (+10% Faction Stability)",
    weakness: "Impatient Ambition (+5% Tension Growth)",
    successor: "Prince Enkosi (Son, Age 14)"
  },

  // Sovereign Identity & Bloodline
  tribe: {
    name: "Janas Clan",
    bloodline: "Ashkhan Muntu",
    boons: ["Dense Musculature (+15% Melee Combat)", "River Born (+20% Fish Extraction)"],
    curses: ["Heavy Calorie Need (+10% Nutritional Demand)"],
    features: ["Deep Amber Irises", "Bronzed Obsidian Skin"]
  },

  commandLimit: 3,
  world: null,

  // Telemetry Vectors (Continuous Tension & Entropy)
  telemetry: {
    tension: 20, // 0 to 100: Internal social strain, rebellion trigger > 80
    entropy: 15, // 0 to 100: Metaphysical/planar instability, catastrophe trigger > 75
    divineFavor: 65 // 0 to 100: Alignment with pantheon
  },

  // Continuous Weather Parameters
  weather: {
    temperature: 19, // °C
    moisture: 60, // %
    pressure: 1013, // hPa
    condition: "Mild & Fertile",
    severity: "Benign"
  },

  // Continuous Sphere Power (Generated & Stored each season)
  spheres: {
    leadership: { base: 1, current: 4, label: "Leadership", color: "var(--sphere-leadership)" },
    development: { base: 1, current: 3, label: "Development", color: "var(--sphere-development)" },
    military: { base: 1, current: 4, label: "Military", color: "var(--sphere-military)" },
    culture: { base: 1, current: 6, label: "Culture", color: "var(--sphere-culture)" },
    research: { base: 1, current: 2, label: "Research", color: "var(--sphere-research)" },
    commerce: { base: 1, current: 4, label: "Commerce", color: "var(--sphere-commerce)" }
  },

  // Resources Stockpiles
  resources: {
    foodPerishable: 150, // Subject to 50% seasonal spoilage unless preserved
    foodPreserved: 75,  // Salted/Dried/Jarred - zero spoilage
    water: 250,
    wood: 90,           // Fuel: 1 wood = 1 fuel
    coal: 0,            // Fuel: 1 coal = 20 fuel
    materials: 40,      // Solid Crafting materials (Stone, Timber)
    fibers: 55,
    hides: 28,
    leather: 10,
    pottery: 12
  },

  // 8 Natures of Magic
  magic: {
    capacities: { arcane: 50, life: 50, fire: 50, water: 50, earth: 50, light: 50, dark: 50, anarcane: 50 },
    pools: { arcane: 12, life: 20, fire: 6, water: 15, earth: 18, light: 5, dark: 0, anarcane: 0 }
  },

  // Locations / Biomes
  locations: [
    {
      id: "loc_janas",
      name: "Janas Valley (River Basin)",
      terrain: "Grasslands",
      spaceMax: 50,
      spaceUsed: 22,
      fertilityFieldsMax: 8,
      fertilityPasturesMax: 4,
      riverBonus: true,
      sites: [
        { id: "site_river", name: "River Fishery", type: "Fishery", extractionCap: 80, currentExtracted: 0, yieldType: "foodPerishable", yieldAmount: 35, assignedPops: 2 },
        { id: "site_forest", name: "Hardwood Grove", type: "Forest", extractionCap: 60, currentExtracted: 0, yieldType: "wood", yieldAmount: 25, assignedPops: 1 },
        { id: "site_clay", name: "River Clay Bank", type: "Clay", extractionCap: 40, currentExtracted: 0, yieldType: "materials", yieldAmount: 18, assignedPops: 1 }
      ],
      buildings: [
        { id: "bld_huts", name: "Wattle Huts (Tier 1)", type: "Housing", capacity: 6, effect: "Basic shelter against winter freezing." },
        { id: "bld_storehouse", name: "Thatch Storehouse", type: "Storage", capacity: 80, effect: "Shields 80 units of resources from annual decay." },
        { id: "bld_workshop", name: "Basic Workshop", type: "Crafting", assignedPops: 1, effect: "Generates craft progress for tools/arms." }
      ]
    }
  ],

  // Pops (Discrete cohorts of ~100 people)
  pops: [
    { id: "pop_1", name: "First Hearth", blood: "Ashkhan Muntu", faction: "Shamans", locationId: "loc_janas", workplace: "River Fishery", housing: "Hut", tools: ["Spear", "Fish Trap"], health: 100, diet: "balanced" },
    { id: "pop_2", name: "River Fisherfolk", blood: "Ashkhan Muntu", faction: "Traders", locationId: "loc_janas", workplace: "River Fishery", housing: "Hut", tools: ["Fish Trap"], health: 100, diet: "balanced" },
    { id: "pop_3", name: "Timber Wardens", blood: "Ashkhan Muntu", faction: "Spear Warriors", locationId: "loc_janas", workplace: "Hardwood Grove", housing: "Hut", tools: ["Axe"], health: 95, diet: "balanced" },
    { id: "pop_4", name: "Clay Gatherers", blood: "Ashkhan Muntu", faction: "Elders", locationId: "loc_janas", workplace: "River Clay Bank", housing: "Hut", tools: ["Basket"], health: 100, diet: "balanced" },
    { id: "pop_5", name: "Field Keepers", blood: "Ashkhan Muntu", faction: "Harvesters", locationId: "loc_janas", workplace: "Crop Field", housing: "Hut", tools: ["Hoe"], health: 100, diet: "balanced" },
    { id: "pop_6", name: "Toolsmiths", blood: "Ashkhan Muntu", faction: "Harvesters", locationId: "loc_janas", workplace: "Basic Workshop", housing: "Hut", tools: ["Hammer"], health: 100, diet: "balanced" }
  ],

  // Demographics Progress Accumulator (toward next pop)
  demographicGrowthPool: 0.25,

  // Agriculture (Crops)
  cropField: {
    cropName: "Golden Sorghum (Grain)",
    fieldLevel: 2,
    accumulatedYield: 140,
    maxYield: 600,
    growthRatePerFarmer: 35, // per season
    harvestSeason: 2, // Autumn
    harvestPerWorker: 60
  },

  // Livestock & Pastoral Herds
  herds: [
    {
      id: "herd_goats",
      species: "River Horned Goats",
      count: 14,
      traits: ["Herbivore", "Fruitful", "Hardy"],
      fodderCostPerHead: 0.8,
      waterCostPerHead: 0.5,
      handlingCapacityPerPop: 15,
      seasonalMilk: 28,
      slaughterMeat: 20,
      slaughterHide: 4
    }
  ],

  // Factions & Political Vectors
  factions: [
    { id: "fac_warriors", name: "Spear Warriors", sphere: "military", opinion: 68, activeDemand: "Train 1 vanguard unit with hardened spears.", bonusDice: 2, penalty: "Will withhold Military energy if opinion drops below 40." },
    { id: "fac_shamans", name: "Water Shamans", sphere: "culture", opinion: 74, activeDemand: "Perform sacrifice of 20 food to Oshun of the Jade Waters.", bonusDice: 3, penalty: "Spiritual alienation increases cosmic entropy." },
    { id: "fac_traders", name: "River Bargemen", sphere: "commerce", opinion: 58, activeDemand: "Stockpile at least 25 pottery vessels for barter.", bonusDice: 2, penalty: "Impedes workshop throughput." },
    { id: "fac_elders", name: "Council of Elders", sphere: "research", opinion: 52, activeDemand: "Master Pottery preservation technology.", bonusDice: 1, penalty: "Reduces law stability." },
    { id: "fac_harvesters", name: "Soil & Hearth Keepers", sphere: "development", opinion: 65, activeDemand: "Maintain at least 150 food in winter reserve.", bonusDice: 2, penalty: "Slows construction projects." }
  ],

  // Technology
  techTree: [
    { id: "tech_herbalism", name: "Herbalism & Mycology", progress: 0, cost: 30, primarySphere: "research", secondarySphere: "culture", researched: false, desc: "Reveals medicinal plants in forests. Accelerates wounded recovery rate by 100%." },
    { id: "tech_agriculture", name: "Agriculture", progress: 0, cost: 40, primarySphere: "development", secondarySphere: "commerce", researched: false, desc: "Allows expanding crop fields and crafting Hoes and Scythes." },
    { id: "tech_husbandry", name: "Animal Husbandry", progress: 0, cost: 35, primarySphere: "development", secondarySphere: "military", researched: false, desc: "Unlocks dedicated fenced Pastures, Pens, and slaughterhouses." },
    { id: "tech_pottery", name: "Pottery & Clay Jars", progress: 0, cost: 30, primarySphere: "culture", secondarySphere: "commerce", researched: false, desc: "Craft clay jars to preserve food indefinitely without winter spoilage." },
    { id: "tech_insulation", name: "Storehouse Insulation", progress: 0, cost: 25, primarySphere: "development", secondarySphere: "commerce", researched: false, desc: "Doubles storehouse capacity and insulates homes to cut winter fuel burn in half." },
    { id: "tech_ideograms", name: "Ideograms & Inscribed Tablets", progress: 0, cost: 35, primarySphere: "culture", secondarySphere: "research", researched: false, desc: "Enables codified laws, ancestral tablets, and crude libraries." }
  ],

  // Crafting Recipes
  crafts: [
    { id: "craft_hammer", name: "Stone Hammer", cost: { materials: 4, wood: 2, fibers: 2 }, effect: "+15% Construction speed when equipped by workers." },
    { id: "craft_spear", name: "Flint Spear", cost: { materials: 3, wood: 3, fibers: 1 }, effect: "Increases pop hunting output or equips infantry soldiers." },
    { id: "craft_pottery", name: "Clay Preservation Jar", cost: { materials: 3, wood: 1 }, effect: "Enables permanently preserving 10 perishable food into preserved food." },
    { id: "craft_basket", name: "Woven Reed Basket", cost: { fibers: 8, wood: 1 }, effect: "+20% Harvester and gatherer extraction capacity." },
    { id: "craft_hut", name: "Additional Pop Hut", cost: { wood: 15, fibers: 8, hides: 5 }, effect: "Provides warm housing for 1 additional pop cohort." },
    { id: "craft_storehouse", name: "Expanded Storehouse", cost: { wood: 25, materials: 12, fibers: 6 }, effect: "+60 units of protected storage against annual decay." }
  ],

  // Military Units
  military: [
    { id: "unit_spears", name: "Janas First Spearmen", type: "Infantry", weapon: "Spears", armor: "Reinforced Hide", power: 16, health: 100, counter: ["Swords", "Cavalry"], maintenance: 2 }
  ],

  // Spirits & Gods
  spirits: [
    {
      id: "spirit_oshun",
      name: "Oshun of the Jade Waters",
      title: "Nascent River Spirit",
      favor: 72,
      boons: ["+25% River Fishery extraction", "Pure Spring Water (+50 Water capacity)"],
      taboos: "Felling trees along the riverbank invites sudden flash floods.",
      wrathLevel: 10
    }
  ],

  // Spells
  spells: [
    { id: "spell_rain", name: "Drying Rain Invocation", manaType: "water", cost: 14, desc: "Conjures a seasonal downpour, adding +25% crop yield growth." },
    { id: "spell_fertility", name: "Earth Mother's Bloom", manaType: "life", cost: 16, desc: "Imbues the soil with life, speeding animal breeding and herb discovery." },
    { id: "spell_ward", name: "Ward of the Smoldering Hearth", manaType: "fire", cost: 12, desc: "Protects tribe against winter cold, reducing fuel requirement by 30%." }
  ],

  // Chronicle & Historical Log
  chronicle: [
    { season: "Spring", year: 1, text: "Kiwele assumes the chieftain mantle of the Janas Clan. The river flows high with silver fish.", type: "log-positive" }
  ]
};

// --- SIMULATION & GAME ENGINE CONTROLLER ---
const GameEngine = {
  state: GameState,

  init() {
    this.initWorld("Janas-Dawn", "river_basin");
    this.renderAll();
    this.setupEventListeners();
    this.log("The council convenes. Explore the frontier on the World Map and guide the tribe.", "log-divine");
  },

  initWorld(seed, preset) {
    this.state.world = WorldGenerator.generate(seed, preset);
    this.syncLocationsFromWorld();
    const svgEl = document.getElementById("world-map-svg");
    if (svgEl) {
      MapRenderer.init(svgEl, this.state.world);
      this.onMapCellSelected(this.state.world.startCellId);
    }
  },

  syncLocationsFromWorld() {
    const w = this.state.world;
    if (!w) return;
    const claimed = w.cells.filter(c => c.owner === "player");
    this.state.locations = claimed.map(c => ({
      id: `loc_${c.id}`,
      cellId: c.id,
      name: c.name,
      terrain: c.biomeName,
      spaceMax: c.spaceMax,
      spaceUsed: c.spaceUsed,
      fertilityFieldsMax: c.fieldsMax,
      fertilityPasturesMax: c.pasturesMax,
      riverBonus: c.hasRiver,
      sites: c.sites,
      buildings: c.buildings
    }));
  },

  setMapMode(mode) {
    document.querySelectorAll(".btn-map-mode").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-mode") === mode);
    });
    MapRenderer.setMode(mode);
  },

  regenerateWorld() {
    const seed = document.getElementById("input-world-seed").value.trim() || `World-${Math.floor(Math.random() * 9999)}`;
    const preset = document.getElementById("select-world-preset").value;
    this.initWorld(seed, preset);
    this.renderAll();
    this.log(`Generated new procedural Voronoi world "${seed}" (${preset}).`, "log-divine");
  },

  toggleFogPreview() {
    MapRenderer.toggleFogPreview();
    const btn = document.getElementById("btn-toggle-fog");
    if (btn) {
      btn.classList.toggle("btn-primary", MapRenderer.revealAllDebug);
    }
    if (MapRenderer.selectedCellId !== null) {
      this.onMapCellSelected(MapRenderer.selectedCellId);
    }
  },

  onMapCellSelected(cellId) {
    const inspector = document.getElementById("map-cell-inspector");
    const w = this.state.world;
    if (!inspector || !w) return;
    const cell = w.cells[cellId];
    if (!cell) return;

    const visible = cell.explored || MapRenderer.revealAllDebug;
    const isAdjacentToExplored = cell.neighbors.some(nid => w.cells[nid].explored);
    const isAdjacentToPlayer = cell.neighbors.some(nid => w.cells[nid].owner === "player");
    const claimedCount = w.cells.filter(c => c.owner === "player").length;

    if (!visible) {
      const researchAvail = this.state.spheres.research.current;
      const scoutProb = Math.round(MathUtils.sigmoid(2 + (this.state.spheres.leadership.current * 0.3) - 1.5, 0.5) * 100);
      inspector.innerHTML = `
        <div class="card-header">
          <span class="card-title">&#x2753; Uncharted Region #${cell.id}</span>
          <span class="chip">Shrouded</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted);">
          Hidden beneath the Fog of War. Dispatch tribal scouts to chart the terrain, rivers, and natural resources.
        </p>
        <div class="inspector-stat-grid">
          <div class="inspector-stat">
            <div class="inspector-stat-label">Scout Cost</div>
            <div class="inspector-stat-val">1 Research</div>
          </div>
          <div class="inspector-stat">
            <div class="inspector-stat-label">Success Chance</div>
            <div class="inspector-stat-val" style="color:var(--accent-green);">${scoutProb}%</div>
          </div>
        </div>
        ${
          isAdjacentToExplored
            ? `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:10px;" onclick="GameEngine.exploreCell(${cell.id})" ${researchAvail < 1 ? "disabled" : ""}>
                &#x1F9ED; Dispatch Scouts (1 Research)
               </button>`
            : `<div class="chip chip-red" style="text-align:center; padding:8px;">Too far! Scout an adjacent frontier region first.</div>`
        }
      `;
      return;
    }

    const ownerBadge = cell.owner === "player"
      ? `<span class="chip chip-gold">Janas Territory</span>`
      : cell.owner
        ? `<span class="chip chip-red">Rival Clan</span>`
        : cell.isLand
          ? `<span class="chip chip-green">Unclaimed Land</span>`
          : `<span class="chip chip-blue">Ocean / Sea</span>`;

    const rival = cell.owner && cell.owner !== "player"
      ? w.rivals.find(r => r.id === cell.owner)
      : null;

    const yieldLabels = {
      foodPerishable: "Fresh Food",
      foodPreserved: "Preserved Food",
      wood: "Wood",
      materials: "Materials",
      fibers: "Fibers",
      mana: "Arcane Mana"
    };

    let sitesHtml = "";
    if (cell.sites && cell.sites.length > 0) {
      sitesHtml = cell.sites.map(st => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:6px 10px; border-radius:6px; font-size:12px; margin-bottom:6px;">
          <div>
            <strong>${st.name}</strong><br>
            <span style="color:var(--text-muted); font-size:11px;">+${st.yieldAmount} ${yieldLabels[st.yieldType] || st.yieldType}/pop (Cap ${st.extractionCap})</span>
          </div>
          ${
            cell.owner === "player"
              ? `<div style="display:flex; align-items:center; gap:4px;">
                  <button class="btn" style="padding:2px 7px;" onclick="GameEngine.adjustSiteWorkers(${cell.id}, '${st.id}', -1)">-</button>
                  <span style="font-family:var(--font-mono); font-weight:700;">${st.assignedPops}</span>
                  <button class="btn" style="padding:2px 7px;" onclick="GameEngine.adjustSiteWorkers(${cell.id}, '${st.id}', 1)">+</button>
                 </div>`
              : `<span class="chip">${st.type}</span>`
          }
        </div>
      `).join("");
    } else {
      sitesHtml = `<div style="font-size:12px; color:var(--text-muted);">No extractable land sites.</div>`;
    }

    let actionButtons = "";
    if (!cell.explored && MapRenderer.revealAllDebug && isAdjacentToExplored) {
      actionButtons += `<button class="btn btn-primary" onclick="GameEngine.exploreCell(${cell.id})">&#x1F9ED; Officially Scout (1 Research)</button>`;
    }

    if (cell.isLand && !cell.owner && cell.explored) {
      if (!isAdjacentToPlayer) {
        actionButtons += `<div class="chip" style="text-align:center; padding:6px;">Must border Janas Territory to claim.</div>`;
      } else if (claimedCount >= this.state.commandLimit) {
        actionButtons += `<div class="chip chip-red" style="text-align:center; padding:6px;">Command Limit Reached (${claimedCount}/${this.state.commandLimit}). Research Ideograms to expand!</div>`;
      } else {
        actionButtons += `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:9px;" onclick="GameEngine.claimCell(${cell.id})">&#x1F3F4; Claim Territory (2 Development)</button>`;
      }
    }

    if (cell.owner === "player" && !cell.hasRoad && cell.id !== w.startCellId) {
      actionButtons += `<button class="btn" style="width:100%; justify-content:center;" onclick="GameEngine.buildRoad(${cell.id})">&#x1F6E4; Build Dirt Road (10 Wood, 1 Dev)</button>`;
    }

    if (cell.anomaly) {
      actionButtons += `
        <div style="background:rgba(188,140,255,0.12); border:1px solid var(--accent-purple); padding:10px; border-radius:6px; font-size:12px;">
          <strong style="color:var(--accent-purple);">&#x2728; Anomaly: ${cell.anomaly}</strong>
          <p style="color:var(--text-muted); margin:4px 0 8px;">Investigating ancient anomalies risks cosmic entropy, but grants rare relics or mana.</p>
          <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="GameEngine.investigateAnomaly(${cell.id})">Investigate Anomaly (2 Culture)</button>
        </div>
      `;
    }

    if (rival) {
      actionButtons += `
        <div style="background:rgba(248,81,73,0.12); border:1px solid var(--accent-red); padding:10px; border-radius:6px; font-size:12px;">
          <strong style="color:var(--accent-red);">&#x2694; ${rival.name} (${rival.attitude})</strong>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button class="btn" style="flex:1; justify-content:center;" onclick="GameEngine.tradeWithRival(${cell.id})">&#x1F91D; Barter (1 Com)</button>
            <button class="btn btn-danger" style="flex:1; justify-content:center;" onclick="GameEngine.raidRival(${cell.id})">&#x2694; Raid (2 Mil)</button>
          </div>
        </div>
      `;
    }

    inspector.innerHTML = `
      <div class="card-header" style="margin-bottom:4px;">
        <span class="card-title">${cell.name}</span>
        ${ownerBadge}
      </div>
      <div style="font-size:12px; color:var(--text-muted);">
        ${cell.biomeName} ${cell.hasRiver ? '• <strong style="color:#53a4f5;">River Basin (2x Fertility)</strong>' : ''}
      </div>

      <div class="inspector-stat-grid">
        <div class="inspector-stat">
          <div class="inspector-stat-label">Elevation</div>
          <div class="inspector-stat-val">${cell.h} m</div>
        </div>
        <div class="inspector-stat">
          <div class="inspector-stat-label">Climate</div>
          <div class="inspector-stat-val">${cell.temp}°C • ${cell.prec}% Hum</div>
        </div>
        <div class="inspector-stat">
          <div class="inspector-stat-label">Fertility Cap</div>
          <div class="inspector-stat-val">${cell.fieldsMax}F / ${cell.pasturesMax}P</div>
        </div>
        <div class="inspector-stat">
          <div class="inspector-stat-label">Space Used</div>
          <div class="inspector-stat-val">${cell.spaceUsed} / ${cell.spaceMax}</div>
        </div>
      </div>

      <div>
        <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Natural Sites & Labor</div>
        ${sitesHtml}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${actionButtons}
      </div>
    `;
  },

  exploreCell(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell || cell.explored) return;

    if (s.spheres.research.current < 1) {
      alert("Need at least 1 Research power to dispatch scouts!");
      return;
    }
    s.spheres.research.current -= 1;

    const prob = MathUtils.sigmoid(2 + (s.spheres.leadership.current * 0.3) - 1.5, 0.5);
    if (Math.random() <= prob) {
      cell.explored = true;
      if (cell.isLand) WorldGenerator.rollCellSites(cell, Math.random, false);
      // Critical breakthrough reveals 1 random neighbor too
      if (Math.random() < 0.25) {
        const hiddenNeighbors = cell.neighbors.filter(nid => !s.world.cells[nid].explored);
        if (hiddenNeighbors.length > 0) {
          const bonusId = hiddenNeighbors[0];
          s.world.cells[bonusId].explored = true;
          if (s.world.cells[bonusId].isLand) WorldGenerator.rollCellSites(s.world.cells[bonusId], Math.random, false);
        }
      }
      this.log(`Charted ${cell.name} (${cell.biomeName})${cell.anomaly ? " — ANOMALY DETECTED!" : ""}`, cell.anomaly ? "log-divine" : "log-positive");
      MapRenderer.render();
      this.onMapCellSelected(cellId);
    } else {
      s.telemetry.tension = MathUtils.clamp(s.telemetry.tension + 3, 0, 100);
      this.log(`Scouts turned back by harsh terrain near region #${cell.id}.`, "log-negative");
    }
    this.renderAll();
  },

  claimCell(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    const claimedCount = s.world.cells.filter(c => c.owner === "player").length;

    if (!cell || !cell.isLand || cell.owner) return;
    if (claimedCount >= s.commandLimit) {
      alert("Command Limit reached! Research Ideograms or level Leadership to claim more cells.");
      return;
    }
    if (s.spheres.development.current < 2) {
      alert("Need 2 Development power to establish an outpost and claim territory!");
      return;
    }

    s.spheres.development.current -= 2;
    cell.owner = "player";
    this.syncLocationsFromWorld();
    this.log(`Territory Claimed: ${cell.name} (${cell.biomeName}) is now part of the Janas realm!`, "log-positive");
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  buildRoad(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell || cell.owner !== "player" || cell.hasRoad) return;
    if (s.resources.wood < 10 || s.spheres.development.current < 1) {
      alert("Need 10 Wood and 1 Development power to clear a Dirt Road.");
      return;
    }
    s.resources.wood -= 10;
    s.spheres.development.current -= 1;
    cell.hasRoad = true;
    // Also ensure capital has road flag for visual link
    s.world.cells[s.world.startCellId].hasRoad = true;
    this.log(`Dirt Road Constructed: ${cell.name} is now connected for free pop & troop transit.`, "log-positive");
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  investigateAnomaly(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell || !cell.anomaly) return;
    if (s.spheres.culture.current < 2) {
      alert("Need 2 Culture power to perform investigation rituals.");
      return;
    }
    s.spheres.culture.current -= 2;
    const anomalyName = cell.anomaly;
    cell.anomaly = null;
    s.telemetry.entropy = MathUtils.clamp(s.telemetry.entropy + 12, 0, 100);
    s.magic.pools.arcane = Math.min(50, s.magic.pools.arcane + 18);
    s.magic.pools.life = Math.min(50, s.magic.pools.life + 10);
    s.spheres.research.current += 3;
    this.log(`ANOMALY UNLOCKED (${anomalyName}): Gained +18 Arcane Mana, +10 Life Mana, and +3 Research! Entropy surged.`, "log-divine");
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  tradeWithRival(cellId) {
    const s = this.state;
    if (s.spheres.commerce.current < 1 || s.resources.pottery < 3) {
      alert("Need 1 Commerce power and 3 Pottery to barter with rival clans.");
      return;
    }
    s.spheres.commerce.current -= 1;
    s.resources.pottery -= 3;
    s.resources.foodPreserved += 25;
    s.resources.materials += 12;
    this.log(`Caravan Barter: Traded 3 Pottery for 25 Preserved Food and 12 Stone/Copper!`, "log-positive");
    this.renderAll();
  },

  raidRival(cellId) {
    const s = this.state;
    if (s.spheres.military.current < 2) {
      alert("Need 2 Military power to launch a raid!");
      return;
    }
    s.spheres.military.current -= 2;
    const unitPower = s.military[0] ? s.military[0].power : 12;
    const winProb = MathUtils.sigmoid((unitPower - 12) * 0.25, 1.0);
    if (Math.random() < winProb) {
      s.resources.materials += 22;
      s.resources.hides += 10;
      s.telemetry.tension = MathUtils.clamp(s.telemetry.tension + 10, 0, 100);
      this.log(`Raid Victorious! Janas warriors plundered 22 Materials and 10 Hides.`, "log-positive");
    } else {
      if (s.military[0]) s.military[0].health = Math.max(25, s.military[0].health - 25);
      s.telemetry.tension = MathUtils.clamp(s.telemetry.tension + 14, 0, 100);
      this.log(`Raid Repulsed! Warriors retreated with heavy casualties.`, "log-negative");
    }
    this.renderAll();
  },

  adjustSiteWorkers(cellId, siteId, delta) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell) return;
    const site = cell.sites.find(st => st.id === siteId);
    if (!site) return;

    const totalAssigned = s.world.cells
      .filter(c => c.owner === "player")
      .flatMap(c => c.sites)
      .reduce((sum, st) => sum + st.assignedPops, 0);

    if (delta > 0 && totalAssigned >= s.pops.length) {
      alert(`All ${s.pops.length} pop cohorts are already assigned! Unassign from another site or grow your population.`);
      return;
    }
    site.assignedPops = Math.max(0, site.assignedPops + delta);
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        this.switchTab(tabId);
      });
    });

    // Next Turn button
    document.getElementById("btn-end-turn").addEventListener("click", () => {
      this.advanceSeason();
    });

    // Action planner sliders
    const sliderL = document.getElementById("slider-action-primary");
    const sliderS = document.getElementById("slider-action-secondary");
    if (sliderL && sliderS) {
      sliderL.addEventListener("input", () => this.updateActionProbabilityPreview());
      sliderS.addEventListener("input", () => this.updateActionProbabilityPreview());
    }

    // Action executor
    const btnExec = document.getElementById("btn-execute-action");
    if (btnExec) {
      btnExec.addEventListener("click", () => this.executeAction());
    }
  },

  switchTab(tabId) {
    document.querySelectorAll(".nav-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
    const targetContent = document.getElementById(`tab-${tabId}`);
    if (targetBtn && targetContent) {
      targetBtn.classList.add("active");
      targetContent.classList.add("active");
    }
  },

  log(msg, type = "") {
    const s = this.state;
    const seasonName = s.seasons[s.turn];
    s.chronicle.unshift({ season: seasonName, year: s.year, text: msg, type });
    this.renderChronicle();
  },

  // Update probability preview for action planner
  updateActionProbabilityPreview() {
    const primaryVal = parseInt(document.getElementById("slider-action-primary").value) || 0;
    const secondaryVal = parseInt(document.getElementById("slider-action-secondary").value) || 0;
    document.getElementById("val-action-primary").innerText = primaryVal;
    document.getElementById("val-action-secondary").innerText = secondaryVal;

    const actionType = document.getElementById("select-action-type").value;
    let baselineDiff = 6;
    if (actionType === "explore") baselineDiff = 7;
    if (actionType === "clear_pasture") baselineDiff = 5;
    if (actionType === "commune_spirits") baselineDiff = 6;
    if (actionType === "tame_beasts") baselineDiff = 8;
    if (actionType === "codify_law") baselineDiff = 9;

    const effectivePower = primaryVal + (0.5 * secondaryVal);
    const prob = MathUtils.sigmoid(effectivePower - baselineDiff, 0.45);
    const probPct = Math.round(prob * 100);

    const probEl = document.getElementById("action-prob-val");
    if (probEl) {
      probEl.innerText = `${probPct}%`;
      if (probPct >= 75) probEl.style.color = "var(--accent-green)";
      else if (probPct >= 45) probEl.style.color = "var(--accent-gold)";
      else probEl.style.color = "var(--accent-red)";
    }
  },

  executeAction() {
    const s = this.state;
    const actionSelect = document.getElementById("select-action-type");
    const actionType = actionSelect.value;
    const primaryVal = parseInt(document.getElementById("slider-action-primary").value) || 0;
    const secondaryVal = parseInt(document.getElementById("slider-action-secondary").value) || 0;

    // Check if player has enough sphere points
    if (s.spheres.development.current < primaryVal || s.spheres.leadership.current < secondaryVal) {
      alert("Insufficient Sphere Power allocated! Lower your sliders.");
      return;
    }

    // Deduct sphere points
    s.spheres.development.current -= primaryVal;
    s.spheres.leadership.current -= secondaryVal;

    let baselineDiff = 6;
    if (actionType === "explore") baselineDiff = 7;
    if (actionType === "clear_pasture") baselineDiff = 5;
    if (actionType === "commune_spirits") baselineDiff = 6;
    if (actionType === "tame_beasts") baselineDiff = 8;
    if (actionType === "codify_law") baselineDiff = 9;

    const effectivePower = primaryVal + (0.5 * secondaryVal);
    const prob = MathUtils.sigmoid(effectivePower - baselineDiff, 0.45);
    const roll = Math.random();

    if (roll < prob) {
      // Success!
      if (actionType === "explore") {
        s.resources.materials += 15;
        s.resources.fibers += 12;
        s.telemetry.entropy += 2;
        this.log(`Exploration Triumph! Scouts mapped the Outer Ridge, discovering 15 Stone and 12 Fibers.`, "log-positive");
      } else if (actionType === "clear_pasture") {
        s.locations[0].fertilityPasturesMax += 1;
        s.resources.wood += 20;
        this.log(`Pasture Cleared: Cleared scrubland, yielding 20 Wood and +1 Pasture Capacity.`, "log-positive");
      } else if (actionType === "commune_spirits") {
        s.spirits[0].favor = MathUtils.clamp(s.spirits[0].favor + 14, 0, 100);
        s.magic.pools.water = MathUtils.clamp(s.magic.pools.water + 15, 0, 50);
        this.log(`Spiritual Communion: Oshun receives your sacred dances. Favor rises to ${s.spirits[0].favor}%.`, "log-divine");
      } else if (actionType === "tame_beasts") {
        s.herds[0].count += 3;
        this.log(`Taming Success: Ensnared 3 wild horned goats, expanding the tribe's herd.`, "log-positive");
      } else if (actionType === "codify_law") {
        s.telemetry.tension = MathUtils.clamp(s.telemetry.tension - 12, 0, 100);
        this.log(`Law Inscribed: The Elder Council codified ancestral customs, reducing Tension by 12.`, "log-positive");
      }
    } else {
      // Failure or setback
      s.telemetry.tension += 4;
      this.log(`Action Complication: The endeavor encountered unexpected resistance and failed to achieve its primary objective.`, "log-negative");
    }

    this.renderAll();
  },

  // -------------------------------------------------------------
  // ADVANCE SEASON (CORE TURN LOOP WITH CONTINUOUS CALCULATIONS)
  // -------------------------------------------------------------
  advanceSeason() {
    const s = this.state;
    const currentSeason = s.seasons[s.turn];

    // 1. POP LABOR PRODUCTION AT SITES (across all claimed map cells)
    let seasonFoodHarvested = 0;
    let seasonPreserved = 0;
    let seasonWoodGathered = 0;
    let seasonMaterials = 0;
    let seasonFibers = 0;
    let seasonMana = 0;

    s.locations.forEach(loc => {
      loc.sites.forEach(site => {
        if (site.assignedPops > 0) {
          const toolBonus = 1.15;
          const rawYield = Math.round(site.yieldAmount * site.assignedPops * toolBonus);
          const yieldGenerated = Math.min(site.extractionCap || 999, rawYield);
          if (site.yieldType === "foodPerishable") seasonFoodHarvested += yieldGenerated;
          else if (site.yieldType === "foodPreserved") seasonPreserved += yieldGenerated;
          else if (site.yieldType === "wood") seasonWoodGathered += yieldGenerated;
          else if (site.yieldType === "materials") seasonMaterials += yieldGenerated;
          else if (site.yieldType === "fibers") seasonFibers += yieldGenerated;
          else if (site.yieldType === "mana") seasonMana += yieldGenerated;
        }
      });
    });

    s.resources.foodPerishable += seasonFoodHarvested;
    s.resources.foodPreserved += seasonPreserved;
    s.resources.wood += seasonWoodGathered;
    s.resources.materials += seasonMaterials;
    s.resources.fibers += seasonFibers;
    if (seasonMana > 0) {
      s.magic.pools.arcane = Math.min(s.magic.capacities.arcane, s.magic.pools.arcane + seasonMana);
    }

    // 2. CROPS (GRAIN) ACCUMULATION OR HARVEST
    const farmingPops = s.pops.filter(p => p.workplace === "Crop Field").length;
    if (s.turn === s.cropField.harvestSeason) {
      // AUTUMN HARVEST SEASON!
      const harvestYield = Math.min(s.cropField.accumulatedYield, farmingPops * s.cropField.harvestPerWorker * 1.5);
      s.resources.foodPerishable += Math.round(harvestYield);
      s.cropField.accumulatedYield = 20; // reset to base
      this.log(`Autumn Harvest: Reaped ${Math.round(harvestYield)} grain from the cultivated fields!`, "log-positive");
    } else {
      // Accumulate growth during non-harvest seasons
      const growth = farmingPops * s.cropField.growthRatePerFarmer;
      s.cropField.accumulatedYield = Math.min(s.cropField.maxYield, s.cropField.accumulatedYield + growth);
    }

    // 3. HERD PRODUCTION & FODDER CONSUMPTION
    s.herds.forEach(herd => {
      const milkYield = Math.round(herd.count * 1.8);
      s.resources.foodPerishable += milkYield;
    });

    // 4. PERISHABLE FOOD HALVING (SEASONAL SPOILAGE)
    const spoiledAmount = Math.floor(s.resources.foodPerishable * 0.45);
    s.resources.foodPerishable = Math.max(0, s.resources.foodPerishable - spoiledAmount);

    // 5. WINTER HEATING FUEL CONSUMPTION
    let winterWarning = "";
    if (s.turn === 3) { // Winter
      const popCount = s.pops.length;
      // 1 wood per pop cohort base, cold modifier
      const fuelRequired = Math.round(popCount * 1.2);
      if (s.resources.wood >= fuelRequired) {
        s.resources.wood -= fuelRequired;
        this.log(`Winter Fuel: Consumed ${fuelRequired} wood to keep the hearths burning through frost.`, "");
      } else {
        const deficit = fuelRequired - s.resources.wood;
        s.resources.wood = 0;
        s.telemetry.tension += 15;
        s.pops.forEach(p => p.health = Math.max(30, p.health - 20));
        winterWarning = `FREEZING WINTER! Wood shortage of ${deficit} fuel caused frostbite and unrest!`;
        this.log(winterWarning, "log-negative");
      }
    }

    // 6. POP NOURISHMENT CONSUMPTION
    // Each pop consumes 5 food and 1 water per season (20/5 per year)
    const totalPops = s.pops.length;
    const foodConsumed = totalPops * 5;
    const waterConsumed = totalPops * 1.5;

    if (s.resources.foodPerishable >= foodConsumed) {
      s.resources.foodPerishable -= foodConsumed;
    } else {
      const rem = foodConsumed - s.resources.foodPerishable;
      s.resources.foodPerishable = 0;
      s.resources.foodPreserved = Math.max(0, s.resources.foodPreserved - rem);
    }
    s.resources.water = Math.max(0, s.resources.water - waterConsumed);

    // 7. DEMOGRAPHIC GROWTH RATE ACCUMULATION
    // If diet is balanced and tribe has food surplus, advance population pool
    const balancedDietPops = s.pops.filter(p => p.diet === "balanced").length;
    const growthIncrement = (balancedDietPops * 0.08) * (1 - (totalPops / 15)); // carrying capacity factor
    s.demographicGrowthPool += growthIncrement;
    if (s.demographicGrowthPool >= 1.0) {
      s.demographicGrowthPool -= 1.0;
      const newPopId = `pop_${s.pops.length + 1}`;
      s.pops.push({
        id: newPopId,
        name: `Hearth Group ${s.pops.length + 1}`,
        blood: s.tribe.bloodline,
        faction: "Harvesters",
        locationId: "loc_janas",
        workplace: "River Fishery",
        housing: "Destitution",
        tools: [],
        health: 100,
        diet: "balanced"
      });
      this.log(`Tribal Growth: A new population cohort of 100 souls has matured into productive labor!`, "log-positive");
    }

    // 8. FACTION TENSION & REFRESH SPHERE POWER
    s.spheres.leadership.current = s.spheres.leadership.base + s.leader.socialSkill;
    s.spheres.development.current = s.spheres.development.base + 2;
    s.spheres.military.current = s.spheres.military.base + (s.factions[0].opinion > 50 ? 2 : 0);
    s.spheres.culture.current = s.spheres.culture.base + (s.factions[1].opinion > 50 ? 4 : 1);
    s.spheres.research.current = s.spheres.research.base + (s.factions[3].opinion > 50 ? 2 : 0);
    s.spheres.commerce.current = s.spheres.commerce.base + (s.factions[2].opinion > 50 ? 3 : 1);

    // 9. ADVANCE CALENDAR
    s.turn = (s.turn + 1) % 4;
    if (s.turn === 0) {
      // NEW YEAR RECKONING!
      s.year += 1;
      this.resolveAnnualReckoning();
    } else {
      // Dynamic seasonal weather fluctuation
      this.updateSeasonalWeather();
      this.log(`Season advanced to ${s.seasons[s.turn]}, Year ${s.year}.`);
    }

    this.renderAll();
  },

  // -------------------------------------------------------------
  // ANNUAL RECKONING (WEATHER, COSMIC EVENTS, DESTINY SINGULARITY)
  // -------------------------------------------------------------
  resolveAnnualReckoning() {
    const s = this.state;
    this.log(`=== END OF YEAR ${s.year - 1} RECKONING ===`, "log-divine");

    // Weather reset
    this.updateSeasonalWeather();

    // Spoilage of any unstored food
    s.resources.foodPerishable = Math.floor(s.resources.foodPerishable * 0.3);

    // Livestock breeding check (continuous logistic)
    s.herds.forEach(herd => {
      const birthRate = 0.25;
      const newborn = Math.max(1, Math.round(herd.count * birthRate));
      herd.count += newborn;
      this.log(`Spring Pasture: ${newborn} newborn goat kids added to ${herd.species}.`, "log-positive");
    });

    // Check for Cosmic Chaos / Destiny Event!
    this.triggerAnnualEvent();
  },

  updateSeasonalWeather() {
    const s = this.state;
    const season = s.seasons[s.turn];
    if (season === "Spring") {
      s.weather.temperature = Math.round(16 + MathUtils.gaussianRandom(0, 2));
      s.weather.moisture = 70;
      s.weather.condition = "Spring Showers & Rapid Thaw";
    } else if (season === "Summer") {
      s.weather.temperature = Math.round(28 + MathUtils.gaussianRandom(0, 3));
      s.weather.moisture = 45;
      s.weather.condition = "Scorching Sun & Warm Winds";
    } else if (season === "Autumn") {
      s.weather.temperature = Math.round(14 + MathUtils.gaussianRandom(0, 2));
      s.weather.moisture = 55;
      s.weather.condition = "Golden Autumn & Gentle Breezes";
    } else if (season === "Winter") {
      s.weather.temperature = Math.round(-2 + MathUtils.gaussianRandom(0, 4));
      s.weather.moisture = 35;
      s.weather.condition = "Biting Rime Frost & Bitter Winds";
    }
  },

  // -------------------------------------------------------------
  // DYNAMIC COSMIC EVENT GENERATOR (REPLACES 3d6 TABLE)
  // -------------------------------------------------------------
  triggerAnnualEvent() {
    const s = this.state;
    const entropy = s.telemetry.entropy;
    const tension = s.telemetry.tension;
    const favor = s.telemetry.divineFavor;

    // Check for Destiny Singularity (Extreme statistical tails)
    const cosmicRoll = Math.random() * 100;
    
    if (cosmicRoll > 94 || entropy > 70) {
      // MIRACULOUS OR CATACLYSMIC DESTINY EVENT
      this.showDestinySingularity();
      return;
    }

    // Standard Annual Event pool
    const events = [
      {
        tag: "ECOLOGICAL MIRACLE",
        title: "Bountiful Migration of the Horned Elk",
        desc: "Massive herds of great elk have descended into the Janas Valley to graze along the reeds. The hunters are eager to strike, but the Shamans warn they carry the scent of the River Goddess.",
        choices: [
          {
            text: "Organize an all-out tribal hunt (+50 Food, +15 Hides, -10 Spirit Favor)",
            action: () => {
              s.resources.foodPerishable += 50;
              s.resources.hides += 15;
              s.spirits[0].favor -= 10;
              this.log("The hunters butchered dozens of sacred elk. The river waters turned cloudy with silt.", "log-negative");
            }
          },
          {
            text: "Corral and tame a breeding herd (+4 Herd animals, -10 Fodder)",
            action: () => {
              s.herds[0].count += 4;
              this.log("Wild elk calves were successfully integrated into the tribal enclosures.", "log-positive");
            }
          },
          {
            text: "Offer gifts and let them pass peacefully (+15 Spirit Favor, +8 Life Mana)",
            action: () => {
              s.spirits[0].favor += 15;
              s.magic.pools.life = Math.min(50, s.magic.pools.life + 8);
              this.log("The elk grazed unmolested, and the spirit Oshun blessed the spring crops.", "log-divine");
            }
          }
        ]
      },
      {
        tag: "POLITICAL STRIFE",
        title: "The Spear Warriors Demand a Blood Rite",
        desc: "Frustrated by long seasons of agricultural labor, the warlords of the Spear Warriors demand that the chieftain declare a seasonal raid upon the neighboring hill clan to seize copper implements and captives.",
        choices: [
          {
            text: "Sanction the raid (+15 Weapons/Materials, +15 Warrior Opinion, +12 Tension)",
            action: () => {
              s.resources.materials += 15;
              s.factions[0].opinion = Math.min(100, s.factions[0].opinion + 15);
              s.telemetry.tension += 12;
              this.log("War parties returned victorious with looted axes, but neighbor tribes now plot vengeance.", "log-negative");
            }
          },
          {
            text: "Redirect their fervor into building tribal defenses (+1 Camp Wall, -10 Wood)",
            action: () => {
              s.resources.wood = Math.max(0, s.resources.wood - 10);
              s.factions[0].opinion += 5;
              this.log("The warriors constructed timber palisades around the storehouses.", "log-positive");
            }
          },
          {
            text: "Denounce the warlords with chieftain authority (-15 Warrior Opinion, -8 Tension)",
            action: () => {
              s.factions[0].opinion -= 15;
              s.telemetry.tension = Math.max(0, s.telemetry.tension - 8);
              this.log("Chieftain Kiwele forced the warriors to stand down, reasserting domestic order.", "");
            }
          }
        ]
      },
      {
        tag: "MYTHIC PHENOMENON",
        title: "The River Weeps Golden Sap",
        desc: "At dusk, thick veins of luminous golden sap began bubbling from the riverbed clay. The craftsmen claim it can temper pottery like iron, while the Shamans claim it is the molten blood of an ancient sun god.",
        choices: [
          {
            text: "Harvest the sap for pottery tempering (+15 Pottery, +10 Solid Materials)",
            action: () => {
              s.resources.pottery += 15;
              s.resources.materials += 10;
              this.log("Craftsmen used the sacred resin to glaze virtually unbreakable vessels.", "log-positive");
            }
          },
          {
            text: "Perform ritual extraction into sacred mana vials (+20 Arcane Mana, +10 Light Mana)",
            action: () => {
              s.magic.pools.arcane = Math.min(50, s.magic.pools.arcane + 20);
              s.magic.pools.light = Math.min(50, s.magic.pools.light + 10);
              this.log("Shamans filled stone jars with humming solar essence.", "log-divine");
            }
          }
        ]
      }
    ];

    const chosenEvent = events[Math.floor(Math.random() * events.length)];
    this.showEventModal(chosenEvent);
  },

  showDestinySingularity() {
    const s = this.state;
    const singularity = {
      isDestiny: true,
      tag: "DESTINY SINGULARITY (1,1,1 / 6,6,6 RECURSION)",
      title: "Awakening of the Primordial Siphon",
      desc: "A pillar of silent violet fire erupts from the sacred grove! The celestial axis bends above the Janas Valley. The genetics of the entire Ashkhan Muntu bloodline begin to warp in response to divine resonance. This is an epochal event that will reshape your civilization forever.",
      choices: [
        {
          text: "Embrace the Divine Siphon: Blood gains 'Voidtouched Gaze' (+25% Research, -10% Sun Health)",
          action: () => {
            s.tribe.bloodline = "Void-Awakened Ashkhan Muntu";
            s.tribe.boons.push("Voidtouched Gaze (+25% Research Potential)");
            s.tribe.curses.push("Sun Sickness (-10% Daytime Health)");
            s.telemetry.entropy += 20;
            this.log("THE BLOOD HAS MUTATED! The entire tribe now bears eyes of violet luminescence.", "log-divine");
          }
        },
        {
          text: "Harness the Arcane Well: Channel the pillar into an eternal mana fountain (+50 Arcane Capacity, +15 Mana/Season)",
          action: () => {
            s.magic.capacities.arcane += 50;
            s.magic.pools.arcane = 50;
            s.telemetry.entropy += 10;
            this.log("The rift was bound into a monolithic stone obelisk humming with endless planar force.", "log-divine");
          }
        }
      ]
    };
    this.showEventModal(singularity);
  },

  showEventModal(eventObj) {
    const modal = document.getElementById("event-modal-overlay");
    const titleEl = document.getElementById("modal-event-title");
    const tagEl = document.getElementById("modal-event-tag");
    const bodyEl = document.getElementById("modal-event-body");
    const actionsEl = document.getElementById("modal-event-actions");
    const dialog = modal.querySelector(".modal-dialog");

    if (eventObj.isDestiny) {
      dialog.classList.add("destiny-singularity");
      tagEl.style.color = "var(--accent-purple)";
    } else {
      dialog.classList.remove("destiny-singularity");
      tagEl.style.color = "var(--accent-gold)";
    }

    tagEl.innerText = eventObj.tag;
    titleEl.innerText = eventObj.title;
    bodyEl.innerText = eventObj.desc;
    actionsEl.innerHTML = "";

    eventObj.choices.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "modal-btn-choice";
      btn.innerHTML = `<span>${c.text}</span>`;
      btn.addEventListener("click", () => {
        c.action();
        modal.classList.remove("active");
        this.renderAll();
      });
      actionsEl.appendChild(btn);
    });

    modal.classList.add("active");
  },

  // Crafting execution
  craftItem(craftId) {
    const s = this.state;
    const craft = s.crafts.find(c => c.id === craftId);
    if (!craft) return;

    // Check costs
    for (const [res, amt] of Object.entries(craft.cost)) {
      if ((s.resources[res] || 0) < amt) {
        alert(`Missing required ${res} (Need ${amt})`);
        return;
      }
    }

    // Deduct
    for (const [res, amt] of Object.entries(craft.cost)) {
      s.resources[res] -= amt;
    }

    // Apply effect
    if (craftId === "craft_hammer") s.resources.tools = s.resources.tools || {};
    if (craftId === "craft_pottery") {
      // Converts 10 perishable to preserved
      const converted = Math.min(10, s.resources.foodPerishable);
      s.resources.foodPerishable -= converted;
      s.resources.foodPreserved += converted;
      s.resources.pottery += 1;
      this.log(`Sealed ${converted} food into airtight clay pottery jars.`, "log-positive");
    } else if (craftId === "craft_hut") {
      s.locations[0].buildings[0].capacity += 1;
      this.log(`Constructed an additional insulated hut. Housing capacity increased to ${s.locations[0].buildings[0].capacity}.`, "log-positive");
    } else if (craftId === "craft_storehouse") {
      s.locations[0].buildings[1].capacity += 60;
      this.log(`Expanded Storehouse: Protected storage capacity raised to ${s.locations[0].buildings[1].capacity}.`, "log-positive");
    } else {
      this.log(`Crafted ${craft.name}.`, "log-positive");
    }

    this.renderAll();
  },

  // Tech research execution
  researchTech(techId) {
    const s = this.state;
    const tech = s.techTree.find(t => t.id === techId);
    if (!tech || tech.researched) return;

    const availableResearch = s.spheres.research.current;
    if (availableResearch <= 0) {
      alert("No available Research Sphere power! Allocate research or please the Council of Elders.");
      return;
    }

    const invested = Math.min(availableResearch, tech.cost - tech.progress);
    s.spheres.research.current -= invested;
    tech.progress += invested;

    if (tech.progress >= tech.cost) {
      tech.researched = true;
      if (tech.id === "tech_ideograms") {
        s.commandLimit += 2;
        this.log(`TECHNOLOGY MASTERED: ${tech.name}! Command Limit increased by +2 (now ${s.commandLimit}).`, "log-divine");
      } else {
        this.log(`TECHNOLOGY MASTERED: ${tech.name}! ${tech.desc}`, "log-divine");
      }
    } else {
      this.log(`Invested ${invested} Research points into ${tech.name} (${tech.progress}/${tech.cost}).`);
    }

    this.renderAll();
  },

  // -------------------------------------------------------------
  // RENDERING ENGINE
  // -------------------------------------------------------------
  renderAll() {
    this.renderTopBar();
    this.renderResourceStrip();
    this.renderOverviewTab();
    this.renderTerritoryTab();
    this.renderPopulationTab();
    this.renderAgrarianTab();
    this.renderFactionsTab();
    this.renderTechTab();
    this.renderMilitaryTab();
    this.renderSpiritsTab();
    this.renderMagicTab();
    this.renderChronicle();
    if (MapRenderer && MapRenderer.selectedCellId !== null && this.state.world) {
      this.onMapCellSelected(MapRenderer.selectedCellId);
    }
  },

  renderTopBar() {
    const s = this.state;
    document.getElementById("ui-tribe-name").innerText = s.tribe.name;
    document.getElementById("ui-leader-name").innerText = `${s.leader.name} (${s.leader.dynasty})`;
    document.getElementById("ui-year-val").innerText = `Year ${s.year}`;

    const badge = document.getElementById("ui-season-badge");
    const currentSeason = s.seasons[s.turn];
    badge.innerText = currentSeason;
    badge.className = `season-badge season-${currentSeason.toLowerCase()}`;

    document.getElementById("ui-temp-val").innerText = `${s.weather.temperature}°C`;
    document.getElementById("ui-weather-cond").innerText = s.weather.condition;

    // Telemetry Gauges
    const tensionFill = document.getElementById("gauge-tension-fill");
    tensionFill.style.width = `${s.telemetry.tension}%`;
    tensionFill.style.backgroundColor = s.telemetry.tension > 60 ? "var(--accent-red)" : "var(--accent-gold)";
    document.getElementById("val-tension").innerText = `${Math.round(s.telemetry.tension)}%`;

    const entropyFill = document.getElementById("gauge-entropy-fill");
    entropyFill.style.width = `${s.telemetry.entropy}%`;
    entropyFill.style.backgroundColor = s.telemetry.entropy > 60 ? "var(--accent-purple)" : "var(--accent-blue)";
    document.getElementById("val-entropy").innerText = `${Math.round(s.telemetry.entropy)}%`;
  },

  renderResourceStrip() {
    const r = this.state.resources;
    document.getElementById("res-food-perishable").innerText = r.foodPerishable;
    document.getElementById("res-food-preserved").innerText = r.foodPreserved;
    document.getElementById("res-water").innerText = Math.round(r.water);
    document.getElementById("res-wood").innerText = r.wood;
    document.getElementById("res-materials").innerText = r.materials;
    document.getElementById("res-pottery").innerText = r.pottery;
  },

  renderOverviewTab() {
    const s = this.state;
    // Render sphere cards
    const sphereContainer = document.getElementById("sphere-cards-container");
    sphereContainer.innerHTML = "";
    for (const [key, sp] of Object.entries(s.spheres)) {
      const card = document.createElement("div");
      card.className = `card sphere-card sphere-${key}`;
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${sp.label}</span>
          <span class="chip chip-gold">Base: ${sp.base}</span>
        </div>
        <div class="sphere-power-val">${sp.current}</div>
        <div class="sphere-sub">Current Seasonal Potential</div>
      `;
      sphereContainer.appendChild(card);
    }

    this.updateActionProbabilityPreview();
  },

  renderTerritoryTab() {
    const s = this.state;
    const claimedCount = s.locations.length;
    const mapCmdEl = document.getElementById("ui-map-command-limit");
    if (mapCmdEl) mapCmdEl.innerText = `Claimed: ${claimedCount} / ${s.commandLimit}`;
    const terrCmdEl = document.getElementById("ui-territory-cmd");
    if (terrCmdEl) terrCmdEl.innerText = `${claimedCount} / ${s.commandLimit}`;

    const cardsContainer = document.getElementById("claimed-locations-cards");
    if (cardsContainer) {
      cardsContainer.innerHTML = "";
      s.locations.forEach(loc => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-header">
            <span class="card-title">${loc.name}</span>
            <span class="chip chip-gold">${loc.terrain}${loc.riverBonus ? " (River 2x)" : ""}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px;">
            <div>Space Capacity: <strong>${loc.spaceUsed} / ${loc.spaceMax}</strong></div>
            <div>Fertility: <strong>${loc.fertilityFieldsMax} Fields | ${loc.fertilityPasturesMax} Pastures</strong></div>
          </div>
          <button class="btn" onclick="GameEngine.switchTab('map'); MapRenderer.selectCell(${loc.cellId}); MapRenderer.centerOnCell(${loc.cellId}, 2.0);">
            View on World Map
          </button>
        `;
        cardsContainer.appendChild(card);
      });
    }

    const siteTableBody = document.querySelector("#table-sites tbody");
    siteTableBody.innerHTML = "";
    s.locations.forEach(loc => {
      loc.sites.forEach(st => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${loc.name}</strong></td>
          <td>${st.name}</td>
          <td>${st.type}</td>
          <td>${st.yieldAmount} ${st.yieldType}/worker</td>
          <td>${st.extractionCap}/season</td>
          <td>
            <span class="chip chip-green">${st.assignedPops} Pops (~${st.assignedPops * 100})</span>
          </td>
        `;
        siteTableBody.appendChild(tr);
      });
    });

    const bldTableBody = document.querySelector("#table-buildings tbody");
    bldTableBody.innerHTML = "";
    s.locations.forEach(loc => {
      loc.buildings.forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${b.name}</strong> <span class="text-muted">(${loc.name})</span></td>
          <td>${b.type}</td>
          <td>${b.capacity || "-"}</td>
          <td><span class="text-muted">${b.effect}</span></td>
        `;
        bldTableBody.appendChild(tr);
      });
    });
  },

  renderPopulationTab() {
    const s = this.state;
    document.getElementById("ui-pop-total").innerText = `${s.pops.length} Cohorts (~${s.pops.length * 100} souls)`;
    document.getElementById("ui-pop-growth-pct").innerText = `${Math.round(s.demographicGrowthPool * 100)}%`;

    const popTableBody = document.querySelector("#table-pops tbody");
    popTableBody.innerHTML = "";
    s.pops.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td><span class="chip chip-blue">${p.blood}</span></td>
        <td>${p.faction}</td>
        <td>${p.workplace}</td>
        <td><span class="chip ${p.housing === "Hut" ? "chip-green" : "chip-red"}">${p.housing}</span></td>
        <td>${p.tools.length ? p.tools.join(", ") : "None"}</td>
        <td>
          <div style="font-weight:600; color:${p.health >= 80 ? 'var(--accent-green)' : 'var(--accent-red)'}">
            ${p.health}%
          </div>
        </td>
      `;
      popTableBody.appendChild(tr);
    });
  },

  renderAgrarianTab() {
    const s = this.state;
    const c = s.cropField;
    document.getElementById("ui-crop-name").innerText = c.cropName;
    document.getElementById("ui-crop-yield").innerText = `${Math.round(c.accumulatedYield)} / ${c.maxYield}`;
    document.getElementById("ui-crop-harvest-season").innerText = s.seasons[c.harvestSeason];

    const herd = s.herds[0];
    document.getElementById("ui-herd-species").innerText = herd.species;
    document.getElementById("ui-herd-count").innerText = `${herd.count} Animals`;
    document.getElementById("ui-herd-milk").innerText = `+${Math.round(herd.count * 1.8)} food/season`;
  },

  renderFactionsTab() {
    const s = this.state;
    const container = document.getElementById("factions-list-container");
    container.innerHTML = "";
    s.factions.forEach(fac => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${fac.name}</span>
          <span class="chip ${fac.opinion >= 60 ? 'chip-green' : fac.opinion >= 40 ? 'chip-gold' : 'chip-red'}">
            Opinion: ${fac.opinion}%
          </span>
        </div>
        <div style="font-size:12px; margin-bottom:8px;">
          <strong>Sphere Alignment:</strong> <span class="chip chip-blue" style="text-transform:capitalize;">${fac.sphere}</span>
        </div>
        <div style="font-size:12px; background:var(--bg-tertiary); padding:10px; border-radius:6px; margin-bottom:8px; border-left:3px solid var(--accent-gold);">
          <strong>Active Demand:</strong> ${fac.activeDemand}
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          <em>${fac.penalty}</em>
        </div>
      `;
      container.appendChild(card);
    });
  },

  renderTechTab() {
    const s = this.state;
    const container = document.getElementById("tech-list-container");
    container.innerHTML = "";
    s.techTree.forEach(tech => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${tech.name}</span>
          <span class="chip ${tech.researched ? 'chip-green' : 'chip-gold'}">
            ${tech.researched ? "MASTERED" : `${tech.progress} / ${tech.cost} Points`}
          </span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">${tech.desc}</p>
        <div>
          ${
            tech.researched 
              ? `<button class="btn" disabled style="opacity:0.5;">Researched</button>`
              : `<button class="btn btn-primary" onclick="GameEngine.researchTech('${tech.id}')">Invest Research</button>`
          }
        </div>
      `;
      container.appendChild(card);
    });

    const craftContainer = document.getElementById("crafting-list-container");
    craftContainer.innerHTML = "";
    s.crafts.forEach(c => {
      const costStr = Object.entries(c.cost).map(([k, v]) => `${v} ${k}`).join(", ");
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${c.name}</span>
          <span class="chip chip-blue">${costStr}</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">${c.effect}</p>
        <button class="btn btn-primary" onclick="GameEngine.craftItem('${c.id}')">Craft Item</button>
      `;
      craftContainer.appendChild(card);
    });
  },

  renderMilitaryTab() {
    const s = this.state;
    const tableBody = document.querySelector("#table-military tbody");
    tableBody.innerHTML = "";
    s.military.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${u.name}</strong></td>
        <td>${u.type}</td>
        <td><strong style="color:var(--accent-red);">${u.power}</strong></td>
        <td>${u.health}%</td>
        <td>${u.weapon} / ${u.armor}</td>
        <td><span class="chip chip-gold">Counters: ${u.counter.join(", ")}</span></td>
      `;
      tableBody.appendChild(tr);
    });
  },

  renderSpiritsTab() {
    const s = this.state;
    const sp = s.spirits[0];
    document.getElementById("ui-spirit-name").innerText = sp.name;
    document.getElementById("ui-spirit-title").innerText = sp.title;
    document.getElementById("ui-spirit-favor").innerText = `${sp.favor}% Favor`;
    document.getElementById("ui-spirit-taboo").innerText = sp.taboos;

    const boonsContainer = document.getElementById("spirit-boons-list");
    boonsContainer.innerHTML = "";
    sp.boons.forEach(b => {
      const li = document.createElement("li");
      li.innerText = b;
      boonsContainer.appendChild(li);
    });
  },

  renderMagicTab() {
    const m = this.state.magic;
    const container = document.getElementById("mana-reservoirs-container");
    container.innerHTML = "";
    for (const [nat, cur] of Object.entries(m.pools)) {
      const max = m.capacities[nat] || 50;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title" style="text-transform:capitalize;">${nat} Mana</span>
          <span class="chip chip-purple">${cur} / ${max}</span>
        </div>
        <div class="gauge-bar-bg" style="height:8px; margin-top:8px;">
          <div class="gauge-fill" style="width:${(cur/max)*100}%; background:var(--accent-purple);"></div>
        </div>
      `;
      container.appendChild(card);
    }
  },

  renderChronicle() {
    const containers = [
      document.getElementById("chronicle-stream"),
      document.getElementById("chronicle-stream-full")
    ].filter(Boolean);

    containers.forEach(container => {
      container.innerHTML = "";
      this.state.chronicle.forEach(item => {
        const entry = document.createElement("div");
        entry.className = `log-entry ${item.type || ""}`;
        entry.innerHTML = `
          <div class="log-timestamp">${item.season}, Year ${item.year}</div>
          <div>${item.text}</div>
        `;
        container.appendChild(entry);
      });
    });
  }
};

// Bootstrap on window load
window.addEventListener("DOMContentLoaded", () => {
  GameEngine.init();
});
