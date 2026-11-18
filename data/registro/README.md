# Registro permanente del Tablero Ciudadano de Corrientes

Tablas en formato CSV (se abren con Excel, Google Sheets o cualquier herramienta de análisis) con toda la información que el tablero releva. Se completan solas en cada actualización automática de GitHub y nunca se recortan: el registro va desde el primer dato disponible hasta el final de El Niño. La información anterior a la creación del sitio (octubre de 2026) se recuperó de las series históricas que ya tenía el tablero.

| Archivo | Contenido | Desde |
|---|---|---|
| `rios.csv` | Altura de los ríos Paraná y Uruguay por puerto, con cotas de alerta y evacuación y fuente | 01/10/2026 |
| `pronosticos_rio.csv` | Pronósticos y tendencias de los organismos (INA, EBY y otros) | según disponibilidad |
| `lluvia_horaria.csv` | Lluvia medida hora por hora en cada estación (la hora indica el inicio del intervalo: 07 = de 7 a 8 h) | 12/11/2026 |
| `pronostico_lluvia_dia.csv` | Lluvia pronosticada para hoy y mañana por ciudad, en cada emisión | 03/11/2026 |
| `pronostico_lluvia_horaria_capital.csv` | Lluvia pronosticada hora por hora para Corrientes Capital, en cada emisión | 03/11/2026 |
| `pronostico_extendido.csv` | Pronóstico extendido por ciudad: probabilidad de lluvia y temperaturas | 03/11/2026 |
| `alertas.csv` | Todas las alertas vistas (SMN y COE): nivel, horario, zonas, rango de milímetros y fuente | 03/11/2026 |
| `evacuados_localidad.csv` | Evacuados y autoevacuados por localidad y fecha, con fuente | 16/10/2026 |
| `evacuados_total.csv` | Total provincial de personas fuera de sus casas | 16/10/2026 |
| `resumen_diario_lluvia.csv` | Por día y localidad: pronosticado, llovido, hora más lluviosa, alerta máxima y si la alerta cubrió las horas de mayor lluvia | 12/11/2026 |

Además, `data/bitacora/` guarda por mes el detalle diario completo (lluvia hora por hora, pronóstico al comenzar el día y alertas), y el historial de cambios del repositorio conserva cada versión de todos los archivos.
