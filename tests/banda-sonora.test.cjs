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
      const gain = { value: 0, cancelScheduledValues() {},
        setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; } };
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
  return { banda, estados, fuentes, seleccionar: ctx.window.PulsoMusica.seleccionarAmbiente,
    vivas: () => vivas, maximo: () => maximo, peticiones: () => peticiones, fallar: (v) => { falla = v; } };
}

test("selección narrativa: pulso hasta el envío; final solo con el cierre presentado", () => {
  const { seleccionar } = entorno();
  assert.equal(seleccionar({}), "encuentro");
  for (const estadoDos of ["pensamiento", "recuerdo", "disolucion", "escritura"]) {
    assert.equal(seleccionar({ capituloDos: true, estadoDos }), "pulso");
  }
  for (const estadoDos of ["mensaje", "conversacion", "final"]) {
    assert.equal(seleccionar({ capituloDos: true, estadoDos }), "hola");
  }
  assert.equal(seleccionar({ esperaTres: true }), "hola");
  assert.equal(seleccionar({ capituloTres: true, cierrePresentado: false }), "hola");
  assert.equal(seleccionar({ capituloTres: true, cierrePresentado: true }), "final");
});

test("sin autoplay; un solo ambiente incluso si se cambian estados rápidamente", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "encuentro" });
  await esperar();
  assert.equal(e.peticiones(), 0);
  assert.equal(e.vivas(), 0);
  b.desbloquear();
  await esperar();
  assert.equal(b.actual.id, "encuentro");
  b.actualizar({ pista: "pulso" });
  b.actualizar({ pista: "hola" });
  await esperar();
  assert.equal(b.actual.id, "hola");
  assert.equal(e.vivas(), 1);
  assert.equal(e.maximo(), 1);
  const cantidad = e.fuentes.length;
  b.actualizar({ pista: "hola" });
  b.desbloquear();
  await esperar();
  assert.equal(e.fuentes.length, cantidad);
  assert.equal(b.cache.size, 1);
  b.destruir();
  assert.equal(e.vivas(), 0);
});

test("pausa/orientación/silencio conservan posición; BFCache y cierre no dejan loops", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "hola" }); b.desbloquear(); await esperar();
  b.contexto.currentTime = 17.25;
  b.actualizar({ pista: "hola", pausa: true, inmediata: true });
  await esperar();
  assert.equal(e.vivas(), 0);
  assert.equal(b.posicion.segundo, 17.25);
  b.actualizar({ pista: "hola" }); await esperar();
  assert.equal(b.actual.offset, 17.25);
  b.actualizar({ pista: "hola", mudo: true }); await esperar();
  assert.equal(e.vivas(), 0);
  assert.equal(b.estado, "silencio");
  b.actualizar({ pista: "hola" }); b.desbloquear(); await esperar();
  assert.equal(e.vivas(), 1);
  b.suspenderPagina(); await esperar(); assert.equal(e.vivas(), 0);
  b.reanudarPagina(); await esperar(); assert.equal(e.vivas(), 1);
  b.destruir(); await esperar(); assert.equal(e.vivas(), 0);
  b.desbloquear(); await esperar(); assert.equal(e.vivas(), 0);
  assert.equal(e.maximo(), 1);
});

test("un fallo de carga detiene la música anterior y permite reintentar con un gesto", async () => {
  const e = entorno(), b = e.banda;
  b.actualizar({ pista: "pulso" }); b.desbloquear(); await esperar();
  e.fallar(true); b.actualizar({ pista: "hola" }); await esperar();
  assert.equal(e.vivas(), 0);
  assert.equal(b.estado, "error");
  e.fallar(false); b.desbloquear(); await esperar();
  assert.equal(b.actual.id, "hola");
  assert.equal(e.maximo(), 1);
  b.destruir();
});

test("el evento real de envío ocurre una vez en el tap 20, sin esperar temporizadores", () => {
  const app = fs.readFileSync("amor.js", "utf8");
  const desde = app.indexOf("const escribirCap2 ="), hasta = app.indexOf("const continuarConversacionCap2 =");
  let envios = 0, efectosDetenidos = 0;
  const control = { textContent: "", classList: { add() {}, remove() {} } };
  const ctx = { Math, cap2: { estado: "escritura", tiempo: 0, tapsEscritura: 0 },
    puedeInteractuarCap2: () => true, desbloquearAudioCap2() {}, reproducirAudioEscritura() {},
    leyendaCap2: control, progresoCap2: control, ajustarLatidoEscritura() {}, sonarCap2() {},
    nodoCap2: { dataset: {}, querySelector: () => control, style: { setProperty() {} } },
    window: { setTimeout() {} }, mostrarLaminaCap2: () => Promise.resolve(), mostrarErrorCap2() {},
    detenerAudioEscritura: () => { ++efectosDetenidos; },
    estadoCap2: (estado) => { ctx.cap2.estado = estado; if (estado === "mensaje") ++envios; } };
  vm.createContext(ctx);
  vm.runInContext(app.slice(desde, hasta) + "\nglobalThis.escribir = escribirCap2;", ctx);
  for (let i = 0; i < 19; ++i) ctx.escribir("izquierda");
  assert.equal(ctx.cap2.estado, "escritura");
  assert.equal(envios, 0);
  ctx.escribir("derecha");
  assert.equal(ctx.cap2.estado, "mensaje");
  ctx.escribir("derecha");
  assert.equal(envios, 1);
  assert.equal(efectosDetenidos, 1);
});

test("el efecto de parpadeos termina al entrar al capítulo 2 incluso con salida de respaldo", () => {
  const app = fs.readFileSync("amor.js", "utf8");
  const desde = app.indexOf("const iniciarCapituloDos ="), hasta = app.indexOf("  detenerLecturaCamara(true);", desde);
  for (const salidaLenta of [true, false]) {
    let paradas = 0;
    const ctx = { cap2: { activo: false }, detenerAudioOjosFinal() { ++paradas; },
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
