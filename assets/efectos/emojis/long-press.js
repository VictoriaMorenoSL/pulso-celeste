// Comparte el mismo gesto: tap breve nativo; presión sostenida con emisión
// periódica y una sola continuación al soltar. Cancelar nunca avanza.
export function vincularLongPress(area, motor, {
  duracion = 500,
  intervalo = 1100,
  habilitado = () => true,
  aceptar = (event) => !event.target.closest("button, a, input, select, textarea, [role=button]"),
  alInicio = () => {},
  alRafaga = (origen) => motor.rafaga(origen),
  alSoltar = () => {},
  alDetener = () => {},
  consumirClick = false
} = {}) {
  const listeners = new AbortController();
  const opciones = { passive: true, signal: listeners.signal };
  let gesto = null;
  let timer = 0;
  let omitirClick = false;
  const cancelar = () => {
    window.clearTimeout(timer);
    timer = 0;
    if (gesto) alDetener();
    gesto = null;
  };
  const emitir = () => {
    if (!gesto || document.hidden || !habilitado()) { cancelar(); return; }
    const rect = area.getBoundingClientRect();
    gesto.emitiendo = true;
    omitirClick = consumirClick;
    alRafaga({
      x: (gesto.x - rect.left) / rect.width * motor.ancho,
      y: (gesto.y - rect.top) / rect.height * motor.alto
    });
    timer = window.setTimeout(emitir, intervalo);
  };
  area.addEventListener("pointerdown", (event) => {
    cancelar();
    if (!event.isPrimary || event.button !== 0 || document.hidden || !habilitado()) return;
    omitirClick = false;
    if (!aceptar(event)) return;
    gesto = { id: event.pointerId, x: event.clientX, y: event.clientY, emitiendo: false };
    area.dataset.emojisPuntero = "presionado";
    alInicio();
    timer = window.setTimeout(emitir, duracion);
  }, opciones);
  area.addEventListener("click", (event) => {
    // Los clicks de teclado conservan su navegación. Los clicks de puntero
    // posteriores a un long press no duplican la continuación de pointerup.
    if (!omitirClick || (event.detail === 0 && !event.pointerType)) return;
    omitirClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true, signal: listeners.signal });
  window.addEventListener("pointermove", (event) => {
    if (!gesto || event.pointerId !== gesto.id) return;
    if (!gesto.emitiendo && Math.hypot(event.clientX - gesto.x, event.clientY - gesto.y) > 12) {
      cancelar(); return;
    }
    if (gesto.emitiendo) { gesto.x = event.clientX; gesto.y = event.clientY; }
  }, opciones);
  window.addEventListener("pointerup", (event) => {
    if (event.pointerId !== gesto?.id) return;
    const avanzar = gesto.emitiendo && habilitado();
    area.dataset.emojisPuntero = "soltado";
    cancelar();
    if (avanzar) alSoltar();
  }, opciones);
  const cancelarPuntero = (event) => {
    if (event.pointerId !== gesto?.id) return;
    area.dataset.emojisPuntero = "cancelado";
    cancelar();
  };
  window.addEventListener("pointercancel", cancelarPuntero, opciones);
  area.addEventListener("pointerleave", cancelarPuntero, opciones);
  window.addEventListener("blur", cancelar, opciones);
  window.addEventListener("resize", cancelar, opciones);
  document.addEventListener("visibilitychange", cancelar, opciones);
  const retirar = () => { cancelar(); listeners.abort(); };
  retirar.cancelar = cancelar;
  return retirar;
}
