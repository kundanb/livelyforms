// lib
// --------------------------------

const { log } = console
const { PI: Pi, random, min, max, abs, sqrt } = Math
const { floor, round, ceil } = Math
const { sin, cos, tan } = Math
const Pi2 = Pi * 2
const Deg = Pi2 / 360

const rand = (n, x) => random() * (x - n) + n
const randInt = (n, x) => Math.round(rand(n, x))
const randSign = v => v * [-1, 1][randInt(0, 1)]
const mkArr = (n, v = 0) => Array(n).fill(v)
const callNGet = fn => (fn(), fn)

// colors
// --------------------------------

function HSL(h, s, l) {
  this.h = h ?? 0
  this.s = s ?? 100
  this.l = l ?? 50
  this.str = () => `hsl(${this.h}, ${this.s}%, ${this.l}%)`
}

// canvas
// --------------------------------

const canvas = document.getElementById('canvas')
const canvasCtx = canvas.getContext('2d')

let cw, ch, hfcw, hfch

const resizeCanvas = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  cw = canvas.width
  ch = canvas.height
  hfcw = cw / 2
  hfch = ch / 2
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)

// media
// --------------------------------

const aud = new Audio()
aud.src = 'audio.webm'
aud.load()

const audPicker = document.getElementById('audio-picker')
const audInput = document.getElementById('audio-input')

audPicker.onclick = () => audInput.click()
audInput.onchange = e => {
  const [file] = e.target.files
  if (file) aud.src = URL.createObjectURL(file)
  aud.load()
  aud.play()
}

const audCtx = new AudioContext()
const audAzr = audCtx.createAnalyser()
const audSrc = audCtx.createMediaElementSource(aud)

audSrc.connect(audAzr)
audAzr.connect(audCtx.destination)

const audDatLen = audAzr.frequencyBinCount
const audDat = new Uint8Array(audDatLen)

let audDatMod = mkArr(audDatLen)
let audDatAvg = 0

const updateAudDat = () => {
  audAzr.getByteTimeDomainData(audDat)
  audDatMod = [].slice.call(audDat).map(v => abs(v - 128) / 128)
  audDatAvg = audDatMod.reduce((s, v) => s + v, 0) / audDatLen
}

// equations
// --------------------------------

const xy = ({ x, y }, _, s) => ({
  x: x * s,
  y: y * s,
})

const r2xy = (r, t, s) => ({
  x: hfcw + r * cos(t) * s,
  y: hfch + r * sin(t) * s,
})

const eqGrps = [
  {
    id: 0,
    s: 15,
    t: Pi2,
    xy: r2xy,
    eqGrp: [
      t => 8 + 7 * sin(t),
      t => 8 + 7 * cos(t),
      t => 8 - 7 * sin(t),
      t => 8 - 7 * sin(t),
    ],
  },

  {
    id: 1,
    s: 20,
    t: 20 * Pi,
    xy: r2xy,
    eqGrp: [t => 10 + sin(Pi2 * t)],
  },

  {
    id: 2,
    s: 250,
    t: Pi2,
    xy: r2xy,
    eqGrp: [t => sin(6 * t), t => cos(6 * t)],
  },

  {
    id: 3,
    s: 20,
    t: Pi2,
    xy: r2xy,
    eqGrp: mkArr(12).map((_, i) => t => (i + 1) * cos(6 * t)),
  },

  {
    id: 4,
    s: 50,
    t: Pi2,
    xy: r2xy,
    eqGrp: [t => 2 + cos(6 * t), t => 4 + cos(6 * t)],
  },

  {
    id: 5,
    s: 10,
    t: Pi2,
    xy: r2xy,
    eqGrp: mkArr(12).map((_, i) => t => 12 + (i + 1) * sin(7 * t)),
  },

  {
    id: 6,
    s: 10,
    t: Pi2,
    xy: r2xy,
    eqGrp: [
      t => 0.5,
      t => 3 - abs(cos(t * 5 + Pi)) * 2,
      t => 6 - min(abs(tan(t * 5 + Pi)) / 10, 3),
      t => 8 - min(abs(tan(t + Pi)) / 20, 5),
      t => 10 + min(abs(tan(t + Pi)) / 10, 3),
      t => 16 - min(abs(tan(t + Pi)) / 10, 3),
      t => 22 - min(abs(tan(t + Pi)) / 10, 9),
      t => 7 - min(abs(tan(t + Pi)) / 20, 3) + sin(t * 20 - Pi / 2) * 0.5,
      t =>
        max(22 + abs(tan((t * 20) ** 2)), 22) - min(abs(tan(t + Pi)) / 10, 9),
    ],
  },

  {
    id: 7,
    s: 20,
    t: Pi2,
    xy: r2xy,
    eqGrp: [
      t => 1,
      t => 2 + cos(t * 6 + Pi),
      t => 4 + cos(t * 6),
      t => 6 + cos(t * 6 + Pi),
      t => 8 + cos(t * 6),
      t => 10 + cos(t * 6 + Pi),
      t => 11.5 + cos(t * 6) * 0.99 * 0.5,
    ],
  },
]

