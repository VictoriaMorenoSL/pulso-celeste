const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const app = fs.readFileSync("amor.js", "utf8");
const fragmento = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));

function reloj() {
  let tiempo = 0, id = 0;
  const frames = new Map();
  return {
    raf(fn) { frames.set(++id, fn); return id; },
    cancelar(id) { frames.delete(id); },
    avanzar(ms) {
      for (const hasta = tiempo + ms; tiempo < hasta;) {
        tiempo += 16;
        const callbacks = [...frames.values()]; frames.clear();
        callbacks.forEach((fn) => fn(tiempo));
      }
    },
    pendientes: () => frames.size
  };
}

test("las dos manos conservan su interacción y abren directamente el cierre vertical", () => {
  const tiempo = reloj(); let emisiones = 0, limpio = 0, musicaDetenida = 0, ruta = "", efectosDetenidos = 0;
  const node = () => ({ hidden: false, inert: false, dataset: {}, style: { setProperty(k, v) { this[k] = v; } },
    classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, querySelector() { return node(); } });
  const viejo = node(), cierre = node(), izquierdo = node(), derecho = node(); cierre.hidden = true;
  const c = { Math, Object, Set, Map, requestAnimationFrame: tiempo.raf, cancelAnimationFrame: tiempo.cancelar,
    window: { cancelAnimationFrame: tiempo.cancelar, clearTimeout() {}, setTimeout() {}, location: { assign(p) { ruta = p; } } },
    document: { hidden: false, querySelector: () => node() }, revisionGiro: true,
    limitar: (n, a = 0, b = 1) => Math.min(b, Math.max(a, n)),
    nodoCap3: viejo, nodoCierreEstelar: cierre, lienzo: node(), cuadroCuatroCap3: node(), cuadroCincoCap3: node(),
    botonesLateralesCap3: [izquierdo, derecho], DURACION_ENCUENTRO_CAP3: 2600,
    ocultarAyudasLateralesCap3() {}, programarAyudasLateralesCap3() {}, prepararLluviaEstrellasCap3() {}, sincronizarMusica() {},
    lluviaEstrellasCap3: { redimensionar() {}, sincronizar() {}, destruir() { ++limpio; }, iniciar(opciones) {
      assert.equal(viejo.hidden, true); assert.equal(cierre.style['--entrada-cierre'], 1);
      assert.equal(opciones.duracion, 5); ++emisiones;
    } },
    bandaSonora: { destruir() { ++musicaDetenida; } }, emojisConversacionCap2: { destruir() {} },
    detenerSonidosPensamiento() {}, sincronizarEfectosNarrativos() {}, efectosNarrativos: {
      detener() {}, destruir() {}, disparar(id) { assert.equal(id, 'lluvia'); assert.equal(viejo.hidden, true); }
    },
    cap2: { activo: false, raf: 0, audio: { close: () => Promise.resolve() } }, animacionCaminata: 0,
    detenerAnimacionChispita() {}, detenerLecturaCamara() {}, detenerParallax() {},
    detenerAudioOjosFinal() { ++efectosDetenidos; }, detenerAudioEscritura() { ++efectosDetenidos; }, detenerAudioPensamiento() { ++efectosDetenidos; },
    recorrido: { pausaRevision: false },
    cierreEstelar: { pendiente: false, activo: false, presentado: false, reiniciando: false, recursosLluviaListos: true,
      lluviaIniciada: false, tiempoAcceso: 0, ultimoAcceso: null, tiempoEntrada: 0, ultimoEntrada: null },
    cap3: { activo: true, escena: 3, cuadroCincoActivo: false, botonesPresionados: new Set([izquierdo]), punterosLaterales: new Map([[1, izquierdo]]) } };
  vm.createContext(c);
  vm.runInContext(fragmento("const iniciarLluviaCierreEstelar =", "let precargaCap3 =")
    + fragmento("const actualizarEntradaCierreEstelar =", "const ocultarAyudaPresionaCap3 =")
    + fragmento("const activarCuadroCincoCap3 =", "const prepararCuadroCincoCap3 =")
    + fragmento("const volverCuadroCuatroCap3 =", 'botonesLateralesCap3.forEach((boton) => {\n  boton.addEventListener("pointerdown", presionarBotonLateralCap3);')
    + "\nglobalThis.activar=activarCuadroCincoCap3;globalThis.soltar=soltarBotonLateralCap3;globalThis.sync=sincronizarCierreEstelar;globalThis.reiniciar=reiniciarExperiencia;", c);
  c.activar(); assert.equal(c.cap3.escena, 3); assert.equal(emisiones, 0);
  const dosManos = () => { c.cap3.botonesPresionados.add(derecho); c.cap3.punterosLaterales.set(2, derecho); c.activar(); };
  dosManos(); tiempo.avanzar(1200); assert.equal(c.cap3.escena, 4); assert.equal(emisiones, 0);
  c.soltar({ pointerType: 'touch', pointerId: 2 }); tiempo.avanzar(4000);
  assert.equal(c.cap3.escena, 3); assert.equal(c.cierreEstelar.activo, false);
  dosManos(); tiempo.avanzar(2800);
  assert.equal(c.cierreEstelar.activo, true); assert.equal(c.cap3.escena, 5); assert.equal(cierre.hidden, false);
  assert.equal(emisiones, 0); assert.equal(cierre.inert, true);
  c.document.hidden = true; c.sync(); const entrada = c.cierreEstelar.tiempoEntrada;
  tiempo.avanzar(4000); assert.equal(c.cierreEstelar.tiempoEntrada, entrada);
  c.document.hidden = false; c.sync(); tiempo.avanzar(1800);
  assert.equal(emisiones, 1); assert.equal(cierre.inert, false); assert.equal(viejo.inert, true);
  c.sync(); tiempo.avanzar(1000); assert.equal(emisiones, 1);
  let prevenido = false; c.reiniciar({ preventDefault() { prevenido = true; } });
  assert.equal(prevenido, true); assert.equal(ruta, "amor.html"); assert.equal(limpio, 1);
  assert.equal(musicaDetenida, 1); assert.equal(efectosDetenidos, 3); assert.equal(tiempo.pendientes(), 0);
  assert.equal(c.cierreEstelar.reiniciando, true);
});

