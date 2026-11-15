import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { WALLS, CURVE, COLUMN, ROOMS, TOUR, CEIL, DOOR_H, SILL, HEAD } from './plan.js';

// World units = feet.
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const EYE = 5.4, PR = 1.1;
const $ = s => document.querySelector(s);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // soft PCF removed in r18x
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
$('#app').appendChild(renderer.domElement);
const labelR = new CSS2DRenderer();
labelR.setSize(innerWidth, innerHeight);
labelR.domElement.className = 'labels';
$('#app').appendChild(labelR.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.2, 3000);
camera.rotation.order = 'YXZ';
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
manager.onProgress = (u, a, b) => { $('#loadbar i').style.width = (100 * a / b) + '%'; };
manager.onLoad = () => { $('#welcome').classList.add('ready'); };

// ---------- materials ----------
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe4e0dc, roughness: 0.9 }),
  ext: new THREE.MeshStandardMaterial({ color: 0xe8e2da, roughness: 0.95 }),
  ceil: new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfdcff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 }),
  alu: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.8 }),
  door: new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.35 }),
  gloss: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xeeeae4, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 0.7 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.8, flatShading: true }),
  pot: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }),
  troffer: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e8, emissiveIntensity: 1 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff1a0a, emissiveIntensity: 4, toneMapped: false }),
  candle: new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.6 }),
  flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.4, 0.4), toneMapped: false }),
  geode: new THREE.MeshStandardMaterial({ color: 0x4a1b5e, roughness: 0.25, metalness: 0.4, emissive: 0x3a0a55, emissiveIntensity: 0.6, flatShading: true }),
  deck: new THREE.MeshStandardMaterial({ color: 0x8c7a66, roughness: 0.9 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x5f6b55, roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 1 }),
};

const world = new THREE.Group(); scene.add(world);
const ceilingGroup = new THREE.Group(); world.add(ceilingGroup);
const colliders = []; // {a:[x,z], b:[x,z], r}
const boxes = [];     // [x1,z1,x2,z2]
const clickables = [];

function mesh(geo, mat, x, y, z, { cast = true, recv = true, parent = world } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
}
function box(w, h, d, mat, x, y, z, o) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, o); }
function solid(x1, z1, x2, z2) { boxes.push([Math.min(x1, x2), Math.min(z1, z2), Math.max(x1, x2), Math.max(z1, z2)]); }

// ---------- walls ----------
function wallPiece(ax, az, dx, dz, s, e, y0, y1, t, mat, collide) {
  const len = e - s; if (len <= 0.01 || y1 - y0 <= 0.01) return;
  const cx = ax + dx * (s + e) / 2, cz = az + dz * (s + e) / 2;
  const m = mesh(new THREE.BoxGeometry(len, y1 - y0, t), mat, cx, (y0 + y1) / 2, cz);
  m.rotation.y = -Math.atan2(dz, dx);
  if (collide) colliders.push({ a: [ax + dx * s, az + dz * s], b: [ax + dx * e, az + dz * e], r: t / 2 });
  return m;
}
function glassPane(ax, az, dx, dz, s, e, y0, y1) {
  const len = e - s, cx = ax + dx * (s + e) / 2, cz = az + dz * (s + e) / 2;
  const g = mesh(new THREE.BoxGeometry(len, y1 - y0, 0.06), M.glass, cx, (y0 + y1) / 2, cz, { cast: false, recv: false });
  g.rotation.y = -Math.atan2(dz, dx); g.renderOrder = 2;
  // mullions
  const n = Math.max(1, Math.round(len / 4));
  for (let i = 0; i <= n; i++) {
    const p = s + len * i / n; const mm = mesh(new THREE.BoxGeometry(0.12, y1 - y0, 0.18), M.alu, ax + dx * p, (y0 + y1) / 2, az + dz * p);
    mm.rotation.y = g.rotation.y;
  }
  return g;
}
function doorLeaf(ax, az, dx, dz, s, w, swing = 1, ang = 1.35, mat = M.door) {
  const hx = ax + dx * s, hz = az + dz * s; const piv = new THREE.Group(); piv.position.set(hx, 0, hz);
  piv.rotation.y = -Math.atan2(dz, dx) + swing * ang; world.add(piv);
  const d = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, DOOR_H - 0.05, 0.15), mat); d.position.set((w - 0.1) / 2, DOOR_H / 2, 0);
  d.castShadow = d.receiveShadow = true; piv.add(d);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.alu); k.position.set(w - 0.5, 3.4, 0.15); piv.add(k);
}
function buildWall([x1, z1, x2, z2, t, ops], exterior) {
  const L = Math.hypot(x2 - x1, z2 - z1), dx = (x2 - x1) / L, dz = (z2 - z1) / L;
  const mat = exterior ? M.ext : M.wall; let cur = 0;
  const sorted = [...ops].sort((a, b) => a[0] - b[0]);
  for (const [s, e, type] of sorted) {
    wallPiece(x1, z1, dx, dz, cur, s, 0, CEIL, t, mat, true);
    if (type === 'door' || type === 'double' || type === 'glassdoor') {
      wallPiece(x1, z1, dx, dz, s, e, DOOR_H, CEIL, t, mat, false);
      if (type === 'door') doorLeaf(x1, z1, dx, dz, s, e - s, 1);
      if (type === 'double') { doorLeaf(x1, z1, dx, dz, s, (e - s) / 2, -1); doorLeaf(x1, z1, dx, dz, e, -(e - s) / 2, 1, -1.35); }
      if (type === 'glassdoor') doorLeaf(x1, z1, dx, dz, s, e - s, 1, 1.1, M.glass);
    } else if (type === 'window') {
      wallPiece(x1, z1, dx, dz, s, e, 0, SILL, t, mat, true);
      wallPiece(x1, z1, dx, dz, s, e, HEAD, CEIL, t, mat, false);
      glassPane(x1, z1, dx, dz, s, e, SILL, HEAD);
    } else if (type === 'glass') {
      glassPane(x1, z1, dx, dz, s, e, 0, CEIL);
      colliders.push({ a: [x1 + dx * s, z1 + dz * s], b: [x1 + dx * e, z1 + dz * e], r: 0.2 });
    } else if (type === 'open') {
      wallPiece(x1, z1, dx, dz, s, e, 8.2, CEIL, t, mat, false);
    }
    cur = e;
  }
  wallPiece(x1, z1, dx, dz, cur, L, 0, CEIL, t, mat, true);
}
WALLS.forEach((w, i) => buildWall(w, i < 6));
// curved corridor wall
{
  const { a, b, bulge, seg, thick, opening } = CURVE;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; const nx = -uz, nz = ux;
  const P = t => [a[0] + ux * L * t + nx * bulge * 4 * t * (1 - t), a[1] + uz * L * t + nz * bulge * 4 * t * (1 - t)];
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg; const p0 = P(t0), p1 = P(t1);
    const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); const dx = (p1[0] - p0[0]) / l, dz = (p1[1] - p0[1]) / l;
    const open = !!opening && (t0 + t1) / 2 > opening[0] && (t0 + t1) / 2 < opening[1];
    wallPiece(p0[0], p0[1], dx, dz, -0.05, l + 0.05, open ? DOOR_H + 0.6 : 0, CEIL, thick, M.wall, !open);
    if (!open && i % 3 === 1) { // red LED cove strip along the curve
      const s = mesh(new THREE.BoxGeometry(l + 0.1, 0.12, 0.1), M.red, (p0[0] + p1[0]) / 2 - 0.3, 0.4, (p0[1] + p1[1]) / 2, { cast: false });
      s.rotation.y = -Math.atan2(dz, dx);
    }
  }
}
// column with red light rings
{
  const [x, z, s] = COLUMN; box(s, CEIL, s, M.white, x, 0, z); solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2);
  for (const y of [0.3, 8.6]) { const r = mesh(new THREE.TorusGeometry(1.35, 0.06, 8, 48), M.red, x, y, z, { cast: false }); r.rotation.x = Math.PI / 2; }
}

