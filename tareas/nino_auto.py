#!/usr/bin/env python3
"""El Niño (data/nino.json): actualización automática desde la discusión mensual de NOAA CPC.

Lee data/fuentes/noaa_enso.txt (la descarga "Fuentes oficiales"), extrae la fecha de emisión, el índice Niño 3.4,
las probabilidades y la fecha del próximo informe, y, si la emisión es más nueva que la guardada, reemplaza la
entrada de NOAA en "proyecciones" y las tarjetas de NOAA en "indicadores". No interpreta ni inventa: si no logra
extraer un dato, no escribe y lo informa. Las demás fuentes (OMM, IRI, BoM, SMN, INA, EBY) siguen a cargo de la
tarea A. Imprime una línea de estado: ACTUALIZADO, SIN CAMBIOS o REVISAR. No hace commit.
"""
import json, os, re, sys
from datetime import datetime, timedelta, timezone

ART = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NINO = os.path.join(RAIZ, 'data', 'nino.json')
FUENTE = os.path.join(RAIZ, 'data', 'fuentes', 'noaa_enso.txt')
URL = 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc_Sp.html'
MESES = {m: i + 1 for i, m in enumerate('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split())}
MESES['setiembre'] = 9
MESES['deciembre'] = 12  # error de tipeo que aparece en la traducción de NOAA
FECHA = r'(\d{1,2}) de (%s) de (\d{4})' % '|'.join(MESES)


def fecha(m):
    return datetime(int(m.group(3)), MESES[m.group(2).lower()], int(m.group(1)))


def main():
    if not os.path.exists(FUENTE):
        print('REVISAR: falta data/fuentes/noaa_enso.txt'); return 0
    t = open(FUENTE, encoding='utf-8', errors='replace').read()
    t = re.sub(r'\s+', ' ', t)
    m = re.search(r'Traducci[oó]n cortes[ií]a del:.{0,60}?' + FECHA, t) or re.search(r'DISCUSI[OÓ]N DIAGN[OÓ]STICA.{0,300}?' + FECHA, t, re.I)
    if not m:
        print('REVISAR: no se encontró la fecha de emisión de NOAA'); return 0
    emi = fecha(m)
    n = json.load(open(NINO, encoding='utf-8'))
    ant = None
    for p in n['proyecciones']:
        if p['organismo'].startswith('NOAA, Centro'):
            ant = p
    if ant is None:
        print('REVISAR: nino.json no tiene entrada de NOAA CPC'); return 0
    f_ant = datetime.strptime(ant['fecha'], '%d/%m/%Y')
    if emi <= f_ant:
        print('SIN CAMBIOS: NOAA CPC %s ya cargada' % ant['fecha']); return 0
    # extracción
    nino34 = re.search(r'alcanzando\s*\+?([\d.,]+)\s*°?C en Ni[ñn]o-3\.4', t)
    prob_fuerte = re.search(r'probabilidad mayor al (\d+)\s*%', t)
    prob_hist = re.search(r'evento hist[oó]rico.{0,200}?es ahora de ~?\s*(\d+)\s*%', t)
    prox = re.search(r'pr[oó]xima Discusi[oó]n Diagn[oó]stica del ENSO est[aá] programada para el ' + FECHA, t)
    estatus = re.search(r'Estatus del Sistema de alerta del ENSO:\s*(Advertencia de El Ni[ñn]o|Vigilancia de El Ni[ñn]o|Aviso de El Ni[ñn]o|Advertencia de La Ni[ñn]a|Vigilancia de La Ni[ñn]a|Neutral[^.]{0,30}|No hay [^.]{0,40})', t)
    falta = [k for k, v in (('Niño 3.4', nino34), ('probabilidad fuerte', prob_fuerte), ('evento histórico', prob_hist), ('próximo informe', prox), ('estatus', estatus)) if not v]
    if falta or 'Advertencia de El Ni' not in estatus.group(1):
        print('REVISAR: NOAA publicó una emisión nueva (%s) pero no se pudo extraer con certeza: %s. Estatus: %s. Revisar a mano.'
              % (emi.strftime('%d/%m/%Y'), ', '.join(falta) or 'cambió el estatus', estatus.group(1) if estatus else '?'))
        return 0
    idx = nino34.group(1).replace('.', ',')
    ph, pf = prob_hist.group(1), prob_fuerte.group(1)
    sprox = fecha(prox).strftime('%d/%m/%Y')
    fe = emi.strftime('%d/%m/%Y')
    ant.update({'fecha': fe, 'url': URL,
                'breve': ('El Niño sigue activo (advertencia de NOAA). Niño 3.4 en +%s °C. Fuerte o muy fuerte con probabilidad de más de %s %% '
                          'hasta enero-marzo de 2027 y %s %% de chance de que sea el más intenso desde 1950. Próximo informe: %s.') % (idx, pf, ph, sprox)})
    dd, mm = emi.strftime('%d'), emi.strftime('%m')
    for ind in n['indicadores']:
        if ind['t'] == 'Pacífico (Niño 3.4)':
            ind['v'] = '+%s °C' % idx; ind['s'] = 'sobre lo normal, NOAA %s/%s' % (dd, mm)
        elif ind['t'] == 'Evento histórico':
            ind['v'] = '%s %%' % ph
        elif ind['t'] == 'Fuerte o muy fuerte':
            ind['v'] = '+%s %%' % pf
    n['actualizado'] = datetime.now(ART).strftime('%d/%m/%Y, %H:%M h')
    json.dump(n, open(NINO, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ACTUALIZADO: NOAA CPC %s (antes %s); Niño 3.4 +%s °C. Revisar el "breve" general y las fases en la tarea A.' % (fe, ant['fecha'] if False else f_ant.strftime('%d/%m/%Y'), idx))
    return 0


if __name__ == '__main__':
    sys.exit(main())
