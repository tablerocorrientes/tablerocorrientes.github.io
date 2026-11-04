# Tablero Ciudadano de Corrientes

Sitio público: https://tablerocorrientes.github.io

Monitoreo ciudadano del fenómeno de El Niño en la provincia de Corrientes: alturas de los ríos Paraná y Uruguay, alertas meteorológicas, lluvia medida, pronóstico, evacuados y simuladores de anegamiento. Todos los datos provienen de fuentes oficiales, que se citan en cada sección.

## Páginas
- `/` Tablero provincial
- `/barrio/` Simulador por barrio, Corrientes Capital
- `/provincia/` Simulador por localidad, provincia de Corrientes

## Datos (carpeta `data/`)
Las páginas son fijas y leen estos archivos. Cada tarea de actualización escribe solo los suyos.

| Archivo | Contenido | Lo actualizan |
|---|---|---|
| `puertos.json` | Ríos, partes, prensa, pasos, rutas, efecto tapón | Tareas A y B |
| `hist.json` | Histórico validado de alturas (repositorio de Drive) | Tareas A y B |
| `evac.json` | Evacuados, centros, historial | Tareas A y B |
| `barrio.json` | Pronóstico horario, alertas y río del simulador por barrio | Tareas A, B y D |
| `prov.json` | Localidades, pronóstico y alertas del simulador provincial | Tareas A, B y D |
| `pron.json` | Pronóstico y alertas del tablero | Tareas A, B y D |
| `lluvia.json` | Lluvia medida del SNIH, todas las estaciones | Tareas C |
| `obs.json` | Lluvia observada en la Capital (ICAA y 13805) | Tareas C |
| `sat.json` y `assets/sat.jpg` | Imagen satelital más reciente | Tareas C |
| `lugares.json` | Barrios y localidades para el formulario de reportes | Manual |
| `config.json` | Correo de contacto y enlace del formulario | Manual |
