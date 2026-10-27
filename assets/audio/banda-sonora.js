/* Música de archivos locales. Un solo ambiente activo; los efectos conservan
   su propio sistema. Sin autoplay: AudioContext se desbloquea desde un gesto. */
(() => {
  "use strict";
  // Una única identidad musical: ninguna escena selecciona ni reinicia pistas.
  const BACKGROUND_MUSIC_VOLUME = 0.04;
  const BACKGROUND_FADE_IN_SECONDS = 1.5;
  const PISTAS = Object.freeze({
    fondo: { archivo: "assets/Audios/fondo.mp3", volumen: BACKGROUND_MUSIC_VOLUME }
  });

  class BandaSonora {
    constructor(alEstado = () => {}) {
      this.alEstado = alEstado;
      this.contexto = null;
      this.actual = null;
      this.cache = new Map();
      this.config = { pista: null, pausa: false, mudo: false, inmediata: false };
      this.posicion = null;
      this.revision = 0;
      this.cancelarFundido = null;
      this.desbloqueada = false;
      this.paginaSuspendida = false;
      this.destruida = false;
      this.estado = "esperando-gesto";
      this.secuenciaFuentes = 0;
    }

    publicar(estado, error = "") {
      this.estado = estado;
      this.alEstado({ estado, deseada: this.config.pista || "", actual: this.actual?.id || "",
        archivo: PISTAS[this.config.pista]?.archivo || "", volumen: PISTAS[this.config.pista]?.volumen || 0,
        contexto: this.contexto?.state || "sin-iniciar", duracion: this.actual?.buffer.duration || 0,
        fuente: this.actual?.secuencia || 0,
        segundo: this.actual ? (this.actual.offset + Math.max(0, this.contexto.currentTime - this.actual.inicio)) % this.actual.buffer.duration
          : this.posicion?.segundo || 0, error });
    }

    desbloquear() {
      if (this.destruida || this.config.mudo || this.paginaSuspendida) return;
      try {
        if (!this.contexto) {
          const Contexto = window.AudioContext || window.webkitAudioContext;
          if (!Contexto) { this.publicar("no-disponible"); return; }
          this.contexto = new Contexto();
          this.contexto.onstatechange = () => {
            if (!this.destruida && this.contexto.state !== "running") this.publicar("interrumpido");
          };
        }
        const primera = !this.desbloqueada;
        this.desbloqueada = true;
        // resume() se invoca antes de cualquier await para Safari/iOS.
        if (this.contexto.state !== "running") {
          this.contexto.resume().then(() => {
            if (!this.destruida) this.procesar(++this.revision);
          }).catch(() => this.publicar("esperando-gesto"));
        } else if (primera || ["error", "esperando-gesto", "interrumpido"].includes(this.estado)) {
          this.procesar(++this.revision);
        }
      } catch (error) { this.publicar("no-disponible", error.message); }
    }

    actualizar(config) {
      if (this.destruida) return;
      const siguiente = { pista: config.pista || null, pausa: Boolean(config.pausa),
        mudo: Boolean(config.mudo), inmediata: Boolean(config.inmediata) };
      if (Object.keys(siguiente).every((clave) => siguiente[clave] === this.config[clave])) {
        this.publicar(this.estado);
        return;
      }
      this.config = siguiente;
      this.procesar(++this.revision);
    }

    async cargar(id) {
      if (!this.cache.has(id)) {
        const promesa = (async () => {
          const respuesta = await fetch(PISTAS[id].archivo);
          if (!respuesta.ok) throw new Error(`No se pudo cargar ${PISTAS[id].archivo} (${respuesta.status})`);
          const buffer = await this.contexto.decodeAudioData(await respuesta.arrayBuffer());
          if (!buffer.duration || !buffer.length) throw new Error("Archivo musical vacío");
          return buffer;
        })().catch((error) => { this.cache.delete(id); throw error; });
        this.cache.set(id, promesa);
      }
      return this.cache.get(id);
    }

    fundir(volumen, segundos) {
      this.cancelarFundido?.();
      const actual = this.actual;
      if (!actual) return Promise.resolve(true);
      const ahora = this.contexto.currentTime;
      const parametro = actual.ganancia.gain;
      const desde = parametro.value;
      parametro.cancelScheduledValues(ahora);
      parametro.setValueAtTime(desde, ahora);
      parametro.linearRampToValueAtTime(volumen, ahora + segundos);
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.cancelarFundido = null;
          resolve(true);
        }, segundos * 1000);
        this.cancelarFundido = () => {
          clearTimeout(timer);
          this.cancelarFundido = null;
          resolve(false);
        };
      });
    }

    parar(conservar = false) {
      if (!this.actual) return;
      const { id, fuente, ganancia, inicio, offset, buffer } = this.actual;
      this.posicion = conservar
        ? { id, segundo: (offset + Math.max(0, this.contexto.currentTime - inicio)) % buffer.duration }
        : null;
      ganancia.gain.cancelScheduledValues(this.contexto.currentTime);
      ganancia.gain.setValueAtTime(0, this.contexto.currentTime);
      try { fuente.stop(); } catch { /* Una fuente ya terminada queda desconectada. */ }
      fuente.disconnect();
      ganancia.disconnect();
      this.actual = null;
    }

    async procesar(revision) {
      try {
        await this.reconciliar(revision);
      } catch (error) {
        if (revision !== this.revision || this.destruida) return;
        this.parar();
        this.publicar("error", error.message);
      }
    }

    async reconciliar(revision) {
      this.cancelarFundido?.();
      if (this.destruida) return;
      if (this.config.mudo || this.config.pausa || this.paginaSuspendida || !this.config.pista) {
        // Ocultar/cerrar/silenciar detiene de inmediato. La pausa de revisión
        // visible usa un fundido corto y conserva la posición de reproducción.
        if (this.actual && !this.config.inmediata && !this.config.mudo && !this.paginaSuspendida) {
          await this.fundir(0, .16);
          if (revision !== this.revision) return;
        }
        this.parar(true);
        this.publicar(this.config.mudo ? "silencio" : "pausa");
        return;
      }
      if (!this.desbloqueada || !this.contexto || this.contexto.state !== "running") {
        this.publicar("esperando-gesto");
        return;
      }
      const id = this.config.pista;
      if (this.actual?.id === id) {
        this.fundir(PISTAS[id].volumen, .45);
        this.publicar("sonando");
        return;
      }
      this.publicar("cargando");
      // Fundido secuencial: parar el ambiente saliente ANTES de arrancar otro.
      const salida = this.fundir(0, .85).then(() => {
        if (revision === this.revision) this.parar(false);
      });
      const [carga] = await Promise.allSettled([this.cargar(id), salida]);
      if (revision !== this.revision || this.destruida) return;
      if (carga.status === "rejected") {
        this.publicar("error", carga.reason.message);
        return;
      }
      if (this.contexto.state !== "running") { this.publicar("esperando-gesto"); return; }
      const buffer = carga.value;
      const fuente = this.contexto.createBufferSource();
      const ganancia = this.contexto.createGain();
      const offset = this.posicion?.id === id ? this.posicion.segundo : 0;
      this.posicion = null;
      fuente.buffer = buffer;
      fuente.loop = true;
      fuente.connect(ganancia);
      ganancia.connect(this.contexto.destination);
      ganancia.gain.setValueAtTime(0, this.contexto.currentTime);
      this.actual = { id, fuente, ganancia, buffer, offset, inicio: this.contexto.currentTime,
        secuencia: ++this.secuenciaFuentes };
      fuente.start(0, offset);
      this.fundir(PISTAS[id].volumen, BACKGROUND_FADE_IN_SECONDS);
      // Liberar los PCM de escenas anteriores: solo permanece el buffer activo.
      for (const clave of this.cache.keys()) if (clave !== id) this.cache.delete(clave);
      this.publicar("sonando");
    }

    suspenderPagina() {
      this.paginaSuspendida = true;
      this.procesar(++this.revision);
      this.contexto?.suspend().catch(() => {});
    }

    reanudarPagina() {
      this.paginaSuspendida = false;
      if (this.desbloqueada) {
        this.publicar("interrumpido");
        this.desbloquear();
      }
    }

    destruir() {
      if (this.destruida) return;
      this.destruida = true;
      ++this.revision;
      this.cancelarFundido?.();
      this.parar();
      this.cache.clear();
      this.contexto?.close().catch(() => {});
    }
  }

  window.PulsoMusica = { BandaSonora, PISTAS, BACKGROUND_MUSIC_VOLUME, BACKGROUND_FADE_IN_SECONDS };
})();
