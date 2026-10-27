const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const codigo = fs.readFileSync('assets/audio/efectos-narrativos.js', 'utf8');
const app = fs.readFileSync('amor.js', 'utf8');
const promesas = async () => { await Promise.resolve(); await Promise.resolve(); };

function entorno() {
  let ahora = 0, siguiente = 0, fuentes = 0, pendiente = false;
  const timers = new Map(), audios = [];
  class Media {
    constructor(src) { this.src = src; this.dataset = {}; this.paused = true; this.currentTime = 0;
      this.reproducciones = 0; this.eventos = {}; audios.push(this); }
    setAttribute() {} removeAttribute(id) { if (id === 'src') this.src = ''; } remove() {} load() {}
    addEventListener(id, fn) { this.eventos[id] = fn; }
    pause() { this.paused = true; }
    play() {
      this.paused = false; ++this.reproducciones;
      return pendiente ? new Promise(resolve => { this.resolver = resolve; }) : Promise.resolve();
    }
  }
  class Contexto {
    constructor() { this.state = 'running'; this.destination = {}; }
    get currentTime() { return ahora / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() {
      return { connect() {}, disconnect() {}, gain: { value: 0, eventos: [],
        cancelScheduledValues() {},
        setValueAtTime(v, t) { this.value = v; this.eventos.push(['fijar', v, t]); },
        linearRampToValueAtTime(v, t) { this.value = v; this.eventos.push(['rampa', v, t]); } } };
    }
    createMediaElementSource() { ++fuentes; return { connect() {}, disconnect() {} }; }
  }
  const c = { window: { AudioContext: Contexto }, document: { body: { append() {} } }, Audio: Media, Map, Object, Math,
    setTimeout(fn, ms) { timers.set(++siguiente, { fn, cuando: ahora + ms }); return siguiente; },
    clearTimeout(id) { timers.delete(id); } };
  vm.createContext(c); vm.runInContext(codigo, c);
  const efectos = new c.window.PulsoEfectos.EfectosNarrativos();
  const mover = tiempo => {
    for (const audio of audios) if (!audio.paused && !audio.atascado) audio.currentTime += (tiempo - ahora) / 1000;
    ahora = tiempo;
  };
  return { efectos, audios, fuentes: () => fuentes, pendientes: () => timers.size,
    retrasar: v => { pendiente = v; },
    avanzar(ms) {
      const limite = ahora + ms;
      while (true) {
        const siguiente = [...timers].filter(([, t]) => t.cuando <= limite).sort((a, b) => a[1].cuando - b[1].cuando)[0];
        if (!siguiente) break;
        mover(siguiente[1].cuando); timers.delete(siguiente[0]); siguiente[1].fn();
      }
      mover(limite);
    } };
}

test('los MP3 originales existen; sin autoplay ni decodificación completa', () => {
  const e = entorno();
  assert.equal(e.audios.length, 4);
  for (const audio of e.audios) {
    assert(fs.statSync(audio.src).size > 1000);
    assert.equal(audio.reproducciones, 0);
    assert.equal(audio.loop, false);
    assert.equal(audio.preload, 'metadata');
  }
  assert.equal(e.fuentes(), 0);
});

test('el efecto original de lluvia suena una vez y termina a los cinco segundos', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[3];
  b.desbloquear(); await promesas();
  assert.equal(media.src, 'assets/Audios/Pulso_Celeste_Sonidos/lluvia_estrellas_5s.mp3');
  b.disparar('lluvia'); b.disparar('lluvia'); await promesas();
  assert.equal(media.dataset.activaciones, '1'); assert(!media.paused);
  e.avanzar(5000); assert(media.paused); assert.equal(e.pendientes(), 0);
});

test('una única fuente por efecto y ventanas finitas aunque se repita la llamada', async () => {
  const e = entorno(), b = e.efectos;
  b.desbloquear(); await promesas();
  assert(e.audios.every(a => a.paused));
  const vista = e.audios[0], antes = vista.reproducciones;
  b.disparar('enviar'); b.disparar('enviar'); await promesas();
  assert.equal(vista.reproducciones, antes + 1);
  assert.equal(vista.dataset.estado, 'sonando');
  b.desbloquear(); assert.equal(e.fuentes(), 4);
  e.avanzar(2000); assert(vista.paused); assert.equal(e.pendientes(), 0);
  b.disparar('enviar'); await promesas(); e.avanzar(1200);
  assert(e.audios[0].paused); assert.equal(e.pendientes(), 0);
});

