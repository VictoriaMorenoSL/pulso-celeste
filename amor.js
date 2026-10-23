const intro = document.querySelector("#intro");
const lienzo = document.querySelector(".lienzo");
const cursorTactil = document.querySelector(".cursor-tactil");
const escenaTres = document.querySelector(".escena-tres");
const personajeCaminando = document.querySelector(".personaje-caminando");
const posicionProtagonista = document.querySelector(".posicion-protagonista");
const personajeDePie = document.querySelector(".personaje-de-pie");
const pasoProtagonista = document.querySelector(".paso-protagonista");
const arcoTransicion = document.querySelector(".arco-transicion");
const sueloTres = document.querySelector(".suelo-tres");
const parametros = new URLSearchParams(window.location.search);
const dispositivoTactil = window.matchMedia("(pointer: coarse)").matches;
// En escritorio la orientación se simula para poder recorrer toda la experiencia
// sin girar físicamente una pantalla. El parámetro `1` también permite forzarla
// en navegadores de escritorio que emulan un puntero táctil.
const revisionSolicitada = parametros.get("revisarGiro");
const revisionGiro = revisionSolicitada === "1" || (!dispositivoTactil && revisionSolicitada !== "0");
const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
const escenaCuatro = document.querySelector(".escena-cuatro");
const escenaCinco = document.querySelector(".escena-cinco");
const personajeEspaldas = document.querySelector(".personaje-espaldas");
const interaccionChispa = document.querySelector("#interaccionChispa");
const chispaAnimada = document.querySelector(".chispa");
const controlChispa = document.querySelector("#controlChispa");
const permisoCamara = document.querySelector("#permisoCamara");
const activarCamara = document.querySelector("#activarCamara");
const omitirCamara = document.querySelector("#omitirCamara");
const videoCamara = document.querySelector("#videoCamara");
const lienzoCamara = document.querySelector("#analisisCamara");
const indicacionParpadeo = document.querySelector("#indicacionParpadeo");
const continuarCapituloDos = document.querySelector("#continuarCapituloDos");
const simularParpadeo = document.querySelector("#simularParpadeo");
const audioOjosFinal = new Audio("assets/Audios/ojos-final.mp3");
audioOjosFinal.preload = "auto";
audioOjosFinal.volume = .72;
audioOjosFinal.loop = true;
const audioEscribiendoHola = new Audio("assets/Audios/escribiendo-hola.mp3");
audioEscribiendoHola.preload = "auto";
audioEscribiendoHola.volume = .68;
audioEscribiendoHola.loop = true;
audioEscribiendoHola.preservesPitch = true;
const audioPensamiento = new Audio("assets/Audios/pensamiento.mp3");
audioPensamiento.preload = "auto";
audioPensamiento.volume = .7;
const orientacionHorizontal = window.matchMedia("(orientation: landscape)");
let inicioVerticalVisto = !orientacionHorizontal.matches;
let escenaDosActiva = false;
let escenaDosPreparada = false;
let escenaTresIniciada = false;
let escenaTresTerminada = false;
let escenaCincoIniciada = false;
let animacionCaminata = 0;
let animacionChispita = 0;
let temporizadorRedimension = 0;
let temporizadorAyudaChispa = 0;
let ultimoFrameChispita = 0;
let ultimoMovimientoChispita = 0;
let frameActualChispita = 0;
let arrastrandoChispa = false;
let progresoChispa = 0;
let inicioArrastreX = 0;
let progresoInicioArrastre = 0;
let flujoCamara = null;
let estadoCamara = "pendiente";
let parpadeosDetectados = 0;
let rafCamara = 0;
let ultimoAnalisisCamara = 0;
let muestraOjosAnterior = null;
let luminosidadOjosAnterior = 0;
let cambioOjosActivo = false;
let inicioCambioOjos = 0;
let picoCambioOjos = 0;
let ruidoOjos = 1.8;
let umbralReposoOjos = 2.4;
let ultimoParpadeo = 0;
let audioOjosDesbloqueado = false;
let audioEscrituraDesbloqueado = false;
let audioPensamientoDesbloqueado = false;
let completarSalidaParpadeo = null;

const CONFIG_CHISPITA = Object.freeze({
  startX: .88,
  startY: .62,
  endX: .47,
  endY: .82,
  control1X: .83,
  control1Y: .63,
  control2X: .58,
  control2Y: .78,
  scaleMin: .36,
  scaleMax: 1,
  scalePower: 1.3,
  baseHeight: .65,
  verticalOffset: 20,
  sliderStartX: .92,
  sliderEndX: .48
});

const DURACION_FRAME_CAMINATA = 137.5;
const DURACION_ESCENA_TRES = 8800;
const DURACION_FRAME_CHISPITA = 125;
const framesCaminata = Array.from({ length: 8 }, (_, indice) =>
  `assets/character-walk-right/walk-right-${String(indice + 1).padStart(2, "0")}.png`
);
const framesChispita = Array.from({ length: 8 }, (_, indice) =>
  `assets/spark-walk-front/spark-walk-front-${String(indice + 1).padStart(2, "0")}.png`
);

framesChispita.forEach((ruta) => {
  const frame = new Image();
  frame.src = ruta;
});

const detenerAnimacionChispita = (reiniciar = false) => {
  window.cancelAnimationFrame(animacionChispita);
  animacionChispita = 0;
  ultimoFrameChispita = 0;

  if (reiniciar) {
    frameActualChispita = 0;
    chispaAnimada.src = framesChispita[0];
  }
};

const actualizarFramesChispita = (ahora) => {
  if (!animacionChispita) return;

  if (!interaccionChispa.classList.contains("completa") && ahora - ultimoMovimientoChispita > 170) {
    detenerAnimacionChispita();
    return;
  }

  if (!ultimoFrameChispita) ultimoFrameChispita = ahora;
  const tiempoTranscurrido = ahora - ultimoFrameChispita;

  if (tiempoTranscurrido >= DURACION_FRAME_CHISPITA) {
    const pasos = Math.floor(tiempoTranscurrido / DURACION_FRAME_CHISPITA);
    frameActualChispita = (frameActualChispita + pasos) % framesChispita.length;
    chispaAnimada.src = framesChispita[frameActualChispita];
    ultimoFrameChispita += pasos * DURACION_FRAME_CHISPITA;
  }

  animacionChispita = window.requestAnimationFrame(actualizarFramesChispita);
};

const registrarMovimientoChispita = () => {
  ultimoMovimientoChispita = performance.now();
  if (!animacionChispita) {
    ultimoFrameChispita = ultimoMovimientoChispita;
    animacionChispita = window.requestAnimationFrame(actualizarFramesChispita);
  }
};

const bezierCubica = (p0, p1, p2, p3, t) => {
  const inverso = 1 - t;
  return inverso ** 3 * p0
    + 3 * inverso ** 2 * t * p1
    + 3 * inverso * t ** 2 * p2
    + t ** 3 * p3;
};

const fijarProgresoChispa = (progreso) => {
  progresoChispa = Math.min(1, Math.max(0, progreso));
  const limites = interaccionChispa.getBoundingClientRect();
  const t = progresoChispa;
  const xNormalizada = bezierCubica(CONFIG_CHISPITA.startX, CONFIG_CHISPITA.control1X, CONFIG_CHISPITA.control2X, CONFIG_CHISPITA.endX, t);
  const yNormalizada = bezierCubica(CONFIG_CHISPITA.startY, CONFIG_CHISPITA.control1Y, CONFIG_CHISPITA.control2Y, CONFIG_CHISPITA.endY, t);
  const escalaChispa = CONFIG_CHISPITA.scaleMin
    + (CONFIG_CHISPITA.scaleMax - CONFIG_CHISPITA.scaleMin) * Math.pow(t, CONFIG_CHISPITA.scalePower);
  const posicionX = limites.width * xNormalizada;
  const posicionY = limites.height * yNormalizada + CONFIG_CHISPITA.verticalOffset;
  const alturaBase = limites.height * CONFIG_CHISPITA.baseHeight;
  const posicionLuzY = posicionY - alturaBase * escalaChispa * .28;
  const personajeVisible = interaccionChispa.classList.contains("activada")
    ? .35 + .65 * Math.sqrt(t)
    : 0;

  interaccionChispa.style.setProperty("--progreso-chispa", progresoChispa.toFixed(3));
  interaccionChispa.style.setProperty("--escala-chispa", escalaChispa.toFixed(3));
  interaccionChispa.style.setProperty("--opacidad-personaje-chispa", personajeVisible);
  interaccionChispa.style.setProperty("--opacidad-fondo-chispa", (.13 + progresoChispa * .56).toFixed(3));
  interaccionChispa.style.setProperty("--altura-chispa-base", `${alturaBase}px`);
  interaccionChispa.style.setProperty("--posicion-x-chispa", `${posicionX}px`);
  interaccionChispa.style.setProperty("--posicion-y-chispa", `${posicionY}px`);
  interaccionChispa.style.setProperty("--posicion-x-luz", `${posicionX}px`);
  interaccionChispa.style.setProperty("--posicion-y-luz", `${posicionLuzY}px`);
  controlChispa.style.left = `${(CONFIG_CHISPITA.sliderStartX + (CONFIG_CHISPITA.sliderEndX - CONFIG_CHISPITA.sliderStartX) * progresoChispa) * 100}%`;
  interaccionChispa.dataset.progress = progresoChispa.toFixed(3);
};

const actualizarGeometriaChispita = () => {
  fijarProgresoChispa(progresoChispa);
};

const ocultarAyudaChispa = () => {
  window.clearTimeout(temporizadorAyudaChispa);
  temporizadorAyudaChispa = 0;
  interaccionChispa.classList.remove("mostrar-ayuda-control");
};

const programarAyudaChispa = () => {
  ocultarAyudaChispa();
  temporizadorAyudaChispa = window.setTimeout(() => {
    if (
      lienzo.classList.contains("escena-cuatro-activa")
      && !arrastrandoChispa
      && !interaccionChispa.classList.contains("completa")
    ) {
      interaccionChispa.classList.add("mostrar-ayuda-control");
    }
  }, 2500);
};

const moverChispa = (event) => {
  if (!arrastrandoChispa || interaccionChispa.classList.contains("completa")) return;

  const limites = interaccionChispa.getBoundingClientRect();
  const longitudControl = limites.width * (CONFIG_CHISPITA.sliderStartX - CONFIG_CHISPITA.sliderEndX);
  const nuevoProgreso = progresoInicioArrastre + (inicioArrastreX - event.clientX) / longitudControl;
  const progresoAnterior = progresoChispa;

  fijarProgresoChispa(nuevoProgreso);
  if (Math.abs(progresoChispa - progresoAnterior) > .0005) registrarMovimientoChispita();
};

const activarEncuentro = () => {
  if (!lienzo.classList.contains("escena-cuatro-activa") || interaccionChispa.classList.contains("activada")) return;
  interaccionChispa.classList.add("activada");
  fijarProgresoChispa(progresoChispa);
};

const iniciarChispa = (event) => {
  if (!lienzo.classList.contains("escena-cuatro-activa") || interaccionChispa.classList.contains("completa")) return;
  event.preventDefault();
  ocultarAyudaChispa();
  lienzo.classList.remove("chispa-pausada");

  if (!interaccionChispa.classList.contains("activada")) {
    activarEncuentro();
  }

  arrastrandoChispa = true;
  actualizarGeometriaChispita();
  inicioArrastreX = event.clientX;
  progresoInicioArrastre = progresoChispa;
  interaccionChispa.classList.add("presionando");
  controlChispa.setPointerCapture(event.pointerId);
};

