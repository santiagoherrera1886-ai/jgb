# JGB Audience Lab

Una sola aplicación con **tres espacios independientes**: Tarrito Rojo, Pads Faciales y Cuidaderm. Cada marca tiene Resumen, Audiencias, Medios y Simulador, con identidad visual y escenarios propios.

La interfaz usa una estética clara inspirada en iOS: superficies de cristal translúcido, navegación flotante, tarjetas con profundidad y un dock inferior en móvil. Incluye alternativas para movimiento reducido, mayor contraste y navegadores sin desenfoque.

![JGB Audience Lab](docs/preview.jpg)

## Presupuesto definido por el usuario

Cada presupuesto inicia **vacío**. El usuario escribe el monto completo en COP; por ejemplo, `27350000` o `27.350.000`. No hay inversión precargada, botones de montos sugeridos ni reparto de inversión entre marcas. Los resultados permanecen pendientes hasta ingresar un monto válido. Un cero explícito produce resultados en cero.

Cambiar el presupuesto, los días, el universo, el objetivo, la mezcla o los costos de una marca no altera otra. El esquema anterior de presupuestos automáticos no se restaura. Los escenarios se guardan y comparan dentro de su propia marca, hasta seis por marca.

## Contenido y funciones

- Cuatro perfiles por marca, con afinidades, momentos, palabras clave, mensajes, ideas creativas, activación, exclusiones y KPI.
- Cinco medios: Meta, TikTok, YouTube, Google Search y Display.
- Presupuesto libre en COP, duración, universo editable y objetivos de alcance, tráfico o mezcla balanceada.
- Mezcla de medios ajustable al 100%; solo distribuye la inversión de la marca activa.
- CPM o CPC, CTR, llegada a sesión y repetición editables por canal.
- Escenarios de eficiencia prudente, base y optimista.
- Cobertura, alcance con saturación, impresiones, clics, sesiones, frecuencia y costos derivados.
- Curva acumulada, tabla de resultados, comparación, CSV e impresión.
- Navegación por teclado, filtros de audiencias y adaptación a escritorio y móvil.

## Desarrollo

HTML, CSS y módulos JavaScript sin dependencias de producción. Recursos de producto y fuentes locales.

```bash
npm run dev
npm test
npm run build
```

Vercel ejecuta la verificación estática y publica `public/`. El servidor de desarrollo acepta `--host` y `--port`.

Las pruebas verifican presupuestos vacíos, lectura de montos en COP, independencia entre marcas, ecuaciones, presupuesto cero, saturación, tasas ponderadas, redistribución y snapshots. La revisión de navegador cubre edición y recarga, escenarios por marca, exportación, búsqueda, modales y pantallas de 320 y 390 px.

## Modelo

**Universos, costos y tasas iniciales son hipótesis editables; no son resultados medidos ni benchmarks certificados.** La app no conecta cuentas de anuncios o GA4.

- CPM: `impresiones = inversión / CPM × 1.000`.
- `clics = impresiones × CTR / 100`.
- Search: `clics = inversión / CPC`; `impresiones = clics / (CTR / 100)`.
- `sesiones = clics × llegada a sesión / 100`.
- `contactos efectivos = suma(impresiones / repetición base de cada medio)`.
- `alcance = U × (1 − exp(−contactos efectivos / U))`.
- `cobertura = alcance / U × 100`.

El alcance aproxima la saturación dentro del universo de cada marca, bajo un supuesto homogéneo de exposición; no es una deduplicación medida. Los universos iniciales de Tarrito Rojo (8 M), Pads (4 M) y Cuidaderm (5 M) son hipótesis editables por separado. No se agregan universos ni alcances entre marcas.

Prudente: costos × 1,20, CTR × 0,80 y llegada × 0,90. Optimista: costos × 0,85, CTR × 1,15 y llegada × 1,05. Tasas limitadas al 100%; no son intervalos estadísticos. La duración cambia el ritmo diario, no el total para una misma inversión.

## Persistencia y fuentes

Configuraciones y escenarios se conservan en `localStorage`, bajo `jgb-audience-lab-v2`. No se activan campañas ni se transmite inversión a plataformas. El CSV incluye los parámetros y resultados de la marca activa. La metodología y los sitios oficiales están disponibles en la app. Créditos en `public/assets/SOURCES.md`.
