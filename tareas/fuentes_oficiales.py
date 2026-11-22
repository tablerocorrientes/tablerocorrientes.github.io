"""Descarga de solo lectura de las páginas oficiales de alertas (SMN y COE de Corrientes).
Guarda el texto en data/fuentes/ para que las tareas lo lean sin depender del navegador web.
Lo ejecuta la automatización "Fuentes oficiales" de GitHub."""
import json, re, html, datetime, urllib.request, urllib.parse, os

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 (Tablero Ciudadano de Corrientes)',
      'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'es-AR,es;q=0.9'}
BASE = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT = os.path.join(BASE, 'fuentes')
os.makedirs(OUT, exist_ok=True)
AR = datetime.timezone(datetime.timedelta(hours=-3))
ahora = datetime.datetime.now(AR)

def _pdf_texto(b):
    """Texto de un PDF (órdenes del día, versiones taquigráficas, boletines). Requiere pypdf."""
    try:
        import io
        from pypdf import PdfReader
        rd = PdfReader(io.BytesIO(b))
        partes = []
        for i, p in enumerate(rd.pages[:80]):
            partes.append('[Página ' + str(i + 1) + ']\n' + (p.extract_text() or ''))
        return '<!-- pdf -->' + '\n'.join(partes)
    except Exception as e:
        return '<!-- pdf -->PDF sin texto extraíble (' + str(e)[:120] + ')'

def _get(url, headers, t):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=t) as r:
        b = r.read()
        if b[:5] == b'%PDF-':
            return r.status, _pdf_texto(b)
        return r.status, b.decode('utf-8', 'replace')

NAV = dict(UA, **{'Referer': 'https://www.google.com/', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site',
                  'Sec-Fetch-Dest': 'document', 'Upgrade-Insecure-Requests': '1', 'Cache-Control': 'no-cache'})

def bajar(url, t=30, alternativas=False):
    """Descarga directa; si el sitio rechaza la consulta y se piden alternativas: encabezados de navegador,
    versión AMP de la nota y la copia pública del Archivo de Internet (web.archive.org)."""
    try:
        return _get(url, UA, t)
    except Exception as e:
        if not alternativas:
            raise
        err = e
    intentos = [(url, NAV)]
    base = url.rstrip('/')
    intentos += [(base + '/amp', NAV), (base + '?amp=1', NAV), (base + '?outputType=amp', NAV)]
    intentos += [('https://web.archive.org/web/2026id_/' + url, UA)]
    for u, hd in intentos:
        try:
            st, h = _get(u, hd, t)
            if len(h) > 2000:
                return st, ('<!-- leído desde: ' + u + ' -->') + h
        except Exception as e2:
            err = e2
    h = relevo(url, t)
    if h:
        return 200, h
    raise err

def relevo(url, t=40):
    """Lectura mediante el relevo de Google (secreto SMN_RELEVO) para sitios que rechazan a GitHub."""
    base = os.environ.get('SMN_RELEVO', '').strip()
    if not base:
        return None
    try:
        q = base + ('&' if '?' in base else '?') + 'u=' + urllib.parse.quote(url, safe='')
        with urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=t + 30) as r:
            j = json.loads(r.read().decode('utf-8', 'replace'))
        if j.get('b64'):
            import base64
            return _pdf_texto(base64.b64decode(j['b64']))
        h = j.get('texto') or ''
        return ('<!-- leído mediante el relevo de Google -->' + h) if len(h) > 500 else None
    except Exception:
        return None

CTES = ('CORRIENTES', 'PASO DE LOS LIBRES', 'PASO_DE_LOS_LIBRES', 'MONTE CASEROS', 'MONTE_CASEROS',
        'ITUZAINGO', 'MERCEDES', 'GOYA', 'SANTO TOME', 'SANTO_TOME', 'CURUZU', 'ESQUINA', 'BELLA VISTA', 'RESISTENCIA')