// ---------- floors / ceilings ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t;
}
const carpetTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } });
carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping; carpetTex.repeat.set(8, 8);
for (const [ri, r] of ROOMS.entries()) {
  const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0];
  const fm = r.outdoor ? M.deck : new THREE.MeshStandardMaterial({ color: new THREE.Color(r.floor).multiplyScalar(r.color ? .8 : .62), roughness: r.id === 'fire' ? 0.95 : 0.55, map: carpetTex });
  const f = mesh(new THREE.PlaneGeometry(w, d), fm, r.x[0] + w / 2, 0.004 + ri * 0.003, r.z[0] + d / 2, { cast: false });
  f.rotation.x = -Math.PI / 2;
  if (!r.outdoor) { const c = mesh(new THREE.PlaneGeometry(w, d), M.ceil, r.x[0] + w / 2, CEIL, r.z[0] + d / 2, { parent: ceilingGroup }); c.rotation.x = Math.PI / 2; }
}
// troffer panels (neutral rooms) — 2x4 ft
for (const r of ROOMS) {
  if (r.outdoor || r.color || r.id === 'closet') continue;
  const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0]; const nx = Math.max(1, Math.round(w / 9)), nz = Math.max(1, Math.round(d / 9));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const p = mesh(new THREE.PlaneGeometry(2, 4), M.troffer, r.x[0] + w * (i + .5) / nx, CEIL - 0.03, r.z[0] + d * (j + .5) / nz, { cast: false, parent: ceilingGroup });
    p.rotation.x = Math.PI / 2;
  }
}
// slab + exterior hallway + site
box(58, 1, 51, M.ext, 28, -1, 24.65, { cast: false });
{ const h = mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshStandardMaterial({ color: 0xbdb6ac, roughness: .9 }), 8, 0.004, 52.3); h.rotation.x = -Math.PI / 2; }
buildWall([-2, 55.3, 18, 55.3, 0.5, []], true); buildWall([18, 49.3, 18, 55.3, 0.5, []], true); buildWall([-2, 49.3, -2, 55.3, 0.5, []], true);
box(20, 0.2, 6, M.ceil, 8, CEIL - 0.2, 52.3, { parent: ceilingGroup });
{ // suite sign at the entry
  const t = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff2a1a'; g.font = 'bold 64px Helvetica,Arial'; g.textAlign = 'center'; g.fillText('ULTRARED', w / 2, 72); g.fillStyle = '#fff'; g.font = '34px Helvetica,Arial'; g.fillText('LIGHT THERAPY · SUITE 220', w / 2, 128); });
  const s = mesh(new THREE.PlaneGeometry(4.8, 1.5), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9 }), 13, 6, 49.75, { cast: false });
}
{ const g = mesh(new THREE.PlaneGeometry(1400, 1400), M.ground, 28, -14, 24.6, { cast: false }); g.rotation.x = -Math.PI / 2;
  const a = mesh(new THREE.PlaneGeometry(90, 50), M.asphalt, 28, -13.9, 95, { cast: false }); a.rotation.x = -Math.PI / 2;
  box(60, 13, 53, M.ext, 28, -14, 24.6, { cast: false });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5a4632 });
  for (let i = 0; i < 16; i++) { const ang = i / 16 * Math.PI * 2 + .2, R = 85 + (i % 3) * 25; const x = 28 + Math.cos(ang) * R * 1.2, z = 24.6 + Math.sin(ang) * R;
    box(1, 10, 1, trunk, x, -14, z, { cast: false }); mesh(new THREE.IcosahedronGeometry(6 + (i % 4), 0), M.leaf, x, 2, z, { cast: false }); }
  // distant hills
  for (let i = 0; i < 14; i++) { const ang = i / 14 * Math.PI * 2; const h = mesh(new THREE.ConeGeometry(120, 60 + (i % 3) * 30, 5), new THREE.MeshStandardMaterial({ color: 0x8a7d6c, roughness: 1, flatShading: true }), 31 + Math.cos(ang) * 700, 10, 21 + Math.sin(ang) * 700, { cast: false }); }
}
// sky dome
const skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 p; void main(){ p=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float h=clamp(p.y*1.6+.15,0.,1.); gl_FragColor=vec4(mix(bot,top,h),1.); }' }));
scene.add(sky);

