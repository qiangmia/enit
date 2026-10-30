import * as THREE from 'three';
import { LOG_LINES } from './content.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function drawScreenBase(ctx, w, h, accent) {
  ctx.fillStyle = '#050b15';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0a1728';
  ctx.fillRect(0, 0, w, 52);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 50, w, 3);
  ctx.strokeStyle = 'rgba(110,231,255,0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function makeLogTexture() {
  const w = 1024;
  const h = 576;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  let offset = 0;

  function draw() {
    drawScreenBase(ctx, w, h, '#6ee7ff');
    ctx.fillStyle = '#6ee7ff';
    ctx.font = '700 22px Consolas, monospace';
    ctx.fillText('SOC // ACCESS LOG // LIVE', 24, 34);
    ctx.fillStyle = '#ff5a5f';
    ctx.font = '700 18px Consolas, monospace';
    ctx.fillText('● ALERT', w - 120, 34);

    const startY = 86;
    const lineH = 25;
    const count = Math.floor((h - startY - 16) / lineH);
    for (let i = 0; i < count; i++) {
      const line = LOG_LINES[(i + offset) % LOG_LINES.length];
      const y = startY + i * lineH;
      ctx.font = '16px Consolas, monospace';
      ctx.fillStyle = '#7f93b3';
      ctx.fillText(line.t, 24, y);
      const levelColor =
        line.lvl === 'ALERT' ? '#ff5a5f' : line.lvl === 'WARN' ? '#ffb454' : '#46e6a0';
      ctx.fillStyle = levelColor;
      ctx.fillText(line.lvl.padEnd(5, ' '), 112, y);
      ctx.fillStyle = line.lvl === 'ALERT' ? '#ffd7d9' : '#b9c8e2';
      let msg = line.msg;
      if (msg.length > 78) msg = msg.slice(0, 77) + '…';
      ctx.fillText(msg, 196, y);
    }
    ctx.strokeStyle = 'rgba(110,231,255,0.25)';
    ctx.strokeRect(4, 4, w - 8, h - 8);
  }

  draw();
  const texture = canvasTexture(c);
  return {
    texture,
    tick() {
      offset = (offset + 1) % LOG_LINES.length;
      draw();
      texture.needsUpdate = true;
    },
  };
}

