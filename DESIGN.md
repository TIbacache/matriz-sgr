# DESIGN.md — Especificación visual SGR

**Versión**: 1.5 · **Fecha**: 2 de septiembre de 2026
**Regla de oro**: este archivo es normativo. Si un componente no cumple lo que dice aquí, está mal aunque "se vea bien".
**v1.5**: §3.6 pasa a tener dos regímenes de movimiento —**estado** en las zonas de datos y **ambiente** en las zonas de identidad— y una regla de feedback para todo lo clickeable. Decisión del equipo del 2 de septiembre: "la app se mueve sin que la toquen". §8.9 se reescribe en consecuencia.
**v1.4**: §10 ejecutado — identidad de la Municipalidad de La Serena en tokens, barra y login (ADR-010 tipografía, ADR-011 los dos rojos). §2 y §3 actualizadas a lo implementado; §8 suma la regla 11; nace §10.7 con la verificación por script.
**v1.2**: §8.1 Accesibilidad como norma obligatoria (RNF-012 y RNF-013 del PDF).
**v1.3**: §8.2 con los criterios de las pantallas pendientes (ficha personal, formularios, evidencias, bandeja del verificador, ficha del vecino, parámetros), fijados antes de construirlas.
**v1.1**: cuerpo pasa a General Sans; se agregan tema oscuro, sistema de movimiento y marca ●▲■ (receta portada de la app de referencia ebus-test, adaptada a CSS3 puro). La implementación viva de los tokens es `frontend/src/styles/tokens.css`.

---

## 1. Identidad central

La identidad visual del sistema se construye alrededor del **semáforo de cumplimiento** (rojo/amarillo/verde). No es un adorno: es el lenguaje principal de la interfaz. Todo lo demás (fondos, tipografía, bordes) es deliberadamente sobrio para que el color de estado sea lo único que grita.

Principio: **la interfaz es un tablero de control municipal, no un SaaS genérico**. Densidad de información alta, cromática funcional, cero decoración.

---

## 2. Tipografía

Decidida en **ADR-010** (2 de septiembre de 2026), frente a la norma municipal que pide Arial para documentos.

| Uso | Fuente | Fallback | Pesos |
|---|---|---|---|
| Títulos (h1–h3), wordmark, cifras grandes de KPI | **Libre Franklin** (Google Fonts, OFL) | `"Franklin Gothic Medium", system-ui, sans-serif` | 500, 700, 800 |
| Cuerpo, tablas, formularios, etiquetas | **General Sans** (Fontshare, gratis) | `Public Sans, system-ui` | 400, 500, 600 |
| Datos tabulares/numéricos alineados | **General Sans** con `font-variant-numeric: tabular-nums` (aplicado global a `th, td, .tnum`) | — | 400, 600 |
| **Todo lo que se imprime o exporta** (`@media print`, informes RF-033) | **Arial** — es donde la norma municipal aplica literalmente | `"Liberation Sans", Helvetica, sans-serif` | — |

- **PROHIBIDO usar Inter** en cualquier parte.
- Por qué Libre Franklin y no Space Grotesk: Franklin Gothic es el idioma de la señalética cívica y del diario impreso; da peso institucional e histórico (los valores que el manual declara) sin verse tecnológico. Space Grotesk junto al rojo luminoso `#DB0032` se habría leído como marca de fintech.
- General Sans se queda porque es un palo seco humanista sin contraste marcado —la misma familia visual que el manual pide para el logotipo— y ya estaba probado en tablas densas y móvil.
- Carga: Libre Franklin vía Google Fonts, General Sans vía Fontshare CDN, ambas con `font-display: swap` y solo los pesos usados. En producción (Fase 5) evaluar auto-hospedar los woff2.
- Escala tipográfica (base 16px): `12 / 14 / 16 / 20 / 25 / 31 / 39` (ratio ~1.25). Títulos con `letter-spacing: -0.01em`; wordmark y frase del login, `-0.02em`.
- Line-height: 1.2 en títulos, 1.5 en cuerpo, 1.35 en celdas de tabla.
- Cifras de KPI: Libre Franklin 700, tamaño 39–48px, figuras proporcionales (tabular queda para las tablas).

---

## 3. Paleta

La identidad gráfica de la Municipalidad de La Serena es normativa (§10) y está implementada en `frontend/src/styles/tokens.css`, que es la fuente de verdad de los valores. Los **colores de estado de §3.1 no cambiaron** con la identidad: no son identidad, son dato (ADR-011).

### 3.1 Colores de estado (núcleo de la identidad)

| Token | Hex | Uso |
|---|---|---|
| `--estado-verde` | `#1F7A3D` | Al día o mejor: avance relativo al objetivo del día ≥ 100% |
| `--estado-verde-bg` | `#E3F2E8` | Fondo de chip/celda verde |
| `--estado-amarillo` | `#B87E00` | **Naranjo** del cliente: avance relativo 60–99% (el token conserva el nombre; el hex ámbar ya es naranjo) |
| `--estado-amarillo-bg` | `#FCF0D4` | Fondo de chip/celda naranja |
| `--estado-rojo` | `#C0392B` | Avance relativo < 60% |
| `--estado-rojo-bg` | `#FADBD7` | Fondo de chip/celda roja |

Umbrales dictados por el cliente (reunión 00:48:16; fórmulas en `docs/anotaciones-clase.md §1`): el % que se colorea es el **avance relativo al objetivo del día**, no el avance crudo. Referencia de gestión adicional: bajo 80% al cierre "se le pone el ojo" a la persona (no es un color, puede ser una línea de referencia en gráficos).

Reglas:
- El color de estado se aplica **siempre en par** (color fuerte para texto/indicador + fondo pálido). Nunca texto oscuro sobre el color fuerte.
- El estado nunca se comunica solo con color: siempre acompañado de texto ("82%", "En riesgo") o forma (●/▲/■) para accesibilidad.
- Contraste mínimo WCAG AA (4.5:1) en todo texto sobre su fondo.

### 3.2 Neutros y estructura

| Token | Hex | Uso |
|---|---|---|
| `--tinta` | `#1A1D1F` | Texto principal |
| `--tinta-2` | `#5B6166` | Texto secundario, etiquetas |
| `--tinta-3` | `#8A9094` | Texto deshabilitado, placeholders |
| `--fondo` | `#F4F4F2` | Fondo de página (gris cálido, NO blanco puro ni crema) |
| `--superficie` | `#FFFFFF` | Tarjetas, tablas, paneles |
| `--borde` | `#DDDFE0` | Bordes de tarjetas y tablas |
| `--borde-fuerte` | `#B9BDBF` | Bordes de inputs con foco/hover |