// ---------- furniture ----------
function plant(x, z, s = 1) { mesh(new THREE.CylinderGeometry(0.8 * s, 0.6 * s, 1.6 * s, 16), M.pot, x, 0.8 * s, z); mesh(new THREE.IcosahedronGeometry(1.4 * s, 1), M.leaf, x, 2.8 * s, z); mesh(new THREE.IcosahedronGeometry(1.0 * s, 1), M.leaf, x + .4 * s, 3.9 * s, z - .2); solid(x - s, z - s, x + s, z + s); }
function sofa(x, z, w, rot = 0, mat = M.fabric) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  const add = (gw, gh, gd, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); };
  add(w, 1.4, 3, 0, 0.7, 0); add(w, 1.6, 0.7, 0, 2.0, -1.15); add(0.6, 2.1, 3, -w / 2 + .3, 1.05, 0); add(0.6, 2.1, 3, w / 2 - .3, 1.05, 0);
  const c = Math.cos(rot), s = Math.sin(rot); const hw = Math.abs(c) * w / 2 + Math.abs(s) * 1.5, hd = Math.abs(s) * w / 2 + Math.abs(c) * 1.5; solid(x - hw, z - hd, x + hw, z + hd);
}
function table(x, z, w, d, h = 2.5, top = M.white) { box(w, 0.15, d, top, x, h - .15, z); for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(0.15, h - .15, 0.15, M.alu, x + sx * (w / 2 - .3), 0, z + sz * (d / 2 - .3)); solid(x - w / 2, z - d / 2, x + w / 2, z + d / 2); }
function chair(x, z, rot) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  const a = new THREE.Mesh(new THREE.BoxGeometry(1.6, .25, 1.6), M.dark); a.position.y = 1.5; const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, .2), M.dark); b.position.set(0, 2.5, -.75);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.4), M.alu); l.position.y = .7; [a, b, l].forEach(m => { m.castShadow = true; g.add(m); }); }
function ledTex() { return canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { const gr = g.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#bbb'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 8, y - 8, 16, 16); } }); }
const LED = ledTex();
const themeMats = {};
function ledPanel(x, y, z, w, h, color, rotY = 0, rotX = 0) {
  const m = themeMats[color] ||= new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveMap: LED, emissiveIntensity: 3.5, toneMapped: false });
  const housing = box(w + .3, 0.25, h + .3, M.dark, x, y, z, { cast: false });
  const p = mesh(new THREE.PlaneGeometry(w, h), m, x, y - 0.01, z, { cast: false }); p.rotation.x = Math.PI / 2;
  housing.rotation.y = rotY; return p;
}
function standPanel(x, z, color, rot) { // vertical red-light therapy panel on a stand
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  const m = themeMats[color] ||= new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveMap: LED, emissiveIntensity: 3.5, toneMapped: false });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, .2, 1.6), M.dark); base.position.y = .1;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3), M.alu); pole.position.y = 1.6;
  const hs = new THREE.Mesh(new THREE.BoxGeometry(2, 3.6, .3), M.dark); hs.position.y = 4.6;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4), m); face.position.set(0, 4.6, .16);
  [base, pole, hs].forEach(o => { o.castShadow = true; g.add(o); }); g.add(face); solid(x - 1.1, z - 1.1, x + 1.1, z + 1.1);
}
function bed(x, z, rot, color, panel = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 6.4), M.white); base.position.y = 1.0;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, .4, 6.2), M.gloss); pad.position.y = 2.2;
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, .35, 1), M.fabric); pillow.position.set(0, 2.55, -2.4);
  [base, pad, pillow].forEach(o => { o.castShadow = o.receiveShadow = true; g.add(o); });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(2.7, .08, 6.5), themeMats['u' + color] ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3), toneMapped: false }));
  glow.position.y = .12; g.add(glow);
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)); const hw = c * 1.3 + s * 3.2, hd = s * 1.3 + c * 3.2; solid(x - hw, z - hd, x + hw, z + hd);
  if (panel) ledPanel(x, 7.6, z, 2.4 * c + 5.6 * s, 2.4 * s + 5.6 * c, color);
}
// Reception: U-shaped curved desk (open toward the top/north), shelves on the east wall, sofa
{
  const cx = 5.6, cz = 36.4, R0 = 3.4, R1 = 4.4, a0 = Math.PI / 2 - 1.5, a1 = Math.PI / 2 + 1.5;
  const sh = new THREE.Shape(); sh.absarc(0, 0, R1, a0, a1, false); sh.absarc(0, 0, R0, a1, a0, true);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 3.5, bevelEnabled: false, curveSegments: 40 }); geo.rotateX(Math.PI / 2);
  mesh(geo, M.gloss, cx, 3.5, cz); const topG = new THREE.ExtrudeGeometry(sh, { depth: .15, bevelEnabled: false, curveSegments: 40 }); topG.rotateX(Math.PI / 2);
  mesh(topG, M.white, cx, 3.7, cz);
  const glow = new THREE.Shape(); glow.absarc(0, 0, R1 + .12, a0, a1, false); glow.absarc(0, 0, R1 - .02, a1, a0, true);
  const gg = new THREE.ExtrudeGeometry(glow, { depth: .12, bevelEnabled: false, curveSegments: 40 }); gg.rotateX(Math.PI / 2); mesh(gg, M.red, cx, .25, cz, { cast: false });
  solid(cx - 4.5, cz + 2.6, cx + 4.5, cz + 4.6); solid(cx - 4.5, cz - .2, cx - 2.7, cz + 2.6); solid(cx + 2.7, cz - .2, cx + 4.5, cz + 2.6);
  chair(cx, cz + 1.2, 0); box(1.6, 1.0, .12, M.dark, cx, 3.75, cz + 2.9, { cast: false });
  // shelving on the straight east wall (x=16.2), facing west
  for (let i = 0; i < 4; i++) box(1.2, .12, 5, M.white, 15.55, 1.2 + i * 1.6, 46);
  box(1.2, 6.2, .12, M.white, 15.55, 0, 43.5); box(1.2, 6.2, .12, M.white, 15.55, 0, 48.5); solid(14.9, 43.4, 16.2, 48.6);
  for (let i = 0; i < 12; i++) box(.45, .7, .45, i % 3 ? M.white : M.red, 15.55, 1.35 + Math.floor(i / 6) * 3.2, 44 + (i % 6) * .8, { cast: false });
  sofa(12.6, 47.4, 6, Math.PI); table(12.6, 44.4, 3.5, 2, 1.4, M.gloss); plant(1.4, 48); plant(14.8, 33.2, .9);
}
// neon wordmark above the reception shelves + red floor coves
{ const t = canvasTex(1024, 200, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.font = 'bold 150px Helvetica,Arial'; g.textAlign = 'center'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 30; g.fillStyle = '#ff6a50'; g.fillText('ULTRARED', w / 2, 158); });
  const n = mesh(new THREE.PlaneGeometry(6.5, 1.27), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(2.4, 2.4, 2.4), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending }), 16.17, 7.6, 46, { cast: false }); n.rotation.y = -Math.PI / 2; }
