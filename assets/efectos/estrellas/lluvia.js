const azar = (min, max) => min + Math.random() * (max - min);
const limitar = (n) => Math.max(0, Math.min(1, n));
const suave = (n) => { const t = limitar(n); return t * t * (3 - 2 * t); };
const pausa = () => new Promise((resolve) => setTimeout(resolve, 0));
const RECURSO = new URL("../../lluvia-estrellas.png", import.meta.url);

// El PNG es una composición de siete estelas y seis luces, no una tira de
// frames. Se separan por su alfa en memoria, sin recolorear ni guardar derivados.
async function prepararTexturas(imagen) {
  const ancho = imagen.naturalWidth, alto = imagen.naturalHeight, total = ancho * alto;
  const original = document.createElement("canvas");
  original.width = ancho; original.height = alto;
  const ctx = original.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0);
  const pixels = ctx.getImageData(0, 0, ancho, alto).data;
  const etiquetas = new Int32Array(total), cola = new Int32Array(total);
  const componentes = [];
  let etiqueta = 0;
  for (let inicio = 0; inicio < total; inicio++) {
    if (etiquetas[inicio] || pixels[inicio * 4 + 3] < 12) continue;
    const id = ++etiqueta;
    let cabeza = 0, fin = 1;
    cola[0] = inicio; etiquetas[inicio] = id;
    let izquierda = ancho, derecha = 0, arriba = alto, abajo = 0;
    const visitar = (i) => {
      if (!etiquetas[i] && pixels[i * 4 + 3] >= 12) {
        etiquetas[i] = id; cola[fin++] = i;
      }
    };
    while (cabeza < fin) {
      const i = cola[cabeza++], x = i % ancho, y = Math.floor(i / ancho);
      izquierda = Math.min(izquierda, x); derecha = Math.max(derecha, x);
      arriba = Math.min(arriba, y); abajo = Math.max(abajo, y);
      if (x) visitar(i - 1);
      if (x + 1 < ancho) visitar(i + 1);
      if (y) visitar(i - ancho);
      if (y + 1 < alto) visitar(i + ancho);
    }
    if (fin > 300) componentes.push({ id, area: fin, izquierda, derecha, arriba, abajo });
    if (fin > 10000) await pausa();
  }
  // Extender las etiquetas hacia el halo tenue conserva los bordes suaves,
  // asignando cada píxel a una sola estrella aunque sus resplandores se toquen.
  const validas = new Set(componentes.map((c) => c.id));
  const distancia = new Uint8Array(total);
  let cabeza = 0, fin = 0;
  for (let i = 0; i < total; i++) {
    if (validas.has(etiquetas[i])) cola[fin++] = i;
    else etiquetas[i] = 0;
  }
  const extender = (i, j) => {
    if (!etiquetas[j] && pixels[j * 4 + 3]) {
      etiquetas[j] = etiquetas[i]; distancia[j] = distancia[i] + 1; cola[fin++] = j;
    }
  };
  while (cabeza < fin) {
    const i = cola[cabeza++];
    if (distancia[i] >= 24) continue;
    const x = i % ancho, y = Math.floor(i / ancho);
    if (x) extender(i, i - 1);
    if (x + 1 < ancho) extender(i, i + 1);
    if (y) extender(i, i - ancho);
    if (y + 1 < alto) extender(i, i + ancho);
  }
  const texturas = [];
  for (const c of componentes) {
    const x0 = Math.max(0, c.izquierda - 24), y0 = Math.max(0, c.arriba - 24);
    const w = Math.min(ancho, c.derecha + 25) - x0, h = Math.min(alto, c.abajo + 25) - y0;
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const destino = canvas.getContext("2d"), datos = destino.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y + y0) * ancho + x + x0;
      if (etiquetas[i] !== c.id) continue;
      const origen = i * 4, p = (y * w + x) * 4;
      datos.data[p] = pixels[origen]; datos.data[p + 1] = pixels[origen + 1];
      datos.data[p + 2] = pixels[origen + 2]; datos.data[p + 3] = pixels[origen + 3];
    }
    destino.putImageData(datos, 0, 0);
    texturas.push({ canvas, aspecto: h / w, estela: c.area > 10000 });
    await pausa();
  }
  return texturas;
}