### 3.3 Identidad y acento (ADR-011)

Los dos rojos del sistema tienen papeles distintos y **ningún token cumple los dos**:

| Token | Hex (claro) | Hex (oscuro) | Papel |
|---|---|---|---|
| `--marca` | `#DB0032` rojo luminoso | `#FF4D6D` | Identidad como texto o marca |
| `--marca-profundo` | `#8A0007` heráldico | `#6B0006` | Campo de identidad: panel del login |
| `--marca-oscuro` | `#971A3A` | igual | Segunda tinta del duotono (el mar del faro) |
| `--acento` / `--acento-hover` | `#DB0032` / `#8A0007` | `#FF4D6D` / `#FF7A92` | Lo interactivo: enlaces, navegación activa, anillo de foco |
| `--btn-bg` / `--btn-bg-hover` / `--btn-texto` | `#DB0032` / `#8A0007` / blanco | `#DB0032` / `#B8002A` / blanco | Botón primario (en oscuro conserva el luminoso como fondo: con blanco cumple 5.17:1) |
| `--barra-fondo`, `--barra-texto`, `--barra-texto-2`, `--barra-borde`, `--barra-hover-bg`, `--barra-activo-bg` | heráldico + blancos con opacidad | heráldico profundo | Todo lo que se dibuja sobre la barra lateral |
| `--seleccion` / `--seleccion-bg` | `#1A1A1A` / `#E9E8E4` | `#E6E9EA` / blanco al 7% | "Esto es lo seleccionado" **dentro de una zona de datos**: fila activa, gauge filtrado, columna de destino del tubo, aviso de conflicto |
| `--cat-1` … `--cat-6` | acero, oliva, teja, violeta, tierra, verde azulado | versiones claras | Franja de categoría de la tarjeta del tubo. Ninguno rojo |
| `--tubo-1..3` | neutros cálidos → negro profundo | invertida | Rampa ordinal del tubo apilado y de la proyección |
| `--texto-sobre-estado` | blanco | blanco | Texto encima de un relleno fuerte de estado (celdas del heatmap) |

**La regla que lo sostiene**: el rojo institucional se separa del rojo del semáforo por **rol, zona y forma**, no por matiz.
- *Zona*: `--marca` y `--acento` **nunca aparecen dentro de una zona de datos** (tablas, chips, gauges, heatmap, tarjetas del tubo, series de gráficos). Ahí lo seleccionado usa `--seleccion`, y el único rojo posible es `--estado-rojo`.
- *Forma*: el rojo institucional es tipografía, fondo sólido de la barra o del botón, o anillo de foco; **nunca el par fondo pálido + texto fuerte**, que es la firma del chip de estado. Por eso `.btn-peligro` es de contorno, sin relleno: junto a un primario sólido se distinguen por la forma.
- Verificado por script: `npm run verificar:contraste` exige ΔE ≥ 15 entre `--acento` y `--estado-rojo` en los dos temas (hoy 19,4 y 24,2).

- **PROHIBIDO**: gradientes morado-azul, paletas beige/crema con acento naranja, cualquier gradiente como fondo de tarjeta o botón.

### 3.4 Paleta secuencial para heatmap (ECharts `visualMap`)

De menor a mayor gravedad: `#E3F2E8 → #FCF0D4 → #F5C16C → #E67E4E → #C0392B`.
(Verde pálido → amarillo → ámbar → rojo. Coherente con el semáforo; no usar viridis ni azules por defecto de ECharts.)

### 3.5 Tema oscuro

- Arquitectura de **dos capas**: `:root` define el tema claro completo; `[data-theme="oscuro"]` SOLO redefine lo que cambia. Ningún componente usa colores fuera de tokens, por lo que no existe ni una regla `dark:` en el código.
- Valores exactos en `frontend/src/styles/tokens.css` (fuente de verdad). Ideas clave: fondos carbón (no negro puro); el rojo luminoso vibra sobre carbón y como texto no llega a 4.5:1, así que `--acento` y `--marca` se elevan a `#FF4D6D` mientras el botón conserva `#DB0032` de fondo (por eso tiene tokens propios `--btn-*`); la barra pasa al heráldico profundo `#6B0006`; los estados suben luminosidad y sus fondos pálidos pasan a transparencias del color. El script encontró que `--estado-rojo-texto` en oscuro quedaba en 4.44:1 sobre su fondo pálido: se elevó a `#EA7C70`.
- **Sin parpadeo**: script inline en `index.html` aplica `data-theme` desde `localStorage` (clave `matriz.tema`) o `prefers-color-scheme` ANTES del primer paint. El toggle sincroniza entre pestañas vía evento `storage`.

## 3.6 Movimiento: dos regímenes

**Decisión del equipo (2 de septiembre de 2026)**: una interfaz que solo se mueve cuando la tocan se lee como quieta. La app tiene que **vivir sola** —loops visibles, períodos que no rimen, feedback en todo lo clickeable— sin que el movimiento le quite claridad al dato. Para que las dos cosas convivan, el movimiento tiene **dos regímenes con reglas distintas**, y la zona de la pantalla decide cuál aplica.

Común a los dos:
- **Una sola curva** para lo interactivo: `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-expo`). Duraciones: 150ms micro-hovers, 240ms entradas, 420ms paneles. Los loops de ambiente usan `ease-in-out` o `linear`, porque no terminan.
- **Solo `transform` y `opacity`** (y `box-shadow` para halos): nada que dispare layout.
- **`prefers-reduced-motion` apaga todo**: cada archivo apaga lo suyo y `base.css` tiene además la red de seguridad global (`animation-duration: 0.01ms !important`). `MotionConfig reducedMotion="user"` en `App.tsx` hace lo mismo con la librería.
- **CSS primero**; la librería **Motion** (`motion/react`) se usa para lo que CSS no hace: counter-up (`KpiTile`, `useContador`), el marcador de activo compartido del menú (`layoutId`) y, cuando llegue, overlays con `AnimatePresence`.

### 3.6.1 Régimen de ESTADO — zonas de datos