function makeGraphTexture() {
  const w = 512;
  const h = 288;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  drawScreenBase(ctx, w, h, '#46e6a0');
  ctx.fillStyle = '#46e6a0';
  ctx.font = '700 16px Consolas, monospace';
  ctx.fillText('LOGIN FAILURES / 24H', 18, 32);
  ctx.strokeStyle = 'rgba(70,230,160,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const pts = [0.15, 0.18, 0.16, 0.2, 0.22, 0.3, 0.42, 0.38, 0.55, 0.86, 0.7, 0.5, 0.44, 0.4];
  for (let i = 0; i < pts.length; i++) {
    const x = 20 + (i / (pts.length - 1)) * (w - 40);
    const y = h - 30 - pts[i] * (h - 90);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffb454';
  ctx.font = '700 13px Consolas, monospace';
  ctx.fillText('02:43', 250, 70);
  return canvasTexture(c);
}

function makeMapTexture() {
  const w = 512;
  const h = 288;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  drawScreenBase(ctx, w, h, '#6ee7ff');
  ctx.fillStyle = '#6ee7ff';
  ctx.font = '700 16px Consolas, monospace';
  ctx.fillText('SOURCE GEOGRAPHY', 18, 32);
  for (let i = 0; i < 110; i++) {
    const x = 24 + Math.random() * (w - 48);
    const y = 58 + Math.random() * (h - 90);
    ctx.fillStyle = 'rgba(110,231,255,0.18)';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const sx = 120;
  const sy = 190;
  const tx = 420;
  const ty = 120;
  ctx.strokeStyle = '#ff5a5f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(260, 80, tx, ty);
  ctx.stroke();
  ctx.fillStyle = '#ff5a5f';
  ctx.beginPath();
  ctx.arc(tx, ty, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb454';
  ctx.font = '700 13px Consolas, monospace';
  ctx.fillText('203.0.113.77', tx - 56, ty - 14);
  return canvasTexture(c);
}

function makeAlertTexture() {
  const w = 512;
  const h = 288;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  drawScreenBase(ctx, w, h, '#ff5a5f');
  ctx.fillStyle = '#ff5a5f';
  ctx.font = '800 54px Consolas, monospace';
  ctx.fillText('ALERT', 24, 120);
  ctx.fillStyle = '#ffd7d9';
  ctx.font = '20px Consolas, monospace';
  ctx.fillText('14 failed logins / 60s', 26, 160);
  ctx.fillText('src=203.0.113.77', 26, 192);
  ctx.fillText('geo=RO', 26, 224);
  ctx.strokeStyle = '#ff5a5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  return canvasTexture(c);
}

function makeDocumentTexture() {
  const w = 512;
  const h = 288;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f4ec';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a365d';
  ctx.font = '700 20px Georgia, serif';
  ctx.fillText('INCIDENT REPORT', 24, 40);
  ctx.fillStyle = '#718096';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('NovaNet Solutions · Confidential', 24, 60);
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(24, 72);
  ctx.lineTo(w - 24, 72);
  ctx.stroke();
  ctx.fillStyle = '#cbd5e0';
  for (let i = 0; i < 9; i++) {
    const y = 94 + i * 20;
    ctx.fillRect(24, y, i % 3 === 0 ? w - 110 : w - 60, 6);
  }
  return canvasTexture(c);
}

function makeWhiteboardTexture() {
  const w = 1024;
  const h = 600;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f6f1';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a365d';
  ctx.font = '700 36px Georgia, serif';
  ctx.fillText('INCIDENT CHECKLIST', 40, 62);
  ctx.font = '26px "Comic Sans MS", "Segoe Print", cursive';
  const items = [
    '1. Find the source IP',
    '2. Check the admin accounts',
    '3. Block the address',
    '4. Reset passwords',
    '5. Turn on MFA',
    '6. Disable old accounts',
    '7. Write the report',
  ];
  items.forEach((item, i) => {
    const y = 130 + i * 62;
    ctx.fillStyle = i < 4 ? '#2b6cb0' : '#718096';
    ctx.fillText(item, 48, y);
    ctx.strokeStyle = '#cbd5e0';
    ctx.beginPath();
    ctx.moveTo(40, y + 14);
    ctx.lineTo(620, y + 14);
    ctx.stroke();
  });
  ctx.strokeStyle = '#c05621';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(760, 220, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#c05621';
  ctx.font = '700 32px "Comic Sans MS", "Segoe Print", cursive';
  ctx.fillText('CONTAIN', 688, 232);
  return canvasTexture(c);
}

function makeClockTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6ee7ff';
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = size / 2 + Math.cos(a) * 100;
    const y1 = size / 2 + Math.sin(a) * 100;
    const x2 = size / 2 + Math.cos(a) * 112;
    const y2 = size / 2 + Math.sin(a) * 112;
    ctx.strokeStyle = '#8fa3c4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // 02:43
  const hour = ((2 + 43 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minute = (43 / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#e8f0ff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  ctx.lineTo(size / 2 + Math.cos(hour) * 56, size / 2 + Math.sin(hour) * 56);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  ctx.lineTo(size / 2 + Math.cos(minute) * 86, size / 2 + Math.sin(minute) * 86);
  ctx.stroke();
  ctx.fillStyle = '#ff5a5f';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  return canvasTexture(c);
}

function makeGridTexture() {
  const size = 512;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a111c';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(110,231,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(110,231,255,0.03)';
  for (let x = 0; x < size; x += 128) {
    for (let y = 0; y < size; y += 128) {
      ctx.fillRect(x + 8, y + 8, 48, 48);
    }
  }
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

function makeGlowTexture() {
  const size = 128;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(170,220,255,0.35)');
  g.addColorStop(1, 'rgba(170,220,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvasTexture(c);
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a12);
  scene.fog = new THREE.FogExp2(0x060a12, 0.032);

  function overviewDistance() {
    return window.innerWidth / window.innerHeight < 0.9 ? 11.5 : 7.6;
  }
  function overviewFov() {
    return window.innerWidth / window.innerHeight < 0.9 ? 58 : 44;
  }

  const camera = new THREE.PerspectiveCamera(
    overviewFov(),
    window.innerWidth / window.innerHeight,
    0.1,
    80
  );
  const views = {
    overview: {
      pos: new THREE.Vector3(0, 2.1, overviewDistance()),
      look: new THREE.Vector3(0, 1.55, -1.2),
    },
    log: { pos: new THREE.Vector3(-1.0, 2.0, 3.2), look: new THREE.Vector3(-3.0, 2.2, -4.2) },
    contain: { pos: new THREE.Vector3(2.0, 1.9, 3.4), look: new THREE.Vector3(3.4, 1.4, -2.2) },
    report: { pos: new THREE.Vector3(0, 1.8, 3.4), look: new THREE.Vector3(0, 1.15, 0.8) },
  };
  camera.position.copy(views.overview.pos);
  const lookCurrent = views.overview.look.clone();
  camera.lookAt(lookCurrent);

  let targetPos = views.overview.pos.clone();
  let targetLook = views.overview.look.clone();
  let station = 'overview';
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  let alarmActive = true;

  const glowTex = makeGlowTexture();
  const floorTex = makeGridTexture();
  const logScreen = makeLogTexture();

  // ---------- materials ----------
  const matFloor = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    map: floorTex,
    roughness: 0.55,
    metalness: 0.35,
  });
  const matWall = new THREE.MeshStandardMaterial({ color: 0x0d1626, roughness: 0.9, metalness: 0.1 });
  const matPanel = new THREE.MeshStandardMaterial({ color: 0x122036, roughness: 0.75, metalness: 0.2 });
  const matDesk = new THREE.MeshStandardMaterial({ color: 0x141d2e, roughness: 0.45, metalness: 0.45 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x2a3448, roughness: 0.35, metalness: 0.8 });
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.4, metalness: 0.2 });
  const matPaper = new THREE.MeshStandardMaterial({ color: 0xd9dde6, roughness: 0.9 });
  const matPlant = new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.8 });
  const matPot = new THREE.MeshStandardMaterial({ color: 0x5b3a2a, roughness: 0.8 });

  function box(w, h, d, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    scene.add(mesh);
    return mesh;
  }

  // ---------- room shell ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -0.3);
  floor.receiveShadow = true;
  scene.add(floor);

  box(14, 4.4, 0.2, matWall, 0, 2.2, -4.7, { cast: false });
  box(0.2, 4.4, 10, matWall, -7, 2.2, -0.3, { cast: false });
  box(0.2, 4.4, 10, matWall, 7, 2.2, -0.3, { cast: false });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), matPanel);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.4, -0.3);
  scene.add(ceiling);

  // ceiling light strips
  const matLightStrip = new THREE.MeshBasicMaterial({ color: 0xbfe4ff });
  for (let i = 0; i < 4; i++) {
    box(2.4, 0.05, 0.34, matLightStrip, -4.5 + i * 3, 4.34, -1.4, { cast: false, receive: false });
  }

  // acoustic panels on back wall
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const m = new THREE.MeshStandardMaterial({
        color: row % 2 === 0 ? 0x101d32 : 0x0c1626,
        roughness: 0.95,
      });
      box(1.2, 0.75, 0.06, m, -5.6 + col * 1.4, 1.2 + row * 1.05, -4.58, {
        cast: false,
        receive: false,
      });
    }
  }

  // ---------- video wall (6 screens) ----------
  const screenGroup = new THREE.Group();
  screenGroup.position.set(-3.1, 2.45, -4.5);
  scene.add(screenGroup);
  const screenW = 1.12;
  const screenH = 0.68;
  const gap = 0.06;
  const screenMaterials = [];
  const screenTextures = [
    makeGraphTexture(),
    logScreen.texture,
    makeMapTexture(),
    makeAlertTexture(),
    makeDocumentTexture(),
    makeGraphTexture(),
  ];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (col - 1) * (screenW + gap);
      const y = (1 - row) * (screenH + gap);
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.05, screenH + 0.05, 0.04), matBlack);
      bezel.position.set(x, y, 0);
      screenGroup.add(bezel);
      const mat = new THREE.MeshBasicMaterial({ map: screenTextures[row * 3 + col] });
      screenMaterials.push(mat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), mat);
      screen.position.set(x, y, 0.03);
      screenGroup.add(screen);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x4f8cff,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.scale.set(2.0, 1.4, 1);
      glow.position.set(x, y, 0.1);
      screenGroup.add(glow);
    }
  }

  // ---------- containment desk ----------
  const desk1 = new THREE.Group();
  desk1.position.set(3.2, 0, -2.3);
  scene.add(desk1);
  const top1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.05), matDesk);
  top1.position.y = 1.0;
  top1.castShadow = true;
  top1.receiveShadow = true;
  desk1.add(top1);
  for (const dx of [-1.45, 1.45]) {
    for (const dz of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), matMetal);
      leg.position.set(dx, 0.5, dz);
      leg.castShadow = true;
      desk1.add(leg);
    }
  }
  // three monitors
  for (let i = 0; i < 3; i++) {
    const x = -0.95 + i * 0.95;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.52, 0.05), matBlack);
    bezel.position.set(x, 1.43, -0.18);
    bezel.castShadow = true;
    desk1.add(bezel);
    const tex = i === 1 ? makeMapTexture() : i === 0 ? makeGraphTexture() : makeAlertTexture();
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.46),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    screen.position.set(x, 1.43, -0.15);
    desk1.add(screen);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), matMetal);
    stand.position.set(x, 1.12, -0.18);
    desk1.add(stand);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x4f8cff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(1.2, 0.8, 1);
    glow.position.set(x, 1.43, 0.0);
    desk1.add(glow);
  }
  // keyboard + mug
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.24), matBlack);
  keyboard.position.set(0.1, 1.06, 0.22);
  desk1.add(keyboard);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16), matPaper);
  mug.position.set(-1.35, 1.1, 0.28);
  desk1.add(mug);
  // chair
  const chair1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20), matBlack);
  chair1.position.set(3.2, 0.55, -1.2);
  chair1.castShadow = true;
  scene.add(chair1);
  const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), matMetal);
  pole1.position.set(3.2, 0.28, -1.2);
  scene.add(pole1);

  // ---------- report desk ----------
  const desk2 = new THREE.Group();
  desk2.position.set(0, 0, 1.0);
  scene.add(desk2);
  const top2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.05), matDesk);
  top2.position.y = 0.95;
  top2.castShadow = true;
  top2.receiveShadow = true;
  desk2.add(top2);
  for (const dx of [-1.18, 1.18]) {
    for (const dz of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), matMetal);
      leg.position.set(dx, 0.475, dz);
      leg.castShadow = true;
      desk2.add(leg);
    }
  }
  // laptop
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.46), matBlack);
  laptopBase.position.set(0, 1.0, 0);
  desk2.add(laptopBase);
  const laptopLid = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.44, 0.03), matBlack);
  laptopLid.position.set(0, 1.22, -0.23);
  laptopLid.rotation.x = -0.22;
  desk2.add(laptopLid);
  const docTex = makeDocumentTexture();
  const laptopScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.38),
    new THREE.MeshBasicMaterial({ map: docTex })
  );
  laptopScreen.position.set(0, 1.22, -0.205);
  laptopScreen.rotation.x = -0.22;
  desk2.add(laptopScreen);
  const glow2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x6ee7ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow2.scale.set(1.2, 0.9, 1);
  glow2.position.set(0, 1.24, -0.1);
  desk2.add(glow2);
  // papers
  for (let i = 0; i < 4; i++) {
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), matPaper);
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = (i - 1.5) * 0.12;
    paper.position.set(0.7 + i * 0.03, 1.0, 0.12 + i * 0.03);
    desk2.add(paper);
  }
  const mug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16), matPaper);
  mug2.position.set(-0.85, 1.05, 0.25);
  desk2.add(mug2);

  // ---------- server racks ----------
  const ledMeshes = [];
  for (let i = 0; i < 4; i++) {
    const rz = -3.3 + i * 1.1;
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.9, 0.85), matBlack);
    rack.position.set(6.1, 1.45, rz);
    rack.castShadow = true;
    rack.receiveShadow = true;
    scene.add(rack);
    for (let j = 0; j < 10; j++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, 0.01),
        new THREE.MeshBasicMaterial({ color: j % 3 === 0 ? 0x46e6a0 : 0x4f8cff })
      );
      led.position.set(5.55, 0.35 + j * 0.24, rz + 0.43);
      scene.add(led);
      ledMeshes.push({ mesh: led, phase: Math.random() * Math.PI * 2 });
    }
  }

  // ---------- whiteboard ----------
  const whiteboard = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 1.55),
    new THREE.MeshBasicMaterial({ map: makeWhiteboardTexture() })
  );
  whiteboard.position.set(-6.93, 2.35, -0.8);
  whiteboard.rotation.y = Math.PI / 2;
  scene.add(whiteboard);
  box(0.05, 1.65, 2.8, matMetal, -6.96, 2.35, -0.8, { cast: false });

  // ---------- clock ----------
  const clock = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 40),
    new THREE.MeshBasicMaterial({ map: makeClockTexture(), transparent: true })
  );
  clock.position.set(1.5, 3.45, -4.50);
  scene.add(clock);

  // chair at the report desk, back toward the camera
  const chair2Seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), matBlack);
  chair2Seat.position.set(0, 0.55, 2.05);
  chair2Seat.castShadow = true;
  scene.add(chair2Seat);
  const chair2Back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.06), matBlack);
  chair2Back.position.set(0, 0.82, 2.3);
  chair2Back.castShadow = true;
  scene.add(chair2Back);
  const chair2Pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), matMetal);
  chair2Pole.position.set(0, 0.28, 2.05);
  scene.add(chair2Pole);
  const chair2Base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), matMetal);
  chair2Base.position.set(0, 0.03, 2.05);
  scene.add(chair2Base);

  // backrest for the containment chair
  const chair1Back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.06), matBlack);
  chair1Back.position.set(3.2, 0.82, -0.95);
  chair1Back.castShadow = true;
  scene.add(chair1Back);

  // ---------- extra set dressing ----------
  const logoCanvas = makeCanvas(1024, 256);
  const logoCtx = logoCanvas.getContext('2d');
  logoCtx.clearRect(0, 0, 1024, 256);
  logoCtx.fillStyle = '#6ee7ff';
  logoCtx.font = '800 92px "Helvetica Neue", Arial, sans-serif';
  logoCtx.fillText('NOVANET', 24, 118);
  logoCtx.fillStyle = '#4f7fb8';
  logoCtx.font = '700 30px Consolas, monospace';
  logoCtx.fillText('SECURITY OPERATIONS CENTRE', 28, 174);
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.58),
    new THREE.MeshBasicMaterial({ map: canvasTexture(logoCanvas), transparent: true })
  );
  logo.position.set(3.2, 3.25, -4.50);
  scene.add(logo);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x101b2d, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 1.1);
  rug.receiveShadow = true;
  scene.add(rug);
  for (const [x, z, w, d] of [
    [0, 1.1 - 1.15, 3.9, 0.03],
    [0, 1.1 + 1.15, 3.9, 0.03],
    [-1.95, 1.1, 0.03, 2.3],
    [1.95, 1.1, 0.03, 2.3],
  ]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.012, d),
      new THREE.MeshBasicMaterial({ color: 0x1b3a5c })
    );
    edge.position.set(x, 0.022, z);
    scene.add(edge);
  }

  // desk lamp on the report desk
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), matMetal);
  lampBase.position.set(0.95, 0.99, 0.55);
  desk2.add(lampBase);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), matMetal);
  lampPole.position.set(0.95, 1.28, 0.55);
  desk2.add(lampPole);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8), matMetal);
  lampArm.rotation.z = Math.PI / 2;
  lampArm.position.set(0.78, 1.55, 0.55);
  desk2.add(lampArm);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 16, 1, true), matMetal);
  lampShade.rotation.x = Math.PI;
  lampShade.position.set(0.61, 1.5, 0.55);
  desk2.add(lampShade);

  // extra monitor on the report desk
  const repBezel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.05), matBlack);
  repBezel.position.set(0.82, 1.35, 0.55);
  repBezel.castShadow = true;
  desk2.add(repBezel);
  const repScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.4),
    new THREE.MeshBasicMaterial({ map: makeGraphTexture() })
  );
  repScreen.position.set(0.82, 1.35, 0.58);
  desk2.add(repScreen);

  // plants
  function addPlant(x, z) {
    const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 16), matPot);
    potM.position.set(x, 0.175, z);
    potM.castShadow = true;
    scene.add(potM);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.85, 8), matPlant);
      leaf.position.set(x + Math.cos(i) * 0.13, 0.72, z + Math.sin(i) * 0.13);
      leaf.rotation.z = Math.cos(i) * 0.35;
      leaf.rotation.x = Math.sin(i) * 0.35;
      leaf.scale.set(0.72, 0.72, 0.72);
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }
  addPlant(-4.4, 1.3);
  addPlant(4.5, 1.4);

  // cable trays
  for (const z of [-3.1, 0.4]) {
    box(12, 0.08, 0.26, matMetal, 0, 4.27, z, { cast: false, receive: false });
  }

  // vertical LED strips on server racks
  for (let i = 0; i < 4; i++) {
    const rz = -3.3 + i * 1.1;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 2.3, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x1b6f8f })
    );
    strip.position.set(5.55, 1.45, rz + 0.44);
    scene.add(strip);
  }

  // ---------- alarm strips + lights ----------
  const alarmMats = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xff2d3a });
    alarmMats.push(m);
    box(3.6, 0.05, 0.05, m, -4.2 + i * 4.2, 4.05, -4.58, { cast: false, receive: false });
  }
  const alarmLight1 = new THREE.PointLight(0xff2d3a, 2.2, 9, 2);
  alarmLight1.position.set(-3.5, 3.6, -3.6);
  scene.add(alarmLight1);
  const alarmLight2 = new THREE.PointLight(0xff2d3a, 1.6, 8, 2);
  alarmLight2.position.set(3.5, 3.4, -3.4);
  scene.add(alarmLight2);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x8fb7ff, 0x0a1020, 1.05));
  const key = new THREE.DirectionalLight(0xcfe3ff, 1.9);
  key.position.set(4.5, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0008;
  scene.add(key);

  const fill = new THREE.PointLight(0x4f8cff, 5.0, 14, 2);
  fill.position.set(-3, 3.2, -2.5);
  scene.add(fill);
  const fill2 = new THREE.PointLight(0x6ee7ff, 3.4, 12, 2);
  fill2.position.set(3.2, 3.0, -1.5);
  scene.add(fill2);

  const front = new THREE.PointLight(0x7fa7ff, 2.2, 12, 2);
  front.position.set(0, 3.2, 5.0);
  scene.add(front);
  const warm = new THREE.PointLight(0xffc98a, 1.3, 6, 2);
  warm.position.set(0.9, 1.7, 0.9);
  scene.add(warm);

  // ---------- hotspots ----------
  const anchors = {
    log: new THREE.Vector3(-3.1, 3.45, -4.2),
    contain: new THREE.Vector3(3.2, 2.05, -2.3),
    report: new THREE.Vector3(0, 1.55, 1.0),
  };

  function setStation(id) {
    station = id || 'overview';
    const v = views[station] || views.overview;
    targetPos.copy(v.pos);
    targetLook.copy(v.look);
    if (REDUCED) {
      camera.position.copy(targetPos);
      lookCurrent.copy(targetLook);
      camera.lookAt(lookCurrent);
    }
  }

  function setAlarm(active) {
    alarmActive = active;
  }

  function project(id) {
    const p = anchors[id];
    if (!p) return null;
    const v = p.clone().project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      visible: v.z < 1 && v.z > -1,
    };
  }

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.fov = overviewFov();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    views.overview.pos.z = overviewDistance();
    if (station === 'overview') {
      targetPos.copy(views.overview.pos);
      if (REDUCED) {
        camera.position.copy(targetPos);
        camera.lookAt(lookCurrent);
      }
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let lastLogTick = 0;
  function update(dt, elapsed) {
    if (!REDUCED) {
      const k = 1 - Math.pow(0.001, dt);
      camera.position.lerp(targetPos, k);
      lookCurrent.lerp(targetLook, k);
      pointerSmooth.lerp(pointer, 1 - Math.pow(0.01, dt));
      if (station === 'overview') {
        camera.position.x += pointerSmooth.x * 0.12;
        camera.position.y += pointerSmooth.y * -0.06;
      }
      camera.lookAt(lookCurrent);
    }

    if (elapsed - lastLogTick > 0.65) {
      lastLogTick = elapsed;
      logScreen.tick();
    }

    const pulse = REDUCED ? 0.85 : 0.65 + 0.35 * Math.sin(elapsed * 3.1);
    for (const m of alarmMats) {
      m.color.setHex(alarmActive ? 0xff2d3a : 0x46e6a0);
    }
    alarmLight1.color.setHex(alarmActive ? 0xff2d3a : 0x46e6a0);
    alarmLight2.color.setHex(alarmActive ? 0xff2d3a : 0x46e6a0);
    alarmLight1.intensity = alarmActive ? 1.8 + pulse * 0.8 : 0.45;
    alarmLight2.intensity = alarmActive ? 1.2 + pulse * 0.6 : 0.3;

    for (const led of ledMeshes) {
      const on = Math.sin(elapsed * 2.4 + led.phase) > 0;
      led.mesh.material.color.setHex(on ? (led.phase > 3 ? 0x46e6a0 : 0x4f8cff) : 0x0b1220);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, setStation, setAlarm, project, update, render, resize };
}
