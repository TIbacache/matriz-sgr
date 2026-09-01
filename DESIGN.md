# DESIGN.md — Especificación visual Matriz SGR

**Versión**: 1.3 · **Fecha**: 1 de septiembre de 2026
**Regla de oro**: este archivo es normativo. Si un componente no cumple lo que dice aquí, está mal aunque "se vea bien".
**v1.2**: §8.1 Accesibilidad como norma obligatoria (RNF-012 y RNF-013 del PDF).
**v1.3**: §8.2 con los criterios de las pantallas pendientes (ficha personal, formularios, evidencias, bandeja del verificador, ficha del vecino, parámetros), fijados antes de construirlas.
**v1.1**: cuerpo pasa a General Sans; se agregan tema oscuro, sistema de movimiento y marca ●▲■ (receta portada de la app de referencia ebus-test, adaptada a CSS3 puro). La implementación viva de los tokens es `frontend/src/styles/tokens.css`.

---

## 1. Identidad central

La identidad visual del sistema se construye alrededor del **semáforo de cumplimiento** (rojo/amarillo/verde). No es un adorno: es el lenguaje principal de la interfaz. Todo lo demás (fondos, tipografía, bordes) es deliberadamente sobrio para que el color de estado sea lo único que grita.

Principio: **la interfaz es un tablero de control municipal, no un SaaS genérico**. Densidad de información alta, cromática funcional, cero decoración.

---

## 2. Tipografía

| Uso | Fuente | Fallback | Pesos |
|---|---|---|---|
| Títulos (h1–h3), cifras grandes de KPI | **Space Grotesk** | `system-ui, sans-serif` | 500, 700 |
| Cuerpo, tablas, formularios, etiquetas | **General Sans** (Fontshare, gratis) | `Public Sans, system-ui` | 400, 500, 600 |
| Datos tabulares/numéricos alineados | **General Sans** con `font-variant-numeric: tabular-nums` (aplicado global a `th, td, .tnum`) | — | 400, 600 |

- **PROHIBIDO usar Inter** en cualquier parte.
- El par Space Grotesk (display) + General Sans (cuerpo) es deliberado: General Sans sola es el look de la referencia; el par lo hace propio.
- Carga: Space Grotesk vía Google Fonts, General Sans vía Fontshare CDN, ambas con `font-display: swap`. En producción (Fase 5) evaluar auto-hospedar los woff2.
- Escala tipográfica (base 16px): `12 / 14 / 16 / 20 / 25 / 31 / 39` (ratio ~1.25).
- Line-height: 1.2 en títulos, 1.5 en cuerpo, 1.35 en celdas de tabla.
- Cifras de KPI: Space Grotesk 700, tamaño 39–48px, `tabular-nums`.

---

## 3. Paleta

⚠ **Esta sección queda subordinada a §10.** La identidad gráfica de la Municipalidad de La Serena es normativa y su rojo institucional reemplaza al acento petróleo de §3.3. Los **colores de estado de §3.1 se conservan sin cambio**: no son identidad, son dato. Mientras el rediseño de §10 no se ejecute, lo que está en `tokens.css` sigue siendo lo implementado.

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

### 3.3 Acento

| Token | Hex | Uso |
|---|---|---|
| `--acento` | `#153B50` | Azul petróleo oscuro: navegación activa, enlaces, botón primario |
| `--acento-hover` | `#0E2A3A` | Hover del primario |

- Un solo acento. No es el "tech blue" `#3B82F6` de todo dashboard SaaS; es un petróleo profundo que no compite con el semáforo.
- **PROHIBIDO**: gradientes morado-azul, paletas beige/crema con acento naranja, cualquier gradiente como fondo de tarjeta o botón.

### 3.4 Paleta secuencial para heatmap (ECharts `visualMap`)

De menor a mayor gravedad: `#E3F2E8 → #FCF0D4 → #F5C16C → #E67E4E → #C0392B`.
(Verde pálido → amarillo → ámbar → rojo. Coherente con el semáforo; no usar viridis ni azules por defecto de ECharts.)

