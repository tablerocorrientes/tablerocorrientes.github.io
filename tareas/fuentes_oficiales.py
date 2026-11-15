"""Descarga de solo lectura de las páginas oficiales de alertas (SMN y COE de Corrientes).
Guarda el texto en data/fuentes/ para que las tareas lo lean sin depender del navegador web.
Lo ejecuta la automatización "Fuentes oficiales" de GitHub."""
import json, re, html, datetime, urllib.request, os

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 (Tablero Ciudadano de Corrientes)',
      'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'es-AR,es;q=0.9'}
BASE = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT = os.path.join(BASE, 'fuentes')
os.makedirs(OUT, exist_ok=True)
AR = datetime.timezone(datetime.timedelta(hours=-3))
ahora = datetime.datetime.now(AR)

def bajar(url, t=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=t) as r:
        return r.status, r.read().decode('utf-8', 'replace')

def texto(h):
    h = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', h)
    h = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h\d>|</tr>', '\n', h)
    h = html.unescape(re.sub(r'<[^>]+>', ' ', h))
    lineas = [re.sub(r'[ \t\r\f\v]+', ' ', l).strip() for l in h.split('\n')]
    return '\n'.join(l for l in lineas if l)[:60000]

urls = {
    'smn_alertas': 'https://www.smn.gob.ar/alertas',
    'smn_alertas_corto_plazo': 'https://www.smn.gob.ar/alertas-corto-plazo',
    'coe_inicio': 'https://coe.corrientes.gob.ar/',
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
        t = h[:60000] if h.lstrip()[:1] in '[{' else texto(h)
        # Enlaces internos del COE a partes y alertas, para seguirlos en la próxima consulta
        if nombre == 'coe_inicio':
            enl = sorted(set('https://coe.corrientes.gob.ar' + x if x.startswith('/') else x
                             for x in re.findall(r'href="((?:https://coe\.corrientes\.gob\.ar)?/a/[^"#?]+)"', h)))
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

json.dump(indice, open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
