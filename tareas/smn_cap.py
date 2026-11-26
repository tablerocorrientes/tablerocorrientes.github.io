#!/usr/bin/env python3
"""Alertas y avisos del SMN para Corrientes, leídos del canal oficial CAP del SMN (estándar internacional
de alertas, https://ssl.smn.gob.ar/CAP/AR.php). Reemplazó a la tarea F, que leía las alertas desde la computadora del autor (anulada).

Cada alerta trae su polígono: se marca qué departamentos de Corrientes cubre comprobando si la ciudad
cabecera de cada departamento queda dentro del polígono. Los avisos a muy corto plazo traen además los
departamentos por nombre. Nivel: Moderate = amarillo, Severe = naranja, Extreme = rojo.

Escribe data/fuentes/smn_alertas_local.json con el mismo formato que usa el sitio. No hace commit.
"""
import json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'data', 'fuentes', 'smn_alertas_local.json')
FEED = 'https://ssl.smn.gob.ar/CAP/AR.php'
UA = {'User-Agent': 'Mozilla/5.0 (TableroCiudadano; +https://tablerocorrientes.github.io)'}
NIVEL = {'Minor': 'amarillo', 'Moderate': 'amarillo', 'Severe': 'naranja', 'Extreme': 'rojo'}
# cabecera de cada departamento de Corrientes (lat, lon)
DEPTOS = {
    'Capital': (-27.47, -58.83), 'San Cosme': (-27.37, -58.51), 'Itatí': (-27.27, -58.24), 'Berón de Astrada': (-27.55, -57.54),
    'General Paz': (-27.75, -57.62), 'San Miguel': (-27.99, -57.59), 'Ituzaingó': (-27.59, -56.69), 'Santo Tomé': (-28.55, -56.04),
    'General Alvear': (-29.10, -56.55), 'San Martín': (-29.17, -56.65), 'Paso de los Libres': (-29.71, -57.09),
    'Monte Caseros': (-30.25, -57.64), 'Curuzú Cuatiá': (-29.79, -58.05), 'Sauce': (-30.08, -58.79), 'Esquina': (-30.01, -59.53),
    'Goya': (-29.14, -59.26), 'Lavalle': (-28.99, -59.10), 'San Roque': (-28.57, -58.71), 'Bella Vista': (-28.51, -59.04),
    'Saladas': (-28.25, -58.62), 'Mburucuyá': (-28.05, -58.23), 'Concepción': (-28.39, -57.89), 'San Luis del Palmar': (-27.51, -58.56),
    'Empedrado': (-27.95, -58.81), 'Mercedes': (-29.18, -58.08)}
SIN_TILDE = str.maketrans('ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')


def bajar(u):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
        except Exception as e:
            err = e
            time.sleep(4 * (i + 1))
    raise err


def dentro(lat, lon, poly):
    """Punto en polígono (rayo horizontal). poly: lista de (lat, lon)."""
    c = False
    n = len(poly)
    for i in range(n):
        y1, x1 = poly[i]; y2, x2 = poly[i - 1]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / ((y2 - y1) or 1e-12) + x1:
            c = not c
    return c


def txt(el, tag):
    for e in el.iter():
        if e.tag.split('}')[-1] == tag:
            return (e.text or '').strip()
    return ''


def fmt(dt):
    return dt.astimezone(ART).strftime('%d/%m/%Y, %H:%M h') if dt else ''


