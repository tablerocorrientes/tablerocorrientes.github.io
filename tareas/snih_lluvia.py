# Lluvia medida del SNIH para el Tablero Ciudadano de Corrientes.
# Script del autor del tablero, usado por las tareas A, B y C (Texto W2, puntos 1 b, 2 y 3).
# Uso:  python3 /tmp/sitio/tareas/snih_lluvia.py [--solo-condicion]
# Hace consultas de solo lectura al SNIH (datos públicos oficiales) y escribe
# data/lluvia.json y data/obs.json. No hace commit: eso lo hace la tarea.
# --solo-condicion: solo informa si hay lluvia en curso (0,5 mm o más en 3 horas), sin escribir.
# Imprime al final una línea JSON con el resumen. Código de salida 2 si el SNIH no respondió.
import json, re, sys, datetime, urllib.request, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(RAIZ, 'data')
URL = 'https://snih.hidricosargentina.gob.ar/MuestraDatos.aspx/LeerUltimosRegistros'
AR = datetime.timezone(datetime.timedelta(hours=-3))
ICAA, C13805 = 283906, 13805


def consulta(est, d1, d2):
    body = ('{fechaDesde: "%s" , fechaHasta: "%s" , estacion:"%s", codigo:"20" }' % (d1, d2, est)).encode()
    req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
    j = json.load(urllib.request.urlopen(req, timeout=40))
    out = {}
    for m in (j.get('d') or {}).get('Mediciones') or []:
        ms = int(re.search(r'-?\d+', m['FechaHora']).group())
        v = [x['Valor'] for x in m['Mediciones'] if x['Codigo'] == 20]
        if v and v[0] is not None:
            h = datetime.datetime.fromtimestamp(ms / 1000, AR).replace(minute=0, second=0, microsecond=0)
            out[h] = out.get(h, 0) + v[0]
    return out


def num(v):
    return ('%g' % v).replace('.', ',')


