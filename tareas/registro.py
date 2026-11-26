#!/usr/bin/env python3
"""Registro permanente del Tablero Ciudadano para análisis, estadísticas y gráficos.

Cada corrida toma los datos vigentes del tablero y los suma, sin borrar nada, a tablas
CSV en data/registro/. Cada fila se identifica por una clave; si ya existe se conserva
(o se actualiza con el dato más completo). Nunca se recorta: el registro va desde el
primer dato disponible hasta el final de El Niño.

Uso: python3 tareas/registro.py              (datos vigentes)
     python3 tareas/registro.py --historia   (reconstruye desde el historial de git)
"""
import csv, io, json, os, re, subprocess, sys
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
DIR = 'data/registro'

TABLAS = {
    'rios.csv': (['fecha_hora', 'rio', 'puerto', 'altura_m', 'alerta_m', 'evacuacion_m', 'estado', 'fuente'], ['puerto', 'fecha_hora']),
    'lluvia_horaria.csv': (['fecha', 'hora', 'localidad', 'estacion', 'codigo', 'mm'], ['codigo', 'fecha', 'hora']),
    'pronostico_lluvia_dia.csv': (['emitido', 'ciudad', 'dia', 'mm', 'horas_con_lluvia'], ['emitido', 'ciudad', 'dia']),
    'pronostico_lluvia_horaria_capital.csv': (['emitido', 'fecha', 'hora', 'mm'], ['emitido', 'fecha', 'hora']),
    'pronostico_extendido.csv': (['emitido', 'ciudad', 'fecha', 'resumen', 'prob_lluvia', 'tmin', 'tmax', 'fuente'], ['emitido', 'ciudad', 'fecha']),
    'alertas.csv': (['nivel', 'fenomeno', 'desde', 'hasta', 'zonas', 'rango_min_mm', 'rango_max_mm', 'incluye_capital', 'origen', 'vista_por_primera_vez'], ['nivel', 'desde', 'hasta', 'zonas']),
    'pronosticos_rio.csv': (['organismo', 'emision', 'rio', 'horizonte_dias', 'tipo', 'tendencia', 'url'], ['organismo', 'emision', 'rio']),
    'evacuados_localidad.csv': (['fecha', 'localidad', 'evacuados', 'autoevacuados', 'fuente', 'enlace'], ['fecha', 'localidad']),
    'evacuados_total.csv': (['fecha', 'personas', 'texto'], ['fecha']),
    'resumen_diario_lluvia.csv': (['fecha', 'localidad', 'pronosticado_mm', 'llovido_mm', 'horas_medidas', 'hora_mas_lluviosa', 'alerta_maxima', 'rango_alerta_mm', 'alerta_cubrio_horas_de_mayor_lluvia'], ['fecha', 'localidad']),
}


def cargar(nombre):
    cols, clave = TABLAS[nombre]
    ruta = os.path.join(DIR, nombre)
    filas = {}
    if os.path.exists(ruta):
        with open(ruta, encoding='utf-8', newline='') as f:
            for r in csv.DictReader(f):
                filas[tuple(r.get(k, '') for k in clave)] = r
    return filas


def guardar(nombre, filas):
    cols, clave = TABLAS[nombre]
    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, nombre), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore')
        w.writeheader()
        for k in sorted(filas):
            w.writerow(filas[k])


def s(x):
    if x is None:
        return ''
    if isinstance(x, float):
        return ('%.3f' % x).rstrip('0').rstrip('.')
    if isinstance(x, (list, dict)):
        return json.dumps(x, ensure_ascii=False)
    return str(x)


def poner(T, nombre, fila, reemplazar=False):
    cols, clave = TABLAS[nombre]
    fila = {c: s(fila.get(c)) for c in cols}
    k = tuple(fila[c] for c in clave)
    if k not in T[nombre] or reemplazar:
        T[nombre][k] = fila
    else:
        viejo = T[nombre][k]
        for c in cols:  # completar campos vacíos
            if not viejo.get(c) and fila[c]:
                viejo[c] = fila[c]


def fecha_ddmmaaaa(t):
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?', str(t or ''))
    if not m:
        return None
    d = '%s-%02d-%02d' % (m.group(3), int(m.group(2)), int(m.group(1)))
    return d + ('T%02d:%s' % (int(m.group(4)), m.group(5)) if m.group(4) else '')