for (const [x1, z1, x2, z2] of [[10.5, 48.9, 16, 48.9], [0.5, 48.9, 6, 48.9], [16.0, 37.5, 16.0, 43], [16, 0.5, 37, 0.5], [22, 34.6, 25.8, 34.6], [28.9, 34.6, 39, 34.6], [42.4, 31.4, 46.1, 31.4]]) {
  const L = Math.hypot(x2 - x1, z2 - z1); const c = mesh(new THREE.BoxGeometry(L, .1, .1), M.red, (x1 + x2) / 2, .3, (z1 + z2) / 2, { cast: false }); c.rotation.y = -Math.atan2(z2 - z1, x2 - x1); }
// Conference
{ table(7.5, 10.5, 4, 10, 2.5, M.gloss); for (const z of [7, 10.5, 14]) { chair(4.6, z, Math.PI / 2); chair(10.4, z, -Math.PI / 2); } chair(7.5, 4.4, 0); chair(7.5, 16.6, Math.PI);
  ledPanel(7.5, 8.85, 10.5, 2, 7, '#ff2a1a'); plant(1.5, 1.5, .8); plant(13.6, 1.5, .8); }
// Kitchen
{ box(2.2, 3, 6.2, M.white, 1.2, 0, 24.9); box(2.2, .15, 6.2, M.dark, 1.2, 3, 24.9); box(1.3, 2.4, 6.2, M.white, .75, 5.6, 24.9, { cast: false }); solid(0, 21.5, 2.4, 28.1);
  box(2.6, 6.4, 2.4, M.alu, 1.4, 0, 29.4); solid(0, 28.1, 2.7, 30.6); box(3, 3.4, 2.4, M.white, 7.6, 0, 22.8); box(3, .5, 2.4, M.dark, 7.6, 3.4, 22.8); solid(6, 21.5, 9.2, 24.1);
  box(4, .1, .15, M.red, 1.4, 5.4, 24.9, { cast: false }); }
// Closet shelves (east wall)
{ for (let i = 0; i < 4; i++) box(1.4, .1, 6, M.wood, 20.75, 1 + i * 1.7, 30.5); solid(19.9, 27.4, 21.7, 33.6); }
// Lounge (Open Area)
{ sofa(26, 3.6, 9, 0); sofa(20.6, 8, 6, Math.PI / 2); table(26, 8, 4, 2.4, 1.4, M.gloss);
  const rug = mesh(new THREE.PlaneGeometry(13, 9), new THREE.MeshStandardMaterial({ color: 0xe9e1d8, roughness: 1 }), 26, 0.02, 7.5, { cast: false }); rug.rotation.x = -Math.PI / 2;
  sofa(31.6, 9, 7, -Math.PI / 2); plant(16.6, 1.6); plant(36.2, 17.6, 1.1); plant(36.2, 1.6, .9); standPanel(35.6, 9.5, '#ff2a1a', -Math.PI / 2); }
// Terrace
{ for (const [a, b, c, d] of [[37.4, .25, 56, .25], [55.75, 0, 55.75, 19.5]]) { const L = Math.hypot(c - a, d - b); const r = mesh(new THREE.BoxGeometry(L, .15, .15), M.alu, (a + c) / 2, 3.5, (b + d) / 2); r.rotation.y = -Math.atan2(d - b, c - a);
    const gp = mesh(new THREE.BoxGeometry(L, 3.4, .05), M.glass, (a + c) / 2, 1.75, (b + d) / 2, { cast: false }); gp.rotation.y = r.rotation.y; colliders.push({ a: [a, b], b: [c, d], r: .2 }); }
  for (const [x, z] of [[46, 5], [50, 5]]) { box(2.2, 1.2, 5, M.white, x, 0, z); box(2.2, 1.4, .6, M.white, x, 1.2, z - 2.2); solid(x - 1.1, z - 2.5, x + 1.1, z + 2.5); }
  table(48, 11, 2, 2, 1.6, M.white); plant(54.4, 17.6); plant(39.2, 18, .8); plant(54.4, 1.8, .9); }
