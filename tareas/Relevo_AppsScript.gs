/**
 * RELEVO DEL TABLERO CIUDADANO (Google Apps Script)
 * Lee desde los servidores de Google las páginas que rechazan a los servidores de GitHub
 * (alertas y avisos del SMN en formato CAP) y se las entrega a la automatización del Tablero.
 * Solo atiende pedidos con la clave y solo a los sitios permitidos.
 */
var CLAVE = 'CAMBIAR_POR_UNA_CLAVE_LARGA';
var CANAL_SMN = 'https://ssl.smn.gob.ar/CAP/AR.php';
var PERMITIDOS = ['ssl.smn.gob.ar', 'www.smn.gob.ar'];

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.k !== CLAVE) return salida_({error: 'clave'});
  if (p.modo === 'smn') return salida_(smn_());
  var u = String(p.u || ''), m = u.match(/^https:\/\/([^\/]+)/);
  if (!m || PERMITIDOS.indexOf(m[1]) < 0) return salida_({error: 'sitio no permitido'});
  return salida_({u: u, texto: bajar_(u)});
}

function smn_() {
  var canal = bajar_(CANAL_SMN), items = {};
  var enlaces = (canal.match(/<link>[^<]+<\/link>/g) || []).map(function (x) { return x.replace(/<\/?link>/g, ''); })
    .filter(function (u) { return u.indexOf('/feeds/CAP/') >= 0; });
  var pedidos = enlaces.map(function (u) { return {url: u, muteHttpExceptions: true, headers: {'User-Agent': 'Mozilla/5.0'}}; });
  var resp = pedidos.length ? UrlFetchApp.fetchAll(pedidos) : [];
  resp.forEach(function (r, i) { if (r.getResponseCode() === 200) items[enlaces[i]] = r.getContentText('UTF-8'); });
  return {canal: canal, items: items, leido: new Date().toISOString()};
}

function bajar_(u) {
  var r = UrlFetchApp.fetch(u, {muteHttpExceptions: true, followRedirects: true, headers: {'User-Agent': 'Mozilla/5.0'}});
  return r.getContentText('UTF-8');
}

function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Prueba manual desde el editor: Ejecutar > probar. Debe mostrar cuántos avisos leyó. */
function probar() {
  var r = smn_();
  Logger.log('Canal: ' + r.canal.length + ' caracteres; avisos leídos: ' + Object.keys(r.items).length);
}
