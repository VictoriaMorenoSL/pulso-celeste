# Pulso Celeste — experiencia interactiva

Experiencia narrativa interactiva para celular sobre el acercamiento y la construcción de un vínculo afectivo. El protagonista azul pasa del encuentro con Chispita a recordarlo, escribirle y avanzar junto a él. La experiencia contiene tres capítulos dentro de una sola página.

El proyecto usa HTML, CSS y JavaScript sin dependencias externas ni compilación. Los tres capítulos forman parte de `amor.html`; `index.html` redirige a esa experiencia para que la raíz del repositorio funcione directamente en GitHub Pages. Fecha de consolidación: 21 de octubre de 2026.

## Cómo abrir y ejecutar

1. Descomprime el ZIP completo. Conserva juntos `amor.html`, `amor.css`, `amor.js`, los documentos y `assets/` dentro de `Proyecto_Amor/`.
2. Abre esa carpeta como proyecto local en Codex. Pide que lea `AGENTS.md` y este README antes de continuar.
3. Abre una terminal en la carpeta `Proyecto_Amor` e inicia un servidor estático:

   ```bash
   python3 -m http.server 8765 --bind 127.0.0.1
   ```

4. Visita `http://127.0.0.1:8765/amor.html` en el navegador. Detén el servidor con `Ctrl+C` cuando termines. Si el puerto está ocupado, elige otro y cambia el puerto de la dirección.

Python 3 solo se necesita para este ejemplo de servidor; puede usarse cualquier servidor estático equivalente. No hay que ejecutar `npm install`. Se recomienda un navegador moderno con JavaScript, Pointer Events, SVG, Canvas 2D y Web Audio. Abre por HTTP: usar doble clic y `file://` puede bloquear el `fetch` del SVG y la lectura de píxeles para las máscaras del capítulo 2.

### Orientación y pruebas en celular

El inicio está diseñado en vertical (1080 × 1920, proporción 9:16); desde el giro, la experiencia usa horizontal (1920 × 1080, 16:9). El lienzo se adapta conservando proporciones y puede dejar espacio a los lados. En un teléfono que abre el inicio normal en horizontal, primero se solicita posición vertical. Desactiva el bloqueo de giro del teléfono.

Para abrir desde otro dispositivo de la misma red, detén el servidor anterior y ejecútalo con `python3 -m http.server 8765 --bind 0.0.0.0`. En el teléfono visita `http://IP_LOCAL_DEL_MAC:8765/amor.html`, sustituyendo el marcador por la IP local del Mac. Usa una red de confianza y cierra el servidor después. `127.0.0.1` en el teléfono apunta al propio teléfono, no al Mac.

El giro para avanzar se detecta mediante la orientación de la ventana. El paralaje opcional usa DeviceOrientation y puede requerir permiso y un contexto seguro HTTPS según el navegador; una dirección HTTP de red local puede no habilitar los sensores. Su ausencia no bloquea la narrativa. El audio está activo de forma predeterminada y se controla mediante el icono global de volumen situado arriba a la derecha. El mismo control activa o silencia los efectos durante los tres capítulos; su volumen y la respuesta táctil deben validarse en dispositivos reales.

En escritorio se activa automáticamente una barra de revisión. El botón «Girar a horizontal/vertical» simula la orientación para todo el recorrido, incluido el capítulo 2; la pausa y el tiempo permiten inspeccionar la caminata de la escena 3. Los accesos directos a escenas horizontales y al capítulo 2 comienzan en horizontal simulado. Puede forzarse con `?revisarGiro=1` cuando el navegador de escritorio emula tacto, o desactivarse con `?revisarGiro=0`.

Para revisar las proporciones exactas, usa 390 × 844 px en vertical y 844 × 390 px en horizontal. La simulación de escritorio no sustituye la prueba de sensores físicos.

La cámara frontal se solicita al inicio mediante el botón «Activar cámara» y se usa únicamente para analizar cambios breves en la zona de los ojos durante la última escena del capítulo 1. Ningún fotograma se guarda o envía. El flujo se detiene al entrar al capítulo 2. Si el permiso se rechaza, se omite o la API no está disponible, la experiencia permite continuar mediante toque.

## Organización de archivos

