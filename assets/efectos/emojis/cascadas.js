"use strict";
// Adaptación del motor original de cascadas.js (19 de octubre de 2026).
// Recorte, distribuciones aleatorias y proyección conservan las fórmulas originales.
// Coordenadas sobre los PNG originales de 941 × 1672. No se reescriben.
const EMOCIONES = Object.freeze([
  { id: "sonrisas", nombre: "Sonrisas", detalle: "Alegría sencilla", archivo: "Cascada de sonrisas flotantes.png", region: [408, 1082, 215, 210] },
  { id: "risa", nombre: "Risa", detalle: "Sin contenerse", archivo: "Cascada flotante de emojis risueños.png", region: [180, 800, 500, 490] },
  { id: "alegria", nombre: "Alegría suave", detalle: "Una sonrisa cálida", archivo: "cascadas.png", region: [416, 849, 192, 190] },
  { id: "sonrojo", nombre: "Sonrojo", detalle: "Un poquito de timidez", archivo: "cascadasonrojo22.png", region: [263, 610, 427, 420] },
  { id: "enamoramiento", nombre: "Enamoramiento", detalle: "Con el corazón por delante", archivo: "casccada3.png", region: [289, 605, 426, 376] }
]);
const BASE_RECURSOS = new URL("../../emojis-cascadas/", import.meta.url);
const azar = (min, max) => min + Math.random() * (max - min);
const limitar = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));

// Quita únicamente el fondo conectado al borde del recorte. Se conservan
// dientes, luces interiores y los corazones desconectados de la cara.
function aislarEmoji(imagen, region) {
  const [x, y, ancho, alto] = region;
  const recorte = document.createElement("canvas");
  recorte.width = ancho; recorte.height = alto;
  const contexto = recorte.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(imagen, x, y, ancho, alto, 0, 0, ancho, alto);
  const datos = contexto.getImageData(0, 0, ancho, alto);
  const total = ancho * alto, exterior = new Uint8Array(total), cola = new Int32Array(total);
  let cabeza = 0, fin = 0;
  const visitar = (i) => {
    if (exterior[i]) return;
    const p = i * 4, r = datos.data[p], g = datos.data[p + 1], b = datos.data[p + 2];
    const esEmoji = r > 45 && r - b > 24 && r >= g * .92;
    if (esEmoji) return;
    exterior[i] = 1; cola[fin++] = i;
  };
  for (let px = 0; px < ancho; px++) { visitar(px); visitar((alto - 1) * ancho + px); }
  for (let py = 0; py < alto; py++) { visitar(py * ancho); visitar(py * ancho + ancho - 1); }
  while (cabeza < fin) {
    const i = cola[cabeza++], px = i % ancho, py = Math.floor(i / ancho);
    if (px) visitar(i - 1);
    if (px < ancho - 1) visitar(i + 1);
    if (py) visitar(i - ancho);
    if (py < alto - 1) visitar(i + ancho);
  }
  for (let i = 0; i < total; i++) if (exterior[i]) datos.data[i * 4 + 3] = 0;
  contexto.putImageData(datos, 0, 0);
  // Margen para que el blur no se corte en el borde del sprite.
  const margen = 32, textura = document.createElement("canvas");
  textura.width = ancho + margen * 2; textura.height = alto + margen * 2;
  textura.getContext("2d").drawImage(recorte, margen, margen);
  const capas = [textura];
  for (const blur of [3, 8, 15]) {
    const capa = document.createElement("canvas");
    capa.width = textura.width; capa.height = textura.height;
    const ctx = capa.getContext("2d");
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(textura, 0, 0);
    capas.push(capa);
  }
  return { capas, aspecto: textura.height / textura.width, margen: margen / textura.width };
}

