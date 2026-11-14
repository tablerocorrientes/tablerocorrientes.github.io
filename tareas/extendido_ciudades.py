# Pronóstico extendido informativo (7 días) para las ciudades de referencia del Tablero Ciudadano.
# Lo ejecuta la automatización "Pronóstico extendido (2 veces por día)" del repositorio.
# Fuente: modelo Open-Meteo (estimación de modelo, NO es el pronóstico oficial del SMN).
# Corrientes Capital conserva el pronóstico del SMN que cargan las tareas A y B, salvo que esté vencido.
# Solo modifica data/pron.json -> "extendido"."ciudades" (y "actualizado" de "extendido"). No hace commit.
import json, os, datetime, urllib.request, time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRON = os.path.join(RAIZ, 'data', 'pron.json')
AR = datetime.timezone(datetime.timedelta(hours=-3))
CIUDADES = {
    'Corrientes Capital': (-27.47, -58.83), 'Goya': (-29.14, -59.26), 'Esquina': (-30.01, -59.53),
    'Bella Vista': (-28.51, -59.04), 'Mercedes': (-29.18, -58.08), 'Curuzú Cuatiá': (-29.79, -58.05),
    'Paso de los Libres': (-29.71, -57.09), 'Santo Tomé': (-28.55, -56.04), 'Gobernador Virasoro': (-28.05, -56.03),
    'Ituzaingó': (-27.59, -56.69), 'Monte Caseros': (-30.25, -57.64), 'Saladas': (-28.25, -58.62)}
WMO = {0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla',
       51: 'Llovizna débil', 53: 'Llovizna', 55: 'Llovizna intensa', 61: 'Lluvia débil', 63: 'Lluvia', 65: 'Lluvia fuerte',
       80: 'Chaparrones', 81: 'Chaparrones', 82: 'Chaparrones fuertes', 95: 'Tormentas', 96: 'Tormentas con granizo', 99: 'Tormentas con granizo'}

def bajar(lat, lon):
    u = ('https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&timezone=America%%2FArgentina%%2FBuenos_Aires'
         '&forecast_days=8&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum') % (lat, lon)
    for i in range(3):
        try:
            return json.load(urllib.request.urlopen(u, timeout=30))['daily']
        except Exception:
            time.sleep(5 * (i + 1))
    return None

def r(x):
    return None if x is None else int(round(x))

ahora = datetime.datetime.now(AR)
hoy = ahora.strftime('%Y-%m-%d')
sello = ahora.strftime('%d/%m/%Y, %H:%M h')
p = json.load(open(PRON, encoding='utf-8'))
ext = p.setdefault('extendido', {})
ext.setdefault('aviso', 'Pronóstico extendido informativo. No se usa en los cálculos del simulador.')
cs = ext.setdefault('ciudades', {})
hechas = 0
for c, (lat, lon) in CIUDADES.items():
    prev = cs.get(c) or {}
    oficial = 'Servicio Meteorológico' in str(prev.get('fuente', ''))
    vigente = any(d.get('fecha', '') > hoy for d in prev.get('dias', []))
    if oficial and vigente:
        # se conserva el pronóstico oficial; solo se completan temperaturas faltantes con el modelo
        d = bajar(lat, lon)
        if d:
            idx = {f: i for i, f in enumerate(d['time'])}
            for x in prev['dias']:
                i = idx.get(x.get('fecha'))
                if i is not None:
                    if x.get('tmax') is None: x['tmax'] = r(d['temperature_2m_max'][i]); x['tmax_fuente'] = 'modelo'
                    if x.get('tmin') is None: x['tmin'] = r(d['temperature_2m_min'][i]); x['tmin_fuente'] = 'modelo'
        continue
    d = bajar(lat, lon)
    if not d:
        continue
    dias = []
    for i, f in enumerate(d['time']):
        if f <= hoy:
            continue
        dias.append({'fecha': f, 'resumen': WMO.get(d['weather_code'][i], 'Variable'),
                     'prob': r(d['precipitation_probability_max'][i]), 'mm': None if d['precipitation_sum'][i] is None else round(d['precipitation_sum'][i], 1),
                     'tmin': r(d['temperature_2m_min'][i]), 'tmax': r(d['temperature_2m_max'][i])})
    cs[c] = {'fuente': 'Modelo Open-Meteo (estimación de modelo, no es el pronóstico oficial del SMN)',
             'url': 'https://open-meteo.com', 'emision': sello, 'dias': dias[:7]}
    hechas += 1
ext['actualizado'] = sello
json.dump(p, open(PRON, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'ciudades_actualizadas': hechas, 'hora': sello}, ensure_ascii=False))