def de_rios(T, D):
    H = D.get('hist') or {}
    for se in (H.get('series') or []):
        for le in se.get('lecturas') or []:
            if len(le) >= 2 and le[1] is not None:
                poner(T, 'rios.csv', {'fecha_hora': str(le[0])[:16], 'rio': se.get('rio'), 'puerto': se.get('puerto'), 'altura_m': float(le[1]), 'alerta_m': se.get('alerta'), 'evacuacion_m': se.get('evacuacion'), 'estado': le[2] if len(le) > 2 else '', 'fuente': se.get('fuente')})
    for p in (H.get('pronosticos') or []):
        poner(T, 'pronosticos_rio.csv', p)
    HP = D.get('hist_propio') or {}
    for se in (HP.get('series') or []):
        for le in se.get('lecturas') or []:
            if len(le) >= 2 and le[1] is not None:
                poner(T, 'rios.csv', {'fecha_hora': str(le[0])[:16], 'rio': se.get('rio'), 'puerto': se.get('puerto'), 'altura_m': float(le[1]), 'alerta_m': se.get('alerta'), 'evacuacion_m': se.get('evacuacion'), 'estado': 'verificado', 'fuente': le[2] if len(le) > 2 else se.get('fuente')})
    P = D.get('puertos') or {}
    RIO = {}
    for se in (H.get('series') or []):
        RIO[se.get('puerto')] = se.get('rio')
    for p in (P.get('puertos') or []):
        fh = fecha_ddmmaaaa(p.get('registro')) or fecha_ddmmaaaa(P.get('fecha_registro'))
        if fh and p.get('altura') is not None:
            poner(T, 'rios.csv', {'fecha_hora': fh[:16], 'rio': p.get('rio') or RIO.get(p.get('puerto'), ''), 'puerto': p.get('puerto'), 'altura_m': float(p['altura']), 'alerta_m': p.get('alerta'), 'evacuacion_m': p.get('evacuacion'), 'estado': 'verificado', 'fuente': p.get('fuente')})


def de_lluvia(T, D):
    L = D.get('lluvia') or {}
    cols = L.get('columnas') or []
    m = re.search(r'(\d{4})', str(L.get('actualizado') or ''))
    anio = int(m.group(1)) if m else datetime.now(ART).year
    fechas, dia = [], None
    for c in cols:
        md = re.match(r'\s*(\d{1,2})/(\d{1,2})\s+(\d{1,2})', str(c))
        if md:
            dia = (int(md.group(1)), int(md.group(2))); h = int(md.group(3))
        else:
            mh = re.match(r'\s*(\d{1,2})', str(c)); h = int(mh.group(1)) if mh else None
        if dia is None or h is None or 'en curso' in str(c):
            fechas.append(None); continue
        t = datetime(anio, dia[1], dia[0], h) - timedelta(hours=1)  # el dato de las h es la lluvia entre h-1 y h
        fechas.append(t)
    for e in L.get('estaciones') or []:
        for i, v in enumerate(e.get('valores') or []):
            if v is None or i >= len(fechas) or fechas[i] is None:
                continue
            t = fechas[i]
            fila = {'fecha': t.strftime('%Y-%m-%d'), 'hora': '%02d' % t.hour, 'localidad': e.get('localidad'), 'estacion': e.get('estacion'), 'codigo': e.get('codigo'), 'mm': float(v)}
            k = (s(e.get('codigo')), fila['fecha'], fila['hora'])
            viejo = T['lluvia_horaria.csv'].get(k)
            if viejo is None or float(viejo.get('mm') or 0) < float(v):
                poner(T, 'lluvia_horaria.csv', fila, reemplazar=True)


def de_pronostico(T, D):
    P = D.get('pron') or {}
    em = fecha_ddmmaaaa(P.get('actualizado'))
    if not em:
        return
    base = datetime.fromisoformat(em[:10])
    for c, v in (P.get('ciudades') or {}).items():
        for k, off in (('hoy', 0), ('manana', 1)):
            q = v.get(k) if isinstance(v, dict) else None
            if isinstance(q, dict) and q.get('mm') is not None:
                poner(T, 'pronostico_lluvia_dia.csv', {'emitido': em, 'ciudad': c, 'dia': (base + timedelta(days=off)).strftime('%Y-%m-%d'), 'mm': float(q['mm']), 'horas_con_lluvia': q.get('horas')})
    for f, arr in (P.get('horario_capital') or {}).items():
        for h, x in enumerate(arr or []):
            poner(T, 'pronostico_lluvia_horaria_capital.csv', {'emitido': em, 'fecha': f, 'hora': '%02d' % h, 'mm': float(x or 0)})
    ex = (P.get('extendido') or {}).get('ciudades') or {}
    for c, v in ex.items():
        e2 = (fecha_ddmmaaaa(v.get('emision')) or em)[:10]  # una emisión por día
        for d in v.get('dias') or []:
            poner(T, 'pronostico_extendido.csv', {'emitido': e2, 'ciudad': c, 'fecha': d.get('fecha'), 'resumen': d.get('resumen'), 'prob_lluvia': d.get('prob'), 'tmin': d.get('tmin'), 'tmax': d.get('tmax'), 'fuente': v.get('fuente')})
    for a in (P.get('smn') or []):
        alerta(T, a, em)


