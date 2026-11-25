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

  // Pops (Discrete cohorts of ~100 people - Single Source of Truth for Labor!)
  pops: [
    { id: "pop_1", name: "First Hearth", blood: "Ashkhan Muntu", faction: "Shamans", locationId: 0, workplaceId: "fish", housing: "Hut", tools: ["Spear", "Fish Trap"], health: 100, diet: "balanced" },
    { id: "pop_2", name: "River Fisherfolk", blood: "Ashkhan Muntu", faction: "Traders", locationId: 0, workplaceId: "fish", housing: "Hut", tools: ["Fish Trap"], health: 100, diet: "balanced" },
    { id: "pop_3", name: "Timber Wardens", blood: "Ashkhan Muntu", faction: "Spear Warriors", locationId: 0, workplaceId: "wood", housing: "Hut", tools: ["Axe"], health: 95, diet: "balanced" },
    { id: "pop_4", name: "Clay Gatherers", blood: "Ashkhan Muntu", faction: "Elders", locationId: 0, workplaceId: "clay", housing: "Hut", tools: ["Basket"], health: 100, diet: "balanced" },
    { id: "pop_5", name: "Field Keepers", blood: "Ashkhan Muntu", faction: "Harvesters", locationId: 0, workplaceId: "crop_field", housing: "Hut", tools: ["Hoe"], health: 100, diet: "balanced" },
    { id: "pop_6", name: "Toolsmiths", blood: "Ashkhan Muntu", faction: "Harvesters", locationId: 0, workplaceId: "workshop", housing: "Hut", tools: ["Hammer"], health: 100, diet: "balanced" }
  ],

  activeTechId: "tech_pottery",
  automation: {
    autoSealFood: false,
    autoWorshipSpirit: false
  },

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
  ],

  // Structured Action Tracker across all seasons
  actionHistory: []
};

