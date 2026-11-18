#!/usr/bin/env python3
"""Pronóstico de lluvia por modelos, calculado por GitHub sin intervención de las tareas de Claude.

Fuente: Open-Meteo, promedio de los modelos GFS (NOAA), ICON (DWD) y ECMWF IFS.
Escenario probable = promedio de los modelos disponibles (criterio del Texto W1, punto 3).
Actualiza:
  data/pron.json   -> "ciudades" (hoy y mañana: mm, horas, modelos, criterio, fuente), "horario_capital"
                      (hoy, mañana y pasado mañana, 24 valores), "actualizado", "horario_act", "metodo"
  data/barrio.json -> "dias" de hoy y los 5 días siguientes (Corrientes Capital) y "actualizado"
  data/prov.json   -> "pronostico" (mm y horas de las 12 ciudades) y "pron_actualizado"
Conserva los textos del SMN ("smn") y las alertas. No toca un pronóstico cargado por una tarea
hace menos de 100 minutos (salvo con --forzar). No hace commit.
"""
import json, os, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(RAIZ, 'data', *p)
CIUDADES = {
    'Corrientes Capital': (-27.47, -58.83), 'Goya': (-29.14, -59.26), 'Esquina': (-30.01, -59.53),
    'Bella Vista': (-28.51, -59.04), 'Mercedes': (-29.18, -58.08), 'Curuzú Cuatiá': (-29.79, -58.05),
    'Paso de los Libres': (-29.71, -57.09), 'Santo Tomé': (-28.55, -56.04), 'Gobernador Virasoro': (-28.05, -56.03),
    'Ituzaingó': (-27.59, -56.69), 'Monte Caseros': (-30.25, -57.64), 'Saladas': (-28.25, -58.62)}
MODELOS = {'gfs_seamless': 'GFS (NOAA)', 'icon_seamless': 'ICON (DWD)', 'ecmwf_ifs025': 'ECMWF'}


def leer(p):
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return {}


def guardar(p, d):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)


def fecha_ddmm(s):
    import re
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4}),?\s*(\d{1,2}):(\d{2})', str(s or ''))
    return datetime(int(m[3]), int(m[2]), int(m[1]), int(m[4]), int(m[5]), tzinfo=ART) if m else None


def bajar(lat, lon):
    u = ('https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&hourly=precipitation&forecast_days=7'
         '&timezone=America%%2FArgentina%%2FBuenos_Aires&models=%s') % (lat, lon, ','.join(MODELOS))
    for i in range(3):
        try:
            return json.load(urllib.request.urlopen(u, timeout=40))['hourly']
        except Exception as e:
            print('aviso: Open-Meteo (%s)' % e)
            time.sleep(8 * (i + 1))
    return None


def por_dia(h):
    """{fecha: {'prom': [24], 'mod': {modelo: total}}}"""
    out = {}
    tiempos = h.get('time') or []
    for i, t in enumerate(tiempos):
        f, hh = t[:10], int(t[11:13])
        vals, mods = [], {}
        for m in MODELOS:
            v = (h.get('precipitation_' + m) or [None] * len(tiempos))[i]
            if v is not None:
                vals.append(float(v)); mods[m] = float(v)
        dia = out.setdefault(f, {'prom': [0.0] * 24, 'mod': {m: 0.0 for m in MODELOS}, 'n': {m: 0 for m in MODELOS}})
        dia['prom'][hh] = round(sum(vals) / len(vals), 2) if vals else 0.0
        for m, v in mods.items():
            dia['mod'][m] += v; dia['n'][m] += 1
    return out


def main():
    ahora = datetime.now(ART)
    hoy = ahora.strftime('%Y-%m-%d')
    fechas = [(ahora + timedelta(days=k)).strftime('%Y-%m-%d') for k in range(6)]
    sello = ahora.strftime('%d/%m/%Y, %H:%M h')
    P = leer(D('pron.json'))
    ult = fecha_ddmm(P.get('horario_act') or P.get('actualizado'))
    if '--forzar' not in sys.argv and ult and ahora - ult < timedelta(minutes=100) and 'calculado automáticamente' not in str(P.get('metodo', '')):
        print('Pronóstico cargado por una tarea hace menos de 100 minutos: se conserva.')
        return
    C = P.setdefault('ciudades', {})
    hechas = 0
    dias_cap = None
    for c, (lat, lon) in CIUDADES.items():
        h = bajar(lat, lon)
        if not h:
            continue
        pd = por_dia(h)
        q = C.setdefault(c, {})
        mods = {}
        for clave, k in (('hoy', 0), ('manana', 1)):
            f = fechas[k]
            if f not in pd:
                continue
            arr = pd[f]['prom']
            q[clave] = {'mm': round(sum(arr), 1), 'horas': sum(1 for x in arr if x >= 0.1)}
            mods[clave] = [[MODELOS[m], round(pd[f]['mod'][m], 1)] for m in MODELOS if pd[f]['n'][m]]
        q['modelos'] = mods
        q['criterio'] = 'Promedio de los modelos ' + ', '.join(MODELOS.values()) + ' (Open-Meteo), calculado automáticamente. Estimación derivada, no una medición.'
        q['fuente'] = 'Hoy %s mm, mañana %s mm, promedio de modelos (Open-Meteo, %s)' % (
            str(q.get('hoy', {}).get('mm', '')).replace('.', ','), str(q.get('manana', {}).get('mm', '')).replace('.', ','), sello)
        q['act'] = ahora.strftime('%d/%m, %H:%M h')
        hechas += 1
        if c == 'Corrientes Capital':
            dias_cap = pd
    if not hechas:
        print('Open-Meteo sin respuesta: pronóstico sin cambios.')
        return
    if dias_cap:
        P['horario_capital'] = {f: dias_cap[f]['prom'] for f in fechas[:3] if f in dias_cap}
        P['horario_act'] = sello
        B = leer(D('barrio.json'))
        if B:
            B.setdefault('dias', {})
            for f in fechas:
                if f in dias_cap:
                    B['dias'][f] = dias_cap[f]['prom']
            B['actualizado'] = sello
            guardar(D('barrio.json'), B)
    P['actualizado'] = sello
    P['metodo'] = 'estimación derivada: promedio de modelos (Open-Meteo), calculado automáticamente; las tareas agregan el parte del SMN cuando corren'
    guardar(D('pron.json'), P)
    V = leer(D('prov.json'))
    if V:
        pr = V.setdefault('pronostico', {})
        for c in CIUDADES:
            if c in C:
                x = pr.setdefault(c, {})
                for k in ('hoy', 'manana'):
                    if k in C[c]:
                        x[k] = C[c][k]
        V['pron_actualizado'] = sello
        guardar(D('prov.json'), V)
    print('Pronóstico por modelos actualizado: %d ciudades, %s' % (hechas, sello))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('pronóstico por modelos: error (%s)' % e)
