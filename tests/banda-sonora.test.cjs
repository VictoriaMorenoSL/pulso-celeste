const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");

const codigo = fs.readFileSync("assets/audio/banda-sonora.js", "utf8");
const esperar = () => new Promise((resolve) => setTimeout(resolve, 15));

test("las cuatro pistas físicas coinciden con el manifiesto y tienen datos MP3", () => {
  const manifiesto = JSON.parse(fs.readFileSync("assets/Audios/Musica/manifiesto.json", "utf8"));
  assert.equal(manifiesto.pistas.length, 4);
  for (const pista of manifiesto.pistas) {
    const audio = fs.readFileSync(`assets/Audios/Musica/${pista.archivo}`);
    assert(audio.length > 100000);
    assert.equal(audio[0], 255);
    assert.equal(crypto.createHash("sha256").update(audio).digest("hex"), pista.sha256);
    assert(pista.duracion_pcm_segundos >= 40);
  }
});

function entorno() {
  let vivas = 0, maximo = 0, peticiones = 0, falla = false;
  const fuentes = [], estados = [];
  class Contexto {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 60, length: 2646000 }); }
    createGain() {
      const gain = { value: 0, rampas: [], cancelScheduledValues() {},
        setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v, t) { this.value = v; this.rampas.push([v, t]); } };
      return { gain, connect() {}, disconnect() {} };
    }
    createBufferSource() {
      const fuente = { offset: null, detenida: false, connect() {}, disconnect() {},
        start(t, offset) { this.offset = offset; ++vivas; maximo = Math.max(maximo, vivas); },
        stop() { if (!this.detenida) { --vivas; this.detenida = true; } } };
      fuentes.push(fuente);
      return fuente;
    }
  }
  const ctx = { window: { AudioContext: Contexto }, Map, Object, Promise, Boolean,
    setTimeout: (fn) => setTimeout(fn, 1), clearTimeout,
    fetch: async () => {
      ++peticiones;
      return { ok: !falla, status: falla ? 404 : 200, arrayBuffer: async () => new ArrayBuffer(8) };
    } };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  const banda = new ctx.window.PulsoMusica.BandaSonora((e) => estados.push(e));
  return { banda, estados, fuentes,
    vivas: () => vivas, maximo: () => maximo, peticiones: () => peticiones, fallar: (v) => { falla = v; } };
}

test("solo fondo usa la ruta solicitada, volumen independiente de 12 % y entrada de 1,5 s", () => {
  const c = { window: {}, Object }; vm.createContext(c); vm.runInContext(codigo, c);
  const pistas = c.window.PulsoMusica.PISTAS;
  assert.deepEqual(Object.keys(pistas), ["fondo"]);
  assert.equal(pistas.fondo.archivo, "assets/Audios/fondo.mp3");
  assert(fs.statSync(pistas.fondo.archivo).size > 100000);
  assert.equal(pistas.fondo.volumen, .12);
  assert.equal(c.window.PulsoMusica.BACKGROUND_MUSIC_VOLUME, .12);
  assert.equal(c.window.PulsoMusica.BACKGROUND_FADE_IN_SECONDS, 1.5);
  assert.equal(c.window.PulsoMusica.seleccionarAmbiente, undefined);
});

test("sin autoplay; los cambios narrativos no reinician la fuente ni su bucle", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "fondo" }); await esperar();
  assert.equal(e.peticiones(), 0); assert.equal(e.vivas(), 0);
  b.desbloquear(); await esperar();
  const actual = b.actual;
  assert.equal(actual.id, "fondo"); assert.equal(actual.fuente.loop, true);
  assert(actual.ganancia.gain.rampas.some(([v, t]) => v === .12 && t === 1.5));
  b.contexto.currentTime = 22.75;
  for (let i = 0; i < 25; ++i) {
    b.actualizar({ pista: "fondo" }); b.desbloquear();
  }
  await esperar();
  assert.equal(b.actual, actual); assert.equal(e.fuentes.length, 1);
  assert.equal(e.peticiones(), 1); assert.equal(e.estados.at(-1).segundo, 22.75);
  assert.equal(e.estados.at(-1).fuente, 1);
  b.destruir(); assert.equal(e.vivas(), 0);
});