### 3.5 Tema oscuro

- Arquitectura de **dos capas**: `:root` define el tema claro completo; `[data-theme="oscuro"]` SOLO redefine lo que cambia. Ningún componente usa colores fuera de tokens, por lo que no existe ni una regla `dark:` en el código.
- Valores exactos en `frontend/src/styles/tokens.css` (fuente de verdad). Ideas clave: fondos carbón (no negro puro), acento petróleo se invierte a celeste `#9CC7DC` (por eso el botón primario tiene tokens propios `--btn-*`), estados suben luminosidad y sus fondos pálidos pasan a transparencias del color.
- **Sin parpadeo**: script inline en `index.html` aplica `data-theme` desde `localStorage` (clave `matriz.tema`) o `prefers-color-scheme` ANTES del primer paint. El toggle sincroniza entre pestañas vía evento `storage`.

## 3.6 Movimiento (el movimiento significa estado, no decora)

- **Una sola curva** para todo el sistema: `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-expo`). Duraciones: 150ms micro-hovers, 240ms entradas, 420ms paneles.
- **CSS primero**: la sensación de vida sale de keyframes CSS, no de JavaScript. Los cuatro del sistema (en `base.css`):
  1. `pulso-critico` — halo rojo expansivo (box-shadow, no dispara layout). **Solo** para estado crítico real: tareas vencidas, semáforo en rojo.
  2. `pulso-vivo` — halo verde del indicador de presencia (la señal de "sistema vivo").
  3. `entrada` — opacity + translateY(8px), en cascada con `animation-delay: i*50ms` inline.
  4. `brillo` — skeleton shimmer para estados de carga.
- Micro-interacciones: `.card--interactiva` y tarjetas kanban levantan 2px con sombra-2 al hover.
- La librería **Motion** se reserva para Fase 4 y solo para: counter-up de KPIs, colapsos de alto/ancho complejos y overlays con AnimatePresence. Todo lo demás, CSS.
- **Obligatorio**: bloque `@media (prefers-reduced-motion: reduce)` apagando todas las animaciones.
- Acabados incluidos siempre: `tabular-nums` en `th/td/.tnum`, `::selection` teñida con el acento, scrollbars tematizadas, `:focus-visible` con anillo del acento.

## 3.7 Marca

- La marca es el **trío del semáforo ● ▲ ■** (verde, amarillo, rojo, siempre en ese orden) — componente `MarcaSemaforo`. No es decoración: son los tres símbolos de estado del sistema (legibles sin color), usados como identidad en sidebar y login.
- Wordmark "Matriz SGR" en Space Grotesk 700 con tracking -0.01em.

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

- Navegación lateral fija de 240px, fondo `--superficie`, borde derecho 1px; ítem activo con fondo `#E8EEF1` y texto `--acento`, sin píldoras redondeadas.
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
9. Animación decorativa sin significado de estado (pulsos en cosas no críticas, parallax, entrada aparatosa de páginas), o cualquier animación sin su apagado en `prefers-reduced-motion`.
10. Colores fuera de tokens (hex sueltos en componentes) o una regla de tema oscuro escrita a mano en un componente.

## 8.1 Accesibilidad — normativo (RNF-012)

El PDF de los profesores la exige: *"navegación por teclado, contraste suficiente, textos alternativos y criterios de accesibilidad institucional vigentes"*. No es opcional ni "fase 2".