test('las vueltas acompañan solo el movimiento y reanudan desde su tiempo narrativo', async () => {
  const e = entorno(), b = e.efectos, audio = e.audios[1];
  b.desbloquear(); await promesas();
  b.actualizar({ girando: true, tiempoGiro: 0 }); await promesas();
  assert(!audio.paused);
  const reproducciones = audio.reproducciones;
  b.actualizar({ girando: true, tiempoGiro: .7 });
  assert.equal(audio.reproducciones, reproducciones);
  b.actualizar({ pausa: true, tiempoGiro: .7 }); assert(audio.paused);
  b.actualizar({ pausa: false }); await promesas();
  assert.equal(audio.currentTime, .7);
  b.actualizar({ girando: false }); e.avanzar(100);
  assert(audio.paused); assert.equal(e.pendientes(), 0);
});

test('silencio no repite confirmaciones; el giro termina también al entrar al cierre', async () => {
  const e = entorno(), b = e.efectos;
  b.desbloquear(); await promesas(); b.disparar('enviar'); await promesas();
  const cantidad = e.audios[0].reproducciones;
  b.actualizar({ mudo: true }); assert(e.audios.every(a => a.paused));
  b.disparar('enviar'); b.actualizar({ mudo: false }); await promesas();
  assert.equal(e.audios[0].reproducciones, cantidad); assert(e.audios[0].paused);
  b.actualizar({ girando: true, tiempoGiro: .9 }); await promesas();
  b.detener('vueltas'); b.actualizar({ girando: false });
  assert(e.audios[1].paused); assert.equal(e.pendientes(), 0);
});

test('un frame lento no vuelve a disparar una ventana de vueltas ya terminada', async () => {
  const e = entorno(), b = e.efectos, audio = e.audios[1];
  b.desbloquear(); await promesas(); b.actualizar({ girando: true, tiempoGiro: 0 }); await promesas();
  const cantidad = audio.reproducciones;
  e.avanzar(2600); b.actualizar({ girando: true, tiempoGiro: 2 }); await promesas();
  assert.equal(audio.reproducciones, cantidad); assert(audio.paused);
  b.actualizar({ girando: false }); b.actualizar({ girando: true, tiempoGiro: 0 }); await promesas();
  assert.equal(audio.reproducciones, cantidad + 1);
});

test('play pendiente no resucita tras ocultar, silenciar o destruir; BFCache permite otro gesto', async () => {
  const e = entorno(), b = e.efectos;
  b.desbloquear(); await promesas(); e.retrasar(true);
  b.disparar('enviar'); b.actualizar({ mudo: true });
  e.audios[0].resolver(); await promesas(); assert(e.audios[0].paused);
  b.actualizar({ mudo: false }); b.suspenderPagina(); b.disparar('enviar');
  assert(e.audios.every(a => a.paused));
  e.retrasar(false); b.reanudarPagina(); b.desbloquear(); b.disparar('enviar'); await promesas();
  assert(!e.audios[0].paused);
  b.destruir(); b.destruir(); b.desbloquear();
  assert(e.audios.every(a => a.paused)); assert.equal(e.pendientes(), 0);
  assert.equal(b.contexto.state, 'closed');
});

test('un MP3 fallido no lanza errores ni conserva temporizadores', async () => {
  const e = entorno(), b = e.efectos;
  b.desbloquear(); await promesas(); b.disparar('enviar'); await promesas();
  e.audios[0].eventos.error(); assert(e.audios[0].paused);
  assert.equal(e.audios[0].dataset.estado, 'error'); assert.equal(e.pendientes(), 0);
});

test('el descubrimiento conserva su imagen sin duplicar vista como efecto', () => {
  let disparos = 0;
  const clases = new Set();
  const c = { lienzo: { classList: { contains: () => true } },
    interaccionChispa: { classList: { contains: k => clases.has(k), add: k => clases.add(k) } },
    fijarProgresoChispa() {}, progresoChispa: 0, sincronizarEfectosNarrativos() {},
    efectosNarrativos: { disparar() { ++disparos; } } };
  vm.createContext(c);
  vm.runInContext(app.slice(app.indexOf('const activarEncuentro ='), app.indexOf('const iniciarChispa ='))
    + '\nglobalThis.activar = activarEncuentro;', c);
  c.activar(); c.activar(); assert.equal(disparos, 0); assert(clases.has('activada'));
});