| Archivo o carpeta | Función |
| --- | --- |
| `amor.html` | Lienzo común, introducción, escenas 3–5, sección `#capituloDos`, botones y controles de revisión. Carga CSS y JS mediante rutas relativas. |
| `amor.css` | Composición, proporciones, capas, fundidos, brazos, cursor y efectos. El bloque final usa clases `cap2-*` para el capítulo 2. |
| `amor.js` | Navegación, orientación, relojes de animación, arrastre, carga de recursos, máscaras de canvas y audio sintetizado. |
| `index.html` | Entrada raíz para GitHub Pages; conserva parámetros de revisión y abre `amor.html`. |
| `AGENTS.md` | Reglas de continuidad y conservación de recursos para quien trabaje en Codex. |
| `assets/` | Fondos y personajes SVG/PNG originales, incluidas capas y recursos que se conservan aunque no se carguen actualmente. |
| `assets/Textos-titulos/` | Títulos SVG originales. El título actual del capítulo 2 utiliza su referencia PNG. |
| `assets/character-walk-right/` | Ocho frames del azul, spritesheet y notas de animación. Se reutilizan en ambos capítulos. |
| `assets/spark-walk-front/` | Ocho frames frontales de Chispita, spritesheet y notas. Se usan en el encuentro del capítulo 1. |
| `assets/Capitulo-2/` | Doce composiciones PNG aprobadas para la secuencia de La cercanía. |

Todos los recursos de ejecución son locales y relativos. El SVG de textura está embebido en CSS como `data:`; no es una dependencia remota. Los números añadidos como parámetros `?v=` en algunas rutas son versiones de caché, no nombres de archivo adicionales. Los audios utilizados están incluidos en `assets/Audios/`; no hay fuentes descargadas, frameworks, credenciales ni configuración de compilación requerida.

## Capítulo 1: escenas, navegación y animaciones

| Escena | Recursos y comportamiento | Avance |
| --- | --- | --- |
| 1. Introducción vertical | `fondo-uno.svg`, `Textos-titulos/capitulouno.svg`, entrada del título y «Toca para continuar». | Toque mediante `cerrarIntro()`. |
| 2. Personaje sobre el arco | `fondo-dos.svg` y `de-pie-animado.svg`, con parpadeo. Pide girar el celular. | Tras preparar la escena, el giro inicia `mostrarEscenaTres()`. |
| 3. Arco y paisaje horizontal | El arco original se transforma hasta enlazar con el suelo de `fondo-tres.png`. El azul camina hacia la derecha; cielo, montañas y suelo tienen capas de paralaje opcional. | Recorrido automático de 8,8 segundos hacia `mostrarEscenaCuatro()`. |
| 4. Encuentro horizontal | `fondo-cuatro.svg`, personaje azul de espaldas y brazos de espera. Chispita se acerca en perspectiva durante el arrastre. | Activar con un toque; después mantener el control y deslizar hacia la izquierda. Al completar y soltar, fundido hacia `mostrarEscenaCinco()`. |
| 5. Primer plano horizontal | `Personaje-close.svg` sobre el mismo fondo. Parpadeo y destellos de ojos animados dentro del SVG. La cámara solicitada al inicio se procesa localmente y no conserva imágenes. | Cada parpadeo detectado produce una vibración breve cuando el navegador la admite; tres parpadeos abren automáticamente `iniciarCapituloDos()`. Sin cámara se ofrece una continuación táctil accesible; la revisión de escritorio permite simularlos. |

El recorrido de la escena 3 tiene un reloj `requestAnimationFrame` en `actualizarRecorrido()`; `pintarRecorrido()` separa el cambio de frame del desplazamiento y mantiene el apoyo de los pies. Usa los ocho PNG azules a 137,5 ms por frame. `sincronizarRecorrido()` pausa al volver a vertical o esconder la pestaña, y reanuda sin sumar el tiempo de pausa. `solicitarParallax()` pide el permiso cuando procede; las lecturas se calibran y suavizan. La preferencia de movimiento reducido desactiva el paralaje y reduce varios efectos CSS.

Chispita usa los ocho frames de `spark-walk-front` a 125 ms por frame, con recorrido Bézier y escala independiente. Camina mientras se mueve el control; al detener el arrastre se detienen los frames, y al completar el recorrido continúan brevemente durante la transición. Los brazos de espera usan CSS sobre las capas del personaje de espaldas.

**Pulsación sostenida:** no existe un temporizador de long press ni un avance por mantener presionado sin mover. El primer contacto activa el encuentro; una pulsación posterior captura el puntero para arrastrar. El progreso parcial se conserva al soltar. Esta es la interacción implementada y debe conservarse.

## Capítulo 2 — La cercanía

La sección `#capituloDos` se activa al continuar desde el primer plano. `iniciarCapituloDos()` detiene los relojes y sensores anteriores y deja inertes las escenas del capítulo 1. También puede abrirse directamente para revisión.

