const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('amor.js', 'utf8');
const fragmento = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));

function entorno() {
  const fuentes = [], ganancias = [];
  const audio = { currentTime: 0, state: 'running', destination: {},
    createOscillator() {
      const voz = { frequency: { setValueAtTime(v) { voz.frecuencia = v; }, exponentialRampToValueAtTime() {} },
        connect() {}, disconnect() {}, start(t) { voz.inicio = t; },
        stop(t = audio.currentTime) { voz.fin = t; } };
      fuentes.push(voz); return voz;
    },
    createGain() {
      const gain = { value: 0, maximo: 0, cancelScheduledValues() {},
        setValueAtTime(v) { this.value = v; this.maximo = Math.max(this.maximo, v); },
        linearRampToValueAtTime(v) { this.value = v; this.maximo = Math.max(this.maximo, v); },
        exponentialRampToValueAtTime(v) { this.value = v; } };
      ganancias.push(gain); return { gain, connect() {}, disconnect() {} };
    } };
  const control = { classList: { remove() {}, toggle() {} }, style: { setProperty(k, v) { this[k] = v; } }, dataset: {} };
  const c = { Math, Number, String, cap2: { activo: true, estado: 'pensamiento', silencio: false,
      audio, tapsPensamiento: 0, bolitas: [control, control] },
    nodoCap2: control, document: { hidden: false }, recorrido: { pausaRevision: false },
    estaHorizontal: () => true, puedeInteractuarCap2: () => true,
    interpolar: (a, b, t) => a + (b - a) * t,
    mostrarRecuerdoCap2() {}, posicionarHaloCap2() {}, parpadearFondoCap2() {}, desbloquearAudioCap2() {},
    estadoCap2: estado => { c.cap2.estado = estado; }, leyendaCap2: control,
    botonPressCap2: { addEventListener(tipo, fn) { c.tap = fn; } } };
  vm.createContext(c);
  vm.runInContext(fragmento('const vocesPensamiento =', 'const desbloquearAudioCap2 =')
    + fragmento('const crecerPensamientoCap2 =', 'const iniciarEscrituraCap2 =')
    + fragmento('botonPressCap2.addEventListener("click",', 'accionCap2.addEventListener("click",')
    + '\nglobalThis.limpiar = detenerSonidosPensamiento; globalThis.pop = sonarPensamientoCap2;', c);
  return { c, audio, fuentes, ganancias };
}

test('cada uno de los seis taps válidos inicia un pop junto con el crecimiento; después no se activa', () => {
  const { c, fuentes } = entorno();
  c.pop(); assert.equal(fuentes.length, 0);
  for (let i = 0; i < 6; ++i) {
    c.tap();
    assert.equal(fuentes.length, i + 1);
    assert.equal(c.cap2.tapsPensamiento, i + 1);
    assert.equal(c.nodoCap2.dataset.sonidosPensamiento, String(i + 1));
  }
  assert.equal(c.nodoCap2.style['--pensamiento'], 1);
  assert.equal(c.cap2.estado, 'recuerdo');
  c.tap(); c.pop(); assert.equal(fuentes.length, 6);
  assert(new Set(fuentes.map(v => v.frecuencia)).size > 1);
});

test('ráfagas de taps conservan tres voces activas como máximo y volumen acotado', () => {
  const { c, audio, fuentes, ganancias } = entorno();
  for (let i = 0; i < 6; ++i) { audio.currentTime = i * .015; c.tap(); }
  const instantes = fuentes.flatMap(v => [v.inicio, v.fin, v.inicio + .00001]);
  for (const t of instantes) {
    assert(fuentes.filter(v => v.inicio <= t && v.fin > t).length <= 3);
  }
  for (const g of ganancias) assert(g.maximo <= .03);
  for (const v of fuentes) assert(v.fin - v.inicio <= .116);
  fuentes.forEach(v => v.onended());
  assert.equal(c.nodoCap2.dataset.vocesPensamiento, '0');
});

test('silencio conserva el gesto visual; pausa, orientación y estados ajenos no crean pops', () => {
  const { c, fuentes } = entorno();
  c.cap2.silencio = true; c.tap(); assert.equal(c.cap2.tapsPensamiento, 1); assert.equal(fuentes.length, 0);
  c.cap2.silencio = false; c.document.hidden = true; c.pop(); assert.equal(fuentes.length, 0);
  c.document.hidden = false; c.recorrido.pausaRevision = true; c.pop(); assert.equal(fuentes.length, 0);
  c.recorrido.pausaRevision = false; c.estaHorizontal = () => false; c.pop(); assert.equal(fuentes.length, 0);
  c.estaHorizontal = () => true; c.cap2.estado = 'escritura'; c.pop(); assert.equal(fuentes.length, 0);
  c.cap2.estado = 'pensamiento'; c.cap2.activo = false; c.pop(); assert.equal(fuentes.length, 0);
});

test('suspensión temporal no pierde la primera nota; limpiar impide colas al reanudar', () => {
  const { c, audio, fuentes } = entorno();
  audio.state = 'suspended'; c.tap(); assert.equal(fuentes.length, 1);
  c.limpiar(); assert.equal(c.nodoCap2.dataset.vocesPensamiento, '0');
  assert.equal(fuentes[0].fin, audio.currentTime);
});

test('Safari puede reanudar un contexto interrumpido y descarta colas después de una interrupción', () => {
  let limpiezas = 0, reanudaciones = 0;
  class Contexto {
    constructor() { this.state = 'suspended'; }
    resume() { ++reanudaciones; this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
  }
  const c = { cap2: { silencio: false, audio: null }, window: { AudioContext: Contexto },
    detenerSonidosPensamiento() { ++limpiezas; } };
  vm.createContext(c);
  vm.runInContext(fragmento('const desbloquearAudioCap2 =', 'const sonarCap2 =')
    + '\nglobalThis.desbloquear = desbloquearAudioCap2;', c);
  c.desbloquear(); assert.equal(reanudaciones, 1); assert.equal(limpiezas, 0);
  c.cap2.audio.state = 'interrupted'; c.cap2.audio.onstatechange();
  assert.equal(limpiezas, 1); c.desbloquear(); assert.equal(reanudaciones, 2);
});