def filtrar_smn(nombre, t):
    lineas = t.split('\n')
    if 'horarios' in nombre:
        cab = lineas[:3]
        return '\n'.join(cab + [l for l in lineas[3:] if any(c in l.upper() for c in CTES)])
    if 'pronostico' in nombre:
        out, guardar = lineas[:4], False
        for l in lineas:
            if re.fullmatch(r'[A-Z_ ]{3,}', l.strip()):
                guardar = any(c in l for c in CTES)
            if guardar:
                out.append(l)
        return '\n'.join(out)
    return t

def rioparana(pagina):
    """La página completa las alturas desde su servicio de datos; se leen de ahí y se arma una tabla por puerto."""
    nombres = dict(re.findall(r'data-station="([^"]+)"><a class="st-name"[^>]*>([^<]+)</a>', pagina))
    st, js = bajar('https://api.rioparana.com.ar/public/river')
    datos = json.loads(js)
    filas, ult = [], None
    for r in datos:
        if not isinstance(r.get('level'), (int, float)):
            continue
        n = html.unescape(nombres.get(r.get('stationId'), r.get('stationId', '')))
        al = r.get('alertLevel')
        ts = r.get('timestamp') or ''
        if ts and (ult is None or ts > ult):
            ult = ts
        fila = n + ': ' + ('%.2f' % r['level']).replace('.', ',') + ' m'
        if isinstance(al, (int, float)):
            fila += ' (alerta ' + ('%.2f' % al).replace('.', ',') + ' m' + (', SOBRE ALERTA' if r['level'] >= al else '') + ')'
        for k in ('variation', 'change', 'delta', 'trend'):
            if r.get(k) is not None:
                fila += ', ' + k + ': ' + str(r[k])
        fila += ', lectura ' + ts
        filas.append(fila)
    cab = 'Alturas de Prefectura Naval Argentina reproducidas por rioparana.com.ar (servicio de datos api.rioparana.com.ar). Última lectura: ' + (ult or 's/d') + ' (hora UTC si termina en Z).'
    return cab + '\n\n' + '\n'.join(filas) + '\n\nDatos completos:\n' + json.dumps(datos, ensure_ascii=False)[:20000]

def texto(h):
    h = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', h)
    h = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h\d>|</tr>', '\n', h)
    h = html.unescape(re.sub(r'<[^>]+>', ' ', h))
    lineas = [re.sub(r'[ \t\r\f\v]+', ' ', l).strip() for l in h.split('\n')]
    return '\n'.join(l for l in lineas if l)[:60000]

urls = {
    'smn_alertas': 'https://www.smn.gob.ar/alertas',
    'smn_alertas_corto_plazo': 'https://www.smn.gob.ar/avisos_a_muy_corto_plazo',
    'coe_inicio': 'https://coe.corrientes.gob.ar/',
    # Ríos y pronóstico publicados por organismos y medios autorizados
    'ina_reporte_diario': 'https://alerta.ina.gob.ar/a5/diario/reporte_diario',
    'rioparana_alturas': 'https://www.rioparana.com.ar',
    'prefectura_alturas': 'https://contenidosweb.prefecturanaval.gob.ar/alturas/',
    'lanacion_clima_corrientes': 'https://www.lanacion.com.ar/clima/corrientes/',
    'noaa_enso': 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc_Sp.html',
    # Datos abiertos y servicios de datos del SMN (pensados para consultas automáticas)
    'smn_datos_alertas': 'https://ws.smn.gob.ar/alerts/type/AL',
    'smn_datos_avisos_cp': 'https://ws.smn.gob.ar/alerts/type/AC',
    'smn_datos_tiempo_presente': 'https://ws.smn.gob.ar/map_items/weather',
    'smn_datos_horarios_ayer': 'https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=observaciones/datohorario' + (ahora - datetime.timedelta(days=1)).strftime('%Y%m%d') + '.txt',
    'smn_pronostico_5_dias': 'https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=pron5d/pron' + ahora.strftime('%Y%m%d') + '.txt',
    'smn_pronostico_5_dias_ayer': 'https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=pron5d/pron' + (ahora - datetime.timedelta(days=1)).strftime('%Y%m%d') + '.txt',
}
# Páginas de alertas del COE ya registradas en el tablero
try:
    pron = json.load(open(os.path.join(BASE, 'pron.json'), encoding='utf-8'))
    smn = pron.get('smn')
    lista = smn.get('alertas', []) if isinstance(smn, dict) else (smn or [])
    for a in lista:
        u = (a or {}).get('url') or ''
        if u.startswith('https://coe.corrientes.gob.ar/'):
            urls['coe_' + re.sub(r'[^A-Za-z0-9]+', '_', u.rsplit('/', 1)[-1])] = u