const terminarChispa = (event) => {
  if (!arrastrandoChispa) return;

  arrastrandoChispa = false;
  interaccionChispa.classList.remove("presionando");

  if (controlChispa.hasPointerCapture(event.pointerId)) {
    controlChispa.releasePointerCapture(event.pointerId);
  }

  if (progresoChispa >= .995) {
    ocultarAyudaChispa();
    lienzo.classList.remove("chispa-pausada");
    fijarProgresoChispa(1);
    interaccionChispa.classList.add("completa");
    registrarMovimientoChispita();
    controlChispa.setAttribute("aria-label", "Chispa encendida; continuar");
    interaccionChispa.dispatchEvent(new CustomEvent("escena4lista", { bubbles: true }));
    window.setTimeout(mostrarEscenaCinco, 850);
  } else {
    detenerAnimacionChispita();
    lienzo.classList.add("chispa-pausada");
    programarAyudaChispa();
  }
};

const cerrarPermisoCamara = () => {
  permisoCamara.classList.add("saliendo");
  window.setTimeout(() => {
    permisoCamara.hidden = true;
  }, 560);
};

const detenerLecturaCamara = (cerrarFlujo = false) => {
  window.cancelAnimationFrame(rafCamara);
  rafCamara = 0;
  muestraOjosAnterior = null;
  luminosidadOjosAnterior = 0;
  cambioOjosActivo = false;
  ruidoOjos = 1.8;
  if (!cerrarFlujo || !flujoCamara) return;
  flujoCamara.getTracks().forEach((pista) => pista.stop());
  flujoCamara = null;
  videoCamara.srcObject = null;
};

const habilitarContinuacionSinCamara = () => {
  indicacionParpadeo.textContent = "CÁMARA NO DISPONIBLE · TOCA PARA CONTINUAR";
  continuarCapituloDos.setAttribute("aria-label", "Toca para continuar al capítulo 2");
  window.setTimeout(() => {
    continuarCapituloDos.disabled = false;
  }, 1200);
};

const reproducirAudioOjosFinal = (reiniciar = false) => {
  if (cap2.silencio || document.hidden || !lienzo.classList.contains("escena-cinco-activa")) return;
  audioOjosFinal.volume = .72;
  if (reiniciar) audioOjosFinal.currentTime = 0;
  audioOjosFinal.play().catch(() => { /* El navegador puede requerir otra interacción del usuario. */ });
};

const detenerAudioOjosFinal = () => {
  audioOjosFinal.pause();
  audioOjosFinal.currentTime = 0;
  audioOjosFinal.volume = .72;
};

const desbloquearAudioOjosFinal = () => {
  if (cap2.silencio) return;
  if (!audioOjosDesbloqueado) {
    audioOjosFinal.volume = 0;
    audioOjosFinal.play().then(() => {
      audioOjosFinal.pause();
      audioOjosFinal.currentTime = 0;
      audioOjosFinal.volume = .72;
      audioOjosDesbloqueado = true;
    }).catch(() => { audioOjosFinal.volume = .72; });
  }
  if (!audioEscrituraDesbloqueado) {
    audioEscribiendoHola.volume = 0;
    audioEscribiendoHola.play().then(() => {
      audioEscribiendoHola.pause();
      audioEscribiendoHola.currentTime = 0;
      audioEscribiendoHola.volume = .68;
      audioEscrituraDesbloqueado = true;
    }).catch(() => { audioEscribiendoHola.volume = .68; });
  }
  if (!audioPensamientoDesbloqueado) {
    audioPensamiento.volume = 0;
    audioPensamiento.play().then(() => {
      audioPensamiento.pause();
      audioPensamiento.currentTime = 0;
      audioPensamiento.volume = .7;
      audioPensamientoDesbloqueado = true;
    }).catch(() => { audioPensamiento.volume = .7; });
  }
};

const reproducirAudioPensamiento = () => {
  if (cap2.silencio || document.hidden || cap2.estado !== "recuerdo" || cap2.tapsPensamiento < 6) return;
  audioPensamiento.currentTime = 0;
  audioPensamiento.play().catch(() => { /* La escena continúa aunque el navegador bloquee el audio. */ });
};

const detenerAudioPensamiento = () => {
  audioPensamiento.pause();
  audioPensamiento.currentTime = 0;
};

const reproducirAudioEscritura = (reiniciar = false) => {
  if (cap2.silencio || document.hidden || cap2.estado !== "escritura") return;
  if (reiniciar) audioEscribiendoHola.currentTime = 0;
  audioEscribiendoHola.play().catch(() => { /* Se reintentará con la primera pulsación. */ });
};

const ajustarLatidoEscritura = (progreso = 0) => {
  const avance = Math.min(1, Math.max(0, progreso));
  audioEscribiendoHola.playbackRate = .86 + avance * .46;
  audioEscribiendoHola.volume = .56 + avance * .18;
};

const detenerAudioEscritura = () => {
  audioEscribiendoHola.pause();
  audioEscribiendoHola.currentTime = 0;
  ajustarLatidoEscritura(0);
};

const registrarParpadeo = () => {
  if (!lienzo.classList.contains("escena-cinco-activa") || parpadeosDetectados >= 3) return;
  const ahora = performance.now();
  if (ahora - ultimoParpadeo < 350) return;
  ultimoParpadeo = ahora;
  parpadeosDetectados += 1;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(parpadeosDetectados === 3 ? [65, 45, 90] : 55);
  }
  indicacionParpadeo.textContent = `PARPADEA PARA CONTINUAR · ${parpadeosDetectados}/3`;
  lienzo.classList.add("parpadeo-detectado");
  window.setTimeout(() => lienzo.classList.remove("parpadeo-detectado"), 180);

  if (parpadeosDetectados < 3) return;
  detenerLecturaCamara();
  audioOjosFinal.loop = false;
  indicacionParpadeo.textContent = "";
  escenaCinco.classList.remove("esperando-parpadeos");
  continuarCapituloDos.disabled = true;
  continuarCapituloDos.setAttribute("aria-label", "Parpadeos completados; abriendo el capítulo 2");
  let respaldoSalida = 0;
  completarSalidaParpadeo = () => {
    if (!completarSalidaParpadeo) return;
    completarSalidaParpadeo = null;
    window.clearTimeout(respaldoSalida);
    lienzo.classList.add("transicion-capitulo-dos");
    // Dejar que la última escena pierda opacidad antes de revelar la portadilla.
    window.setTimeout(iniciarCapituloDos, 1100);
  };
  if (!cap2.silencio && !audioOjosFinal.paused) {
    audioOjosFinal.addEventListener("ended", completarSalidaParpadeo, { once: true });
    respaldoSalida = window.setTimeout(() => completarSalidaParpadeo?.(), 6000);
  } else {
    respaldoSalida = window.setTimeout(() => completarSalidaParpadeo?.(), 700);
  }
};

const analizarParpadeos = (ahora) => {
  if (!lienzo.classList.contains("escena-cinco-activa") || estadoCamara !== "activa") {
    rafCamara = 0;
    return;
  }
  rafCamara = window.requestAnimationFrame(analizarParpadeos);
  if (ahora - ultimoAnalisisCamara < 45 || videoCamara.readyState < 2) return;
  ultimoAnalisisCamara = ahora;

  const contexto = lienzoCamara.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(videoCamara, 0, 0, lienzoCamara.width, lienzoCamara.height);
  // Banda amplia de los ojos. Se muestrea con mayor frecuencia para no perder
  // parpadeos breves y no se conserva ningún fotograma.
  const pixeles = contexto.getImageData(24, 23, 112, 48).data;
  const muestra = new Uint8Array(pixeles.length / 8);
  let indiceMuestra = 0;
  let luminosidad = 0;
  for (let indice = 0; indice < pixeles.length; indice += 8) {
    muestra[indiceMuestra] = Math.round(
      pixeles[indice] * .299 + pixeles[indice + 1] * .587 + pixeles[indice + 2] * .114
    );
    luminosidad += muestra[indiceMuestra];
    indiceMuestra += 1;
  }
  luminosidad /= muestra.length;

  if (!muestraOjosAnterior) {
    muestraOjosAnterior = muestra;
    luminosidadOjosAnterior = luminosidad;
    return;
  }
  const cambioLuz = luminosidad - luminosidadOjosAnterior;
  const diferencias = new Float32Array(muestra.length);
  for (let indice = 0; indice < muestra.length; indice += 1) {
    diferencias[indice] = Math.abs(muestra[indice] - muestraOjosAnterior[indice] - cambioLuz);
  }
  diferencias.sort();
  // La cuarta parte con mayor cambio concentra párpados y pestañas; promediarla
  // evita que el resto inmóvil del rostro diluya el gesto.
  const inicioCambios = Math.floor(diferencias.length * .75);
  let diferencia = 0;
  for (let indice = inicioCambios; indice < diferencias.length; indice += 1) diferencia += diferencias[indice];
  diferencia /= diferencias.length - inicioCambios;
  muestraOjosAnterior = muestra;
  luminosidadOjosAnterior = luminosidad;

  if (!cambioOjosActivo) {
    ruidoOjos = ruidoOjos * .92 + Math.min(diferencia, ruidoOjos * 2.2) * .08;
  }
  const umbralCierre = Math.min(8, Math.max(3.4, ruidoOjos * 1.65 + .7));
  if (!cambioOjosActivo && diferencia > umbralCierre && ahora - ultimoParpadeo > 350) {
    cambioOjosActivo = true;
    inicioCambioOjos = ahora;
    picoCambioOjos = diferencia;
    umbralReposoOjos = Math.min(3.8, Math.max(1.8, ruidoOjos * 1.18));
    return;
  }
  if (!cambioOjosActivo) return;
  picoCambioOjos = Math.max(picoCambioOjos, diferencia);
  const duracion = ahora - inicioCambioOjos;
  if (diferencia < umbralReposoOjos && duracion >= 45 && duracion <= 650 && picoCambioOjos > umbralCierre) {
    cambioOjosActivo = false;
    registrarParpadeo();
  } else if (duracion > 800) {
    cambioOjosActivo = false;
  }
};

const prepararParpadeosFinales = () => {
  parpadeosDetectados = 0;
  ultimoParpadeo = -Infinity;
  ruidoOjos = 1.8;
  continuarCapituloDos.disabled = true;
  escenaCinco.classList.add("esperando-parpadeos");
  indicacionParpadeo.textContent = "PARPADEA PARA CONTINUAR · 0/3";
  audioOjosFinal.loop = true;
  reproducirAudioOjosFinal(true);
  simularParpadeo.hidden = !revisionGiro;
  if (estadoCamara !== "activa") {
    habilitarContinuacionSinCamara();
    return;
  }
  detenerLecturaCamara();
  ultimoAnalisisCamara = 0;
  rafCamara = window.requestAnimationFrame(analizarParpadeos);
};

const solicitarCamara = async () => {
  if (estadoCamara === "solicitando" || estadoCamara === "activa") return;
  estadoCamara = "solicitando";
  activarCamara.disabled = true;
  activarCamara.textContent = "ESPERANDO PERMISO…";
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Cámara no disponible");
    flujoCamara = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } }
    });
    videoCamara.srcObject = flujoCamara;
    await videoCamara.play();
    estadoCamara = "activa";
    cerrarPermisoCamara();
  } catch (error) {
    estadoCamara = "no-disponible";
    activarCamara.textContent = "CÁMARA NO DISPONIBLE";
    omitirCamara.textContent = "CONTINUAR";
    omitirCamara.focus();
  } finally {
    activarCamara.disabled = false;
  }
};

activarCamara.addEventListener("click", solicitarCamara);
omitirCamara.addEventListener("click", () => {
  estadoCamara = "omitida";
  cerrarPermisoCamara();
});
simularParpadeo.addEventListener("click", registrarParpadeo);

const mostrarEscenaCinco = () => {
  if (escenaCincoIniciada) return;

  escenaCincoIniciada = true;
  lienzo.classList.add("escena-cinco-activa");
  escenaCuatro.setAttribute("aria-hidden", "true");
  escenaCinco.setAttribute("aria-hidden", "false");
  window.setTimeout(() => detenerAnimacionChispita(), 1050);
  prepararParpadeosFinales();
};

controlChispa.addEventListener("pointerdown", iniciarChispa);
controlChispa.addEventListener("pointermove", moverChispa);
controlChispa.addEventListener("pointerup", terminarChispa);
controlChispa.addEventListener("pointercancel", terminarChispa);
escenaCuatro.addEventListener("pointerdown", activarEncuentro);

