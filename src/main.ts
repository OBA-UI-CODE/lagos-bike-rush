import * as THREE from "three";
import "./style.css";
import { getLeaderboard, getPlayer, saveScore, signIn, type CharacterStyle, type StartNgPlayer } from "./startng";

type RiderKind = "startng" | "monkey" | "robot";
type GameState = "menu" | "countdown" | "playing" | "paused" | "over";
type Traffic = { mesh: THREE.Group; lane: number; passed: boolean; width: number; length: number; speedFactor: number };

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const canvas = $("#game") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x93bbc0);
scene.fog = new THREE.Fog(0x93bbc0, 42, 150);

const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 4.7, 9.4);
camera.lookAt(0, 1.2, -15);

scene.add(new THREE.HemisphereLight(0xd9f8ff, 0x324225, 2.25));
const sun = new THREE.DirectionalLight(0xffe2b0, 3.2);
sun.position.set(-18, 28, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -20;
scene.add(sun);

const road = new THREE.Group();
scene.add(road);
const asphalt = new THREE.MeshStandardMaterial({ color: 0x242b2c, roughness: 0.94 });
const curbMat = new THREE.MeshStandardMaterial({ color: 0xe8dfbd, roughness: 1 });
const grassMat = new THREE.MeshStandardMaterial({ color: 0x486f3a, roughness: 1 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xf5eee0, roughness: 0.8 });
const roadSegments: THREE.Group[] = [];

for (let index = 0; index < 12; index++) {
  const segment = new THREE.Group();
  segment.position.z = -index * 20;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(15, 0.12, 20), asphalt);
  slab.receiveShadow = true;
  segment.add(slab);
  for (const laneX of [-2.5, 2.5]) {
    for (let z = -8; z <= 8; z += 8) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 3.6), lineMat);
      stripe.position.set(laneX, 0.095, z);
      segment.add(stripe);
    }
  }
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 20), curbMat);
    curb.position.set(side * 7.72, 0.08, 0);
    curb.receiveShadow = true;
    segment.add(curb);
    const verge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.08, 20), grassMat);
    verge.position.set(side * 16.7, -0.03, 0);
    segment.add(verge);
  }
  road.add(segment);
  roadSegments.push(segment);
}

const scenery = new THREE.Group();
scene.add(scenery);
const buildingMats = [0xd46b42, 0xd7b75f, 0x6d968e, 0xb7796d, 0xd9d0b4].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
for (let index = 0; index < 48; index++) {
  const side = index % 2 ? 1 : -1;
  const width = 4 + Math.random() * 5;
  const height = 3 + Math.random() * 9;
  const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, 5 + Math.random() * 4), buildingMats[index % buildingMats.length]);
  building.position.set(side * (11 + Math.random() * 9), height / 2, -index * 5 - Math.random() * 8);
  building.castShadow = true;
  building.receiveShadow = true;
  building.userData.baseZ = building.position.z;
  scenery.add(building);
}

const bike = new THREE.Group();
scene.add(bike);
bike.position.set(0, 0.08, 1.2);

const darkMat = new THREE.MeshStandardMaterial({ color: 0x111516, roughness: 0.45, metalness: 0.55 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9fa8a8, roughness: 0.22, metalness: 0.9 });
const bikeMat = new THREE.MeshStandardMaterial({ color: 0xc83224, roughness: 0.38, metalness: 0.35 });
const wheelGeo = new THREE.TorusGeometry(0.43, 0.1, 10, 22);
for (const z of [-0.78, 0.85]) {
  const wheel = new THREE.Mesh(wheelGeo, darkMat);
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(0, 0.48, z);
  wheel.castShadow = true;
  bike.add(wheel);
}
const tank = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), bikeMat);
tank.scale.set(0.78, 0.7, 1.2);
tank.position.set(0, 0.91, 0.2);
tank.castShadow = true;
bike.add(tank);
const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.45), chromeMat);
chassis.position.set(0, 0.57, 0.05);
chassis.rotation.x = -0.12;
bike.add(chassis);
const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.75), darkMat);
seat.position.set(0, 1.03, 0.54);
seat.rotation.x = -0.08;
bike.add(seat);
const handlebars = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8), chromeMat);
handlebars.rotation.z = Math.PI / 2;
handlebars.position.set(0, 1.2, -0.55);
bike.add(handlebars);
const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe169, emissiveIntensity: 2 }));
headlight.position.set(0, 1.12, -0.82);
bike.add(headlight);