| Estado en `cap2.estado` | Implementación actual |
| --- | --- |
| `titulo` | Referencia del título, brillo cálido y toque para comenzar. Naranja narrativo `#F49E44`. |
| `caminata` | Azul de derecha a izquierda durante 6,5 segundos. Usa los ocho frames de `character-walk-right` reflejados con CSS, sin modificar los PNG ni usar los frames de Chispita. Desacelera y funde a la pose frontal. |
| `pensamiento` | Seis pulsaciones sobre `assets/Boton-press.svg`: las dos primeras muestran las bolitas; de la tercera a la sexta crece la nube. El resto de la escena no captura esta interacción. |
| `recuerdo` | Poses normal, saludo y guiño, enlazadas por fundidos y pausas temporizadas. Los taps rápidos no saltan esas poses. |
| `disolucion` | La nube se desvanece con escala, desenfoque y efecto sonoro. |
| `escritura` | Veinte taps en las zonas inferiores izquierda o derecha; admite repeticiones del mismo lado. Se construye «Hola...» y cambian los planos al llegar a los taps 4, 9 y 14: cuerpo completo → teléfono → cuerpo completo → teléfono. |
| `mensaje` | Se completa el primer mensaje y se espera 1,5 segundos antes de mostrar la respuesta naranja. |
| `conversacion` | Cada toque avanza a las imágenes restantes de conversación. |
| `final` | Naranja recostado con teléfono. El toque solicita volver a vertical y enlaza con la portadilla del capítulo 3. |

`estadoCap2()` actualiza ayudas, controles y estado; `actualizarCap2()` lleva el reloj. `sincronizarCap2()` pausa en vertical o con la pestaña oculta y reanuda conservando el avance. `operacionCap2()` gestiona tareas asíncronas y reintentos. `mostrarLaminaCap2()` usa dos imágenes con fundido y un contador de versión para que una carga lenta no restaure un plano anterior durante taps rápidos.

### Referencias gráficas exactas

Todas se encuentran en `assets/Capitulo-2/` y están declaradas en `RECURSOS_CAP2`:

| Archivo | Uso |
| --- | --- |
| `cap02_01_titulo.png` | Presentación del capítulo. |
| `cap02_02_caminata.png` | Composición de caminata y fondo. |
| `cap02_02.1_empieza-a-pensar.png` | Pose frontal del azul y región de fondo. |
| `cap02_03_pensamiento.png` | Bolitas y nube con recuerdo normal. |
| `cap02_04_burbuja-y-saludo.png` | Nube ampliada y pose de saludo naranja. |
| `cap02_05_recuerdo.png` | Recuerdo con guiño naranja. |
| `cap02_08_mensaje.png` | Azul con teléfono al comenzar a escribir. |
| `cap02_09_telefono.png` | Acercamiento a las manos y teléfono. |
| `cap02_10_escritura.png` | Respuesta del personaje naranja. |
| `cap02_11_continuacion-escritura.png` | Azul escribiendo de pie. |
| `cap02_12_continuacion-escritura.png` | Azul conversando recostado. |
| `cap02_13_continuacion-escritura.png` | Naranja recostado; último plano actual. |

No hay archivos 06 ni 07 requeridos por el código. Los doce PNG son composiciones opacas, aunque su formato admita canal alfa. `prepararPensamientoCap2()` y `separarCapaCap2()` crean máscaras en canvas en memoria para la pose frontal, bolitas y tres recuerdos. Conservan los píxeles interiores originales. El fondo combina regiones vacías de las referencias de caminata y pensamiento. No se guardan imágenes derivadas ni se cambian los originales; los recortes dependen de las composiciones actuales y deben revisarse si estas cambian.

### Sonidos y alcance terminado

`desbloquearAudioCap2()` crea o reanuda Web Audio desde un gesto. `sonarCap2()` sintetiza pasos, destellos, puff, pulsaciones y aviso de mensaje con osciladores y ganancia suave. El icono global `assets/volumen.svg` inicia activo, permanece visible durante los tres capítulos y activa o desactiva esos efectos. Los audios narrativos adicionales se cargan desde `assets/Audios/`. Si el dispositivo bloquea el audio, la interacción continúa.

Está implementado el recorrido completo del capítulo 2, con título, caminata, crecimiento táctil, recuerdos, disolución, escritura, conversación, efectos y repetición. **El saludo y el guiño son poses con fundidos, no una animación articulada independiente del brazo. Las manos del teléfono forman parte de una composición; no se animan dedos separados.** Para esos movimientos se necesitarían PNG transparentes o secuencias aprobadas adicionales. No hay rutas ficticias esperando esos recursos. Tampoco existe una acción de long press propia del capítulo 2: utiliza taps.

## Capítulo 3 — La cercanía

El capítulo 3 está integrado en `#capituloTres`. Después del capítulo 2 solicita volver a vertical, presenta la portadilla animada y permite deslizar hacia la siguiente escena.

La segunda escena usa `fondo-dos-cap-3.svg`. El personaje azul y Chispita suben la montaña mediante secuencias PNG independientes. La caminata avanza únicamente mientras se mantiene presionado `Boton-press`; si se suelta, conserva el progreso y la escena pasa a blanco y negro. La ayuda «PRESIONA» aparece solo después de un periodo sin movimiento.

