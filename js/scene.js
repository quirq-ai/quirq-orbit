// ==================================================================
// 3D SCENE: orbiting dot-pattern globes, starfield, camera fly-to.
// ==================================================================
import * as THREE from 'three';
import { drawIcon } from './icons.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORBIT_RADIUS = 2.25;
const HOME_DIR = new THREE.Vector3(0, 0.17, 1).normalize();

// ---------- shaders ----------
const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const OCEAN_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uBase; uniform float uOpacity; uniform float uHover;
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    float facing = max(dot(n, normalize(vV)), 0.0);
    float rim = pow(1.0 - facing, 2.6);
    float light = dot(n, normalize(vec3(-0.55, 0.65, 0.5))) * 0.5 + 0.5;
    vec3 c = uBase + uColor * 0.05;
    c *= 0.7 + 0.45 * light;
    c += uColor * rim * (0.42 + 0.35 * uHover);
    gl_FragColor = vec4(c, uOpacity * 0.94);
  }`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uStrength;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = clamp(-dot(normalize(vN), normalize(vV)) / 0.74, 0.0, 1.0);
    float a = pow(f, 3.2) * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }`;

const STAR_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float uTime; uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aPhase * 0.9) + aPhase * 6.2831);
    vAlpha = tw;
    gl_PointSize = aSize * uPixelRatio * (60.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;

const STAR_FRAG = /* glsl */ `
  uniform vec3 uColor; varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float a = pow(1.0 - r * 2.0, 1.6) * vAlpha;
    gl_FragColor = vec4(uColor, a * 0.85);
  }`;

// ---------- icon to dots ----------
// Dots sit on latitude rings with near-even spacing. A dot is kept when the
// icon, projected head-on onto the sphere at one of two facing longitudes,
// covers it. Orthographic projection keeps the icon undistorted when it faces
// the camera.
function sampleDots(iconId) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  drawIcon(ctx, iconId, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const alphaAt = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= S || iy >= S) return 0;
    return px[(iy * S + ix) * 4 + 3];
  };

  const step = 0.043;
  const span = 0.66; // half-width of the icon on the unit sphere
  const centers = [0, Math.PI];
  const out = [];
  for (let lat = -1.3; lat <= 1.3; lat += step) {
    const ring = Math.cos(lat);
    const count = Math.max(1, Math.floor((Math.PI * 2 * ring) / step));
    const off = (Math.round(lat / step) % 2) * 0.5; // brick offset for a halftone feel
    for (let k = 0; k < count; k++) {
      const lon = ((k + off) / count) * Math.PI * 2;
      for (const c of centers) {
        const dl = lon - c;
        const z = ring * Math.cos(dl);
        if (z < 0.25) continue;
        const x = ring * Math.sin(dl);
        const y = Math.sin(lat);
        const u = (x / span) * 0.5 + 0.5;
        const v = 0.5 - (y / span) * 0.5;
        if (alphaAt(u * S, v * S) > 110) {
          out.push(new THREE.Vector3(ring * Math.sin(lon), y, ring * Math.cos(lon)));
          break;
        }
      }
    }
  }
  return out;
}