const mostrarEscenaCuatro = () => {
  if (!escenaDosActiva || lienzo.classList.contains("escena-cuatro-activa")) return;

  escenaTresTerminada = true;
  recorrido.estado = "terminado";
  window.cancelAnimationFrame(animacionCaminata);
  detenerParallax();
  if (revisionGiro) {
    document.querySelector("#pausarRevision").disabled = true;
    document.querySelector("#tiempoRevision").disabled = true;
  }
  lienzo.classList.add("escena-cuatro-activa");
  lienzo.classList.remove("chispa-pausada");
  escenaTres.setAttribute("aria-hidden", "true");
  escenaCuatro.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => window.requestAnimationFrame(actualizarGeometriaChispita));
  programarAyudaChispa();
};

// Un solo reloj y un solo sprite: el giro, el arco y la caminata comparten posición.
const recorrido = {
  estado: "espera",
  tiempo: 0,
  ultimoTiempo: null,
  frame: -1,
  poseLateral: false,
  perfilSuelo: [],
  cielo: null,
  arco: null,
  horizontalSimulada: parametros.get("capitulo") === "2" || ["3", "4", "5"].includes(parametros.get("escena")),
  pausaRevision: false
};
const parallax = {
  escuchando: false,
  solicitado: false,
  neutral: null,
  calibrarDesde: 0,
  ultimaLectura: 0,
  objetivoX: 0,
  objetivoY: 0,
  x: 0,
  y: 0
};
const limitar = (valor, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, valor));
const interpolar = (a, b, t) => a + (b - a) * t;
const suavizar = (t) => { const p = limitar(t); return p * p * (3 - 2 * p); };
const estaHorizontal = () => revisionGiro ? recorrido.horizontalSimulada : orientacionHorizontal.matches;

const esperarImagen = (imagen) => new Promise((resolve, reject) => {
  if (imagen.complete) {
    if (imagen.naturalWidth) resolve(imagen);
    else reject(new Error("No se pudo cargar una imagen de la caminata"));
    return;
  }
  imagen.addEventListener("load", () => resolve(imagen), { once: true });
  imagen.addEventListener("error", reject, { once: true });
});
const imagenesCaminata = framesCaminata.map((ruta) => {
  const imagen = new Image();
  imagen.src = ruta;
  return imagen;
});
// El margen transparente cambia entre poses. Se conserva cada PNG intacto y se
// mide su apoyo para que la alternancia de frames no hunda los pies en el arco.
const apoyosCaminata = [];
const recursosRecorrido = (async () => {
  await Promise.all(imagenesCaminata.map(esperarImagen));
  const lienzoLectura = document.createElement("canvas");
  const contexto = lienzoLectura.getContext("2d", { willReadFrequently: true });
  for (const imagen of imagenesCaminata) {
    lienzoLectura.width = imagen.naturalWidth;
    lienzoLectura.height = imagen.naturalHeight;
    contexto.drawImage(imagen, 0, 0);
    const { data } = contexto.getImageData(0, 0, lienzoLectura.width, lienzoLectura.height);
    let apoyo = lienzoLectura.height - 1;
    buscarApoyo: for (; apoyo >= 0; apoyo--) {
      for (let x = 0; x < lienzoLectura.width; x++) {
        if (data[(apoyo * lienzoLectura.width + x) * 4 + 3] > 32) break buscarApoyo;
      }
    }
    apoyosCaminata.push(apoyo + 1);
  }

  // Importar la forma y sus degradados aprobados, sin editar el SVG de assets.
  const respuesta = await fetch("assets/fondo-dos.svg");
  if (!respuesta.ok) throw new Error("No se pudo cargar el arco");
  const svg = new DOMParser().parseFromString(await respuesta.text(), "image/svg+xml");
  const defs = document.importNode(svg.querySelector("defs"), true);
  recorrido.cielo = document.importNode(svg.getElementById("fondo"), true);
  recorrido.arco = document.importNode(svg.getElementById("montaña"), true);
  recorrido.cielo.id = "cieloTransicion";
  recorrido.arco.id = "sueloTransicion";
  // Las clases originales están dentro del SVG externo; conservar sus pinturas.
  recorrido.cielo.setAttribute("fill", "url(#Degradado_sin_nombre_664)");
  recorrido.arco.setAttribute("fill", "url(#Degradado_sin_nombre_661)");
  arcoTransicion.replaceChildren(defs, recorrido.cielo, recorrido.arco);

  const paisaje = await esperarImagen(document.querySelector(".fondo-tres"));
  lienzoLectura.width = 1920;
  lienzoLectura.height = Math.round(1920 * paisaje.naturalHeight / paisaje.naturalWidth);
  contexto.drawImage(paisaje, 0, 0, lienzoLectura.width, lienzoLectura.height);
  const { data } = contexto.getImageData(0, 0, lienzoLectura.width, lienzoLectura.height);
  const ancho = lienzoLectura.width;
  const alto = lienzoLectura.height;
  // Extraer el borde del suelo del panorama existente; no inventar otra silueta.
  for (let i = 0; i <= 64; i++) {
    const x = Math.min(ancho - 1, Math.round(i / 64 * (ancho - 1)));
    let borde = .70;
    for (let y = Math.round(alto * .65); y < alto * .76; y++) {
      const indice = (y * ancho + x) * 4;
      const anterior = ((y - 2) * ancho + x) * 4;
      if (data[indice + 1] - data[anterior + 1] > 8 && data[indice + 2] - data[anterior + 2] > 10) {
        borde = y / alto;
        break;
      }
    }
    recorrido.perfilSuelo.push(borde);
  }
  lienzoLectura.width = lienzoLectura.height = 0;
  return true;
})().catch(() => {
  lienzo.dataset.errorRecorrido = "No se pudo preparar la caminata. Recarga la página desde el servidor local.";
  return false;
});

// La curva original usa dos Bézier cúbicas. Se evalúa la misma curva para
// dibujar la superficie y calcular el apoyo del personaje, incluida su pendiente.
const alturaArcoOriginal = (x) => {
  if (x < 0) return 1500.89 - x * 222.42 / 241.43;
  if (x > 1080) return 1438.41 + (x - 1080) * 159.94 / 198.47;
  const derecha = x > 561.48;
  const xs = derecha ? [561.48, 881.53, 1080, 1080] : [0, 0, 241.43, 561.48];
  const ys = derecha ? [1278.47, 1278.47, 1438.41, 1438.41] : [1500.89, 1500.89, 1278.47, 1278.47];
  let a = 0;
  let b = 1;
  for (let i = 0; i < 16; i++) {
    const t = (a + b) / 2;
    if (bezierCubica(...xs, t) < x) a = t;
    else b = t;
  }
  return bezierCubica(...ys, (a + b) / 2);
};

const alturaSuelo = (x, ancho, alto, camara) => {
  const anchoPanorama = alto * (15239 / 4320);
  const punto = limitar((x * ancho + Math.max(0, anchoPanorama - ancho) * camara) / anchoPanorama) * 64;
  const indice = Math.min(63, Math.floor(punto));
  return interpolar(recorrido.perfilSuelo[indice], recorrido.perfilSuelo[indice + 1], punto - indice);
};

const pintarRecorrido = () => {
  if (!recorrido.arco || !escenaTresIniciada) return;
  const { width: ancho, height: alto } = lienzo.getBoundingClientRect();
  if (!ancho || !alto) return;
  const tiempo = recorrido.tiempo;
  const forma = suavizar((tiempo - 1300) / 1100);
  const paisaje = suavizar((tiempo - 1100) / 1300);
  const camara = suavizar((tiempo - 2850) / (DURACION_ESCENA_TRES - 2850));
  const superficie = (x) => {
    const destino = alturaSuelo(x, ancho, alto, camara);
    if (forma === 1) return destino;
    const xOriginal = 540 + (x - .5) * ancho / alto * 1920;
    return interpolar(alturaArcoOriginal(xOriginal) / 1920, destino, forma);
  };
  const puntosArco = [];
  const puntosSuelo = [];
  for (let i = 0; i <= 128; i++) {
    const x = i / 128;
    puntosArco.push(`${(x * 1080).toFixed(3)},${(superficie(x) * 1920).toFixed(3)}`);
    puntosSuelo.push(`${(x * 100).toFixed(3)}% ${(alturaSuelo(x, ancho, alto, camara) * 100).toFixed(3)}%`);
  }
  recorrido.arco.setAttribute("d", `M${puntosArco.join(" L")} L1080,1920 L0,1920 Z`);
  recorrido.arco.style.opacity = 1 - suavizar((tiempo - 2400) / 450);
  recorrido.cielo.style.opacity = 1 - paisaje;
  sueloTres.style.clipPath = `polygon(0 100%, ${puntosSuelo.join(", ")}, 100% 100%)`;
  lienzo.style.setProperty("--paisaje-visible", paisaje);
  lienzo.style.setProperty("--camara-recorrido", `${camara * 100}%`);

  const marcha = Math.max(0, tiempo - 400) / 1000;
  const x = .5 + .08 * (marcha - .2 * (1 - Math.exp(-marcha / .2)));
  const y = superficie(x);
  const pendiente = (superficie(x + .001) - superficie(x - .001)) * alto / (.002 * ancho);
  const inclinacion = limitar(Math.atan(pendiente) * 180 / Math.PI, -12, 12);
  const pose = suavizar((tiempo - 400) / 220);
  const altura = alto * interpolar(.226716, .29, suavizar((tiempo - 400) / 2600));
  const indice = Math.floor(Math.max(0, tiempo - 400) / DURACION_FRAME_CAMINATA) % 8;
  if (recorrido.frame !== indice) {
    personajeCaminando.src = framesCaminata[indice];
    recorrido.frame = indice;
  }
  // El frontal se disuelve brevemente hacia el lateral, con los pies en el mismo
  // apoyo. Solo la pose lateral se inclina sobre la tangente, sin deformarla.
  personajeDePie.style.opacity = 1 - pose;
  pasoProtagonista.style.opacity = pose;
  if (recorrido.poseLateral !== (pose >= .5)) {
    recorrido.poseLateral = pose >= .5;
    personajeDePie.setAttribute("aria-hidden", String(recorrido.poseLateral));
    pasoProtagonista.setAttribute("aria-hidden", String(!recorrido.poseLateral));
  }
  pasoProtagonista.style.transform = `rotate(${inclinacion * pose}deg)`;
  const escala = altura / (apoyosCaminata[indice] - 280);
  personajeCaminando.style.width = `${1578 * escala}px`;
  personajeCaminando.style.transform = `translate(${-800 * escala}px, ${-apoyosCaminata[indice] * escala}px)`;
  posicionProtagonista.style.setProperty("--altura-protagonista", `${altura}px`);
  posicionProtagonista.style.left = `${x * ancho + parallax.x * .75}px`;
  posicionProtagonista.style.top = `${y * alto + parallax.y * .75 + (1 - suavizar(tiempo / 400)) * alto * .007}px`;
  lienzo.dataset.faseRecorrido = tiempo < 400 ? "adaptacion" : tiempo < 1300 ? "arco" : tiempo < 2400 ? "transformacion" : "suelo";
  lienzo.dataset.tiempoRecorrido = tiempo.toFixed(1);
  if (revisionGiro && document.activeElement !== document.querySelector("#tiempoRevision")) {
    document.querySelector("#tiempoRevision").value = (tiempo / 1000).toFixed(1);
  }
};

const calibrarParallax = () => {
  parallax.neutral = null;
  parallax.calibrarDesde = performance.now() + 650;
  parallax.objetivoX = parallax.objetivoY = parallax.x = parallax.y = 0;
};

