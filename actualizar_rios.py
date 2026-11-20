#!/usr/bin/env python3
"""Actualiza lecturas del Paraná sin modificar pronósticos, alertas ni Uruguay.
Fuente: API de Río Paraná que reproduce mediciones PNA.
Ejecutar desde la raíz del repositorio. --dry-run no escribe archivos.
"""
import argparse
import datetime as dt
import json
import math
import pathlib
import sys
import urllib.request
from zoneinfo import ZoneInfo

BASE = pathlib.Path(__file__).resolve().parents[1] / 'data'
API = 'https://api.rioparana.com.ar/public/river'
AR = ZoneInfo('America/Argentina/Buenos_Aires')
UTC = dt.timezone.utc
IDS = {'Ituzaingó':'ituzaingo','Itá Ibaté':'ita-ibate','Itatí':'itati',
       'Paso de la Patria':'paso-de-la-patria','Corrientes':'corrientes',
       'Empedrado':'empedrado','Bella Vista':'bella-vista','Goya':'goya','Esquina':'esquina'}
NOMBRES = {v:k for k,v in IDS.items()}

def cargar(nombre):
    with (BASE/nombre).open(encoding='utf-8') as f: return json.load(f)

def guardar(nombre, obj):
    destino = BASE/nombre
    tmp = destino.with_suffix(destino.suffix+'.tmp')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    tmp.replace(destino)

def fecha_iso(s):
    if not isinstance(s,str): raise ValueError('Fecha no válida')
    d=dt.datetime.fromisoformat(s.replace('Z','+00:00'))
    if d.tzinfo is None: raise ValueError('Falta zona horaria')
    return d.astimezone(AR)

def parse_registro(s):
    # Fechas antiguas sin hora oficial no son comparables con exactitud.
    try:
        if 'hora no publicada' in s: return None
        return dt.datetime.strptime(s[:16],'%d/%m/%Y, %H:%M').replace(tzinfo=AR)
    except (ValueError,TypeError): return None

def ejecutar(dry_run=False,archivo=None):
    ahora=dt.datetime.now(AR)
    consulta=ahora.strftime('%d/%m/%Y, %H:%M h')
    p,h,v,b=(cargar(n) for n in ('puertos.json','hist.json','prov.json','barrio.json'))
    errores=[]; novedades=[]
    try:
        if archivo:
            datos=json.loads(pathlib.Path(archivo).read_text(encoding='utf-8'))
        else:
            req=urllib.request.Request(API,headers={'User-Agent':'TableroCiudadano/1.0','Accept':'application/json'})
            with urllib.request.urlopen(req,timeout=25) as res: datos=json.load(res)
        if not isinstance(datos,list): raise ValueError('Respuesta de API no es una lista')
        por_id={x.get('stationId'):x for x in datos if isinstance(x,dict)}
        cambios={}
        for item in p['puertos']:
            nombre=item['puerto']; id_=IDS.get(nombre)
            if not id_: continue
            x=por_id.get(id_)
            if not x: errores.append(f'{nombre}: sin lectura');continue
            valor=x.get('level')
            if isinstance(valor,bool) or not isinstance(valor,(int,float)) or not math.isfinite(valor) or not 0<=valor<=40:
                errores.append(f'{nombre}: altura inválida');continue
            try: obs=fecha_iso(x.get('timestamp'))
            except (ValueError,TypeError): errores.append(f'{nombre}: fecha inválida');continue
            if obs>ahora+dt.timedelta(minutes=10) or ahora-obs>dt.timedelta(hours=48):
                errores.append(f'{nombre}: lectura fuera de ventana temporal');continue
            previo=parse_registro(item.get('registro',''))
            # No retroceder a una observación anterior; si no hay hora anterior,
            # aceptar solo una lectura de fecha posterior a la fecha previa.
            if previo and obs<=previo: continue
            if not previo:
                try: anterior=dt.datetime.strptime(item.get('registro','')[:10],'%d/%m/%Y').date()
                except ValueError: anterior=None
                if anterior and obs.date()<=anterior: continue
            cambios[nombre]=(round(float(valor),2),obs,x)
        for item in p['puertos']:
            nombre=item['puerto']
            if nombre not in cambios:continue
            valor,obs,x=cambios[nombre]
            previo=item.get('altura')
            item['altura']=valor
            # Variación observada entre los dos valores almacenados; no es cambio diario.
            if isinstance(previo,(int,float)):
                item['variacion']=round(valor-previo,2)
            item['registro']=obs.strftime('%d/%m/%Y, %H:%M h')
            item['fuente']='Prefectura Naval Argentina, reproducida por rioparana.com.ar ('+obs.strftime('%d/%m/%Y, %H:%M h')+')'
            novedades.append(nombre)
        for serie in h['series']:
            if serie.get('rio')!='Paraná' or serie.get('puerto') not in cambios:continue
            valor,obs,_=cambios[serie['puerto']]
            marca=obs.strftime('%Y-%m-%dT%H:%M:%S')
            if not any(isinstance(le,list) and le and le[0]==marca for le in serie.get('lecturas',[])):
                serie.setdefault('lecturas',[]).append([marca,valor,'verificado'])
        for loc in v['localidades']:
            if loc.get('rio')!='Paraná':continue
            nombre='Corrientes' if loc.get('n')=='Corrientes Capital' else loc.get('n')
            if nombre in cambios:
                valor,obs,_=cambios[nombre]
                loc['altura']=valor
                loc['reg']=obs.strftime('%d/%m/%Y, %H:%M h')+' (Prefectura Naval Argentina, vía rioparana.com.ar)'
        if 'Corrientes' in cambios:
            valor,obs,_=cambios['Corrientes']
            b['rio']['altura']=valor
            b['rio']['actualizado']=obs.strftime('%d/%m/%Y, %H:%M h')+', Prefectura Naval Argentina (vía rioparana.com.ar)'
        p['consultado']=consulta
        p['ultimo_intento']=consulta
        p['consulta_resultado']='datos nuevos' if novedades else ('fuente sin respuesta' if errores else 'sin cambios')
        if novedades:
            p['actualizado']=consulta
            h['actualizado']=consulta
            h['repositorio']='Lecturas oficiales registradas por las tareas del Tablero Ciudadano'
            h['verificacion']='Prefectura Naval Argentina, reproducida por rioparana.com.ar; observaciones fechadas por puerto'
            v['actualizado']=consulta
            b['actualizado']=consulta
        print('Consulta:',consulta,'| Actualizados:',', '.join(novedades) or 'ninguno')
        if errores: print('Advertencias:', '; '.join(errores),file=sys.stderr)
        if not dry_run:
            guardar('puertos.json',p)
            if novedades:
                for nombre,obj in [('hist.json',h),('prov.json',v),('barrio.json',b)]: guardar(nombre,obj)
        return 0
    except (OSError,ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:
        print('ERROR: fuente no disponible o respuesta inválida:',exc,file=sys.stderr)
        p['consultado']=consulta
        p['ultimo_intento']=consulta
        p['consulta_resultado']='fuente sin respuesta'
        if not dry_run: guardar('puertos.json',p)
        return 0  # Mantener último dato y registrar fallo sin romper otras tareas.

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--dry-run',action='store_true')
    ap.add_argument('--archivo',help='JSON de API local para pruebas')
    a=ap.parse_args()
    sys.exit(ejecutar(a.dry_run,a.archivo))