class CascadaEmojis {
  constructor(canvas, { continua = false, delicado = false } = {}) {
    this.canvas = canvas;
    this.ancho = 1080; this.alto = 1920;
    this.unidadCss = 1;
    this.continua = continua;
    this.delicado = delicado;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.particulas = [];
    this.texturas = new Map();
    this.pendientes = new Map();
    this.emocion = null;
    this.velocidad = 1;
    this.cantidad = 2;
    this.transparente = true;
    this.enMarcha = false;
    this.ultimoTiempo = null;
    this.acumulado = 0;
    this.raf = 0;
    this.version = 0;
    this.reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.maximo = 12;
    this.destruido = false;
    this.alVisibilidad = () => this.sincronizar();
    document.addEventListener("visibilitychange", this.alVisibilidad);
    this.redimensionar();
  }
  redimensionar() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const unidad = 1080 / Math.min(rect.width, rect.height);
    this.unidadCss = unidad;
    this.ancho = rect.width * unidad; this.alto = rect.height * unidad;
    const resolucion = Math.min(1, (window.devicePixelRatio || 1) / unidad);
    this.canvas.width = Math.round(this.ancho * resolucion);
    this.canvas.height = Math.round(this.alto * resolucion);
    this.ctx.setTransform(this.canvas.width / this.ancho, 0, 0, this.canvas.height / this.alto, 0, 0);
    this.pintar();
  }
  cargar(emocion) {
    if (!this.pendientes.has(emocion.id)) {
      const promesa = new Promise((resolve, reject) => {
        const imagen = new Image();
        imagen.onload = () => {
          if (this.destruido) { resolve(null); return; }
          try {
            const textura = aislarEmoji(imagen, emocion.region);
            this.texturas.set(emocion.id, textura);
            resolve(textura);
          } catch (error) { reject(error); }
        };
        imagen.onerror = () => reject(new Error(`No se pudo cargar ${emocion.archivo}`));
        imagen.src = new URL(emocion.archivo, BASE_RECURSOS).href;
      }).catch((error) => { this.pendientes.delete(emocion.id); throw error; });
      this.pendientes.set(emocion.id, promesa);
    }
    return this.pendientes.get(emocion.id);
  }
  async seleccionar(id) {
    const emocion = EMOCIONES.find((e) => e.id === id);
    if (!emocion) throw new Error("Emoción desconocida");
    const version = ++this.version;
    await this.cargar(emocion);
    if (version !== this.version) return false;
    this.emocion = emocion;
    this.canvas.dataset.emocion = id;
    this.reiniciar();
    return true;
  }
  crear(edad = 0, origen = null, emocion = this.emocion?.id) {
    if (!this.emocion || this.particulas.length >= this.maximo) return;
    const angulo = azar(0, Math.PI * 2);
    const radio = Math.random() < .22 ? azar(35, 100) : azar(150, 620);
    this.particulas.push({
      emocion, edad, vida: azar(3.5, 5.9) * (this.delicado ? .6 : 1), x: Math.cos(angulo) * radio,
      y: Math.sin(angulo) * radio * 1.5,
      origenX: origen?.x ?? this.ancho / 2 + azar(-55, 55),
      origenY: origen?.y ?? this.alto / 2 + azar(-90, 90),
      tamano: azar(235, 370), giro: azar(-.16, .16), rotacion: azar(-.22, .22),
      deriva: azar(-80, 80), fase: azar(0, Math.PI * 2), estela: Math.random() < .38
    });
  }
  reiniciar() {
    this.particulas = [];
    this.acumulado = 0;
    this.ultimoTiempo = null;
    if (this.continua) for (let i = 0; i < 6; i++) this.crear(i * .52);
    this.pintar();
  }
  reproducir() { this.enMarcha = true; this.sincronizar(); }
  pausar() { this.enMarcha = false; this.sincronizar(); }
  sincronizar() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ultimoTiempo = null;
    if (this.enMarcha && !document.hidden) this.raf = requestAnimationFrame((t) => this.actualizar(t));
    this.canvas.dataset.reproduccion = this.enMarcha ? document.hidden ? "oculta" : "activa" : "pausa";
  }
  ajustarCantidad(valor) {
    this.cantidad = limitar(Math.round(Number(valor)) || 2, 1, 3);
    this.maximo = [0, 8, 12, 16][this.cantidad];
    this.particulas = this.particulas.slice(-this.maximo);
    this.pintar();
  }
  ajustarVelocidad(valor) { this.velocidad = limitar(Number(valor) || 1, .5, 1.8); }
  ajustarFondo() { this.transparente = true; this.pintar(); }
  rafaga(origen, emocion = this.emocion?.id, cantidad = 3) {
    if (!this.emocion || !this.texturas.has(emocion) || document.hidden) return 0;
    const anteriores = this.particulas.length;
    for (let i = 0; i < cantidad; i++) this.crear(this.delicado ? 0 : azar(.2, .7), origen, emocion);
    if (!this.enMarcha) this.reproducir();
    return this.particulas.length - anteriores;
  }
  proyectar(p) {
    const t = limitar(p.edad / p.vida);
    const z = 4200 * (95 / 4200) ** (t ** 1.25);
    const escala = 850 / z;
    const curva = Math.sin(t * 2.2 + p.fase) * p.deriva * t;
    return {
      t, z, escala,
      x: p.origenX + (p.x + curva) * escala,
      y: p.origenY + (p.y + curva * .6) * escala,
      ancho: p.tamano * escala,
      rotacion: p.rotacion + p.giro * t,
      opacidad: Math.min(1, t / .08) * (1 - limitar((t - .97) / .03)),
      blur: limitar((.38 - t) / .38) * 1.5 + (p.estela ? limitar((t - .66) / .34) * 2.5 * this.velocidad : 0)
    };
  }
  actualizar(ahora) {
    if (!this.enMarcha || document.hidden) { this.sincronizar(); return; }
    const delta = this.ultimoTiempo === null ? 0 : Math.min(.05, (ahora - this.ultimoTiempo) / 1000);
    this.ultimoTiempo = ahora;
    const paso = delta * this.velocidad;
    for (const p of this.particulas) p.edad += paso;
    this.particulas = this.particulas.filter((p) => p.edad < p.vida);
    this.acumulado += paso;
    const intervalo = [0, .8, .54, .39][this.cantidad] * azar(.85, 1.15);
    if (this.continua && this.acumulado >= intervalo) { this.crear(); this.acumulado = 0; }
    this.pintar();
    if (!this.continua && !this.particulas.length) { this.pausar(); return; }
    this.raf = requestAnimationFrame((t) => this.actualizar(t));
  }
  // Perfil de conversación sobre la proyección original: mismos recorridos y
  // profundidad, acotados a un tamaño discreto en píxeles CSS. El motor base
  // conserva su proyección y sus texturas; no se sustituyen por otra animación.
  adaptarProyeccion(p, v) {
    if (!this.delicado) return v;
    const unidad = this.unidadCss;
    const textura = this.texturas.get(p.emocion);
    const profundidad = limitar((v.escala - 850 / 4200) / (850 / 95 - 850 / 4200));
    const escala = 1 + profundidad * .5;
    const tamano = 18 + (p.tamano - 235) / (370 - 235) * 10;
    return {
      ...v,
      x: p.origenX + (v.x - p.origenX) * .045 * unidad,
      y: p.origenY + (v.y - p.origenY) * .045 * unidad,
      ancho: tamano * unidad * escala / (1 - 2 * textura.margen),
      opacidad: Math.min(1, v.t / .08) * (1 - limitar((v.t - .5) / .5)),
      blur: v.blur * .35
    };
  }
  pintar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    // La capa conserva siempre su canal alfa, incluso entre ráfagas.
    const vistas = this.particulas.map((p) => ({ p, v: this.adaptarProyeccion(p, this.proyectar(p)) })).sort((a, b) => b.v.z - a.v.z);
    let visibles = 0;
    for (const { p, v } of vistas) {
      const textura = this.texturas.get(p.emocion);
      if (!textura) continue;
      const alto = v.ancho * textura.aspecto;
      if (v.x + v.ancho < 0 || v.x - v.ancho > this.ancho || v.y + alto < 0 || v.y - alto > this.alto) continue;
      visibles++;
      ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.rotacion);
      const indice = Math.min(2.999, v.blur), inferior = Math.floor(indice), mezcla = indice - inferior;
      // Estela corta solo en algunos elementos al atravesar la cámara.
      if (p.estela && v.t > .75) {
        ctx.globalAlpha = v.opacidad * .09;
        ctx.drawImage(textura.capas[Math.min(3, inferior + 1)], -v.ancho / 2 - p.x * .025 * v.escala, -alto / 2 - p.y * .025 * v.escala, v.ancho, alto);
      }
      ctx.globalAlpha = v.opacidad * (1 - mezcla);
      ctx.drawImage(textura.capas[inferior], -v.ancho / 2, -alto / 2, v.ancho, alto);
      if (mezcla > .001) {
        ctx.globalAlpha = v.opacidad * mezcla;
        ctx.drawImage(textura.capas[inferior + 1], -v.ancho / 2, -alto / 2, v.ancho, alto);
      }
      ctx.restore();
    }
    this.canvas.dataset.particulas = String(this.particulas.length);
    this.canvas.dataset.visibles = String(visibles);
    this.canvas.dataset.fondo = this.transparente ? "transparente" : "blanco";
  }
  destruir() {
    this.destruido = true; this.pausar(); this.version++;
    document.removeEventListener("visibilitychange", this.alVisibilidad);
    this.particulas = []; this.texturas.clear(); this.pendientes.clear();
    this.emocion = null; this.pintar();
  }
}

export { CascadaEmojis, EMOCIONES };