def guardar(nombre, obj):
    with open(os.path.join(DATA, nombre), 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def main():
    solo = '--solo-condicion' in sys.argv
    ahora = datetime.datetime.now(AR)
    ts = ahora.strftime('%d/%m/%Y, %H:%M h')
    ult = ahora.replace(minute=0, second=0, microsecond=0)
    horas = [ult - datetime.timedelta(hours=23 - i) for i in range(24)] + [ult + datetime.timedelta(hours=1)]
    L = json.load(open(os.path.join(DATA, 'lluvia.json'), encoding='utf-8'))
    d1 = (ahora - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    d2 = (ahora + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    series, fallas = {}, []
    for e in L['estaciones']:
        try:
            series[e['codigo']] = consulta(e['codigo'], d1, d2)
        except Exception as ex:
            fallas.append('%s: %s' % (e['codigo'], ex))
    if not series:
        if not solo:
            L['consultado'] = ts
            L['consulta_resultado'] = 'SNIH sin respuesta'
            guardar('lluvia.json', L)
        print(json.dumps({'resultado': 'SNIH sin respuesta', 'error': fallas[:2]}, ensure_ascii=False))
        sys.exit(2)
    lluvia3 = []
    for e in L['estaciones']:
        m = series.get(e['codigo'])
        if m is None:
            continue
        s3 = sum(v for h, v in m.items() if ult - datetime.timedelta(hours=2) <= h <= ult + datetime.timedelta(hours=1))
        if s3 >= 0.5:
            lluvia3.append({'localidad': e['localidad'], 'estacion': e['estacion'], 'mm_3h': round(s3, 2)})
    if solo:
        print(json.dumps({'resultado': 'consulta ok', 'lluvia_en_curso': bool(lluvia3), 'estaciones': lluvia3}, ensure_ascii=False))
        return
    # Punto 2: lluvia de la provincia
    def lab(i, h):
        s = ('%s %02d h' % (h.strftime('%d/%m'), h.hour)) if (i == 0 or h.hour == 0) else '%02d h' % h.hour
        return s + (' (en curso)' if i == 24 else '')
    viejo = json.dumps(L['estaciones'], sort_keys=True)
    L['columnas'] = [lab(i, h) for i, h in enumerate(horas)]
    for e in L['estaciones']:
        m = series.get(e['codigo'])
        if m is None:
            continue  # sin respuesta para esa estación: se conservan sus datos anteriores
        vals = [(round(m[h], 2) if h in m else None) for h in horas]
        e['valores'] = vals
        comp = [v for v in vals[:24] if v is not None]
        e['total'] = round(sum(comp), 2) if comp else None
        idx = [i for i, v in enumerate(vals) if v is not None]
        e['ultimo'] = ('%s mm a las %02d h' % (num(vals[idx[-1]]), horas[idx[-1]].hour)) if idx else 'sin datos en las últimas 24 horas'
    nuevos = json.dumps(L['estaciones'], sort_keys=True) != viejo
    h0, h23 = horas[0], horas[23]
    L['nota'] = ('Ventana de 24 horas completas, de %02d h del %s a %02d h del %s (hora de Argentina), más la hora en curso '
                 'como última columna, con los datos recibidos hasta el momento. El total suma solo las 24 horas completas. '
                 'Las horas sin transmisión figuran como null, no como cero.') % (h0.hour, h0.strftime('%d/%m'), h23.hour, h23.strftime('%d/%m'))
    if nuevos:
        L['actualizado'] = ts
    L['consultado'] = ts
    L['consulta_resultado'] = 'datos nuevos' if nuevos else 'sin cambios'
    guardar('lluvia.json', L)
    # Punto 3: lluvia observada en la Capital (indicador compuesto)
    O = json.load(open(os.path.join(DATA, 'obs.json'), encoding='utf-8'))
    dia = ahora.date()
    I, C = series.get(ICAA, {}), series.get(C13805, {})
    ri, rc, reg, cob = {}, {}, {}, {}
    for hh in range(24):
        h = datetime.datetime(dia.year, dia.month, dia.day, hh, tzinfo=AR)
        a, b = I.get(h), C.get(h)
        if a is not None:
            ri[str(hh)] = round(a, 2)
        if b is not None:
            rc[str(hh)] = round(b, 2)
        if a is None and b is None:
            continue
        if a is not None and b is not None:
            reg[str(hh)] = round(max(a, b), 2)
        else:
            reg[str(hh)] = round(a if a is not None else b, 2)
            cob[str(hh)] = 'solo ICAA' if a is not None else 'solo Corrientes 13805'
    uh = max(int(k) for k in reg) if reg else None
    mm = reg[str(uh)] if uh is not None else None
    est = None if mm is None else ('seca' if mm < 0.5 else 'debil' if mm <= 2.5 else 'moderada' if mm <= 10 else 'fuerte')
    O.update({'dia': dia.isoformat(), 'registros': reg, 'registros_icaa': ri, 'registros_13805': rc, 'cobertura': cob,
              'indicador': 'compuesto: máximo horario de ICAA y Corrientes 13805', 'ultima_hora': uh, 'mm': mm,
              'estado': est, 'ts': int(ahora.timestamp() * 1000),
              'fuente': 'SNIH, indicador compuesto (máximo horario de ICAA y Corrientes 13805)'})
    guardar('obs.json', O)
    con = [e for e in L['estaciones'] if e.get('total') is not None]
    top = max(con, key=lambda e: e['total']) if con else None
    print(json.dumps({'resultado': L['consulta_resultado'], 'estaciones_ok': len(series), 'estaciones_sin_respuesta': len(fallas),
                      'lluvia_en_curso': bool(lluvia3), 'estaciones_lluvia_3h': lluvia3,
                      'capital_ultima_hora': uh, 'icaa_mm': ri.get(str(uh)) if uh is not None else None,
                      'c13805_mm': rc.get(str(uh)) if uh is not None else None, 'estado': est,
                      'max_24h': {'localidad': top['localidad'], 'estacion': top['estacion'], 'total': top['total']} if top else None},
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