Al completar la caminata aparece `fondo-tres-cap-3.svg`, seguido automáticamente por `fondo-cuatro-cap-3.png`. En este cuadro se muestran dos controles laterales multitáctiles. Ambos deben permanecer presionados simultáneamente durante 1,2 segundos para revelar `fondo-cinco-cap-3.svg`; al perder una presión se regresa al cuadro anterior en blanco y negro. En computadora se conserva la revisión simulada y en celular debe validarse el comportamiento multitáctil real.

Todos los recursos del capítulo permanecen dentro de `assets/Capitulo-3/`. El acceso `amor.html?capitulo=3` abre directamente su portada para revisión.

## Accesos para revisión

Abrir estas rutas en el mismo servidor:

- `amor.html`: experiencia completa desde el inicio.
- `amor.html?escena=3`: recorrido del arco al paisaje.
- `amor.html?escena=4`: encuentro y arrastre de Chispita.
- `amor.html?escena=5`: primer plano y enlace al capítulo 2.
- `amor.html?capitulo=2`: capítulo 2 desde su título.
- `amor.html?capitulo=3`: portadilla vertical del capítulo 3.
- `amor.html?revisarGiro=1&escena=3`: acceso explícito a los controles de giro simulado, pausa y tiempo; en escritorio ya se activan de forma automática y se ignoran en dispositivos de puntero táctil grueso.

Los accesos directos sirven para revisión y omiten escenas previas; para validar la narrativa completa, usar la ruta sin parámetros.

## Verificación de la entrega

La revisión de consolidación usa la carpeta original y el servidor local. Se comprueba la sintaxis de JavaScript, las rutas de HTML/CSS/JS, las referencias de los SVG, los ocho frames de cada caminata y las doce imágenes del capítulo 2. Se conserva el contenido de todos los recursos de `assets/`.

Las comprobaciones de lógica cubren continuidad geométrica de la caminata, pausas y reanudaciones, avisos de giro duplicados, lecturas de orientación simuladas y permiso denegado, seis taps de pensamiento, veinte taps rápidos sin alternancia obligatoria, cuatro planos de conversación y el bloqueo inicial vertical de móvil. Son pruebas de código con entorno simulado; no equivalen a sensores reales.

La revisión del navegador comprueba el flujo de inicio vertical, giro por cambio de tamaño, caminata automática, activación sostenida y arrastre de Chispita, primer plano y enlace al capítulo 2; además, crecimiento por taps, escritura, conversación, repetición, pausa vertical y consola. Los resultados y límites de la validación se indican en la entrega.

Resultado de esta revisión: sintaxis JavaScript y pruebas de lógica correctas; 40 rutas únicas responden HTTP 200, incluido el HTML y los recursos declarados; recorrido de ambos capítulos completado en el navegador a 390 × 844 y 844 × 390 px, sin errores ni advertencias en la consola revisada. La pulsación sostenida de activación y el arrastre llevaron Chispita a progreso 1; el capítulo 2 completó sus seis taps de pensamiento, veinte de escritura, planos finales y regreso al título. Se comprobó el bloqueo de interacción al volver a vertical y su reanudación en horizontal. Se verificó el estado del botón de silencio; no se evaluó auditivamente el volumen real del dispositivo.

**Pendiente de validación real:** Safari/iOS y Chrome/Android en teléfono físico, giros y permisos de sensores, paralaje físico, zonas seguras, tacto/multitáctil, volumen y desbloqueo de audio. Los movimientos articulados mencionados arriba requieren recursos adicionales y no se reportan como terminados.

## Compartir esta versión

`Proyecto_Amor_Capitulos_1_y_2.zip` contiene una carpeta raíz `Proyecto_Amor/` con HTML, CSS, JavaScript, README, AGENTS y `assets/` completo, incluidas secuencias, spritesheets y notas originales. No requiere archivos temporales de Codex. Se excluyen metadatos del Finder, cachés y dependencias regenerables. La carpeta de trabajo original permanece en su lugar.

La compañera debe descomprimir, abrir el proyecto en Codex, leer estos documentos e iniciar el servidor desde esa carpeta.

## Publicar con GitHub Pages

1. Sube el contenido completo a la rama `main` del repositorio.
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main`, la carpeta `/ (root)` y guarda.
5. Abre la dirección que GitHub muestre cuando termine el despliegue.

`index.html` abre automáticamente `amor.html` y conserva parámetros como `?capitulo=3`. GitHub Pages sirve el sitio mediante HTTPS, necesario para que permisos y sensores tengan mejor compatibilidad; la cámara, orientación, vibración y multitáctil todavía deben probarse en un teléfono físico.
