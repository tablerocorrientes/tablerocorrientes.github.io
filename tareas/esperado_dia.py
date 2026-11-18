#!/usr/bin/env python3
"""Lo que se esperaba para hoy: una foto del pronóstico tomada al comienzo de cada día.

En la primera corrida de cada día guarda en data/esperado_dia.json la lluvia que el
pronóstico vigente esperaba para ese día en cada ciudad, y las alertas que lo
cubrían con su rango de milímetros. Esa foto no se modifica durante el día: sirve
para comparar, a cualquier hora, lo que se esperaba con lo que realmente llovió.
Uso: python3 tareas/esperado_dia.py [pron.json alternativo]
"""
import json, os, re, sys
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
SALIDA = 'data/esperado_dia.json'


def _base(n):
    return re.sub(r'\s*\(.*\)\s*$', '', str(n or '')).strip()


def observado_por_dia(path='data/lluvia.json'):
    """Lluvia medida por hora, agrupada por día y localidad (máximo entre estaciones de la misma localidad)."""
    try:
        L = json.load(open(path, encoding='utf-8'))
    except Exception:
        return {}
    cols = L.get('columnas') or []
    m = re.search(r'(\d{4})', str(L.get('actualizado') or '')) 
    anio = int(m.group(1)) if m else datetime.now(ART).year
    fechas = []
    dia = None
    for c in cols:
        md = re.match(r'\s*(\d{1,2})/(\d{1,2})\s+(\d{1,2})', str(c))
        if md:
            dia = (int(md.group(1)), int(md.group(2)))
            h = int(md.group(3))
        else:
            mh = re.match(r'\s*(\d{1,2})', str(c))
            h = int(mh.group(1)) if mh else None
        if dia is None or h is None:
            fechas.append(None); continue
        fechas.append(('%04d-%02d-%02d' % (anio, dia[1], dia[0]), h))
    out = {}
    for est in L.get('estaciones') or []:
        loc = _base(est.get('localidad'))
        for i, v in enumerate(est.get('valores') or []):
            if v is None or i >= len(fechas) or fechas[i] is None:
                continue
            f, h = fechas[i]
            arr = out.setdefault(f, {}).setdefault(loc, [None] * 24)
            arr[h] = max(float(v), arr[h] or 0.0)
    return out


def sumar_observado(reg, obs):
    """Completa reg['observado'] (por localidad, 24 horas) con lo medido; nunca baja un valor ya registrado."""
    d = obs.get(reg.get('fecha'))
    if not d:
        return False
    tab = reg.setdefault('observado', {})
    cambio = False
    for loc, arr in d.items():
        prev = tab.get(loc) or [None] * 24
        for h, v in enumerate(arr):
            if v is not None and (prev[h] is None or v > prev[h]):
                prev[h] = round(v, 2); cambio = True
        tab[loc] = prev
    return cambio


def registrar_alertas(reg, P, hoy):
    """Suma a reg['alertas_del_dia'] cada alerta vista que cubra el día (no se borran)."""
    ini = datetime.fromisoformat(hoy + 'T00:00:00-03:00')
    fin = ini + timedelta(days=1)
    lista = reg.setdefault('alertas_del_dia', [])
    vistas = {(a.get('nivel'), a.get('desde_iso'), a.get('hasta_iso'), str(a.get('zonas'))) for a in lista}
    nuevo = False
    for a in P.get('smn') or []:
        try:
            d = datetime.fromisoformat(a.get('desde_iso')) if a.get('desde_iso') else ini
            f = datetime.fromisoformat(a.get('hasta_iso')) if a.get('hasta_iso') else fin
        except Exception:
            continue
        if not (f > ini and d < fin) or a.get('incluye_corrientes') is False:
            continue
        k = (a.get('nivel'), a.get('desde_iso'), a.get('hasta_iso'), str(a.get('zonas')))
        if k in vistas:
            continue
        vistas.add(k)
        lista.append({x: a.get(x) for x in ('nivel', 'fenomeno', 'desde_iso', 'hasta_iso', 'zonas', 'rango_mm', 'incluye_capital', 'origen')})
        nuevo = True
    return nuevo