// Open Area 2 (gallery lounge)
{ sofa(28, 23.2, 7, 0); sofa(28, 29, 7, Math.PI); table(28, 26.1, 3.5, 2, 1.4, M.gloss); standPanel(39.6, 24, '#ff2a1a', -Math.PI / 2); standPanel(39.6, 27.6, '#ff2a1a', -Math.PI / 2); plant(40.6, 20.6); plant(23.2, 33.6, .8); }
// Themed rooms
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
bed(50, 23.3, Math.PI / 2, '#ffffff'); bed(50, 28.3, Math.PI / 2, '#ffffff');
bed(50, 43, 0, '#ff2010'); bed(36.5, 43, Math.PI / 2, '#3b8cff'); bed(23, 43, 0, '#38e05a');
// Fire: candles along the west + south walls, amethyst geode
for (let i = 0; i < 22; i++) { const t = i / 21; let x, z; if (t < .5) { x = 43.9; z = 37.5 + t * 2 * 11; } else { x = 43.9 + (t - .5) * 2 * 11.6; z = 48.6; }
  mesh(new THREE.CylinderGeometry(.12, .12, .55, 10), M.candle, x, .28, z, { cast: false }); mesh(new THREE.SphereGeometry(.07, 6, 4), M.flame, x, .62, z, { cast: false }); }
box(1.4, 3.2, 1.4, new THREE.MeshStandardMaterial({ color: 0xb9ad9a, roughness: .9 }), 54.6, 0, 36.6); mesh(new THREE.ConeGeometry(.65, 2.2, 7), M.geode, 54.6, 4.3, 36.6); solid(53.8, 35.6, 55.6, 37.6);
// Water: wave mural on the south wall
{ const t = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dff0ff'); gr.addColorStop(1, '#2d7bff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 5; for (let k = 0; k < 6; k++) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 40 + k * 38 + Math.sin(x / 40 + k) * 12); g.stroke(); } });
  const p = mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 }), 36.5, 4.6, 48.88, { cast: false }); p.rotation.y = Math.PI; }
// Earth: plants + green feature wall (south)
{ plant(17.8, 47.6); plant(28.4, 47.6); plant(18, 36.6, .8); const gw = mesh(new THREE.PlaneGeometry(13, 8.9), new THREE.MeshStandardMaterial({ color: 0x7fc256, roughness: .9 }), 23.15, 4.5, 48.88, { cast: false }); gw.rotation.y = Math.PI; }
// Air: sky ceiling tiles
{ const t = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7ec3ff'); gr.addColorStop(1, '#cfe9ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h; for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x + k * 18 - 40, y + Math.sin(k) * 10, 22 + Math.random() * 18, 0, 7); g.fill(); } } g.strokeStyle = '#eee'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); });
  const p = mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.2 }), 50, CEIL - .03, 25.8, { cast: false, parent: ceilingGroup }); p.rotation.x = Math.PI / 2; }
// Door glyph signs
function glyph(kind, color, x, z, rotY, y = 7.85) {
  const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, w, h); g.strokeStyle = g.fillStyle = color; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath();
    if (kind === 'fire') { g.moveTo(128, 40); g.bezierCurveTo(200, 110, 190, 200, 128, 215); g.bezierCurveTo(66, 200, 60, 130, 105, 95); g.bezierCurveTo(110, 130, 125, 140, 140, 120); g.bezierCurveTo(150, 95, 140, 70, 128, 40); g.fill(); }
    if (kind === 'water') { for (let k = 0; k < 3; k++) { g.beginPath(); for (let x2 = 40; x2 <= 216; x2 += 4) g.lineTo(x2, 90 + k * 40 + Math.sin(x2 / 18) * 14); g.stroke(); } }
    if (kind === 'air') { g.arc(100, 140, 40, Math.PI * .5, Math.PI * 1.5); g.arc(150, 110, 50, Math.PI, 0); g.arc(185, 145, 32, -Math.PI / 2, Math.PI / 2); g.closePath(); g.stroke(); }
    if (kind === 'earth') { g.moveTo(30, 205); g.lineTo(100, 70); g.lineTo(140, 145); g.lineTo(170, 105); g.lineTo(226, 205); g.closePath(); g.stroke(); }
    g.font = 'bold 30px Helvetica,Arial'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(kind.toUpperCase(), 128, 248); });
  const s = mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.6 }), x, y, z, { cast: false }); s.rotation.y = rotY;
}
glyph('air', '#ffffff', 46.27, 33, -Math.PI / 2); glyph('fire', '#ff3020', 44.8, 34.77, Math.PI); glyph('water', '#4aa0ff', 40.65, 34.77, Math.PI); glyph('earth', '#4dff6a', 27.4, 34.77, Math.PI);

