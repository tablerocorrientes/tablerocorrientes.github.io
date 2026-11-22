#!/usr/bin/env python3
"""Prensa automática del Tablero Ciudadano, sin intervención de las tareas de Claude.

Busca en Google Noticias (canal RSS público) las notas de las últimas 48 horas sobre la crecida, la lluvia,
los evacuados, Yacyretá y Defensa Civil en Corrientes, y las agrega al principio de "prensa" de
data/puertos.json con {"fecha", "medio", "titulo", "enlace", "breve", "auto": true}. Usa solo el título y el
medio (no copia el texto de las notas). No repite notas ya cargadas y conserva las 60 más recientes.
No hace commit.
"""
import email.utils, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(RAIZ, 'data', 'puertos.json')
CONSULTAS = ['crecida río Paraná Corrientes', 'evacuados Corrientes', 'anegamiento lluvia Corrientes',
             'Defensa Civil Corrientes', 'Yacyretá caudal', 'río Uruguay crecida Corrientes', 'El Niño Corrientes lluvias']
TEMA = re.compile(r'evacu|crecid|rio parana|rio uruguay|anega|inund|lluvia|tormenta|temporal|defensa civil|yacyret|caudal|el nino|alerta|desborde|sudestada|altura del rio|repunte|bajante|autoevacu', re.I)
LUGAR = re.compile(r'corrientes|itati|goya|esquina|bella vista|paso de la patria|empedrado|san cosme|ituzaingo|santo tome|paso de los libres|monte caseros|apipe|lavalle|saladas|alvear|la cruz|yapeyu|riachuelo|santa ana', re.I)
FUERA = re.compile(r'momarandu com|futbol|torneo|clasific|velez|boca|river|basquet|horoscopo|receta|novela|farandula', re.I)


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]', '', s)


def rss(q):
    u = 'https://news.google.com/rss/search?q=' + urllib.parse.quote(q + ' when:2d') + '&hl=es-419&gl=AR&ceid=AR:es-419'
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
        except Exception as e:
            err = e
            time.sleep(5 * (i + 1))
    raise err


def main():
    try:
        D = json.load(open(P, encoding='utf-8'))
    except Exception as e:
        print('prensa: no se pudo leer puertos.json (%s)' % e)
        return 0
    prensa = D.get('prensa') or []
    vistos = {norm(x.get('titulo', ''))[:70] for x in prensa} | {x.get('enlace') for x in prensa}
    ahora = datetime.now(ART)
    nuevas = []
    for q in CONSULTAS:
        try:
            r = ET.fromstring(rss(q))
        except Exception as e:
            print('prensa: consulta "%s" sin respuesta (%s)' % (q, e))
            continue
        for it in r.iter('item'):
            titulo = (it.findtext('title') or '').strip()
            medio = (it.findtext('source') or '').strip()
            if medio and titulo.endswith(' - ' + medio):
                titulo = titulo[:-len(' - ' + medio)].strip()
            enlace = (it.findtext('link') or '').strip()
            try:
                f = email.utils.parsedate_to_datetime(it.findtext('pubDate')).astimezone(ART)
            except Exception:
                continue
            if ahora - f > timedelta(hours=48):
                continue
            t = norm(titulo + ' ' + medio)
            tt = norm(titulo)
            if not TEMA.search(tt) or not LUGAR.search(tt) or FUERA.search(tt) or (re.search(r'brasil|rio grande do sul|santa fe|entre rios|chaco', tt) and 'corrientes' not in tt):
                continue
            k = norm(titulo)[:70]
            if k in vistos or enlace in vistos:
                continue
            vistos.add(k); vistos.add(enlace)
            nuevas.append({'fecha': f.strftime('%d/%m/%Y'), 'medio': medio or 'Prensa', 'titulo': titulo, 'enlace': enlace,
                           'breve': titulo if len(titulo) <= 200 else titulo[:197] + '...', 'auto': True, '_t': f.isoformat()})
    if not nuevas:
        print('prensa: sin notas nuevas en 48 horas')
        return 0
    nuevas.sort(key=lambda x: x['_t'], reverse=True)
    for x in nuevas:
        x.pop('_t', None)
    D['prensa'] = (nuevas + prensa)[:60]
    D['prensa_actualizada'] = ahora.strftime('%d/%m/%Y, %H:%M h')
    with open(P, 'w', encoding='utf-8') as fo:
        json.dump(D, fo, ensure_ascii=False, indent=1)
    print('prensa: %d notas nuevas (%s)' % (len(nuevas), ', '.join(sorted({x['medio'] for x in nuevas}))[:200]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
