#!/usr/bin/env python3
"""¿Hay que mantener la vigilancia intensiva? Sale con código 0 si hay una alerta
vigente para Corrientes (pronóstico publicado o lectura del SMN desde Corrientes)
o si las estaciones registraron lluvia en las últimas 3 horas; 1 en caso contrario."""
import json, re, sys, time
from datetime import datetime, timezone, timedelta

ART = timezone(timedelta(hours=-3))
ahora = datetime.now(ART)

def leer(p):
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return {}

def fecha(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    m = re.search(r'(\d{2})/(\d{2})/(\d{4}),?\s*(\d{1,2}):(\d{2})', s)
    if m:
        return datetime(int(m[3]), int(m[2]), int(m[1]), int(m[4]), int(m[5]), tzinfo=ART)
    return None

motivos = []
for a in leer('data/pron.json').get('smn', []) or []:
    h = fecha(a.get('hasta_iso'))
    if a.get('incluye_corrientes') is not False and h and h > ahora:
        motivos.append('alerta %s hasta %s' % (a.get('nivel'), h.strftime('%d/%m %H:%M')))
loc = leer('data/fuentes/smn_alertas_local.json')
for a in loc.get('alertas', []) or []:
    h = fecha(a.get('hasta'))
    if a.get('nivel') and h and h > ahora:
        motivos.append('SMN %s hasta %s' % (a.get('nivel'), h.strftime('%d/%m %H:%M')))
obs = leer('data/obs.json')
reg = obs.get('registros') or {}
if obs.get('dia') == ahora.strftime('%Y-%m-%d'):
    recientes = [float(reg.get(str(h), 0) or 0) for h in range(max(0, ahora.hour - 3), ahora.hour + 1)]
    if any(v > 0 for v in recientes):
        motivos.append('lluvia registrada en las últimas 3 horas')

if motivos:
    print('Vigilancia necesaria: ' + '; '.join(motivos[:4]))
    sys.exit(0)
print('Sin alerta ni lluvia: vigilancia innecesaria')
sys.exit(1)