// ---------- photo frames (graded wall art, clickable) ----------
const FRAMES = [
  ['reception_05', 16.17, 38.6, -Math.PI / 2], ['reception_06', 16.17, 41.6, -Math.PI / 2], ['reception_01', 2.6, 49.0, Math.PI], ['reception_04', 11, 49.0, Math.PI], ['reception_02', 14.4, 49.0, Math.PI], ['reception_03', 0.4, 32.0, Math.PI / 2],
  ['hall_01', 9.62, 26, Math.PI / 2], ['office_01', 3, 21.08, Math.PI], ['lounge_10', 7.5, 21.08, Math.PI], ['kitchen_01', 9.18, 27.5, -Math.PI / 2],
  ['lounge_01', 15.42, 5, Math.PI / 2], ['lounge_03', 15.42, 13, Math.PI / 2], ['lounge_08', 14.98, 6, -Math.PI / 2], ['lounge_02', 15.42, 17.5, Math.PI / 2],
  ['lounge_09', 24, 34.78, Math.PI], ['lounge_11', 32.5, 34.78, Math.PI], ['lounge_12', 35.8, 34.78, Math.PI], ['lounge_04', 21.92, 30, Math.PI / 2], ['lounge_05', 41.78, 29.6, -Math.PI / 2], ['hall_02', 44.25, 31.22, 0],
  ['air_01', 49.5, 34.78, Math.PI], ['air_02', 53.5, 34.78, Math.PI], ['air_03', 42.22, 25, Math.PI / 2],
  ['fire_01', 49.5, 35.22, 0], ['fire_03', 52.4, 35.22, 0], ['fire_02', 43.42, 41.5, Math.PI / 2], ['fire_04', 43.42, 45.6, Math.PI / 2],
  ['water_01', 30.12, 39.5, Math.PI / 2], ['water_02', 30.12, 44.5, Math.PI / 2], ['water_03', 42.98, 39.5, -Math.PI / 2], ['water_04', 42.98, 44.5, -Math.PI / 2],
  ['earth_01', 16.62, 39.5, Math.PI / 2], ['earth_02', 16.62, 44.5, Math.PI / 2], ['earth_03', 29.68, 39.5, -Math.PI / 2], ['earth_04', 29.68, 44.5, -Math.PI / 2],
];
for (const [name, x, z, rot] of FRAMES) {
  const t = texLoader.load('tex/' + name + '.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const g = new THREE.Group(); g.position.set(x, 5.1, z); g.rotation.y = rot; world.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(2.75, 3.6, .12), M.frame); fr.position.z = .04; fr.castShadow = true; g.add(fr);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.33), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .45, roughness: .4 }));
  pic.position.z = .11; pic.receiveShadow = true; pic.userData.photo = name; g.add(pic); clickables.push(pic);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 3.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .25, .15), toneMapped: false })); ring.position.z = -.03; g.add(ring);
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7f72, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
sun.target.position.set(28, 0, 24.6); scene.add(sun, sun.target);
const roomLights = [];
for (const r of ROOMS) {
  if (r.id === 'closet' || r.id === 'terrace') continue;
  const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0];
  const L = new THREE.PointLight(r.light, 1, Math.max(w, d) * 1.5, 1.7);
  L.position.set(r.id === 'open2' ? 28 : r.id === 'air' ? 50 : r.x[0] + w / 2, 6.6, r.id === 'open2' ? 26 : r.id === 'air' ? 25.8 : r.z[0] + d / 2); scene.add(L);
  roomLights.push({ L, base: r.id === 'air' ? 26 : r.color ? 58 : 18, theme: !!r.color });
}
const TOD = [ // morning, sunset, night
  { sun: [62, 40, 30], sc: 0xfff0dc, si: 3.0, hs: 0xcfe3ff, hg: 0x5a524a, hi: .32, top: 0x4f8fe0, bot: 0xd6e8fa, ind: .5, tro: .45, bl: .7, ex: .95 },
  { sun: [-70, 9, 24], sc: 0xff6a24, si: 3.2, hs: 0xff9a6a, hg: 0x3a2a22, hi: .2, top: 0x2a2f6a, bot: 0xff7a3a, ind: .85, tro: .6, bl: .9, ex: .95 },
  { sun: [-25, 55, -35], sc: 0x8fa8ff, si: .18, hs: 0x1b2850, hg: 0x050508, hi: .05, top: 0x02040c, bot: 0x0a1026, ind: 1.3, tro: .8, bl: 1.1, ex: 1.0 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
const lerpC = (a, b, t, out) => out.copy(cA.set(a)).lerp(cB.set(b), t);
let tod = Q.has('light') ? +Q.get('light') : 0.15;
function applyLight(v) {
  tod = v; const i = Math.min(1, Math.floor(v)), t = v - i, A = TOD[i], B = TOD[i + 1];
  const L = (k) => A[k] + (B[k] - A[k]) * t;
  sun.position.set(28 + A.sun[0] + (B.sun[0] - A.sun[0]) * t, A.sun[1] + (B.sun[1] - A.sun[1]) * t, 24.6 + A.sun[2] + (B.sun[2] - A.sun[2]) * t);
  lerpC(A.sc, B.sc, t, sun.color); sun.intensity = L('si');
  lerpC(A.hs, B.hs, t, hemi.color); lerpC(A.hg, B.hg, t, hemi.groundColor); hemi.intensity = L('hi');
  lerpC(A.top, B.top, t, skyU.top.value); lerpC(A.bot, B.bot, t, skyU.bot.value);
  const ind = L('ind'); roomLights.forEach(o => o.L.intensity = o.base * (o.theme ? Math.max(.7, ind) : Math.min(ind, .55 + .35 * Math.max(0, v - 1))));
  M.troffer.emissiveIntensity = L('tro'); bloom.strength = L('bl'); renderer.toneMappingExposure = L('ex');
  for (const k in themeMats) if (themeMats[k].emissiveIntensity !== undefined) themeMats[k].emissiveIntensity = 1.6 + ind * 1.0;
  M.ground.color.setRGB(.37, .42, .33).multiplyScalar(i === 1 && t > .5 ? 1 - (t - .5) * 1.6 : 1);
  $('#tod').value = v; $('#todlabel').textContent = v < .5 ? 'Morning' : v < 1.5 ? 'Sunset' : 'Night';
}

// ---------- labels (overview) ----------
const labelObjs = [];
for (const r of ROOMS) {
  const el = document.createElement('div'); el.className = 'rlabel t-' + r.theme.toLowerCase(); el.innerHTML = `<b>${r.name.replace('Open Area: ','').replace('Open Area 2: ','')}</b><span>≈${r.sqft} sq ft</span>`;
  el.onclick = () => goTour(TOUR.findIndex(s => s.room === r.id));
  const o = new CSS2DObject(el); o.position.set((r.x[0] + r.x[1]) / 2, 1, (r.z[0] + r.z[1]) / 2); scene.add(o); labelObjs.push(o);
}
const setLabels = v => labelObjs.forEach(o => o.visible = v);

// ---------- movement / collision ----------
const player = { x: 7.85, z: 53.5, yaw: 0, pitch: 0 };
function collide(p) {
  const R = PR;
  for (let it = 0; it < 2; it++) {
    for (const c of colliders) {
      const [ax, az] = c.a, [bx, bz] = c.b; const vx = bx - ax, vz = bz - az; const l2 = vx * vx + vz * vz || 1;
      let t = ((p.x - ax) * vx + (p.z - az) * vz) / l2; t = Math.max(0, Math.min(1, t));
      const cx = ax + vx * t, cz = az + vz * t; let dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz), m = R + c.r;
      if (d < m) { if (d < 1e-4) { dx = -vz; dz = vx; } const k = (m - (d || 1e-4)) / (Math.hypot(dx, dz)); p.x += dx * k; p.z += dz * k; }
    }
    for (const [x1, z1, x2, z2] of boxes) {
      const cx = Math.max(x1, Math.min(p.x, x2)), cz = Math.max(z1, Math.min(p.z, z2)); const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < R) { if (d === 0) { const l = p.x - x1, r = x2 - p.x, u = p.z - z1, b = z2 - p.z, mn = Math.min(l, r, u, b); if (mn === l) p.x = x1 - R; else if (mn === r) p.x = x2 + R; else if (mn === u) p.z = z1 - R; else p.z = z2 + R; } else { p.x = cx + dx / d * R; p.z = cz + dz / d * R; } }
    }
  }
}
const keys = {}; addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyN' && tourIdx >= 0) goTour(tourIdx + 1); }); addEventListener('keyup', e => keys[e.code] = false);
const joy = { x: 0, y: 0 };
let mode = 'welcome'; // welcome | walk | overview
const orbit = { th: 0, ph: 0.4, r: 66 };
let fly = null, tourIdx = -1;

