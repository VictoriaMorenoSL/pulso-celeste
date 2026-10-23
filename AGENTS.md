# Guía de continuidad — Proyecto Amor

## Objetivo

Continuar una experiencia narrativa interactiva para celular sin alterar los recursos visuales aprobados.

## Tecnología

- HTML, CSS y JavaScript sin dependencias externas.
- Archivo principal: `amor.html`.
- Todos los recursos se cargan mediante rutas relativas dentro de `assets/`.
- No añadir un framework ni un proceso de compilación salvo que la persona usuaria lo solicite.

## Reglas visuales

- No redibujar, recolorear, deformar ni sustituir los personajes o fondos aprobados.
- No modificar los PNG de las secuencias de animación.
- Mantener transparencia, textura, proporciones y orden de los frames.
- Separar la animación por frames del desplazamiento del contenedor.
- Conservar las escenas verticales en 1080 × 1920 (9:16) y las horizontales en 1920 × 1080 (16:9).
- Evitar cuadros, bordes o contenedores visibles que no formen parte del diseño.

## Estado de las escenas

1. Introducción vertical con `fondo-uno.svg`, título de capítulo y mensaje “Toca para continuar”.
2. Escena vertical con `fondo-dos.svg`, personaje de pie y mensaje “Gira tu celular para avanzar”.
3. Transición del arco de `fondo-dos.svg` al paisaje horizontal de `fondo-tres.png`, con caminata hacia la derecha usando los ocho PNG de `assets/character-walk-right/`, apoyo de pies y paralaje opcional.
4. Escena horizontal con `fondo-cuatro.svg`, personaje de espaldas con brazos animados e interacción de arrastre de Chispita. La caminata usa los ocho PNG de `assets/spark-walk-front/`.
5. Escena horizontal con el mismo fondo y `Personaje-close.svg`. Los ojos parpadean y sus destellos giran y crecen en loop.

## Flujo e interacción

- La escena 1 avanza mediante toque.
- La escena 2 solicita girar el dispositivo.
- La escena 3 avanza automáticamente al terminar su recorrido.
- En la escena 4, el usuario activa y desliza el control hacia la izquierda; Chispita avanza en perspectiva y su secuencia continúa en loop al completar el recorrido.
- Al completar el control, la escena 4 hace fade out y aparece la escena 5.
- Al inicio se solicita permiso de cámara mediante un gesto explícito. El video se procesa localmente, no se guarda ni se envía.
- La escena 5 cuenta tres parpadeos, responde con vibración háptica cuando el navegador la admite y entonces avanza automáticamente al capítulo 2. Si la cámara no está disponible o se omite, conserva una continuación táctil accesible; en revisión de escritorio aparece «Simular parpadeo».
- El control de Chispita se activa al primer contacto; después se mantiene presionado y se arrastra. No hay temporizador de long press ni avance por mantenerlo quieto.
- En computadora, la barra de revisión simula vertical/horizontal durante ambos capítulos; en dispositivos táctiles se conserva la orientación física. No eliminar esta separación al ampliar la experiencia.

## Capítulo 2 y continuidad

- Leer `README.md` para el mapa completo de escenas, recursos, ejecución y límites de implementación.
- El capítulo 2 está integrado en los mismos `amor.html`, `amor.css` y `amor.js`, dentro de `#capituloDos`, con estilos `cap2-*` y un estado `cap2`.
- Incluye título, caminata azul hacia la izquierda (frames originales reflejados mediante CSS), seis pulsaciones de `assets/Boton-press.svg` para formar el pensamiento, recuerdos normal/saludo/guiño, disolución, veinte taps de escritura y conversación. Se pausa en vertical física en celular, vertical simulada en computadora o con la pestaña oculta.
- Los doce PNG de `assets/Capitulo-2/` son composiciones opacas. Las máscaras se calculan en memoria; no modificar ni reemplazar los originales. Saludo y guiño son poses con fundidos, sin brazo ni dedos articulados independientes.
- Los efectos son sintetizados con Web Audio y tienen silencio; no hay archivos de audio externos.
- El último plano es `cap02_13_continuacion-escritura.png`. `continuarConversacionCap2()` establece el estado `final`; la rama `cap2.estado === "final"` del manejador de `accionCap2` llama ahora a `prepararCapituloTres()`.
- El capítulo 3 ya inicia desde el estado final: después del toque pide volver a vertical y muestra una portadilla con `assets/Capitulo-3/fondo-capitulo3.svg` y `assets/Capitulo-3/capitulo3.svg`. La siguiente escena aún no está implementada.
- Al ampliar el capítulo 3, conservar `prepararCapituloTres()`, `sincronizarCapituloTres()` e `iniciarCapituloTres()`: detienen el reloj anterior, dejan el capítulo 2 inerte y respetan giro físico o simulado. No añadir pantallas vacías visibles.
- Validación en teléfono físico, sensores, tacto y audio real pendiente; las pruebas de escritorio no la sustituyen.

## Recursos aprobados

- Caminata protagonista: `assets/character-walk-right/walk-right-01.png` a `walk-right-08.png`.
- Caminata Chispita: `assets/spark-walk-front/spark-walk-front-01.png` a `spark-walk-front-08.png`.
- Primer plano: `assets/Personaje-close.svg`.
- Portadilla del capítulo 3: `assets/Capitulo-3/fondo-capitulo3.svg` y `assets/Capitulo-3/capitulo3.svg`.

Antes de entregar cambios, comprobar que todas las rutas de `amor.html`, `amor.css` y `amor.js` sigan siendo relativas y que no falte ningún recurso.