// --- SIMULATION & GAME ENGINE CONTROLLER ---
const GameEngine = {
  state: GameState,

  init() {
    const randomSeed = `World-${Math.floor(10000 + Math.random() * 90000)}`;
    const seedInput = document.getElementById("input-world-seed");
    if (seedInput) seedInput.value = randomSeed;
    this.initWorld(randomSeed, "river_basin");
    this.renderAll();
    this.setupEventListeners();
    this.renderTutorial();
    this.log(`The council convenes on world "${randomSeed}". Explore the frontier and guide the tribe.`, "log-divine");
  },

  initWorld(seed, preset) {
    this.state.world = WorldGenerator.generate(seed, preset);
    const startId = this.state.world.startCellId;
    // Bind initial pops cleanly to actual starting capital site IDs
    const startSites = this.state.world.cells[startId].sites || [];
    const fishSite = startSites.find(s => s.name.includes("Fishery"));
    const woodSite = startSites.find(s => s.name.includes("Hardwood"));
    const claySite = startSites.find(s => s.name.includes("Clay"));
    this.state.pops.forEach((p, idx) => {
      p.locationId = startId;
      if (idx <= 1 && fishSite) p.workplaceId = fishSite.id;
      else if (idx === 2 && woodSite) p.workplaceId = woodSite.id;
      else if (idx === 3 && claySite) p.workplaceId = claySite.id;
      else if (idx === 4) p.workplaceId = "crop_field";
      else if (idx === 5) p.workplaceId = "workshop";
      else p.workplaceId = "idle";
    });

    this.syncLocationsFromWorld();
    const svgEl = document.getElementById("world-map-svg");
    if (svgEl) {
      MapRenderer.init(svgEl, this.state.world);
      this.onMapCellSelected(startId);
    }
  },

  getSiteWorkers(siteId) {
    return this.state.pops.filter(p => p.workplaceId === siteId).length;
  },

  getCellPopCount(cellId) {
    const cell = this.state.world ? this.state.world.cells[cellId] : null;
    if (!cell || cell.owner !== "player") return 0;
    const siteIds = new Set(cell.sites.map(s => s.id));
    if (cellId === this.state.world.startCellId) {
      siteIds.add("crop_field");
      siteIds.add("workshop");
    }
    return this.state.pops.filter(p => siteIds.has(p.workplaceId)).length;
  },

  showToast(message, type = "warning") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    const icons = { error: "&#x26A0;", warning: "&#x26A0;", success: "&#x2714;", divine: "&#x2728;", info: "&#x2139;" };
    toast.innerHTML = `<div style="display:flex; gap:8px; align-items:flex-start;">
      <span>${icons[type] || "&#x2139;"}</span>
      <span style="flex:1;">${message}</span>
    </div>`;
    toast.addEventListener("click", () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3600);
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

  regenerateWorld(randomize = true) {
    const seedInput = document.getElementById("input-world-seed");
    let seed = seedInput ? seedInput.value.trim() : "";
    if (randomize || !seed) {
      seed = `World-${Math.floor(10000 + Math.random() * 90000)}`;
      if (seedInput) seedInput.value = seed;
    }
    const preset = document.getElementById("select-world-preset").value;
    this.initWorld(seed, preset);
    this.renderAll();
    this.showToast(`Generated ${preset.replace("_", " ")} world "${seed}"`, "divine");
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
            ? `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:10px;" onclick="GameEngine.exploreCell(${cell.id})" ${researchAvail < 1 ? "disabled" : ""}
                data-hover-tag="EXPEDITION • RESEARCH" data-hover-title="Dispatch Scouts" data-hover-desc="Sends tribal scouts beyond your borders to lift Fog of War and reveal biomes, rivers, anomalies, and resources." data-hover-meta="Cost: 1 Research • Odds: ${scoutProb}%">
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
      sitesHtml = cell.sites.map(st => {
        const workerCount = this.getSiteWorkers(st.id);
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:6px 10px; border-radius:6px; font-size:12px; margin-bottom:6px;">
          <div>
            <strong>${st.name}</strong><br>
            <span style="color:var(--text-muted); font-size:11px;">+${st.yieldAmount} ${yieldLabels[st.yieldType] || st.yieldType}/pop (Cap ${st.extractionCap})</span>
          </div>
          ${
            cell.owner === "player"
              ? `<div style="display:flex; align-items:center; gap:4px;">
                  <button class="btn" style="padding:2px 7px;" onclick="GameEngine.adjustSiteWorkers(${cell.id}, '${st.id}', -1)"
                    data-hover-tag="LABOR" data-hover-title="Unassign Pop" data-hover-desc="Moves 1 pop cohort off this site back to Idle status." data-hover-meta="Synced with Development → Pops & Labor">-</button>
                  <span style="font-family:var(--font-mono); font-weight:700;">${workerCount}</span>
                  <button class="btn" style="padding:2px 7px;" onclick="GameEngine.adjustSiteWorkers(${cell.id}, '${st.id}', 1)"
                    data-hover-tag="LABOR" data-hover-title="Assign Pop" data-hover-desc="Assigns 1 idle pop cohort to harvest this site each season." data-hover-meta="Synced with Development → Pops & Labor">+</button>
                 </div>`
              : `<span class="chip">${st.type}</span>`
          }
        </div>
      `;
      }).join("");
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
        actionButtons += `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:9px;" onclick="GameEngine.claimCell(${cell.id})"
          data-hover-tag="EXPANSION • DEVELOPMENT" data-hover-title="Claim Territory" data-hover-desc="Incorporates this region into the Janas Clan realm so your pops can harvest its sites and cultivate fields." data-hover-meta="Cost: 2 Development • Uses 1 Command Limit">&#x1F3F4; Claim Territory (2 Development)</button>`;
      }
    }

    if (cell.owner === "player" && !cell.hasRoad && cell.id !== w.startCellId) {
      actionButtons += `<button class="btn" style="width:100%; justify-content:center;" onclick="GameEngine.buildRoad(${cell.id})"
        data-hover-tag="INFRASTRUCTURE" data-hover-title="Build Dirt Road" data-hover-desc="Connects this outpost to your capital network for free population migration and military redeployment." data-hover-meta="Cost: 10 Wood, 1 Development">&#x1F6E4; Build Dirt Road (10 Wood, 1 Dev)</button>`;
    }

    if (cell.anomaly) {
      actionButtons += `
        <div style="background:rgba(188,140,255,0.12); border:1px solid var(--accent-purple); padding:10px; border-radius:6px; font-size:12px;">
          <strong style="color:var(--accent-purple);">&#x2728; Anomaly: ${cell.anomaly}</strong>
          <p style="color:var(--text-muted); margin:4px 0 8px;">Investigating ancient anomalies risks cosmic entropy, but grants rare relics or mana.</p>
          <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="GameEngine.investigateAnomaly(${cell.id})"
            data-hover-tag="DIVINE MYSTERY • CULTURE" data-hover-title="Investigate Anomaly" data-hover-desc="Channels ritual lore into an ancient relic site to extract Arcane & Life mana plus Research insights." data-hover-meta="Cost: 2 Culture • +12% Entropy">Investigate Anomaly (2 Culture)</button>
        </div>
      `;
    }

    if (rival) {
      actionButtons += `
        <div style="background:rgba(248,81,73,0.12); border:1px solid var(--accent-red); padding:10px; border-radius:6px; font-size:12px;">
          <strong style="color:var(--accent-red);">&#x2694; ${rival.name} (${rival.attitude})</strong>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button class="btn" style="flex:1; justify-content:center;" onclick="GameEngine.tradeWithRival(${cell.id})"
              data-hover-tag="DIPLOMACY • COMMERCE" data-hover-title="Send Barter Caravan" data-hover-desc="Exchanges crafted Pottery jars with this rival tribe for preserved rations and raw materials." data-hover-meta="Cost: 1 Commerce, 3 Pottery">&#x1F91D; Barter (1 Com)</button>
            <button class="btn btn-danger" style="flex:1; justify-content:center;" onclick="GameEngine.raidRival(${cell.id})"
              data-hover-tag="WARFARE • MILITARY" data-hover-title="Launch Tribal Raid" data-hover-desc="Dispatches warbands to plunder materials and hides. Risks casualties and higher tribal Tension." data-hover-meta="Cost: 2 Military • Power-weighted odds">&#x2694; Raid (2 Mil)</button>
          </div>
        </div>
      `;
    }

    const biomeDef = WorldGenerator.BIOMES[cell.biomeId] || { habitability: 0 };
    const stationedPops = this.getCellPopCount(cell.id);

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
          <div class="inspector-stat-label">${cell.owner === "player" ? "Labor Stationed" : "Habitability"}</div>
          <div class="inspector-stat-val">${cell.owner === "player" ? `${stationedPops} Pops (~${stationedPops * 100})` : `${biomeDef.habitability}%`}</div>
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
      this.showToast("Need at least 1 Research power to dispatch scouts!", "warning");
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
      this.recordAction(`Scout ${cell.name}`, "research", "1 Res", `${Math.round(prob * 100)}%`, "Success", `Revealed ${cell.biomeName}`);
      MapRenderer.render();
      this.onMapCellSelected(cellId);
    } else {
      s.telemetry.tension = MathUtils.clamp(s.telemetry.tension + 3, 0, 100);
      this.log(`Scouts turned back by harsh terrain near region #${cell.id}.`, "log-negative");
      this.recordAction(`Scout Region #${cell.id}`, "research", "1 Res", `${Math.round(prob * 100)}%`, "Failed", "Turned back (+3% Tension)");
    }
    this.renderAll();
  },

  claimCell(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    const claimedCount = s.world.cells.filter(c => c.owner === "player").length;

    if (!cell || !cell.isLand || cell.owner) return;
    if (claimedCount >= s.commandLimit) {
      this.showToast("Command Limit reached! Research Ideograms or level Leadership to claim more cells.", "warning");
      return;
    }
    if (s.spheres.development.current < 2) {
      this.showToast("Need 2 Development power to establish an outpost and claim territory!", "warning");
      return;
    }

    s.spheres.development.current -= 2;
    cell.owner = "player";
    this.syncLocationsFromWorld();
    this.log(`Territory Claimed: ${cell.name} (${cell.biomeName}) is now part of the Janas realm!`, "log-positive");
    this.recordAction(`Claim ${cell.name}`, "development", "2 Dev", "100%", "Success", `Added ${cell.biomeName} to realm`);
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  buildRoad(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell || cell.owner !== "player" || cell.hasRoad) return;
    if (s.resources.wood < 10 || s.spheres.development.current < 1) {
      this.showToast("Need 10 Wood and 1 Development power to clear a Dirt Road.", "warning");
      return;
    }
    s.resources.wood -= 10;
    s.spheres.development.current -= 1;
    cell.hasRoad = true;
    // Also ensure capital has road flag for visual link
    s.world.cells[s.world.startCellId].hasRoad = true;
    this.log(`Dirt Road Constructed: ${cell.name} is now connected for free pop & troop transit.`, "log-positive");
    this.recordAction(`Road to ${cell.name}`, "development", "1 Dev, 10 Wood", "100%", "Success", "Linked to road network");
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  investigateAnomaly(cellId) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell || !cell.anomaly) return;
    if (s.spheres.culture.current < 2) {
      this.showToast("Need 2 Culture power to perform investigation rituals.", "warning");
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
    this.recordAction(`Investigate ${anomalyName}`, "culture", "2 Cul", "100%", "Divine", "+28 Mana, +3 Res, +12% Entropy");
    MapRenderer.render();
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  tradeWithRival(cellId) {
    const s = this.state;
    if (s.spheres.commerce.current < 1 || s.resources.pottery < 3) {
      this.showToast("Need 1 Commerce power and 3 Pottery to barter with rival clans.", "warning");
      return;
    }
    s.spheres.commerce.current -= 1;
    s.resources.pottery -= 3;
    s.resources.foodPreserved += 25;
    s.resources.materials += 12;
    this.log(`Caravan Barter: Traded 3 Pottery for 25 Preserved Food and 12 Stone/Copper!`, "log-positive");
    this.recordAction("Rival Caravan Barter", "commerce", "1 Com, 3 Pottery", "100%", "Success", "+25 Preserved Food, +12 Materials");
    this.renderAll();
  },

  raidRival(cellId) {
    const s = this.state;
    if (s.spheres.military.current < 2) {
      this.showToast("Need 2 Military power to launch a raid!", "warning");
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
      this.recordAction("Raid Rival Clan", "military", "2 Mil", `${Math.round(winProb * 100)}%`, "Success", "+22 Materials, +10 Hides");
    } else {
      if (s.military[0]) s.military[0].health = Math.max(25, s.military[0].health - 25);
      s.telemetry.tension = MathUtils.clamp(s.telemetry.tension + 14, 0, 100);
      this.log(`Raid Repulsed! Warriors retreated with heavy casualties.`, "log-negative");
      this.recordAction("Raid Rival Clan", "military", "2 Mil", `${Math.round(winProb * 100)}%`, "Failed", "-25% Unit Health, +14% Tension");
    }
    this.renderAll();
  },

  adjustSiteWorkers(cellId, siteId, delta) {
    const s = this.state;
    const cell = s.world.cells[cellId];
    if (!cell) return;
    const site = cell.sites.find(st => st.id === siteId);
    if (!site) return;

    if (delta > 0) {
      const idlePop = s.pops.find(p => p.workplaceId === "idle");
      if (!idlePop) {
        this.showToast(`All ${s.pops.length} pops are assigned! Unassign one first or reassign in Development → Pops & Labor.`, "warning");
        return;
      }
      idlePop.locationId = cellId;
      idlePop.workplaceId = siteId;
      this.recordAction(`Assign ${idlePop.name} → ${site.name}`, "development", "Free", "100%", "Success", `Workers: ${this.getSiteWorkers(siteId)}`);
    } else if (delta < 0) {
      const assignedPop = s.pops.find(p => p.workplaceId === siteId);
      if (!assignedPop) return;
      assignedPop.workplaceId = "idle";
      this.recordAction(`Unassign ${assignedPop.name} ← ${site.name}`, "development", "Free", "100%", "Success", `Workers: ${this.getSiteWorkers(siteId)}`);
    }
    this.onMapCellSelected(cellId);
    this.renderAll();
  },

  activeSphere: null,
  activeSubtab: null,
  tutorialStep: 0,

  TUTORIAL_STEPS: [
    {
      tag: "STEP 1 OF 4 • THE LIVING WORLD",
      title: "Welcome, Chieftain of the Janas Clan",
      body: "The interactive Voronoi world map is your main command screen. Drag anywhere to pan, scroll to zoom, and click any region to view its terrain, climate, and natural sites in the right-hand Region Inspector. Rivers double agricultural fertility!"
    },
    {
      tag: "STEP 2 OF 4 • EXPLORE & EXPAND",
      title: "Lift the Fog of War",
      body: "Distant lands are veiled in Fog of War. Click any darkened border region and spend Research to Dispatch Scouts. Once revealed, spend Development to Claim neighboring territory up to your Command Limit, or investigate purple Anomalies."
    },
    {
      tag: "STEP 3 OF 4 • THE 6 EMBEDDED SPHERES",
      title: "Rule Through Embedded Menus",
      body: "Use the 6-Sphere Dock at the bottom (Leadership, Development, Military, Culture, Research, Commerce) to open embedded drawers directly over the map. Hover over any button to pop out a detailed highlight box, and check the top-left Action Ledger to track every move."
    },
    {
      tag: "STEP 4 OF 4 • SEASONS & DIVINE CHAOS",
      title: "Survive Spoilage, Winter & Spirits",
      body: "Click 'End Season' to advance time. Fresh Food loses 45% to spoilage every season unless sealed in Clay Pottery Jars. Winter burns Wood for warmth. Watch Tension and Entropy gauges—pushing them too high triggers chaotic divine singularities!"
    }
  ],

  setupEventListeners() {
    // Next Turn button (checks unspent sphere points, year-end & decade-end warnings)
    document.getElementById("btn-end-turn").addEventListener("click", () => {
      this.requestAdvanceSeason();
    });
    this.setupHoverCards();
  },

  setupHoverCards() {
    if (this._hoverBound) return;
    this._hoverBound = true;
    const card = document.getElementById("activity-hover-card");
    if (!card) return;

    const positionCard = (e) => {
      const pad = 16;
      const cardW = 265;
      const cardH = card.offsetHeight || 130;
      let left = e.clientX + 16;
      let top = e.clientY + 16;
      if (left + cardW > window.innerWidth - pad) left = e.clientX - cardW - 16;
      if (top + cardH > window.innerHeight - pad) top = e.clientY - cardH - 16;
      card.style.left = `${Math.max(8, left)}px`;
      card.style.top = `${Math.max(8, top)}px`;
    };

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[data-hover-title]");
      if (!target) return;
      document.getElementById("hover-card-tag").innerText = target.getAttribute("data-hover-tag") || "ACTIVITY";
      document.getElementById("hover-card-title").innerText = target.getAttribute("data-hover-title") || "";
      document.getElementById("hover-card-desc").innerText = target.getAttribute("data-hover-desc") || "";
      const meta = target.getAttribute("data-hover-meta") || "";
      const metaEl = document.getElementById("hover-card-meta");
      metaEl.innerText = meta;
      metaEl.style.display = meta ? "block" : "none";
      card.classList.add("visible");
      positionCard(e);
    });

    document.addEventListener("mousemove", (e) => {
      if (card.classList.contains("visible")) {
        positionCard(e);
      }
    });

    document.addEventListener("mouseout", (e) => {
      const from = e.target.closest("[data-hover-title]");
      if (!from) return;
      const to = e.relatedTarget ? e.relatedTarget.closest("[data-hover-title]") : null;
      if (from !== to) {
        card.classList.remove("visible");
      }
    });
  },

  toggleActionTracker() {
    const widget = document.getElementById("action-tracker-widget");
    const btn = document.getElementById("btn-toggle-tracker");
    if (!widget || !btn) return;
    widget.classList.toggle("collapsed");
    btn.innerHTML = widget.classList.contains("collapsed") ? "+" : "&#x2212;";
  },

  recordAction(name, sphere, cost, odds, outcome, effect) {
    const s = this.state;
    s.actionHistory.unshift({
      id: s.actionHistory.length + 1,
      season: s.seasons[s.turn],
      year: s.year,
      turnIndex: s.year * 4 + s.turn,
      name,
      sphere,
      cost,
      odds,
      outcome,
      effect
    });
  },

  openTutorial(step = 0) {
    this.tutorialStep = Math.max(0, Math.min(this.TUTORIAL_STEPS.length - 1, step));
    const overlay = document.getElementById("tutorial-modal-overlay");
    if (overlay) overlay.classList.add("active");
    this.renderTutorial();
  },

  closeTutorial() {
    const overlay = document.getElementById("tutorial-modal-overlay");
    if (overlay) overlay.classList.remove("active");
  },

  stepTutorial(delta) {
    const next = this.tutorialStep + delta;
    if (next >= this.TUTORIAL_STEPS.length) {
      this.closeTutorial();
      return;
    }
    this.tutorialStep = Math.max(0, next);
    this.renderTutorial();
  },

  renderTutorial() {
    const step = this.TUTORIAL_STEPS[this.tutorialStep];
    if (!step) return;
    const tagEl = document.getElementById("tutorial-step-tag");
    const titleEl = document.getElementById("tutorial-step-title");
    const bodyEl = document.getElementById("tutorial-step-body");
    const dotsEl = document.getElementById("tutorial-dots");
    const prevBtn = document.getElementById("btn-tut-prev");
    const nextBtn = document.getElementById("btn-tut-next");

    if (tagEl) tagEl.innerText = step.tag;
    if (titleEl) titleEl.innerText = step.title;
    if (bodyEl) bodyEl.innerText = step.body;
    if (dotsEl) {
      dotsEl.innerHTML = this.TUTORIAL_STEPS.map((_, idx) =>
        `<span class="tutorial-dot ${idx === this.tutorialStep ? "active" : ""}"></span>`
      ).join("");
    }
    if (prevBtn) prevBtn.disabled = this.tutorialStep === 0;
    if (nextBtn) {
      nextBtn.innerHTML = this.tutorialStep === this.TUTORIAL_STEPS.length - 1
        ? "Begin Ruling &#x1F451;"
        : "Next &#x2192;";
    }
  },

  toggleInspector() {
    const wrap = document.getElementById("map-inspector-wrapper");
    const btn = document.getElementById("btn-toggle-inspector");
    if (!wrap || !btn) return;
    wrap.classList.toggle("collapsed");
    btn.innerHTML = wrap.classList.contains("collapsed") ? "+" : "&#x2212;";
  },

  toggleSphereMenu(sphereKey) {
    if (this.activeSphere === sphereKey) {
      this.closeSphereMenu();
    } else {
      this.openSphereMenu(sphereKey);
    }
  },

  openSphereMenu(sphereKey, subtab = null) {
    const defaultSubtabs = {
      leadership: "sovereign",
      development: "pops",
      military: "garrison",
      culture: "spirits",
      research: "tech",
      commerce: "crafting"
    };

    this.activeSphere = sphereKey;
    this.activeSubtab = subtab || defaultSubtabs[sphereKey] || "main";

    document.querySelectorAll(".sphere-dock-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-sphere") === sphereKey);
    });

    const drawer = document.getElementById("sphere-embedded-drawer");
    if (drawer) {
      drawer.style.borderTopColor = `var(--sphere-${sphereKey})`;
      drawer.classList.add("open");
    }

    this.renderActiveSphereDrawer();
  },

  closeSphereMenu() {
    this.activeSphere = null;
    document.querySelectorAll(".sphere-dock-btn").forEach(b => b.classList.remove("active"));
    const drawer = document.getElementById("sphere-embedded-drawer");
    if (drawer) drawer.classList.remove("open");
  },

  setSubtab(subtabId) {
    this.activeSubtab = subtabId;
    this.renderActiveSphereDrawer();
  },

  // --- NEW EMBEDDED SPHERE ACTIONS ---
  hostCouncilFeast() {
    const s = this.state;
    const totalFood = s.resources.foodPerishable + s.resources.foodPreserved;
    if (s.spheres.leadership.current < 1 || totalFood < 25) {
      this.showToast("Need 1 Leadership energy and 25 Food to host a tribal feast.", "warning");
      return;
    }
    s.spheres.leadership.current -= 1;
    if (s.resources.foodPerishable >= 25) s.resources.foodPerishable -= 25;
    else {
      const rem = 25 - s.resources.foodPerishable;
      s.resources.foodPerishable = 0;
      s.resources.foodPreserved -= rem;
    }
    s.factions.forEach(f => f.opinion = Math.min(100, f.opinion + 8));
    s.telemetry.tension = Math.max(0, s.telemetry.tension - 10);
    this.log("Council Feast Held: All factions gained +8 Opinion and tribal Tension dropped by 10%.", "log-positive");
    this.recordAction("Host Council Feast", "leadership", "1 Lead, 25 Food", "100%", "Success", "+8% All Factions, -10% Tension");
    this.renderAll();
  },

  codifyPeaceAccord() {
    const s = this.state;
    if (s.spheres.leadership.current < 2) {
      this.showToast("Need 2 Leadership energy to decree a tribal Peace Accord.", "warning");
      return;
    }
    s.spheres.leadership.current -= 2;
    s.telemetry.tension = Math.max(0, s.telemetry.tension - 15);
    this.log("Law Decreed: Chieftain Kiwele enforced the Accord of the Hearth (-15% Tension).", "log-positive");
    this.recordAction("Decree Peace Accord", "leadership", "2 Lead", "100%", "Success", "-15% Tension");
    this.renderAll();
  },

  reassignPop(popId, combinedVal) {
    const pop = this.state.pops.find(p => p.id === popId);
    if (!pop) return;
    const [locStr, wpId] = combinedVal.split("|");
    pop.locationId = parseInt(locStr, 10) || this.state.world.startCellId;
    pop.workplaceId = wpId || "idle";

    let label = "Unassigned (Idle)";
    if (wpId === "crop_field") label = "Crop Field (Sorghum)";
    else if (wpId === "workshop") label = "Basic Workshop";
    else if (wpId !== "idle") {
      const cell = this.state.world.cells[pop.locationId];
      const st = cell ? cell.sites.find(x => x.id === wpId) : null;
      if (st) label = `${cell.name}: ${st.name}`;
    }

    this.log(`Reassigned ${pop.name} → ${label}.`);
    this.recordAction(`Reassign ${pop.name}`, "development", "Free", "100%", "Success", `Moved to ${label}`);
    this.renderAll();
  },

  slaughterHerd(herdId, count = 2) {
    const s = this.state;
    const herd = s.herds.find(h => h.id === herdId);
    if (!herd || herd.count <= count) {
      this.showToast("Cannot slaughter below breeding minimum!", "warning");
      return;
    }
    herd.count -= count;
    const meat = count * (herd.slaughterMeat || 20);
    const hides = count * (herd.slaughterHide || 4);
    s.resources.foodPerishable += meat;
    s.resources.hides += hides;
    this.log(`Butchered ${count} ${herd.species}, yielding +${meat} Fresh Food and +${hides} Hides.`, "log-positive");
    this.recordAction(`Slaughter ${count} Goats`, "development", "Free", "100%", "Success", `+${meat} Food, +${hides} Hides`);
    this.renderAll();
  },

  tameWildGoats() {
    const s = this.state;
    if (s.spheres.development.current < 2) {
      this.showToast("Need 2 Development energy to corral wild goats.", "warning");
      return;
    }
    s.spheres.development.current -= 2;
    s.herds[0].count += 3;
    this.log("Pastoral Expansion: Corralled 3 wild horned goats into the tribe's herd.", "log-positive");
    this.recordAction("Tame Wild Goats", "development", "2 Dev", "100%", "Success", "+3 Herd Animals");
    this.renderAll();
  },

  trainSpearmen() {
    const s = this.state;
    if (s.spheres.military.current < 1 || s.resources.materials < 10 || s.resources.wood < 12) {
      this.showToast("Need 1 Military energy, 10 Materials, and 12 Wood to outfit a spear regiment.", "warning");
      return;
    }
    s.spheres.military.current -= 1;
    s.resources.materials -= 10;
    s.resources.wood -= 12;
    s.military.push({
      id: `unit_${s.military.length + 1}`,
      name: `River Spearmen #${s.military.length + 1}`,
      type: "Infantry",
      weapon: "Flint Spears",
      armor: "Hide Shield",
      power: 14,
      health: 100,
      counter: ["Swords", "Cavalry"],
      maintenance: 2
    });
    s.factions[0].opinion = Math.min(100, s.factions[0].opinion + 10);
    this.log("Regiment Mobilized: Trained new River Spearmen (+10 Spear Warriors Opinion).", "log-positive");
    this.recordAction("Train River Spearmen", "military", "1 Mil, 10 Mat, 12 Wood", "100%", "Success", "+1 Unit (Power 14)");
    this.renderAll();
  },

  fortifyCamp() {
    const s = this.state;
    if (s.spheres.military.current < 1 || s.resources.wood < 15) {
      this.showToast("Need 1 Military energy and 15 Wood to raise palisade defenses.", "warning");
      return;
    }
    s.spheres.military.current -= 1;
    s.resources.wood -= 15;
    const cap = s.locations[0];
    if (cap) {
      cap.buildings.push({
        id: `bld_wall_${cap.buildings.length}`,
        name: "Timber Palisade",
        type: "Defense",
        capacity: 15,
        effect: "Protects pops and reduces enemy raid casualties by 25%."
      });
    }
    s.telemetry.tension = Math.max(0, s.telemetry.tension - 5);
    this.log("Defenses Constructed: Raised Timber Palisades around Janas Valley.", "log-positive");
    this.recordAction("Raise Timber Palisade", "military", "1 Mil, 15 Wood", "100%", "Success", "+15 Defense, -5% Tension");
    this.renderAll();
  },

  offerFoodSacrifice() {
    const s = this.state;
    if (s.spheres.culture.current < 1 || s.resources.foodPerishable < 20) {
      this.showToast("Need 1 Culture energy and 20 Fresh Food to offer a river sacrifice.", "warning");
      return;
    }
    s.spheres.culture.current -= 1;
    s.resources.foodPerishable -= 20;
    s.spirits[0].favor = Math.min(100, s.spirits[0].favor + 15);
    s.magic.pools.water = Math.min(s.magic.capacities.water, s.magic.pools.water + 12);
    s.telemetry.entropy = Math.max(0, s.telemetry.entropy - 5);
    s.factions[1].opinion = Math.min(100, s.factions[1].opinion + 10);
    this.log("Sacred Offering: Oshun accepted 20 food (+15% Favor, +12 Water Mana, +10 Shamans Opinion).", "log-divine");
    this.recordAction("Offer River Sacrifice", "culture", "1 Cul, 20 Food", "100%", "Divine", "+15% Favor, +12 Water Mana");
    this.renderAll();
  },

  castSpell(spellId) {
    const s = this.state;
    const spell = s.spells.find(sp => sp.id === spellId);
    if (!spell) return;
    if ((s.magic.pools[spell.manaType] || 0) < spell.cost) {
      this.showToast(`Insufficient ${spell.manaType} mana (Need ${spell.cost}).`, "warning");
      return;
    }
    s.magic.pools[spell.manaType] -= spell.cost;
    s.telemetry.entropy = Math.min(100, s.telemetry.entropy + 6);

    if (spellId === "spell_rain") {
      s.cropField.accumulatedYield = Math.min(s.cropField.maxYield, s.cropField.accumulatedYield + 75);
      s.weather.moisture = Math.min(100, s.weather.moisture + 20);
      this.log("SPELL CAST: Drying Rain Invocation! Sorghum yield surged by +75.", "log-divine");
      this.recordAction(`Cast ${spell.name}`, "culture", `${spell.cost} ${spell.manaType}`, "100%", "Divine", "+75 Crop Yield, +20% Moisture");
    } else if (spellId === "spell_fertility") {
      s.herds[0].count += 2;
      s.demographicGrowthPool += 0.25;
      this.log("SPELL CAST: Earth Mother's Bloom! Herds grew by +2 and demographic growth surged +25%.", "log-divine");
      this.recordAction(`Cast ${spell.name}`, "culture", `${spell.cost} ${spell.manaType}`, "100%", "Divine", "+2 Herd, +25% Pop Growth");
    } else if (spellId === "spell_ward") {
      s.telemetry.tension = Math.max(0, s.telemetry.tension - 10);
      s.pops.forEach(p => p.health = Math.min(100, p.health + 15));
      this.log("SPELL CAST: Ward of the Smoldering Hearth! Tribal health restored and Tension eased.", "log-divine");
      this.recordAction(`Cast ${spell.name}`, "culture", `${spell.cost} ${spell.manaType}`, "100%", "Divine", "+15% Pop Health, -10% Tension");
    }
    this.renderAll();
  },

  preserveFoodWithPottery() {
    const s = this.state;
    if (s.resources.pottery < 1 || s.resources.foodPerishable < 10) {
      this.showToast("Need at least 1 Pottery Jar and 10 Fresh Food to seal rations.", "warning");
      return;
    }
    s.resources.pottery -= 1;
    s.resources.foodPerishable -= 10;
    s.resources.foodPreserved += 10;
    this.log("Food Preserved: Sealed 10 Fresh Food inside a clay jar against spoilage.", "log-positive");
    this.recordAction("Seal Food in Pottery", "commerce", "1 Pottery, 10 Food", "100%", "Success", "+10 Preserved Food");
    this.renderAll();
  },

  focusNearestFrontier() {
    const w = this.state.world;
    if (!w) return;
    const frontier = w.cells.find(c => !c.explored && c.neighbors.some(nid => w.cells[nid].explored));
    if (!frontier) {
      this.showToast("All reachable frontier cells are already explored!", "info");
      return;
    }
    MapRenderer.selectCell(frontier.id);
    MapRenderer.centerOnCell(frontier.id, 1.8);
    this.closeSphereMenu();
  },

  focusCellOnMap(cellId) {
    MapRenderer.selectCell(cellId);
    MapRenderer.centerOnCell(cellId, 2.0);
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
      this.showToast("Insufficient Sphere Power allocated! Lower your sliders.", "warning");
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

    const actionLabel = actionSelect.options[actionSelect.selectedIndex].text.split("(")[0].trim();
    const costLabel = `${primaryVal} Dev, ${secondaryVal} Lead`;
    const oddsPct = `${Math.round(prob * 100)}%`;

    if (roll < prob) {
      // Success!
      if (actionType === "explore") {
        s.resources.materials += 15;
        s.resources.fibers += 12;
        s.telemetry.entropy += 2;
        this.log(`Exploration Triumph! Scouts mapped the Outer Ridge, discovering 15 Stone and 12 Fibers.`, "log-positive");
        this.recordAction(actionLabel, "development", costLabel, oddsPct, "Success", "+15 Materials, +12 Fibers");
      } else if (actionType === "clear_pasture") {
        s.locations[0].fertilityPasturesMax += 1;
        s.resources.wood += 20;
        this.log(`Pasture Cleared: Cleared scrubland, yielding 20 Wood and +1 Pasture Capacity.`, "log-positive");
        this.recordAction(actionLabel, "development", costLabel, oddsPct, "Success", "+1 Pasture Cap, +20 Wood");
      } else if (actionType === "commune_spirits") {
        s.spirits[0].favor = MathUtils.clamp(s.spirits[0].favor + 14, 0, 100);
        s.magic.pools.water = MathUtils.clamp(s.magic.pools.water + 15, 0, 50);
        this.log(`Spiritual Communion: Oshun receives your sacred dances. Favor rises to ${s.spirits[0].favor}%.`, "log-divine");
        this.recordAction(actionLabel, "culture", costLabel, oddsPct, "Divine", "+14% Favor, +15 Water Mana");
      } else if (actionType === "tame_beasts") {
        s.herds[0].count += 3;
        this.log(`Taming Success: Ensnared 3 wild horned goats, expanding the tribe's herd.`, "log-positive");
        this.recordAction(actionLabel, "development", costLabel, oddsPct, "Success", "+3 Herd Animals");
      } else if (actionType === "codify_law") {
        s.telemetry.tension = MathUtils.clamp(s.telemetry.tension - 12, 0, 100);
        this.log(`Law Inscribed: The Elder Council codified ancestral customs, reducing Tension by 12.`, "log-positive");
        this.recordAction(actionLabel, "leadership", costLabel, oddsPct, "Success", "-12% Tension");
      }
    } else {
      // Failure or setback
      s.telemetry.tension += 4;
      this.log(`Action Complication: The endeavor encountered unexpected resistance and failed to achieve its primary objective.`, "log-negative");
      this.recordAction(actionLabel, "leadership", costLabel, oddsPct, "Failed", "Setback (+4% Tension)");
    }

    this.renderAll();
  },

  // -------------------------------------------------------------
  // TURN ADVANCE PRE-FLIGHT CHECKS & AUTOMATION HELPERS
  // -------------------------------------------------------------
  selectResearchTarget(techId) {
    const s = this.state;
    const tech = s.techTree.find(t => t.id === techId);
    if (!tech || tech.researched) return;
    s.activeTechId = techId;
    if (s.spheres.research.current > 0) {
      this.researchTech(techId);
    } else {
      this.showToast(`Auto-Research queued: ${tech.name}. Unspent Research will invest automatically each season.`, "info");
      this.renderAll();
    }
  },

  toggleAutomation(key) {
    this.state.automation[key] = !this.state.automation[key];
    const on = this.state.automation[key];
    this.showToast(`Automation ${on ? "Enabled" : "Disabled"}`, "info");
    this.renderAll();
  },

  calculateSeasonalDeltas() {
    const s = this.state;
    let prodFood = 0, prodPreserved = 0, prodWood = 0, prodMaterials = 0, prodFibers = 0;

    s.locations.forEach(loc => {
      loc.sites.forEach(site => {
        const workers = this.getSiteWorkers(site.id);
        if (workers > 0) {
          const rawYield = Math.round(site.yieldAmount * workers * 1.15);
          const amt = Math.min(site.extractionCap || 999, rawYield);
          if (site.yieldType === "foodPerishable") prodFood += amt;
          else if (site.yieldType === "foodPreserved") prodPreserved += amt;
          else if (site.yieldType === "wood") prodWood += amt;
          else if (site.yieldType === "materials") prodMaterials += amt;
          else if (site.yieldType === "fibers") prodFibers += amt;
        }
      });
    });

    // Herd dairy
    let dairyFood = 0;
    s.herds.forEach(h => { dairyFood += Math.round(h.count * 1.8); });
    prodFood += dairyFood;

    // Autumn harvest
    const farmingPops = s.pops.filter(p => p.workplaceId === "crop_field").length;
    if (s.turn === s.cropField.harvestSeason && farmingPops > 0) {
      prodFood += Math.round(Math.min(s.cropField.accumulatedYield, farmingPops * s.cropField.harvestPerWorker * 1.5));
    }

    const totalPops = s.pops.length;
    const foodConsumed = totalPops * 5;
    const waterConsumed = Math.round(totalPops * 1.5);
    const woodFuel = s.turn === 3 ? Math.round(totalPops * 1.2) : 0;

    const afterHarvestFood = s.resources.foodPerishable + prodFood;
    const estSpoilage = Math.floor(afterHarvestFood * 0.45);
    const netFood = prodFood - estSpoilage - foodConsumed;

    return {
      foodPerishable: { net: netFood, prod: prodFood, spoil: estSpoilage, cons: foodConsumed },
      foodPreserved: { net: prodPreserved, prod: prodPreserved },
      water: { net: -waterConsumed, cons: waterConsumed },
      wood: { net: prodWood - woodFuel, prod: prodWood, cons: woodFuel },
      materials: { net: prodMaterials, prod: prodMaterials },
      fibers: { net: prodFibers, prod: prodFibers }
    };
  },

  requestAdvanceSeason() {
    const s = this.state;
    const warnings = [];

    // Check unspent Sphere points that refresh every season
    const unspent = [];
    for (const [key, sp] of Object.entries(s.spheres)) {
      if (sp.current <= 0) continue;
      // Exclude Research if Auto-Research is active and has an unfinished target
      if (key === "research" && s.activeTechId) {
        const t = s.techTree.find(x => x.id === s.activeTechId && !x.researched);
        if (t) continue;
      }
      if (key === "culture" && s.automation.autoWorshipSpirit && s.resources.foodPerishable >= 25) continue;
      unspent.push(`<strong>${sp.label}:</strong> ${sp.current} pts`);
    }

    if (unspent.length > 0) {
      warnings.push(`<div style="margin-bottom:8px;"><strong>Unspent Recovering Sphere Points</strong> (lost when season refreshes):<br><span style="color:var(--accent-gold);">${unspent.join(" • ")}</span></div>`);
    }

    const isYearEnd = s.turn === 3;
    const isDecadeEnd = isYearEnd && (s.year % 10 === 0);

    if (isYearEnd) {
      warnings.push(`<div style="margin-bottom:8px; color:#f85149;"><strong>&#x26A0; Annual Reckoning (End of Year ${s.year}):</strong> Unpreserved fresh food spoils further, weather shifts for Spring, herds breed, and a Major Cosmic Event will strike!</div>`);
    }
    if (isDecadeEnd) {
      warnings.push(`<div style="color:var(--accent-purple);"><strong>&#x2728; Decennial Epoch (End of Decade ${Math.floor(s.year / 10)}):</strong> Tools & equipment suffer 10-year wear and require upkeep!</div>`);
    }

    if (warnings.length === 0) {
      this.advanceSeason();
      return;
    }

    const modal = document.getElementById("turn-warning-modal-overlay");
    document.getElementById("turn-warn-tag").innerText = isDecadeEnd
      ? "DECENNIAL & SEASON TRANSITION"
      : isYearEnd
        ? "ANNUAL & SEASON TRANSITION"
        : "UNSPENT SPHERE POINTS WARNING";
    document.getElementById("turn-warn-title").innerText = isYearEnd
      ? `Prepare for Year ${s.year + 1}?`
      : `End ${s.seasons[s.turn]} with unspent points?`;
    document.getElementById("turn-warn-body").innerHTML = warnings.join("");
    modal.classList.add("active");
  },

  confirmAdvanceSeason() {
    const modal = document.getElementById("turn-warning-modal-overlay");
    if (modal) modal.classList.remove("active");
    this.advanceSeason();
  },

  cancelTurnWarning() {
    const modal = document.getElementById("turn-warning-modal-overlay");
    if (modal) modal.classList.remove("active");
  },

  // -------------------------------------------------------------
  // ADVANCE SEASON (CORE TURN LOOP WITH CONTINUOUS CALCULATIONS)
  // -------------------------------------------------------------
  advanceSeason() {
    const s = this.state;

    // 0. SPHERE AUTOMATION BEFORE REFRESH
    if (s.activeTechId && s.spheres.research.current > 0) {
      const targetTech = s.techTree.find(t => t.id === s.activeTechId && !t.researched);
      if (targetTech) {
        const inv = Math.min(s.spheres.research.current, targetTech.cost - targetTech.progress);
        s.spheres.research.current -= inv;
        targetTech.progress += inv;
        if (targetTech.progress >= targetTech.cost) {
          targetTech.researched = true;
          if (targetTech.id === "tech_ideograms") s.commandLimit += 2;
          s.activeTechId = null;
          this.showToast(`Auto-Research Mastered: ${targetTech.name}! Select next tech.`, "divine");
          this.log(`AUTO-RESEARCH MASTERED: ${targetTech.name}! ${targetTech.desc}`, "log-divine");
          this.recordAction(`Master ${targetTech.name}`, "research", `${inv} Res (Auto)`, "100%", "Divine", "Technology Mastered!");
        } else {
          this.log(`Auto-Research invested ${inv} into ${targetTech.name} (${targetTech.progress}/${targetTech.cost}).`);
        }
      }
    }

    if (s.automation.autoWorshipSpirit && s.spheres.culture.current >= 1 && s.resources.foodPerishable >= 25) {
      s.spheres.culture.current -= 1;
      s.resources.foodPerishable -= 20;
      s.spirits[0].favor = Math.min(100, s.spirits[0].favor + 15);
      s.magic.pools.water = Math.min(s.magic.capacities.water, s.magic.pools.water + 12);
      this.log(`Auto-Tribute: Offered 20 food to Oshun (+15% Favor, +12 Water Mana).`, "log-divine");
    }

    if (s.automation.autoSealFood && s.resources.pottery >= 1 && s.resources.foodPerishable >= 10) {
      const jarsToUse = Math.min(s.resources.pottery, Math.floor(s.resources.foodPerishable / 10));
      if (jarsToUse > 0) {
        s.resources.pottery -= jarsToUse;
        s.resources.foodPerishable -= jarsToUse * 10;
        s.resources.foodPreserved += jarsToUse * 10;
        this.log(`Auto-Seal: Preserved ${jarsToUse * 10} food using ${jarsToUse} Clay Pottery Jars.`, "log-positive");
      }
    }

    // 1. POP LABOR PRODUCTION AT SITES (Single source of truth via getSiteWorkers)
    let seasonFoodHarvested = 0;
    let seasonPreserved = 0;
    let seasonWoodGathered = 0;
    let seasonMaterials = 0;
    let seasonFibers = 0;
    let seasonMana = 0;

    s.locations.forEach(loc => {
      loc.sites.forEach(site => {
        const workers = this.getSiteWorkers(site.id);
        if (workers > 0) {
          const toolBonus = 1.15;
          const rawYield = Math.round(site.yieldAmount * workers * toolBonus);
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
    const farmingPops = s.pops.filter(p => p.workplaceId === "crop_field").length;
    if (s.turn === s.cropField.harvestSeason) {
      const harvestYield = Math.min(s.cropField.accumulatedYield, farmingPops * s.cropField.harvestPerWorker * 1.5);
      s.resources.foodPerishable += Math.round(harvestYield);
      s.cropField.accumulatedYield = 20;
      this.log(`Autumn Harvest: Reaped ${Math.round(harvestYield)} grain from the cultivated fields!`, "log-positive");
    } else {
      const growth = farmingPops * s.cropField.growthRatePerFarmer;
      s.cropField.accumulatedYield = Math.min(s.cropField.maxYield, s.cropField.accumulatedYield + growth);
    }

    // 3. HERD PRODUCTION
    s.herds.forEach(herd => {
      const milkYield = Math.round(herd.count * 1.8);
      s.resources.foodPerishable += milkYield;
    });

    // 4. PERISHABLE FOOD SPOILAGE (45%)
    const spoiledAmount = Math.floor(s.resources.foodPerishable * 0.45);
    s.resources.foodPerishable = Math.max(0, s.resources.foodPerishable - spoiledAmount);

    // 5. WINTER HEATING FUEL CONSUMPTION
    if (s.turn === 3) {
      const popCount = s.pops.length;
      const fuelRequired = Math.round(popCount * 1.2);
      if (s.resources.wood >= fuelRequired) {
        s.resources.wood -= fuelRequired;
        this.log(`Winter Fuel: Consumed ${fuelRequired} wood to keep the hearths burning through frost.`, "");
      } else {
        const deficit = fuelRequired - s.resources.wood;
        s.resources.wood = 0;
        s.telemetry.tension = Math.min(100, s.telemetry.tension + 15);
        s.pops.forEach(p => p.health = Math.max(30, p.health - 20));
        this.showToast(`FREEZING WINTER! Wood shortage of ${deficit} fuel caused frostbite!`, "error");
        this.log(`FREEZING WINTER! Wood shortage of ${deficit} fuel caused frostbite and unrest!`, "log-negative");
      }
    }

    // 6. POP NOURISHMENT CONSUMPTION
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

    // 7. DEMOGRAPHIC GROWTH
    const balancedDietPops = s.pops.filter(p => p.diet === "balanced").length;
    const growthIncrement = (balancedDietPops * 0.08) * (1 - (totalPops / 15));
    s.demographicGrowthPool += growthIncrement;
    if (s.demographicGrowthPool >= 1.0) {
      s.demographicGrowthPool -= 1.0;
      const newPopId = `pop_${s.pops.length + 1}`;
      s.pops.push({
        id: newPopId,
        name: `Hearth Group ${s.pops.length + 1}`,
        blood: s.tribe.bloodline,
        faction: "Harvesters",
        locationId: s.world.startCellId,
        workplaceId: "idle",
        housing: "Destitution",
        tools: [],
        health: 100,
        diet: "balanced"
      });
      this.showToast(`New Pop Cohort! Hearth Group ${s.pops.length} is ready for assignment.`, "success");
      this.log(`Tribal Growth: A new population cohort of 100 souls matured (Unassigned).`, "log-positive");
    }

    // 8. REFRESH SPHERE POWER
    s.spheres.leadership.current = s.spheres.leadership.base + s.leader.socialSkill;
    s.spheres.development.current = s.spheres.development.base + 2;
    s.spheres.military.current = s.spheres.military.base + (s.factions[0].opinion > 50 ? 2 : 0);
    s.spheres.culture.current = s.spheres.culture.base + (s.factions[1].opinion > 50 ? 4 : 1);
    s.spheres.research.current = s.spheres.research.base + (s.factions[3].opinion > 50 ? 2 : 0);
    s.spheres.commerce.current = s.spheres.commerce.base + (s.factions[2].opinion > 50 ? 3 : 1);

    // 9. ADVANCE CALENDAR + SEASONAL/ANNUAL/DECENNIAL EVENTS
    s.turn = (s.turn + 1) % 4;
    if (s.turn === 0) {
      const prevYear = s.year;
      s.year += 1;
      if (prevYear % 10 === 0) {
        s.decade += 1;
        s.resources.materials = Math.max(0, s.resources.materials - 15);
        this.log(`DECADE ${s.decade} DAWNS: Replaced worn tools and equipment (-15 Materials).`, "log-divine");
      }
      this.resolveAnnualReckoning();
    } else {
      this.updateSeasonalWeather();
      this.log(`Season advanced to ${s.seasons[s.turn]}, Year ${s.year}.`);
      this.triggerSeasonalMinorEvent();
    }

    this.renderAll();
  },

  triggerSeasonalMinorEvent() {
    const s = this.state;
    // 25% chance of major escalation mid-year if Tension or Entropy is high
    if ((s.telemetry.tension > 65 || s.telemetry.entropy > 65) && Math.random() < 0.3) {
      this.triggerAnnualEvent();
      return;
    }

    const minorPool = [
      {
        tag: "SEASONAL EVENT • MINOR",
        title: "Riverbank Driftwood & Reeds",
        desc: "Seasonal currents washed dense tangled cedar logs and woven reeds ashore near the tribal camp.",
        choices: [
          {
            text: "Gather timber for the hearths (+18 Wood, +10 Fibers)",
            action: () => {
              s.resources.wood += 18;
              s.resources.fibers += 10;
              this.log("Seasonal Event: Salvaged +18 Wood and +10 Fibers from the riverbanks.", "log-positive");
            }
          },
          {
            text: "Carve offerings to Oshun from the driftwood (+8% Spirit Favor, +6 Water Mana)",
            action: () => {
              s.spirits[0].favor = Math.min(100, s.spirits[0].favor + 8);
              s.magic.pools.water = Math.min(50, s.magic.pools.water + 6);
              this.log("Seasonal Event: Carved river totems for Oshun (+8% Favor, +6 Water Mana).", "log-divine");
            }
          }
        ]
      },
      {
        tag: "SEASONAL EVENT • MINOR",
        title: "Flock of Migratory Waterfowl",
        desc: "Hundreds of fat silver-winged geese have settled on the marsh reeds for the season.",
        choices: [
          {
            text: "Dispatch fowlers with nets (+28 Fresh Food)",
            action: () => {
              s.resources.foodPerishable += 28;
              this.log("Seasonal Event: Fowlers netted +28 Fresh Food from migrating waterfowl.", "log-positive");
            }
          },
          {
            text: "Preserve feathers & bones for craftsmen (+12 Materials, +8 Fibers)",
            action: () => {
              s.resources.materials += 12;
              s.resources.fibers += 8;
              this.log("Seasonal Event: Craftsmen gathered +12 Materials and +8 Fibers.", "log-positive");
            }
          }
        ]
      },
      {
        tag: "SEASONAL EVENT • MINOR",
        title: "Minor Spoilage Mold Scare",
        desc: "Damp air threatens part of your unsealed food baskets near the riverbank.",
        choices: [
          {
            text: "Salvage what you can and feed the herds (-12 Fresh Food, +1 Goat Herd)",
            action: () => {
              s.resources.foodPerishable = Math.max(0, s.resources.foodPerishable - 12);
              s.herds[0].count += 1;
              this.log("Seasonal Event: Fed damp grain to the goats (-12 Fresh Food, +1 Goat).", "");
            }
          },
          {
            text: "Burn aromatic herbs to dry the granary (-6 Wood, +4 Research insight)",
            action: () => {
              s.resources.wood = Math.max(0, s.resources.wood - 6);
              s.spheres.research.current += 1;
              this.log("Seasonal Event: Smoke-dried the granary (-6 Wood, +1 Research).", "log-positive");
            }
          }
        ]
      },
      {
        tag: "SEASONAL EVENT • MINOR",
        title: "Wandering Bone-Carver Arrives",
        desc: "A solitary traveler bearing carved talismans and foreign stories seeks shelter for the season.",
        choices: [
          {
            text: "Welcome them at the fire (-10 Fresh Food, +2 Culture & +1 Research)",
            action: () => {
              s.resources.foodPerishable = Math.max(0, s.resources.foodPerishable - 10);
              s.spheres.culture.current += 2;
              s.spheres.research.current += 1;
              this.log("Seasonal Event: The wanderer shared legends (+2 Culture, +1 Research).", "log-divine");
            }
          },
          {
            text: "Trade stone flakes for their carved tools (+1 Pottery Jar, +6 Materials)",
            action: () => {
              s.resources.pottery += 1;
              s.resources.materials += 6;
              this.log("Seasonal Event: Bartered with the wanderer (+1 Pottery Jar, +6 Materials).", "log-positive");
            }
          }
        ]
      }
    ];

    const ev = minorPool[Math.floor(Math.random() * minorPool.length)];
    this.showEventModal(ev);
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
        this.showToast(`Missing required ${res} (Need ${amt})`, "warning");
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
      s.resources.pottery += 1;
      this.log(`Crafted 1 Clay Preservation Jar (use in Stockpiles & Jars to seal 10 food).`, "log-positive");
      this.recordAction("Craft Pottery Jar", "commerce", "3 Mat, 1 Wood", "100%", "Success", "+1 Clay Pottery Jar");
    } else if (craftId === "craft_hut") {
      s.locations[0].buildings[0].capacity += 1;
      this.log(`Constructed an additional insulated hut. Housing capacity increased to ${s.locations[0].buildings[0].capacity}.`, "log-positive");
      this.recordAction("Build Pop Hut", "commerce", "15 Wood, 8 Fib, 5 Hide", "100%", "Success", "+1 Housing Capacity");
    } else if (craftId === "craft_storehouse") {
      s.locations[0].buildings[1].capacity += 60;
      this.log(`Expanded Storehouse: Protected storage capacity raised to ${s.locations[0].buildings[1].capacity}.`, "log-positive");
      this.recordAction("Expand Storehouse", "commerce", "25 Wood, 12 Mat, 6 Fib", "100%", "Success", "+60 Storage Cap");
    } else {
      this.log(`Crafted ${craft.name}.`, "log-positive");
      this.recordAction(`Craft ${craft.name}`, "commerce", "Materials", "100%", "Success", craft.effect);
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
      this.showToast("No Research points remaining this season! Select a tech for Auto-Research next season.", "info");
      return;
    }

    const invested = Math.min(availableResearch, tech.cost - tech.progress);
    s.spheres.research.current -= invested;
    tech.progress += invested;

    if (tech.progress >= tech.cost) {
      tech.researched = true;
      if (s.activeTechId === techId) s.activeTechId = null;
      if (tech.id === "tech_ideograms") {
        s.commandLimit += 2;
        this.log(`TECHNOLOGY MASTERED: ${tech.name}! Command Limit increased by +2 (now ${s.commandLimit}).`, "log-divine");
        this.recordAction(`Master ${tech.name}`, "research", `${invested} Res`, "100%", "Divine", "Unlocked (+2 Command Limit)");
      } else {
        this.log(`TECHNOLOGY MASTERED: ${tech.name}! ${tech.desc}`, "log-divine");
        this.recordAction(`Master ${tech.name}`, "research", `${invested} Res`, "100%", "Divine", "Technology Mastered!");
      }
      this.showToast(`Mastered ${tech.name}!`, "divine");
    } else {
      this.log(`Invested ${invested} Research points into ${tech.name} (${tech.progress}/${tech.cost}).`);
      this.recordAction(`Research ${tech.name}`, "research", `${invested} Res`, "100%", "Success", `Progress: ${tech.progress}/${tech.cost}`);
    }

    this.renderAll();
  },

  // -------------------------------------------------------------
  // RENDERING ENGINE (MAP-FIRST + EMBEDDED SPHERE DRAWERS)
  // -------------------------------------------------------------
  renderAll() {
    this.renderTopBar();
    this.renderResourceStrip();
    this.renderSphereDock();
    this.renderActionTracker();
    this.renderChronicle();

    const claimedCount = this.state.locations.length;
    const mapCmdEl = document.getElementById("ui-map-command-limit");
    if (mapCmdEl) mapCmdEl.innerText = `Claimed: ${claimedCount} / ${this.state.commandLimit}`;

    if (MapRenderer && MapRenderer.selectedCellId !== null && this.state.world) {
      this.onMapCellSelected(MapRenderer.selectedCellId);
    }
    if (this.activeSphere) {
      this.renderActiveSphereDrawer();
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
    const d = this.calculateSeasonalDeltas();

    document.getElementById("res-food-perishable").innerText = r.foodPerishable;
    document.getElementById("res-food-preserved").innerText = r.foodPreserved;
    document.getElementById("res-water").innerText = Math.round(r.water);
    document.getElementById("res-wood").innerText = r.wood;
    document.getElementById("res-materials").innerText = r.materials;
    const fibEl = document.getElementById("res-fibers");
    if (fibEl) fibEl.innerText = r.fibers;
    document.getElementById("res-pottery").innerText = r.pottery;

    const setDelta = (id, net) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerText = `${net >= 0 ? "+" : ""}${net}/ssn`;
      el.className = `res-delta ${net > 0 ? "res-delta-pos" : net < 0 ? "res-delta-neg" : "res-delta-zero"}`;
    };

    setDelta("delta-food-perishable", d.foodPerishable.net);
    setDelta("delta-food-preserved", d.foodPreserved.net);
    setDelta("delta-water", d.water.net);
    setDelta("delta-wood", d.wood.net);
    setDelta("delta-materials", d.materials.net);
    setDelta("delta-fibers", d.fibers.net);

    // Update hover breakdown metadata dynamically
    const foodBox = document.getElementById("res-box-food");
    if (foodBox) foodBox.setAttribute("data-hover-meta", `Prod: +${d.foodPerishable.prod} • Eat: -${d.foodPerishable.cons} • Spoil: -${d.foodPerishable.spoil}`);
    const waterBox = document.getElementById("res-box-water");
    if (waterBox) waterBox.setAttribute("data-hover-meta", `Pop consumption: -${d.water.cons}/season`);
    const woodBox = document.getElementById("res-box-wood");
    if (woodBox) woodBox.setAttribute("data-hover-meta", `Prod: +${d.wood.prod} • Winter Burn: -${d.wood.cons}`);
    const matBox = document.getElementById("res-box-materials");
    if (matBox) matBox.setAttribute("data-hover-meta", `Prod: +${d.materials.prod}/season`);
    const fibBox = document.getElementById("res-box-fibers");
    if (fibBox) fibBox.setAttribute("data-hover-meta", `Prod: +${d.fibers.prod}/season`);
  },

  renderSphereDock() {
    const s = this.state;
    for (const [key, sp] of Object.entries(s.spheres)) {
      const el = document.getElementById(`dock-val-${key}`);
      if (el) el.innerText = sp.current;
    }
  },

  renderActionTracker() {
    const s = this.state;
    const currentTurn = s.year * 4 + s.turn;
    const seasonActions = s.actionHistory.filter(a => a.turnIndex === currentTurn);

    const countEl = document.getElementById("ui-action-count");
    if (countEl) countEl.innerText = seasonActions.length;

    const listEl = document.getElementById("action-tracker-list");
    if (!listEl) return;

    if (seasonActions.length === 0) {
      listEl.innerHTML = `<div style="color:var(--text-muted); font-size:11px;">No actions taken yet in ${s.seasons[s.turn]} (Year ${s.year}).</div>`;
      return;
    }

    listEl.innerHTML = seasonActions.slice(0, 5).map(a => {
      const cls = a.outcome === "Failed" ? "outcome-fail" : a.outcome === "Divine" ? "outcome-divine" : "";
      const badgeCls = a.outcome === "Failed" ? "chip-red" : a.outcome === "Divine" ? "chip-purple" : "chip-green";
      return `
        <div class="tracker-item ${cls}">
          <div style="min-width:0;">
            <div class="tracker-item-title">${a.name}</div>
            <div class="tracker-item-sub">${a.cost} • ${a.effect}</div>
          </div>
          <span class="chip ${badgeCls}">${a.outcome}</span>
        </div>
      `;
    }).join("");
  },

  renderActiveSphereDrawer() {
    const s = this.state;
    const key = this.activeSphere;
    if (!key) return;

    const meta = {
      leadership: { icon: "&#x1F451;", title: "Leadership Sphere — Sovereign & Council", factionId: null, subtabs: [
        { id: "sovereign", label: "Dynasty & Blood" },
        { id: "council", label: "All Factions" },
        { id: "planner", label: "Action Planner" },
        { id: "actions", label: "Action Log" },
        { id: "chronicle", label: "Chronicle" }
      ]},
      development: { icon: "&#x1F331;", title: "Development Sphere — Pops, Land & Herds", factionId: "fac_harvesters", subtabs: [
        { id: "pops", label: "Pops & Labor" },
        { id: "agrarian", label: "Crops & Herds" },
        { id: "territory", label: "Claimed Cells" }
      ]},
      military: { icon: "&#x2694;", title: "Military Sphere — Garrison & War", factionId: "fac_warriors", subtabs: [
        { id: "garrison", label: "Units & Tactics" }
      ]},
      culture: { icon: "&#x2728;", title: "Culture Sphere — Spirits & Magic", factionId: "fac_shamans", subtabs: [
        { id: "spirits", label: "Spirits & Taboos" },
        { id: "magic", label: "8 Manas & Spells" }
      ]},
      research: { icon: "&#x1F52C;", title: "Research Sphere — Tech & Discovery", factionId: "fac_elders", subtabs: [
        { id: "tech", label: "Technology Tree" }
      ]},
      commerce: { icon: "&#x2696;", title: "Commerce Sphere — Crafting & Stockpiles", factionId: "fac_traders", subtabs: [
        { id: "crafting", label: "Workshop Crafting" },
        { id: "stockpiles", label: "Stockpiles & Jars" }
      ]}
    }[key];

    document.getElementById("drawer-sphere-icon").innerHTML = meta.icon;
    document.getElementById("drawer-sphere-title").innerText = meta.title;
    document.getElementById("drawer-sphere-energy").innerText = `Energy: ${s.spheres[key].current} (Base ${s.spheres[key].base})`;

    // Aligned Faction Banner
    const banner = document.getElementById("drawer-faction-banner");
    if (meta.factionId) {
      const fac = s.factions.find(f => f.id === meta.factionId);
      const opColor = fac.opinion >= 60 ? "chip-green" : fac.opinion >= 40 ? "chip-gold" : "chip-red";
      banner.innerHTML = `
        <div><strong>Aligned Faction:</strong> ${fac.name} <span class="chip ${opColor}">Opinion: ${fac.opinion}%</span></div>
        <div style="color:var(--text-muted);"><strong>Demand:</strong> ${fac.activeDemand}</div>
      `;
    } else {
      banner.innerHTML = `
        <div><strong>Sovereign Authority:</strong> ${s.leader.name} • Command Limit: <strong>${s.locations.length} / ${s.commandLimit}</strong></div>
        <div style="color:var(--text-muted);">Bloodline: <strong>${s.tribe.bloodline}</strong></div>
      `;
    }

    // Subtabs bar
    const subtabsEl = document.getElementById("drawer-subtabs");
    subtabsEl.innerHTML = meta.subtabs.map(st => `
      <button class="subtab-btn ${this.activeSubtab === st.id ? 'active' : ''}" onclick="GameEngine.setSubtab('${st.id}')">
        ${st.label}
      </button>
    `).join("");

    // Render body content for active sphere + subtab
    const bodyEl = document.getElementById("drawer-body");
    bodyEl.innerHTML = this.buildSphereDrawerBody(key, this.activeSubtab);

    if (key === "leadership" && this.activeSubtab === "planner") {
      const sliderL = document.getElementById("slider-action-primary");
      const sliderS = document.getElementById("slider-action-secondary");
      if (sliderL && sliderS) {
        sliderL.addEventListener("input", () => this.updateActionProbabilityPreview());
        sliderS.addEventListener("input", () => this.updateActionProbabilityPreview());
        this.updateActionProbabilityPreview();
      }
    }
  },

  buildSphereDrawerBody(sphereKey, subtab) {
    const s = this.state;

    // 1. LEADERSHIP
    if (sphereKey === "leadership") {
      if (subtab === "sovereign") {
        return `
          <div class="grid-2">
            <div class="card">
              <div class="card-header"><span class="card-title">&#x1F451; Ruler & Dynasty</span><span class="chip chip-gold">Age ${s.leader.age}</span></div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:5px;">
                <div><strong>Leader:</strong> ${s.leader.name} (${s.leader.dynasty})</div>
                <div><strong>Successor:</strong> ${s.leader.successor}</div>
                <div><strong>Strength:</strong> <span style="color:var(--accent-green);">${s.leader.strength}</span></div>
                <div><strong>Weakness:</strong> <span style="color:var(--accent-red);">${s.leader.weakness}</span></div>
              </div>
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-primary" onclick="GameEngine.hostCouncilFeast()"
                  data-hover-tag="DECREE • LEADERSHIP" data-hover-title="Host Council Feast" data-hover-desc="Shares food across tribal hearths to unite all 5 factions and soothe internal unrest." data-hover-meta="Cost: 1 Leadership, 25 Food • +8% All Opinions, -10% Tension">&#x1F377; Host Feast (1 Lead, 25 Food)</button>
                <button class="btn" onclick="GameEngine.codifyPeaceAccord()"
                  data-hover-tag="LAW • LEADERSHIP" data-hover-title="Decree Peace Accord" data-hover-desc="Enforces binding ancestral law across factions to curb sedition." data-hover-meta="Cost: 2 Leadership • -15% Tension">&#x1F4DC; Peace Accord (2 Lead)</button>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">&#x1F9EC; Bloodline: ${s.tribe.bloodline}</span></div>
              <div style="font-size:12px; margin-bottom:6px;">
                <strong>Genetic Boons:</strong><br>
                ${s.tribe.boons.map(b => `<span class="chip chip-green" style="margin:2px 2px 0 0;">${b}</span>`).join("")}
              </div>
              <div style="font-size:12px; margin-bottom:6px;">
                <strong>Genetic Curses:</strong><br>
                ${s.tribe.curses.map(c => `<span class="chip chip-red" style="margin:2px 2px 0 0;">${c}</span>`).join("")}
              </div>
              <div style="font-size:11px; color:var(--text-muted);">Features: ${s.tribe.features.join(", ")}</div>
            </div>
          </div>
        `;
      }
      if (subtab === "council") {
        return `
          <div class="grid-2">
            ${s.factions.map(fac => `
              <div class="card">
                <div class="card-header">
                  <span class="card-title">${fac.name}</span>
                  <span class="chip ${fac.opinion >= 60 ? 'chip-green' : fac.opinion >= 40 ? 'chip-gold' : 'chip-red'}">Opinion: ${fac.opinion}%</span>
                </div>
                <div style="font-size:11px; margin-bottom:5px;">
                  <strong>Sphere:</strong> <span class="chip chip-blue" style="text-transform:capitalize;">${fac.sphere}</span>
                </div>
                <div style="font-size:11px; background:var(--bg-tertiary); padding:7px; border-radius:5px; margin-bottom:5px; border-left:2px solid var(--accent-gold);">
                  <strong>Demand:</strong> ${fac.activeDemand}
                </div>
                <div style="font-size:10px; color:var(--text-muted);"><em>${fac.penalty}</em></div>
              </div>
            `).join("")}
          </div>
        `;
      }
      if (subtab === "planner") {
        return `
          <div class="action-box">
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
              Commit Development + Leadership energy to execute tribal expeditions with continuous logistic probability modeling.
            </p>
            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
              <div style="flex:1; min-width:190px;">
                <label style="font-size:10px; text-transform:uppercase; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Action Objective</label>
                <select id="select-action-type" style="width:100%; padding:6px; background:var(--bg-card); color:#fff; border:1px solid var(--border-color); border-radius:6px;" onchange="GameEngine.updateActionProbabilityPreview()">
                  <option value="explore">Explore Outer Frontier (+Materials/Fibers)</option>
                  <option value="clear_pasture">Clear & Fence Pasture (+1 Pasture Slot, +20 Wood)</option>
                  <option value="commune_spirits">Commune with River Spirit (+Favor & Mana)</option>
                  <option value="tame_beasts">Trap Wild Horned Goats (+3 Herd)</option>
                  <option value="codify_law">Codify Tribal Peace Accord (-12% Tension)</option>
                </select>
              </div>
              <div style="flex:1; min-width:140px;">
                <label style="font-size:10px; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Development (<span id="val-action-primary">3</span>)</label>
                <div class="slider-group"><input id="slider-action-primary" type="range" min="0" max="6" value="3"></div>
              </div>
              <div style="flex:1; min-width:140px;">
                <label style="font-size:10px; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Leadership (<span id="val-action-secondary">2</span>)</label>
                <div class="slider-group"><input id="slider-action-secondary" type="range" min="0" max="4" value="2"></div>
              </div>
            </div>
            <div class="probability-meter">
              <div>
                <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Success Probability (&sigma; = 0.15)</div>
              </div>
              <div class="prob-val" id="action-prob-val">70%</div>
              <button class="btn btn-primary" onclick="GameEngine.executeAction()"
                data-hover-tag="PROJECT • CONTINUOUS MATH" data-hover-title="Execute Executive Project" data-hover-desc="Resolves the selected tribal endeavor using a sigmoid probability curve of Development + Leadership power." data-hover-meta="Uses slider-allocated Sphere energy">Execute Project</button>
            </div>
          </div>
        `;
      }
      if (subtab === "actions") {
        if (s.actionHistory.length === 0) {
          return `<div class="card"><p style="color:var(--text-muted);">No actions have been recorded yet. Scout a cell, craft an item, or execute a project to begin logging.</p></div>`;
        }
        return `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>When</th><th>Action</th><th>Sphere</th><th>Cost</th><th>Odds</th><th>Outcome</th><th>Effect</th></tr>
              </thead>
              <tbody>
                ${s.actionHistory.map(a => {
                  const badgeCls = a.outcome === "Failed" ? "chip-red" : a.outcome === "Divine" ? "chip-purple" : "chip-green";
                  return `
                    <tr>
                      <td>${a.season} Y${a.year}</td>
                      <td><strong>${a.name}</strong></td>
                      <td style="text-transform:capitalize;">${a.sphere}</td>
                      <td>${a.cost}</td>
                      <td>${a.odds}</td>
                      <td><span class="chip ${badgeCls}">${a.outcome}</span></td>
                      <td style="color:var(--text-muted);">${a.effect}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `;
      }
      if (subtab === "chronicle") {
        return `
          <div class="log-stream">
            ${s.chronicle.map(item => `
              <div class="log-entry ${item.type || ""}">
                <div class="log-timestamp">${item.season}, Year ${item.year}</div>
                <div>${item.text}</div>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    // 2. DEVELOPMENT
    if (sphereKey === "development") {
      if (subtab === "pops") {
        // Unified options from all claimed map cells + capital Crop Field / Workshop + Idle
        const startId = s.world ? s.world.startCellId : 0;
        const jobOptions = [{ val: `${startId}|idle`, label: "Unassigned (Idle)" }];
        s.locations.forEach(loc => {
          loc.sites.forEach(st => {
            jobOptions.push({ val: `${loc.cellId}|${st.id}`, label: `${loc.name} — ${st.name} (+${st.yieldAmount} ${st.yieldType})` });
          });
        });
        jobOptions.push({ val: `${startId}|crop_field`, label: "Janas Valley — Crop Field (Sorghum)" });
        jobOptions.push({ val: `${startId}|workshop`, label: "Janas Valley — Basic Workshop" });

        const workingCount = s.pops.filter(p => p.workplaceId !== "idle").length;
        const idleCount = s.pops.length - workingCount;

        return `
          <div class="grid-2" style="margin-bottom:10px;">
            <div class="card">
              <div class="card-title">&#x1F465; Population: ${s.pops.length} Cohorts (${workingCount} Working, ${idleCount} Idle)</div>
            </div>
            <div class="card">
              <div class="card-title" style="color:var(--accent-green);">&#x1F331; Growth Progress: ${Math.round(s.demographicGrowthPool * 100)}% toward next Pop</div>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>Cohort</th><th>Faction</th><th>Assigned Site / Workplace</th><th>Housing</th><th>Health</th></tr>
              </thead>
              <tbody>
                ${s.pops.map(p => {
                  const curVal = `${p.locationId}|${p.workplaceId}`;
                  return `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.faction}</td>
                    <td>
                      <select style="background:var(--bg-tertiary); color:#fff; border:1px solid var(--border-color); border-radius:4px; padding:3px 6px; font-size:11px; max-width:250px;" onchange="GameEngine.reassignPop('${p.id}', this.value)">
                        ${jobOptions.map(opt => `<option value="${opt.val}" ${curVal === opt.val ? "selected" : ""}>${opt.label}</option>`).join("")}
                      </select>
                    </td>
                    <td><span class="chip ${p.housing === 'Hut' ? 'chip-green' : 'chip-red'}">${p.housing}</span></td>
                    <td><strong style="color:${p.health >= 80 ? 'var(--accent-green)' : 'var(--accent-red)'}">${p.health}%</strong></td>
                  </tr>
                `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `;
      }
      if (subtab === "agrarian") {
        const c = s.cropField;
        const h = s.herds[0];
        return `
          <div class="grid-2">
            <div class="card">
              <div class="card-header"><span class="card-title">&#x1F33E; ${c.cropName}</span><span class="chip chip-gold">Harvest: ${s.seasons[c.harvestSeason]}</span></div>
              <div style="font-size:12px; margin-bottom:8px;">Yield: <strong>${Math.round(c.accumulatedYield)} / ${c.maxYield}</strong></div>
              <div class="gauge-bar-bg" style="height:8px; margin-bottom:8px;">
                <div class="gauge-fill" style="width:${(c.accumulatedYield / c.maxYield) * 100}%; background:var(--accent-gold);"></div>
              </div>
              <p style="font-size:11px; color:var(--text-muted);">Farmers add +${c.growthRatePerFarmer} yield/season and reap automatically in Autumn.</p>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">&#x1F410; ${h.species}</span><span class="chip chip-green">${h.count} Animals</span></div>
              <div style="font-size:12px; margin-bottom:8px;">Dairy Output: <strong>+${Math.round(h.count * 1.8)} food/season</strong></div>
              <p style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">Traits: <em>${h.traits.join(", ")}</em>. Breeds every Spring.</p>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary" onclick="GameEngine.tameWildGoats()"
                  data-hover-tag="HUSBANDRY • DEVELOPMENT" data-hover-title="Tame Wild Goats" data-hover-desc="Captures wild horned goats to expand dairy yields and spring herd reproduction." data-hover-meta="Cost: 2 Development • +3 Animals">Tame Wild (+3, 2 Dev)</button>
                <button class="btn btn-danger" onclick="GameEngine.slaughterHerd('${h.id}', 2)"
                  data-hover-tag="BUTCHERY • DEVELOPMENT" data-hover-title="Slaughter 2 Goats" data-hover-desc="Culls animals for an immediate burst of fresh meat and hides." data-hover-meta="Cost: 2 Herd • +40 Fresh Food, +8 Hides">Slaughter 2 (+40 Food)</button>
              </div>
            </div>
          </div>
        `;
      }
      if (subtab === "territory") {
        return `
          <div class="grid-2">
            ${s.locations.map(loc => `
              <div class="card">
                <div class="card-header">
                  <span class="card-title">${loc.name}</span>
                  <span class="chip chip-gold">${loc.terrain}${loc.riverBonus ? " (River 2x)" : ""}</span>
                </div>
                <div style="font-size:12px; margin-bottom:8px;">
                  Space: <strong>${loc.spaceUsed}/${loc.spaceMax}</strong> • Fertility: <strong>${loc.fertilityFieldsMax}F / ${loc.fertilityPasturesMax}P</strong>
                </div>
                <button class="btn" onclick="GameEngine.focusCellOnMap(${loc.cellId})">&#x2316; Center on Map</button>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    // 3. MILITARY
    if (sphereKey === "military") {
      return `
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button class="btn btn-primary" onclick="GameEngine.trainSpearmen()"
            data-hover-tag="RECRUITMENT • MILITARY" data-hover-title="Train River Spearmen" data-hover-desc="Equips an infantry regiment with flint spears. Spears counter enemy Swords and Cavalry." data-hover-meta="Cost: 1 Military, 10 Materials, 12 Wood">&#x2694; Train Spearmen (1 Mil, 10 Mat, 12 Wood)</button>
          <button class="btn" onclick="GameEngine.fortifyCamp()"
            data-hover-tag="DEFENSE • MILITARY" data-hover-title="Raise Timber Palisade" data-hover-desc="Fortifies Janas Valley against raids and eases tribal insecurity." data-hover-meta="Cost: 1 Military, 15 Wood • -5% Tension">&#x1F6E1; Raise Palisade (1 Mil, 15 Wood)</button>
        </div>
        <div class="table-container" style="margin-bottom:10px;">
          <table class="data-table">
            <thead><tr><th>Unit Regiment</th><th>Class</th><th>Power</th><th>Health</th><th>Loadout</th><th>Tactical Counters</th></tr></thead>
            <tbody>
              ${s.military.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.type}</td>
                  <td><strong style="color:var(--accent-red);">${u.power}</strong></td>
                  <td>${u.health}%</td>
                  <td>${u.weapon} / ${u.armor}</td>
                  <td><span class="chip chip-gold">${u.counter.join(", ")}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          <strong>Counter Triangle:</strong> Spears counter Swords & Cavalry (50% power penalty) • Swords counter Bows • Bows counter Spears.
        </div>
      `;
    }

    // 4. CULTURE
    if (sphereKey === "culture") {
      if (subtab === "spirits") {
        const sp = s.spirits[0];
        return `
          <div class="card">
            <div class="card-header">
              <div><div class="card-title">${sp.name}</div><div style="font-size:11px; color:var(--text-muted);">${sp.title}</div></div>
              <span class="chip chip-purple">${sp.favor}% Favor</span>
            </div>
            <div style="font-size:12px; margin-bottom:8px;">
              <strong>Active Boons:</strong>
              <ul style="margin-left:16px; margin-top:3px; color:var(--text-muted);">
                ${sp.boons.map(b => `<li>${b}</li>`).join("")}
              </ul>
            </div>
            <div style="font-size:11px; background:rgba(248,81,73,0.1); border-left:3px solid var(--accent-red); padding:8px; border-radius:4px; margin-bottom:10px;">
              <strong>Divine Taboo:</strong> ${sp.taboos}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <button class="btn btn-primary" onclick="GameEngine.offerFoodSacrifice()"
                data-hover-tag="WORSHIP • CULTURE" data-hover-title="Offer River Sacrifice" data-hover-desc="Appeases Oshun of the Jade Waters to gain Favor, Water Mana, Shamans support, and lower Entropy." data-hover-meta="Cost: 1 Culture, 20 Fresh Food">&#x1F525; Offer River Sacrifice (1 Culture, 20 Food)</button>
              <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;">
                <input type="checkbox" ${s.automation.autoWorshipSpirit ? "checked" : ""} onchange="GameEngine.toggleAutomation('autoWorshipSpirit')">
                Auto-Tribute each season (1 Cul + 20 Food)
              </label>
            </div>
          </div>
        `;
      }
      if (subtab === "magic") {
        return `
          <div class="grid-4">
            ${Object.entries(s.magic.pools).map(([nat, cur]) => {
              const max = s.magic.capacities[nat] || 50;
              return `
                <div class="card" style="padding:9px;">
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px;">
                    <strong style="text-transform:capitalize;">${nat}</strong>
                    <span class="chip chip-purple">${cur}/${max}</span>
                  </div>
                  <div class="gauge-bar-bg" style="height:6px;">
                    <div class="gauge-fill" style="width:${(cur / max) * 100}%; background:var(--accent-purple);"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="grid-3">
            ${s.spells.map(sp => `
              <div class="card">
                <div class="card-header"><span class="card-title">${sp.name}</span><span class="chip chip-purple">${sp.cost} ${sp.manaType}</span></div>
                <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">${sp.desc}</p>
                <button class="btn btn-primary" onclick="GameEngine.castSpell('${sp.id}')"
                  data-hover-tag="MAGIC • ${sp.manaType.toUpperCase()}" data-hover-title="Cast ${sp.name}" data-hover-desc="${sp.desc}" data-hover-meta="Cost: ${sp.cost} ${sp.manaType} mana • +6% Entropy">&#x2728; Cast Spell</button>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    // 5. RESEARCH
    if (sphereKey === "research") {
      const exploredCount = s.world ? s.world.cells.filter(c => c.explored).length : 0;
      const totalCount = s.world ? s.world.cells.length : 0;
      const activeTech = s.techTree.find(t => t.id === s.activeTechId && !t.researched);
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:var(--bg-tertiary); padding:8px 12px; border-radius:6px; flex-wrap:wrap; gap:8px;">
          <span style="font-size:12px;">
            Auto-Research Target: <strong style="color:var(--accent-blue);">${activeTech ? activeTech.name : "None Selected"}</strong> •
            World: <strong>${exploredCount}/${totalCount}</strong>
          </span>
          <button class="btn btn-primary" onclick="GameEngine.focusNearestFrontier()"
            data-hover-tag="EXPLORATION" data-hover-title="Locate Nearest Frontier" data-hover-desc="Centers the map on an uncharted region bordering your known lands." data-hover-meta="Ready to scout">&#x1F9ED; Locate Nearest Frontier</button>
        </div>
        <div class="grid-2">
          ${s.techTree.map(tech => {
            const isSelected = s.activeTechId === tech.id && !tech.researched;
            return `
            <div class="card" style="${isSelected ? 'border-color:var(--accent-blue); box-shadow:0 0 12px rgba(88,166,255,0.2);' : ''}">
              <div class="card-header">
                <span class="card-title">${tech.name}</span>
                <span class="chip ${tech.researched ? 'chip-green' : isSelected ? 'chip-blue' : 'chip-gold'}">${tech.researched ? "MASTERED" : isSelected ? `AUTO (${tech.progress}/${tech.cost})` : `${tech.progress}/${tech.cost}`}</span>
              </div>
              <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">${tech.desc}</p>
              ${
                tech.researched
                  ? `<button class="btn" disabled>Researched</button>`
                  : `<div style="display:flex; gap:6px;">
                      <button class="btn ${isSelected ? 'btn-primary' : ''}" onclick="GameEngine.selectResearchTarget('${tech.id}')"
                        data-hover-tag="AUTO-RESEARCH" data-hover-title="Set ${tech.name} as Active Research" data-hover-desc="Automatically funnels all unspent Research points into ${tech.name} every season until mastered." data-hover-meta="Progress: ${tech.progress}/${tech.cost}">${isSelected ? "&#x2714; Active Auto-Target" : "Set Auto-Research"}</button>
                     </div>`
              }
            </div>
          `;
          }).join("")}
        </div>
      `;
    }

    // 6. COMMERCE
    if (sphereKey === "commerce") {
      if (subtab === "crafting") {
        return `
          <div class="grid-3">
            ${s.crafts.map(c => {
              const costStr = Object.entries(c.cost).map(([k, v]) => `${v} ${k}`).join(", ");
              return `
                <div class="card">
                  <div class="card-header"><span class="card-title">${c.name}</span><span class="chip chip-blue">${costStr}</span></div>
                  <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">${c.effect}</p>
                  <button class="btn btn-primary" onclick="GameEngine.craftItem('${c.id}')"
                    data-hover-tag="WORKSHOP • COMMERCE" data-hover-title="Craft ${c.name}" data-hover-desc="${c.effect}" data-hover-meta="Cost: ${costStr}">Craft</button>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }
      if (subtab === "stockpiles") {
        const r = s.resources;
        return `
          <div class="card" style="margin-bottom:10px;">
            <div class="card-header"><span class="card-title">&#x1F3FA; Food Preservation</span></div>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
              Fresh Food decays by 45% each season. Seal 10 Fresh Food inside a Clay Pottery Jar so it never spoils.
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <button class="btn btn-primary" onclick="GameEngine.preserveFoodWithPottery()"
                data-hover-tag="LOGISTICS • COMMERCE" data-hover-title="Seal Food in Clay Jar" data-hover-desc="Converts perishable food into permanent rations exempt from the -45% seasonal spoilage loss." data-hover-meta="Cost: 1 Pottery Jar, 10 Fresh Food">Seal 10 Food (Costs 1 Pottery Jar)</button>
              <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;">
                <input type="checkbox" ${s.automation.autoSealFood ? "checked" : ""} onchange="GameEngine.toggleAutomation('autoSealFood')">
                Auto-Seal with spare Jars each season
              </label>
            </div>
          </div>
          <div class="grid-4">
            ${[
              ["Fresh Food", r.foodPerishable],
              ["Preserved Food", r.foodPreserved],
              ["Water", Math.round(r.water)],
              ["Wood / Fuel", r.wood],
              ["Stone & Materials", r.materials],
              ["Fibers", r.fibers],
              ["Hides", r.hides],
              ["Pottery Jars", r.pottery]
            ].map(([lbl, val]) => `
              <div class="inspector-stat">
                <div class="inspector-stat-label">${lbl}</div>
                <div class="inspector-stat-val">${val}</div>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    return "";
  },

  renderChronicle() {
    const latestEl = document.getElementById("live-chronicle-latest");
    if (latestEl && this.state.chronicle.length > 0) {
      const top = this.state.chronicle[0];
      latestEl.innerText = `[${top.season} Y${top.year}] ${top.text}`;
    }
  }
};

// Bootstrap on window load
window.addEventListener("DOMContentLoaded", () => {
  GameEngine.init();
});