En tablas, chips, gráficos, tarjetas del tubo, formularios: **el movimiento significa estado, no decora**. Los cuatro keyframes del sistema (en `base.css`):
1. `pulso-critico` — halo rojo expansivo. **Solo** para estado crítico real: tareas vencidas, y el chip hero del semáforo en rojo (`ChipSemaforo pulsa`) — **una vez por pantalla**, no en cada fila.
2. `pulso-vivo` — halo verde del indicador de presencia (la señal de "sistema vivo").
3. `entrada` — opacity + translateY(8px), en cascada con `animation-delay: i*50ms` inline.
4. `brillo` — skeleton shimmer para estados de carga.

Y las cifras **llegan, no aparecen**: `useContador` cuenta desde el valor anterior al nuevo en la cifra hero de la ficha y en los KPI.

### 3.6.2 Régimen de AMBIENTE — zonas de identidad

En el panel del login y en la barra lateral —las dos superficies heráldicas, donde no hay dato que leer— el movimiento **es vida** y no necesita justificar un estado. Sus reglas:
- **Períodos primos que no riman**: 3.1 · 3.7 · 4.3 · 5.3 · 7 · 11 · 13 · 17 · 19 · 23 · 29 · 37 s. Dos loops nunca coinciden en fase, así que el conjunto no se siente mecánico.
- **Lento y de baja amplitud**: nada se mueve más de unos píxeles por segundo; el ojo lo nota de reojo, no de frente.
- **Nunca debajo de un texto**: la silueta de la barra vive entre el menú y el pie; el arte del login está en flujo bajo la frase, no detrás. El contraste del texto no depende de dónde esté el loop.
- **Cuando hay un estado real, el ambiente lo muestra**: mientras el sistema autentica, el faro se apura.

Lo que hay hoy:
- **Login** (`FaroSerena`): el Faro Monumental dibujado a partir del real —torre cuadrada de piedra clara con las **ventanas en hilera y luz adentro**, galería con almenas de ladrillo, linterna de vidrio con mástil, y el fuerte de la base con sus dos torreones—. El haz gira del horizonte al mar (11 s) y al llegar al agua enciende su reflejo; las cinco ventanas se encienden cada una a su ritmo (3.7–6.1 s); tres capas de olas a 7, 11 y 13 s (una en sentido contrario); ocho estrellas que titilan; el astro deriva en 23 s; la lámpara respira en 3.7 s. El contenedor conserva la proporción del viewBox (`aspect-ratio: 800/360`, `meet`) para que la linterna nunca se recorte; y como con `meet` el dibujo puede quedar más angosto que el panel, **el mar, el promontorio y las olas se extienden 800 unidades más allá del viewBox por cada lado** (`overflow: visible` en el SVG, `overflow: hidden` en el contenedor): el agua llega siempre a los bordes. Sin eso el mar se veía como una lámina rectangular sobre el panel — lo notó el equipo.
- **Barra lateral** (`SiluetaSerena`): **una sola escena de La Serena**, de izquierda a derecha: la iglesia de San Francisco, un **jarro pato diaguita** con su greca, la **cúpula de La Recova**, **El Miliciano** sobre su columna, un **papayo** que se mece con sus papayas, y el Faro Monumental con las ventanas encendidas; detrás, los cerros del valle y la **camanchaca** pasando a 19, 29 y 37 s; el haz del faro barriendo el cielo cada 17 s; y abajo una **greca escalonada diaguita** que recorre el borde a 13 s y un zigzag en sentido contrario a 23 s. Es lo que hace que la barra sea de La Serena y no de cualquier municipio.
- **Menú**: el marcador de activo es un solo elemento que **se desliza** de un ítem al otro (motion `layoutId`, resorte 520/42).

### 3.6.3 Feedback en todo lo clickeable

Regla: **si se puede hacer clic, responde al cursor antes del clic**. En `base.css`:
- Botones (`.btn-primario`, `.btn-secundario`, `.btn-peligro`, `.btn-tabla`): se levantan 1px con sombra al pasar y se hunden (`scale(.98)`) al presionar. Deshabilitados: nada.
- Botones de icono: el icono crece y gira apenas (`scale(1.15) rotate(-10deg)`).
- Ítems del menú: fondo + el icono se acerca 2px.
- Enlaces: engrosan el subrayado (no cambian de color de golpe).
- Campos: el borde sube de tono al pasar; al enfocar, anillo del acento.
- Filas de tabla, ítems de la cola, gauges y tarjetas del tubo: fondo o elevación con transición.
- `cursor: pointer` en selects y en todo lo que actúe.

### 3.6.4 Acabados incluidos siempre

`tabular-nums` en `th/td/.tnum`, `::selection` teñida con el acento, scrollbars tematizadas, `:focus-visible` con anillo del acento (blanco sobre la barra).

## 3.7 Marca

- La marca es el **trío del semáforo ● ▲ ■** (verde, amarillo, rojo, siempre en ese orden) — componente `MarcaSemaforo`. No es decoración: son los tres símbolos de estado del sistema (legibles sin color), usados como identidad en sidebar y login.
- **Sobre la barra heráldica y el panel del login el trío va en un solo tono** (`MarcaSemaforo mono`, `currentColor`): las tres formas siguen distinguiéndose —esa es la gracia— y el color de estado no entra en una zona de identidad (ADR-011).
- Wordmark **"SGR"** en Libre Franklin 800 con tracking -0.02em. Es el nombre del producto; "Matriz SGR" es la planilla del cliente que se reemplaza. Debajo, "Sistema de Gestión de Resultados" o el nombre de la organización.
- **La frase del producto** (§10.4.bis): *«Lo que se atiende, se registra; lo que se registra, avanza.»* Vive bajo la marca en el login y es el hilo de los microtextos. Una sola.
- **Sin escudo municipal** (§10.5.5): el login declara que es un ejercicio académico con datos ficticios, con paleta y tipografía según la norma y sin el escudo.

---

## 4. Espaciado, bordes y sombras

### Espaciado
- Escala única: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px**. Ningún valor fuera de escala.
- Padding interno de tarjeta: 16px (compacta) o 24px (dashboard).
- Gap entre tarjetas de un grid: 16px. Gap entre secciones: 32px.

### Radios de borde
| Elemento | Radio |
|---|---|
| Tarjetas, paneles, modales | **8px** |
| Botones, inputs, selects | **4px** |
| Chips de estado, badges | **4px** |
| Tarjeta kanban | **6px** |

- **PROHIBIDO** anidar elementos redondeados con el mismo radio (tarjeta 8px dentro de tarjeta 8px). El contenedor interno usa radio menor (4–6px) o ninguno.
- Máximo **dos niveles** de superficie anidada. Un tercer nivel se resuelve con borde o fondo `--fondo`, no con otra tarjeta.