except Exception as e:
    print('pron.json no legible:', e)

indice = {'consultado': ahora.strftime('%d/%m/%Y, %H:%M h'), 'consultado_iso': ahora.isoformat(timespec='minutes'), 'paginas': {}}
for nombre, url in urls.items():
    r = {'url': url}
    try:
        st, h = bajar(url)
        if nombre == 'rioparana_alturas':
            h = rioparana(h)
        t = h if nombre == 'rioparana_alturas' else filtrar_smn(nombre, h) if nombre.startswith('smn_') and 'opendata' in url else (h[:60000] if h.lstrip()[:1] in '[{' else texto(h))
        # Enlaces internos del COE a partes y alertas, para seguirlos en la próxima consulta
        if nombre == 'coe_inicio':
            enl = sorted(set('https://coe.corrientes.gob.ar' + x if x.startswith('/') else x
                             for x in re.findall(r'href="((?:https://coe\.corrientes\.gob\.ar)?/a/[^"#?]+)"', h)))
            enl.sort(reverse=True)
            r['enlaces'] = enl[:80]
        open(os.path.join(OUT, nombre + '.txt'), 'w', encoding='utf-8').write(
            'Fuente: ' + url + '\nConsultado: ' + indice['consultado'] + '\n\n' + t)
        r.update(estado=st, caracteres=len(t), archivo='data/fuentes/' + nombre + '.txt')
    except Exception as e:
        r.update(estado='error', detalle=str(e)[:200])
    indice['paginas'][nombre] = r
    print(nombre, r.get('estado'), r.get('caracteres', r.get('detalle')))

# Partes y alertas recientes del COE enlazados en su inicio (hasta 6)
for u in [x for x in indice['paginas'].get('coe_inicio', {}).get('enlaces', []) if re.search(r'/a/|alerta|parte|informe', x, re.I)][:6]:
    nombre = 'coe_' + re.sub(r'[^A-Za-z0-9]+', '_', u.split('coe.corrientes.gob.ar/', 1)[1]).strip('_')[:60]
    if nombre in indice['paginas']:
        continue
    r = {'url': u}
    try:
        st, h = bajar(u)
        t = texto(h)
        open(os.path.join(OUT, nombre + '.txt'), 'w', encoding='utf-8').write(
            'Fuente: ' + u + '\nConsultado: ' + indice['consultado'] + '\n\n' + t)
        r.update(estado=st, caracteres=len(t), archivo='data/fuentes/' + nombre + '.txt')
    except Exception as e:
        r.update(estado='error', detalle=str(e)[:200])
    indice['paginas'][nombre] = r
    print(nombre, r.get('estado'))