test("pausa, silencio y BFCache conservan la posición de fondo sin duplicaciones", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "fondo" }); b.desbloquear(); await esperar();
  b.contexto.currentTime = 17.25;
  b.actualizar({ pista: "fondo", pausa: true, inmediata: true }); await esperar();
  assert.equal(e.vivas(), 0); assert.equal(b.posicion.segundo, 17.25);
  b.actualizar({ pista: "fondo" }); await esperar(); assert.equal(b.actual.offset, 17.25);
  b.actualizar({ pista: "fondo", mudo: true }); await esperar();
  assert.equal(e.vivas(), 0); assert.equal(b.estado, "silencio");
  b.actualizar({ pista: "fondo" }); b.desbloquear(); await esperar();
  assert.equal(b.actual.offset, 17.25); assert.equal(e.vivas(), 1);
  b.suspenderPagina(); await esperar(); assert.equal(e.vivas(), 0);
  b.reanudarPagina(); await esperar(); assert.equal(e.vivas(), 1);
  assert.equal(b.actual.offset, 17.25);
  b.destruir(); b.destruir(); b.desbloquear(); await esperar();
  assert.equal(e.vivas(), 0); assert.equal(e.maximo(), 1);
});

test("fondo vuelve al comienzo en bucle y conserva el offset al pausar tras una vuelta", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "fondo" }); b.desbloquear(); await esperar();
  b.contexto.currentTime = 62.25;
  b.actualizar({ pista: "fondo", pausa: true, inmediata: true }); await esperar();
  assert.equal(b.posicion.segundo, 2.25);
  b.actualizar({ pista: "fondo" }); await esperar();
  assert.equal(b.actual.offset, 2.25); assert.equal(b.actual.fuente.loop, true);
  assert.equal(e.maximo(), 1); b.destruir();
});

test("un fallo permite reintentar fondo con otro gesto, sin cargar músicas anteriores", async () => {
  const e = entorno(), b = e.banda;
  e.fallar(true); b.actualizar({ pista: "fondo" }); b.desbloquear(); await esperar();
  assert.equal(e.vivas(), 0); assert.equal(b.estado, "error");
  e.fallar(false); b.desbloquear(); await esperar();
  assert.equal(b.actual.id, "fondo"); assert.equal(e.maximo(), 1); b.destruir();
});

test("una interrupción del contexto reanuda la misma fuente", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "fondo" }); b.desbloquear(); await esperar();
  const fuente = b.actual.fuente;
  b.contexto.state = "suspended"; b.desbloquear(); await esperar();
  assert.equal(b.actual.fuente, fuente); assert.equal(e.fuentes.length, 1); b.destruir();
});

test("el evento real de envío ocurre una vez en el tap 20, sin esperar temporizadores", () => {
  const app = fs.readFileSync("amor.js", "utf8");
  const desde = app.indexOf("const escribirCap2 ="), hasta = app.indexOf("const continuarConversacionCap2 =");
  let envios = 0, efectosDetenidos = 0, confirmaciones = 0, transiciones = 0;
  const control = { textContent: "", classList: { add() {}, remove() {} } };
  const ctx = { Math, cap2: { estado: "escritura", tiempo: 0, tapsEscritura: 0 },
    puedeInteractuarCap2: () => true, desbloquearAudioCap2() {}, reproducirAudioEscritura() {},
    leyendaCap2: control, progresoCap2: control, ajustarLatidoEscritura() {}, sonarCap2() {},
    sincronizarEfectosNarrativos() {}, efectosNarrativos: { disparar(id) {
      if (id === "enviar") ++confirmaciones;
      else { assert.equal(id, "hola"); ++transiciones; }
    } },
    nodoCap2: { dataset: {}, querySelector: () => control, style: { setProperty() {} } },
    window: { setTimeout() {} }, mostrarLaminaCap2: () => Promise.resolve(), mostrarErrorCap2() {},
    detenerAudioEscritura: () => { ++efectosDetenidos; },
    estadoCap2: (estado) => { ctx.cap2.estado = estado; if (estado === "mensaje") ++envios; } };
  vm.createContext(ctx);
  vm.runInContext(app.slice(desde, hasta) + "\nglobalThis.escribir = escribirCap2;", ctx);
  for (let i = 0; i < 19; ++i) ctx.escribir("izquierda");
  assert.equal(ctx.cap2.estado, "escritura");
  assert.equal(envios, 0);
  assert.equal(confirmaciones, 0);
  assert.equal(transiciones, 0);
  ctx.escribir("derecha");
  assert.equal(ctx.cap2.estado, "mensaje");
  ctx.escribir("derecha");
  assert.equal(envios, 1);
  assert.equal(confirmaciones, 1);
  assert.equal(transiciones, 1);
  assert.equal(efectosDetenidos, 1);
});

