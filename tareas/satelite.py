#!/usr/bin/env python3
"""Imagen satelital GOES-19 (NOAA) para el tablero.

Toma la imagen más reciente del sector Sudamérica Sur, canal 13, la recorta
sobre Corrientes y actualiza assets/sat.jpg y data/sat.json. Si la imagen
publicada ya es la más reciente, no hace nada. Nunca falla con error: ante
cualquier problema informa y termina sin tocar los archivos.
"""
import io, json, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/13/"
PAT = re.compile(r'(\d{11})_GOES19-ABI-ssa-13-1800x1080\.jpg')
ART = timezone(timedelta(hours=-3))


def bajar(url, t=40):
    req = urllib.request.Request(url, headers={"User-Agent": "TableroCiudadanoCorrientes/1.0"})
    with urllib.request.urlopen(req, timeout=t) as r:
        return r.read()


def main():
    try:
        from PIL import Image
    except Exception:
        print("Satélite: falta Pillow, sin cambios"); return
    try:
        listado = bajar(BASE).decode("utf-8", "replace")
    except Exception as e:
        print("Satélite: listado sin respuesta (%s), sin cambios" % e); return
    nombres = sorted(set(PAT.findall(listado)))
    if not nombres:
        print("Satélite: listado sin imágenes, sin cambios"); return
    clave = nombres[-1]
    cap = datetime.strptime(clave, "%Y%j%H%M").replace(tzinfo=timezone.utc)
    cap_iso = cap.strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        actual = json.load(open("data/sat.json", encoding="utf-8"))
    except Exception:
        actual = {}
    if actual.get("captura_utc") and actual["captura_utc"] >= cap_iso:
        print("Satélite: ya está la imagen más reciente (%s), sin cambios" % actual.get("captura")); return
    nombre = clave + "_GOES19-ABI-ssa-13-1800x1080.jpg"
    try:
        img = Image.open(io.BytesIO(bajar(BASE + nombre, 60))).convert("RGB")
    except Exception as e:
        print("Satélite: imagen sin respuesta (%s), sin cambios" % e); return
    img.crop((560, 200, 1160, 580)).save("assets/sat.jpg", "JPEG", quality=82)
    ahora = datetime.now(ART)
    json.dump({
        "url": "/assets/sat.jpg",
        "captura_utc": cap_iso,
        "captura": cap.astimezone(ART).strftime("%d/%m/%Y, %H:%M h"),
        "fuente": "NOAA/NESDIS/STAR, satélite GOES-19, ABI canal 13, sector Sudamérica Sur (archivo %s)" % nombre,
        "origen": BASE + nombre,
        "actualizado": ahora.strftime("%d/%m/%Y, %H:%M h"),
    }, open("data/sat.json", "w", encoding="utf-8"), ensure_ascii=False)
    print("Satélite: imagen renovada, captura %s" % cap.astimezone(ART).strftime("%d/%m/%Y %H:%M"))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Satélite: error inesperado (%s), sin cambios" % e)
    sys.exit(0)
