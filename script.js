// lib
// --------------------------------

const { log } = console;
const { PI, abs, sqrt, floor, round, ceil, min, max, sin, cos, tan, random } = Math;
const TwoPI = PI * 2;
const Deg = TwoPI / 360;

const rand = (min, max) => random() * (max - min) + min;
const randInt = (min, max) => Math.round(rand(min, max));
const randSign = () => [-1, 1][randInt(0, 1)];
const mkArr = n => Array(n).fill(0);
const callNGet = fn => (fn(), fn);

// ================================

// colors
// --------------------------------

function HSL(h, s, l) {
  this.h = h ?? 0;
  this.s = s ?? 100;
  this.l = l ?? 50;
  this.str = () => `hsl(${this.h}, ${this.s}%, ${this.l}%)`;
}

// ================================

// canvas
// --------------------------------

const canvas = document.getElementById("canvas");
const canvasCtx = canvas.getContext("2d");

let cw, ch, hfcw, hfch;

const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cw = canvas.width;
  ch = canvas.height;
  hfcw = cw / 2;
  hfch = ch / 2;
};

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ================================

// media
// --------------------------------

const med = new Audio();
med.src = "audio.webm";
med.load();

const medCtx = new AudioContext();
const medAzr = medCtx.createAnalyser();
const medSrc = medCtx.createMediaElementSource(med);

medSrc.connect(medAzr);
medAzr.connect(medCtx.destination);

const MedDatLen = medAzr.frequencyBinCount;
const medDat = new Uint8Array(MedDatLen);

let medDatMod = mkArr(MedDatLen);
let medDatAvg = 0;

const updateMedDat = () => {
  medAzr.getByteTimeDomainData(medDat);
  medDatMod = [].slice.call(medDat).map(v => abs(v - 128) / 128);
  medDatAvg = medDatMod.reduce((s, v) => s + v, 0) / MedDatLen;
};

// ================================

// polar equations
// --------------------------------

const r2xy = (r, t, s) => ({
  x: hfcw + r * cos(t) * s,
  y: hfch + r * sin(t) * s,
});

const polEqs = [
  {
    id: 0,
    s: 15,
    t: TwoPI,
    eqs: [t => 8 + 7 * sin(t), t => 8 + 7 * cos(t), t => 8 - 7 * sin(t), t => 8 - 7 * cos(t)],
  },

  {
    id: 1,
    s: 20,
    t: 20 * PI,
    eqs: [t => 10 + sin(TwoPI * t)],
  },

  {
    id: 2,
    s: 250,
    t: TwoPI,
    eqs: [t => sin(6 * t), t => cos(6 * t)],
  },

  {
    id: 3,
    s: 20,
    t: TwoPI,
    eqs: mkArr(12).map((_, i) => t => (i + 1) * cos(6 * t)),
  },

  {
    id: 4,
    s: 50,
    t: TwoPI,
    eqs: [t => 2 + cos(6 * t), t => 4 + cos(6 * t)],
  },

  {
    id: 5,
    s: 10,
    t: TwoPI,
    eqs: mkArr(12).map((_, i) => t => 12 + (i + 1) * sin(7 * t)),
  },

  {
    id: 6,
    s: 10,
    t: TwoPI,
    eqs: [
      t => 0.5,
      t => 3 - abs(cos(t * 5 + PI)) * 2,
      t => 6 - min(abs(tan(t * 5 + PI)) / 10, 3),
      t => 8 - min(abs(tan(t + PI)) / 20, 5),
      t => 10 + min(abs(tan(t + PI)) / 10, 3),
      t => 16 - min(abs(tan(t + PI)) / 10, 3),
      t => 22 - min(abs(tan(t + PI)) / 10, 9),
      t => 7 - min(abs(tan(t + PI)) / 20, 3) + sin(t * 20 - PI / 2) * 0.5,
      t => max(22 + abs(tan((t * 20) ** 2)), 22) - min(abs(tan(t + PI)) / 10, 9),
    ],
  },

  {
    id: 7,
    s: 20,
    t: TwoPI,
    eqs: [
      t => 1,
      t => 2 + cos(t * 6 + PI),
      t => 4 + cos(t * 6),
      t => 6 + cos(t * 6 + PI),
      t => 8 + cos(t * 6),
      t => 10 + cos(t * 6 + PI),
      t => 11.5 + cos(t * 6) * 0.99 * 0.5,
    ],
  },
];

let polEq;

const changePolEq = callNGet(() => {
  let newPolEq;

  do {
    newPolEq = polEqs[randInt(0, polEqs.length - 1)];
  } while (newPolEq === polEq);

  polEq = newPolEq;
  console.log("New Eq:", polEq);
});

// ================================

// particles
// --------------------------------

const pCount = MedDatLen * 2;
const pMedIdxOff = MedDatLen / pCount;
const pColor = new HSL(0, 0, 50);
const pSmooth = 10;
const pFluid = 0.8;

let pColorStr = pColor.str();

function Particle(medIdx) {
  this.x = hfcw;
  this.y = hfch;
  this.t = null;
  this.s = 1;
  this.eq = null;
  this.r = 1;
  this.sw = 1;
  this.medIdx = medIdx;

  this.draw = () => {
    canvasCtx.strokeStyle = pColorStr;
    canvasCtx.lineWidth = this.sw;
    canvasCtx.beginPath();
    canvasCtx.arc(this.x, this.y, this.r, 0, TwoPI);
    canvasCtx.stroke();
  };

  this.update = () => {
    const beat = medDatMod[this.medIdx];

    this.s = beat * 1.5 + 1;

    const { x: tx, y: ty } = r2xy(this.eq(this.t), this.t, polEq.s * this.s);

    this.x += (tx - this.x) / pSmooth;
    this.y += (ty - this.y) / pSmooth;

    this.t += Deg / 4;
    this.r = beat * 9 + 1;
  };
}

const particles = mkArr(pCount).map((_, i) => new Particle(floor(i * pMedIdxOff)));

const setParticles = callNGet(() => {
  const { eqs } = polEq;
  const tStep = (polEq.t / pCount) * eqs.length;

  for (let i = 0; i < pCount; i += eqs.length) {
    for (let j = 0; j < eqs.length; j++) {
      const p = particles[i + j];

      if (p) {
        p.t = i * tStep;
        p.eq = eqs[j];
      }
    }
  }
});

setInterval(() => {
  changePolEq();
  setParticles();
}, 5000);

const drawParticles = () => {
  canvasCtx.fillStyle = `rgba(0, 0, 0, ${1 - pFluid})`;
  canvasCtx.fillRect(0, 0, cw, ch);
  particles.forEach(p => p.draw());
};

const updateParticles = () => {
  pColor.s = medDatAvg * 75 + 25;
  pColor.h++;
  pColorStr = pColor.str();
  particles.forEach(p => p.update());
};

const animate = () => {
  updateMedDat();
  drawParticles();
  updateParticles();
  setTimeout(animate, 1000 / 60);
};

animate();

document.onkeydown = e => {
  medCtx.resume();

  e.code === "Space" && med[med.paused ? "play" : "pause"]();
  e.code === "ArrowLeft" && (med.currentTime -= 10);
  e.code === "ArrowRight" && (med.currentTime += 10);
};