test("la lluvia diagonal termina a los cinco segundos activos, con fade y limpieza", () => {
  const tiempo = reloj(); let visible = true;
  const contexto = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
  const canvas = { dataset: {}, getContext: () => contexto, getBoundingClientRect: () => ({ width: 390, height: 693 }) };
  const c = { Math, Map, Set, URL, Int32Array, Uint8Array, window: { devicePixelRatio: 2 },
    document: { addEventListener() {}, removeEventListener() {} }, matchMedia: () => ({ matches: false }),
    ResizeObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: tiempo.raf, cancelAnimationFrame: tiempo.cancelar };
  vm.createContext(c);
  const fuente = fs.readFileSync('assets/efectos/estrellas/lluvia.js', 'utf8')
    .replace('import.meta.url', '"file:///assets/efectos/estrellas/lluvia.js"').replace('export class LluviaEstrellas', 'class LluviaEstrellas');
  vm.runInContext(fuente + '\nglobalThis.Lluvia = LluviaEstrellas;', c);
  const lluvia = new c.Lluvia(canvas, () => visible);
  lluvia.texturas = [{ estela: true, aspecto: .86, canvas: {} }, { estela: false, aspecto: 1, canvas: {} }];
  lluvia.iniciar({ duracion: 5 });
  const primera = lluvia.particulas[0], x = primera.x, y = primera.y, tamano = primera.tamano;
  tiempo.avanzar(1000);
  assert(primera.x < x && primera.y > y); assert.equal(primera.tamano, tamano);
  visible = false; lluvia.sincronizar(); const transcurrido = lluvia.tiempo;
  tiempo.avanzar(9000); assert.equal(lluvia.tiempo, transcurrido);
  visible = true; lluvia.sincronizar(); tiempo.avanzar(2100);
  assert.equal(lluvia.activa, true); assert(lluvia.particulas.length <= 13);
  tiempo.avanzar(700); assert.equal(lluvia.activa, false); assert(lluvia.particulas.length > 0);
  tiempo.avanzar(1400); assert.equal(lluvia.particulas.length, 0); assert.equal(lluvia.raf, 0);
  assert.equal(canvas.dataset.terminada, 'true'); assert(Math.abs(lluvia.tiempo - 5) < .04);
  lluvia.destruir(); lluvia.destruir(); assert.equal(tiempo.pendientes(), 0);
});

test("el cierre vertical no pausa la música por orientación; capítulo 2 mantiene su regla", () => {
  let seleccion;
  const c = { estadoMusicaListo: true, document: { hidden: false }, Boolean,
    cap2: { activo: false, error: false, silencio: false, estado: 'final' },
    cap3: { activo: false, esperandoGiro: false }, cierreEstelar: { activo: true, pendiente: false, presentado: true },
    recorrido: { pausaRevision: false }, escenaTresIniciada: true, estaHorizontal: () => false,
    lienzo: { dataset: {} }, bandaSonora: { actualizar(config) { seleccion = config; } },
    window: {} };
  vm.createContext(c);
  vm.runInContext(fragmento('const sincronizarMusica =', 'const orientacionHorizontal =') + '\nglobalThis.sync = sincronizarMusica;', c);
  c.sync(); assert.equal(seleccion.pausa, false); assert.equal(seleccion.pista, "fondo");
  c.cierreEstelar.activo = false; c.cap2.activo = true; c.sync(); assert.equal(seleccion.pausa, true);
});