1. **Teclado**: toda acción alcanzable con `Tab`/`Shift+Tab` en orden lógico y ejecutable con `Enter`/`Espacio`. El foco **siempre visible** (`:focus-visible` con anillo del acento, ya en `base.css`). Ningún `outline: none` sin reemplazo.
2. **El drag & drop necesita alternativa por teclado**: dnd-kit trae `KeyboardSensor`; hay que activarlo y anunciar los movimientos. Un tablero que solo funciona con mouse incumple el requisito.
3. **Contraste**: texto normal ≥ 4.5:1, texto grande y marcas gráficas ≥ 3:1, verificado con script (no a ojo). Los tokens `--estado-*-texto` existen exactamente para esto: **las marcas usan `--estado-*`, el texto usa `--estado-*-texto`**.
4. **Nunca solo color**: todo estado lleva símbolo (●▲■) o texto además del color. Aplica a semáforos, chips, celdas del heatmap y filas de tabla.
5. **Textos alternativos**: `alt` descriptivo en toda imagen con contenido (evidencias fotográficas incluidas); `aria-label` en botones de solo icono; los gráficos ECharts van acompañados de su **tabla equivalente**.
6. **Formularios**: `<label>` asociado a cada campo, campos obligatorios marcados en el texto (no solo con color), errores anunciados con `role="alert"` y descritos junto al campo que los origina.
7. **Movimiento**: respetar `prefers-reduced-motion` (ya implementado). Ninguna información depende de una animación.
8. **Compatibilidad (RNF-013)**: probar en **Chrome y Edge**, escritorio y móvil, antes de cada entrega.

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

### Ficha del vecino y trazabilidad (ADR-008, CA-04)

- Buscador por RUT arriba, con resultado inmediato.
- **Historial cruzando delegaciones** en línea de tiempo vertical, indicando la delegación de cada atención.
- Cuando la misma persona tiene atenciones del mismo tipo en distintas delegaciones, se muestra un **aviso ámbar con texto explícito** (es el caso del regalo de Navidad). El aviso informa; no bloquea ni acusa.

### Configuración de parámetros (RF-038)

- Los parámetros con `confirmado: false` se muestran con un **aviso visible** de que esperan definición del docente. No se presentan como definitivos.
- Todo cambio indica desde qué período rige y advierte que no altera períodos cerrados.

## 10. Identidad municipal y dirección visual — NORMATIVO, pendiente de ejecutar

**Decisión del equipo (1 de septiembre de 2026)**: la norma gráfica de la Municipalidad de La Serena **manda sí o sí**. Dentro de ella, el diseño es nuestro y ahí está el desafío: que sea innovador, moderno, muy amigable, reactivo y animado donde el movimiento signifique algo. *Cumplir la norma es el piso, no el techo.*

⚠ **Esta sección todavía no está implementada.** El frontend actual usa el acento petróleo de §3.3. El rediseño es un bloque de trabajo propio y bloquea a los demás pendientes, porque tocar las pantallas después obligaría a rehacerlo.

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

### 10.2 Qué cambia en los tokens

| Token | Hoy | Pasa a |
|---|---|---|
| `--acento` | `#153B50` petróleo | `#DB0032` rojo institucional |
| `--acento-hover` | `#0E2A3A` | `#8A0007` heráldico |
| `--btn-bg` | petróleo | rojo institucional |
| `--font-titulo` | Space Grotesk | por resolver — ver 10.3 |
| `--font-cuerpo` | General Sans | Arial en documentos; en pantalla, ver 10.3 |
| `--estado-*` | verde / naranjo / rojo | **sin cambio** |

⚠ **El conflicto real que hay que resolver**: el rojo institucional `#DB0032` y el `--estado-rojo` `#C0392B` conviven en la misma pantalla. Si el rojo es a la vez la marca y la señal de alarma, el semáforo deja de leerse. **Regla**: el rojo institucional se reserva para estructura e identidad (barra superior, títulos de sección, foco, botón primario) y **nunca aparece dentro de una zona de datos**; la alarma del semáforo conserva su `#C0392B`, que es más apagado, siempre acompañada de su marca ■ y su texto. Si aun así compiten, se baja la saturación del estado antes que tocar la marca.

### 10.3 La tipografía: la decisión que falta

El manual exige Arial **para documentos internos**. No dice nada de aplicaciones web, y forzar Arial en pantalla nos deja un producto genérico, que es justo lo contrario del desafío.