# Páginas pedidas por la tarea que disparó la corrida (notas de prensa, partes municipales, etc.)
pedidas = [u for u in re.split(r'\s+', os.environ.get('URLS', '').strip()) if u.startswith('http')][:25]
if pedidas:
    WEB = os.path.join(OUT, 'web')
    os.makedirs(WEB, exist_ok=True)
    indice['pedidas'] = {}
    for u in pedidas:
        nombre = re.sub(r'[^A-Za-z0-9]+', '_', re.sub(r'^https?://(www\.)?', '', u)).strip('_')[:90]
        r = {'url': u}
        try:
            st, h = bajar(u, alternativas=True)
            via = re.match(r'<!-- leído desde: (\S+) -->', h)
            if via:
                r['leido_desde'] = via.group(1)
            if h.startswith('<!-- pdf -->'):
                t = h[len('<!-- pdf -->'):][:150000]
            else:
                t = h[:60000] if h.lstrip()[:1] in '[{' else texto(h)
            open(os.path.join(WEB, nombre + '.txt'), 'w', encoding='utf-8').write(
                'Fuente: ' + u + '\nConsultado: ' + indice['consultado'] + '\n\n' + t)
            r.update(estado=st, caracteres=len(t), archivo='data/fuentes/web/' + nombre + '.txt')
        except Exception as e:
            r.update(estado='error', detalle=str(e)[:200])
        indice['pedidas'][u] = r
        print('pedida', u, r.get('estado'))

# Notas que no se pudieron descargar: quedan pendientes para que la tarea F las lea desde la PC del autor
if pedidas:
    pp = os.path.join(OUT, 'pendientes_pc.json')
    try:
        pend = json.load(open(pp, encoding='utf-8'))
    except Exception:
        pend = {'pendientes': []}
    ya = {x['url'] for x in pend['pendientes']}
    for u, r in indice['pedidas'].items():
        if r.get('estado') != 200 and u not in ya:
            pend['pendientes'].append({'url': u, 'desde': indice['consultado'], 'error': r.get('detalle', '')})
    pend['pendientes'] = pend['pendientes'][-60:]
    json.dump(pend, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# Portadas de noticias (Munired y otras): lista de títulos con su dirección
def enlaces(h, base):
    dom = re.match(r'https?://[^/]+', base).group(0)
    vistos, filas = set(), []
    for href, txt in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.S):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', txt))).strip()
        if len(t) < 25:
            continue
        u = href if href.startswith('http') else dom + ('' if href.startswith('/') else '/') + href
        if not u.startswith(dom) or u in vistos:
            continue
        vistos.add(u)
        filas.append(t + ' | ' + u)
    return filas
try:
    port = json.load(open(os.path.join(OUT, 'portales.json'), encoding='utf-8'))['portales']
except Exception:
    port = []
PD = os.path.join(OUT, 'portales')
os.makedirs(PD, exist_ok=True)
indice['portales'] = {}
for pt in port:
    if pt.get('via') != 'github' and not os.environ.get('SMN_RELEVO'):
        continue
    r = {'url': pt['url']}
    try:
        st, h = bajar(pt['url'], alternativas=(pt.get('via') != 'github'))
        filas = enlaces(h, pt['url'])
        open(os.path.join(PD, pt['nombre'] + '.txt'), 'w', encoding='utf-8').write(
            'Portada: ' + pt['url'] + '\nConsultado: ' + indice['consultado'] + '\n' + ('Leído por GitHub' if pt.get('via') == 'github' else 'Leído por GitHub mediante el relevo de Google') + '\n\n' + '\n'.join(filas))
        r.update(estado=st, notas=len(filas), archivo='data/fuentes/portales/' + pt['nombre'] + '.txt')
    except Exception as e:
        r.update(estado='error', detalle=str(e)[:200])
    indice['portales'][pt['nombre']] = r
    print('portal', pt['nombre'], r.get('estado'), r.get('notas'))

# Sin páginas pedidas en esta corrida (por ejemplo, la vigilancia automática): conservar las pedidas por la corrida anterior
if not pedidas:
    try:
        _prev = json.load(open(os.path.join(OUT, 'indice.json'), encoding='utf-8'))
        if _prev.get('pedidas'):
            indice['pedidas'] = _prev['pedidas']
            indice['pedidas_consultado'] = _prev.get('pedidas_consultado', _prev.get('consultado'))
    except Exception:
        pass
else:
    indice['pedidas_consultado'] = indice['consultado']
json.dump(indice, open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
