/* ==========================================================================
   VORONOI & DELAUNAY TESSELLATION ENGINE
   Adapted from Azgaar's Fantasy Map Generator architecture (MIT License).
   Uses X-sorted Bowyer-Watson Delaunay triangulation + dual Voronoi polygons.
   ========================================================================== */

const VoronoiEngine = {
  /**
   * Computes circumcenter and squared radius for triangle (a, b, c).
   */
  circumcircle(ax, ay, bx, by, cx, cy) {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-10) {
      // Degenerate collinear fallback
      const mcx = (ax + bx + cx) / 3;
      const mcy = (ay + by + cy) / 3;
      return { cx: mcx, cy: mcy, r2: 1e12, maxX: mcx + 1e6 };
    }
    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    const dx = ux - ax;
    const dy = uy - ay;
    const r2 = dx * dx + dy * dy;
    return { cx: ux, cy: uy, r2, maxX: ux + Math.sqrt(r2) };
  },

  /**
   * Generates a complete Voronoi graph from inner points + boundary pseudo-points.
   * Returns { points, cells: { v, c, b, poly }, vertices }
   */
  compute(innerPoints, boundaryPoints, width, height) {
    const innerCount = innerPoints.length;
    const allPoints = innerPoints.concat(boundaryPoints);
    const totalCount = allPoints.length;

    // Super-triangle indices at the end of coordinate lookup
    const s0 = totalCount;
    const s1 = totalCount + 1;
    const s2 = totalCount + 2;
    const coords = allPoints.slice();
    coords.push([-width * 2, -height * 2]);
    coords.push([width * 4, -height * 2]);
    coords.push([width * 0.5, height * 5]);

    const makeTri = (a, b, c) => {
      const cc = this.circumcircle(
        coords[a][0], coords[a][1],
        coords[b][0], coords[b][1],
        coords[c][0], coords[c][1]
      );
      return { a, b, c, cx: cc.cx, cy: cc.cy, r2: cc.r2, maxX: cc.maxX };
    };

    // Sort point indices by X coordinate for O(N^1.5) sweep pruning
    const sortedIds = new Array(totalCount);
    for (let i = 0; i < totalCount; i++) sortedIds[i] = i;
    sortedIds.sort((i, j) => coords[i][0] - coords[j][0] || coords[i][1] - coords[j][1]);

    let active = [makeTri(s0, s1, s2)];
    const completed = [];

    for (let idx = 0; idx < totalCount; idx++) {
      const pId = sortedIds[idx];
      const px = coords[pId][0];
      const py = coords[pId][1];

      const bad = [];
      const nextActive = [];

      for (let tIdx = 0; tIdx < active.length; tIdx++) {
        const t = active[tIdx];
        if (t.maxX < px) {
          completed.push(t);
        } else {
          const dx = px - t.cx;
          const dy = py - t.cy;
          if (dx * dx + dy * dy <= t.r2 + 1e-9) {
            bad.push(t);
          } else {
            nextActive.push(t);
          }
        }
      }

      // Extract boundary edges of polygonal hole (edges appearing exactly once)
      const edgeMap = new Map();
      const addEdge = (u, v) => {
        const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        if (edgeMap.has(key)) {
          edgeMap.delete(key); // Shared interior edge
        } else {
          edgeMap.set(key, [u, v]);
        }
      };

      for (let bIdx = 0; bIdx < bad.length; bIdx++) {
        const t = bad[bIdx];
        addEdge(t.a, t.b);
        addEdge(t.b, t.c);
        addEdge(t.c, t.a);
      }

      for (const edge of edgeMap.values()) {
        nextActive.push(makeTri(edge[0], edge[1], pId));
      }

      active = nextActive;
    }

    const allTris = completed.concat(active).filter(
      t => t.a < totalCount && t.b < totalCount && t.c < totalCount
    );

    // Map each inner point to its incident triangles
    const pointTris = Array.from({ length: innerCount }, () => []);
    for (let tIdx = 0; tIdx < allTris.length; tIdx++) {
      const t = allTris[tIdx];
      if (t.a < innerCount) pointTris[t.a].push(tIdx);
      if (t.b < innerCount) pointTris[t.b].push(tIdx);
      if (t.c < innerCount) pointTris[t.c].push(tIdx);
    }

    // Construct Voronoi cells (sorted polygon vertices and neighbor lists)
    const cells = {
      v: new Array(innerCount),      // polygon vertex indices (into allTris)
      poly: new Array(innerCount),   // polygon [[x, y], ...] clamped to map bounds
      c: new Array(innerCount),      // adjacent valid inner cell IDs
      b: new Uint8Array(innerCount)  // 1 if touches boundary pseudo-points
    };

    for (let p = 0; p < innerCount; p++) {
      const px = coords[p][0];
      const py = coords[p][1];
      const tris = pointTris[p];

      // Sort incident triangles counter-clockwise around point p
      tris.sort((t1, t2) => {
        const a1 = Math.atan2(allTris[t1].cy - py, allTris[t1].cx - px);
        const a2 = Math.atan2(allTris[t2].cy - py, allTris[t2].cx - px);
        return a1 - a2;
      });

      const poly = [];
      const neighbors = new Set();
      let isBorder = 0;

      for (let i = 0; i < tris.length; i++) {
        const t = allTris[tris[i]];
        const vx = Math.max(0, Math.min(width, Math.round(t.cx * 10) / 10));
        const vy = Math.max(0, Math.min(height, Math.round(t.cy * 10) / 10));
        poly.push([vx, vy]);

        const verts = [t.a, t.b, t.c];
        for (let k = 0; k < 3; k++) {
          const nid = verts[k];
          if (nid === p) continue;
          if (nid < innerCount) {
            neighbors.add(nid);
          } else {
            isBorder = 1;
          }
        }
      }

      cells.v[p] = tris;
      cells.poly[p] = poly;
      cells.c[p] = Array.from(neighbors);
      cells.b[p] = isBorder;
    }

    return {
      points: innerPoints,
      vertices: allTris.map(t => [t.cx, t.cy]),
      cells
    };
  }
};
