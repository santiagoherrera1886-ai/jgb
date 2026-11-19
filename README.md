# JGB Audience Lab

Una sola aplicación de planeación de audiencias y medios para **Tarrito Rojo**, **Pads Faciales JGB** y **Cuidaderm**. Cada marca tiene una identidad visual propia y cuatro secciones: Resumen, Audiencias, Medios y Simulador. La vista general permite repartir una misma inversión entre las tres marcas.

![JGB Audience Lab](docs/preview.jpg)

## Funcionalidades

- Doce perfiles estratégicos con momentos de consumo, afinidades, palabras clave, mensajes, ideas creativas, activación, exclusiones y KPI.
- Cinco medios: Meta, TikTok, YouTube, Google Search y Display.
- Inversión libre en COP, duración, universos editables y objetivos de alcance, tráfico o mix balanceado.
- Parámetros por medio: CPM o CPC, CTR, llegada a sesión y repetición base.
- Escenarios de eficiencia prudente, base y optimista.
- Alcance con saturación, cobertura, frecuencia, impresiones, clics, sesiones y costos derivados.
- Reparto por marcas y medios con ajuste automático al 100%.
- Comparación de hasta seis escenarios guardados en el navegador, exportación CSV con supuestos e impresión.
- Navegación adaptable, teclado, búsqueda de audiencias y fuentes oficiales de producto.

## Desarrollo y validación

Aplicación estática en HTML, CSS y módulos JavaScript. No necesita dependencias de producción ni servicios externos para funcionar; las imágenes y fuentes se sirven localmente.

```bash
npm run dev
npm test
npm run build
```

El servidor de desarrollo acepta `--host` y `--port`. Vercel ejecuta la verificación estática y publica `public/` con la configuración de `vercel.json`.

Las pruebas verifican las ecuaciones de compra, presupuesto cero, monotonicidad, saturación, deduplicación modelada, ponderación de tasas, redistribución y persistencia de supuestos de los escenarios. La revisión de interfaz cubre navegación, búsqueda, modales, edición de inversión, comparación tras recarga, CSV y anchos móviles de 320 y 390 px.

## Modelo de planeación

**Los valores iniciales son ilustrativos, no resultados medidos ni benchmarks certificados.** No hay conexión a cuentas publicitarias, CRM o GA4.

Para medios comprados por CPM:

`impresiones = inversión / CPM × 1.000`

`clics = impresiones × CTR / 100`

Search usa `clics = inversión / CPC`, e infiere impresiones a partir del CTR. En todos los casos: `sesiones = clics × llegada a sesión / 100`.

El alcance de marca usa `U × (1 − exp(−contactos efectivos / U))`, donde los contactos efectivos suman las impresiones de cada medio divididas por su factor de repetición. El alcance conjunto aplica `U total × (1 − producto(1 − alcance marca / U total))`, bajo un supuesto de independencia dentro del universo compartido. Esta aproximación no representa una deduplicación real.

Los universos iniciales (12 M para el portafolio; 8 M, 4 M y 5 M por marca) son hipótesis editables. Las bases de marca se limitan a la base común en el portafolio. Sus escenarios individuales mantienen presupuestos y mix independientes.

Prudente: costos × 1,20, CTR × 0,80 y llegada a sesión × 0,90. Optimista: costos × 0,85, CTR × 1,15 y llegada × 1,05. Las tasas finales se limitan a 100%. No son intervalos estadísticos. La duración cambia el ritmo diario, no el total para una misma inversión.

## Datos y privacidad

Los escenarios se guardan en `localStorage` con esquema versionado. No se transmiten a plataformas publicitarias ni activan campañas. El CSV conserva parámetros para compartir o reproducir el cálculo. Las fuentes de producto y la metodología están disponibles dentro de la app. Créditos de recursos en `public/assets/SOURCES.md`.
