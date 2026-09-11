# Convención de los diagramas de la entrega

Todos los `.puml` de esta carpeta siguen estas reglas. Se aplican también a los
artefactos que faltan: casos de uso, diagrama de clases y DER.

---

## 1. Idioma: todo en español, salvo los estereotipos

**Todo lo que se lee va en español de Chile**: títulos, nombres de actores,
enunciados de los requisitos, notas y leyendas. El sistema es para una
municipalidad chilena y el informe está en español.

**Los estereotipos se dejan en su nombre estándar de UML y SysML**, que es
inglés: `«requirement»`, `«refine»`, `«deriveReqt»`, `«satisfy»`, `«contains»`,
`«include»`, `«extend»`.

> **Por qué no se traducen.** No son texto: son **notación**. Es la misma razón
> por la que no se traduce `+` de público ni `1..*` de cardinalidad. Además el
> documento «Relación entre los artefactos» del docente los muestra
> exactamente así, y la rúbrica evalúa la correspondencia con la notación
> esperada. Se probó traducirlos y se revirtió: si la fuente que se evalúa los
> escribe en inglés, se escriben en inglés.

| Estereotipo | Significa |
|---|---|
| `«requirement»` | Una necesidad verificable del sistema |
| `«contains»` | El de arriba agrupa al de abajo |
| `«refine»` | La épica se descompone en un requisito más específico |
| `«deriveReqt»` | Un requisito nace de otro |
| `«satisfy»` | Un caso de uso cumple el requisito |
| `«include»` | El caso base **siempre** ejecuta al incluido |
| `«extend»` | El caso extendido ocurre **solo si** se cumple una condición |

Tampoco se traducen, por lo mismo, la visibilidad (`+` público, `-` privado,
`#` protegido), las cardinalidades (`1`, `0..1`, `1..*`, `*`) ni los tipos de
dato del diagrama de clases y del DER.

## 2. Paleta

La del proyecto ([DESIGN.md §10](../../../DESIGN.md)): neutros cálidos y gris de trazo.

| Elemento | Color |
|---|---|
| Fondo del lienzo | `#F4F4F2` |
| Caja de requisito o clase | `#FFFFFF` con borde `#B9BDBF` |
| Caja de agrupación (épica, módulo) | `#EFEDE8` con borde `#5B6166` |
| Caso de uso | `#F4F4F2` con borde `#5B6166` |
| Flechas y texto | `#5B6166` sobre texto `#1A1A1A` |
| **Pendiente de implementar** | mismo blanco, pero **borde punteado**: `#FFFFFF;line.dashed` |

⚠ **Ningún rojo institucional entra en estos diagramas.** Son zona de datos, y
la regla 14 del proyecto lo prohíbe expresamente ([ADR-011](../../decisiones-tecnicas.md)).

## 3. Tipografía

`Arial`, que es lo que la norma gráfica municipal exige para documentos
([ADR-010](../../decisiones-tecnicas.md)) y lo que usa el PDF de la entrega.

## 4. La cabecera se repite en cada archivo

Los `skinparam` están copiados en los ocho archivos en vez de usar un
`!include`. Es a propósito: así **cada `.puml` se pega tal cual en
[plantuml.com](https://plantuml.com/) y se ve igual**, sin depender de otro
archivo que el sitio no tendría.

## 5. Cómo se regeneran

```powershell
cd frontend
npm run puml -- ../docs/entrega/puml          # comprueba que compilan y actualiza los enlaces
npm run puml -- ../docs/entrega/puml --png    # además descarga los PNG
```

Sin `--png` no toca la red: el enlace al editor se calcula localmente. El
índice con los enlaces está en [README.md](README.md).

## 6. Por qué PlantUML y no mermaid

Los diagramas se hicieron primero en mermaid y se rehicieron. Su
`requirementDiagram` tiene dos límites que chocan con la exigencia de
legibilidad de la rúbrica:

- Los valores de `id`, `type` y `docref` **no admiten guiones sin comillas**:
  hay que escribir `id: "RF-001"`.
- El texto se parte **cada 30 caracteres cortando palabras a la mitad**, sin
  importar el ancho de la caja: `gestió / n de las delegaciones`.

PlantUML deja controlar el salto de línea, el estilo del borde y las notas, es
la herramienta que el equipo ya usa, y su notación es la del ejemplo del
docente. **Los diagramas en mermaid se retiraron del repositorio** junto con el
documento que los contenía: describían el modelo v1 —con la tabla `metas` y la
vista materializada, que ya no existen— y sus PNG medían 600 px de ancho, así
que no se dejaban ampliar. Los 32 diagramas vigentes están aquí, en PlantUML.