### Sombras
| Token | Valor | Uso |
|---|---|---|
| `--sombra-1` | `0 1px 2px rgba(26,29,31,.08)` | Tarjetas en reposo |
| `--sombra-2` | `0 4px 12px rgba(26,29,31,.12)` | Tarjeta kanban al arrastrar, dropdowns |
| `--sombra-3` | `0 12px 32px rgba(26,29,31,.18)` | Modales |

- Nada de sombras de colores, glow, ni `blur > 32px`.

---

## 5. Componentes clave

### Tarjeta kanban (tubo de trabajo)
- Superficie blanca, radio 6px, borde 1px `--borde`, sombra-1.
- Franja izquierda de 3px con el color de la **categoría de gestión** (no del estado; el estado lo da la columna).
- Contenido: título (Public Sans 600, 14px), chip de categoría, fecha compromiso (roja si vencida), avatar/iniciales del responsable.
- Al arrastrar: sombra-2, rotación 2°, cursor `grabbing`. Placeholder de destino con borde discontinuo `--borde-fuerte`.

### Chip de semáforo
- Fondo pálido + texto fuerte del par de estado + símbolo (● verde, ▲ amarillo, ■ rojo) + porcentaje.
- Radio 4px, padding 2px 8px, Public Sans 600, 12px, `tabular-nums`.

### Gauges (ECharts)
- Arco de 200° (no círculo completo), aguja fina, sin brillo ni sombras internas de ECharts.
- Bandas del arco con los pares de estado pálidos; valor central en Space Grotesk 700.

### Tablas
- Encabezado: fondo `--fondo`, Public Sans 600 12px mayúsculas con `letter-spacing: 0.04em`.
- Filas con borde inferior 1px `--borde`, sin cebra. Hover: fondo `#FAFAF9`.
- Números alineados a la derecha con `tabular-nums`.

### Botones
- Primario: fondo `--acento`, texto blanco, radio 4px, padding 8px 16px, sin sombra.
- Secundario: borde 1px `--borde-fuerte`, texto `--tinta`, fondo transparente.
- Peligro: solo para acciones destructivas, usa `--estado-rojo`.
- Nada de botones con gradiente, glow o icono decorativo.

### Iconografía
- Set único: **Lucide** (stroke 1.5px), tamaño 16 o 20px, color `--tinta-2`.
- Cada icono debe tener función (acción, estado, navegación). **PROHIBIDO**: sparkles ✨, iconos de relleno junto a títulos, emojis en UI.

---

## 6. Layout

- Navegación lateral fija de 240px sobre el **rojo heráldico** (`--barra-fondo`): es el campo de identidad del sistema y lo único que lleva el rojo institucional como fondo amplio. Texto en `--barra-texto` / `--barra-texto-2`; ítem activo con `--barra-activo-bg` **y** filo izquierdo de 3px en blanco (nunca solo color), sin píldoras redondeadas; anillo de foco en blanco (el del acento sería invisible sobre rojo). En móvil pasa a cabecera y conserva el heráldico; el botón de colapso se oculta (a 390px empujaba el cierre de sesión fuera de la barra).
- Contenido con `max-width: 1440px`, padding lateral 24px.
- Dashboard en grid de 12 columnas: KPIs arriba (4 tarjetas), heatmap + gauges al medio, tabla de detalle abajo.
- Responsive: kanban con scroll horizontal por columna en móvil; dnd-kit con pointer events (funciona táctil).

## 7. Estados vacíos, carga y error

- Vacío: texto en `--tinta-2` + acción primaria. Sin ilustraciones decorativas.
- **El vacío explica POR QUÉ está vacío y ofrece lo que sí corresponde a ese rol.** Ejemplo real: el verificador no tiene delegación asignada, así que el tubo le muestra "el libro de cada delegación es privado, tu rol trabaja a nivel central" y un enlace a su bandeja — no un tablero en blanco.
- **Ningún esqueleto perpetuo**: toda pantalla debe resolver su estado de carga aunque la respuesta venga vacía o el rol no tenga datos. Un skeleton que nunca termina se lee como una aplicación rota, y así se vio el tubo para el verificador hasta que se corrigió.
- Carga: skeletons grises (`#ECECEA`) con la geometría real del contenido. Sin spinners de página completa.
- Error de sincronización (revert de actualización optimista): toast superior con fondo `--estado-rojo-bg`, texto `--estado-rojo`, 5s.

---

## 8. Lista negra (test rápido de "AI slop")

Un PR **se rechaza** si aparece cualquiera de estos:

1. Fuente Inter (o dejar la default de un UI kit).
2. Gradiente morado-azul, o beige/crema + naranja, o cualquier gradiente de fondo.
3. Tarjeta redondeada dentro de tarjeta redondeada con el mismo radio.
4. Iconos o emojis decorativos sin función (sparkle, cohetes, "✨ AI").
5. Componente de librería sin personalizar (test: si se ve igual que la demo de la librería, falla).
6. Sombras de color, glassmorphism, blur decorativo.
7. Estado comunicado solo con color, sin texto ni símbolo.
8. Valores de espaciado/radio fuera de las escalas definidas aquí.
9. Animación **en una zona de datos** sin significado de estado (pulsos en cosas no críticas, parallax, entrada aparatosa de páginas); ambiente que ocupe el fondo de un texto o de una tabla; loops con períodos iguales o múltiplos entre sí; o cualquier animación sin su apagado en `prefers-reduced-motion` (§3.6). El ambiente vive en las zonas de identidad y solo ahí.
10. Colores fuera de tokens (hex sueltos en componentes) o una regla de tema oscuro escrita a mano en un componente. **Lo comprueba `npm run verificar:contraste`**: un hex fuera de `tokens.css` hace fallar la verificación.
11. **Rojo institucional dentro de una zona de datos** (ADR-011): `--marca` o `--acento` pintando una fila, un chip, una serie de gráfico, una celda del heatmap o una tarjeta del tubo. Ahí lo seleccionado es `--seleccion` y el único rojo es `--estado-rojo`.

## 8.1 Accesibilidad — normativo (RNF-012)

El PDF de los profesores la exige: *"navegación por teclado, contraste suficiente, textos alternativos y criterios de accesibilidad institucional vigentes"*. No es opcional ni "fase 2".

