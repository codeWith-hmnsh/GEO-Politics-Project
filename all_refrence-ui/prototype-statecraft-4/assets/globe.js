/* Statecraft prototype globe: satellite earth, clouds and atmosphere (the 1.0 look), with game layers:
   animated flows, sanction arcs, project pins, influence glows, and HTML labels projected from 3D.
   Needs THREE (UMD) loaded first. Exposes window.SCGlobe. */
(function () {
  const DEG = Math.PI / 180;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PLACES = {
    IND: [28.6, 77.2], CHN: [39.9, 116.4], USA: [38.9, -77.0], RUS: [55.75, 37.6], SAU: [24.7, 46.7], JPN: [35.7, 139.7],
  };
  const REGION_POINTS = {
    EUR: [[51, 10], [46.5, 2.5], [52, 19.5], [42.5, 12.5], [40.2, -3.7], [60, 15], [53, -2]],
    SEA: [[-2, 117], [14, 101], [12.5, 122], [16, 107.5], [4, 102], [20, 96]],
    SAS: [[30, 70], [23.7, 90.4], [7.9, 80.7], [28.2, 84], [34.5, 66]],
    MENA: [[27, 30], [24, 54], [33, 44], [32, 53], [28, 3], [39, 35], [26, 17]],
    SSA: [[9, 8], [0, 37.5], [9, 39], [-29, 24], [-12, 18], [-3, 23], [12, -2], [-6, 35]],
    LATAM: [[-10, -52], [23, -102], [-34, -64], [4, -73], [-10, -75], [-33, -71], [7, -66]],
    CAS: [[48, 67], [41, 64], [46.5, 103], [39, 59.5], [41.5, 74.5]],
    OCE: [[-25, 134], [-41, 174], [-31, 117], [-20, 145], [-6, 144]],
  };
  const GOOD_COLOR = { energy: 0xe8a21c, food: 0x5e9e3a, tech: 0x4c74d9 };

  function ll2v(lat, lon, r) {
    const phi = (90 - lat) * DEG;
    const th = (lon + 180) * DEG;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }

  function radialTexture(hex, inner = 0.55) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const col = new THREE.Color(hex);
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, `rgba(${rgb},${inner})`);
    grd.addColorStop(0.55, `rgba(${rgb},${inner * 0.55})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  class SCGlobe {
    constructor(el, opts = {}) {
      this.el = el;
      this.opts = Object.assign({ texture: "tex/earth.jpg", clouds: "tex/clouds.jpg", distance: 3.4, idle: true, fov: 32, fit: false }, opts);
      this.zoom = 1; // camera distance multiplier from fit()
      this.tweens = [];
      this.frameFns = [];
      this.labels = [];
      this.idle = this.opts.idle && !reduce;
      this.ok = false;
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (e) {
        el.classList.add("globe-fallback");
        return;
      }
      this.ok = true;
      const r = this.renderer;
      r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
      r.outputEncoding = THREE.sRGBEncoding;
      el.appendChild(r.domElement);
      r.domElement.style.display = "block";
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(this.opts.fov, 1, 0.1, 100);
      this.camera.position.set(0, 0, this.opts.distance);
      this.world = new THREE.Group();
      this.world.rotation.order = "XYZ";
      this.scene.add(this.world);

      const loader = new THREE.TextureLoader();
      const map = loader.load(this.opts.texture, () => this.el.classList.add("globe-ready"));
      map.encoding = THREE.sRGBEncoding;
      map.anisotropy = 8;
      this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.MeshPhongMaterial({ map, shininess: 9, specular: new THREE.Color(0x1d2a33) }));
      this.world.add(this.earth);

      if (this.opts.clouds) {
        const cm = loader.load(this.opts.clouds);
        this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 72, 72), new THREE.MeshLambertMaterial({ color: 0xffffff, alphaMap: cm, transparent: true, opacity: 0.5, depthWrite: false }));
        this.world.add(this.clouds);
      }

      // atmosphere: soft light-blue rim like the 1.0 globe
      const atm = new THREE.ShaderMaterial({
        uniforms: { c: { value: new THREE.Color(0x9cc8ff) } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(c, 1.0) * i; }",
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 64), atm));

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.78));
      const sun = new THREE.DirectionalLight(0xffffff, 0.62);
      sun.position.set(-2.5, 2, 3);
      this.scene.add(sun);

      this.overlay = new THREE.Group();
      this.world.add(this.overlay);
      // influence map: soft colour painted on an equirectangular canvas, wrapped just above the surface
      this.tintCanvas = document.createElement("canvas");
      this.tintCanvas.width = 1024;
      this.tintCanvas.height = 512;
      this.tintTex = new THREE.CanvasTexture(this.tintCanvas);
      this.tintTex.encoding = THREE.sRGBEncoding;
      this.tintMesh = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 96), new THREE.MeshBasicMaterial({ map: this.tintTex, transparent: true, opacity: 0.62, depthWrite: false }));
      this.world.add(this.tintMesh);
      this.tints = {};

      this.setView(20, 60, 0);
      this.resize();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(el);
      this.visible = true;
      this.io = new IntersectionObserver((e) => (this.visible = e[0].isIntersecting));
      this.io.observe(el);
      this.last = performance.now();
      const loop = (t) => {
        this.raf = requestAnimationFrame(loop);
        if (!this.visible) return;
        const dt = Math.min(64, t - this.last);
        this.last = t;
        this.tick(t, dt);
      };
      this.raf = requestAnimationFrame(loop);
    }

    resize() {
      const w = this.el.clientWidth || 1;
      const h = this.el.clientHeight || 1;
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = w + "px";
      this.renderer.domElement.style.height = h + "px";
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      if (this.opts.fit) {
        // keep the whole sphere (with its glow) inside a narrow or portrait box
        const vfov = (this.opts.fov * Math.PI) / 180;
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
        const need = 1.2 / Math.sin(Math.min(vfov, hfov) / 2);
        const z0 = this.camera.position.z / this.zoom;
        this.zoom = Math.max(1, need / this.opts.distance);
        this.camera.position.z = z0 * this.zoom;
      }
    }

    rotFor(lat, lon) {
      const p = ll2v(lat, lon, 1);
      return { y: Math.atan2(-p.x, p.z), x: lat * DEG };
    }

    setView(lat, lon, tilt) {
      const r = this.rotFor(lat, lon);
      this.world.rotation.y = r.y;
      this.world.rotation.x = r.x + (tilt || 0);
    }

    /** Turn the globe so lat/lon faces the viewer. */
    flyTo(lat, lon, { duration = 1400, distance } = {}) {
      if (!this.ok) return Promise.resolve();
      const target = this.rotFor(lat, lon);
      const y0 = this.world.rotation.y;
      let dy = target.y - y0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const x0 = this.world.rotation.x;
      const d0 = this.camera.position.z;
      const d1 = distance !== undefined ? distance * this.zoom : d0;
      const dur = reduce ? 1 : duration;
      return this.tween(dur, (k) => {
        const e = ease(k);
        this.world.rotation.y = y0 + dy * e;
        this.world.rotation.x = x0 + (target.x - x0) * e;
        this.camera.position.z = d0 + (d1 - d0) * e;
      });
    }

    tween(duration, fn) {
      return new Promise((res) => this.tweens.push({ t0: performance.now(), duration: Math.max(1, duration), fn, res }));
    }

    tick(t, dt) {
      if (this.idle && !this.tweens.length) this.world.rotation.y += dt * 0.000035;
      if (this.clouds) this.clouds.rotation.y += dt * 0.000012;
      this.tweens = this.tweens.filter((tw) => {
        const k = Math.min(1, (t - tw.t0) / tw.duration);
        tw.fn(k);
        if (k >= 1) {
          tw.res();
          return false;
        }
        return true;
      });
      for (const f of this.frameFns) f(t);
      this.renderer.render(this.scene, this.camera);
      this.placeLabels();
    }

    /** Screen position of a lat/lon and whether it faces the viewer. */
    project(lat, lon, r = 1.01) {
      const v = ll2v(lat, lon, r).applyMatrix4(this.world.matrixWorld);
      const facing = v.clone().normalize().dot(this.camera.position.clone().sub(v).normalize()) > 0.12;
      v.project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * this.el.clientWidth, y: (-v.y * 0.5 + 0.5) * this.el.clientHeight, facing };
    }

    /** An HTML element pinned to a place. */
    label(el, lat, lon) {
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.willChange = "transform,opacity";
      this.el.appendChild(el);
      const item = { el, lat, lon };
      this.labels.push(item);
      return { remove: () => { el.remove(); this.labels = this.labels.filter((x) => x !== item); } };
    }

    placeLabels() {
      for (const l of this.labels) {
        const p = this.project(l.lat, l.lon);
        l.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
        l.el.style.opacity = p.facing ? "1" : "0";
        l.el.style.pointerEvents = p.facing ? "" : "none";
      }
    }

    /** An animated arc between two places. kind: flow | sanction | treaty. */
    arc(from, to, { color = 0xe8a21c, kind = "flow", width = 0.006, duration = 1100, lift = 0.28 } = {}) {
      if (!this.ok) return { remove() {} };
      const a = ll2v(from[0], from[1], 1.004);
      const b = ll2v(to[0], to[1], 1.004);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dist = a.distanceTo(b);
      mid.normalize().multiplyScalar(1 + lift * dist);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const geo = new THREE.TubeGeometry(curve, 96, width * (kind === "sanction" ? 0.8 : 1), 8, false);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: kind === "sanction" ? 0.9 : 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      const total = geo.index.count;
      geo.setDrawRange(0, 0);
      this.overlay.add(mesh);
      const dur = reduce ? 1 : duration;
      this.tween(dur, (k) => geo.setDrawRange(0, Math.floor(total * ease(k) / 6) * 6));
      // a travelling bead for flows
      let bead = null;
      if (kind === "flow" || kind === "treaty") {
        bead = new THREE.Mesh(new THREE.SphereGeometry(width * 2.4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        this.overlay.add(bead);
        const f = (t) => {
          const k = ((t / 1600) % 1);
          bead.position.copy(curve.getPoint(k));
        };
        this.frameFns.push(f);
        bead.userData.f = f;
      }
      return {
        remove: () => {
          this.overlay.remove(mesh);
          geo.dispose();
          mat.dispose();
          if (bead) {
            this.overlay.remove(bead);
            this.frameFns = this.frameFns.filter((x) => x !== bead.userData.f);
          }
        },
      };
    }

    flow(fromIso, toIso, good = "energy", opts = {}) {
      return this.arc(PLACES[fromIso], PLACES[toIso], Object.assign({ color: GOOD_COLOR[good] || 0xe8a21c, kind: "flow" }, opts));
    }

    sanction(fromIso, toIso) {
      return this.arc(PLACES[fromIso], PLACES[toIso], { color: 0xe5484d, kind: "sanction", lift: 0.4, width: 0.005 });
    }

    /** A pulsing pin (projects, events). */
    pin(lat, lon, { color = 0xf2b33d, size = 0.07 } = {}) {
      if (!this.ok) return { remove() {} };
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(color, 0.95), transparent: true, depthWrite: false }));
      sp.position.copy(ll2v(lat, lon, 1.012));
      sp.scale.setScalar(size);
      this.overlay.add(sp);
      const t0 = performance.now();
      const f = (t) => {
        const k = ((t - t0) / 1400) % 1;
        sp.scale.setScalar(size * (1 + (reduce ? 0 : k * 1.4)));
        sp.material.opacity = reduce ? 0.9 : 1 - k * 0.8;
      };
      this.frameFns.push(f);
      return { remove: () => { this.overlay.remove(sp); this.frameFns = this.frameFns.filter((x) => x !== f); } };
    }

    /** Influence tint for a partner region: the seat colour spreads out from the region's centre. */
    tint(regionId, color, strength = 0.6, { spread = true } = {}) {
      if (!this.ok) return;
      const t = (this.tints[regionId] = { color: new THREE.Color(color), strength, k: spread && !reduce ? 0 : 1 });
      if (t.k < 1) this.tween(900, (k) => { t.k = ease(k); this.paintTints(); });
      else this.paintTints();
    }

    untint(regionId) {
      if (!this.ok) return;
      if (regionId) delete this.tints[regionId];
      else this.tints = {};
      this.paintTints();
    }

    paintTints() {
      const c = this.tintCanvas;
      const g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      for (const [id, t] of Object.entries(this.tints)) {
        const pts = REGION_POINTS[id] || [];
        const rgb = `${Math.round(t.color.r * 255)},${Math.round(t.color.g * 255)},${Math.round(t.color.b * 255)}`;
        const a = 0.35 + 0.55 * t.strength;
        pts.forEach(([lat, lon], i) => {
          const x = ((lon + 180) / 360) * c.width;
          const y = ((90 - lat) / 180) * c.height;
          const kk = Math.max(0, Math.min(1, t.k * 1.4 - i * 0.06));
          const r = (26 + 22 * t.strength) * kk * (1 / Math.max(0.45, Math.cos((lat * Math.PI) / 180)));
          if (r < 1) return;
          for (const dx of [0, -c.width, c.width]) {
            const grd = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
            grd.addColorStop(0, `rgba(${rgb},${a})`);
            grd.addColorStop(0.6, `rgba(${rgb},${a * 0.7})`);
            grd.addColorStop(1, `rgba(${rgb},0)`);
            g.fillStyle = grd;
            g.beginPath();
            g.ellipse(x + dx, y, r, r * Math.max(0.45, Math.cos((lat * Math.PI) / 180)), 0, 0, Math.PI * 2);
            g.fill();
          }
        });
      }
      this.tintTex.needsUpdate = true;
    }

    clear() {
      for (const c of [...this.overlay.children]) this.overlay.remove(c);
      this.frameFns = [];
    }
  }

  SCGlobe.PLACES = PLACES;
  SCGlobe.REGION_POINTS = REGION_POINTS;
  window.SCGlobe = SCGlobe;
})();