function roomAt(x, z) {
  const order = ['closet', 'conference', 'kitchen', 'earth', 'water', 'fire', 'vestibule', 'air', 'corridor', 'reception', 'lounge', 'terrace', 'open2'];
  for (const id of order) { const r = ROOM[id]; if (x >= r.x[0] && x <= r.x[1] && z >= r.z[0] && z <= r.z[1]) return r; }
  return null;
}
// pointer look
const el = renderer.domElement; let drag = null;
const pointers = new Map(); let pinch0 = 0;
el.addEventListener('pointerdown', e => {
  el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
el.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && mode === 'overview') { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); orbit.r = Math.max(30, Math.min(160, orbit.r * pinch0 / d)); pinch0 = d; return; }
  if (mode === 'walk') { const s = e.pointerType === 'touch' ? .006 : .0035; player.yaw -= dx * s; player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch - dy * s)); fly = null; }
  else if (mode === 'overview') { orbit.th -= dx * .006; orbit.ph = Math.max(.2, Math.min(1.45, orbit.ph - dy * .005)); }
});
el.addEventListener('pointerup', e => {
  const p = pointers.get(e.pointerId); pointers.delete(e.pointerId); if (!p) return;
  if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) pick(e.clientX, e.clientY);
});
el.addEventListener('wheel', e => { if (mode === 'overview') orbit.r = Math.max(30, Math.min(160, orbit.r * (1 + e.deltaY * .001))); }, { passive: true });
const ray = new THREE.Raycaster();
function pick(cx, cy) {
  ray.setFromCamera(new THREE.Vector2(cx / innerWidth * 2 - 1, -cy / innerHeight * 2 + 1), camera);
  const h = ray.intersectObjects(clickables)[0]; if (h && (mode === 'overview' || h.distance < 40)) { const name = h.object.userData.photo; const r = ROOMS.find(r => r.photos.includes(name)); openPhotos(r ? r.photos : [name], r ? r.photos.indexOf(name) : 0, r); }
}
// joystick
{ const j = $('#joy'), k = $('#joy i'); let id = null, ox = 0, oy = 0;
  j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); const r = j.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; mv(e); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } joy.x = dx / m; joy.y = dy / m; k.style.transform = `translate(${dx}px,${dy}px)`; fly = null; };
  j.addEventListener('pointermove', mv);
  const up = e => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; k.style.transform = ''; }; j.addEventListener('pointerup', up); j.addEventListener('pointercancel', up); }