// Cuaterniones relativos evitan saltos de Euler (alpha 359→0 o beta ±180)
// y permiten calibrar ambos sentidos de landscape con el mismo cálculo.
const multiplicarCuaterniones = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const cuaternionOrientacion = (alpha, beta, gamma) => {
  const radianes = Math.PI / 360;
  const a = alpha * radianes, b = beta * radianes, g = gamma * radianes;
  return multiplicarCuaterniones(multiplicarCuaterniones([0, 0, Math.sin(a), Math.cos(a)], [Math.sin(b), 0, 0, Math.cos(b)]), [0, Math.sin(g), 0, Math.cos(g)]);
};
const leerInclinacion = (event) => {
  if (!estaHorizontal() || recorrido.estado !== "activo" || movimientoReducido.matches || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  const ahora = performance.now();
  if (ahora < parallax.calibrarDesde) return;
  const actual = cuaternionOrientacion(Number.isFinite(event.alpha) ? event.alpha : 0, event.beta, event.gamma);
  if (!parallax.neutral) parallax.neutral = actual;
  const n = parallax.neutral;
  let relativo = multiplicarCuaterniones([-n[0], -n[1], -n[2], n[3]], actual);
  if (relativo[3] < 0) relativo = relativo.map((valor) => -valor);
  const giroX = 2 * Math.atan2(relativo[0], relativo[3]) * 180 / Math.PI;
  const giroY = 2 * Math.atan2(relativo[1], relativo[3]) * 180 / Math.PI;
  const angulo = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
  parallax.objetivoX = limitar((giroY * Math.cos(angulo) + giroX * Math.sin(angulo)) / 10, -1, 1);
  parallax.objetivoY = limitar((giroX * Math.cos(angulo) - giroY * Math.sin(angulo)) / 10, -1, 1);
  parallax.ultimaLectura = ahora;
};
const habilitarParallax = () => {
  if (parallax.escuchando || escenaTresTerminada) return;
  parallax.escuchando = true;
  calibrarParallax();
  window.addEventListener("deviceorientation", leerInclinacion, { passive: true });
};
const solicitarParallax = () => {
  if (parallax.solicitado || movimientoReducido.matches || !window.isSecureContext || !window.DeviceOrientationEvent) return;
  parallax.solicitado = true;
  // Invocación sin await previo: iOS exige el gesto real de la introducción.
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      DeviceOrientationEvent.requestPermission().then((permiso) => {
        if (permiso === "granted") habilitarParallax();
      }).catch(() => {});
    } catch {
      // Algunos navegadores rechazan el acceso de forma síncrona; seguir caminando.
    }
  } else {
    habilitarParallax();
  }
};
const detenerParallax = () => {
  window.removeEventListener("deviceorientation", leerInclinacion);
  parallax.escuchando = false;
};
const pintarParallax = (delta) => {
  const disponible = !movimientoReducido.matches && performance.now() - parallax.ultimaLectura < 1000;
  const mezcla = 1 - Math.exp(-delta / 180);
  parallax.x += ((disponible ? parallax.objetivoX : 0) - parallax.x) * mezcla;
  parallax.y += ((disponible ? parallax.objetivoY : 0) - parallax.y) * mezcla;
  for (const [capa, profundidad] of [["cielo", .35], ["montanas", 1.8], ["suelo", .75]]) {
    lienzo.style.setProperty(`--${capa}-x`, `${parallax.x * profundidad}px`);
    lienzo.style.setProperty(`--${capa}-y`, `${parallax.y * profundidad}px`);
  }
};

const actualizarRecorrido = (ahora) => {
  if (recorrido.estado !== "activo" || escenaTresTerminada) return;
  const delta = recorrido.ultimoTiempo === null ? 0 : ahora - recorrido.ultimoTiempo;
  recorrido.ultimoTiempo = ahora;
  recorrido.tiempo = Math.min(DURACION_ESCENA_TRES, recorrido.tiempo + delta);
  pintarParallax(delta);
  pintarRecorrido();
  if (recorrido.tiempo >= DURACION_ESCENA_TRES) mostrarEscenaCuatro();
  else animacionCaminata = window.requestAnimationFrame(actualizarRecorrido);
};
const sincronizarRecorrido = () => {
  if (escenaTresTerminada) return;
  if (dispositivoTactil && !inicioVerticalVisto) return;
  if (!escenaTresIniciada) {
    if (estaHorizontal() && escenaDosPreparada && !document.hidden) mostrarEscenaTres();
    return;
  }
  const pausado = !estaHorizontal() || document.hidden || recorrido.pausaRevision;
  lienzo.classList.toggle("recorrido-pausado", !estaHorizontal());
  window.cancelAnimationFrame(animacionCaminata);
  recorrido.ultimoTiempo = null;
  recorrido.estado = pausado ? "pausado" : "activo";
  if (!pausado) animacionCaminata = window.requestAnimationFrame(actualizarRecorrido);
};

const mostrarEscenaTres = async (directo = false) => {
  if (!escenaDosActiva || escenaTresIniciada || recorrido.estado === "preparando") return;
  recorrido.estado = "preparando";
  const listo = await recursosRecorrido;
  recorrido.estado = "espera";
  if (!listo) {
    document.querySelector(".mensaje-girar span").textContent = lienzo.dataset.errorRecorrido;
    return;
  }
  if (escenaTresTerminada || (!directo && (!estaHorizontal() || document.hidden))) return;
  escenaTresIniciada = true;
  lienzo.classList.add("recorrido-iniciado", "escena-tres-activa");
  escenaTres.setAttribute("aria-hidden", "false");
  calibrarParallax();
  pintarRecorrido();
  if (revisionGiro) {
    document.querySelector("#pausarRevision").disabled = false;
    document.querySelector("#tiempoRevision").disabled = false;
  }
  sincronizarRecorrido();
};

const avanzarAlGirar = () => {
  actualizarInicioVertical();
  calibrarParallax();
  sincronizarRecorrido();
  sincronizarCapituloTres();
};

const actualizarInicioVertical = () => {
  if (!orientacionHorizontal.matches) inicioVerticalVisto = true;
  const esperar = dispositivoTactil && !inicioVerticalVisto && !intro.hidden;
  lienzo.classList.toggle("espera-inicio-vertical", esperar);
  if (!intro.classList.contains("saliendo")) intro.disabled = esperar;
};

if (typeof orientacionHorizontal.addEventListener === "function") {
  orientacionHorizontal.addEventListener("change", avanzarAlGirar);
} else {
  orientacionHorizontal.addListener(avanzarAlGirar);
}
screen.orientation?.addEventListener?.("change", avanzarAlGirar);
document.addEventListener("visibilitychange", () => {
  calibrarParallax();
  sincronizarRecorrido();
  sincronizarCapituloTres();
});

const cerrarIntro = () => {
  if (intro.disabled || intro.classList.contains("saliendo")) return;

  solicitarParallax();
  intro.disabled = true;
  intro.classList.add("saliendo");
  lienzo.classList.add("mostrar-fondo-dos");
  escenaDosActiva = true;

  window.setTimeout(() => {
    escenaDosPreparada = true;
    sincronizarRecorrido();
  }, 1300);

  const ocultarAlTerminar = (event) => {
    if (event.target !== intro || event.animationName !== "salida-intro") return;

    intro.hidden = true;
    intro.removeEventListener("animationend", ocultarAlTerminar);
  };

  intro.addEventListener("animationend", ocultarAlTerminar);
};

intro.addEventListener("pointerup", (event) => {
  if (event.isPrimary) {
    cerrarIntro();
  }
});

intro.addEventListener("click", cerrarIntro);

lienzo.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;

  const limites = lienzo.getBoundingClientRect();
  cursorTactil.style.left = `${event.clientX - limites.left}px`;
  cursorTactil.style.top = `${event.clientY - limites.top}px`;
  cursorTactil.classList.add("visible");
});

lienzo.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") cursorTactil.classList.add("visible");
});

lienzo.addEventListener("pointerleave", () => {
  cursorTactil.classList.remove("visible", "presionando");
});

lienzo.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.isPrimary) {
    cursorTactil.classList.add("presionando");
  }
});

window.addEventListener("pointerup", () => {
  cursorTactil.classList.remove("presionando");
});

window.addEventListener("resize", () => {
  if (escenaTresIniciada && !escenaTresTerminada) {
    pintarRecorrido();
    sincronizarRecorrido();
  }
  if (!lienzo.classList.contains("escena-cuatro-activa")) return;

  actualizarGeometriaChispita();
  window.clearTimeout(temporizadorRedimension);
  temporizadorRedimension = window.setTimeout(actualizarGeometriaChispita, 950);
});

// También redibujar durante la adaptación CSS, aunque el reloj esté pausado
// por un regreso a vertical. No depender del primer tamaño del evento resize.
if (typeof ResizeObserver === "function") {
  new ResizeObserver(() => {
    if (escenaTresIniciada && !escenaTresTerminada) pintarRecorrido();
  }).observe(lienzo);
} else {
  lienzo.addEventListener("transitionend", () => {
    if (escenaTresIniciada && !escenaTresTerminada) pintarRecorrido();
  });
}

// En escritorio estas herramientas permanecen disponibles durante ambos capítulos.
if (revisionGiro) {
  document.querySelector(".revision-giro").hidden = false;
  const giro = document.querySelector("#simularGiro");
  const pausa = document.querySelector("#pausarRevision");
  const tiempo = document.querySelector("#tiempoRevision");
  giro.textContent = recorrido.horizontalSimulada ? "Girar a vertical" : "Girar a horizontal";
  giro.addEventListener("click", () => {
    recorrido.horizontalSimulada = !recorrido.horizontalSimulada;
    giro.textContent = recorrido.horizontalSimulada ? "Girar a vertical" : "Girar a horizontal";
    avanzarAlGirar();
    sincronizarCap2();
  });
  pausa.addEventListener("click", () => {
    recorrido.pausaRevision = !recorrido.pausaRevision;
    pausa.textContent = recorrido.pausaRevision ? "Reanudar" : "Pausar";
    sincronizarRecorrido();
  });
  tiempo.addEventListener("input", () => {
    if (!escenaTresIniciada || escenaTresTerminada || !Number.isFinite(tiempo.valueAsNumber)) return;
    recorrido.pausaRevision = true;
    recorrido.tiempo = limitar(tiempo.valueAsNumber * 1000, 0, DURACION_ESCENA_TRES);
    pausa.textContent = "Reanudar";
    sincronizarRecorrido();
    pintarRecorrido();
  });
  document.querySelector("#reiniciarRevision").addEventListener("click", () => window.location.reload());
}

const escenaSolicitada = parametros.get("escena");
if (escenaSolicitada || parametros.has("capitulo")) {
  permisoCamara.hidden = true;
  estadoCamara = "omitida";
}
actualizarInicioVertical();

if (escenaSolicitada === "3" || escenaSolicitada === "4" || escenaSolicitada === "5") {
  escenaDosActiva = true;
  escenaDosPreparada = true;
  intro.hidden = true;
  lienzo.classList.add("mostrar-fondo-dos");
  if (escenaSolicitada === "3") {
    mostrarEscenaTres(true);
  } else if (escenaSolicitada === "4") {
    mostrarEscenaCuatro();
  } else {
    mostrarEscenaCuatro();
    mostrarEscenaCinco();
  }
}

