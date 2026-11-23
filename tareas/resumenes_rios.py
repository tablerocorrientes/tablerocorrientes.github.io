#!/usr/bin/env python3
"""Resúmenes breves de los ríos y del efecto tapón, redactados por GitHub con plantillas fijas.

Reemplaza la redacción que hacía la tarea B. Escribe en data/puertos.json:
  "nota_breve"    Paraná en Corrientes (altura, tendencia, distancia a la alerta) y puertos sobre la alerta.
  "uruguay_breve" Santo Tomé y Paso de los Libres (Salto Grande) y puertos sobre la alerta.
  "tapon_breve"   alertas del SMN para la Capital y la altura del río.
Las frases del pronóstico del INA no se inventan: se toman de "ina_parana_breve" e "ina_uruguay_breve",
que escribe la tarea A. La primera vez se rescatan de los textos breves anteriores. No hace commit.
"""
import json, os, re
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(RAIZ, 'data', 'puertos.json')
A = os.path.join(RAIZ, 'data', 'fuentes', 'smn_alertas_local.json')
DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']


def num(x):
    return ('%.2f' % x).replace('.', ',')


def cm(x):
    return int(round(abs(x) * 100))


def fecha_reg(s):
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?', s or '')
    if not m:
        return None, ''
    d = datetime(int(m[3]), int(m[2]), int(m[1]), int(m[4] or 0), int(m[5] or 0), tzinfo=ART)
    return d, ('%02d/%02d' % (d.day, d.month)) + (', %02d:%02d h' % (d.hour, d.minute) if m[4] else '')


def tendencia(v):
    if v is None or abs(v) < 0.02:
        return 'estable'
    return 'subiendo' if v > 0 else 'bajando'


def rescatar(texto):
    """Frase que menciona al INA dentro de un texto breve anterior."""
    for f in re.split(r'(?<=\.)\s+', texto or ''):
        if 'INA' in f:
            return f.strip()
    return ''


def sobre_alerta(lista, ahora, excluir=()):
    out = []
    for x in lista:
        d, _ = fecha_reg(x.get('registro'))
        if x.get('puerto') in excluir or not d or ahora - d > timedelta(days=3):
            continue
        if x.get('altura') is not None and x.get('alerta') and x['altura'] >= x['alerta']:
            out.append(x['puerto'])
    return out


def unir(n):
    return n[0] if len(n) == 1 else ', '.join(n[:-1]) + ' y ' + n[-1]


def hora_fin(dt):
    return (dt + timedelta(minutes=1)).hour if dt.minute == 59 else dt.hour


def main():
    ahora = datetime.now(ART)
    try:
        D = json.load(open(P, encoding='utf-8'))
    except Exception as e:
        print('resúmenes: no se pudo leer puertos.json (%s)' % e)
        return
    for k, viejo in (('ina_parana_breve', 'nota_breve'), ('ina_uruguay_breve', 'uruguay_breve')):
        if k not in D:
            D[k] = rescatar(D.get(viejo))
    cambios = []
    # Paraná
    pr = {x['puerto']: x for x in D.get('puertos') or []}
    c = pr.get('Corrientes')
    if c and c.get('altura') is not None:
        _, f = fecha_reg(c.get('registro'))
        dif = c['altura'] - c['alerta']
        t = 'Paraná en Corrientes: %s m (%s), %s y %s cm %s la alerta (%s m).' % (
            num(c['altura']), f, tendencia(c.get('variacion')), cm(dif), 'sobre' if dif >= 0 else 'debajo de', num(c['alerta']))
        s = sobre_alerta(D.get('puertos') or [], ahora, ('Corrientes',))
        if s:
            t += ' %s sigue%s sobre la alerta.' % (unir(s), 'n' if len(s) > 1 else '')
        if D.get('ina_parana_breve'):
            t += ' ' + D['ina_parana_breve']
        if t != D.get('nota_breve'):
            D['nota_breve'] = t; cambios.append('Paraná')
    # Uruguay
    ur = {x['puerto']: x for x in D.get('puertos_uruguay') or []}
    st, pl = ur.get('Santo Tomé'), ur.get('Paso de los Libres')
    if st and pl:
        _, f = fecha_reg(st.get('registro'))
        def det(x):
            v = x.get('variacion') or 0
            return '%s %s m%s' % (x['puerto'], num(x['altura']), ' (%s %s cm)' % ('subió' if v > 0 else 'bajó', cm(v)) if abs(v) >= 0.1 else '')
        bajo = all(x['altura'] < x['alerta'] for x in (st, pl))
        t = 'Al %s: %s y %s, %s (Salto Grande).' % (f, det(st), det(pl), 'ambos bajo la alerta' if bajo else 'con la alerta superada')
        s = sobre_alerta(D.get('puertos_uruguay') or [], ahora, ('Santo Tomé', 'Paso de los Libres'))
        if s:
            t += ' %s sobre la alerta.' % unir(s)
        if D.get('ina_uruguay_breve'):
            t += ' ' + D['ina_uruguay_breve']
        if t != D.get('uruguay_breve'):
            D['uruguay_breve'] = t; cambios.append('Uruguay')
    # Efecto tapón: alertas del SMN para la Capital
    try:
        AL = json.load(open(A, encoding='utf-8')).get('alertas') or []
    except Exception:
        AL = []
    cap = []
    for a in AL:
        if not a.get('incluye_capital') or not a.get('desde_iso') or not a.get('hasta_iso'):
            continue
        d, h = datetime.fromisoformat(a['desde_iso']).astimezone(ART), datetime.fromisoformat(a['hasta_iso']).astimezone(ART)
        if h > ahora and d < ahora + timedelta(hours=48):
            cap.append((d, h, a))
    if c and c.get('altura') is not None:
        rio = 'Con el río en %s m' % num(c['altura'])
        if cap:
            cap.sort(key=lambda x: x[0])
            partes = []
            for d, h, a in cap:
                r = a.get('rango_mm')
                partes.append('%s de %d a %d h%s' % ({'amarillo': 'amarilla', 'rojo': 'roja'}.get(a.get('nivel'), a.get('nivel') or 'alerta'), d.hour, hora_fin(h), ' (%d a %d mm)' % tuple(r) if r else ''))
            d0 = cap[0][0]
            t = 'Alerta por %s para la Capital el %s %02d/%02d: %s. %s, una lluvia fuerte puede superar la capacidad de los desagües.' % (
                cap[0][2].get('fenomeno') or 'tormentas', DIAS[d0.weekday()], d0.day, d0.month, ', luego '.join(partes), rio)
        else:
            t = 'Sin alerta del SMN para la Capital en las próximas 48 horas. %s, el riesgo de anegamiento depende de la intensidad de la lluvia.' % rio
        if t != D.get('tapon_breve'):
            D['tapon_breve'] = t; cambios.append('tapón')
    if not cambios:
        print('resúmenes de los ríos: sin cambios')
        return
    with open(P, 'w', encoding='utf-8') as fo:
        json.dump(D, fo, ensure_ascii=False, indent=1)
    print('resúmenes de los ríos actualizados: %s' % ', '.join(cambios))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('resúmenes de los ríos: error (%s)' % e)