// ---------- UI ----------
function setMode(m) {
  mode = m; document.body.dataset.mode = m; ceilingGroup.visible = m !== 'overview'; setLabels(m === 'overview');
  $('#btnView').textContent = m === 'overview' ? 'Walk' : 'Overview';
}
function lookAngles(px, pz, lx, lz) { return Math.atan2(-(lx - px), -(lz - pz)); }
function goTour(i) {
  if (i < 0 || i >= TOUR.length) { endTour(); return; }
  tourIdx = i; const s = TOUR[i], r = ROOM[s.room]; setMode('walk');
  fly = { t: 0, from: { ...player }, to: { x: s.pos[0], z: s.pos[1], yaw: lookAngles(s.pos[0], s.pos[1], s.look[0], s.look[1]), pitch: -0.05 } };
  let dy = fly.to.yaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); fly.to.yaw = player.yaw + dy;
  $('#tourcard').hidden = false; $('#tc-step').textContent = `Stop ${i + 1} of ${TOUR.length}`;
  $('#tc-name').textContent = r.name; $('#tc-theme').textContent = r.theme + ' theme'; $('#tc-theme').className = 'chip t-' + r.theme.toLowerCase();
  $('#tc-size').textContent = `${r.dims} · ≈${r.sqft} sq ft${r.outdoor ? ' (outdoor)' : ''}`;
  $('#tc-feat').innerHTML = r.features.map(f => `<li>${f}</li>`).join('');
  $('#tc-photos').hidden = !r.photos.length; $('#tc-photos').textContent = `View photos (${r.photos.length})`; $('#tc-photos').onclick = () => openPhotos(r.photos, 0, r);
  $('#tc-next').textContent = i === TOUR.length - 1 ? 'Finish' : 'Next ›'; $('#tc-prev').disabled = i === 0;
}
function endTour() { tourIdx = -1; $('#tourcard').hidden = true; }
$('#tc-next').onclick = () => goTour(tourIdx + 1); $('#tc-prev').onclick = () => goTour(tourIdx - 1); $('#tc-close').onclick = endTour;
$('#btnTour').onclick = () => goTour(0);
$('#btnView').onclick = () => { endTour(); setMode(mode === 'overview' ? 'walk' : 'overview'); };
$('#btnPhotos').onclick = () => { const r = roomAt(player.x, player.z) || ROOM.reception; openPhotos(r.photos.length ? r.photos : ROOM.reception.photos, 0, r.photos.length ? r : ROOM.reception); };
$('#tod').oninput = e => applyLight(+e.target.value);
$('#start-walk').onclick = () => { $('#welcome').hidden = true; setMode('walk'); };
$('#start-tour').onclick = () => { $('#welcome').hidden = true; goTour(0); };
$('#start-over').onclick = () => { $('#welcome').hidden = true; setMode('overview'); };
// photo modal
let gal = null;
function openPhotos(list, i, r) { gal = { list, i, r, orig: false }; $('#modal').hidden = false; showPhoto(); }
function showPhoto() { const n = gal.list[gal.i]; $('#m-img').src = 'img/' + n + (gal.orig ? '_orig' : '') + '.jpg';
  $('#m-cap').textContent = `${gal.r ? gal.r.name : ''} · ${n.replace('_', ' ')} · ${gal.orig ? 'original photo, grade B' : 'high-light restyle, grade B'} · ${gal.i + 1}/${gal.list.length}`;
  $('#m-toggle').textContent = gal.orig ? 'Show high-light restyle' : 'Show original photo'; }
$('#m-close').onclick = () => { $('#modal').hidden = true; };
$('#m-prev').onclick = () => { gal.i = (gal.i - 1 + gal.list.length) % gal.list.length; showPhoto(); };
$('#m-next').onclick = () => { gal.i = (gal.i + 1) % gal.list.length; showPhoto(); };
$('#m-toggle').onclick = () => { gal.orig = !gal.orig; showPhoto(); };

// ---------- loop ----------
const clock = new THREE.Timer(); const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let lastRoom = null, intro = 0;
function frame() {
  clock.update(); const dt = Math.min(clock.getDelta(), .05);
  if (mode === 'welcome') { intro += dt * .05; const a = intro; camera.position.set(28 + Math.cos(a) * 80, 55, 24.6 + Math.sin(a) * 60); camera.lookAt(28, 0, 24.6); }
  else if (mode === 'overview') { const { th, ph, r } = orbit; camera.position.set(28 + r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph), 24.6 + r * Math.sin(ph) * Math.cos(th)); camera.lookAt(28, 0, 24.6); }
  else {
    if (fly) { fly.t = Math.min(1, fly.t + dt / 1.8); const e = ease(fly.t); for (const k of ['x', 'z', 'yaw', 'pitch']) player[k] = fly.from[k] + (fly.to[k] - fly.from[k]) * e; if (fly.t >= 1) fly = null; }
    else {
      let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y, s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x;
      if (keys.ArrowLeft) player.yaw += dt * 1.8; if (keys.ArrowRight) player.yaw -= dt * 1.8;
      const sp = (keys.ShiftLeft ? 16 : 9) * dt; const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      if (f || s) { player.x += (-sy * f + cy * s) * sp; player.z += (-cy * f - sy * s) * sp; collide(player); if (tourIdx >= 0 && (keys.KeyW || keys.KeyS || joy.y)) endTour(); }
    }
    camera.position.set(player.x, EYE, player.z); camera.rotation.set(player.pitch, player.yaw, 0);
    const r = roomAt(player.x, player.z); if (r !== lastRoom) { lastRoom = r; $('#here').textContent = r ? `${r.name} · ≈${r.sqft} sq ft` : 'Acacia Court · Suite 220 entry'; $('#here').className = 'chip t-' + (r ? r.theme.toLowerCase() : 'hall'); }
  }
  composer.render(); labelR.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); labelR.setSize(innerWidth, innerHeight); });
applyLight(tod); setMode('welcome'); setLabels(false); frame();
// QA / deep links: ?view=overview | ?stop=<roomId> | ?light=0..2
window.__ult = { roomAt: (x, z) => (roomAt(x, z) || {}).id, collide: (x, z) => { const q = { x, z }; collide(q); return [+q.x.toFixed(2), +q.z.toFixed(2)]; }, goTour, setMode, applyLight, player, TOUR, framePt: (i) => { const v = new THREE.Vector3(); clickables[i].getWorldPosition(v); v.project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; }, ready: () => $('#welcome').classList.contains('ready') };
if (Q.get('view') === 'overview') { $('#welcome').hidden = true; setMode('overview'); }
if (Q.get('stop')) { $('#welcome').hidden = true; const i = TOUR.findIndex(s => s.room === Q.get('stop')); goTour(i < 0 ? 0 : i); if (Q.has('instant')) fly && (fly.t = .999); }