1. **Teclado**: toda acción alcanzable con `Tab`/`Shift+Tab` en orden lógico y ejecutable con `Enter`/`Espacio`. El foco **siempre visible** (`:focus-visible` con anillo del acento, ya en `base.css`). Ningún `outline: none` sin reemplazo.
2. **El drag & drop necesita alternativa por teclado**: dnd-kit trae `KeyboardSensor`; hay que activarlo y anunciar los movimientos. Un tablero que solo funciona con mouse incumple el requisito.
3. **Contraste**: texto normal ≥ 4.5:1, texto grande y marcas gráficas ≥ 3:1, verificado con script (no a ojo): `npm run verificar:contraste` (frontend) comprueba 83 pares en los dos temas y corre antes de cada merge. Los tokens `--estado-*-texto` existen exactamente para esto: **las marcas usan `--estado-*`, el texto usa `--estado-*-texto`**. El script encontró tres textos que usaban la marca como texto y no llegaban a 4.5:1 (toast, aviso de solo lectura del tubo, rojo de estado en oscuro).
4. **Nunca solo color**: todo estado lleva símbolo (●▲■) o texto además del color. Aplica a semáforos, chips, celdas del heatmap y filas de tabla.
5. **Textos alternativos**: `alt` descriptivo en toda imagen con contenido (evidencias fotográficas incluidas); `aria-label` en botones de solo icono; los gráficos ECharts van acompañados de su **tabla equivalente**.
6. **Formularios**: `<label>` asociado a cada campo, campos obligatorios marcados en el texto (no solo con color), errores anunciados con `role="alert"` y descritos junto al campo que los origina.
7. **Movimiento**: respetar `prefers-reduced-motion` (ya implementado). Ninguna información depende de una animación.
8. **Compatibilidad (RNF-013)**: probar en **Chrome y Edge**, escritorio y móvil, antes de cada entrega. `node scripts/capturas.mjs [carpeta] [--movil] [--solo=login,ficha]` (frontend) captura cada pantalla con las seis cuentas en los dos temas usando el Edge instalado; a 390px una captura más ancha que 390 es un desborde horizontal, y así se encontraron tres.

## 8.2 Pantallas pendientes — criterios de diseño

Estas reglas se fijaron **antes** de construir las pantallas, para que no hubiera deriva. Todas heredan los tokens, la escala y la lista negra de este documento.

**Estado**: ✅ ficha personal (`frontend/src/pages/FichaPage.tsx`) · ✅ bandeja del verificador (`frontend/src/pages/BandejaPage.tsx`) · ✅ configuración de metas (`frontend/src/pages/MetasPage.tsx`), las tres del 01-09-2026 · ⬜ ficha del vecino · ⬜ configuración de parámetros.

### Contexto que manda sobre la estética

El cliente fue explícito: *"tenemos un montón de usuarios que no manejan planilla"* y *"mientras más fácil mejor"*. **La usabilidad es requisito (RNF-011), no preferencia.** Ante la duda entre elegante y obvio, gana obvio.

### Ficha personal (RF-008) — la pantalla más importante ✅ construida

Es la "pestaña personal" de la planilla: donde cada funcionario ve su medición y registra su trabajo. Estructura en tres bloques verticales:

1. **Cabecera de identidad**: nombre, cargo, delegación y período, más el semáforo personal con su chip ●▲■ y el objetivo al día. Una sola cifra hero (§Marcas), nunca cuatro compitiendo.
2. **Tabla de ítems**: ítem · ponderador · meta · avance · % cumplimiento · ponderado. Números con `tabular-nums`, alineados a la derecha. La fila de total se separa con borde superior de 2px, no con color de fondo. Los ítems **inversos** (menor es mejor) llevan una marca textual explícita — nunca se distinguen solo por comportamiento.
3. **Registro de actividades**: la tabla densa del día a día. Fila nueva siempre visible arriba, sin abrir modal para lo frecuente.

### Formularios de registro (RF-009, RF-010)

- **Campos obligatorios marcados en el texto** (`*` más `aria-required`), nunca solo con color.
- **El RUT se valida al salir del campo**, no al enviar: mensaje inmediato y específico ("dígito verificador no corresponde"), y se **formatea solo al mostrar** (`17.721.947-9`) mientras se guarda canónico.
- Los errores viven **junto al campo** que los origina, con `role="alert"`, no en un resumen arriba.
- Los desplegables salen de `CatalogoItem` y muestran **solo los vigentes** (RF-004): un catálogo desactivado no aparece en registros nuevos pero sigue legible en los antiguos.

### Evidencias y galería (RF-012, HU-09)

- **Subir debe costar un toque desde el teléfono.** Botón grande, cámara directa, sin pasos intermedios.
- El **código verificador se muestra siempre** junto a la foto (es lo que la gente busca), en fuente de cuerpo con `tabular-nums`.
- Galería en grilla con `object-fit: cover`, radio 6px, y `alt` descriptivo con el código y la actividad (RNF-012).
- Estado de validación con el par color+símbolo de siempre: aprobada ●, pendiente ▲, rechazada ■. **Nunca solo color.**
- Peso y formato permitidos se declaran **antes** de elegir archivo, no en el error (RNF-017).

### Bandeja del verificador (RF-013, HU-11) ✅ construida

- Lista de trabajo, no tablero: prioriza lo pendiente y **muestra la foto grande** — la decisión se toma mirando la imagen.
- Tres acciones explícitas y equidistantes: **Aprobar · Solicitar corrección · Rechazar**. Rechazar usa `--estado-rojo`; las tres exigen observación cuando no son aprobación.
- Debe funcionar **con teclado**: `J`/`K` para navegar y `Enter` para aprobar, con las teclas visibles en pantalla.

### Configuración de metas por funcionario (RF-006, RF-007, HU-05) ✅ construida

Es la pantalla donde alguien decide **qué se le mide a una persona y con qué peso**. Todo lo que se calcula después —el semáforo, la ficha, el dashboard— cuelga de lo que se escriba aquí, así que un error mudo en esta pantalla contamina el sistema entero. API: `/metas-item` (contrato en [docs/estado-proyecto.md](docs/estado-proyecto.md)).