test("el efecto de parpadeos termina al entrar al capítulo 2 incluso con salida de respaldo", () => {
  const app = fs.readFileSync("amor.js", "utf8");
  const desde = app.indexOf("const iniciarCapituloDos ="), hasta = app.indexOf("  detenerLecturaCamara(true);", desde);
  for (const salidaLenta of [true, false]) {
    let paradas = 0;
    const ctx = { cap2: { activo: false }, detenerAudioOjosFinal() { ++paradas; },
      efectosNarrativos: { detener() {} },
      lienzo: { classList: { contains: () => salidaLenta, remove() {} } },
      escenaCinco: { classList: { remove() {} } }, window: { setTimeout() {} } };
    vm.createContext(ctx);
    vm.runInContext(app.slice(desde, hasta) + "};\nglobalThis.entrar = iniciarCapituloDos;", ctx);
    ctx.entrar(); assert.equal(paradas, 1);
    ctx.cap2.activo = true; ctx.entrar(); assert.equal(paradas, 1);
  }
});

test("activar sonido no reabre efectos que pertenecen a capítulos anteriores", () => {
  const app = fs.readFileSync("amor.js", "utf8");
  let ojos = 0, escritura = 0, pensamiento = 0;
  const c = { document: { hidden: false }, cap2: { activo: true, silencio: false, estado: "titulo", tapsPensamiento: 6 },
    cap3: { activo: false, esperandoGiro: false }, cierreEstelar: { activo: false, pendiente: false },
    lienzo: { classList: { contains: () => true } },
    audioOjosFinal: { play() { ++ojos; return Promise.resolve(); } },
    audioEscribiendoHola: { play() { ++escritura; return Promise.resolve(); } },
    audioPensamiento: { play() { ++pensamiento; return Promise.resolve(); } } };
  vm.createContext(c);
  const extraer = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
  vm.runInContext(extraer('const reproducirAudioOjosFinal =', 'const detenerAudioOjosFinal =')
    + extraer('const reproducirAudioPensamiento =', 'const detenerAudioPensamiento =')
    + extraer('const reproducirAudioEscritura =', 'const ajustarLatidoEscritura =')
    + '\nglobalThis.ojos=reproducirAudioOjosFinal;globalThis.escritura=reproducirAudioEscritura;globalThis.pensamiento=reproducirAudioPensamiento;', c);
  c.ojos(); assert.equal(ojos, 0);
  c.cap2.activo = false; c.ojos(); assert.equal(ojos, 1);
  c.cap3.activo = true; c.ojos(); assert.equal(ojos, 1);
  c.cap2.estado = "escritura"; c.escritura(); assert.equal(escritura, 0);
  c.cap2.estado = "recuerdo"; c.pensamiento(); assert.equal(pensamiento, 0);
  c.cap3.activo = false; c.cap2.activo = true;
  c.pensamiento(); assert.equal(pensamiento, 1);
  c.cap2.estado = "escritura"; c.escritura(); assert.equal(escritura, 1);
  c.cap2.silencio = true; c.escritura(); assert.equal(escritura, 1);
});