**Propuesta a resolver en la sesión de diseño**: Arial (o su equivalente métrico, Liberation Sans / Helvetica) en todo documento e informe **exportado**, donde la norma aplica literalmente; y en pantalla un palo seco de la misma familia visual —humanista, sin contraste marcado, como pide el manual para el logotipo— que sea legible en tablas densas y en móvil. La decisión y su justificación se registran como ADR.

### 10.4 La dirección creativa

El punto de partida es la propuesta del equipo: **un login con la costa de La Serena y el Faro Monumental en transparencia**. Es buena porque no es decorativa: el faro es lo que la gente de la ciudad reconoce al instante, y un faro *orienta* — que es exactamente lo que hace el sistema con el trabajo de las delegaciones.

Ideas que están dentro de los cinco valores del manual:

- **Login**: fotografía o ilustración de la Avenida del Mar con el faro, tratada en duotono sobre el rojo institucional, con el formulario en una superficie sólida que garantice el contraste. La imagen ocupa el lado, no el fondo del formulario.
- **Ciudad de los campanarios**: la silueta de los campanarios da un patrón discreto para estados vacíos y cabeceras, en lugar de las ilustraciones genéricas de siempre.
- **Movimiento con sentido** (§3.6 ya lo fija): el semáforo late cuando algo está crítico, el avance se llena al validar, la tarjeta del tubo acompaña el arrastre. Nada se mueve porque sí.
- **Amabilidad**: el cliente fue explícito — *«tenemos un montón de usuarios que no manejan planilla»*, *«mientras más fácil mejor»*. Ante la duda entre elegante y obvio, gana obvio (§8.2).

### 10.5 Los límites que la dirección no puede cruzar

Aquí es donde un rediseño ambicioso se rompe. Ninguno de estos puntos es negociable:

1. **Contraste antes que atmósfera.** Ninguna imagen de fondo puede bajar el texto de 4.5:1. Si el faro compromete la lectura, el faro se atenúa; nunca al revés.
2. **El semáforo no se toca.** Es el dato que el cliente vino a buscar, y la norma municipal no dice nada sobre colores de estado.
3. **`prefers-reduced-motion` se respeta siempre** (ya implementado en `base.css`). Toda animación nueva entra con su apagado.
4. **Peso**: la ficha personal se abre desde un teléfono en terreno. Una fotografía de fondo no puede costar segundos de carga; imagen optimizada, y nunca en la ruta crítica.
5. **El escudo no se usa sin autorización.** Nuestro proyecto es académico y no está aprobado por el municipio. Se aplican paleta y tipografía —que demuestran que conocemos la norma— y se presenta con identidad propia del proyecto, indicando que es un ejercicio con datos ficticios. Si el docente pide el escudo, se consulta: el propio Artículo 3 exige el visto bueno del Departamento de Comunicaciones Estratégicas.
6. **Los dos temas se diseñan.** El tema oscuro existe y el rojo institucional necesita su variante para no vibrar sobre fondo oscuro.
7. **Cada pantalla se prueba con los seis roles** después del rediseño, no solo con el propio.

### 10.6 Alcance del rediseño

Cinco pantallas y el login: `/login`, `/` (tubo), `/ficha`, `/verificacion`, `/metas`, `/dashboard`. Más `tokens.css`, `base.css` y los gráficos de ECharts, que leen los tokens vivos y cambiarán solos si los tokens cambian bien.

**Por qué bloquea a los demás pendientes**: la ficha del vecino y las pantallas de administración se construirían con la identidad vieja y habría que rehacerlas. El Bloque C (dashboard sobre el motor v2) toca los mismos gráficos. Conviene cerrar el diseño primero.

## 11. Referencias de estilo (dirección, no copia)

- Linear (linear.app): densidad y sobriedad cromática.
- Datadog / Grafana: dashboards donde el color solo codifica estado.
- gov.uk Design System: tipografía funcional y accesibilidad en contexto público.
- IBM Carbon: uso de IBM Plex y tablas densas bien resueltas.