1. **La suma es el protagonista, no un mensaje de error.** RN-001 exige 100%. Un totalizador **siempre visible** (cifra + barra) acompaña la edición y dice en todo momento en qué estado está: `100% ✓ cuadrado` · `falta 15%` · `se pasa por 8%`. Descubrir el desajuste recién al guardar es exactamente el fallo de la planilla que venimos a reemplazar.
2. **Los ítems los propone el cargo; no se escriben ni se buscan.** Al elegir funcionario se cargan **todos los ítems activos de su cargo** (`GET /cargos`), cada uno como una fila lista para recibir meta y peso. Un ítem sin meta se muestra igual, marcado como "sin configurar", porque **un ítem invisible es un ítem que nadie recuerda repartir**.
3. **Se guarda el conjunto, no fila por fila.** Configurar es una sesión: se ajusta todo y se guarda cuadrado con un `PUT`. Guardar de a una dejaría estados intermedios inválidos en la base y obligaría a la persona a pelear con la regla en cada tecla.
4. **Reparto en partes iguales a un clic.** Es la acción más frecuente y la más odiada a mano. Deja el redondeo cuadrado en el último ítem — nunca 99,99%.
5. **La persona piensa en porcentajes; la API recibe fracciones.** La UI muestra y pide `25`, la API recibe `0.25`. La conversión vive en un solo lugar, nunca repartida por los componentes.
6. **Lo que ya sumó puntaje no se puede quitar** (RN-009, CA-01): esos ítems se marcan con su razón visible y su acción de quitar **desactivada con explicación**, no habilitada para que el servidor la rechace después. Un botón que siempre falla es peor que un botón ausente.
7. **Período cerrado = solo lectura**, con el motivo escrito (RN-013) y el camino que sí corresponde: configurar el período siguiente.
8. **Rol**: editan los roles `admin` y `supervisor` (el que el municipio llama "coordinador"). Quien llegue por URL sin permiso ve la pantalla **en lectura con el aviso de por qué** (mismo patrón que la bandeja) — nunca una página en blanco ni un 403 crudo. Probar con los seis roles antes de darla por buena; la tabla de cuentas está en [docs/estado-proyecto.md](docs/estado-proyecto.md).
9. **Conflicto (CA-08)**: si otra persona reconfiguró a ese funcionario mientras tanto, aviso explícito con lo vigente y la opción de recargar. Nunca sobrescritura silenciosa.
10. **Accesibilidad (§8.1)**: cada campo numérico con su `<label>` (el nombre del ítem), `inputMode="decimal"`, cifras con `tabular-nums`, el estado de la suma anunciado con `role="status"` —no `alert`, que interrumpiría en cada tecla— y el error de guardado con `role="alert"` junto al botón.

**Lo que cambió al construirla** (el criterio 8 no bastaba): el selector de funcionario no puede ofrecer a **todo** el directorio. El libro es privado por delegación, así que ofrecer a alguien de otra delegación termina en un 404 al cargar y en un error que la persona no provocó — el mismo fallo que dejó el tubo cargando para siempre para el verificador. **El selector ofrece solo lo que ese rol puede consultar**, y cuando eso es nada (verificador, usuario de consulta) la pantalla lo dice y enlaza a lo que sí les toca. Queda cubierto por la verificación *"lo que el selector ofrece a cada rol es exactamente lo que ese rol puede consultar"*.

**Regla que se generaliza**: *un selector que ofrece opciones que el servidor va a rechazar es un error de diseño, no de permisos.* Antes de poblar cualquier lista de elección, filtrarla por el mismo alcance que aplica el backend.

**Lo que encontró mirarla con las seis cuentas** (y ninguna prueba de API podía ver):

1. **Una pantalla nueva no puede ser más permisiva que las que ya existen.** Un funcionario veía las metas de sus pares, cuando `/ficha` ya se lo impedía. Antes de definir quién ve qué, mirar qué decidió la pantalla equivalente: la incoherencia entre dos pantallas confunde más que una restricción de más.
2. **Una nota que se repite en cada fila es ruido, no ayuda.** La explicación va una sola vez sobre la tabla; en la fila queda una marca corta. Y el texto cambia según se pueda editar o no: decirle "puedes ajustar" a quien está en modo lectura es peor que no decir nada.
3. **Un bloque de texto corrido no debe ser `flex`.** Cada `<strong>` se vuelve un ítem con su `gap` y aparecen huecos delante de la puntuación. `flex` es para disponer cajas, no para párrafos.

### Ficha del vecino y trazabilidad (ADR-008, ADR-012, CA-04) — ✅ construida (Bloque B3, 03-09-2026)

`frontend/src/pages/VecinosPage.tsx` + `vecinos.css`. Los tres criterios que esta sección fijó antes de construirla se cumplieron, y la construcción agregó tres más.

- **Buscador por RUT arriba, con resultado inmediato.** Busca 250 ms después de dejar de teclear —ni por letra, que es ruido, ni al presionar Enter, que es fricción— y desde 3 caracteres. El RUT se reconoce por su dígito verificador, así que da igual cómo se escriba. Un único resultado se abre solo.
- **Historial cruzando delegaciones** en línea de tiempo vertical, con la delegación de cada atención en un chip.
- **Aviso ámbar con texto explícito** arriba de todo el detalle —si va debajo, quien revisa ya decidió antes de leerlo—. Dice el tipo, las delegaciones y los días de diferencia, y termina diciendo que **informa, no bloquea**, y que la ventana es un valor provisional mientras no llegue la respuesta del docente.

Lo que la construcción agregó:

- **El aviso marca hechos, no delegaciones.** Marcar por delegación pintaba 21 de 35 hitos: una señal que cubre media pantalla se lee como fondo. El backend devuelve las claves de los hechos implicados y solo esos llevan la banda ámbar (banda lateral, no marco entero).
- **Lo reservado se dice.** Para `gerente` y `usuario`, una atención de otra delegación muestra fecha, delegación, tipo y estado con la etiqueta «Detalle reservado» y a quién consultar; arriba, una línea cuenta cuántas son y por qué (ADR-012). Una fila muda se lee como un error del sistema; una fila que dice por qué está reservada se lee como una regla.
- **El perfil sin acceso ve el motivo, no una pantalla en blanco.** El `verificador` y el rol `consulta` reciben la explicación legal y el camino que sí les corresponde (el dashboard), y no tienen la entrada en el menú.

Zona de datos, con todo lo que eso implica (§3.3): ni `--acento` ni `--marca` entran; lo seleccionado es `--seleccion`/`--seleccion-bg` y el ámbar es `--estado-amarillo`, que es estado, no identidad. Verificado con `npm run verificar:contraste` (83/83) y con las seis cuentas en los dos temas, escritorio y 390px (`scripts/capturas.mjs --solo=vecinos`).