// Capítulo 2 — La conexión. Recursos originales; ninguna llamada externa.
const RECURSOS_CAP2 = Object.freeze({
  titulo: "assets/Textos-titulos/capituldos.svg?v=2",
  caminata: "assets/Capitulo-2/cap02_02_caminata.png",
  pensar: "assets/Capitulo-2/cap02_02.1_empieza-a-pensar.png",
  pensamiento: "assets/Capitulo-2/cap02_03_pensamiento.png",
  saludo: "assets/Capitulo-2/cap02_04_burbuja-y-saludo.png",
  recuerdo: "assets/Capitulo-2/cap02_05_recuerdo.png",
  mensaje: "assets/Capitulo-2/cap02_08_mensaje.png",
  telefono: "assets/Capitulo-2/cap02_09_telefono.png",
  respuesta: "assets/Capitulo-2/cap02_10_escritura.png",
  escritura: "assets/Capitulo-2/cap02_11_continuacion-escritura.png",
  azulRecostado: "assets/Capitulo-2/cap02_12_continuacion-escritura.png",
  naranjaRecostado: "assets/Capitulo-2/cap02_13_continuacion-escritura.png"
});
const nodoCap2 = document.querySelector("#capituloDos");
const botonSonidoGlobal = document.querySelector("#controlSonidoGlobal");
const botonPantallaGlobal = document.querySelector("#controlPantallaGlobal");
const accionCap2 = document.querySelector("#accionCapituloDos");
const botonPressCap2 = document.querySelector("#botonPressCap2");
const destelloPressCap2 = document.querySelector("#destelloPressCap2");
const leyendaCap2 = nodoCap2.querySelector(".cap2-leyenda");
const progresoCap2 = nodoCap2.querySelector(".cap2-progreso");
const zonasCap2 = nodoCap2.querySelector(".cap2-zonas");
const nodoCap3 = document.querySelector("#capituloTres");
const pistaCap3 = nodoCap3.querySelector(".cap3-pista");
const deslizarCap3 = nodoCap3.querySelector(".cap3-deslizar");
const personajeAzulCap3 = nodoCap3.querySelector(".cap3-personaje-azul");
const personajeChispaCap3 = nodoCap3.querySelector(".cap3-personaje-chispa");
const botonLongPressCap3 = nodoCap3.querySelector(".cap3-longpress");
const cuadroTresCap3 = nodoCap3.querySelector(".cap3-cuadro-tres");
const cuadroCuatroCap3 = nodoCap3.querySelector(".cap3-cuadro-cuatro");
const cuadroCincoCap3 = nodoCap3.querySelector(".cap3-cuadro-cinco");
const botonesLateralesCap3 = [...nodoCap3.querySelectorAll(".cap3-boton-lateral")];
const svgCuadroTresCap3 = nodoCap3.querySelector(".cap3-cuadro-tres-svg");
const FRAMES_AZUL_CAP3 = Array.from({ length: 8 }, (_, indice) =>
  `assets/character-walk-right/walk-right-${String(indice + 1).padStart(2, "0")}.png`
);
const FRAMES_CHISPA_CAP3 = Array.from({ length: 8 }, (_, indice) =>
  `assets/Capitulo-3/chispa-caminata/frame_${String(indice + 1).padStart(2, "0")}.png`
);
const cap3 = {
  esperandoGiro: false, activo: false, escena: 0,
  arrastrando: false, puntero: null, inicioX: 0, progresoInicial: 0, progreso: 0,
  timerCaminata: 0, timerReposo: 0, timerCuadroCuatro: 0, timerAyudaPresiona: 0, timerAyudasLaterales: 0, timerPresionDoble: 0,
  presionando: false, caminataIniciada: false, caminataCompleta: false,
  tiempoCaminata: 0, inicioPresion: 0, frameCaminata: 0,
  botonesPresionados: new Set(), cuadroCincoActivo: false
};
[...FRAMES_AZUL_CAP3, ...FRAMES_CHISPA_CAP3].forEach((ruta) => {
  const imagen = new Image();
  imagen.src = ruta;
});

let animacionCuadroTresPreparada = false;
const prepararAnimacionCuadroTres = () => {
  if (animacionCuadroTresPreparada || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const documentoSvg = svgCuadroTresCap3.contentDocument;
  if (!documentoSvg) return;
  const brazoSuperior = documentoSvg.getElementById("brazo-superior");
  const brazoInferior = documentoSvg.getElementById("brazo-inferior");
  const ojo = documentoSvg.getElementById("ojo");
  const brillo = documentoSvg.getElementById("brillo-ojos");
  const chispa = documentoSvg.getElementById("chispa");
  if (!brazoSuperior || !brazoInferior || !ojo) return;
  animacionCuadroTresPreparada = true;

  [brazoSuperior, brazoInferior].forEach((pieza) => {
    pieza.style.transformBox = "fill-box";
    pieza.style.transformOrigin = "50% 8%";
  });
  brazoSuperior.animate([
    { transform: "rotate(-14deg)" },
    { transform: "rotate(24deg)" },
    { transform: "rotate(-14deg)" }
  ], { duration: 1450, iterations: Infinity, easing: "ease-in-out" });
  brazoInferior.animate([
    { transform: "rotate(-20deg)" },
    { transform: "rotate(34deg)" },
    { transform: "rotate(-20deg)" }
  ], { duration: 1450, iterations: Infinity, easing: "ease-in-out" });

  const animacionesParpadeo = [ojo, brillo].filter(Boolean).map((pieza) => {
    pieza.style.transformBox = "fill-box";
    pieza.style.transformOrigin = "50% 50%";
    return pieza.animate([
      { transform: "scaleY(1)", offset: 0 },
      { transform: "scaleY(1)", offset: .38 },
      { transform: "scaleY(.06)", offset: .42 },
      { transform: "scaleY(1)", offset: .47 },
      { transform: "scaleY(1)", offset: 1 }
    ], { duration: 2800, iterations: Infinity, easing: "ease-in-out" });
  });

  if (chispa) {
    const espacioSvg = "http://www.w3.org/2000/svg";
    const raizSvg = documentoSvg.documentElement;
    const parpado = documentoSvg.createElementNS(espacioSvg, "g");
    const pielParpado = documentoSvg.createElementNS(espacioSvg, "ellipse");
    const lineaParpado = documentoSvg.createElementNS(espacioSvg, "path");
    parpado.id = "parpado-chispa-animado";
    pielParpado.setAttribute("cx", "968");
    pielParpado.setAttribute("cy", "1117");
    pielParpado.setAttribute("rx", "80");
    pielParpado.setAttribute("ry", "86");
    pielParpado.setAttribute("fill", "#a74e62");
    lineaParpado.setAttribute("d", "M910 1122 Q968 1150 1026 1122");
    lineaParpado.setAttribute("fill", "none");
    lineaParpado.setAttribute("stroke", "#241020");
    lineaParpado.setAttribute("stroke-width", "12");
    lineaParpado.setAttribute("stroke-linecap", "round");
    parpado.append(pielParpado, lineaParpado);
    raizSvg.append(parpado);
    animacionesParpadeo.push(parpado.animate([
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: .38 },
      { opacity: 1, offset: .42 },
      { opacity: 0, offset: .47 },
      { opacity: 0, offset: 1 }
    ], { duration: 2800, iterations: Infinity, easing: "ease-in-out" }));
  }
  animacionesParpadeo.forEach((animacion) => { animacion.currentTime = 0; });
};
svgCuadroTresCap3.addEventListener("load", prepararAnimacionCuadroTres);
window.requestAnimationFrame(prepararAnimacionCuadroTres);
const laminasCap2 = [...nodoCap2.querySelectorAll(".cap2-lamina")];
const caminanteCap2 = nodoCap2.querySelector(".cap2-caminante");
const frameCap2 = nodoCap2.querySelector(".cap2-frames");
const nubeCap2 = nodoCap2.querySelector(".cap2-nube");
const DURACION_CAMINATA_CAP2 = 6500;
const cap2 = {
  activo: false, estado: "titulo", tiempo: 0, ultimoTiempo: null, raf: 0,
  ocupado: false, error: null, reintentar: null, lamina: -1, versionLamina: 0,
  tapsPensamiento: 0, tapsEscritura: 0, conversacion: 0,
  poseRecuerdo: -1, frame: -1, ultimoPaso: -1, preparacion: null,
  bolitas: [], recuerdos: [], cache: new Map(), audio: null, silencio: false
};

const cargarImagenCap2 = (nombre) => {
  if (!cap2.cache.has(nombre)) {
    const imagen = new Image();
    imagen.src = RECURSOS_CAP2[nombre];
    cap2.cache.set(nombre, esperarImagen(imagen).catch((error) => {
      cap2.cache.delete(nombre);
      throw error;
    }));
  }
  return cap2.cache.get(nombre);
};

// Audio sintetizado de baja intensidad. Se crea/reanuda solo desde un gesto;
// no depende de archivos ni condiciona la navegación si el navegador lo bloquea.
const desbloquearAudioCap2 = () => {
  if (cap2.silencio) return;
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    if (!cap2.audio) cap2.audio = new Contexto();
    if (cap2.audio.state === "suspended") cap2.audio.resume().catch(() => {});
  } catch { /* La historia también funciona en silencio. */ }
};
const sonarCap2 = (tipo, ignorarOrientacion = false) => {
  const audio = cap2.audio;
  if (cap2.silencio || !audio || audio.state !== "running" || document.hidden || (!ignorarOrientacion && !estaHorizontal())) return;
  try {
    const ajustes = {
      paso: [105, .09, .009], tecla: [650, .035, .008],
      glow: [520, .42, .006], puff: [180, .28, .009], mensaje: [784, .55, .007]
    }[tipo];
    const [frecuencia, duracion, volumen] = ajustes;
    const oscilador = audio.createOscillator();
    const ganancia = audio.createGain();
    const ahora = audio.currentTime;
    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(frecuencia, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(tipo === "glow" ? frecuencia * 1.5 : frecuencia * .65, ahora + duracion);
    ganancia.gain.setValueAtTime(0, ahora);
    ganancia.gain.linearRampToValueAtTime(volumen, ahora + .012);
    ganancia.gain.exponentialRampToValueAtTime(.0001, ahora + duracion);
    oscilador.connect(ganancia);
    ganancia.connect(audio.destination);
    oscilador.onended = () => { oscilador.disconnect(); ganancia.disconnect(); };
    oscilador.start(ahora);
    oscilador.stop(ahora + duracion + .02);
  } catch { /* Un dispositivo sin audio no interrumpe las interacciones. */ }
};

const estadoCap2 = (estado) => {
  cap2.estado = estado;
  cap2.tiempo = 0;
  nodoCap2.dataset.estado = estado;
  leyendaCap2.classList.remove("inactividad-visible");
  const ayudas = {
    titulo: "Toca para continuar", caminata: "", pensamiento: "",
    recuerdo: "", disolucion: "", escritura: "",
    mensaje: "Hola...", conversacion: "Toca para continuar la conversación", final: "Toca para continuar"
  };
  leyendaCap2.textContent = ayudas[estado];
  accionCap2.hidden = !["titulo", "recuerdo", "conversacion", "final"].includes(estado);
  botonPressCap2.hidden = estado !== "pensamiento";
  zonasCap2.hidden = estado !== "escritura";
  accionCap2.setAttribute("aria-label", {
    titulo: "Comenzar la caminata del personaje azul", pensamiento: "Hacer crecer el pensamiento",
    recuerdo: "Acercar el recuerdo", conversacion: "Continuar la conversación", final: "Continuar al capítulo 3"
  }[estado] || "Continuar");
};

const mostrarErrorCap2 = (operacion) => {
  cap2.error = true;
  cap2.reintentar = operacion;
  leyendaCap2.textContent = "No se pudo cargar una imagen del capítulo";
  nodoCap2.querySelector(".cap2-reintentar").hidden = false;
};

const operacionCap2 = async (operacion) => {
  if (cap2.ocupado) return;
  cap2.ocupado = true;
  cap2.error = null;
  nodoCap2.setAttribute("aria-busy", "true");
  nodoCap2.querySelector(".cap2-reintentar").hidden = true;
  try {
    await operacion();
  } catch {
    mostrarErrorCap2(operacion);
  } finally {
    cap2.ocupado = false;
    nodoCap2.setAttribute("aria-busy", "false");
  }
};

const mostrarLaminaCap2 = async (nombre, descripcion) => {
  const version = ++cap2.versionLamina;
  const imagen = await cargarImagenCap2(nombre);
  if (version !== cap2.versionLamina) return;
  const siguiente = (cap2.lamina + 1) % 2;
  const nodo = laminasCap2[siguiente];
  nodo.src = imagen.src;
  nodo.alt = descripcion;
  if (typeof nodo.decode === "function") await nodo.decode();
  if (version !== cap2.versionLamina) return;
  laminasCap2.forEach((lamina, i) => {
    lamina.classList.toggle("visible", i === siguiente);
    lamina.setAttribute("aria-hidden", String(i !== siguiente));
  });
  cap2.lamina = siguiente;
  nodoCap2.dataset.imagen = nombre;
};

// Máscaras de presentación en memoria: conservar los píxeles de las referencias
// opacas y separar su silueta sin guardar, redibujar ni modificar ningún PNG.
// El contorno se obtiene del componente conectado; rellenar solo sus huecos
// interiores conserva ojos, boca y personaje dentro de la nube, sin unir lóbulos.
const separarCapaCap2 = (imagen, region, esContorno) => {
  const [origenX, origenY, ancho, alto] = region;
  const recorte = document.createElement("canvas");
  recorte.width = ancho; recorte.height = alto;
  const ctx = recorte.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imagen, origenX, origenY, ancho, alto, 0, 0, ancho, alto);
  const pixeles = ctx.getImageData(0, 0, ancho, alto);
  const total = ancho * alto;
  const etiquetas = new Int32Array(total);
  const cola = new Int32Array(total);
  const mascara = new Uint8Array(total);
  for (let i = 0; i < total; i++) mascara[i] = esContorno(pixeles.data[i * 4], pixeles.data[i * 4 + 1], pixeles.data[i * 4 + 2]) ? 1 : 0;
  let etiqueta = 0, mayor = 0, cantidadMayor = 0;
  const vecinos = (i, visitar) => {
    const x = i % ancho;
    if (x) visitar(i - 1);
    if (x + 1 < ancho) visitar(i + 1);
    if (i >= ancho) visitar(i - ancho);
    if (i + ancho < total) visitar(i + ancho);
  };
  for (let i = 0; i < total; i++) {
    if (!mascara[i] || etiquetas[i]) continue;
    etiqueta++;
    let inicio = 0, fin = 1;
    cola[0] = i; etiquetas[i] = etiqueta;
    while (inicio < fin) {
      vecinos(cola[inicio++], (v) => {
        if (mascara[v] && !etiquetas[v]) { etiquetas[v] = etiqueta; cola[fin++] = v; }
      });
    }
    if (fin > cantidadMayor) { cantidadMayor = fin; mayor = etiqueta; }
  }
  if (!cantidadMayor) throw new Error("No se encontró la silueta en la referencia");
  const exterior = new Uint8Array(total);
  let inicio = 0, fin = 0;
  const visitarExterior = (i) => {
    if (!exterior[i] && etiquetas[i] !== mayor) { exterior[i] = 1; cola[fin++] = i; }
  };
  for (let x = 0; x < ancho; x++) { visitarExterior(x); visitarExterior(total - ancho + x); }
  for (let y = 0; y < alto; y++) { visitarExterior(y * ancho); visitarExterior(y * ancho + ancho - 1); }
  while (inicio < fin) vecinos(cola[inicio++], visitarExterior);
  for (let i = 0; i < total; i++) if (exterior[i]) pixeles.data[i * 4 + 3] = 0;
  ctx.putImageData(pixeles, 0, 0);
  const capa = document.createElement("canvas");
  capa.width = imagen.naturalWidth; capa.height = imagen.naturalHeight;
  capa.getContext("2d").drawImage(recorte, origenX, origenY);
  capa.setAttribute("aria-hidden", "true");
  recorte.width = recorte.height = 0;
  return capa;
};