def leer_alerta(xml):
    r = ET.fromstring(xml)
    info = next((e for e in r.iter() if e.tag.split('}')[-1] == 'info'), None)
    if info is None:
        return None
    deps = set()
    area_desc = ''
    for area in [e for e in info.iter() if e.tag.split('}')[-1] == 'area']:
        area_desc += ' ' + txt(area, 'areaDesc')
        for p in [e for e in area.iter() if e.tag.split('}')[-1] == 'polygon']:
            pts = [tuple(float(v) for v in par.split(',')[:2]) for par in (p.text or '').split() if ',' in par]
            if len(pts) >= 3:
                for d, (la, lo) in DEPTOS.items():
                    if dentro(la, lo, pts):
                        deps.add(d)
    m = re.search(r'CORRIENTES:\s*([^.]*)', area_desc.translate(SIN_TILDE).upper())
    if m:
        nombres = [x.strip() for x in m.group(1).split(' - ')]
        for d in DEPTOS:
            dn = d.translate(SIN_TILDE).upper()
            if any(dn == x or dn.replace('GENERAL', 'GRAL') == x for x in nombres) or (d == 'Capital' and 'CORRIENTES' in nombres):
                deps.add(d)
    if not deps:
        return None
    def fecha(tag):
        s = txt(info, tag)
        try:
            return datetime.fromisoformat(s) if s else None
        except ValueError:
            return None
    sent = fecha('sent')
    if not sent and txt(r, 'sent'):
        sent = datetime.fromisoformat(txt(r, 'sent'))
    onset, exp = fecha('onset'), fecha('expires')
    desc = txt(info, 'description')
    rg = re.search(r'entre (\d+) y (\d+) ?mm', desc)
    corto = 'avisocortoplazo' in (txt(info, 'web') or '') or txt(info, 'urgency') == 'Immediate'
    nivel = NIVEL.get(txt(info, 'severity'))
    return {
        'tipo': 'aviso a muy corto plazo' if corto else 'alerta',
        'nivel': nivel,
        'fenomeno': (txt(info, 'event') or txt(info, 'headline')).lower(),
        'zonas': ' - '.join(sorted(deps)),
        'departamentos': sorted(deps),
        'incluye_capital': 'Capital' in deps,
        'desde': fmt(onset or sent),
        'hasta': fmt(exp),
        'desde_iso': (onset or sent).isoformat() if (onset or sent) else None,
        'hasta_iso': exp.isoformat() if exp else None,
        'emision': fmt(sent),
        'rango_mm': [int(rg.group(1)), int(rg.group(2))] if rg else None,
        'texto': (txt(info, 'headline') + '. ' + desc)[:400],
    }


def main():
    ahora = datetime.now(ART)
    via = 'directa'
    cache = {}
    try:
        canal = ET.fromstring(bajar(FEED))
    except Exception as e:
        relevo = os.environ.get('SMN_RELEVO', '').strip()
        if not relevo:
            print('SMN (CAP) sin respuesta directa (%s) y sin relevo configurado. Se conserva la lectura anterior.' % e)
            return 0
        try:
            j = json.loads(bajar(relevo + ('&' if '?' in relevo else '?') + 'modo=smn'))
            canal = ET.fromstring(j['canal'].encode('utf-8'))
            cache = j.get('items') or {}
            via = 'relevo'
        except Exception as e2:
            print('SMN (CAP) sin respuesta, ni directa ni por el relevo (%s). Se conserva la lectura anterior.' % e2)
            return 0
    enlaces = [it.findtext('link') for it in canal.iter('item') if it.findtext('link')]
    alertas, vistos = [], set()
    for u in enlaces:
        try:
            if via == 'relevo':
                if u not in cache:
                    continue
                xml = cache[u].encode('utf-8')
            else:
                xml = bajar(u)
            a = leer_alerta(xml)
        except Exception as e:
            print('aviso: %s (%s)' % (u, e))
            continue
        if not a:
            continue
        if a['hasta_iso'] and datetime.fromisoformat(a['hasta_iso']) < ahora:
            continue
        k = (a['tipo'], a['nivel'], a['fenomeno'], a['desde_iso'], a['hasta_iso'], a['zonas'])
        if k in vistos:
            continue
        vistos.add(k)
        alertas.append(a)
    # unir las zonas de una misma alerta repartida en varios polígonos
    uni = {}
    for a in alertas:
        k = (a['tipo'], a['nivel'], a['fenomeno'], a['desde_iso'], a['hasta_iso'])
        if k in uni:
            d = sorted(set(uni[k]['departamentos']) | set(a['departamentos']))
            uni[k].update(departamentos=d, zonas=' - '.join(d), incluye_capital='Capital' in d)
        else:
            uni[k] = a
    alertas = sorted(uni.values(), key=lambda a: (a['desde_iso'] or '', a['tipo']))
    out = {
        'consultado': ahora.strftime('%d/%m/%Y, %H:%M h'),
        'consultado_iso': ahora.isoformat(timespec='seconds'),
        'fuente': 'Servicio Meteorológico Nacional, canal oficial de alertas y avisos (CAP)',
        'resultado': 'con alertas' if alertas else 'sin alertas para Corrientes',
        'alertas': alertas,
    }
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('SMN (CAP, lectura %s): %d alertas o avisos para Corrientes, de %d publicados en el país' % (via, len(alertas), len(enlaces)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
