/* ==========================================================================
   WORLD GENERATOR (AZGAAR FMG PHYSICAL SIMULATION + CIV GAME BIOME LOOT)
   Generates Voronoi topology, heightmaps, climate, rivers, biomes, & sites.
   ========================================================================== */

const WorldGenerator = {
  SEA_LEVEL: 20,
  MOUNTAIN_LEVEL: 70,

  // Biomes matching Azgaar's BiomesGenerator + Civ Game terrains
  BIOMES: [
    { id: 0,  name: "Marine",                     color: "#2a4d7a", habitability: 0,   fields: 0, pastures: 0 },
    { id: 1,  name: "Hot Desert",                 color: "#e6cf85", habitability: 4,   fields: 1, pastures: 0 },
    { id: 2,  name: "Cold Desert",                color: "#a8aa7c", habitability: 10,  fields: 2, pastures: 1 },
    { id: 3,  name: "Savanna",                    color: "#c5c372", habitability: 22,  fields: 4, pastures: 2 },
    { id: 4,  name: "Grasslands",                 color: "#8ab868", habitability: 35,  fields: 8, pastures: 5 },
    { id: 5,  name: "Tropical Seasonal Jungle",   color: "#9bbf52", habitability: 50,  fields: 3, pastures: 1 },
    { id: 6,  name: "Temperate Deciduous Forest", color: "#3d9e54", habitability: 100, fields: 6, pastures: 3 },
    { id: 7,  name: "Tropical Jungle",            color: "#579c35", habitability: 80,  fields: 3, pastures: 1 },
    { id: 8,  name: "Temperate Rainforest",       color: "#367d46", habitability: 90,  fields: 4, pastures: 2 },
    { id: 9,  name: "Taiga",                      color: "#3f5d32", habitability: 15,  fields: 2, pastures: 1 },
    { id: 10, name: "Tundra",                     color: "#856e4d", habitability: 5,   fields: 1, pastures: 0 },
    { id: 11, name: "Glacier",                    color: "#c8dde3", habitability: 0,   fields: 0, pastures: 0 },
    { id: 12, name: "Wetlands",                   color: "#227a4d", habitability: 14,  fields: 6, pastures: 3 },
    { id: 13, name: "Mountains",                  color: "#6e655f", habitability: 8,   fields: 2, pastures: 1 }
  ],

  // Azgaar's exact Biome Matrix: rows = moisture [0..4], cols = temperature [hot..cold, 0..25]
  BIOMES_MATRIX: [
    [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10],
    [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 9, 9, 9, 10, 10, 10],
    [5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 10, 10, 10],
    [5, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10],
    [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 10, 10]
  ],

  // Deterministic PRNG (Mulberry32 seeded from string)
  createRng(seedStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6d2b79f5;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // Generate procedural geographic name
  generatePlaceName(rng, biomeId) {
    const prefixes = ["Ash", "Jan", "Khar", "Osh", "Vael", "Sol", "Zul", "Thar", "Kor", "Bel", "Munt", "Nok", "Eldr", "Drak", "Syr"];
    const roots = ["an", "esh", "or", "ul", "as", "ar", "in", "oth", "ak", "un", "al", "ia"];
    const suffixesByBiome = {
      0: ["Sea", "Shallows", "Deep", "Bay"],
      1: ["Dunes", "Wastes", "Sands", "Expanse"],
      2: ["Barrens", "Steppe", "Flats"],
      3: ["Veldt", "Savanna", "Plains"],
      4: ["Meadows", "Valley", "Downs", "Reach"],
      5: ["Thicket", "Canopy", "Wilds"],
      6: ["Woods", "Glade", "Grove", "Weald"],
      7: ["Jungle", "Tangle", "Heart"],
      8: ["Mistwood", "Fernvale", "Hollow"],
      9: ["Taiga", "Pines", "Timberland"],
      10: ["Tundra", "Frost", "Moor"],
      11: ["Glacier", "Icewall", "Rime"],
      12: ["Marsh", "Fen", "Mire", "Bog"],
      13: ["Peaks", "Crags", "Ridge", "Spire"]
    };
    const p = prefixes[Math.floor(rng() * prefixes.length)];
    const r = roots[Math.floor(rng() * roots.length)];
    const sufList = suffixesByBiome[biomeId] || ["Lands"];
    const s = sufList[Math.floor(rng() * sufList.length)];
    return `${p}${r} ${s}`;
  },

  /**
   * Main World Generation Entry Point
   */
  generate(seed = "Janas-Dawn", preset = "continents", width = 1200, height = 760, spacing = 34) {
    const rng = this.createRng(String(seed));
    const jitter = 0.85;

    // 1. Place jittered lattice points + boundary pseudo-points
    const cellsX = Math.floor(width / spacing);
    const cellsY = Math.floor(height / spacing);
    const dx = width / cellsX;
    const dy = height / cellsY;

    const points = [];
    for (let row = 0; row < cellsY; row++) {
      for (let col = 0; col < cellsX; col++) {
        const jx = (rng() - 0.5) * dx * jitter;
        const jy = (rng() - 0.5) * dy * jitter;
        const x = Math.max(2, Math.min(width - 2, (col + 0.5) * dx + jx));
        const y = Math.max(2, Math.min(height - 2, (row + 0.5) * dy + jy));
        points.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
      }
    }

    // Perimeter pseudo-points outside map to cleanly clip edge Voronoi cells
    const boundary = [];
    for (let x = -spacing; x <= width + spacing; x += spacing) {
      boundary.push([x, -spacing]);
      boundary.push([x, height + spacing]);
    }
    for (let y = 0; y <= height; y += spacing) {
      boundary.push([-spacing, y]);
      boundary.push([width + spacing, y]);
    }

    // 2. Compute Voronoi Tessellation
    const voronoi = VoronoiEngine.compute(points, boundary, width, height);
    const n = points.length;
    const cells = voronoi.cells;

    // Helper: find cell slot closest to (x, y)
    const findCellAt = (x, y) => {
      const col = Math.max(0, Math.min(cellsX - 1, Math.floor(x / dx)));
      const row = Math.max(0, Math.min(cellsY - 1, Math.floor(y / dy)));
      return row * cellsX + col;
    };

    // 3. Heightmap Generation (Azgaar Blob & Ridge Propagation)
    const heights = new Float32Array(n);
    const blobPower = 0.915; // Tuned for ~850-1000 cells

    const addHill = (minH, maxH, xMin, xMax, yMin, yMax) => {
      const h = minH + rng() * (maxH - minH);
      const sx = (xMin + rng() * (xMax - xMin)) * width;
      const sy = (yMin + rng() * (yMax - yMin)) * height;
      const start = findCellAt(sx, sy);

      const change = new Float32Array(n);
      change[start] = h;
      const queue = [start];
      while (queue.length) {
        const q = queue.shift();
        const neighbors = cells.c[q];
        for (let i = 0; i < neighbors.length; i++) {
          const c = neighbors[i];
          if (change[c] > 0) continue;
          const decayed = Math.pow(change[q], blobPower) * (rng() * 0.18 + 0.9);
          if (decayed > 1.2) {
            change[c] = decayed;
            queue.push(c);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        heights[i] = Math.min(100, heights[i] + change[i]);
      }
    };

    const addPit = (minH, maxH, xMin, xMax, yMin, yMax) => {
      const h = minH + rng() * (maxH - minH);
      const sx = (xMin + rng() * (xMax - xMin)) * width;
      const sy = (yMin + rng() * (yMax - yMin)) * height;
      const start = findCellAt(sx, sy);

      const used = new Uint8Array(n);
      used[start] = 1;
      heights[start] = Math.max(0, heights[start] - h);
      let curH = h;
      const queue = [start];
      while (queue.length && curH > 1.5) {
        const q = queue.shift();
        curH = Math.pow(curH, blobPower * 0.97) * (rng() * 0.15 + 0.88);
        const neighbors = cells.c[q];
        for (let i = 0; i < neighbors.length; i++) {
          const c = neighbors[i];
          if (used[c]) continue;
          used[c] = 1;
          heights[c] = Math.max(0, heights[c] - curH);
          queue.push(c);
        }
      }
    };

    const addRange = (minH, maxH, x1, y1, x2, y2) => {
      const h = minH + rng() * (maxH - minH);
      let curr = findCellAt(x1 * width, y1 * height);
      const target = findCellAt(x2 * width, y2 * height);
      const [tx, ty] = points[target];
      const ridge = [curr];
      const visited = new Set([curr]);

      for (let step = 0; step < 60 && curr !== target; step++) {
        const neighbors = cells.c[curr];
        let best = -1;
        let bestScore = Infinity;
        for (let i = 0; i < neighbors.length; i++) {
          const nid = neighbors[i];
          if (visited.has(nid)) continue;
          const dist = Math.hypot(points[nid][0] - tx, points[nid][1] - ty) * (0.75 + rng() * 0.5);
          if (dist < bestScore) {
            bestScore = dist;
            best = nid;
          }
        }
        if (best === -1) break;
        visited.add(best);
        ridge.push(best);
        curr = best;
      }

      const queue = [];
      const ridgeChange = new Float32Array(n);
      for (const r of ridge) {
        ridgeChange[r] = h * (0.8 + rng() * 0.4);
        queue.push(r);
      }
      while (queue.length) {
        const q = queue.shift();
        const neighbors = cells.c[q];
        for (let i = 0; i < neighbors.length; i++) {
          const c = neighbors[i];
          if (ridgeChange[c] > 0) continue;
          const val = ridgeChange[q] * (0.55 + rng() * 0.25);
          if (val > 4) {
            ridgeChange[c] = val;
            queue.push(c);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        heights[i] = Math.min(100, heights[i] + ridgeChange[i]);
      }
    };

    // Apply heightmap template preset
    if (preset === "continents") {
      addHill(35, 55, 0.20, 0.45, 0.25, 0.70);
      addHill(35, 55, 0.55, 0.80, 0.25, 0.70);
      for (let i = 0; i < 6; i++) addHill(20, 38, 0.15, 0.85, 0.15, 0.85);
      addRange(35, 55, 0.22 + rng() * 0.15, 0.25, 0.40 + rng() * 0.15, 0.75);
      addRange(30, 50, 0.60, 0.30, 0.78, 0.68);
      addPit(20, 35, 0.42, 0.58, 0.30, 0.70);
    } else if (preset === "archipelago") {
      for (let i = 0; i < 16; i++) addHill(24, 48, 0.12, 0.88, 0.12, 0.88);
      for (let i = 0; i < 5; i++) addPit(18, 30, 0.20, 0.80, 0.20, 0.80);
    } else if (preset === "highlands") {
      addHill(40, 60, 0.25, 0.75, 0.20, 0.80);
      addHill(30, 50, 0.20, 0.80, 0.20, 0.80);
      addRange(45, 65, 0.15, 0.20, 0.85, 0.75);
      addRange(40, 60, 0.20, 0.80, 0.75, 0.25);
    } else { // river_basin (default lush valley)
      addHill(38, 52, 0.30, 0.70, 0.25, 0.75);
      for (let i = 0; i < 7; i++) addHill(22, 36, 0.20, 0.80, 0.20, 0.80);
      addRange(42, 62, 0.18, 0.18, 0.82, 0.22); // Northern mountain wall feeding rivers
      addRange(35, 50, 0.15, 0.30, 0.25, 0.80); // Western highland ridge
    }

    // Force map edges to be deep ocean so continents sit naturally inside viewport
    for (let i = 0; i < n; i++) {
      const [px, py] = points[i];
      const edgeDist = Math.min(px / width, (width - px) / width, py / height, (height - py) / height);
      if (edgeDist < 0.08) {
        heights[i] *= edgeDist / 0.08;
      }
      if (cells.b[i]) heights[i] = Math.min(heights[i], 8);
    }

    // Gentle smoothing pass
    const smoothedH = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const neigh = cells.c[i];
      let sum = heights[i] * 2;
      for (let j = 0; j < neigh.length; j++) sum += heights[neigh[j]];
      smoothedH[i] = Math.min(100, Math.round(sum / (2 + neigh.length)));
    }

    // 4. Temperature Simulation (Azgaar latitude gradient + realistic altitude drop)
    const temps = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const yNorm = points[i][1] / height; // 0 (North/Cold) -> 0.5 (Temperate) -> 1.0 (Equatorial/Warm)
      const latTemp = 1 + yNorm * 27; // +1°C in far north to +28°C in south
      const altDrop = smoothedH[i] >= this.SEA_LEVEL ? Math.pow(smoothedH[i] - 18, 1.8) * 0.0065 : 0;
      temps[i] = Math.max(-20, Math.min(38, Math.round(latTemp - altDrop)));
    }

    // 5. Precipitation & Rain-Shadow Simulation (Azgaar Westerly + Southerly winds)
    const prec = new Uint8Array(n);
    // Westerly wind pass (column by column left -> right)
    for (let row = 0; row < cellsY; row++) {
      let humidity = 68;
      for (let col = 0; col < cellsX; col++) {
        const cid = row * cellsX + col;
        if (cid >= n) continue;
        if (smoothedH[cid] < this.SEA_LEVEL) {
          humidity = Math.min(98, humidity + 10);
          prec[cid] = Math.min(100, prec[cid] + 28);
        } else {
          const drop = Math.max(3, humidity * 0.14 + (smoothedH[cid] > 60 ? 10 : 0));
          prec[cid] = Math.min(100, Math.round(prec[cid] + drop));
          humidity = Math.max(12, humidity - drop * 0.45);
        }
      }
    }
    // Southerly humid wind pass
    for (let col = 0; col < cellsX; col++) {
      let humidity = 55;
      for (let row = cellsY - 1; row >= 0; row--) {
        const cid = row * cellsX + col;
        if (cid >= n) continue;
        if (smoothedH[cid] < this.SEA_LEVEL) {
          humidity = Math.min(95, humidity + 8);
        } else {
          const drop = Math.max(2, humidity * 0.12);
          prec[cid] = Math.min(100, Math.round(prec[cid] + drop));
          humidity = Math.max(10, humidity - drop * 0.45);
        }
      }
    }

    // 6. River Generation (Depression filling + Downhill flux accumulation)
    const drainH = Float32Array.from(smoothedH);
    // Resolve local depressions on land so rivers always reach sea
    for (let iter = 0; iter < 15; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (drainH[i] < this.SEA_LEVEL) continue;
        let minN = Infinity;
        for (const nid of cells.c[i]) {
          if (drainH[nid] < minN) minN = drainH[nid];
        }
        if (drainH[i] <= minN) {
          drainH[i] = minN + 0.5;
          changed = true;
        }
      }
      if (!changed) break;
    }

    // Sort land cells from highest to lowest
    const landCells = [];
    for (let i = 0; i < n; i++) {
      if (smoothedH[i] >= this.SEA_LEVEL) landCells.push(i);
    }
    landCells.sort((a, b) => drainH[b] - drainH[a]);

    const flux = new Float32Array(n);
    const downCell = new Int32Array(n).fill(-1);
    for (const i of landCells) {
      flux[i] += prec[i] * 0.5;
      let bestN = -1;
      let bestH = drainH[i];
      for (const nid of cells.c[i]) {
        if (drainH[nid] < bestH) {
          bestH = drainH[nid];
          bestN = nid;
        }
      }
      if (bestN !== -1) {
        downCell[i] = bestN;
        flux[bestN] += flux[i];
      }
    }

    // Extract river networks from cells with high flux
    const MIN_RIVER_FLUX = 185;
    const hasRiver = new Uint8Array(n);
    const rivers = [];
    const visitedRiverStart = new Uint8Array(n);

    // Start rivers at sources that exceed threshold
    const highFluxCells = landCells.filter(i => flux[i] >= MIN_RIVER_FLUX).sort((a, b) => flux[b] - flux[a]);
    for (const head of highFluxCells) {
      if (visitedRiverStart[head]) continue;
      // Walk upstream slightly to find tributary start, or trace downstream
      const path = [];
      let cur = head;
      let safety = 0;
      while (cur !== -1 && safety < 100) {
        safety++;
        path.push(cur);
        hasRiver[cur] = 1;
        visitedRiverStart[cur] = 1;
        if (smoothedH[cur] < this.SEA_LEVEL) break;
        const nxt = downCell[cur];
        if (nxt === -1 || path.includes(nxt)) break;
        cur = nxt;
      }
      if (path.length >= 3) {
        rivers.push({
          id: rivers.length + 1,
          cells: path,
          points: path.map(cid => points[cid]),
          flux: Math.round(flux[head])
        });
      }
    }

    // 7. Classify Biomes & Roll Civ Game Cell Data
    const cellData = new Array(n);
    for (let i = 0; i < n; i++) {
      const h = smoothedH[i];
      const t = temps[i];
      const p = prec[i];
      let biomeId = 0;

      if (h < this.SEA_LEVEL) {
        biomeId = 0; // Marine
      } else if (h >= this.MOUNTAIN_LEVEL) {
        biomeId = 13; // Mountains
      } else if (t < -5) {
        biomeId = 11; // Glacier
      } else {
        // Check wetland condition (low flat land + high flux/moisture)
        const isWetland = (p > 55 && h < 26 && t > 2) || (hasRiver[i] && h < 25 && rng() < 0.35);
        if (isWetland) {
          biomeId = 12;
        } else {
          // Azgaar Biomes Matrix lookup
          const moistureBand = Math.min(4, Math.floor(p / 20));
          const tempBand = Math.max(0, Math.min(25, Math.floor(20 - t)));
          biomeId = this.BIOMES_MATRIX[moistureBand][tempBand];
        }
      }

      const biome = this.BIOMES[biomeId];
      const riverFlag = hasRiver[i] === 1;
      const fertilityMult = riverFlag ? 2 : 1; // Civ Game rule: Rivers double fertility!

      cellData[i] = {
        id: i,
        name: this.generatePlaceName(rng, biomeId),
        x: points[i][0],
        y: points[i][1],
        poly: cells.poly[i],
        neighbors: cells.c[i],
        isBorder: cells.b[i] === 1,
        h: h,
        temp: t,
        prec: p,
        biomeId: biomeId,
        biomeName: biome.name,
        color: biome.color,
        isLand: h >= this.SEA_LEVEL,
        hasRiver: riverFlag,
        // Civ Game Gameplay Attributes
        spaceMax: 50,
        spaceUsed: 0,
        fieldsMax: biome.fields * fertilityMult,
        pasturesMax: biome.pastures * fertilityMult,
        explored: false,
        owner: null, // null = unclaimed, "player" = Janas Clan, "rival_X" = Rival Tribe
        hasRoad: false,
        anomaly: null,
        sites: [],
        buildings: [],
        lootRolled: false
      };
    }

    // 8. Pick Optimal Starting Capital Cell for Janas Clan (Grasslands/Forest with River!)
    let bestStart = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < n; i++) {
      const c = cellData[i];
      if (!c.isLand || c.isBorder || c.h >= this.MOUNTAIN_LEVEL || c.biomeId === 11 || c.biomeId === 10) continue;
      // Prefer central map region with river and fertile biome
      const centerDist = Math.hypot(c.x - width * 0.5, c.y - height * 0.5);
      let score = 100 - centerDist * 0.15;
      if (c.biomeId === 4 || c.biomeId === 6) score += 80; // Grasslands or Deciduous Forest
      else if (c.biomeId === 8 || c.biomeId === 3 || c.biomeId === 5) score += 45;
      else if (c.biomeId === 1 || c.biomeId === 2) score -= 80; // Avoid deserts
      if (c.hasRiver) score += 60;
      if (c.temp >= 10 && c.temp <= 24) score += 30;
      if (c.h >= 22 && c.h <= 48) score += 20;
      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
    if (bestStart === -1) bestStart = Math.floor(n / 2);

    // Generate Civ Game loot sites for starting cell & reveal immediate neighborhood
    this.rollCellSites(cellData[bestStart], rng, true);
    cellData[bestStart].explored = true;
    cellData[bestStart].owner = "player";
    cellData[bestStart].name = "Janas Valley (Capital)";

    // Reveal ring-1 neighbors around starting cell so player sees immediate frontier
    for (const nid of cellData[bestStart].neighbors) {
      cellData[nid].explored = true;
      if (cellData[nid].isLand) {
        this.rollCellSites(cellData[nid], rng, false);
      }
    }

    // 9. Seed Mythic Anomalies & Rival Tribes in Distant Land Cells
    const distantLand = cellData.filter(c => {
      if (!c.isLand || c.id === bestStart || cellData[bestStart].neighbors.includes(c.id)) return false;
      return Math.hypot(c.x - cellData[bestStart].x, c.y - cellData[bestStart].y) > spacing * 4.5;
    });

    // Place 3 Rival Tribes
    const rivalDefs = [
      { id: "rival_1", name: "Kharak Iron-Bloods", color: "#f85149", attitude: "Hostile" },
      { id: "rival_2", name: "Vaelor Tide-Speakers", color: "#58a6ff", attitude: "Neutral" },
      { id: "rival_3", name: "Solarian Sun-Chosen", color: "#d29922", attitude: "Cautious" }
    ];
    const rivals = [];
    for (const rDef of rivalDefs) {
      if (distantLand.length === 0) break;
      const idx = Math.floor(rng() * distantLand.length);
      const cell = distantLand.splice(idx, 1)[0];
      cell.owner = rDef.id;
      this.rollCellSites(cell, rng, false);
      rivals.push({ ...rDef, cellId: cell.id });
    }

    // Place 5 Ancient Anomalies / Spirit Shrines across unexplored frontier
    const anomalyPool = [
      "Obsidian Monolith of Forgotten Stars",
      "Fountain of Shimmering Aqua Vitalis",
      "Sunken Temple of the Ember Spirit",
      "Crater of Raw Arcana Crystal",
      "Petrified Titan Ribcage"
    ];
    for (let i = 0; i < anomalyPool.length && distantLand.length > 0; i++) {
      const idx = Math.floor(rng() * distantLand.length);
      const cell = distantLand.splice(idx, 1)[0];
      cell.anomaly = anomalyPool[i];
    }

    return {
      seed,
      preset,
      width,
      height,
      spacing,
      cells: cellData,
      rivers,
      startCellId: bestStart,
      rivals
    };
  },

  /**
   * Implements Civ Game.md Location Loot Table (Minerals, Trees, Water, Animals, Liquids, Anomalies)
   */
  rollCellSites(cell, rng = Math.random, isCapital = false) {
    if (cell.lootRolled || !cell.isLand) return;
    cell.lootRolled = true;

    if (isCapital) {
      cell.sites = [
        { id: `site_${cell.id}_fish`, name: "River Fishery", type: "Food", extractionCap: 80, yieldType: "foodPerishable", yieldAmount: 35, assignedPops: 2 },
        { id: `site_${cell.id}_wood`, name: "Hardwood Grove", type: "Trees", extractionCap: 60, yieldType: "wood", yieldAmount: 25, assignedPops: 1 },
        { id: `site_${cell.id}_clay`, name: "River Clay Bank", type: "Stones", extractionCap: 40, yieldType: "materials", yieldAmount: 18, assignedPops: 1 }
      ];
      cell.buildings = [
        { id: "bld_huts", name: "Wattle Huts (Tier 1)", type: "Housing", capacity: 6, effect: "Basic shelter against winter freezing." },
        { id: "bld_storehouse", name: "Thatch Storehouse", type: "Storage", capacity: 80, effect: "Shields 80 units of resources from annual decay." },
        { id: "bld_workshop", name: "Basic Workshop", type: "Crafting", assignedPops: 1, effect: "Generates craft progress for tools/arms." }
      ];
      cell.spaceUsed = 18;
      return;
    }

    // Roll 2 to 4 natural sites based on biome
    const siteCount = 2 + Math.floor(rng() * 3);
    const b = cell.biomeId;

    const addSite = (name, type, yieldType, yieldAmount, cap) => {
      cell.sites.push({
        id: `site_${cell.id}_${cell.sites.length}`,
        name,
        type,
        yieldType,
        yieldAmount,
        extractionCap: cap,
        assignedPops: 0
      });
      cell.spaceUsed += 4;
    };

    if (cell.hasRiver) {
      addSite("Freshwater Fishery", "Water", "foodPerishable", 30, 70);
    }

    for (let s = 0; s < siteCount; s++) {
      const r = rng() * 100;
      if (b === 13 || b === 2 || b === 1) {
        // Mountains / Deserts: high Minerals, Stones, Crystals
        if (r < 40) addSite(r < 15 ? "Copper Vein" : r < 30 ? "Iron Ore Seam" : "Gold Deposit", "Minerals", "materials", 22, 50);
        else if (r < 75) addSite(r < 55 ? "Granite Quarry" : "Salt Pan", "Stones", "materials", 20, 45);
        else if (r < 92) addSite("Crude Oil Seep", "Liquids", "wood", 25, 50);
        else addSite("Arcana Crystal Cavern", "Gems", "mana", 10, 30);
      } else if (b === 6 || b === 7 || b === 8 || b === 9) {
        // Forests / Taiga / Jungle: Trees, Herbs, Animals
        if (r < 45) addSite(b === 7 ? "Blackwood Canopy" : "Hardwood Stand", "Trees", "wood", 28, 70);
        else if (r < 70) addSite("Wild Game Grounds", "Animals", "foodPerishable", 26, 55);
        else if (r < 90) addSite("Medicinal Herb Patch", "Herbs", "fibers", 20, 40);
        else addSite("Lifewood Sacred Grove", "Trees", "mana", 8, 25);
      } else {
        // Grasslands / Savanna / Wetlands / Tundra
        if (r < 35) addSite("Wild Fiber Reeds", "Crops", "fibers", 24, 55);
        else if (r < 70) addSite("Grazing Herd Territory", "Animals", "foodPerishable", 28, 60);
        else if (r < 90) addSite("Surface Clay & Stone", "Stones", "materials", 18, 45);
        else addSite("Aqua Vitalis Spring", "Liquids", "foodPreserved", 15, 30);
      }
    }
  }
};