const prepararPensamientoCap2 = () => {
  if (cap2.preparacion) return cap2.preparacion;
  cap2.preparacion = (async () => {
    const [frontal, pensamiento, saludo, recuerdo] = await Promise.all(["pensar", "pensamiento", "saludo", "recuerdo"].map(cargarImagenCap2));
    const claro = (r, g, b) => r > 70 && g > 125 && b > 150 && b >= r && b >= g;
    const azul = (r, g, b) => b > 150 && b > r + 15 && g > 20;
    nodoCap2.querySelector(".cap2-frontal").replaceChildren(separarCapaCap2(frontal, [180, 360, 350, 540], azul));
    const siguienteFrame = () => new Promise((resolve) => window.requestAnimationFrame(resolve));
    await siguienteFrame();
    cap2.bolitas = [[518, 451, 50, 55], [552, 366, 84, 85]].map((region) => separarCapaCap2(pensamiento, region, claro));
    nodoCap2.querySelector(".cap2-bolitas").replaceChildren(...cap2.bolitas);
    cap2.recuerdos = [];
    for (const [imagen, region] of [[pensamiento, [560, 0, 420, 398]], [saludo, [480, 0, 940, 880]], [recuerdo, [200, 0, 1420, 1022]]]) {
      await siguienteFrame();
      cap2.recuerdos.push(separarCapaCap2(imagen, region, claro));
    }
    nubeCap2.replaceChildren(...cap2.recuerdos);
  })().catch((error) => { cap2.preparacion = null; throw error; });
  return cap2.preparacion;
};

const parpadearFondoCap2 = () => {
  destelloPressCap2.getAnimations().forEach((animacion) => animacion.cancel());
  destelloPressCap2.animate([
    { opacity: .78, offset: 0 },
    { opacity: .72, offset: .12 },
    { opacity: 0 }
  ], {
    duration: movimientoReducido.matches ? 420 : 1000,
    easing: "cubic-bezier(.22, 1, .36, 1)"
  });
};

const posicionarHaloCap2 = (x, y, tamano) => {
  nodoCap2.style.setProperty("--halo-x", `${x}%`);
  nodoCap2.style.setProperty("--halo-y", `${y}%`);
  nodoCap2.style.setProperty("--halo-size", `${tamano}%`);
};

const mostrarRecuerdoCap2 = (indice) => {
  if (cap2.poseRecuerdo === indice) return;
  cap2.poseRecuerdo = indice;
  cap2.recuerdos.forEach((canvas, i) => canvas.classList.toggle("visible", i === indice));
  nodoCap2.dataset.recuerdo = ["normal", "saludo", "guino"][indice];
  const posicionesHalo = [[40, 18, 34], [50, 41, 50], [47, 47, 62]];
  posicionarHaloCap2(...posicionesHalo[indice]);
  if (indice === 2 && cap2.estado === "recuerdo") reproducirAudioPensamiento();
  if (cap2.estado === "recuerdo") parpadearFondoCap2();
};

const pintarCaminataCap2 = () => {
  const { width: ancho, height: alto } = lienzo.getBoundingClientRect();
  const p = limitar(cap2.tiempo / DURACION_CAMINATA_CAP2);
  // Velocidad casi constante, con entrada y frenado de 300ms.
  const borde = .045;
  const distancia = p < borde ? p * p / (2 * borde) : p > 1 - borde ? 1 - borde - (1 - p) ** 2 / (2 * borde) : p - borde / 2;
  const avance = distancia / (1 - borde);
  const llegada = suavizar((p - .86) / .14);
  const altura = alto * interpolar(.455, .507, llegada);
  const indice = Math.floor(cap2.tiempo / DURACION_FRAME_CAMINATA) % 8;
  const apoyo = apoyosCaminata[indice] || [1634, 1633, 1645, 1676, 1689, 1673, 1639, 1636][indice];
  const escala = altura / (apoyo - 280);
  if (cap2.frame !== indice) { frameCap2.src = framesCaminata[indice]; cap2.frame = indice; }
  frameCap2.style.width = `${1578 * escala}px`;
  frameCap2.style.transform = `translate(${-800 * escala}px, ${-apoyo * escala}px)`;
  caminanteCap2.style.left = `${interpolar(1.10, .193, avance) * ancho}px`;
  caminanteCap2.style.top = `${interpolar(.89, .870, llegada) * alto}px`;
  const paso = Math.floor(cap2.tiempo / 550);
  if (cap2.ultimoPaso !== paso) { cap2.ultimoPaso = paso; sonarCap2("paso"); }
  nodoCap2.style.setProperty("--calidez", interpolar(.025, .12, p));
  nodoCap2.dataset.progresoCaminata = p.toFixed(3);
};

const iniciarCaminataCap2 = () => operacionCap2(async () => {
  accionCap2.hidden = true;
  const recursos = Promise.all([cargarImagenCap2("caminata"), cargarImagenCap2("pensar"), ...imagenesCaminata.map(esperarImagen)]);
  laminasCap2.forEach((nodo) => nodo.classList.remove("visible"));
  const [[fondo, parche]] = await Promise.all([
    recursos,
    new Promise((resolver) => window.setTimeout(resolver, 680))
  ]);
  nodoCap2.querySelector(".cap2-fondo-base").src = fondo.src;
  nodoCap2.querySelector(".cap2-fondo-parche").src = parche.src;
  cap2.tapsPensamiento = cap2.tapsEscritura = 0;
  cap2.poseRecuerdo = cap2.frame = cap2.ultimoPaso = -1;
  progresoCap2.textContent = "";
  nubeCap2.classList.remove("disolviendo");
  nodoCap2.style.setProperty("--pensamiento", 0);
  posicionarHaloCap2(29.7, 46.8, 18);
  cap2.bolitas.forEach((canvas) => canvas.classList.remove("visible"));
  cap2.recuerdos.forEach((canvas) => canvas.classList.remove("visible"));
  detenerAudioPensamiento();
  estadoCap2("caminata");
  caminanteCap2.style.opacity = 1;
  caminanteCap2.style.transition = "none";
  pintarCaminataCap2();
  laminasCap2.forEach((nodo) => {
    nodo.setAttribute("aria-hidden", "true");
  });
  // Preparar las máscaras antes de caminar evita pausas durante la animación.
  await prepararPensamientoCap2();
});

const crecerPensamientoCap2 = () => {
  cap2.tapsPensamiento = Math.min(6, cap2.tapsPensamiento + 1);
  const taps = cap2.tapsPensamiento;
  cap2.bolitas.forEach((canvas, i) => canvas.classList.toggle("visible", taps > i));
  const crecimiento = taps < 3 ? 0 : interpolar(.28, 1, (taps - 3) / 3);
  nodoCap2.style.setProperty("--pensamiento", crecimiento);
  if (taps >= 3) mostrarRecuerdoCap2(0);
  if (taps === 1) posicionarHaloCap2(29.7, 46.8, 18);
  else if (taps === 2) posicionarHaloCap2(32.6, 39.9, 20);
  else posicionarHaloCap2(
    interpolar(30, 40, crecimiento),
    interpolar(46, 18, crecimiento),
    interpolar(18, 34, crecimiento)
  );
  nodoCap2.style.setProperty("--calidez", .10 + taps * .02);
  nodoCap2.dataset.progresoPensamiento = String(taps);
  sonarCap2("glow");
  if (taps === 6) {
    estadoCap2("recuerdo");
  }
};

const iniciarEscrituraCap2 = () => operacionCap2(async () => {
  await mostrarLaminaCap2("mensaje", "El personaje azul se anima a escribir su primer mensaje");
  cap2.tapsEscritura = 0;
  nodoCap2.dataset.progresoEscritura = "0";
  nodoCap2.style.setProperty("--calidez", .08);
  estadoCap2("escritura");
  ajustarLatidoEscritura(0);
  reproducirAudioEscritura(true);
  // Las próximas dos vistas se cargan en segundo plano; un fallo permite reintentar.
  cargarImagenCap2("telefono").catch(() => {});
  cargarImagenCap2("escritura").catch(() => {});
});

const escribirCap2 = (lado) => {
  if (cap2.estado !== "escritura" || !puedeInteractuarCap2()) return;
  desbloquearAudioCap2();
  reproducirAudioEscritura();
  cap2.tiempo = 0;
  leyendaCap2.textContent = "";
  leyendaCap2.classList.remove("inactividad-visible");
  cap2.tapsEscritura = Math.min(20, cap2.tapsEscritura + 1);
  const taps = cap2.tapsEscritura;
  ajustarLatidoEscritura(taps / 20);
  nodoCap2.dataset.progresoEscritura = String(taps);
  nodoCap2.dataset.ultimoLado = lado;
  progresoCap2.textContent = "Hola...".slice(0, Math.ceil(taps / 20 * 7));
  sonarCap2("tecla");
  const boton = nodoCap2.querySelector(`.cap2-tecla-${lado}`);
  boton.classList.add("pulsando");
  window.setTimeout(() => boton.classList.remove("pulsando"), 160);
  // Cambiar de plano sin bloquear taps: la versión más reciente gana si una
  // imagen tarda en decodificarse y la persona escribe muy rápido.
  if (taps === 4 || taps === 14 || taps === 9) {
    const nombre = taps === 9 ? "escritura" : "telefono";
    const descripcion = taps === 9 ? "El personaje azul continúa escribiendo de pie" : "Las manos del personaje azul escriben Hola... en su teléfono";
    const cambiar = () => mostrarLaminaCap2(nombre, descripcion);
    cambiar().catch(() => mostrarErrorCap2(cambiar));
  }
  if (taps === 20) {
    detenerAudioEscritura();
    estadoCap2("mensaje");
    progresoCap2.textContent = "";
    nodoCap2.style.setProperty("--calidez", .28);
    sonarCap2("mensaje");
  }
};