let rider = new THREE.Group();
bike.add(rider);
let player: StartNgPlayer = { name: "Guest Rider", style: {}, signedIn: false };

function color(value: string | undefined, fallback: number): THREE.ColorRepresentation {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;
}

function createRider(kind: RiderKind, style: CharacterStyle): THREE.Group {
  const group = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: color(style.primaryColor, 0xe8ff46), roughness: 0.75 });
  const bottom = new THREE.MeshStandardMaterial({ color: color(style.secondaryColor, 0x17211c), roughness: 0.78 });
  const skin = new THREE.MeshStandardMaterial({ color: color(style.skinColor, 0x8d5524), roughness: 0.86 });
  const hair = new THREE.MeshStandardMaterial({ color: color(style.hairColor, 0x17120f), roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa8b9b7, roughness: 0.25, metalness: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.65, 5, 10), kind === "robot" ? metal : top);
  body.position.set(0, 1.75, 0.35);
  body.rotation.x = -0.22;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(kind === "monkey" ? 0.33 : 0.29, 14, 10), kind === "robot" ? metal : skin);
  head.position.set(0, 2.47, 0.03);
  group.add(head);
  if (kind === "monkey") {
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), skin);
    muzzle.scale.set(1, 0.72, 0.7);
    muzzle.position.set(0, 2.39, -0.25);
    group.add(muzzle);
    for (const x of [-0.31, 0.31]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
      ear.position.set(x, 2.5, 0.04);
      group.add(ear);
    }
  } else if (kind === "robot") {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x071414, emissive: 0xe8ff46, emissiveIntensity: 2 }));
    visor.position.set(0, 2.49, -0.27);
    group.add(visor);
  } else {
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairMesh.position.set(0, 2.55, 0.03);
    group.add(hairMesh);
  }
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.42), bottom);
  hips.position.set(0, 1.28, 0.55);
  group.add(hips);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.73, 4, 8), kind === "robot" ? metal : top);
    arm.position.set(side * 0.34, 1.86, -0.03);
    arm.rotation.x = -1.12;
    arm.rotation.z = side * 0.15;
    group.add(arm);
  }
  group.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
  return group;
}

function setRider(kind: RiderKind): void {
  bike.remove(rider);
  rider = createRider(kind, player.style);
  bike.add(rider);
}

const traffic: Traffic[] = [];
const lanes = [-5, 0, 5];
const vehicleColors = [0xe3e1d6, 0x185b82, 0xcda12a, 0xa8322f, 0x26352f, 0xe88923];

function makeVehicle(type: "car" | "danfo" | "bus" | "bike", index: number): Traffic {
  const group = new THREE.Group();
  const isBike = type === "bike";
  const width = isBike ? 0.9 : type === "bus" ? 2.25 : 1.75;
  const length = isBike ? 2.1 : type === "bus" ? 5.5 : type === "danfo" ? 4.1 : 3.7;
  const height = type === "bus" ? 2.9 : type === "danfo" ? 2.2 : isBike ? 0.85 : 1.45;
  const paint = new THREE.MeshStandardMaterial({ color: type === "danfo" ? 0xf1b928 : vehicleColors[index % vehicleColors.length], roughness: 0.5, metalness: 0.2 });
  if (isBike) {
    for (const z of [-0.72, 0.72]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), darkMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.34, z);
      group.add(wheel);
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 1.15), paint);
    body.position.y = 0.55;
    group.add(body);
    const riderMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 8), new THREE.MeshStandardMaterial({ color: 0x253b66 }));
    riderMesh.position.set(0, 1.2, 0.1);
    group.add(riderMesh);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), paint);
    body.position.y = height / 2 + 0.32;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const glass = new THREE.MeshStandardMaterial({ color: 0x78a4aa, roughness: 0.2, metalness: 0.2 });
    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, height * 0.38, 0.05), glass);
    windscreen.position.set(0, height * 0.72 + 0.32, length / 2 + 0.03);
    group.add(windscreen);
    for (const x of [-width * 0.4, width * 0.4]) for (const z of [-length * 0.3, length * 0.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 12), darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      group.add(wheel);
    }
    if (type === "danfo") {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.25, length + 0.03), new THREE.MeshStandardMaterial({ color: 0x161b1b }));
      stripe.position.y = 1.05;
      group.add(stripe);
    }
  }
  group.visible = false;
  scene.add(group);
  return { mesh: group, lane: 0, passed: false, width, length, speedFactor: 1 };
}

