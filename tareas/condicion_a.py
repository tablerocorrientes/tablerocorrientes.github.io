#!/usr/bin/env python3
"""Condición de la tarea A (desde el 26/11/2026 corre todos los días).

Imprime "CORRER: <motivo>" o "OMITIR: <motivo>".
Corre siempre que haya una alerta o aviso del SMN para Corrientes vigente o que empiece en las próximas
48 horas, o lluvia de 10 mm o más en 24 horas en una estación de la Capital. Sin esas condiciones, corre
todos los días: la actualización completa es diaria.
Con --forzar imprime siempre CORRER.
"""
import json, os, sys
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def leer(*p):
    try:
        return json.load(open(os.path.join(RAIZ, 'data', *p), encoding='utf-8'))
    except Exception:
        return {}


def main():
    ahora = datetime.now(ART)
    if '--forzar' in sys.argv:
        print('CORRER: corrida forzada'); return
    for a in leer('fuentes', 'smn_alertas_local.json').get('alertas') or []:
        try:
            h = datetime.fromisoformat(a['hasta_iso']) if a.get('hasta_iso') else ahora + timedelta(hours=1)
            d = datetime.fromisoformat(a['desde_iso']) if a.get('desde_iso') else ahora
        except Exception:
            continue
        if h > ahora and d < ahora + timedelta(hours=48):
            print('CORRER: %s %s del SMN (%s a %s)' % (a.get('tipo', 'alerta'), a.get('nivel') or '', a.get('desde', ''), a.get('hasta', ''))); return
    for e in leer('lluvia.json').get('estaciones') or []:
        if 'Corrientes Capital' in str(e.get('localidad', '')) and (e.get('total') or 0) >= 10:
            print('CORRER: lluvia de %s mm en 24 h en %s' % (e.get('total'), e.get('estacion') or e.get('localidad'))); return
    print('CORRER: actualización completa diaria')


if __name__ == '__main__':
    main()