### Configuración de parámetros (RF-038)

- Los parámetros con `confirmado: false` se muestran con un **aviso visible** de que esperan definición del docente. No se presentan como definitivos.
- Todo cambio indica desde qué período rige y advierte que no altera períodos cerrados.

## 10. Identidad municipal y dirección visual — NORMATIVO, ejecutado el 2 de septiembre de 2026

**Decisión del equipo (1 de septiembre de 2026)**: la norma gráfica de la Municipalidad de La Serena **manda sí o sí**. Dentro de ella, el diseño es nuestro y ahí está el desafío: que sea innovador, moderno, muy amigable, reactivo y animado donde el movimiento signifique algo. *Cumplir la norma es el piso, no el techo.*

✅ **Implementado en el Bloque D0** (commit `d6e6dbf`, etiqueta `v0.8.0-identidad-la-serena`): tokens en los dos temas, barra lateral heráldica, login en dos paneles con el Faro Monumental en SVG, tipografía nueva, frase del producto, y dos scripts que lo verifican (§10.7). Las tres decisiones de identidad se tomaron con el equipo el 2 de septiembre: **Libre Franklin + General Sans**, **faro y costa en SVG duotono** (había otras tres direcciones: haz abstracto, patrón de campanarios, solo color) y la frase **«Lo que se atiende, se registra; lo que se registra, avanza»**.

### 10.1 La fuente: qué exige el manual

