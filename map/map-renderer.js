/* ==========================================================================
   INTERACTIVE SVG MAP RENDERER (AZGAAR-STYLE VORONOI + FOG OF WAR)
   Supports pan/zoom, 4 map modes, rivers, territory borders, & cell picking.
   ========================================================================== */

const MapRenderer = {
  svg: null,
  viewport: null,
  world: null,
  mode: "biome", // "biome" | "political" | "elevation" | "climate"
  selectedCellId: null,
  hoveredCellId: null,
  revealAllDebug: false,

  // Pan & Zoom state
  transform: { x: 0, y: 0, scale: 1 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragDistance: 0,

  init(svgEl, world) {
    this.svg = svgEl;
    this.world = world;
    this.selectedCellId = world.startCellId;
    this.setupSvgStructure();
    this.bindInteractions();
    this.render();
    this.centerOnCell(world.startCellId, 1.5);
  },

  setWorld(world) {
    this.world = world;
    this.selectedCellId = world.startCellId;
    this.render();
    this.centerOnCell(world.startCellId, 1.5);
  },

  setMode(mode) {
    this.mode = mode;
    this.renderCellsOnly();
  },

  toggleFogPreview() {
    this.revealAllDebug = !this.revealAllDebug;
    this.render();
  },

  setupSvgStructure() {
    const { width, height } = this.world;
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svg.innerHTML = `
      <defs>
        <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern id="fog-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#0b0f14" />
          <circle cx="6" cy="6" r="1" fill="#1b2330" opacity="0.5" />
          <circle cx="18" cy="18" r="1.2" fill="#1b2330" opacity="0.4" />
        </pattern>
      </defs>
      <g id="map-viewport">
        <g id="layer-cells"></g>
        <g id="layer-relief"></g>
        <g id="layer-rivers"></g>
        <g id="layer-roads"></g>
        <g id="layer-borders"></g>
        <g id="layer-fog"></g>
        <g id="layer-markers"></g>
        <g id="layer-selection"></g>
      </g>
    `;
    this.viewport = this.svg.querySelector("#map-viewport");
  },

  applyTransform() {
    if (!this.viewport) return;
    const { x, y, scale } = this.transform;
    this.viewport.setAttribute("transform", `translate(${x}, ${y}) scale(${scale})`);
  },

  centerOnCell(cellId, targetScale = null) {
    const cell = this.world.cells[cellId];
    if (!cell || !this.svg) return;
    if (targetScale !== null) this.transform.scale = targetScale;

    const { width, height } = this.world;
    const s = this.transform.scale;
    this.transform.x = width / 2 - cell.x * s;
    this.transform.y = height / 2 - cell.y * s;
    this.applyTransform();
  },

  resetView() {
    this.transform = { x: 0, y: 0, scale: 1 };
    this.applyTransform();
  },

  bindInteractions() {
    if (this._bound) return;
    this._bound = true;

    const tooltip = document.getElementById("map-hover-tooltip");

    // Mouse wheel zoom centered on pointer in SVG coordinates
    this.svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const viewX = ((e.clientX - rect.left) / rect.width) * this.world.width;
      const viewY = ((e.clientY - rect.top) / rect.height) * this.world.height;

      const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
      const newScale = Math.max(0.8, Math.min(6.0, this.transform.scale * zoomFactor));
      const ratio = newScale / this.transform.scale;

      this.transform.x = viewX - (viewX - this.transform.x) * ratio;
      this.transform.y = viewY - (viewY - this.transform.y) * ratio;
      this.transform.scale = newScale;
      this.applyTransform();
    }, { passive: false });

    // Pan start
    this.svg.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragDistance = 0;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.svg.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const rect = this.svg.getBoundingClientRect();
      const dxScreen = e.clientX - this.dragStart.x;
      const dyScreen = e.clientY - this.dragStart.y;
      this.dragDistance += Math.hypot(dxScreen, dyScreen);

      // Convert screen delta to viewBox delta
      const scaleX = this.world.width / rect.width;
      const scaleY = this.world.height / rect.height;

      this.transform.x += dxScreen * scaleX;
      this.transform.y += dyScreen * scaleY;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.applyTransform();
    });

    window.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.svg.style.cursor = "grab";
      }
    });

    // Cell hover & click delegation
    this.svg.addEventListener("mousemove", (e) => {
      if (this.isDragging || !tooltip) return;
      const cellEl = e.target.closest("[data-cell-id]");
      if (!cellEl) {
        tooltip.style.display = "none";
        if (this.hoveredCellId !== null) {
          this.hoveredCellId = null;
          this.renderSelection();
        }
        return;
      }

      const cid = parseInt(cellEl.getAttribute("data-cell-id"), 10);
      const cell = this.world.cells[cid];
      if (!cell) return;

      if (this.hoveredCellId !== cid) {
        this.hoveredCellId = cid;
        this.renderSelection();
      }

      const visible = cell.explored || this.revealAllDebug;
      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;

      if (!visible) {
        tooltip.innerHTML = `<strong>Uncharted Frontier</strong><br><span style="color:#8b949e;">Send scouts to reveal this region.</span>`;
      } else {
        const ownerTag = cell.owner === "player"
          ? `<span style="color:#e3b341;font-weight:700;">Janas Territory</span>`
          : cell.owner
            ? `<span style="color:#f85149;font-weight:700;">Rival Clan Territory</span>`
            : `<span style="color:#8b949e;">Unclaimed</span>`;
        tooltip.innerHTML = `
          <strong>${cell.name}</strong><br>
          <span>${cell.biomeName} • Elev: ${cell.h} • ${cell.temp}°C</span><br>
          ${cell.hasRiver ? '<span style="color:#58a6ff;">River (2x Fertility)</span> • ' : ''}${ownerTag}
        `;
      }
    });

    this.svg.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.style.display = "none";
    });

    this.svg.addEventListener("click", (e) => {
      if (this.dragDistance > 6) return; // Ignore drags
      const cellEl = e.target.closest("[data-cell-id]");
      if (!cellEl) return;
      const cid = parseInt(cellEl.getAttribute("data-cell-id"), 10);
      this.selectCell(cid);
    });
  },

  selectCell(cellId) {
    this.selectedCellId = cellId;
    this.renderSelection();
    if (typeof GameEngine !== "undefined" && GameEngine.onMapCellSelected) {
      GameEngine.onMapCellSelected(cellId);
    }
  },

  polyToPath(poly) {
    if (!poly || poly.length < 3) return "";
    let d = `M${poly[0][0]},${poly[0][1]}`;
    for (let i = 1; i < poly.length; i++) {
      d += `L${poly[i][0]},${poly[i][1]}`;
    }
    return d + "Z";
  },

  getCellFill(cell) {
    if (this.mode === "biome") {
      if (!cell.isLand) {
        // Subtle ocean depth shading
        const depth = Math.max(0, 20 - cell.h);
        const r = Math.max(18, 44 - depth);
        const g = Math.max(38, 78 - depth * 1.4);
        const b = Math.max(68, 124 - depth * 1.8);
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      }
      return cell.color;
    }

    if (this.mode === "elevation") {
      if (!cell.isLand) return "#1e3a5f";
      const t = (cell.h - 20) / 80;
      const r = Math.round(50 + t * 185);
      const g = Math.round(135 + (t < 0.5 ? t * 140 : (1 - t) * 140));
      const b = Math.round(65 + (t > 0.7 ? (t - 0.7) * 500 : 0));
      return `rgb(${r}, ${g}, ${b})`;
    }

    if (this.mode === "climate") {
      if (!cell.isLand) return "#223c5c";
      // Blue (cold) -> Green (temperate) -> Orange/Red (hot)
      const normT = Math.max(0, Math.min(1, (cell.temp + 10) / 45));
      const r = Math.round(40 + normT * 200);
      const g = Math.round(140 - Math.abs(normT - 0.5) * 140);
      const b = Math.round(220 - normT * 180);
      return `rgb(${r}, ${g}, ${b})`;
    }

    if (this.mode === "political") {
      if (!cell.isLand) return "#1b2e47";
      if (cell.owner === "player") return "#8a681e";
      if (cell.owner === "rival_1") return "#7a2828";
      if (cell.owner === "rival_2") return "#254e7a";
      if (cell.owner === "rival_3") return "#78531b";
      return "#28303b";
    }

    return cell.color;
  },

  render() {
    if (!this.world || !this.svg) return;
    this.renderCellsOnly();
    this.renderReliefAndRivers();
    this.renderRoadsAndBorders();
    this.renderFog();
    this.renderMarkers();
    this.renderSelection();
  },

  renderCellsOnly() {
    const layer = this.svg.querySelector("#layer-cells");
    if (!layer) return;
    const html = [];
    const cells = this.world.cells;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const d = this.polyToPath(c.poly);
      const fill = this.getCellFill(c);
      const stroke = c.isLand ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.03)";
      html.push(`<path data-cell-id="${c.id}" d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`);
    }
    layer.innerHTML = html.join("");
  },

  renderReliefAndRivers() {
    const reliefLayer = this.svg.querySelector("#layer-relief");
    const riverLayer = this.svg.querySelector("#layer-rivers");
    const cells = this.world.cells;

    // Mountain peak triangles on high cells
    const reliefHtml = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!c.isLand) continue;
      if (c.h >= 70) {
        const s = 6 + (c.h - 70) * 0.14;
        reliefHtml.push(
          `<polygon points="${c.x},${c.y - s} ${c.x - s * 0.8},${c.y + s * 0.6} ${c.x + s * 0.8},${c.y + s * 0.6}" fill="rgba(255,255,255,0.28)" stroke="rgba(20,20,20,0.45)" stroke-width="0.6" pointer-events="none"/>`
        );
      }
    }
    reliefLayer.innerHTML = reliefHtml.join("");

    // Smooth curved rivers
    const riverHtml = [];
    for (const r of this.world.rivers) {
      if (r.points.length < 2) continue;
      let path = `M${r.points[0][0]},${r.points[0][1]}`;
      for (let i = 1; i < r.points.length - 1; i++) {
        const xc = (r.points[i][0] + r.points[i + 1][0]) / 2;
        const yc = (r.points[i][1] + r.points[i + 1][1]) / 2;
        path += ` Q${r.points[i][0]},${r.points[i][1]} ${xc},${yc}`;
      }
      const last = r.points[r.points.length - 1];
      path += ` L${last[0]},${last[1]}`;
      const width = Math.min(3.4, 1.1 + r.flux / 350);
      riverHtml.push(`<path d="${path}" fill="none" stroke="#53a4f5" stroke-width="${width}" stroke-linecap="round" opacity="0.88" pointer-events="none"/>`);
    }
    riverLayer.innerHTML = riverHtml.join("");
  },

  renderRoadsAndBorders() {
    const roadLayer = this.svg.querySelector("#layer-roads");
    const borderLayer = this.svg.querySelector("#layer-borders");
    const cells = this.world.cells;

    // Dirt roads between connected player cells with roads
    const roadHtml = [];
    const seenPairs = new Set();
    for (const c of cells) {
      if (!c.hasRoad) continue;
      for (const nid of c.neighbors) {
        const nc = cells[nid];
        if (!nc.hasRoad) continue;
        const key = c.id < nid ? `${c.id}_${nid}` : `${nid}_${c.id}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        roadHtml.push(`<line x1="${c.x}" y1="${c.y}" x2="${nc.x}" y2="${nc.y}" stroke="#d29922" stroke-width="2" stroke-dasharray="4,3" pointer-events="none"/>`);
      }
    }
    roadLayer.innerHTML = roadHtml.join("");

    // Territory outlines
    const borderHtml = [];
    for (const c of cells) {
      if (!c.owner) continue;
      if (!c.explored && !this.revealAllDebug) continue;
      const d = this.polyToPath(c.poly);
      if (c.owner === "player") {
        borderHtml.push(`<path d="${d}" fill="rgba(227,179,65,0.16)" stroke="#e3b341" stroke-width="2.2" pointer-events="none"/>`);
      } else {
        const rival = this.world.rivals.find(r => r.id === c.owner);
        const col = rival ? rival.color : "#f85149";
        borderHtml.push(`<path d="${d}" fill="${col}33" stroke="${col}" stroke-width="1.8" pointer-events="none"/>`);
      }
    }
    borderLayer.innerHTML = borderHtml.join("");
  },

  renderFog() {
    const fogLayer = this.svg.querySelector("#layer-fog");
    if (this.revealAllDebug) {
      fogLayer.innerHTML = "";
      return;
    }

    const cells = this.world.cells;
    const html = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.explored) continue;

      // Check if adjacent to an explored cell (frontier mist vs deep shadow)
      const isFrontier = c.neighbors.some(nid => cells[nid].explored);
      const d = this.polyToPath(c.poly);
      if (isFrontier) {
        html.push(`<path data-cell-id="${c.id}" d="${d}" fill="#0c1016" fill-opacity="0.78" stroke="rgba(139,148,158,0.18)" stroke-width="0.6"/>`);
      } else {
        html.push(`<path data-cell-id="${c.id}" d="${d}" fill="url(#fog-pattern)" fill-opacity="0.96" stroke="rgba(255,255,255,0.03)" stroke-width="0.4"/>`);
      }
    }
    fogLayer.innerHTML = html.join("");
  },

  renderMarkers() {
    const markerLayer = this.svg.querySelector("#layer-markers");
    const cells = this.world.cells;
    const html = [];

    for (const c of cells) {
      if (!c.explored && !this.revealAllDebug) continue;

      if (c.id === this.world.startCellId) {
        // Capital Crown / Star Marker
        html.push(`
          <g transform="translate(${c.x},${c.y})" pointer-events="none" filter="url(#glow-gold)">
            <circle r="7.5" fill="#161b22" stroke="#e3b341" stroke-width="2"/>
            <text y="3.5" text-anchor="middle" font-size="10" fill="#e3b341" font-weight="bold">★</text>
          </g>
        `);
      } else if (c.owner === "player") {
        // Claimed Outpost Marker
        html.push(`
          <g transform="translate(${c.x},${c.y})" pointer-events="none">
            <circle r="5" fill="#161b22" stroke="#e3b341" stroke-width="1.6"/>
            <circle r="2" fill="#e3b341"/>
          </g>
        `);
      } else if (c.owner) {
        // Rival Tribe Marker
        const rival = this.world.rivals.find(r => r.id === c.owner);
        const col = rival ? rival.color : "#f85149";
        html.push(`
          <g transform="translate(${c.x},${c.y})" pointer-events="none">
            <polygon points="0,-6 5.5,0 0,6 -5.5,0" fill="#161b22" stroke="${col}" stroke-width="1.8"/>
            <circle r="1.8" fill="${col}"/>
          </g>
        `);
      }

      if (c.anomaly) {
        // Ancient Anomaly / Shrine Marker
        html.push(`
          <g transform="translate(${c.x},${c.y - 7})" pointer-events="none">
            <polygon points="0,-5 4.5,0 0,5 -4.5,0" fill="#bc8cff" stroke="#fff" stroke-width="0.8"/>
          </g>
        `);
      }
    }
    markerLayer.innerHTML = html.join("");
  },

  renderSelection() {
    const selLayer = this.svg.querySelector("#layer-selection");
    if (!selLayer) return;
    const html = [];

    if (this.hoveredCellId !== null && this.hoveredCellId !== this.selectedCellId) {
      const hc = this.world.cells[this.hoveredCellId];
      if (hc) {
        html.push(`<path d="${this.polyToPath(hc.poly)}" fill="rgba(255,255,255,0.08)" stroke="#fff" stroke-width="1.2" stroke-dasharray="3,2" pointer-events="none"/>`);
      }
    }

    if (this.selectedCellId !== null) {
      const sc = this.world.cells[this.selectedCellId];
      if (sc) {
        html.push(`<path d="${this.polyToPath(sc.poly)}" fill="rgba(227,179,65,0.12)" stroke="#ffffff" stroke-width="2.4" pointer-events="none"/>`);
      }
    }

    selLayer.innerHTML = html.join("");
  }
};