def alerta(T, a, visto):
    rg = a.get('rango_mm') or [None, None]
    z = a.get('zonas')
    poner(T, 'alertas.csv', {'nivel': a.get('nivel'), 'fenomeno': a.get('fenomeno'), 'desde': a.get('desde_iso'), 'hasta': a.get('hasta_iso'), 'zonas': '; '.join(z) if isinstance(z, list) else z, 'rango_min_mm': rg[0], 'rango_max_mm': rg[1], 'incluye_capital': a.get('incluye_capital'), 'origen': a.get('origen'), 'vista_por_primera_vez': visto})


def de_evacuados(T, D):
    E = D.get('evac') or {}
    for h in E.get('historial') or []:
        f = fecha_ddmmaaaa(h.get('f')) or h.get('f')
        poner(T, 'evacuados_localidad.csv', {'fecha': f, 'localidad': h.get('n'), 'evacuados': h.get('evac'), 'autoevacuados': h.get('auto'), 'fuente': h.get('fuente'), 'enlace': h.get('u')})
    tot = E.get('total') or {}
    if tot.get('fecha'):
        poner(T, 'evacuados_total.csv', {'fecha': fecha_ddmmaaaa(tot['fecha']) or tot['fecha'], 'personas': tot.get('valor'), 'texto': tot.get('texto')})
    anio = datetime.now(ART).year
    for x in E.get('serie') or []:
        m = re.match(r'(\d{1,2})/(\d{1,2})(.*)', str(x.get('f', '')))
        if m:
            poner(T, 'evacuados_total.csv', {'fecha': '%d-%02d-%02d%s' % (anio, int(m.group(2)), int(m.group(1)), (' ' + m.group(3).strip()) if m.group(3).strip() else ''), 'personas': x.get('v')})


def de_bitacora(T, D):
    """Resumen diario de aciertos a partir de la bitácora permanente (data/bitacora)."""
    ORD = {'rojo': 3, 'naranja': 2, 'amarillo': 1}
    dias = {}
    if os.path.isdir('data/bitacora'):
        for fn in sorted(os.listdir('data/bitacora')):
            try:
                dias.update(json.load(open(os.path.join('data/bitacora', fn), encoding='utf-8')).get('dias') or {})
            except Exception:
                pass
    for f, r in dias.items():
        obs = r.get('observado') or {}
        pron = r.get('ciudades') or {}
        ini = datetime.fromisoformat(f + 'T00:00:00-03:00')
        for loc in sorted(set(obs) | set(pron)):
            ob = obs.get(loc)
            tot = round(sum(float(x or 0) for x in ob), 2) if ob else None
            hm = n = None
            if ob:
                n = sum(1 for x in ob if x is not None)
                mx = max(float(x or 0) for x in ob)
                hm = ob.index(max(ob, key=lambda x: float(x or 0))) if mx > 0 else None
            # alertas de la localidad (Capital: zonas con Capital o resumen provincial)
            AL = []
            for a in r.get('alertas_del_dia') or []:
                z = ' '.join(a.get('zonas') or []) if isinstance(a.get('zonas'), list) else str(a.get('zonas') or '')
                base = loc.replace('Corrientes Capital', 'Capital')
                if base in z or 'resumen por provincia' in z or 'no detalla' in z:
                    AL.append(a)
            amx = max(AL, key=lambda a: ORD.get(a.get('nivel'), 0)) if AL else None
            rg = None
            for a in AL:
                if a.get('rango_mm') and (not rg or a['rango_mm'][1] > rg[1]):
                    rg = a['rango_mm']
            cub = ''
            if ob and AL and max(float(x or 0) for x in ob) >= 1:
                mx = max(float(x or 0) for x in ob)
                HM = [h for h, x in enumerate(ob) if float(x or 0) >= mx * 0.6]
                def cubierta(h):
                    t = ini + timedelta(hours=h, minutes=30)
                    for a in AL:
                        try:
                            d = datetime.fromisoformat(a['desde_iso']) if a.get('desde_iso') else ini
                            e = datetime.fromisoformat(a['hasta_iso']) if a.get('hasta_iso') else ini + timedelta(days=1)
                        except Exception:
                            continue
                        if d <= t < e:
                            return True
                    return False
                c = sum(1 for h in HM if cubierta(h))
                cub = 'si' if c == len(HM) else ('parcial' if c else 'no')
            poner(T, 'resumen_diario_lluvia.csv', {'fecha': f, 'localidad': loc, 'pronosticado_mm': pron.get(loc), 'llovido_mm': tot, 'horas_medidas': n, 'hora_mas_lluviosa': ('%02d a %02d h' % (hm, hm + 1)) if hm is not None else '', 'alerta_maxima': amx.get('nivel') if amx else '', 'rango_alerta_mm': ('%s a %s' % tuple(rg)) if rg else '', 'alerta_cubrio_horas_de_mayor_lluvia': cub}, reemplazar=True)


