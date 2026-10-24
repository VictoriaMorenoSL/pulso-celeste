import { CascadaEmojis, EMOCIONES } from "./cascadas.js";

export function crearEmojisConversacion({ canvas, habilitado, visible, sonar }) {
  const motor = new CascadaEmojis(canvas, { delicado: true });
  motor.ajustarCantidad(1);
  const emociones = ["enamoramiento", "sonrisas", "risa", "alegria", "sonrojo"];
  let siguiente = 0;
  let listo = false;
  let carga = null;
  let destruido = false;
  let rafagas = 0;
  // El manejador narrativo llama una sola vez por click. No hay temporizadores
  // de gesto ni listeners adicionales que puedan duplicar el avance.
  const tocar = (event) => {
    if (!listo || !habilitado()) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const teclado = event.detail === 0 && !event.pointerType;
    const origen = {
      x: teclado ? motor.ancho / 2 : (event.clientX - rect.left) / rect.width * motor.ancho,
      y: teclado ? motor.alto / 2 : (event.clientY - rect.top) / rect.height * motor.alto
    };
    const emocion = emociones[siguiente];
    if (!motor.rafaga(origen, emocion, 2)) return;
    siguiente = (siguiente + 1) % emociones.length;
    canvas.dataset.emocion = emocion;
    canvas.dataset.rafagas = String(++rafagas);
    sonar();
  };
  const sincronizar = () => {
    if (canvas.parentElement.hidden) { motor.pausar(); motor.reiniciar(); return; }
    if (!visible()) { motor.pausar(); return; }
    motor.redimensionar();
    // Cambiar de mensaje deja terminar las partículas ya creadas.
    if (motor.particulas.length && !motor.enMarcha) motor.reproducir();
  };
  const medidas = new ResizeObserver(sincronizar);
  medidas.observe(canvas.parentElement);
  const cargar = () => {
    if (carga) return carga;
    carga = Promise.all(EMOCIONES.map((emocion) => motor.cargar(emocion)))
      .then(async () => {
        if (destruido || !await motor.seleccionar(emociones[0])) return;
        listo = true;
        canvas.dataset.listo = "true";
        sincronizar();
      }).catch((error) => { carga = null; throw error; });
    return carga;
  };
  const destruir = () => {
    destruido = true; medidas.disconnect(); motor.destruir();
  };
  return { cargar, tocar, sincronizar, destruir };
}