const continuarConversacionCap2 = () => operacionCap2(async () => {
  const secuencia = [
    ["respuesta", "El personaje naranja responde desde su teléfono"],
    ["escritura", "El personaje azul continúa la conversación"],
    ["azulRecostado", "El personaje azul conversa recostado"],
    ["naranjaRecostado", "El personaje naranja sigue conversando recostado"]
  ];
  const indice = Math.min(cap2.conversacion, secuencia.length - 1);
  await mostrarLaminaCap2(...secuencia[indice]);
  cap2.conversacion = indice + 1;
  nodoCap2.style.setProperty("--calidez", .10);
  estadoCap2(indice === secuencia.length - 1 ? "final" : "conversacion");
  sonarCap2("tecla");
});

const puedeInteractuarCap2 = () => cap2.activo && !cap2.ocupado && !cap2.error && !document.hidden && estaHorizontal();

const actualizarCap2 = (ahora) => {
  if (!cap2.activo || document.hidden || !estaHorizontal()) return;
  const delta = cap2.ultimoTiempo === null ? 0 : ahora - cap2.ultimoTiempo;
  cap2.ultimoTiempo = ahora;
  if (!cap2.ocupado && !cap2.error) cap2.tiempo += delta;
  if (cap2.estado === "caminata") {
    cap2.tiempo = Math.min(DURACION_CAMINATA_CAP2, cap2.tiempo);
    pintarCaminataCap2();
    if (cap2.tiempo >= DURACION_CAMINATA_CAP2 && !cap2.ocupado) {
      caminanteCap2.style.transition = "opacity .55s ease";
      caminanteCap2.style.opacity = 0;
      estadoCap2("pensamiento");
    }
  } else if (cap2.estado === "pensamiento") {
    const inactivo = cap2.tiempo >= 2500;
    leyendaCap2.textContent = inactivo ? "PRESIONA PARA CONTINUAR" : "";
    leyendaCap2.classList.toggle("inactividad-visible", inactivo);
  } else if (cap2.estado === "escritura") {
    const inactivo = cap2.tiempo >= 2500;
    leyendaCap2.textContent = inactivo ? "TOCA AMBOS LADOS PARA ESCRIBIR" : "";
    leyendaCap2.classList.toggle("inactividad-visible", inactivo);
  } else if (cap2.estado === "recuerdo") {
    mostrarRecuerdoCap2(cap2.tiempo < 1100 ? 0 : cap2.tiempo < 2600 ? 1 : 2);
    if (cap2.tiempo >= 4300) {
      detenerAudioPensamiento();
      parpadearFondoCap2();
      estadoCap2("disolucion");
      nubeCap2.classList.add("disolviendo");
      cap2.bolitas.forEach((canvas) => canvas.classList.remove("visible"));
      nodoCap2.style.setProperty("--calidez", .32);
      sonarCap2("puff");
    }
  } else if (cap2.estado === "disolucion" && cap2.tiempo >= 950 && !cap2.ocupado && !cap2.error) {
    iniciarEscrituraCap2();
  } else if (cap2.estado === "mensaje" && cap2.tiempo >= 1500 && !cap2.ocupado && !cap2.error) {
    cap2.conversacion = 0;
    continuarConversacionCap2();
  }
  cap2.raf = window.requestAnimationFrame(actualizarCap2);
};

const sincronizarCap2 = () => {
  if (!cap2.activo) return;
  window.cancelAnimationFrame(cap2.raf);
  cap2.ultimoTiempo = null;
  const pausado = document.hidden || !estaHorizontal();
  nodoCap2.classList.toggle("en-pausa", pausado);
  nodoCap2.querySelector(".cap2-orientacion").textContent = revisionGiro
    ? "Usa el control superior para girar a horizontal"
    : "Gira tu celular para continuar";
  if (!pausado) cap2.raf = window.requestAnimationFrame(actualizarCap2);
};

const iniciarCapituloTres = (directo = false) => {
  if (cap3.activo || (!directo && (!cap3.esperandoGiro || estaHorizontal() || document.hidden))) return;
  cap3.esperandoGiro = false;
  cap3.activo = true;
  cap2.activo = false;
  window.cancelAnimationFrame(cap2.raf);
  cap2.ultimoTiempo = null;
  detenerAudioEscritura();
  detenerAudioPensamiento();
  lienzo.classList.remove("escena-cinco-activa", "parpadeo-detectado", "transicion-capitulo-dos");
  escenaCinco.classList.remove("esperando-parpadeos");
  intro.hidden = true;
  intro.inert = true;
  posicionProtagonista.inert = true;
  posicionProtagonista.setAttribute("aria-hidden", "true");
  document.querySelector(".mensaje-girar").hidden = true;
  document.querySelector(".inicio-orientacion").hidden = true;
  [escenaTres, escenaCuatro, escenaCinco].forEach((nodo) => {
    nodo.inert = true;
    nodo.setAttribute("aria-hidden", "true");
  });
  nodoCap2.classList.remove("visible", "en-pausa", "espera-cap3");
  nodoCap2.hidden = true;
  nodoCap2.inert = true;
  nodoCap2.setAttribute("aria-hidden", "true");
  lienzo.classList.remove("capitulo-dos-activo");
  lienzo.classList.add("capitulo-tres-activo");
  nodoCap3.hidden = false;
  nodoCap3.inert = false;
  nodoCap3.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => nodoCap3.classList.add("visible")));
};

const sincronizarCapituloTres = () => {
  if (!cap3.esperandoGiro || cap3.activo) return;
  if (!estaHorizontal() && !document.hidden) iniciarCapituloTres();
};

const ocultarAyudaPresionaCap3 = () => {
  window.clearTimeout(cap3.timerAyudaPresiona);
  nodoCap3.classList.remove("mostrar-ayuda-presiona");
};

const programarAyudaPresionaCap3 = () => {
  ocultarAyudaPresionaCap3();
  cap3.timerAyudaPresiona = window.setTimeout(() => {
    if (cap3.escena === 1 && !cap3.presionando && !cap3.caminataCompleta) {
      nodoCap3.classList.add("mostrar-ayuda-presiona");
    }
  }, 2500);
};

const mostrarEscenaDosCap3 = () => {
  cap3.escena = 1;
  cap3.progreso = 100;
  pistaCap3.style.setProperty("--cap3-translate", "-50%");
  nodoCap3.classList.add("en-escena-dos");
  deslizarCap3.blur();
  nodoCap3.querySelector(".cap3-portadilla").inert = true;
  nodoCap3.querySelector(".cap3-portadilla").setAttribute("aria-hidden", "true");
  deslizarCap3.setAttribute("aria-hidden", "true");
  deslizarCap3.tabIndex = -1;
  programarAyudaPresionaCap3();
};

const completarCaminataCap3 = () => {
  if (cap3.caminataCompleta) return;
  cap3.caminataCompleta = true;
  cap3.presionando = false;
  cap3.tiempoCaminata = 6200;
  window.clearInterval(cap3.timerCaminata);
  window.clearTimeout(cap3.timerReposo);
  ocultarAyudaPresionaCap3();
  botonLongPressCap3.classList.remove("presionando");
  botonLongPressCap3.disabled = true;
  nodoCap3.classList.remove("presionando-caminar", "caminata-pausada");
  nodoCap3.classList.add("caminata-completa", "mostrar-cuadro-tres");
  cuadroTresCap3.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(prepararAnimacionCuadroTres);
  nodoCap3.querySelector(".cap3-escena-dos").setAttribute("aria-label", "Tercer cuadro del capítulo 3");
  personajeAzulCap3.src = FRAMES_AZUL_CAP3[0];
  personajeChispaCap3.src = FRAMES_CHISPA_CAP3[0];
  window.clearTimeout(cap3.timerCuadroCuatro);
  cap3.timerCuadroCuatro = window.setTimeout(() => {
    cap3.escena = 3;
    nodoCap3.classList.add("mostrar-cuadro-cuatro");
    cuadroTresCap3.setAttribute("aria-hidden", "true");
    cuadroCuatroCap3.setAttribute("aria-hidden", "false");
    nodoCap3.querySelector(".cap3-escena-dos").setAttribute("aria-label", "Cuarto cuadro del capítulo 3");
    programarAyudasLateralesCap3();
  }, 3000);
};

const ocultarAyudasLateralesCap3 = () => {
  window.clearTimeout(cap3.timerAyudasLaterales);
  nodoCap3.classList.remove("mostrar-ayudas-laterales");
};

const programarAyudasLateralesCap3 = () => {
  ocultarAyudasLateralesCap3();
  cap3.timerAyudasLaterales = window.setTimeout(() => {
    if (cap3.escena === 3 && !cap3.cuadroCincoActivo && cap3.botonesPresionados.size === 0) {
      nodoCap3.classList.add("mostrar-ayudas-laterales");
    }
  }, 2500);
};

const activarCuadroCincoCap3 = () => {
  if (cap3.cuadroCincoActivo || cap3.botonesPresionados.size < 2) return;
  cap3.cuadroCincoActivo = true;
  cap3.escena = 4;
  ocultarAyudasLateralesCap3();
  nodoCap3.classList.remove("cuadro-cuatro-gris");
  nodoCap3.classList.add("mostrar-cuadro-cinco");
  cuadroCuatroCap3.setAttribute("aria-hidden", "true");
  cuadroCincoCap3.setAttribute("aria-hidden", "false");
  nodoCap3.querySelector(".cap3-escena-dos").setAttribute("aria-label", "Quinto cuadro del capítulo 3");
};

const prepararCuadroCincoCap3 = () => {
  window.clearTimeout(cap3.timerPresionDoble);
  if (cap3.botonesPresionados.size < 2 || cap3.cuadroCincoActivo) return;
  nodoCap3.classList.remove("cuadro-cuatro-gris");
  cap3.timerPresionDoble = window.setTimeout(() => {
    if (cap3.botonesPresionados.size === 2) activarCuadroCincoCap3();
  }, 1200);
};

const volverCuadroCuatroCap3 = () => {
  window.clearTimeout(cap3.timerPresionDoble);
  if (!cap3.cuadroCincoActivo) return;
  cap3.cuadroCincoActivo = false;
  cap3.escena = 3;
  nodoCap3.classList.remove("mostrar-cuadro-cinco");
  nodoCap3.classList.add("cuadro-cuatro-gris");
  cuadroCuatroCap3.setAttribute("aria-hidden", "false");
  cuadroCincoCap3.setAttribute("aria-hidden", "true");
  nodoCap3.querySelector(".cap3-escena-dos").setAttribute("aria-label", "Cuarto cuadro del capítulo 3 en pausa");
};

const presionarBotonLateralCap3 = (event) => {
  if (cap3.escena !== 3 || cap3.cuadroCincoActivo) return;
  ocultarAyudasLateralesCap3();
  const boton = event.currentTarget;
  cap3.botonesPresionados.add(boton);
  boton.classList.add("presionando");
  if (event.pointerType !== "mouse") boton.setPointerCapture?.(event.pointerId);
  prepararCuadroCincoCap3();
};

const soltarBotonLateralCap3 = (event) => {
  if (event.pointerType === "mouse") return;
  cap3.botonesPresionados.delete(event.currentTarget);
  event.currentTarget.classList.remove("presionando");
  window.clearTimeout(cap3.timerPresionDoble);
  nodoCap3.classList.add("cuadro-cuatro-gris");
  volverCuadroCuatroCap3();
  if (cap3.botonesPresionados.size === 0) programarAyudasLateralesCap3();
};