test('Hola usa el recurso sostenido: entrada de 1 s, salida de 10 a 12 s y recursos liberados', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[2];
  assert.equal(media.src, 'assets/Audios/despues-hola.mp3');
  b.desbloquear(); await promesas();
  b.disparar('hola'); await promesas();
  const reproducciones = media.reproducciones;
  assert.equal(media.dataset.estado, 'entrada');
  const gain = b.efectos.get('hola').ganancia.gain;
  assert(gain.eventos.some(([k, v, t]) => k === 'rampa' && v === .2 && t === 1));
  assert(gain.eventos.some(([k, v, t]) => k === 'fijar' && v === .2 && t === 10));
  assert(gain.eventos.some(([k, v, t]) => k === 'rampa' && v === 0 && t === 12));
  e.avanzar(1500); b.actualizar({ mudo: false, pausa: false });
  b.disparar('hola'); b.desbloquear(); await promesas();
  assert.equal(media.reproducciones, reproducciones); assert.equal(media.dataset.activaciones, '1');
  assert.equal(media.dataset.estado, 'sostenido');
  e.avanzar(8600); assert.equal(media.dataset.estado, 'salida');
  e.avanzar(900); assert(Math.abs(Number(media.dataset.nivelTransicion) - .1) < .011);
  e.avanzar(1000); assert(media.paused); assert.equal(media.src, '');
  assert.equal(media.dataset.recursosLiberados, 'true'); assert.equal(e.pendientes(), 0);
  const cantidad = e.fuentes(); b.desbloquear(); b.disparar('hola'); await promesas();
  assert.equal(e.fuentes(), cantidad); assert(media.paused);
});

test('la pausa congela el conteo y la envolvente, incluso durante el fade out', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[2];
  b.desbloquear(); await promesas(); b.disparar('hola'); await promesas();
  e.avanzar(400); b.actualizar({ pausa: true });
  const posicion = media.currentTime;
  e.avanzar(30000); assert.equal(media.currentTime, posicion); assert.equal(e.pendientes(), 0);
  b.actualizar({ pausa: false }); await promesas(); assert.equal(media.currentTime, posicion);
  assert.equal(media.dataset.estado, 'entrada');
  e.avanzar(10600); b.actualizar({ pausa: true });
  const salida = media.currentTime; assert(Math.abs(salida - 11) < .01);
  e.avanzar(20000); assert.equal(media.currentTime, salida);
  b.actualizar({ pausa: false }); await promesas();
  assert.equal(media.dataset.estado, 'salida');
  assert(Math.abs(Number(media.dataset.nivelTransicion) - .1) < .001);
  e.avanzar(1001); assert(media.paused); assert.equal(e.pendientes(), 0);
});

test('silencio, pérdida de foco y contexto interrumpido conservan la transición sin otra instancia', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[2];
  b.desbloquear(); await promesas(); b.disparar('hola'); await promesas(); e.avanzar(3200);
  b.actualizar({ mudo: true }); const t = media.currentTime;
  e.avanzar(15000); assert.equal(media.currentTime, t); assert(media.paused);
  b.actualizar({ mudo: false }); await promesas();
  assert.equal(media.currentTime, t); assert.equal(media.dataset.activaciones, '1');
  b.suspenderPagina(); e.avanzar(15000); assert.equal(media.currentTime, t);
  b.reanudarPagina(); b.actualizar({ pausa: false }); await promesas();
  b.contexto.state = 'interrupted'; b.contexto.onstatechange();
  e.avanzar(15000); assert.equal(media.currentTime, t); assert.equal(e.pendientes(), 0);
  b.contexto.state = 'running'; b.contexto.onstatechange(); await promesas();
  assert.equal(media.currentTime, t); assert.equal(e.fuentes(), 4);
  e.avanzar(8801); assert(media.paused); assert.equal(e.pendientes(), 0);
});

test('un envío silenciado conserva su reloj en cero hasta habilitar el audio', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[2];
  b.actualizar({ mudo: true }); b.disparar('hola'); e.avanzar(20000);
  assert.equal(media.currentTime, 0); assert(media.paused);
  b.actualizar({ mudo: false }); b.desbloquear(); await promesas();
  assert.equal(media.dataset.estado, 'entrada'); assert.equal(media.dataset.activaciones, '1');
  e.avanzar(12001); assert.equal(media.dataset.estado, 'terminado');
});

test('buffering no consume la duración y un play tardío no revive el audio tras reiniciar', async () => {
  const e = entorno(), b = e.efectos, media = e.audios[2];
  b.desbloquear(); await promesas(); b.disparar('hola'); await promesas(); e.avanzar(2200);
  media.atascado = true; media.eventos.waiting(); const t = media.currentTime;
  e.avanzar(9000); assert.equal(media.currentTime, t); assert.equal(e.pendientes(), 0);
  media.atascado = false; media.eventos.playing(); e.avanzar(500);
  assert(media.currentTime > t); b.actualizar({ pausa: true });
  e.retrasar(true); b.actualizar({ pausa: false });
  b.destruir(); media.resolver(); await promesas();
  assert(media.paused); assert.equal(e.pendientes(), 0); assert.equal(b.contexto.state, 'closed');
});