def main():
    ahora = datetime.now(ART)
    hoy = ahora.strftime('%Y-%m-%d')
    try:
        prev = json.load(open(SALIDA, encoding='utf-8'))
    except Exception:
        prev = {}
    try:
        P = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'data/pron.json', encoding='utf-8'))
    except Exception as e:
        print('Esperado del día: sin pronóstico (%s)' % e); return
    OBS = observado_por_dia()
    for hreg in (prev.get('historial') or [])[-3:]:
        sumar_observado(hreg, OBS)
    if prev.get('fecha') == hoy:
        # mismo día: se suman las alertas nuevas que cubren el día y la lluvia medida
        a1 = registrar_alertas(prev, P, hoy)
        if sumar_observado(prev, OBS) or a1 or True:
            json.dump(prev, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('Esperado del día: alertas y lluvia medida actualizadas')
        else:
            print('Esperado del día: ya registrado para ' + hoy)
        return
    hc = (P.get('horario_capital') or {}).get(hoy)
    cap_h = round(sum(float(x or 0) for x in hc), 1) if hc else None
    C = P.get('ciudades') or {}
    cap = C.get('Corrientes Capital') or {}
    clave = 'hoy'
    try:
        m = float((cap.get('manana') or {}).get('mm'))
        h = float((cap.get('hoy') or {}).get('mm'))
        if cap_h is not None and abs(m - cap_h) < 0.15 and abs(h - cap_h) >= 0.15:
            clave = 'manana'  # los valores por ciudad todavía están referidos al día anterior
    except Exception:
        pass
    ciudades = {}
    for n, v in C.items():
        try:
            ciudades[n] = round(float((v.get(clave) or {}).get('mm')), 1)
        except Exception:
            pass
    if cap_h is not None:
        ciudades['Corrientes Capital'] = cap_h
    ini = datetime.fromisoformat(hoy + 'T00:00:00-03:00')
    fin = ini + timedelta(days=1)
    alertas = []
    for a in P.get('smn') or []:
        try:
            d = datetime.fromisoformat(a.get('desde_iso')) if a.get('desde_iso') else ini
            f = datetime.fromisoformat(a.get('hasta_iso')) if a.get('hasta_iso') else fin
        except Exception:
            continue
        if f > ini and d < fin and a.get('incluye_corrientes') is not False:
            alertas.append({k: a.get(k) for k in ('nivel', 'fenomeno', 'desde_iso', 'hasta_iso', 'zonas', 'rango_mm', 'incluye_capital', 'origen')})
    hist = prev.get('historial', [])
    if prev.get('fecha'):
        sumar_observado(prev, OBS)
        hist.append({k: prev.get(k) for k in ('fecha', 'pronostico_de', 'ciudades', 'alertas', 'alertas_del_dia', 'observado', 'horario_capital')})
    nuevo_reg = {
        'fecha': hoy,
        'capturado': ahora.strftime('%d/%m/%Y, %H:%M h'),
        'pronostico_de': P.get('actualizado', ''),
        'explicacion': 'Lluvia esperada para el día según el pronóstico vigente al comenzar el día, y alertas que lo cubrían. No se modifica durante el día.',
        'ciudades': ciudades,
        'alertas': alertas,
        'historial': hist[-45:],
    }
    if hc:
        nuevo_reg['horario_capital'] = [round(float(x or 0), 2) for x in hc]
    sumar_observado(nuevo_reg, OBS)
    registrar_alertas(nuevo_reg, P, hoy)
    json.dump(nuevo_reg, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Esperado del día registrado: ' + hoy + ' (Capital: %s mm)' % ciudades.get('Corrientes Capital'))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('Esperado del día: error (%s)' % e)