let activeEqGrp

const changePolEqGrp = callNGet(() => {
  let newEqGrp

  do {
    newEqGrp = eqGrps[randInt(0, eqGrps.length - 1)]
  } while (newEqGrp === activeEqGrp)

  activeEqGrp = newEqGrp
  console.log('Active Equation Group:', activeEqGrp)
})

// particles
// --------------------------------

const pCount = audDatLen * 2
const pMedIdxOff = audDatLen / pCount
const pColor = new HSL(0, 0, 50)
const pSmooth = 10
const pFluid = 0.8

let pColorStr = pColor.str()

function Particle(medIdx) {
  this.x = hfcw
  this.y = hfch
  this.t = null
  this.s = 1
  this.eq = null
  this.r = 1
  this.sw = 1
  this.medIdx = medIdx

  this.draw = () => {
    canvasCtx.strokeStyle = pColorStr
    canvasCtx.lineWidth = this.sw
    canvasCtx.beginPath()
    canvasCtx.arc(this.x, this.y, this.r, 0, Pi2)
    canvasCtx.stroke()
  }

  this.update = () => {
    const beat = audDatMod[this.medIdx] * audDatAvg * 3

    this.s = beat * 0.5 + 1
    this.t += Deg / 4
    this.r = beat * 4 + 1

    const { xy: eqXY, s: eqS } = activeEqGrp
    const target = eqXY(this.eq(this.t), this.t, eqS * this.s)

    this.x += (target.x - this.x) / pSmooth
    this.y += (target.y - this.y) / pSmooth
  }
}

const particles = mkArr(pCount).map(
  (_, i) => new Particle(floor(i * pMedIdxOff))
)

const setParticles = callNGet(() => {
  const { eqGrp } = activeEqGrp
  const tStep = (activeEqGrp.t / pCount) * eqGrp.length

  for (let i = 0; i < pCount; i += eqGrp.length) {
    for (let j = 0; j < eqGrp.length; j++) {
      const p = particles[i + j]

      if (p) {
        p.t = i * tStep
        p.eq = eqGrp[j]
      }
    }
  }
})

setInterval(() => {
  changePolEqGrp()
  setParticles()
}, 5000)

const drawParticles = () => {
  canvasCtx.fillStyle = `rgba(0, 0, 0, ${1 - pFluid})`
  canvasCtx.fillRect(0, 0, cw, ch)
  particles.forEach(p => p.draw())
}

const updateParticles = () => {
  pColor.s = audDatAvg * 75 + 25
  pColor.h++
  pColorStr = pColor.str()
  particles.forEach(p => p.update())
}

const animate = () => {
  updateAudDat()
  drawParticles()
  updateParticles()
  setTimeout(animate, 1000 / 60)
}

animate()

document.onkeydown = e => {
  audCtx.resume()

  e.code === 'Space' && aud[aud.paused ? 'play' : 'pause']()
  e.code === 'ArrowLeft' && (aud.currentTime -= 10)
  e.code === 'ArrowRight' && (aud.currentTime += 10)
}

canvas.onclick = () => {
  audCtx.resume()
  aud[aud.paused ? 'play' : 'pause']()
}