function makePlanet(sec) {
  const R = sec.size;
  const color = new THREE.Color(sec.color);
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  group.add(spinner);

  const oceanMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uBase: { value: new THREE.Color('#070a12') },
      uOpacity: { value: 1 },
      uHover: { value: 0 },
    },
    vertexShader: RIM_VERT,
    fragmentShader: OCEAN_FRAG,
    transparent: true,
  });
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), oceanMat);
  ocean.renderOrder = 1;
  spinner.add(ocean);

  const pts = sampleDots(sec.icon);
  const dotGeo = new THREE.CircleGeometry(R * 0.0155, 6);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, pts.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const one = new THREE.Vector3(1, 1, 1);
  const tint = new THREE.Color();
  pts.forEach((n, i) => {
    q.setFromUnitVectors(zAxis, n);
    m.compose(n.clone().multiplyScalar(R * 1.006), q, one);
    dots.setMatrixAt(i, m);
    tint.copy(color).multiplyScalar(0.78 + Math.random() * 0.34);
    dots.setColorAt(i, tint);
  });
  dots.renderOrder = 2;
  spinner.add(dots);

  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uStrength: { value: 0.9 } },
    vertexShader: RIM_VERT,
    fragmentShader: GLOW_FRAG,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.6, 48, 32), glowMat);
  glow.renderOrder = 3;
  group.add(glow);

  const hit = new THREE.Mesh(new THREE.SphereGeometry(R * 1.25, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.id = sec.id;
  group.add(hit);

  // start with an icon roughly facing the camera
  spinner.rotation.y = Math.random() * 0.6 - 0.3;

  return {
    id: sec.id, R, group, spinner, hit, oceanMat, dotMat, glowMat,
    scale: 1, fade: 1, hover: 0, spinVel: 0,
  };
}

function makeStars(count, rMin, rMax) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin));
    pos.set([v.x, v.y, v.z], i * 3);
    size[i] = Math.random() < 0.08 ? 2.6 + Math.random() * 1.6 : 0.8 + Math.random() * 1.4;
    phase[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      uColor: { value: new THREE.Color('#eef2f8') },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

// ==================================================================
export function createScene({ canvas, labelsEl, sections, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);

  // starfield + dust
  const stars = makeStars(1600, 40, 120);
  const dust = makeStars(260, 4, 16);
  dust.material.uniforms.uColor.value = new THREE.Color('#bcd3ff');
  scene.add(stars, dust);

  // faint distant planets
  const minis = [
    { c: '#1d3f99', r: 0.2, o: 8.5, t: 0.3, s: 0.05 },
    { c: '#1b5f86', r: 0.24, o: 11, t: -0.2, s: 0.032 },
    { c: '#3a338c', r: 0.15, o: 15, t: 0.5, s: 0.02 },
    { c: '#3b4a66', r: 0.18, o: 20, t: -0.35, s: 0.012 },
  ].map((d, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(d.r, 24, 16),
      new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: 0.22 }),
    );
    scene.add(mesh);
    return { ...d, mesh, a: i * 1.7 };
  });

  // orbit system
  const tilt = new THREE.Group();
  tilt.rotation.set(0.32, 0, -0.14);
  const orbit = new THREE.Group();
  tilt.add(orbit);
  scene.add(tilt);

  // faint orbit ring
  const ringPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * ORBIT_RADIUS, 0, Math.sin(a) * ORBIT_RADIUS));
  }
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineDashedMaterial({ color: 0xeef2f8, transparent: true, opacity: 0.09, dashSize: 0.05, gapSize: 0.09 }),
  );
  ring.computeLineDistances();
  tilt.add(ring);

  const planets = sections.map((sec, i) => {
    const p = makePlanet(sec);
    const a = (i / sections.length) * Math.PI * 2 + 0.35;
    const r = ORBIT_RADIUS * (0.92 + (i % 2) * 0.12);
    p.group.position.set(Math.cos(a) * r, (i % 3 - 1) * 0.28, Math.sin(a) * r);
    p.angle = a;
    orbit.add(p.group);

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'globe-label';
    label.textContent = sec.label;
    label.style.setProperty('--c', sec.color);
    label.addEventListener('click', () => onSelect(sec.id));
    label.addEventListener('pointerenter', () => (hoverId = sec.id));
    label.addEventListener('pointerleave', () => (hoverId = null));
    labelsEl.appendChild(label);
    p.label = label;
    return p;
  });
  const byId = Object.fromEntries(planets.map((p) => [p.id, p]));
  const hitMeshes = planets.map((p) => p.hit);

  // ---------- state ----------
  let mode = 'home'; // home | focus
  let focusId = null;
  let hoverId = null;
  let yaw = 0;
  let yawVel = 0;
  let focusYaw = 0;
  let pitch = 0;
  let pitchVel = 0;
  let autoSpin = REDUCED ? 0.0006 : 0.0016;

  const cur = {
    look: new THREE.Vector3(),
    pos: new THREE.Vector3().copy(HOME_DIR).multiplyScalar(9),
    cx: 0, cy: 0,
    ready: false,
  };
  let W = 1, H = 1;

  // Where on screen the target should sit and how far away the camera is.
  function frame() {
    const mobile = W < 820;
    if (mode === 'home') {
      if (mobile) return { cx: W * 0.5, cy: H * 0.7, dist: Math.max(13.5, 9.5 / (W / H)) };
      return { cx: W * 0.6, cy: H * 0.47, dist: Math.max(8.6, 12.5 / (W / H)) };
    }
    const p = byId[focusId];
    const detail = document.body.classList.contains('detail-open');
    if (mobile) return { cx: W * 0.5, cy: H * 0.15, dist: p.R * 15 };
    if (detail) return { cx: 180, cy: 150, dist: p.R * 19 };
    const panel = document.getElementById('panel');
    const pw = panel ? panel.getBoundingClientRect().width : W * 0.45;
    return { cx: (W - pw) / 2, cy: H * 0.52, dist: p.R * 7.6 };
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (!cur.ready) {
      const f = frame();
      cur.cx = f.cx; cur.cy = f.cy;
      cur.pos.copy(HOME_DIR).multiplyScalar(f.dist);
      cur.ready = true;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- pointer ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null;
  let pointer = null;

  function pick(clientX, clientY) {
    // account for the view offset: NDC must be computed in the shifted frame
    ndc.set((clientX / W) * 2 - 1, -(clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitMeshes, false);
    for (const h of hits) {
      const id = h.object.userData.id;
      if (mode === 'home' || id === focusId) return id;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!drag) return;
    const dx = e.clientX - drag.lx;
    const dy = e.clientY - drag.ly;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'home') {
      yawVel = dx * 0.0042;
      pitchVel = dy * 0.0018;
    } else if (focusId) {
      byId[focusId].spinVel = dx * 0.006;
    }
  });
  const end = (e) => {
    if (drag && drag.moved < 6) {
      const id = pick(e.clientX, e.clientY);
      if (id && mode === 'home') onSelect(id);
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => (drag = null));
  canvas.addEventListener('pointerleave', () => (pointer = null));

  // ---------- public ----------
  function focus(id) {
    if (!byId[id]) return;
    mode = 'focus';
    focusId = id;
    // swing the orbit so the chosen globe comes to the front (rotation.y = angle - 90deg)
    const want = byId[id].angle - Math.PI / 2;
    const TAU = Math.PI * 2;
    const delta = ((((want - yaw) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
    focusYaw = yaw + delta;
    yawVel = 0;
  }
  function home() {
    mode = 'home';
    focusId = null;
  }

  // ---------- loop ----------
  const tmp = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const clock = new THREE.Clock();
  let raf = 0;

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.pow(0.0025, dt); // frame-rate independent easing (~6%/frame at 60fps)

    stars.material.uniforms.uTime.value = t;
    dust.material.uniforms.uTime.value = t * 1.3;
    stars.rotation.y = t * 0.004;
    dust.rotation.y = -t * 0.012;

    minis.forEach((mp) => {
      mp.a += mp.s * dt;
      mp.mesh.position.set(Math.cos(mp.a) * mp.o, Math.sin(mp.a * 0.7) * mp.t * mp.o * 0.3 - 1, Math.sin(mp.a) * mp.o - 6);
    });

    // orbit rotation
    const spinTarget = mode === 'home' ? autoSpin : 0;
    if (!drag) {
      yawVel *= Math.pow(0.04, dt);
      pitchVel *= Math.pow(0.04, dt);
    }
    if (mode === 'focus') yaw += (focusYaw - yaw) * k * 0.8;
    else yaw += spinTarget * dt * 60 + yawVel;
    pitch = THREE.MathUtils.clamp(pitch + pitchVel, -0.25, 0.3);
    if (!drag) pitch += (0 - pitch) * k * 0.3;
    orbit.rotation.y = yaw;
    tilt.rotation.x = 0.32 + pitch;

    // hover (canvas pointer or label)
    let hovered = hoverId;
    if (!hovered && pointer && !drag) hovered = pick(pointer.x, pointer.y);
    canvas.style.cursor = drag && drag.moved > 6 ? 'grabbing' : hovered && mode === 'home' ? 'pointer' : 'grab';

    planets.forEach((p) => {
      const isFocus = p.id === focusId;
      const isHover = p.id === hovered;
      const targetFade = mode === 'home' || isFocus ? 1 : 0.12;
      p.fade += (targetFade - p.fade) * k;
      p.hover += ((isHover ? 1 : 0) - p.hover) * k * 1.5;
      const targetScale = 1 + p.hover * 0.08;
      p.scale += (targetScale - p.scale) * k;
      p.group.scale.setScalar(p.scale);

      // spin: steady drift plus drag inertia
      p.spinVel *= Math.pow(0.08, dt);
      p.spinner.rotation.y += (REDUCED ? 0.0008 : 0.0035) * dt * 60 + p.spinVel;

      p.oceanMat.uniforms.uOpacity.value = p.fade;
      p.oceanMat.uniforms.uHover.value = p.hover;
      p.dotMat.opacity = p.fade;
      p.glowMat.uniforms.uStrength.value = (0.72 + p.hover * 0.5) * p.fade;
      p.group.visible = p.fade > 0.01;
    });

    // camera targets
    const f = frame();
    const lookTarget = mode === 'focus' ? byId[focusId].group.getWorldPosition(tmp) : tmp.set(0, 0, 0);
    cur.look.lerp(lookTarget, k);
    const posTarget = proj.copy(HOME_DIR).multiplyScalar(f.dist).add(cur.look);
    cur.pos.lerp(posTarget, k);
    cur.cx += (f.cx - cur.cx) * k;
    cur.cy += (f.cy - cur.cy) * k;

    camera.position.copy(cur.pos);
    camera.lookAt(cur.look);
    camera.setViewOffset(W, H, W / 2 - cur.cx, H / 2 - cur.cy, W, H);

    renderer.render(scene, camera);

    // labels
    planets.forEach((p) => {
      p.group.getWorldPosition(tmp);
      const depth = tmp.clone().applyMatrix4(camera.matrixWorldInverse).z;
      tmp.y += p.R * p.scale * 1.42;
      proj.copy(tmp).project(camera);
      const x = (proj.x * 0.5 + 0.5) * W;
      const y = (-proj.y * 0.5 + 0.5) * H;
      p.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      const centerDepth = -cur.look.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const behind = -depth > centerDepth + 0.6;
      p.label.classList.toggle('behind', mode === 'home' && behind);
      p.label.classList.toggle('active', p.id === focusId);
      p.label.classList.toggle('hover', p.id === hovered && mode === 'home');
      p.label.classList.toggle('hidden', mode === 'focus' && p.id !== focusId);
      p.label.style.zIndex = String(1000 - Math.round(-depth * 10));
    });
  }
  tick();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { clock.getDelta(); tick(); }
  });

  return { focus, home };
}