export class LluviaEstrellas {
  constructor(canvas, visible) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.visible = visible;
    this.texturas = [];
    this.particulas = [];
    this.carga = null;
    this.activa = false;
    this.destruida = false;
    this.raf = 0; this.ultimo = null; this.tiempo = 0; this.acumulado = 0; this.salida = 0;
    this.inicioSalida = Infinity;
    this.ancho = 390; this.alto = 693; this.maximo = 12;
    this.reducido = matchMedia("(prefers-reduced-motion: reduce)");
    this.alVisibilidad = () => this.sincronizar();
    document.addEventListener("visibilitychange", this.alVisibilidad);
    this.medidas = new ResizeObserver(() => { this.redimensionar(); this.sincronizar(); });
    this.medidas.observe(canvas);
    this.redimensionar();
  }
  cargar() {
    if (this.carga) return this.carga;
    this.carga = (async () => {
      const imagen = new Image(); imagen.src = RECURSO.href;
      await imagen.decode();
      const texturas = await prepararTexturas(imagen);
      if (this.destruida) return;
      this.texturas = texturas;
      this.canvas.dataset.texturas = String(texturas.length);
      this.canvas.dataset.listo = "true";
    })().catch((error) => { this.carga = null; throw error; });
    return this.carga;
  }
  redimensionar() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const anteriorW = this.ancho, anteriorH = this.alto;
    this.ancho = rect.width; this.alto = rect.height;
    this.maximo = this.ancho * this.alto < 120000 ? 9 : 13;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.ancho * dpr); this.canvas.height = Math.round(this.alto * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of this.particulas) { p.x *= this.ancho / anteriorW; p.y *= this.alto / anteriorH; }
    this.pintar();
  }
  crear(inicial = false) {
    if (!this.texturas.length || this.particulas.length >= this.maximo) return;
    const capa = Math.random() < .22 ? 2 : Math.random() < .58 ? 1 : 0;
    const esEstela = Math.random() < .76;
    const candidatas = this.texturas.filter((t) => t.estela === esEstela);
    const textura = candidatas[Math.floor(Math.random() * candidatas.length)];
    const base = Math.max(.8, Math.min(1.15, this.ancho / 390));
    const tamano = (esEstela ? azar(...[[90, 122], [125, 165], [168, 205]][capa]) : azar(19, 32)) * base;
    const velocidad = azar(...[[34, 48], [50, 68], [72, 91]][capa]) * (this.reducido.matches ? .4 : 1);
    // Bandas escalonadas evitan que todas las estrellas salgan del mismo punto.
    const banda = Math.floor(Math.random() * 5);
    const desdeArriba = Math.random() < .48;
    this.particulas.push({
      textura, capa, tamano, edad: 0, vida: azar(6, 8.5),
      x: inicial ? azar(.2, 1.05) * this.ancho : desdeArriba ? azar(.35, 1.1) * this.ancho : this.ancho + tamano * .1,
      y: inicial ? (banda + azar(.1, .8)) / 5 * this.alto : desdeArriba ? -tamano * .12 : (banda + azar(.1, .8)) / 5 * this.alto - tamano * .2,
      vx: -velocidad, vy: velocidad * azar(.56, .74),
      opacidad: [[.36, .52], [.52, .72], [.7, .88]][capa][0] + Math.random() * .13
    });
  }
  iniciar({ duracion = Infinity } = {}) {
    if (this.destruida || !this.texturas.length || this.activa) return;
    this.activa = true; this.salida = 0; this.tiempo = 0; this.acumulado = 0;
    this.inicioSalida = Math.max(0, duracion - 1.5);
    for (let i = 0; i < 4; i++) this.crear(true);
    this.canvas.dataset.emitiendo = "true";
    this.canvas.dataset.duracion = String(duracion);
    this.canvas.dataset.terminada = "false";
    this.sincronizar();
  }
  detener() {
    if (!this.activa) return;
    this.activa = false; this.salida = 0;
    this.inicioSalida = this.tiempo;
    this.canvas.dataset.emitiendo = "false";
    this.sincronizar();
  }
  sincronizar() {
    cancelAnimationFrame(this.raf); this.raf = 0; this.ultimo = null;
    if (this.visible() && (this.activa || this.particulas.length)) {
      this.raf = requestAnimationFrame((t) => this.actualizar(t));
    }
  }
  actualizar(ahora) {
    if (!this.visible()) { this.sincronizar(); return; }
    const dt = this.ultimo === null ? 0 : Math.min(.05, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora; this.tiempo += dt;
    if (this.activa && this.tiempo >= this.inicioSalida) {
      this.activa = false;
      this.canvas.dataset.emitiendo = "false";
    }
    if (this.activa) {
      this.acumulado += dt;
      const intervalo = this.tiempo < 2.2 ? .62 : .4;
      if (this.acumulado >= intervalo) { this.crear(); this.acumulado = 0; }
    } else this.salida = this.tiempo - this.inicioSalida;
    for (const p of this.particulas) { p.edad += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particulas = this.particulas.filter((p) => p.edad < p.vida && p.x > -p.tamano * .5 && p.y < this.alto + p.tamano * p.textura.aspecto * .5);
    if (!this.activa && this.salida >= 1.5) {
      this.particulas = [];
      this.canvas.dataset.terminada = "true";
    }
    this.pintar();
    if (this.activa || this.particulas.length) this.raf = requestAnimationFrame((t) => this.actualizar(t));
    else this.raf = 0;
  }
  pintar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    const salida = this.activa ? 1 : 1 - suave(this.salida / 1.5);
    for (const p of [...this.particulas].sort((a, b) => a.capa - b.capa)) {
      ctx.globalAlpha = p.opacidad * suave(p.edad / .7) * suave((p.vida - p.edad) / 1.4) * salida;
      // Tamaño fijo durante toda la vida: profundidad por capas, sin zoom ni z.
      ctx.drawImage(p.textura.canvas, p.x - p.tamano / 2, p.y - p.tamano * p.textura.aspecto / 2, p.tamano, p.tamano * p.textura.aspecto);
    }
    ctx.globalAlpha = 1;
    this.canvas.dataset.particulas = String(this.particulas.length);
    this.canvas.dataset.tiempo = this.tiempo.toFixed(2);
    this.canvas.dataset.direccion = "derecha-izquierda-abajo";
  }
  destruir() {
    if (this.destruida) return;
    this.activa = false;
    this.canvas.dataset.emitiendo = "false";
    this.destruida = true; cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.alVisibilidad);
    this.medidas.disconnect(); this.particulas = []; this.texturas = []; this.pintar();
  }
}
