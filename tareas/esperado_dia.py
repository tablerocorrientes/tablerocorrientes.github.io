#!/usr/bin/env python3
"""Lo que se esperaba para hoy: una foto del pronóstico tomada al comienzo de cada día.

En la primera corrida de cada día guarda en data/esperado_dia.json la lluvia que el
pronóstico vigente esperaba para ese día en cada ciudad, y las alertas que lo
cubrían con su rango de milímetros. Esa foto no se modifica durante el día: sirve
para comparar, a cualquier hora, lo que se esperaba con lo que realmente llovió.
Uso: python3 tareas/esperado_dia.py [pron.json alternativo]
"""
import json, os, sys
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
SALIDA = 'data/esperado_dia.json'


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
    if prev.get('fecha') == hoy:
        # mismo día: solo se suman al registro las alertas nuevas que cubren el día
        if registrar_alertas(prev, P, hoy):
            json.dump(prev, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('Esperado del día: alertas del día actualizadas')
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
        hist.append({k: prev.get(k) for k in ('fecha', 'pronostico_de', 'ciudades', 'alertas', 'alertas_del_dia')})
    nuevo_reg = {
        'fecha': hoy,
        'capturado': ahora.strftime('%d/%m/%Y, %H:%M h'),
        'pronostico_de': P.get('actualizado', ''),
        'explicacion': 'Lluvia esperada para el día según el pronóstico vigente al comenzar el día, y alertas que lo cubrían. No se modifica durante el día.',
        'ciudades': ciudades,
        'alertas': alertas,
        'historial': hist[-45:],
    }
    registrar_alertas(nuevo_reg, P, hoy)
    json.dump(nuevo_reg, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Esperado del día registrado: ' + hoy + ' (Capital: %s mm)' % ciudades.get('Corrientes Capital'))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('Esperado del día: error (%s)' % e)
