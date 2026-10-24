# Banda sonora — maquetas para aprobación

Cuatro composiciones originales generadas por síntesis aditiva offline, sin
muestras, grabaciones comerciales ni obras ajenas. Son **maquetas instrumentales
sintetizadas provisionales**: la producción cinematográfica definitiva y la
aprobación artística de la persona usuaria siguen pendientes.

Auditoría: al comenzar solo estaban `pensamiento.mp3`, `escribiendo-hola.mp3` y
`ojos-final.mp3`, usados por los efectos existentes, sin controlador musical.
Durante la revisión apareció además `assets/Pulso_Celeste_Sonidos_Originales/`,
con `cap02_pulso_suave.mp3`, `mensaje_hola_enviado.mp3`, `emojis_destello.mp3` y
`lluvia_estrellas_5s.mp3`. Ese paquete se conserva intacto y no se incorpora a
esta implementación de las cuatro atmósferas completas.

Los MP3 existen físicamente, son estéreo a 44,1 kHz y 192 kbps. No se generan
durante la experiencia. Los cuatro archivos suman aproximadamente 5,8 MB y se
pueden incluir directamente en GitHub; no requieren servicios externos ni LFS.

| Archivo | Duración MP3 aproximada | Entrada narrativa |
| --- | --- | --- |
| `cap01_primer_encuentro.mp3` | 50,573 s | Capítulo 1; continúa en la portadilla y caminata del capítulo 2. |
| `cap02_pulso.mp3` | 48,039 s | Entrada al estado `pensamiento`; se conserva en `recuerdo`, `disolucion` y `escritura`. |
| `cap02_despues_del_hola.mp3` | 68,598 s | Tap de escritura número 20: `estadoCap2("mensaje")`. Continúa durante conversación, espera de giro y capítulo 3 previo al cierre. |
| `final_amor_creciente.mp3` | 75,833 s | Exclusivamente `cierreEstelar.presentado`, cuando el fondo propio ya es opaco y el plano anterior está oculto. |

Las cuatro piezas comparten un motivo en re mayor/si menor y voicings con
séptimas y novenas. El primer encuentro usa piano espaciado y armonías suaves;
el pulso añade golpes dobles afinados; después del envío aparecen arpegios,
melodía y campanas. El cierre crece por frases: suma cuerdas sintetizadas y
destellos, alcanza su mayor intensidad dentro de esa escena y termina en reposo.
Las colas de reverberación del arreglo se pliegan al inicio del ciclo.

## Escuchar y verificar

Abrir `../../../desarrollo/musica.html` mediante el servidor del proyecto. La
página ofrece un reproductor y una descarga por archivo, sin autoplay y con una
sola pista a la vez. En la experiencia, usar el control global de sonido. Un
acceso directo requiere un primer gesto real para desbloquear Web Audio.

`assets/audio/banda-sonora.js` gestiona una única fuente ambiental. Los cambios
de pista hacen fade out durante 850 ms, detienen la fuente anterior y hacen fade
in de la siguiente durante 1400 ms. Las pausas conservan la posición, el silencio
detiene la fuente inmediatamente y la pestaña oculta no acumula tiempo musical.
El regreso desde BFCache conserva la posición; cerrar o recargar destruye el
contexto anterior. Una interrupción de Safari puede necesitar otro gesto para
reanudar. Los fallos de carga dejan la historia operativa y se reintentan con un
gesto posterior. Solo se conserva en caché el PCM de la pista activa.

La música se detiene en pausas narrativas por giro de los capítulos anteriores y
reanuda desde la misma posición. Un giro que no pausa/cambia el estado conserva
la fuente en ejecución. El cierre es vertical y no depende del giro: su música
final acompaña estrellas, título SVG y créditos, y continúa después de la lluvia
de cinco segundos. El reinicio destruye su contexto antes de volver al inicio.
No se modifican los tres MP3 de efectos ni sus funciones de escritura,
pensamiento y parpadeos. La música tiene contexto y ganancia propios, vinculados
al mismo silencio global.

## Regeneración opcional

`scripts/generar_musica.py` conserva la composición, síntesis, semilla y mezcla.
Requiere Python, numpy y lameenc **solo para autoría**. El sitio usa los MP3 ya
exportados y no necesita instalar ni compilar nada.

```sh
python scripts/generar_musica.py
node --test tests/banda-sonora.test.cjs
```

También acepta `--formato wav`. Si se decide publicar WAV en lugar de MP3 hay
que actualizar las rutas del controlador y de la página de escucha.
`manifiesto.json` registra duraciones PCM, niveles, tamaños y hashes SHA-256.
La duración decodificada de MP3 incluye unos milisegundos de relleno del códec.

Pruebas de esta entrega: decodificación completa a PCM de los cuatro MP3,
presencia de señal y margen sin clipping; pruebas de control de estados,
exclusión de fuentes simultáneas, envío exacto, pausa, silencio, BFCache y errores.
La prueba de reproducción del visualizador no sustituye la escucha y aprobación
artística ni la validación de Safari/iOS y Chrome/Android en un teléfono físico.