Documento oficial: **«Normas Gráficas La Serena 2019 — Reglamento y Manual»**, Departamento de Comunicaciones Estratégicas ([laserena.cl/documentos/docs/REGLAMENTO_normas_graficas_2019.pdf](https://laserena.cl/documentos/docs/REGLAMENTO_normas_graficas_2019.pdf)). Valores extraídos del documento, no estimados a ojo:

| Color | Hex | Papel en el manual |
|---|---|---|
| Rojo luminoso | `#DB0032` | **Color corporativo principal.** Fuerza, valor, determinación |
| Rojo heráldico | `#8A0007` | Profundidad y conexión histórica |
| Rojo oscuro | `#971A3A` | Variante para fondos amplios |
| Negro profundo | `#1A1A1A` | Sobriedad, respeto, formalidad |
| Gris oscuro | — | Neutro complementario |

- **Tipografía**: *«Como fuente tipográfica para la elaboración de documentos internos, se solicita el uso del tipo Arial»*. El logotipo usa una fuente de palo seco con dos tamaños en el conjunto.
- **Escudo**: es el único elemento definitivo de identificación y su aplicación debe ser invariable (Artículo 1). Tiene versión a una tinta, positivo y negativo. **Área de autonomía: 10X.** Es *«un castillo que hace de jefe en un campo con torreones arrojando llamas»*.
- **Artículo 3**: las aplicaciones de mayor complejidad que usen la imagen institucional **deben canalizarse por el Departamento de Comunicaciones Estratégicas**, que da el visto bueno.

**Los cinco valores que el propio manual declara** — y que son el vocabulario legítimo de la dirección visual, en vez de inventar uno:

**Histórica** (468 años, segunda ciudad más antigua de Chile) · **Tradicional** (condición de Ilustre) · **Patrimonial** (Casco Histórico colonial) · **Turística** (atractivos naturales y arquitectónicos) · **Calidad de vida** (paisajes, tranquilidad).

### 10.2 Qué cambió en los tokens — hecho

| Token | Antes | Ahora |
|---|---|---|
| `--acento` | `#153B50` petróleo | `#DB0032` rojo institucional (`#FF4D6D` en oscuro) |
| `--acento-hover` | `#0E2A3A` | `#8A0007` heráldico |
| `--btn-bg` | petróleo | rojo institucional en los dos temas |
| `--font-titulo` | Space Grotesk | **Libre Franklin** (ADR-010) |
| `--font-cuerpo` | General Sans | General Sans; nace `--font-documento` = Arial para lo impreso y exportado |
| `--estado-*` | verde / naranjo / rojo | **sin cambio** |
| nuevos | — | `--marca`, `--marca-profundo`, `--marca-oscuro`, `--seleccion(-bg)`, `--barra-*`, `--cat-1..6`, `--texto-sobre-estado`; `--tubo-*` pasa a neutros |

**El conflicto de los dos rojos se resolvió en ADR-011** sin tocar el semáforo: separación por rol, zona y forma (detalle en §3.3). El último recurso que esta sección preveía —bajar la saturación del estado— no hizo falta.

### 10.3 La tipografía — resuelta en ADR-010

El manual exige Arial **para documentos internos** y no dice nada de aplicaciones web. Decisión: Arial (con Liberation Sans / Helvetica como equivalentes métricos) en todo lo que se imprime o exporta, donde la norma aplica literalmente; en pantalla, Libre Franklin para títulos y cifras y General Sans para cuerpo y tablas. Detalle y justificación en §2 y en [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md).

### 10.4 La dirección creativa

El punto de partida es la propuesta del equipo: **un login con la costa de La Serena y el Faro Monumental en transparencia**. Es buena porque no es decorativa: el faro es lo que la gente de la ciudad reconoce al instante, y un faro *orienta* — que es exactamente lo que hace el sistema con el trabajo de las delegaciones.

Ideas que están dentro de los cinco valores del manual:

- **Login** ✅ construido (`frontend/src/pages/LoginPage.tsx`, `login.css`, `components/FaroSerena.tsx`): dos paneles. A la izquierda el heráldico con la marca, la frase del producto y el **Faro Monumental sobre la costa dibujado en SVG** —muralla almenada, torre, galería, linterna, mar en `--marca-oscuro` y espuma en blanco— en duotono de dos tintas; a la derecha el formulario sobre superficie sólida. No hay ningún asset de imagen en el repositorio: el faro es vectorial, pesa lo que pesa su archivo, no tiene licencia que pedir y no entra en la ruta crítica. **El haz del faro barre solo mientras el sistema autentica** (`activo={cargando}`): el movimiento significa estado, no decora, y se apaga con `prefers-reduced-motion`. En móvil el panel pasa arriba, compacto, y conserva el faro.
- **La Serena en la barra** ✅ (`components/SiluetaSerena.tsx`): no solo campanarios —el equipo lo pidió explícito—: San Francisco, el jarro pato y la greca diaguita (la cultura de los pueblos originarios del valle), la cúpula de La Recova, El Miliciano, el papayo y el faro, con los cerros y la camanchaca. La greca diaguita queda disponible como patrón para estados vacíos y cabeceras.
- **Movimiento con sentido en los datos, vida en la identidad** (§3.6): el semáforo late cuando algo está crítico, la cifra hero llega contando, la tarjeta del tubo acompaña el arrastre; y en el login y la barra el faro gira, las olas avanzan y la camanchaca pasa, a ritmos que no riman.
- **Amabilidad**: el cliente fue explícito — *«tenemos un montón de usuarios que no manejan planilla»*, *«mientras más fácil mejor»*. Ante la duda entre elegante y obvio, gana obvio (§8.2).

### 10.4.bis La voz del producto: una frase que ordene el relato

Las palabras son material de diseño. El sistema necesita **una frase corta y propia** que explique de qué se trata antes que cualquier pantalla, y que sirva de hilo en el login, en los estados vacíos y en la presentación al docente.

El equipo propuso el ejemplo *"ordenar para avanzar, medir para decidir"* — **no para usarla literal**, sino para fijar el registro: dos verbos, ritmo binario, y el beneficio al final. Ese es el tono a buscar.

Qué hace que una frase funcione aquí:

- **Nombra el trabajo real, no el software.** Estas personas atienden vecinos; el sistema solo deja constancia de eso. Una frase sobre "gestión integral de indicadores" habla del producto y no de ellos.
- **Sale del vocabulario del caso**: registrar, validar, avanzar, acompañar, decidir. El cliente habló de *acompañar* a los equipos, no de controlarlos, y esa diferencia debería oírse.
- **Cabe en el login sin explicación** y no envejece cuando cambie el alcance.
- **Una sola.** Dos frases compitiendo no son identidad, son ruido.

Dónde se usa, si se adopta: bajo la marca en el login, y como hilo de los microtextos ya existentes —los vacíos que explican su causa, los avisos de rol— para que suenen a un mismo producto y no a mensajes sueltos escritos en momentos distintos.

⚠ **Lo que no es**: un eslogan decorativo repetido en cada cabecera, ni una frase motivacional. Si no ayuda a entender qué hace el sistema, sobra.

✅ **Adoptada (2 de septiembre de 2026)**: **«Lo que se atiende, se registra; lo que se registra, avanza.»** Se eligió entre tres candidatas porque nombra el trabajo real desde la primera palabra —estas personas atienden vecinos— y encadena las tres etapas del sistema. Las descartadas: «Registrar para acompañar, medir para decidir» (más cerca del ejemplo, pero habla del sistema) y «El trabajo del territorio, a la vista de quien lo hace» (la más defendible ante la Ley 19.628, pero rompe el ritmo de dos verbos). Vive en el login; los microtextos nuevos deben sonar a ella.

### 10.5 Los límites que la dirección no puede cruzar

Aquí es donde un rediseño ambicioso se rompe. Ninguno de estos puntos es negociable:

1. **Contraste antes que atmósfera.** Ninguna imagen de fondo puede bajar el texto de 4.5:1. Si el faro compromete la lectura, el faro se atenúa; nunca al revés.
2. **El semáforo no se toca.** Es el dato que el cliente vino a buscar, y la norma municipal no dice nada sobre colores de estado.
3. **`prefers-reduced-motion` se respeta siempre** (ya implementado en `base.css`). Toda animación nueva entra con su apagado.
4. **Peso**: la ficha personal se abre desde un teléfono en terreno. Una fotografía de fondo no puede costar segundos de carga; imagen optimizada, y nunca en la ruta crítica.
5. **El escudo no se usa sin autorización.** Nuestro proyecto es académico y no está aprobado por el municipio. Se aplican paleta y tipografía —que demuestran que conocemos la norma— y se presenta con identidad propia del proyecto, indicando que es un ejercicio con datos ficticios. Si el docente pide el escudo, se consulta: el propio Artículo 3 exige el visto bueno del Departamento de Comunicaciones Estratégicas.
6. **Los dos temas se diseñan.** El tema oscuro existe y el rojo institucional necesita su variante para no vibrar sobre fondo oscuro.
7. **Cada pantalla se prueba con los seis roles** después del rediseño, no solo con el propio.

### 10.6 Alcance del rediseño — cubierto

Cinco pantallas y el login: `/login`, `/` (tubo), `/ficha`, `/verificacion`, `/metas`, `/dashboard`. Más `tokens.css`, `base.css` y los gráficos de ECharts, que leen los tokens vivos: cambiaron solos, salvo el radar, que pintaba su serie con `--acento` y pasó a un neutro (regla 11). Las cinco pantallas se miraron con las seis cuentas, en los dos temas y en móvil (62 + 48 capturas).

Lo que las capturas encontraron y no habría visto ninguna prueba de API: la marca ●▲■ seguía en color sobre la barra (perdía por especificidad); en la bandeja «Aprobar» sólido y «Rechazar» con relleno pálido competían (el peligro pasó a contorno); y **tres desbordes horizontales a 390px** que ya existían: el `<input type="file">` con `.sr-only` (`position: absolute`) escapaba de la envoltura con scroll de la tabla y ensanchaba la página a 663px, los selectores con la opción «Nombre — Cargo (Delegación)» y la barra móvil con el botón de colapso.

### 10.7 Cómo se verifica

| Comando (en `frontend/`) | Qué comprueba |
|---|---|
| `npm run verificar:contraste` | 83 pares texto/fondo de los dos temas contra WCAG AA (4.5:1 texto, 3:1 marcas), rampa del tubo monótona y distinguible, ΔE ≥ 15 entre `--acento` y `--estado-rojo`, fila seleccionada distinta de fila crítica, y ningún hex fuera de `tokens.css`. Lee `tokens.css`, así que cualquier cambio de token pasa por aquí |
| `node scripts/capturas.mjs [carpeta] [--movil] [--solo=…]` | Cada pantalla con las seis cuentas, en los dos temas, con el Edge instalado (`playwright-core`, sin descarga). Requiere backend y frontend corriendo |

Ambos son parte de la definición de terminado de cualquier cambio visual.

## 11. Referencias de estilo (dirección, no copia)

- Linear (linear.app): densidad y sobriedad cromática.
- Datadog / Grafana: dashboards donde el color solo codifica estado.
- gov.uk Design System: tipografía funcional y accesibilidad en contexto público.
- IBM Carbon: uso de IBM Plex y tablas densas bien resueltas.
