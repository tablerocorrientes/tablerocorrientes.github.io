/* Tablero Ciudadano de Corrientes: carga de datos, menú, instalación y reportes */
(function(){
  'use strict';
  var EMAIL='tablerocorrientes@gmail.com';
  /* 1. Carga de datos: llena los bloques JSON y luego ejecuta el código de la página */
  function cargarDatos(){
    var bloques=[].slice.call(document.querySelectorAll('script[type="application/json"][data-src]'));
    var v=Math.floor(Date.now()/60000);
    return Promise.all(bloques.map(function(b){
      return fetch(b.getAttribute('data-src')+'?v='+v,{cache:'no-cache'})
        .then(function(r){if(!r.ok)throw new Error(r.status);return r.text();})
        .then(function(tx){b.textContent=tx;})
        .catch(function(){b.textContent='{}';});
    }));
  }
  /* 1 bis. Alertas del SMN leídas desde Corrientes (tarea F): si son más recientes que el pronóstico publicado, reemplazan a las del SMN */
  function fusionarSMN(){
    var el=document.getElementById('pron-data');if(!el)return Promise.resolve();
    return fetch('/data/fuentes/smn_alertas_local.json?v='+Math.floor(Date.now()/60000),{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(L){
      if(!L||!L.consultado_iso||!/alertas/.test(String(L.resultado||'')))return;var P;try{P=JSON.parse(el.textContent)||{};}catch(e){return;}
      var pa=/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})/.exec(P.actualizado||''),tP=pa?Date.parse(pa[3]+'-'+pa[2]+'-'+pa[1]+'T'+String(pa[4]).padStart(2,'0')+':'+pa[5]+':00-03:00'):0,tL=Date.parse(L.consultado_iso);
      if(!(tL>tP))return;
      var iso=function(s){var m=/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})/.exec(s||'');return m?m[3]+'-'+m[2]+'-'+m[1]+'T'+String(m[4]).padStart(2,'0')+':'+m[5]+':00-03:00':null;};
      var nuevas=(L.alertas||[]).filter(function(a){return a.nivel;}).map(function(a){return {nivel:String(a.nivel).toLowerCase(),fenomeno:a.fenomeno||'tormenta',zonas:[].concat(a.zonas||'Corrientes'),desde_iso:iso(a.desde),hasta_iso:iso(a.hasta),aviso:a.texto||'',incluye_corrientes:true,origen:'Servicio Meteorológico Nacional, página de alertas (emisión '+(a.emision||'')+', leída a las '+(L.consultado||'')+')'};});
      P.smn=(P.smn||[]).filter(function(a){return !/^Servicio Meteorol/.test(String(a.origen||''));}).concat(nuevas);P.smn_local=L.consultado;
      el.textContent=JSON.stringify(P);
    }).catch(function(){});
  }
  function ejecutarPagina(){
    var m=document.getElementById('main-js');if(!m)return;
    var s=document.createElement('script');s.textContent=m.textContent;document.body.appendChild(s);
  }
  /* 2. Menú común */
  var css='#tc-nav{position:sticky;top:env(safe-area-inset-top,0px);z-index:50;background:#0c3f52;color:#fff;font-family:Archivo,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2)}'+
  '#tc-nav .in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:4px;padding:6px 10px;overflow-x:auto;scrollbar-width:none}'+
  '#tc-nav a,#tc-nav button{flex:none;color:#fff;text-decoration:none;font:700 .82rem Archivo,system-ui,sans-serif;padding:7px 10px;border-radius:999px;border:0;background:transparent;cursor:pointer;white-space:nowrap}'+
  '#tc-nav a[aria-current=page]{background:#fff;color:#0c3f52}'+
  '#tc-nav .brand{font-weight:800;margin-right:4px;padding-left:2px;white-space:nowrap;flex:none}'+
  '#tc-nav .inst{background:#f29c38;color:#2a1600}'+
  '.tc-card{font-family:Archivo,system-ui,sans-serif;max-width:760px;margin:12px auto;border-radius:18px;padding:16px;box-sizing:border-box}'+
  '#tc-inst{background:linear-gradient(135deg,#0c3f52,#1f6f8b);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.18);margin:12px}'+
  '#tc-inst h2{margin:0 0 6px;font-size:1.15rem;letter-spacing:.02em}#tc-inst p{margin:0 0 10px;font-size:.9rem;line-height:1.4}'+
  '#tc-inst .b{display:flex;gap:8px;flex-wrap:wrap}#tc-inst button{font:800 .9rem Archivo,system-ui,sans-serif;border:0;border-radius:999px;padding:10px 16px;cursor:pointer}'+
  '#tc-inst .si{background:#fff;color:#0c3f52}#tc-inst .no{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)}'+
  '.tc-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'+
  '.tc-more{display:inline-block;border:0;background:none;color:#1f6f8b;font:800 .8rem Archivo,system-ui,sans-serif;padding:2px 0 6px;cursor:pointer}'+
  '#tc-reset{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:60;border:0;border-radius:999px;padding:11px 16px;background:#0c3f52;color:#fff;font:800 .88rem Archivo,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer}#tc-reset[hidden]{display:none}'+
  '.ag{border-radius:18px;padding:14px 16px;margin:10px 0;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:left}.ag{animation:agP 1.4s ease-in-out infinite}.ag-amarillo{animation-name:agPa}.ag-t{animation:agT 1.1s ease-in-out infinite}'+
  '.ag-t{font:900 2rem/1.05 Archivo,system-ui,sans-serif;letter-spacing:.01em}.ag-s{font-weight:900;font-size:1rem;margin:4px 0 8px;letter-spacing:.03em}.ag-r{font-size:1rem;margin-top:6px;line-height:1.35}'+
  '.ag-k{margin-top:10px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.18);font-size:.86rem;line-height:1.35}.ag-o{margin:8px 0 0;padding-left:18px;font-size:.88rem}.ag-f{margin-top:8px;font-size:.72rem;opacity:.85}'+
  '.ag-ini small,.ag-r small{display:block;font-size:.72rem;opacity:.85;margin-top:2px}.ag-z{margin:10px 0;padding:10px 12px;border-radius:14px;background:var(--card,#fff);border:1px solid var(--line,#ccd);font-size:.86rem}.ag-zr{border-left:5px solid;padding:6px 8px;margin-top:8px;border-radius:6px;background:rgba(0,0,0,.03)}'+
  '.tc-amp{display:inline-block;margin:6px 0 4px;padding:4px 10px;border-radius:999px;background:#ffd27a;color:#2b1d00;font:800 .76rem Archivo,system-ui,sans-serif;animation:tcAmp 1.6s ease-in-out infinite}@keyframes tcAmp{50%{opacity:.45;transform:scale(.97)}}@media (prefers-reduced-motion:reduce){.tc-amp{animation:none}}'+
  '.ag-h{display:flex;align-items:flex-end;gap:2px;height:36px;margin-top:6px}.ag-h i{flex:1;background:currentColor;opacity:.85;border-radius:2px 2px 0 0}.ag-hx{display:flex;justify-content:space-between;font-size:.66rem;opacity:.8}'+
  '@keyframes agPa{0%,100%{box-shadow:0 0 0 0 rgba(246,213,92,.9)}50%{box-shadow:0 0 0 12px rgba(246,213,92,0)}}@keyframes agT{0%,100%{opacity:1}50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.ag,.ag-t{animation:none}}'+
  '@keyframes agP{0%,100%{box-shadow:0 0 0 0 rgba(239,125,18,.8)}50%{box-shadow:0 0 0 10px rgba(239,125,18,0)}}'+
  '#tc-inst{margin:8px 12px!important;padding:8px!important}'+
  '#tc-inst .tc-blink{cursor:pointer;list-style:none;display:flex;gap:10px;align-items:center;background:linear-gradient(90deg,#ff9f1c,#ffcf4a);color:#2a1600;border-radius:14px;padding:10px 12px;animation:tcPulso 1.6s ease-in-out infinite}'+
  '#tc-inst .tc-blink b{display:block;font-size:.92rem;letter-spacing:.02em}#tc-inst .tc-blink small{display:block;font-size:.78rem;opacity:1}'+
  '#tc-inst .tc-blink .ic{font-size:1.8rem;line-height:1;animation:tcTit 1s steps(2,start) infinite}#tc-inst .tc-blink .fl{margin-left:auto;font-weight:900;font-size:1.4rem}'+
  '#tc-inst-d[open] .tc-blink{animation:none}#tc-inst-d[open] .tc-blink .fl{transform:rotate(90deg)}'+
  '@keyframes tcPulso{0%,100%{box-shadow:0 0 0 0 rgba(255,159,28,.85);filter:brightness(1)}50%{box-shadow:0 0 0 8px rgba(255,159,28,0);filter:brightness(1.12)}}'+
  '@keyframes tcTit{to{visibility:hidden}}'+
  '#tc-inst .tc-dev .si{display:block;width:100%;box-sizing:border-box;margin:6px 0 2px;background:#0c3f52;color:#fff}#tc-inst .tc-msg{font-size:.8rem;color:#13262d;margin:4px 0 0}#tc-inst .tc-msg:empty{display:none}'+
  '#tc-inst summary::after,#tc-inst summary::before{content:none!important}'+
  '#tc-inst-d{background:transparent!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important;color:#fff}#tc-inst .tc-dev{color:#13262d}#tc-inst .tc-dev p{color:#4a5b61;font-size:.8rem;margin:0 0 4px}#tc-inst summary::-webkit-details-marker{display:none}#tc-inst small{opacity:.9}#tc-inst .si{margin-top:4px}'+
  '#tc-inst ol{margin:6px 0 10px;padding-left:20px;font-size:.88rem;line-height:1.5}'+
  '#tc-rep{background:#f6f8f8;color:#13262d;border:1px solid #c6d2d5;margin:16px 12px 24px}'+
  '#tc-rep h2{margin:0 0 4px;font-size:1.15rem}#tc-rep .av{background:#fde7e5;border:1px solid #d64545;border-radius:10px;padding:8px 10px;font-size:.84rem;margin:8px 0 12px}'+
  '#tc-rep label{display:block;font-size:.84rem;font-weight:700;margin:10px 0 4px}#tc-rep input,#tc-rep select,#tc-rep textarea{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:9px 10px;border:1px solid #9fb2b8;border-radius:10px;background:#fff;color:#13262d}'+
  '#tc-rep textarea{min-height:90px}#tc-rep .ck{display:flex;gap:8px;align-items:flex-start;font-weight:400}#tc-rep .ck input{width:auto;margin-top:3px}'+
  '#tc-rep .env{margin-top:14px;font:800 1rem Archivo,system-ui,sans-serif;border:0;border-radius:999px;padding:12px 18px;background:#1f6f8b;color:#fff;cursor:pointer}'+
  '#tc-rep .s{font-size:.78rem;color:#4a5d64;margin:8px 0 0}'+
  '@media (prefers-color-scheme:dark){#tc-rep{background:#16252b;color:#e8f0f2;border-color:#2c444d}#tc-rep input,#tc-rep select,#tc-rep textarea{background:#0f1c21;color:#e8f0f2;border-color:#3b5862}#tc-rep .s{color:#a9bcc2}#tc-rep .av{background:#3a1d1d;border-color:#d64545}}'+
  '#tc-foot{text-align:center;font:400 .76rem Archivo,system-ui,sans-serif;color:#7d8e94;margin:0 12px 28px}';
  function estilo(){var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}
  var path=location.pathname.replace(/index\.html$/,'');
  function menu(){
    var items=[['/','Tablero'],['/barrio/','Mi barrio'],['/provincia/','Mi localidad']];
    var n=document.createElement('nav');n.id='tc-nav';n.setAttribute('aria-label','Menú principal');
    n.innerHTML='<div class="in"><span class="brand">Tablero Ctes</span>'+items.map(function(i){return '<a href="'+i[0]+'"'+(path===i[0]?' aria-current="page"':'')+'>'+i[1]+'</a>';}).join('')+'<a href="#tc-rep">Reportar</a><button class="inst" id="tc-inst-btn" type="button">📲 Instalar</button></div>';
    document.body.insertBefore(n,document.body.firstChild);
  }
  /* 3. Aviso de instalación */
  var ua=navigator.userAgent||'',dPrompt=null;
  var esIOS=/iphone|ipad|ipod/i.test(ua),inApp=/FBAN|FBAV|Instagram|FB_IAB|Line\//i.test(ua);
  var instalada=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function ocultadoReciente(){try{var t=+localStorage.getItem('tc-inst-no2');return t&&Date.now()-t<7*864e5;}catch(e){return false;}}
  var esAnd=/android/i.test(ua),esWin=/windows/i.test(ua),esMac=/macintosh/i.test(ua)&&!('ontouchend' in document);
  var SITIO='https://tablerocorrientes.github.io/';
  function accion(k,m){
    var es=k==='fb'?inApp:inApp?false:k==='and'?esAnd:k==='ios'?esIOS:(esWin||esMac||(!esAnd&&!esIOS));
    if(!es){
      var enl=SITIO+'#instalar';
      if(navigator.share&&(esAnd||esIOS)){navigator.share({title:'Tablero Ciudadano de Corrientes',text:'Cómo instalar el tablero',url:enl}).catch(function(){});}
      else{try{navigator.clipboard.writeText(enl).catch(function(){});}catch(e){}}
      m.innerHTML='Este botón funciona desde ese dispositivo. Abra allí <b>'+enl.replace('https://','')+'</b> y toque el botón nuevamente.';return;}
    if(instalada&&k!=='fb'){m.textContent='El tablero ya está instalado en este dispositivo. Lo encuentra entre sus aplicaciones.';return;}
    if(k==='and'||k==='win'){
      if(dPrompt){var dp=dPrompt;dPrompt=null;dp.prompt();dp.userChoice.then(function(c){m.textContent=c&&c.outcome==='accepted'?'Listo, el tablero quedó instalado.':'Instalación cancelada. Puede volver a intentarlo recargando la página.';});return;}
      if(k==='win'&&esMac&&!/chrome|edg/i.test(ua)){m.innerHTML='En Safari use el menú <b>Archivo</b>, <b>"Agregar al Dock"</b>.';return;}
      m.innerHTML='Su navegador no abrió la ventana de instalación. Use el menú <b>⋮</b> y elija <b>"Instalar aplicación"</b>. Si no aparece esa opción, es posible que ya lo tenga instalado.';return;}
    if(k==='ios'){
      if(navigator.share){navigator.share({title:'Tablero Ciudadano de Corrientes',url:SITIO}).catch(function(){});}
      m.innerHTML='En el menú que se abre, deslice hacia abajo, elija <b>"Agregar a inicio"</b> y luego <b>"Agregar"</b>.';return;}
    if(k==='fb'){
      if(esIOS)location.href='x-safari-'+SITIO;
      else if(esAnd)location.href='intent://tablerocorrientes.github.io/#Intent;scheme=https;end';
      m.innerHTML='Si no se abrió, toque los <b>tres puntos</b> y elija <b>"Abrir en el navegador"</b>.';}
  }
  function aviso(forzar){
    var g=document.getElementById('tc-inst');
    if(!g){
      g=document.createElement('section');g.id='tc-inst';g.className='tc-card';
      var P={
        and:['🤖 Android','<ol><li>Abra <b>tablerocorrientes.github.io</b> en <b>Chrome</b>.</li><li>Toque los <b>tres puntos ⋮</b>, arriba a la derecha.</li><li>Elija <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.</li><li>Confirme con <b>"Instalar"</b>. El ícono del tablero aparece junto a sus aplicaciones.</li></ol><p class="s">En Samsung Internet: menú ☰, <b>"Agregar página a"</b>, <b>"Pantalla de inicio"</b>.</p>'],
        ios:['🍎 iPhone y iPad','<ol><li>Abra <b>tablerocorrientes.github.io</b> en <b>Safari</b>.</li><li>Toque el botón <b>Compartir</b>, el cuadrado con la flecha hacia arriba, abajo de la pantalla.</li><li>Deslice hacia abajo y elija <b>"Agregar a inicio"</b> (o "Agregar a pantalla de inicio").</li><li>Toque <b>"Agregar"</b>, arriba a la derecha. El ícono queda en su pantalla de inicio.</li></ol>'],
        win:['💻 Windows y Mac','<ol><li>Abra <b>tablerocorrientes.github.io</b> en <b>Chrome</b> o <b>Edge</b>.</li><li>En Chrome, toque el ícono de <b>instalar</b> (pantalla con flecha) a la derecha de la barra de direcciones, o el menú <b>⋮</b>, <b>"Transmitir, guardar y compartir"</b>, <b>"Instalar página como aplicación"</b>.</li><li>En Edge, menú <b>…</b>, <b>"Aplicaciones"</b>, <b>"Instalar este sitio como una aplicación"</b>.</li><li>Confirme con <b>"Instalar"</b>. Queda en el menú Inicio y puede anclarlo a la barra de tareas.</li></ol><p class="s">En Mac con Safari: menú <b>Archivo</b>, <b>"Agregar al Dock"</b>.</p>'],
        fb:['📘 Si lo abrió desde Facebook o Instagram','<ol><li>Desde el navegador interno de Facebook o Instagram no se puede instalar.</li><li>Toque los <b>tres puntos</b>, arriba a la derecha.</li><li>Elija <b>"Abrir en el navegador"</b> (Chrome o Safari) y siga los pasos de su dispositivo.</li></ol>']};
      var BT={and:'📥 Instalar ahora en Android',ios:'📤 Abrir "Compartir" para agregar a inicio',win:'📥 Instalar ahora en la computadora',fb:'🌐 Abrir en el navegador'};
      var mio=inApp?'fb':esIOS?'ios':esAnd?'and':(esWin||esMac)?'win':'and';
      var orden=[mio].concat(['and','ios','win','fb'].filter(function(k){return k!==mio;}));
      g.innerHTML='<details id="tc-inst-d"><summary class="tc-blink"><span class="ic">📲</span><span><b>INSTALE EL TABLERO EN SU CELULAR O COMPUTADORA</b><small>Gratis, sin tienda de aplicaciones. Toque aquí y siga el paso a paso.</small></span><span class="fl">›</span></summary>'+
        '<div id="tc-inst-ya" style="margin:10px 0 0"></div>'+
        orden.map(function(k,i){return '<details class="tc-dev"'+(i===0?' open':'')+' style="margin-top:8px;border:1px solid #c9d8de;border-radius:12px;padding:8px 10px;background:#fff"><summary style="cursor:pointer;font-weight:800">'+P[k][0]+(i===0?' <small style="font-weight:600;color:#2f9e5b">(su dispositivo)</small>':'')+'</summary>'+P[k][1]+'<button class="si tc-act" type="button" data-k="'+k+'">'+BT[k]+'</button><p class="tc-msg" role="status"></p></details>';}).join('')+
        '<p class="s" style="margin-top:8px">Una vez instalado, se abre con un toque como cualquier aplicación y se actualiza solo.</p></details>';
      var nav=document.getElementById('tc-nav');nav.parentNode.insertBefore(g,nav.nextSibling);
      [].forEach.call(g.querySelectorAll('.tc-act'),function(b){b.onclick=function(){accion(b.dataset.k,b.nextElementSibling);};});
    }
    var ya=document.getElementById('tc-inst-ya');
    if(ya&&dPrompt&&!esIOS&&!inApp&&!ya.firstChild){ya.innerHTML='<button class="si" id="tc-si" type="button">Instalar ahora en este dispositivo</button>';document.getElementById('tc-si').onclick=function(){dPrompt.prompt();dPrompt.userChoice.then(function(c){});};}
    if(forzar){document.getElementById('tc-inst-d').open=true;g.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function guiaInicial(){aviso(location.hash==='#instalar');}
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dPrompt=e;if(document.getElementById('tc-inst'))aviso(false);});
  window.addEventListener('appinstalled',function(){instalada=true;var d=document.getElementById('tc-inst');if(d)d.remove();});
  /* 4. Reportes ciudadanos */
  var TIPOS=['Calle anegada','Agua dentro de viviendas','Desagüe tapado o colapsado','Evacuados o autoevacuados','Corte de calle o ruta','Crecida del río','Otro, vinculado a lluvias o crecida'];
  function reducir(file){return new Promise(function(ok,mal){var fr=new FileReader();fr.onerror=mal;fr.onload=function(){var im=new Image();im.onerror=mal;im.onload=function(){var M=1600,k=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',0.8).split(',')[1]);};im.src=fr.result;};fr.readAsDataURL(file);});}
  function reportes(cfg,barrios,locs){
    var s=document.createElement('section');s.id='tc-rep';s.className='tc-card';
    var opts=['<option value="">Elija su barrio o localidad</option>'];
    if(barrios.length)opts.push('<optgroup label="Corrientes Capital">'+barrios.map(function(b){return '<option>'+b+'</option>';}).join('')+'</optgroup>');
    if(locs.length)opts.push('<optgroup label="Provincia de Corrientes">'+locs.map(function(b){return '<option>'+b+'</option>';}).join('')+'</optgroup>');
    var URL_R=cfg.reportes_url||'';
    s.innerHTML='<h2>📣 Informe lo que observa en su barrio</h2><p style="margin:0;font-size:.9rem">Envíenos fotos y lo que ve sobre lluvias, calles anegadas, agua en viviendas, desagües colapsados o la crecida. <b>Puede hacerlo en forma anónima.</b> Cada reporte se valida contra los datos oficiales y entra al <b>modo de aprendizaje</b> del tablero: mejora sus inferencias, proyecciones y estimaciones con inteligencia artificial, y muestra la situación real de cada barrio.</p>'+
      '<button class="env" id="tc-abrir" type="button">Enviar fotos o un reporte</button>'+
      '<div id="tc-form" hidden>'+
      '<div class="av"><b>No es un servicio de emergencias ni un canal oficial.</b> Es una iniciativa ciudadana independiente. Si su vida o sus bienes corren peligro, llame a Defensa Civil al <b>103</b> o al <b>911</b>.</div>'+
      '<label for="tc-lu">Barrio o localidad</label><select id="tc-lu">'+opts.join('')+'</select>'+
      '<label for="tc-ti">Qué está pasando</label><select id="tc-ti"><option value="">Elija una opción</option>'+TIPOS.map(function(t){return '<option>'+t+'</option>';}).join('')+'</select>'+
      '<label for="tc-de">Descripción breve (calle, altura, desde cuándo)</label><textarea id="tc-de" maxlength="800"></textarea>'+
      (URL_R?'<label for="tc-fo">Fotos (hasta 4, opcional)</label><input id="tc-fo" type="file" accept="image/*" multiple><p class="s" id="tc-fon"></p>':'')+
      '<label for="tc-al">Nombre o alias (opcional; si lo deja vacío, el reporte es anónimo)</label><input id="tc-al" maxlength="60" placeholder="Anónimo">'+
      '<label for="tc-co">Contacto (opcional, solo si acepta que le respondamos)</label><input id="tc-co" maxlength="80">'+
      '<input id="tc-web" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">'+
      '<label class="ck"><input type="checkbox" id="tc-ok"> Acepto que la información y las fotos se usen, sin mis datos personales, para el análisis y la difusión sobre las lluvias y la crecida.</label>'+
      '<button class="env" id="tc-env" type="button">'+(URL_R?'Enviar reporte':'Enviar reporte por correo')+'</button>'+
      '<p class="s">'+(URL_R?'El reporte llega directamente a nuestro equipo; no hace falta tener correo en el celular.':'Se abrirá su aplicación de correo con el reporte listo; puede adjuntar fotos antes de enviarlo.')+' Una inteligencia artificial revisa cada reporte y sus fotos, y los compara con los datos oficiales; se publica solo un resumen, sin datos personales ni fotos. Datos tratados según la Ley 25.326 de Protección de Datos Personales.</p><p class="s" id="tc-msg" role="status" style="font-weight:700"></p></div>';
    var slot=document.getElementById('tc-rep-slot');if(slot)slot.appendChild(s);else document.body.appendChild(s);
    var f=document.createElement('p');f.id='tc-foot';f.innerHTML='Tablero Ciudadano de Corrientes, información de fuentes oficiales. Contacto: <a href="mailto:'+(cfg.email||EMAIL)+'">'+(cfg.email||EMAIL)+'</a>';document.body.appendChild(f);
    var ab=document.getElementById('tc-abrir'),fm=document.getElementById('tc-form');
    function abrir(){fm.hidden=false;ab.hidden=true;}
    ab.onclick=abrir;if(location.hash==='#tc-rep')abrir();
    window.addEventListener('hashchange',function(){if(location.hash==='#tc-rep')abrir();});
    var fo=document.getElementById('tc-fo');if(fo)fo.onchange=function(){var n=fo.files.length;document.getElementById('tc-fon').textContent=n>4?'Se enviarán solo las primeras 4 fotos.':(n?n+' foto'+(n>1?'s':'')+' elegida'+(n>1?'s':'')+'.':'');};
    var b=document.getElementById('tc-env');
    b.onclick=function(){
      var g=function(i){var e=document.getElementById(i);return e?(e.value||'').trim():'';},msg=document.getElementById('tc-msg');
      if(!g('tc-lu')||!g('tc-ti')||!g('tc-de')){msg.textContent='Complete el lugar, qué está pasando y la descripción.';return;}
      if(!document.getElementById('tc-ok').checked){msg.textContent='Para enviar el reporte, marque la autorización.';return;}
      var datos={nombre:g('tc-al')||'Anónimo',lugar:g('tc-lu'),tipo:g('tc-ti'),descripcion:g('tc-de'),contacto:g('tc-co'),web:g('tc-web'),fecha:new Date().toLocaleString('es-AR'),pagina:location.pathname};
      if(!URL_R){
        var asunto='Reporte ciudadano: '+datos.tipo+', '+datos.lugar;
        var cuerpo='Nombre o alias: '+datos.nombre+'\nLugar: '+datos.lugar+'\nQué está pasando: '+datos.tipo+'\nDescripción: '+datos.descripcion+'\nContacto: '+(datos.contacto||'no informado')+'\nAutorización de uso sin datos personales: sí\nFecha y hora del reporte: '+datos.fecha+'\n\n(Puede adjuntar fotos a este correo.)';
        location.href='mailto:'+(cfg.email||EMAIL)+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(cuerpo);
        msg.textContent='Si no se abrió su correo, escriba a '+(cfg.email||EMAIL)+'.';return;}
      b.disabled=true;msg.textContent='Enviando… (con fotos puede tardar unos segundos)';
      var fs=fo?[].slice.call(fo.files,0,4):[];
      Promise.all(fs.map(reducir)).then(function(fotos){datos.fotos=fotos.map(function(d){return {datos:d};});
        return fetch(URL_R,{method:'POST',body:JSON.stringify(datos)});
      }).then(function(r){return r.json();}).then(function(j){
        if(!j||!j.ok)throw new Error((j&&j.error)||'error');
        fm.innerHTML='<div class="av" style="background:#e3f4ea;border-color:#2f9e5b;color:#13262d"><b>¡Gracias! Recibimos su reporte.</b> Lo vamos a revisar. Si dejó un contacto, puede que le escribamos.</div><button class="env" type="button" onclick="location.reload()">Enviar otro reporte</button>';
      }).catch(function(){b.disabled=false;msg.innerHTML='No se pudo enviar. Revise la conexión e intente de nuevo, o escriba a <a href="mailto:'+(cfg.email||EMAIL)+'">'+(cfg.email||EMAIL)+'</a>.';});
    };
  }
  function listas(){
    return fetch('/data/lugares.json').then(function(r){return r.json();}).then(function(d){return [d.barrios||[],d.localidades||[]];}).catch(function(){return [[],[]];});
  }
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.tc-go-rep');if(!a)return;var r=document.getElementById('tc-rep');if(!r)return;e.preventDefault();var c=r.closest('[hidden]');while(c){c.hidden=false;c=c.parentElement&&c.parentElement.closest('[hidden]');}r.scrollIntoView({behavior:'smooth',block:'start'});var b=document.getElementById('tc-abrir');if(b&&b.offsetParent!==null)setTimeout(function(){b.click();},400);});
  /* textos resumidos con "Ver más" y botón para volver al estado inicial */
  var abiertos=0;
  function resetVis(){var b=document.getElementById('tc-reset');if(!b){b=document.createElement('button');b.id='tc-reset';b.type='button';b.textContent='↺ Cerrar todo';document.body.appendChild(b);
      b.onclick=function(){[].forEach.call(document.querySelectorAll('details[data-ini]'),function(d){d.open=d.dataset.ini==='1';d.removeAttribute('data-ini');});
        [].forEach.call(document.querySelectorAll('.tc-clamp-off'),function(p){p.classList.remove('tc-clamp-off');p.classList.add('tc-clamp');var m=p.nextElementSibling;if(m&&m.className==='tc-more')m.textContent='Ver más ▾';});resetVis();};}
    b.hidden=!(document.querySelector('details[data-ini]')||document.querySelector('.tc-clamp-off'));}
  document.addEventListener('click',function(e){var sm=e.target.closest&&e.target.closest('summary');if(!sm)return;var d=sm.parentElement;if(!d||d.tagName!=='DETAILS'||d.id==='tc-inst-d')return;if(!d.hasAttribute('data-ini'))d.dataset.ini=d.open?'1':'0';setTimeout(function(){if(d.dataset.ini===(d.open?'1':'0'))d.removeAttribute('data-ini');resetVis();},30);},true);
  function resumir(){[].forEach.call(document.querySelectorAll('p.s'),function(p){if(p.dataset.cl||p.closest('summary,#tc-rep,#tc-inst,.zbox'))return;var tx=(p.textContent||'').trim();if(tx.length<170)return;
    p.dataset.cl='1';p.classList.add('tc-clamp');var m=document.createElement('button');m.type='button';m.className='tc-more';m.textContent='Ver más ▾';p.parentNode.insertBefore(m,p.nextSibling);
    m.onclick=function(){var off=p.classList.toggle('tc-clamp');p.classList.toggle('tc-clamp-off',!off);m.textContent=off?'Ver más ▾':'Ver menos ▴';resetVis();};});}
  /* Cartel grande de alerta meteorológica por localidad (simuladores) */
  var REG={norte:['capital','san cosme','itati','beron de astrada','general paz','san luis del palmar','san miguel','ituzaingo'],noroeste:['capital','san cosme','empedrado','san luis del palmar','saladas','itati'],noreste:['ituzaingo','san miguel','santo tome'],
    este:['santo tome','general alvear','san martin','paso de los libres','ituzaingo'],sureste:['monte caseros','paso de los libres','curuzu cuatia'],oeste:['empedrado','saladas','bella vista','san roque','lavalle','goya','esquina'],
    suroeste:['goya','esquina','sauce'],sur:['esquina','sauce','curuzu cuatia','monte caseros','mercedes'],centro:['mburucuya','concepcion','saladas','san roque','mercedes','general paz','san luis del palmar']};
  REG.sudeste=REG.sureste;REG.sudoeste=REG.suroeste;
  function nrm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
  function alcanza(a,dep){var z=nrm([].concat(a.zonas||[]).join(' ; ')),d=nrm(dep);if(!z)z=nrm(a.aviso);
    if(/toda la provincia|toda corrientes|todo el territorio/.test(z))return true;if(d&&z.indexOf(d)>=0)return true;
    var w=z.split(/[^a-z]+/);for(var i=0;i<w.length;i++){var r=REG[w[i]];if(r&&d&&r.indexOf(d)>=0)return true;}
    if(!/norte|sur|este|oeste|centro/.test(z)&&/provincia de corrientes|corrientes/.test(z))return true;return false;}
  var EST_DEP={'ituzaingo':'ITUZAINGO','san miguel':'ITUZAINGO','santo tome':'ITUZAINGO','general alvear':'PASO_DE_LOS_LIBRES_AERO','san martin':'PASO_DE_LOS_LIBRES_AERO','paso de los libres':'PASO_DE_LOS_LIBRES_AERO','monte caseros':'MONTE_CASEROS_AERO','curuzu cuatia':'MONTE_CASEROS_AERO','mercedes':'MONTE_CASEROS_AERO','sauce':'MONTE_CASEROS_AERO'};
  var EST_NOM={CORRIENTES_AERO:'Corrientes Aero',ITUZAINGO:'Ituzaingó',PASO_DE_LOS_LIBRES_AERO:'Paso de los Libres',MONTE_CASEROS_AERO:'Monte Caseros'};
  var M5=null;function modelo(){if(!M5)M5=fetch('/data/fuentes/smn_pronostico_5_dias.txt',{cache:'no-cache'}).then(function(r){return r.ok?r.text():'';}).then(function(tx){var o={},cur=null,MS={ENE:0,FEB:1,MAR:2,ABR:3,MAY:4,JUN:5,JUL:6,AGO:7,SEP:8,SET:8,OCT:9,NOV:10,DIC:11};
      tx.split('\n').forEach(function(l){var s=l.trim();if(/^[A-Z_]{4,}$/.test(s)){cur=s;o[cur]=[];return;}var m=/^(\d{2})\/([A-Z]{3})\/(\d{4})\s+(\d{2})Hs\.\s+\S+\s+\d+\s*\|\s*\d+\s+([\d.]+)/.exec(s);if(m&&cur&&MS[m[2]]!=null)o[cur].push({t:new Date(+m[3],MS[m[2]],+m[1],+m[4]),mm:+m[5]});});return o;}).catch(function(){return {};});return M5;}
  var LL=null;function medida(){if(!LL)LL=fetch('/data/lluvia.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};});return LL;}
  window.tcInicioLluvia=function(dep,el,loc,cur){if(!el)return;var st=EST_DEP[nrm(dep)]||'CORRIENTES_AERO';Promise.all([modelo(),medida()]).then(function(R){var o=R[0],LM=R[1]||{};
    var E=(LM.estaciones||[]).filter(function(s){return loc&&String(s.localidad).indexOf(loc)===0;}),cols=LM.columnas||[],ya=null;
    /* indicador compuesto: mayor valor de cada hora entre las estaciones de la localidad (el mismo de los indicadores) */
    var MX=[];E.forEach(function(s){(s.valores||[]).forEach(function(x,i){if(x!=null)MX[i]=Math.max(MX[i]==null?0:MX[i],+x);});});
    var totC=MX.reduce(function(a,x){return a+(x||0);},0);for(var k=MX.length-1;k>=Math.max(0,MX.length-3);k--){if(MX[k]!=null&&MX[k]>=0.2){ya={mm:MX[k],h:cols[k]||'',tot:totC};break;}}
    var pre='';if(ya){var hy=parseInt(ya.h,10),dh=(new Date().getHours()-hy+24)%24;if(isNaN(hy)||dh>1){pre='🌧️ Llovieron <b>'+String(ya.mm).replace('.',',')+' mm en la hora de las '+String(ya.h).replace(' (en curso)','')+'</b> (estaciones del SNIH).<br>';ya=null;}}
    if(ya){el.innerHTML='🌧️ <b>'+(ya.mm<0.5?'LLOVIZNA':'LLUEVE')+' AHORA en '+loc+': '+String(ya.mm).replace('.',',')+' mm en la hora de las '+String(ya.h).replace(' (en curso)','')+'</b>, '+String(Math.round(ya.tot*10)/10).replace('.',',')+' mm en 24 h. <small>Lluvia medida por el SNIH, actualizada '+(LM.actualizado||'')+'.</small>';return;}
    if(cur){el.innerHTML=pre+'⛈️ <b>TORMENTA EN CURSO según el aviso oficial, hasta las '+cur+' h.</b> <small>La lluvia medida por las estaciones se incorpora en la próxima actualización.</small>';return;}
var L=o[st]||[];if(!L.length){el.remove();return;}
    var now=new Date(),fut=L.filter(function(x){return x.t>now;}),ini=null;for(var i=0;i<fut.length;i++){if(fut[i].mm>=0.5){ini=fut[i];break;}}
    var lim=new Date(now.getTime()+864e5),t24=fut.filter(function(x){return x.t<=lim;}).reduce(function(s,x){return s+x.mm;},0);
    var DS=['dom','lun','mar','mié','jue','vie','sáb'],dn=function(x){var k=Math.round((new Date(x.getFullYear(),x.getMonth(),x.getDate())-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/864e5);return (k===0?'hoy':k===1?'mañana':'')+' '+DS[x.getDay()]+' '+x.getDate()+'/'+(x.getMonth()+1);};
    if(ini){var a=new Date(ini.t.getTime()-3*36e5),mx=fut.slice(fut.indexOf(ini),fut.indexOf(ini)+4).reduce(function(m,x){return Math.max(m,x.mm);},0);
      el.innerHTML=pre+'⏱️ <b>Próximo inicio estimado de la lluvia: '+dn(ini.t)+', entre las '+a.getHours()+' y las '+(ini.t.getHours()||24)+' h</b>'+(mx>=5?', con el momento más intenso de hasta '+String(mx).replace('.',',')+' mm en 3 h':'')+'. <small>Modelo numérico del SMN, estación '+EST_NOM[st]+'; puede diferir de la alerta y de la tormenta real.</small>';}
    else el.innerHTML=pre+'⏱️ <b>El modelo numérico del SMN no prevé lluvia significativa en las próximas horas</b> para la estación '+EST_NOM[st]+'. <small>Las tormentas de la alerta pueden ser aisladas y difíciles de anticipar en un horario: siga el radar.</small>';});};
  window.tcAlcanza=function(a,dep){try{return alcanza(a,dep);}catch(e){return false;}};
  window.tcAlertasDe=function(smn,dep,incluirFuturas){var now=new Date(),ORD={rojo:3,naranja:2,amarillo:1};return (smn||[]).filter(function(a){if(a.incluye_corrientes===false)return false;var h=a.hasta_iso?Date.parse(a.hasta_iso):NaN;return isNaN(h)||h>now;}).filter(function(a){return alcanza(a,dep);}).sort(function(x,y){return (ORD[y.nivel]||0)-(ORD[x.nivel]||0);});};
  window.tcAlertaGrande=function(smn,dep,nombre,pron,ciudad){setTimeout(function(){[].forEach.call(document.querySelectorAll('.ag-ini:empty'),function(el){tcInicioLluvia(el.getAttribute('data-dep'),el,el.getAttribute('data-loc'),el.getAttribute('data-cur'));});},50);
    var now=new Date(),S=(smn||[]).filter(function(a){if(a.incluye_corrientes===false)return false;var h=a.hasta_iso?Date.parse(a.hasta_iso):NaN;return isNaN(h)||h>now;}).filter(function(a){return alcanza(a,dep);});
    if(!S.length)return '';var ORD={rojo:3,naranja:2,amarillo:1};S.sort(function(x,y){return (ORD[y.nivel]||0)-(ORD[x.nivel]||0)||Date.parse(x.desde_iso||0)-Date.parse(y.desde_iso||0);});
    var a=S[0],COL={rojo:['#c0392b','#fff'],naranja:['#ef7d12','#fff'],amarillo:['#f6d55c','#2b2300']},c=COL[a.nivel]||COL.amarillo,DS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    var hh=function(x){return x.getHours()+(x.getMinutes()?':'+String(x.getMinutes()).padStart(2,'0'):'');},dn=function(x){var k=Math.round((new Date(x.getFullYear(),x.getMonth(),x.getDate())-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/864e5);return (k===0?'hoy ':k===1?'mañana ':'')+DS[x.getDay()]+' '+x.getDate()+'/'+(x.getMonth()+1);};
    var d=a.desde_iso?new Date(a.desde_iso):null,f=a.hasta_iso?new Date(a.hasta_iso):null,est='',cu='';
    if(d&&f){cu=(d.toDateString()===f.toDateString()?dn(d)+', de '+hh(d)+' a '+hh(f)+' h':dn(d)+' '+hh(d)+' h a '+dn(f)+' '+hh(f)+' h')+' · duración '+Math.round((f-d)/36e5)+' h';
      if(now>=d){var r=Math.max(1,Math.round((f-now)/36e5));est='EN CURSO · termina en '+r+' h';}else{var q=Math.max(1,Math.round((d-now)/36e5));est='COMIENZA EN '+q+' H';}}
    var tor=/torment/.test(nrm(a.fenomeno||a.aviso)),fen=a.fenomeno?(/torment/.test(nrm(a.fenomeno))?'tormentas':a.fenomeno):'tormentas';
    var mm=null;S.forEach(function(x){if(x.rango_mm&&(!mm||x.rango_mm[1]>mm[1]))mm=x.rango_mm;});
    var ex=pron&&pron.extendido&&pron.extendido.ciudades&&(pron.extendido.ciudades[ciudad]||pron.extendido.ciudades[nombre]),dia=null,key=(d&&now<d?d:now);key=key.getFullYear()+'-'+String(key.getMonth()+1).padStart(2,'0')+'-'+String(key.getDate()).padStart(2,'0');
    if(ex&&ex.dias)dia=ex.dias.filter(function(x){return x.fecha===key;})[0];
    var hor='';if(dep==='Capital'&&pron&&pron.horario_capital&&pron.horario_capital[key]){var v=pron.horario_capital[key],tot=v.reduce(function(s,x){return s+(x||0);},0);
      if(tot>0.5){var mx=Math.max.apply(null,v),hs=[];v.forEach(function(x,i){if(x>=Math.max(0.5,mx*0.4))hs.push(i);});
        hor='<div class="ag-r">🕒 Horas de mayor lluvia prevista: <b>'+(hs.length?hs[0]+' a '+(hs[hs.length-1]+1)+' h':'sin datos')+'</b></div><div class="ag-h">'+v.map(function(x,i){return '<i title="'+i+' h: '+(x||0)+' mm" style="height:'+Math.max(2,(x||0)/(mx||1)*34)+'px"></i>';}).join('')+'</div><div class="ag-hx"><span>0 h</span><span>12 h</span><span>23 h</span></div>';}}
    var otras=S.slice(1).map(function(x){var a1=x.desde_iso?new Date(x.desde_iso):null,b1=x.hasta_iso?new Date(x.hasta_iso):null;return '<li>Alerta <b>'+({amarillo:'amarilla',naranja:'naranja',rojo:'roja'}[x.nivel]||x.nivel)+'</b>'+(a1&&b1?', '+dn(a1)+' de '+hh(a1)+' a '+hh(b1)+' h':'')+(x.rango_mm?', '+x.rango_mm[0]+' a '+x.rango_mm[1]+' mm':'')+'</li>';}).join('');
    var z=[].concat(a.zonas||[]).join('; ');
    return '<div class="ag ag-'+(a.nivel||'amarillo')+'" style="background:'+c[0]+';color:'+c[1]+'">'
      +'<div class="ag-t">⚠️ ALERTA '+({amarillo:'AMARILLA',naranja:'NARANJA',rojo:'ROJA'}[a.nivel]||String(a.nivel||'').toUpperCase())+'</div><div class="ag-s">POR '+String(fen).toUpperCase()+(est?' · '+est:'')+'</div>'
      +'<div class="ag-r">📍 Rige para <b>'+(nombre||'')+'</b>'+(dep?' (departamento '+dep+')':'')+'</div>'
      +(cu?'<div class="ag-r">🕒 Vigencia de la alerta: <b>'+cu+'</b>'+(d&&now<d?' · <b>comienza a las '+hh(d)+' h</b>':'')+'</div>':'')+'<div class="ag-r ag-ini" data-dep="'+(dep||'')+'" data-loc="'+(nombre||'')+'" data-cur="'+(d&&f&&now>=d&&(f-d)<=12*36e5?hh(f):'')+'"></div>'
      +(mm?'<div class="ag-r">'+(tor?'⛈️':'🌧️')+' Lluvia acumulada prevista: <b>'+mm[0]+' a '+mm[1]+' mm</b></div>':'')
      +(dia?'<div class="ag-r">🌦️ Pronóstico: <b>'+dia.resumen+'</b>'+(dia.prob!=null?', '+dia.prob+' % de probabilidad':'')+'</div>':'')+hor
      +(tor?'<div class="ag-k"><b>Ante tormentas:</b> no circule por calles anegadas, asegure objetos sueltos, no se refugie bajo árboles y desconecte artefactos eléctricos. Emergencias: 103.</div>':'')
      +(otras?'<ul class="ag-o">'+otras+'</ul>':'')
      +'<div class="ag-f">Fuente: '+(a.origen?String(a.origen).split(',')[0]:'SMN')+(z?'. Zona: '+z:'')+'</div></div>';};
  window.tcAlertasZonas=function(smn){var now=new Date(),S=(smn||[]).filter(function(a){if(a.incluye_corrientes===false)return false;var h=a.hasta_iso?Date.parse(a.hasta_iso):NaN;return isNaN(h)||h>now;});if(!S.length)return '';
    var DS=['dom','lun','mar','mié','jue','vie','sáb'],hh=function(x){return x.getHours()+(x.getMinutes()?':'+String(x.getMinutes()).padStart(2,'0'):'');},C={rojo:'#c0392b',naranja:'#ef7d12',amarillo:'#e0b416'},N={rojo:'roja',naranja:'naranja',amarillo:'amarilla'};
    return '<div class="ag-z"><b>Alertas vigentes por zona de la provincia</b>'+S.map(function(a){var d=a.desde_iso?new Date(a.desde_iso):null,f=a.hasta_iso?new Date(a.hasta_iso):null;var en=d&&now>=d;
      return '<div class="ag-zr" style="border-left-color:'+(C[a.nivel]||C.amarillo)+'"><b>Alerta '+(N[a.nivel]||a.nivel)+'</b> por '+(a.fenomeno||'tormentas')+(d&&f?' · '+(en?'<b>en curso</b> desde las '+hh(d)+' h, hasta '+DS[f.getDay()]+' '+hh(f)+' h':'<b>comienza '+DS[d.getDay()]+' '+d.getDate()+'/'+(d.getMonth()+1)+' a las '+hh(d)+' h</b>, hasta las '+hh(f)+' h'):'')+(a.rango_mm?' · '+a.rango_mm[0]+' a '+a.rango_mm[1]+' mm':'')+'<br><small>📍 '+[].concat(a.zonas||[]).join('; ')+'</small></div>';}).join('')+'</div>';};
  /* Gráfico común: lluvia caída frente a lluvia esperada, con indicadores (tablero y simuladores) */
  var GL={};
  function jsonDe(id,url){var el=document.getElementById(id);if(el&&el.textContent&&el.textContent.length>2){try{return Promise.resolve(JSON.parse(el.textContent));}catch(e){}}
    if(!GL[url])GL[url]=fetch(url+'?v='+Math.floor(Date.now()/60000),{cache:'no-cache'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};});return GL[url];}
  function nfx(v,d){return (+v).toLocaleString('es-AR',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d});}
  function escx(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  window.tcLluviaComp=function(box,o){if(!box)return;
    Promise.all([jsonDe('lluvia-data','/data/lluvia.json'),jsonDe('pron-data','/data/pron.json'),jsonDe('esp-data','/data/esperado_dia.json')]).then(function(R){
      var L=R[0]||{},PF=R[1]||{},E=R[2]||{},now=new Date(),cols=L.columnas||[],n=o.n,dep=o.dep||(n==='Corrientes Capital'?'Capital':n);
      var ES=(L.estaciones||[]).filter(function(s){var a=nrm(s.localidad),b=nrm(n);return a===b||a.indexOf(b+' (')===0||(o.est&&o.est.codigo!=null&&s.codigo==o.est.codigo);});
      var v=[];if(ES.length){var m=Math.max.apply(null,ES.map(function(s){return (s.valores||[]).length;}));for(var i=0;i<m;i++){var x=null;ES.forEach(function(s){var y=(s.valores||[])[i];if(y!=null)x=Math.max(x==null?0:x,+y);});v.push(x);}}
      var lh=null;for(var q=cols.length-1;q>=0&&lh==null;q--){var mm=/(\d{1,2})\s*h?/.exec(String(cols[q]).replace(/^\d+\/\d+\s*/,''));if(mm)lh=+mm[1]+(cols.length-1-q);}if(lh==null)lh=now.getHours();
      var end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),lh%24),S=[],kd=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
      for(var j=0;j<v.length;j++)S.push({t:new Date(end.getTime()-(v.length-1-j)*36e5),obs:v[j],fc:null,past:true});
      if(!S.length)for(var j0=23;j0>=0;j0--)S.push({t:new Date(end.getTime()-j0*36e5),obs:null,fc:null,past:true});
      var hc=(n==='Corrientes Capital'&&PF.horario_capital)?PF.horario_capital:null;
      if(hc){S.forEach(function(x){var a=hc[kd(x.t)];if(a&&a[x.t.getHours()]!=null)x.fc=+a[x.t.getHours()];});for(var k=1;k<=36;k++){var tt=new Date(end.getTime()+k*36e5),a2=hc[kd(tt)];if(!a2)break;S.push({t:tt,obs:null,fc:+a2[tt.getHours()]||0,past:false});}}
      else for(var k2=1;k2<=36;k2++)S.push({t:new Date(end.getTime()+k2*36e5),obs:null,fc:null,past:false});
      var C=PF.ciudades||{},f=C[n]||(o.ref?C[o.ref]:null),fh=f&&f.hoy?+f.hoy.mm:null,fm=f&&f.manana?+f.manana.mm:null;
      var hoyO=0,tot24=0,hayO=v.some(function(x){return x!=null;}),restoF=0;S.forEach(function(x){if(x.past){tot24+=+x.obs||0;if(x.t.toDateString()===now.toDateString())hoyO+=+x.obs||0;}else if(x.t.toDateString()===now.toDateString())restoF+=+x.fc||0;});if(!hc)restoF=null;
      var eOk=E.fecha===kd(now),esp=eOk&&E.ciudades?(E.ciudades[n]!=null?E.ciudades[n]:(o.ref&&E.ciudades[o.ref]!=null?E.ciudades[o.ref]:null)):null;
      var ORD={rojo:3,naranja:2,amarillo:1},NM={rojo:'roja',naranja:'naranja',amarillo:'amarilla'},CL={rojo:'#c0392b',naranja:'#ef7d12',amarillo:'#e0b416'},CT={rojo:'#c0392b',naranja:'#ef7d12',amarillo:'#b38a00'};
      var vis={},TODAS=[].concat(eOk?(E.alertas_del_dia||E.alertas||[]):[],PF.smn||[]).filter(function(a){var kk=a.nivel+a.desde_iso+a.hasta_iso+String(a.zonas);if(vis[kk])return false;vis[kk]=1;return alcanza(a,dep);});
      var SMN0=TODAS.filter(function(a){return /^Servicio Meteorol/.test(String(a.origen||''));});
      TODAS=TODAS.map(function(a){if(!/^Servicio Meteorol/.test(String(a.origen||''))||!a.hasta_iso)return a;var d=a.desde_iso?Date.parse(a.desde_iso):0,f2=Date.parse(a.hasta_iso);SMN0.forEach(function(b){var db=Date.parse(b.desde_iso);if(b!==a&&db>d&&db<f2)f2=db;});return f2<Date.parse(a.hasta_iso)?Object.assign({},a,{hasta_iso:new Date(f2).toISOString()}):a;});
      var hoyA=TODAS.filter(function(a){var d=a.desde_iso?Date.parse(a.desde_iso):0,f2=a.hasta_iso?Date.parse(a.hasta_iso):9e15,i0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();return f2>i0&&d<i0+864e5&&d<=now;}),rg=null;hoyA.forEach(function(a){if(a.rango_mm&&(!rg||a.rango_mm[1]>rg[1]))rg=a.rango_mm;});
      var aMax=hoyA.slice().sort(function(a,b){return (ORD[b.nivel]||0)-(ORD[a.nivel]||0);})[0],vig=TODAS.some(function(a){var d=a.desde_iso?Date.parse(a.desde_iso):0,f2=a.hasta_iso?Date.parse(a.hasta_iso):9e15;return d<=now&&f2>now;});
      var m0=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime(),m1=m0+864e5,AM=TODAS.filter(function(a){var d=a.desde_iso?Date.parse(a.desde_iso):0,f2=a.hasta_iso?Date.parse(a.hasta_iso):m1;return f2>m0&&d<m1;}),am=AM.slice().sort(function(a,b){return (ORD[b.nivel]||0)-(ORD[a.nivel]||0);})[0],rgm=null;AM.forEach(function(a){if(a.rango_mm&&(!rgm||a.rango_mm[1]>rgm[1]))rgm=a.rango_mm;});
      var ua=AM.length?Math.max(m0,Math.min.apply(null,AM.map(function(a){return a.desde_iso?Date.parse(a.desde_iso):m0;}))):0,ub=AM.length?Math.min(m1,Math.max.apply(null,AM.map(function(a){return a.hasta_iso?Date.parse(a.hasta_iso):m1;}))):0;
      var DS=['dom','lun','mar','mié','jue','vie','sáb'],man=new Date(m0),hh=now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
      var tile=function(c,t,val,sub){return '<div style="background:var(--bg,#f3f6f8);border-radius:12px;padding:8px 10px;border-left:4px solid '+c+';min-width:0"><div style="font-size:.68rem;color:var(--soft,#6b7c85);font-weight:800;letter-spacing:.03em">'+t+'</div><div style="font-size:1.35rem;font-weight:900;color:'+c+';line-height:1.15">'+val+'</div>'+(sub?'<div style="font-size:.74rem;color:var(--ink2,#3d4f57);margin-top:2px;line-height:1.35">'+sub+'</div>':'')+'</div>';};
      var t1=tile('var(--med,#2a7da0)','LLOVIÓ HOY (HASTA LAS '+hh+' H)',hayO?nfx(hoyO)+' mm':'<span style="font-size:.95rem">'+(ES.length?'sin datos':'sin estación')+'</span>',hayO?nfx(tot24)+' mm en las últimas 24 h':'');
      var sub2=(esp!=null?'Pronóstico vigente al comenzar el día.':'')+(aMax?' Alerta máxima del día: <b style="color:'+CT[aMax.nivel]+'">'+(NM[aMax.nivel]||aMax.nivel)+'</b>'+(function(){var i0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),Z=hoyA.filter(function(a){return a.nivel===aMax.nivel;}),d=Math.max(i0,Math.min.apply(null,Z.map(function(a){return a.desde_iso?Date.parse(a.desde_iso):i0;}))),f2=Math.min(i0+864e5-6e4,Math.max.apply(null,Z.map(function(a){return a.hasta_iso?Date.parse(a.hasta_iso):i0+864e5;})));return ', de '+new Date(d).toTimeString().slice(0,5)+' a '+new Date(f2).toTimeString().slice(0,5)+' h';})()+(rg?'; rango de las alertas: <b>'+rg[0]+' a '+rg[1]+' mm</b>':'')+'.':'');
      if(hayO&&esp!=null){var df=hoyO-esp,ok=Math.abs(df)<=Math.max(1.5,esp*0.15);sub2+='<div style="margin-top:4px;font-weight:800;color:'+(ok?'var(--ok,#2f9e5b)':'#d08a2e')+'">Diferencia hasta ahora: '+(df>0?'+':'')+nfx(df)+' mm'+(ok?', en línea con lo pronosticado':df>0?', llovió más de lo pronosticado':', llovió menos de lo pronosticado')+(rg?(hoyO<rg[0]?'; por debajo del rango de la alerta':hoyO>rg[1]?'; por encima del rango de la alerta':'; dentro del rango de la alerta'):'')+'.</div><div style="margin-top:2px;font-size:.72rem;font-weight:800;color:var(--ink2,#3d4f57)">⏳ El día no terminó: la comparación se completa a la medianoche.</div>';}
      var t2=tile('#d08a2e','SE PRONOSTICA PARA HOY',esp!=null?nfx(esp)+' mm':(rg?rg[0]+' a '+rg[1]+' mm':(fh!=null?nfx(fh)+' mm':'<span style="font-size:.95rem">sin registro</span>')),sub2);
      var t3=tile('var(--prn,#7a5cc4)','RESTO DE HOY',(vig&&!(restoF>=0.5))?'<span style="font-size:1rem">Lluvias posibles</span>':(restoF==null?(fh==null?'—':nfx(fh)+' mm <small style="font-size:.7rem">(total del día)</small>'):nfx(restoF)+' mm'),vig?'Hay una alerta vigente: los modelos no siempre la cuantifican':'');
      var t4=tile('var(--prn,#7a5cc4)','MAÑANA, '+(DS[man.getDay()]+' '+man.getDate()+'/'+(man.getMonth()+1)).toUpperCase(),fm==null?'—':nfx(fm)+' mm',am?'Alerta <b style="color:'+CT[am.nivel]+'">'+(NM[am.nivel]||am.nivel)+'</b> prevista de '+new Date(ua).getHours()+' a '+Math.round((ub-m0)/36e5)+' h ('+Math.round((ub-ua)/36e5)+' h)'+(rgm?', '+rgm[0]+' a '+rgm[1]+' mm':'')+'.':'Sin alertas previstas.');
      function svg(big){var W=big?760:380,H=big?350:260,FS=big?11:9.5,X0=30,X1=W-8,TOP=46,BOT=H-44,N=S.length,bw=(X1-X0)/N,xs=function(i){return X0+i*bw;};
        var mx=Math.max(2,Math.max.apply(null,S.map(function(x){return Math.max(x.obs||0,x.fc||0);}))),st=[0.5,1,1.5,2,3,4,5,10].filter(function(z){return z*4>=mx*1.2;})[0]||20;mx=st*4;var y=function(q){return BOT-(q/mx)*(BOT-TOP);};
        var T=function(x,yy,t,a,c,w,s){return '<text x="'+x.toFixed(1)+'" y="'+yy.toFixed(1)+'" text-anchor="'+(a||'start')+'" font-size="'+(s||FS)+'" font-weight="'+(w||500)+'" fill="'+(c||'var(--soft,#6b7c85)')+'" font-family="Archivo,sans-serif">'+t+'</text>';},g='';
        var t0=S[0].t.getTime(),tN=S[N-1].t.getTime()+36e5,xt=function(ms){return X0+(ms-t0)/(tN-t0)*(X1-X0);};
        var SMN=TODAS.filter(function(a){return /^Servicio Meteorol/.test(String(a.origen||''));}),RG=TODAS.map(function(a){var d=a.desde_iso?Date.parse(a.desde_iso):t0,f2=a.hasta_iso?Date.parse(a.hasta_iso):tN;if(/^Servicio Meteorol/.test(String(a.origen||'')))SMN.forEach(function(b){var db=Date.parse(b.desde_iso);if(b!==a&&db>d&&db<f2)f2=db;});return {n:a.nivel,d:d,f:f2};});
        var SEG=[],cur=null;for(var ms=t0;ms<tN;ms+=9e5){var lv=null;RG.forEach(function(r){if(r.d<=ms&&r.f>ms&&(!lv||ORD[r.n]>ORD[lv]))lv=r.n;});if(!cur||cur.n!==lv){if(cur)cur.f=ms;cur={n:lv,d:ms,f:ms};SEG.push(cur);}}if(cur)cur.f=tN;
        var FIL=[[],[],[]],NMa={rojo:'Roja',naranja:'Naranja',amarillo:'Amarilla'};
        SEG.filter(function(x){return x.n;}).forEach(function(x){var xa=xt(x.d),xb=xt(x.f),c=CL[x.n];g+='<rect x="'+xa.toFixed(1)+'" y="'+TOP+'" width="'+Math.max(1,xb-xa).toFixed(1)+'" height="'+(BOT-TOP)+'" fill="'+c+'" opacity=".12"/><rect x="'+xa.toFixed(1)+'" y="'+(TOP-12)+'" width="'+Math.max(1,xb-xa).toFixed(1)+'" height="6" fill="'+c+'"/>';
          if(xb-xa>=10||x.n==='rojo'){var cx=(xa+xb)/2,lw=NMa[x.n].length*(FS-1.5)*0.6+6,ra=0;while(ra<2&&FIL[ra].some(function(q2){return !(cx+lw/2<q2[0]||cx-lw/2>q2[1]);}))ra++;FIL[ra].push([cx-lw/2,cx+lw/2]);g+=T(cx,TOP-15-ra*10,NMa[x.n],'middle',CT[x.n],800,FS-1.5);}});
        for(var k=0;k<=4;k++){var vv=mx*k/4,yy=y(vv);g+='<line x1="'+X0+'" y1="'+yy.toFixed(1)+'" x2="'+X1+'" y2="'+yy.toFixed(1)+'" stroke="var(--line,#d5dee3)" stroke-width=".7"'+(k?' stroke-dasharray="2 3"':'')+'/>'+T(X0-4,yy+3,nfx(vv,vv%1?1:0),'end');}
        g+=T(X0-4,TOP-4,'mm/h','end',null,700,FS-1.5);
        var VL=function(X,yv,q,c,d){if(q<(d?0.1:0.05))return '';var yy=Math.max(TOP+4,yv-3);return '<text transform="translate('+X.toFixed(1)+' '+yy.toFixed(1)+') rotate(-90)" font-size="'+(big?9.5:7.6)+'" font-weight="800" fill="'+c+'" font-family="Archivo,sans-serif" dominant-baseline="middle">'+nfx(q,d?1:(q<1?2:1))+'</text>';};
        S.forEach(function(x,i){var X=xs(i),w=Math.max(1,bw-1.2);if(x.past){if(x.obs==null)g+='<rect x="'+X.toFixed(1)+'" y="'+(BOT-2)+'" width="'+w.toFixed(1)+'" height="2" fill="var(--line,#d5dee3)"/>';else if(x.obs>0)g+='<rect x="'+X.toFixed(1)+'" y="'+y(x.obs).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1.5,BOT-y(x.obs)).toFixed(1)+'" rx="1.5" fill="var(--med,#2a7da0)"/>'+VL(X+w/2,y(x.obs),x.obs,'var(--med,#2a7da0)');}
          else if(x.fc>0)g+='<rect x="'+X.toFixed(1)+'" y="'+y(x.fc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(BOT-y(x.fc)).toFixed(1)+'" rx="1.5" fill="var(--prn,#7a5cc4)" opacity=".85"/>'+VL(X+w/2,y(x.fc),x.fc,'var(--prn,#7a5cc4)',1);});
        if(!hc){var mid=m0;[[xt(end.getTime()+36e5),xt(Math.min(mid,tN)),fh,'hoy (total)'],[xt(mid),X1,fm,'mañana']].forEach(function(b){if(b[1]-b[0]<20)return;g+='<rect x="'+(b[0]+2).toFixed(1)+'" y="'+(TOP+8)+'" width="'+(b[1]-b[0]-4).toFixed(1)+'" height="'+(BOT-TOP-8)+'" rx="8" fill="var(--prn,#7a5cc4)" opacity=".10"/>'+T((b[0]+b[1])/2,TOP+(BOT-TOP)/2,b[2]==null?'sin dato':nfx(b[2])+' mm','middle','var(--prn,#7a5cc4)',900,FS+5)+T((b[0]+b[1])/2,TOP+(BOT-TOP)/2+FS+4,b[3],'middle','var(--prn,#7a5cc4)',700,FS-0.5);});}
        var xn=xt(now.getTime());g+=T(xn-6,TOP+FS+2,'◀ LO QUE LLOVIÓ','end','var(--med,#2a7da0)',900,FS)+T(xn+6,TOP+FS+2,'LO QUE SE ESPERA ▶','start','var(--prn,#7a5cc4)',900,FS);
        g+='<line x1="'+xn.toFixed(1)+'" y1="'+(TOP-4)+'" x2="'+xn.toFixed(1)+'" y2="'+(BOT+3)+'" stroke="var(--ink,#13262d)" stroke-width="1.3"/><rect x="'+(xn-24).toFixed(1)+'" y="'+(BOT+4)+'" width="48" height="'+(FS+5)+'" rx="5" fill="var(--ink,#13262d)"/>'+T(xn,BOT+4+FS+0.5,'AHORA','middle','var(--card,#fff)',900,FS-1);
        S.forEach(function(x,i){var h=x.t.getHours();if(h===0)g+='<line x1="'+xs(i).toFixed(1)+'" y1="'+TOP+'" x2="'+xs(i).toFixed(1)+'" y2="'+(BOT+26)+'" stroke="var(--ink2,#3d4f57)" stroke-width=".8" stroke-dasharray="1 2"/>'+T(xs(i)>X1-60?xs(i)-3:xs(i)+3,BOT+30,DS[x.t.getDay()]+' '+x.t.getDate()+'/'+(x.t.getMonth()+1),xs(i)>X1-60?'end':'start','var(--ink,#13262d)',800,FS);
          else if(h%(big?3:6)===0&&Math.abs(xs(i)+bw/2-xn)>32)g+=T(xs(i)+bw/2,BOT+12,h+' h','middle');});
        g+='<line x1="'+X0+'" y1="'+BOT+'" x2="'+X1+'" y2="'+BOT+'" stroke="var(--ink2,#3d4f57)"/>';
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;display:block" role="img" aria-label="Lluvia caída y esperada en '+escx(n)+'">'+g+'</svg>';}
      box.innerHTML='<h3 style="margin:0 0 8px;font-size:1.05rem">🌧️ Lluvia caída y esperada en '+escx(n)+'</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px">'+t1+t2+t3+t4+'</div><div class="tcgl-g" style="cursor:zoom-in" title="Toque para ampliar">'+svg(false)+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.78rem;color:var(--ink2,#3d4f57);margin-top:4px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--med,#2a7da0);margin-right:4px"></i>Lluvia caída, hora por hora</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--prn,#7a5cc4);margin-right:4px"></i>'+(hc?'Lluvia esperada, hora por hora':'Lluvia esperada por día')+'</span><span><i style="display:inline-block;width:14px;height:10px;border-radius:2px;background:linear-gradient(90deg,#c0392b 33%,#ef7d12 33% 66%,#e0b416 66%);margin-right:4px"></i>Alertas de hoy y previstas</span></div>'
        +(!hayO?'<p style="font-size:.78rem;color:var(--soft,#6b7c85);margin:6px 0 0">'+(ES.length?'La estación de '+escx(n)+' no reportó datos en las últimas 24 horas.':'Esta localidad no tiene estación de medición propia en la red del SNIH.')+'</p>':'')+(o.ref&&!C[n]?'<p style="font-size:.78rem;color:var(--soft,#6b7c85);margin:4px 0 0">Pronóstico de '+escx(o.ref)+', la ciudad de referencia más cercana.</p>':'');
      var gz=box.querySelector('.tcgl-g');gz.onclick=function(){var m=document.createElement('div');m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px';m.innerHTML='<div style="background:var(--card,#fff);border-radius:16px;padding:12px;width:100%;max-width:900px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:var(--ink,#13262d)">'+escx(n)+': lluvia caída y esperada</b><button type="button" style="font:inherit;font-weight:800;border:0;border-radius:999px;padding:6px 14px;background:#1f6f8b;color:#fff">Cerrar</button></div>'+svg(true)+'</div>';m.onclick=function(e){if(e.target===m||e.target.tagName==='BUTTON')m.remove();};document.body.appendChild(m);};
    });};
  /* Gráficos ampliables: cartel titilante y vista grande al tocar */
  window.tcAmpliable=function(el,titulo){if(!el||el.getAttribute('data-amp'))return;el.setAttribute('data-amp','1');var w=document.createElement('div');w.className='tc-amp';w.innerHTML='🔍 Toque el gráfico para agrandarlo';el.parentNode.insertBefore(w,el);el.style.cursor='zoom-in';
    if(el.onclick)return;el.addEventListener('click',function(){var sv=el.querySelector('svg')||(el.tagName.toLowerCase()==='svg'?el:null);if(!sv)return;var m=document.createElement('div');m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:12px';
      var c=sv.cloneNode(true);c.removeAttribute('width');c.removeAttribute('height');c.style.cssText='width:100%;height:auto;display:block;max-height:78vh';
      m.innerHTML='<div style="background:var(--card,#fff);border-radius:16px;padding:12px;width:100%;max-width:1000px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px"><b style="color:var(--ink,#13262d)">'+(titulo||'')+'</b><button type="button" style="font:inherit;font-weight:800;border:0;border-radius:999px;padding:6px 14px;background:#1f6f8b;color:#fff">Cerrar</button></div></div>';m.firstChild.appendChild(c);m.onclick=function(e){if(e.target===m||e.target.tagName==='BUTTON')m.remove();};document.body.appendChild(m);});};
  function ampliarTodo(){[['#cmpG','Lluvia caída y esperada'],['.tcgl-g','Lluvia caída y esperada'],['#hChart','Evolución de la altura del río'],['#hOtro','Evolución de la altura del río'],['#lcap','Lluvia hora por hora'],['#hcap','Pronóstico hora por hora'],['#evserie','Evacuados']].forEach(function(x){[].forEach.call(document.querySelectorAll(x[0]),function(el){var host=el.tagName.toLowerCase()==='svg'&&el.parentNode&&el.parentNode.children.length>1?el:el;window.tcAmpliable(host,x[1]);});});
    [].forEach.call(document.querySelectorAll('#kpiG svg'),function(sv){window.tcAmpliable(sv,'Evolución');});}
  /* 5. Arranque */
  function iniciar(){
    estilo();menu();
    guiaInicial();resumir();setTimeout(ampliarTodo,1500);setTimeout(ampliarTodo,4000);resetVis();setTimeout(resumir,1500);setTimeout(resumir,4000);window.addEventListener('hashchange',function(){if(location.hash==='#instalar')aviso(true);});var ib=document.getElementById('tc-inst-btn');if(ib){ib.hidden=false;ib.onclick=function(){aviso(true);};}
    if(esIOS||inApp)aviso(false);
    cargarDatos().then(fusionarSMN).then(ejecutarPagina).then(function(){
      return Promise.all([fetch('/data/config.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};}),listas()]);
    }).then(function(r){reportes(r[0],r[1][0],r[1][1]);});
    if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(reg){try{reg.update();}catch(e){}}).catch(function(){});
      /* si se publica una versión nueva del sitio, recargar una sola vez para mostrarla */
      var recargado=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(recargado)return;recargado=true;location.reload();});}
    /* al volver a abrir la app (o volver a la pestaña), traer los datos más recientes */
    var abierto=Date.now(),oculto=null;
    function fresca(){if(document.visibilityState!=='visible')return;var t0=oculto||abierto;if(Date.now()-t0>2*60000||Date.now()-abierto>10*60000){location.reload();}}
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')oculto=Date.now();else{fresca();oculto=null;}});
    window.addEventListener('pageshow',function(e){if(e.persisted)location.reload();});
    window.addEventListener('focus',function(){if(Date.now()-abierto>10*60000)fresca();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
