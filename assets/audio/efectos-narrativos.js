/* Efectos de archivos locales, independientes de la banda sonora. Los MP3 son
   largos: se reproducen ventanas breves sin decodificarlos completos en memoria. */
(() => {
  "use strict";
  const RECURSOS = Object.freeze({
    enviar: { archivo: "assets/Audios/enviar-mensaje.mp3", volumen: .62, duracion: 1.2 },
    vueltas: { archivo: "assets/Audios/vueltas.mp3", volumen: .23, duracion: 2.6 },
    hola: { archivo: "assets/Audios/despues-hola.mp3", volumen: .2,
      entrada: 1, inicioSalida: 10, duracion: 12, sostenido: true },
    lluvia: { archivo: "assets/Audios/Pulso_Celeste_Sonidos/lluvia_estrellas_5s.mp3",
      volumen: .3, duracion: 5 }
  });

  class EfectosNarrativos {
    constructor() {
      this.contexto = null;
      this.destruida = false;
      this.suspendida = false;
      this.giroEmitido = false;
      this.config = { mudo: false, pausa: false, girando: false, tiempoGiro: 0 };
      this.efectos = new Map();
      for (const [id, recurso] of Object.entries(RECURSOS)) {
        const media = new Audio(recurso.archivo);
        media.preload = "metadata";
        media.loop = false;
        media.hidden = true;
        media.dataset.efectoNarrativo = id;
        media.setAttribute("aria-hidden", "true");
        document.body.append(media);
        const efecto = { id, media, recurso, ganancia: null, fuente: null,
          activo: false, preparado: false, preparando: false, revision: 0, timer: 0, salida: 0 };
        this.efectos.set(id, efecto);
        this.publicar(efecto, "esperando-gesto");
        media.addEventListener("error", () => {
          if (efecto.liberado) return;
          this.detener(id);
          this.publicar(efecto, "error", "No se pudo cargar el MP3 local");
        });
        media.addEventListener("ended", () => this.detener(id));
        if (recurso.sostenido) {
          media.addEventListener("waiting", () => {
            if (!efecto.activo || efecto.pausada) return;
            clearTimeout(efecto.timer);
            efecto.timer = 0;
            this.silenciarHola(efecto);
            this.publicar(efecto, "esperando-datos");
          });
          media.addEventListener("playing", () => {
            if (efecto.activo && !efecto.pausada && !this.bloqueada()
              && this.contexto?.state === "running") this.programarHola(efecto);
          });
        }
      }
    }

    publicar(efecto, estado, error = "") {
      if (efecto.id === "hola" && efecto.ultimoEstado !== estado) {
        efecto.ultimoEstado = estado;
        efecto.historial ||= [];
        efecto.historial.push({ estado, segundo: Number(efecto.media.dataset.tiempoTransicion || 0) });
        efecto.media.dataset.historialAudio = JSON.stringify(efecto.historial);
      }
      Object.assign(efecto.media.dataset, { estado, error,
        volumenEfecto: String(efecto.recurso.volumen) });
    }

    bloqueada() {
      return this.destruida || this.suspendida || this.config.mudo || this.config.pausa;
    }

    // Se llama sin await dentro de un gesto real. Cada elemento se habilita en
    // silencio para que el comienzo temporizado de las vueltas funcione en iOS.
    desbloquear() {
      if (this.bloqueada()) return;
      try {
        if (!this.contexto) {
          const Contexto = window.AudioContext || window.webkitAudioContext;
          if (!Contexto) return;
          this.contexto = new Contexto();
          this.contexto.onstatechange = () => {
            if (this.contexto.state === "running") this.sincronizarHola();
            else this.pausarHola();
          };
        }
        if (this.contexto.state !== "running") {
          this.contexto.resume().then(() => this.sincronizarHola()).catch(() => {});
        }
        for (const efecto of this.efectos.values()) {
          if (efecto.liberado) continue;
          if (!efecto.fuente) {
            efecto.ganancia = this.contexto.createGain();
            efecto.ganancia.gain.value = 0;
            efecto.fuente = this.contexto.createMediaElementSource(efecto.media);
            efecto.fuente.connect(efecto.ganancia);
            efecto.ganancia.connect(this.contexto.destination);
          }
          if (efecto.preparado || efecto.preparando || efecto.activo) continue;
          efecto.preparando = true;
          const version = efecto.revision;
          efecto.media.play().then(() => {
            efecto.preparando = false;
            efecto.preparado = true;
            if (version === efecto.revision && !efecto.activo) {
              efecto.media.pause();
              efecto.media.currentTime = 0;
            } else if (!efecto.activo && !efecto.salida) efecto.media.pause();
          }).catch(() => { efecto.preparando = false; });
        }
        const hola = this.efectos.get("hola");
        hola.esperaGesto = false;
        this.sincronizarHola();
        if (this.efectos.get("vueltas").media.dataset.estado === "bloqueado") this.giroEmitido = false;
        this.sincronizarVueltas();
      } catch { /* Un navegador sin Web Audio conserva la experiencia visual. */ }
    }

    disparar(id, { segundo = 0, duracion = RECURSOS[id].duracion } = {}) {
      if (id === "hola") return this.iniciarHola();
      const efecto = this.efectos.get(id);
      if (!efecto || efecto.activo || this.bloqueada() || !efecto.ganancia) return false;
      clearTimeout(efecto.timer);
      clearTimeout(efecto.salida);
      efecto.salida = 0;
      const version = ++efecto.revision;
      efecto.activo = true;
      const limite = this.contexto.currentTime + duracion;
      efecto.media.dataset.activaciones = String(Number(efecto.media.dataset.activaciones || 0) + 1);
      try {
        efecto.media.currentTime = Math.max(0, segundo);
        const gain = efecto.ganancia.gain;
        gain.cancelScheduledValues(this.contexto.currentTime);
        gain.setValueAtTime(0, this.contexto.currentTime);
        this.publicar(efecto, "cargando");
        // Límite desde el evento narrativo, incluso si play() o la red tardan.
        efecto.timer = setTimeout(() => this.detener(id), Math.max(0, duracion) * 1000);
        efecto.media.play().then(() => {
          if (version !== efecto.revision || this.bloqueada() || !efecto.activo) {
            if (!efecto.activo && !efecto.salida) efecto.media.pause();
            return;
          }
          efecto.preparado = true;
          const ahora = this.contexto.currentTime;
          const restante = limite - ahora;
          if (restante <= .04) { this.detener(id); return; }
          gain.setValueAtTime(0, ahora);
          gain.linearRampToValueAtTime(efecto.recurso.volumen, ahora + Math.min(.035, restante / 4));
          // El corte de cada ventana siempre tiene una salida suave.
          const salida = Math.max(restante / 4, restante - .15);
          gain.setValueAtTime(efecto.recurso.volumen, ahora + salida);
          gain.linearRampToValueAtTime(0, limite);
          this.publicar(efecto, "sonando");
        }).catch(() => {
          if (version === efecto.revision) {
            this.detener(id);
            this.publicar(efecto, "bloqueado");
          }
        });
        return true;
      } catch {
        this.detener(id);
        this.publicar(efecto, "no-disponible");
        return false;
      }
    }

    detener(id, fundido = 0) {
      const efecto = this.efectos.get(id);
      if (!efecto) return;
      if (efecto.recurso.sostenido) { this.terminarHola(); return; }
      const estabaActivo = efecto.activo;
      const version = ++efecto.revision;
      efecto.activo = false;
      clearTimeout(efecto.timer);
      clearTimeout(efecto.salida);
      efecto.timer = efecto.salida = 0;
      const terminar = () => {
        if (version !== efecto.revision) return;
        efecto.media.pause();
        try { efecto.media.currentTime = 0; } catch { /* Metadatos aún pendientes. */ }
        efecto.salida = 0;
        this.publicar(efecto, this.destruida ? "cerrado" : "detenido");
      };
      if (efecto.ganancia) {
        const gain = efecto.ganancia.gain, ahora = this.contexto.currentTime;
        const nivel = gain.value;
        gain.cancelScheduledValues(ahora);
        gain.setValueAtTime(nivel, ahora);
        if (fundido > 0 && estabaActivo && !efecto.media.paused) {
          gain.linearRampToValueAtTime(0, ahora + fundido);
          efecto.salida = setTimeout(terminar, fundido * 1000);
          this.publicar(efecto, "saliendo");
          return;
        }
        gain.setValueAtTime(0, ahora);
      }
      terminar();
    }

    actualizar(config) {
      if (this.destruida) return;
      this.config = { ...this.config, ...config };
      this.sincronizarHola();
      if (this.bloqueada()) {
        this.giroEmitido = false;
        for (const [id, efecto] of this.efectos) {
          if (!efecto.recurso.sostenido) this.detener(id);
        }
      } else this.sincronizarVueltas();
    }

    sincronizarVueltas() {
      const efecto = this.efectos.get("vueltas");
      if (!this.config.girando || this.bloqueada()) {
        this.giroEmitido = false;
        if (efecto.activo) this.detener("vueltas", this.bloqueada() ? 0 : .1);
      } else if (!efecto.activo && !this.giroEmitido && this.config.tiempoGiro < RECURSOS.vueltas.duracion - .04) {
        // Al reanudar/salir del silencio se usa el tiempo real de la animación.
        this.giroEmitido = this.disparar("vueltas", { segundo: this.config.tiempoGiro,
          duracion: RECURSOS.vueltas.duracion - this.config.tiempoGiro });
      }
    }

    suspenderPagina() {
      this.suspendida = true;
      this.giroEmitido = false;
      this.pausarHola();
      for (const [id, efecto] of this.efectos) {
        if (!efecto.recurso.sostenido) this.detener(id);
      }
    }

    reanudarPagina() { this.suspendida = false; }

    iniciarHola() {
      const efecto = this.efectos.get("hola");
      if (this.destruida || efecto.activado || efecto.liberado) return false;
      efecto.activado = efecto.activo = true;
      efecto.pausada = true;
      efecto.media.dataset.activaciones = "1";
      efecto.media.dataset.tiempoTransicion = "0.000";
      this.sincronizarHola();
      return true;
    }

    silenciarHola(efecto) {
      if (!efecto.ganancia) return;
      const ahora = this.contexto.currentTime;
      efecto.ganancia.gain.cancelScheduledValues(ahora);
      efecto.ganancia.gain.setValueAtTime(0, ahora);
    }

    pausarHola() {
      const efecto = this.efectos.get("hola");
      if (!efecto?.activo) return;
      if (!efecto.pausada || efecto.intentando) ++efecto.revision;
      efecto.intentando = false;
      efecto.pausada = true;
      clearTimeout(efecto.timer);
      efecto.timer = 0;
      efecto.media.pause();
      this.silenciarHola(efecto);
      efecto.media.dataset.tiempoTransicion = efecto.media.currentTime.toFixed(3);
      this.publicar(efecto, this.config.mudo ? "silencio" : "pausa");
    }

    sincronizarHola() {
      const efecto = this.efectos.get("hola");
      if (!efecto?.activo || this.destruida) return;
      if (this.bloqueada() || this.contexto?.state !== "running") {
        this.pausarHola(); return;
      }
      if (!efecto.ganancia || efecto.intentando || efecto.esperaGesto
        || (!efecto.pausada && !efecto.media.paused)) return;
      const version = ++efecto.revision;
      efecto.pausada = false;
      efecto.intentando = true;
      this.publicar(efecto, "cargando");
      efecto.media.play().then(() => {
        if (version !== efecto.revision) {
          if (this.bloqueada() || !efecto.activo || efecto.pausada) efecto.media.pause();
          return;
        }
        efecto.intentando = false;
        if (this.bloqueada() || !efecto.activo) { this.pausarHola(); return; }
        efecto.preparado = true;
        this.programarHola(efecto);
      }).catch(() => {
        if (version !== efecto.revision || !efecto.activo) return;
        efecto.intentando = false;
        efecto.esperaGesto = true;
        this.pausarHola();
        this.publicar(efecto, "esperando-gesto");
      });
    }

    nivelHola(efecto, tiempo) {
      const r = efecto.recurso;
      return r.volumen * Math.max(0, Math.min(tiempo / r.entrada, 1,
        (r.duracion - tiempo) / (r.duracion - r.inicioSalida)));
    }

    programarHola(efecto) {
      if (!efecto.activo || efecto.pausada || this.bloqueada()) return;
      const t = efecto.media.currentTime, r = efecto.recurso;
      if (t >= r.duracion) { this.terminarHola(); return; }
      const ahora = this.contexto.currentTime, gain = efecto.ganancia.gain;
      gain.cancelScheduledValues(ahora);
      gain.setValueAtTime(this.nivelHola(efecto, t), ahora);
      if (t < r.entrada) gain.linearRampToValueAtTime(r.volumen, ahora + r.entrada - t);
      if (t < r.inicioSalida) gain.setValueAtTime(r.volumen, ahora + r.inicioSalida - t);
      gain.linearRampToValueAtTime(0, ahora + r.duracion - t);
      clearTimeout(efecto.timer);
      this.vigilarHola(efecto);
    }

    vigilarHola(efecto) {
      efecto.timer = 0;
      if (!efecto.activo || efecto.pausada || this.bloqueada()) return;
      const t = efecto.media.currentTime, r = efecto.recurso;
      efecto.media.dataset.tiempoTransicion = t.toFixed(3);
      efecto.media.dataset.nivelTransicion = this.nivelHola(efecto, t).toFixed(4);
      if (t >= r.duracion - .005) { this.terminarHola(); return; }
      this.publicar(efecto, t < r.entrada ? "entrada" : t < r.inicioSalida ? "sostenido" : "salida");
      // El reloj es el tiempo reproducido del MP3: pausa y buffering no consumen
      // los 10 segundos. Solo este efecto atraviesa los cambios normales de escena.
      efecto.timer = setTimeout(() => this.vigilarHola(efecto), Math.min(100, (r.duracion - t) * 1000));
    }

    terminarHola() {
      const efecto = this.efectos.get("hola");
      if (!efecto || efecto.liberado) return;
      ++efecto.revision;
      efecto.activo = efecto.intentando = false;
      efecto.pausada = true;
      efecto.liberado = true;
      clearTimeout(efecto.timer);
      clearTimeout(efecto.salida);
      efecto.timer = efecto.salida = 0;
      efecto.media.dataset.tiempoTransicion = efecto.media.currentTime.toFixed(3);
      efecto.media.pause();
      this.silenciarHola(efecto);
      efecto.fuente?.disconnect(); efecto.ganancia?.disconnect();
      efecto.fuente = efecto.ganancia = null;
      efecto.media.removeAttribute("src");
      efecto.media.load();
      efecto.media.dataset.nivelTransicion = "0.0000";
      efecto.media.dataset.recursosLiberados = "true";
      this.publicar(efecto, this.destruida ? "cerrado" : "terminado");
    }

    destruir() {
      if (this.destruida) return;
      this.destruida = true;
      for (const [id, efecto] of this.efectos) {
        this.detener(id);
        efecto.fuente?.disconnect();
        efecto.ganancia?.disconnect();
        efecto.media.removeAttribute("src");
        efecto.media.load();
        efecto.media.remove();
      }
      this.contexto?.close().catch(() => {});
    }
  }
  window.PulsoEfectos = Object.freeze({ EfectosNarrativos });
})();