def de_historico_inicial(T):
    """Series de ríos recopiladas antes del sitio (carpeta data/registro/historico_inicial)."""
    d = os.path.join(DIR, 'historico_inicial')
    if not os.path.isdir(d):
        return
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.csv'):
            continue
        with open(os.path.join(d, fn), encoding='utf-8', newline='') as f:
            for r in csv.DictReader(f):
                try:
                    alt = float(r.get('altura_m'))
                except Exception:
                    continue
                poner(T, 'rios.csv', {'fecha_hora': str(r.get('fecha_hora_observacion', ''))[:16], 'rio': r.get('rio'), 'puerto': r.get('puerto'), 'altura_m': alt, 'alerta_m': r.get('cota_alerta_m'), 'evacuacion_m': r.get('cota_evacuacion_m'), 'estado': r.get('estado'), 'fuente': ((r.get('fuente') or '') + (' ' + r['url_fuente'] if r.get('url_fuente') else '')).strip()})


ARCH = {'hist': 'data/hist.json', 'hist_propio': 'data/hist_propio.json', 'puertos': 'data/puertos.json', 'lluvia': 'data/lluvia.json', 'pron': 'data/pron.json', 'evac': 'data/evac.json', 'smn': 'data/fuentes/smn_alertas_local.json', 'esp': 'data/esperado_dia.json'}


def procesar(T, D, visto):
    for fn in (de_rios, de_lluvia, de_pronostico, de_evacuados):
        try:
            fn(T, D)
        except Exception as e:
            print('registro: aviso en %s (%s)' % (fn.__name__, e))
    for a in ((D.get('smn') or {}).get('alertas') or []):
        try:
            d = fecha_ddmmaaaa(a.get('desde')); h = fecha_ddmmaaaa(a.get('hasta'))
            alerta(T, {'nivel': a.get('nivel'), 'fenomeno': a.get('fenomeno'), 'desde_iso': (d + ':00-03:00') if d and 'T' in d else d, 'hasta_iso': (h + ':00-03:00') if h and 'T' in h else h, 'zonas': a.get('zonas'), 'origen': 'Servicio Meteorológico Nacional (canal oficial de alertas)'}, visto)
        except Exception:
            pass
    E = D.get('esp') or {}
    for r in (E.get('historial') or []) + [E]:
        for a in (r.get('alertas_del_dia') or []):
            alerta(T, a, '')


def main():
    T = {n: cargar(n) for n in TABLAS}
    if '--historia' in sys.argv:
        vistos = set()
        com = subprocess.run(['git', 'log', '--reverse', '--format=%H %cI', '--'] + list(ARCH.values()), capture_output=True, text=True).stdout.split('\n')
        ult = {}
        for linea in com:
            if not linea.strip():
                continue
            h, t = linea.split()
            D = {}
            for k, ruta in ARCH.items():
                blob = subprocess.run(['git', 'rev-parse', h + ':' + ruta], capture_output=True, text=True).stdout.strip()
                if not blob or ult.get(k) == blob:
                    continue
                ult[k] = blob
                try:
                    D[k] = json.loads(subprocess.run(['git', 'cat-file', '-p', blob], capture_output=True, text=True).stdout)
                except Exception:
                    pass
            if D:
                procesar(T, D, t[:16])
        print('registro: historial de git procesado (%d versiones)' % len([c for c in com if c.strip()]))
    D = {}
    for k, ruta in ARCH.items():
        try:
            D[k] = json.load(open(ruta, encoding='utf-8'))
        except Exception:
            pass
    procesar(T, D, datetime.now(ART).strftime('%Y-%m-%dT%H:%M'))
    de_historico_inicial(T)
    de_bitacora(T, D)
    for n in TABLAS:
        guardar(n, T[n])
    print('registro: ' + ', '.join('%s %d' % (n.replace('.csv', ''), len(T[n])) for n in TABLAS))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('registro: error (%s)' % e)