const types: Array<"car" | "danfo" | "bus" | "bike"> = ["car", "car", "danfo", "bike", "car", "bus", "bike", "car", "danfo", "car", "bike", "bus"];
types.forEach((type, index) => traffic.push(makeVehicle(type, index)));

let state: GameState = "menu";
let speed = 20;
let dodges = 0;
let distance = 0;
let elapsed = 0;
let spawnTimer = 0;
let targetX = 0;
let steer = 0;
let muted = false;
let audio: AudioContext | undefined;
let engineOscillator: OscillatorNode | undefined;
let engineGain: GainNode | undefined;
const clock = new THREE.Clock();

function startAudio(): void {
  if (muted) return;
  audio ??= new AudioContext();
  if (!engineOscillator) {
    engineOscillator = audio.createOscillator();
    engineGain = audio.createGain();
    engineOscillator.type = "sawtooth";
    engineGain.gain.value = 0.025;
    engineOscillator.connect(engineGain).connect(audio.destination);
    engineOscillator.start();
  }
  void audio.resume();
}

function beep(frequency: number, duration: number, volume = 0.08): void {
  if (muted || !audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function resetTraffic(): void {
  traffic.forEach((item) => { item.mesh.visible = false; item.passed = false; });
}

function spawnTraffic(): void {
  const item = traffic.find((candidate) => !candidate.mesh.visible);
  if (!item) return;
  const activeLanes = traffic.filter((candidate) => candidate.mesh.visible && candidate.mesh.position.z < -30).map((candidate) => candidate.lane);
  const choices = [0, 1, 2].filter((lane) => !activeLanes.includes(lane) || Math.random() > 0.65);
  item.lane = choices[Math.floor(Math.random() * choices.length)] ?? Math.floor(Math.random() * 3);
  item.mesh.position.set(lanes[item.lane], 0, -96 - Math.random() * 34);
  item.mesh.rotation.y = 0;
  item.mesh.visible = true;
  item.passed = false;
  item.speedFactor = 0.78 + Math.random() * 0.18;
}

function primeTraffic(): void {
  [-35, -57, -78].forEach((z, index) => {
    spawnTraffic();
    const active = traffic.filter((item) => item.mesh.visible);
    const newest = active[active.length - 1];
    if (newest) {
      newest.lane = index;
      newest.mesh.position.set(lanes[index], 0, z);
    }
  });
}

function updateHud(): void {
  $("#dodge-count").textContent = String(dodges);
  $("#speed-value").textContent = String(Math.round(speed * 3.6));
  $("#distance-value").textContent = (distance / 1000).toFixed(2);
}

function showOnly(id: "start-screen" | "pause-screen" | "game-over" | null): void {
  ["#start-screen", "#pause-screen", "#game-over"].forEach((selector) => $(selector).classList.toggle("hidden", selector !== `#${id}`));
}

async function countdown(): Promise<void> {
  state = "countdown";
  showOnly(null);
  $("#hud").classList.remove("hidden");
  $("#touch-controls").classList.remove("hidden");
  $("#pause-button").classList.remove("hidden");
  const element = $("#countdown");
  element.classList.remove("hidden");
  for (const value of [3, 2, 1]) {
    element.textContent = String(value);
    beep(420 + value * 100, 0.12);
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  element.textContent = "GO";
  beep(900, 0.25);
  await new Promise((resolve) => setTimeout(resolve, 420));
  element.classList.add("hidden");
  state = "playing";
  clock.getDelta();
}

function startRun(): void {
  speed = 20;
  dodges = 0;
  distance = 0;
  elapsed = 0;
  spawnTimer = 0.3;
  targetX = 0;
  bike.position.x = 0;
  bike.rotation.set(0, 0, 0);
  resetTraffic();
  primeTraffic();
  updateHud();
  const kind = (document.querySelector<HTMLInputElement>('input[name="rider"]:checked')?.value ?? "startng") as RiderKind;
  setRider(kind);
  startAudio();
  void countdown();
}

async function endRun(): Promise<void> {
  if (state !== "playing") return;
  state = "over";
  beep(85, 0.7, 0.18);
  $("#flash").classList.remove("hit");
  void $("#flash").offsetWidth;
  $("#flash").classList.add("hit");
  $("#touch-controls").classList.add("hidden");
  $("#pause-button").classList.add("hidden");
  $("#final-dodges").textContent = String(dodges);
  $("#final-distance").textContent = `${(distance / 1000).toFixed(2)} km`;
  showOnly("game-over");
  const localBest = Math.max(Number(localStorage.getItem("lagos-bike-rush-best") ?? 0), dodges);
  localStorage.setItem("lagos-bike-rush-best", String(localBest));
  $("#score-message").textContent = player.signedIn ? "Saving this run to start.ng…" : `Local best: ${localBest}. Sign in to join the global board.`;
  if (player.signedIn) $("#score-message").textContent = await saveScore(dodges, Math.round(distance), Math.round(elapsed));
}

function togglePause(): void {
  if (state === "playing") {
    state = "paused";
    showOnly("pause-screen");
    $("#touch-controls").classList.add("hidden");
  } else if (state === "paused") {
    state = "playing";
    showOnly(null);
    $("#touch-controls").classList.remove("hidden");
    clock.getDelta();
  }
}

function updateTraffic(delta: number): void {
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnTraffic();
    const density = Math.max(0.34, 0.92 - dodges * 0.014);
    spawnTimer = density + Math.random() * 0.45;
  }
  for (const item of traffic) {
    if (!item.mesh.visible) continue;
    item.mesh.position.z += speed * item.speedFactor * delta;
    if (!item.passed && item.mesh.position.z > 3.2) {
      item.passed = true;
      dodges += 1;
      speed = Math.min(42, 20 + dodges * 0.48);
      beep(300 + Math.min(dodges, 20) * 12, 0.06, 0.035);
      updateHud();
    }
    const dz = Math.abs(item.mesh.position.z - bike.position.z);
    const dx = Math.abs(item.mesh.position.x - bike.position.x);
    if (dz < item.length * 0.48 + 0.65 && dx < item.width * 0.5 + 0.38) void endRun();
    if (item.mesh.position.z > 18) item.mesh.visible = false;
  }
}

function updateWorld(delta: number): void {
  const travel = speed * delta;
  for (const segment of roadSegments) {
    segment.position.z += travel;
    if (segment.position.z > 20) segment.position.z -= roadSegments.length * 20;
  }
  for (const object of scenery.children) {
    object.position.z += travel * 0.74;
    if (object.position.z > 28) object.position.z -= 245;
  }
  distance += travel;
  elapsed += delta;
}

function updateBike(delta: number): void {
  targetX = THREE.MathUtils.clamp(targetX + steer * delta * (7.5 + speed * 0.08), -6.25, 6.25);
  const previousX = bike.position.x;
  bike.position.x = THREE.MathUtils.damp(bike.position.x, targetX, 10, delta);
  const lateral = (bike.position.x - previousX) / Math.max(delta, 0.001);
  bike.rotation.z = THREE.MathUtils.damp(bike.rotation.z, -lateral * 0.028, 9, delta);
  bike.rotation.y = THREE.MathUtils.damp(bike.rotation.y, -steer * 0.08, 7, delta);
  bike.position.y = 0.08 + Math.sin(elapsed * 19) * 0.014;
  camera.position.x = THREE.MathUtils.damp(camera.position.x, bike.position.x * 0.34, 4.5, delta);
  camera.position.y = 4.7 + Math.sin(elapsed * 9) * 0.015;
  camera.lookAt(bike.position.x * 0.17, 1.2, -15);
  if (engineOscillator && audio) engineOscillator.frequency.setTargetAtTime(55 + speed * 2.2, audio.currentTime, 0.08);
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (state === "playing") {
    updateBike(delta);
    updateTraffic(delta);
    updateWorld(delta);
    updateHud();
  }
  renderer.render(scene, camera);
}

if (import.meta.env.DEV) {
  (window as Window & { __lagosBikeRushTest?: { forceCollision: () => void } }).__lagosBikeRushTest = {
    forceCollision: () => {
      const item = traffic[0];
      item.mesh.visible = true;
      item.mesh.position.set(bike.position.x, 0, bike.position.z);
      updateTraffic(0);
    },
  };
}

function setSteer(value: number): void { steer = value; }
addEventListener("keydown", (event) => {
  if (["ArrowLeft", "KeyA"].includes(event.code)) setSteer(-1);
  if (["ArrowRight", "KeyD"].includes(event.code)) setSteer(1);
  if (event.code === "KeyP" || event.code === "Escape") togglePause();
});
addEventListener("keyup", (event) => { if (["ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(event.code)) setSteer(0); });
document.querySelectorAll<HTMLButtonElement>("[data-control]").forEach((button) => {
  const value = button.dataset.control === "left" ? -1 : 1;
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); setSteer(value); });
  button.addEventListener("pointerup", () => setSteer(0));
  button.addEventListener("pointercancel", () => setSteer(0));
});

$("#start-button").addEventListener("click", startRun);
$("#restart-button").addEventListener("click", startRun);
$("#menu-button").addEventListener("click", () => { state = "menu"; resetTraffic(); $("#hud").classList.add("hidden"); showOnly("start-screen"); });
$("#pause-button").addEventListener("click", togglePause);
$("#resume-button").addEventListener("click", togglePause);
$("#sign-in-button").addEventListener("click", signIn);
$("#sound-button").addEventListener("click", () => {
  muted = !muted;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.025;
  $("#sound-button").textContent = muted ? "×" : "♪";
  $("#sound-button").setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
});
$("#leaderboard-button").addEventListener("click", async () => {
  $("#leaderboard").classList.remove("hidden");
  const list = $("#leaderboard-list");
  list.innerHTML = "<li>Loading…</li>";
  const entries = await getLeaderboard();
  list.replaceChildren(...(entries.length ? entries.map((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>#${entry.rank}</strong><span>${entry.name}</span><b>${entry.stats?.dodges ?? 0}</b>`;
    return item;
  }) : [Object.assign(document.createElement("li"), { textContent: "The first street legend could be you." })]));
});
$("#leaderboard-close").addEventListener("click", () => $("#leaderboard").classList.add("hidden"));

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
});
document.addEventListener("visibilitychange", () => { if (document.hidden && state === "playing") togglePause(); });

async function refreshPlayer(): Promise<void> {
  player = await getPlayer();
  $("#player-name").textContent = player.name;
  $("#player-account").textContent = player.account ? `@${player.account}` : "Start.ng guest";
  $("#sign-in-button").classList.toggle("hidden", player.signedIn);
  const face = $("#player-face") as HTMLImageElement;
  if (player.face) face.src = player.face;
  else face.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${String(color(player.style.primaryColor, 0xe8ff46))}"/><circle cx="32" cy="27" r="13" fill="${String(color(player.style.skinColor, 0x8d5524))}"/><path d="M10 64c2-18 12-25 22-25s20 7 22 25" fill="${String(color(player.style.secondaryColor, 0x17211c))}"/></svg>`)}`;
  $("#player-card").classList.remove("hidden");
  setRider("startng");
}

addEventListener("focus", () => void refreshPlayer());
void refreshPlayer();
animate();