botonesLateralesCap3.forEach((boton) => {
  boton.addEventListener("pointerdown", presionarBotonLateralCap3);
  boton.addEventListener("pointerup", soltarBotonLateralCap3);
  boton.addEventListener("pointercancel", soltarBotonLateralCap3);
  boton.addEventListener("lostpointercapture", soltarBotonLateralCap3);
});

const comenzarLongPressCap3 = (event) => {
  if (cap3.caminataCompleta || cap3.presionando) return;
  if (event.type === "keydown" && event.key !== " " && event.key !== "Enter") return;
  if (event.type === "keydown") event.preventDefault();
  ocultarAyudaPresionaCap3();
  if (!cap3.caminataIniciada) {
    cap3.caminataIniciada = true;
    nodoCap3.classList.add("caminata-iniciada", "personajes-caminando");
  }
  cap3.presionando = true;
  cap3.inicioPresion = performance.now();
  botonLongPressCap3.classList.add("presionando");
  nodoCap3.classList.remove("caminata-pausada");
  nodoCap3.classList.add("presionando-caminar");
  window.clearInterval(cap3.timerCaminata);
  cap3.timerCaminata = window.setInterval(() => {
    cap3.frameCaminata = (cap3.frameCaminata + 1) % 8;
    personajeAzulCap3.src = FRAMES_AZUL_CAP3[cap3.frameCaminata];
    personajeChispaCap3.src = FRAMES_CHISPA_CAP3[cap3.frameCaminata];
  }, 137.5);
  window.clearTimeout(cap3.timerReposo);
  cap3.timerReposo = window.setTimeout(completarCaminataCap3, 6200 - cap3.tiempoCaminata);
};

const cancelarLongPressCap3 = (event) => {
  if (event?.type === "keyup" && event.key !== " " && event.key !== "Enter") return;
  if (!cap3.presionando || cap3.caminataCompleta) return;
  cap3.tiempoCaminata = Math.min(6200, cap3.tiempoCaminata + performance.now() - cap3.inicioPresion);
  cap3.presionando = false;
  window.clearInterval(cap3.timerCaminata);
  window.clearTimeout(cap3.timerReposo);
  botonLongPressCap3.classList.remove("presionando");
  nodoCap3.classList.remove("presionando-caminar");
  nodoCap3.classList.add("caminata-pausada");
  programarAyudaPresionaCap3();
  if (cap3.tiempoCaminata >= 6200) completarCaminataCap3();
};

botonLongPressCap3.addEventListener("pointerdown", comenzarLongPressCap3);
botonLongPressCap3.addEventListener("pointerup", cancelarLongPressCap3);
botonLongPressCap3.addEventListener("pointercancel", cancelarLongPressCap3);
botonLongPressCap3.addEventListener("pointerleave", cancelarLongPressCap3);
botonLongPressCap3.addEventListener("keydown", comenzarLongPressCap3);
botonLongPressCap3.addEventListener("keyup", cancelarLongPressCap3);
botonLongPressCap3.addEventListener("blur", cancelarLongPressCap3);

const fijarSlideCap3 = (progreso) => {
  cap3.progreso = Math.max(0, Math.min(100, progreso));
  pistaCap3.style.setProperty("--cap3-translate", `${cap3.progreso / -2}%`);
};

const iniciarSlideCap3 = (event) => {
  if (!cap3.activo || cap3.escena !== 0 || !event.isPrimary) return;
  if (event.target.closest(".cap3-deslizar")) return;
  cap3.arrastrando = true;
  cap3.puntero = event.pointerId;
  cap3.inicioX = event.clientX;
  cap3.progresoInicial = cap3.progreso;
  nodoCap3.classList.add("arrastrando");
  nodoCap3.setPointerCapture(event.pointerId);
};

const moverSlideCap3 = (event) => {
  if (!cap3.arrastrando || event.pointerId !== cap3.puntero) return;
  const avance = (cap3.inicioX - event.clientX) / nodoCap3.clientWidth * 100;
  fijarSlideCap3(cap3.progresoInicial + avance);
};

const terminarSlideCap3 = (event) => {
  if (!cap3.arrastrando || event.pointerId !== cap3.puntero) return;
  cap3.arrastrando = false;
  cap3.puntero = null;
  nodoCap3.classList.remove("arrastrando");
  if (nodoCap3.hasPointerCapture(event.pointerId)) nodoCap3.releasePointerCapture(event.pointerId);
  if (cap3.progreso >= 34) mostrarEscenaDosCap3();
  else fijarSlideCap3(0);
};

nodoCap3.addEventListener("pointerdown", iniciarSlideCap3);
nodoCap3.addEventListener("pointermove", moverSlideCap3);
nodoCap3.addEventListener("pointerup", terminarSlideCap3);
nodoCap3.addEventListener("pointercancel", terminarSlideCap3);
deslizarCap3.addEventListener("click", () => {
  if (!cap3.arrastrando && cap3.escena === 0) mostrarEscenaDosCap3();
});

const prepararCapituloTres = () => {
  if (!cap2.activo || cap2.estado !== "final" || cap3.esperandoGiro || cap3.activo) return;
  cap3.esperandoGiro = true;
  cap2.activo = false;
  window.cancelAnimationFrame(cap2.raf);
  cap2.ultimoTiempo = null;
  nodoCap2.dataset.estado = "espera-cap3";
  nodoCap2.classList.remove("en-pausa");
  nodoCap2.classList.add("espera-cap3");
  accionCap2.hidden = true;
  leyendaCap2.textContent = revisionGiro
    ? "Usa el control superior para girar a vertical"
    : "Gira tu celular de nuevo para continuar";
  sincronizarCapituloTres();
};

const iniciarCapituloDos = async () => {
  if (cap2.activo) return;
  const transicionLenta = lienzo.classList.contains("transicion-capitulo-dos");
  if (transicionLenta) {
    window.setTimeout(() => {
      lienzo.classList.remove("transicion-capitulo-dos", "escena-cinco-activa", "parpadeo-detectado");
      escenaCinco.classList.remove("esperando-parpadeos");
    }, 3000);
  } else {
    detenerAudioOjosFinal();
    lienzo.classList.remove("escena-cinco-activa", "parpadeo-detectado");
    escenaCinco.classList.remove("esperando-parpadeos");
  }
  detenerLecturaCamara(true);
  simularParpadeo.hidden = true;
  desbloquearAudioCap2();
  cap2.activo = true;
  escenaTresTerminada = true;
  recorrido.estado = "terminado";
  window.cancelAnimationFrame(animacionCaminata);
  detenerParallax();
  detenerAnimacionChispita();
  intro.hidden = true;
  document.querySelector("#continuarCapituloDos").disabled = true;
  [escenaTres, escenaCuatro, escenaCinco].forEach((nodo) => {
    nodo.inert = true;
    nodo.setAttribute("aria-hidden", "true");
  });
  document.querySelector(".revision-giro").hidden = !revisionGiro;
  lienzo.classList.remove("espera-inicio-vertical", "recorrido-pausado");
  lienzo.classList.add("capitulo-dos-activo");
  // Fijar la geometría de la portadilla antes de volverla visible evita que el
  // SVG aparezca un instante como lámina de pantalla completa.
  nodoCap2.dataset.estado = "titulo";
  nodoCap2.hidden = false;
  nodoCap2.setAttribute("aria-hidden", "false");
  nodoCap2.classList.add("visible");
  leyendaCap2.textContent = "Preparando el capítulo...";
  accionCap2.hidden = true;
  await operacionCap2(async () => {
    await mostrarLaminaCap2("titulo", "Capítulo 2. La conexión");
    estadoCap2("titulo");
    sonarCap2("glow");
  });
  sincronizarCap2();
};

document.querySelector("#continuarCapituloDos").addEventListener("click", iniciarCapituloDos);
botonPressCap2.addEventListener("click", () => {
  if (!puedeInteractuarCap2() || cap2.estado !== "pensamiento") return;
  desbloquearAudioCap2();
  cap2.tiempo = 0;
  leyendaCap2.textContent = "";
  leyendaCap2.classList.remove("inactividad-visible");
  parpadearFondoCap2();
  crecerPensamientoCap2();
});
accionCap2.addEventListener("click", () => {
  if (!puedeInteractuarCap2()) return;
  desbloquearAudioCap2();
  if (cap2.estado === "titulo") iniciarCaminataCap2();
  else if (cap2.estado === "final") prepararCapituloTres();
  else if (cap2.estado === "recuerdo") {
    nodoCap2.style.setProperty("--calidez", Math.min(.30, .22 + cap2.tiempo / 50000));
    sonarCap2("glow");
  } else if (cap2.estado === "conversacion") continuarConversacionCap2();
});
["izquierda", "derecha"].forEach((lado) => {
  nodoCap2.querySelector(`.cap2-tecla-${lado}`).addEventListener("click", () => escribirCap2(lado));
});
botonSonidoGlobal.addEventListener("click", () => {
  cap2.silencio = !cap2.silencio;
  const activo = !cap2.silencio;
  botonSonidoGlobal.classList.toggle("sonido-activo", activo);
  botonSonidoGlobal.setAttribute("aria-pressed", String(activo));
  botonSonidoGlobal.setAttribute("aria-label", activo ? "Desactivar sonido" : "Activar sonido");
  if (activo) {
    desbloquearAudioCap2();
    reproducirAudioOjosFinal();
    reproducirAudioEscritura();
    reproducirAudioPensamiento();
    window.setTimeout(() => sonarCap2("glow", true), 20);
  } else {
    detenerAudioOjosFinal();
    detenerAudioEscritura();
    detenerAudioPensamiento();
    if (parpadeosDetectados >= 3) completarSalidaParpadeo?.();
    if (cap2.audio?.state === "running") cap2.audio.suspend().catch(() => {});
  }
});

const elementoPantallaCompleta = () => document.fullscreenElement || document.webkitFullscreenElement;

const actualizarControlPantalla = () => {
  const activo = Boolean(elementoPantallaCompleta());
  botonPantallaGlobal.classList.toggle("pantalla-completa-activa", activo);
  botonPantallaGlobal.setAttribute("aria-pressed", String(activo));
  botonPantallaGlobal.setAttribute("aria-label", activo ? "Salir de pantalla completa" : "Activar pantalla completa");
};

botonPantallaGlobal.addEventListener("click", async () => {
  const raiz = document.documentElement;
  try {
    if (elementoPantallaCompleta()) {
      const salir = document.exitFullscreen || document.webkitExitFullscreen;
      if (salir) await salir.call(document);
    } else {
      const entrar = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
      if (!entrar) {
        botonPantallaGlobal.setAttribute("aria-label", "Pantalla completa no disponible en este navegador");
        return;
      }
      await entrar.call(raiz);
    }
  } catch {
    botonPantallaGlobal.setAttribute("aria-label", "No se pudo cambiar a pantalla completa");
  }
  actualizarControlPantalla();
});

document.addEventListener("fullscreenchange", actualizarControlPantalla);
document.addEventListener("webkitfullscreenchange", actualizarControlPantalla);
document.addEventListener("pointerdown", desbloquearAudioOjosFinal, { once: true });
nodoCap2.querySelector(".cap2-reintentar").addEventListener("click", () => {
  if (cap2.reintentar) operacionCap2(cap2.reintentar);
});
orientacionHorizontal.addEventListener?.("change", sincronizarCap2);
document.addEventListener("visibilitychange", sincronizarCap2);
window.addEventListener("resize", () => {
  if (cap2.activo && cap2.estado === "caminata") pintarCaminataCap2();
});
if (parametros.get("capitulo") === "2") iniciarCapituloDos();
else if (parametros.get("capitulo") === "3") {
  iniciarCapituloTres(true);
  if (parametros.get("cuadro") === "3") {
    mostrarEscenaDosCap3();
    completarCaminataCap3();
  }
}
