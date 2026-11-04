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
    n.innerHTML='<div class="in"><span class="brand">Tablero Ctes</span>'+items.map(function(i){return '<a href="'+i[0]+'"'+(path===i[0]?' aria-current="page"':'')+'>'+i[1]+'</a>';}).join('')+'<a href="#tc-rep">Reportar</a><button class="inst" id="tc-inst-btn" hidden>Instalar</button></div>';
    document.body.insertBefore(n,document.body.firstChild);
  }
  /* 3. Aviso de instalación */
  var ua=navigator.userAgent||'',dPrompt=null;
  var esIOS=/iphone|ipad|ipod/i.test(ua),inApp=/FBAN|FBAV|Instagram|FB_IAB|Line\//i.test(ua);
  var instalada=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function ocultadoReciente(){try{var t=+localStorage.getItem('tc-inst-no');return t&&Date.now()-t<7*864e5;}catch(e){return false;}}
  function aviso(forzar){
    if(instalada)return;if(!forzar&&ocultadoReciente())return;
    var old=document.getElementById('tc-inst');if(old)old.remove();
    var d=document.createElement('section');d.id='tc-inst';d.className='tc-card';
    var cuerpo;
    if(inApp){cuerpo='<p>Está viendo el tablero dentro de Facebook o Instagram, y desde aquí no se puede instalar.</p><ol><li>Toque los <b>tres puntos</b> (arriba a la derecha).</li><li>Elija <b>"Abrir en el navegador"</b> (Chrome o Safari).</li><li>Allí vuelva a tocar <b>"Instalar"</b>.</li></ol>';}
    else if(esIOS){cuerpo='<p>En el iPhone se agrega en dos pasos:</p><ol><li>Toque el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba, abajo de la pantalla).</li><li>Elija <b>"Agregar a inicio"</b> y confirme.</li></ol>';}
    else if(dPrompt){cuerpo='<p>Agréguelo a la pantalla de inicio de su celular y ábralo con un toque, como una aplicación, cuando haya alertas o lluvias.</p>';}
    else{cuerpo='<p>Abra el menú del navegador (los tres puntos) y elija <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.</p>';}
    d.innerHTML='<h2>TENGA EL TABLERO SIEMPRE A MANO</h2>'+cuerpo+'<div class="b">'+(dPrompt&&!inApp&&!esIOS?'<button class="si" id="tc-si">Agregar a mi celular</button>':'')+'<button class="no" id="tc-no">Ahora no</button></div>';
    var nav=document.getElementById('tc-nav');nav.parentNode.insertBefore(d,nav.nextSibling);
    var si=document.getElementById('tc-si');if(si)si.onclick=function(){dPrompt.prompt();dPrompt.userChoice.then(function(){d.remove();});};
    document.getElementById('tc-no').onclick=function(){try{localStorage.setItem('tc-inst-no',String(Date.now()));}catch(e){}d.remove();};
  }
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dPrompt=e;var b=document.getElementById('tc-inst-btn');if(b)b.hidden=false;aviso(false);});
  window.addEventListener('appinstalled',function(){instalada=true;var d=document.getElementById('tc-inst');if(d)d.remove();});
  /* 4. Reportes ciudadanos */
  var TIPOS=['Calle anegada','Agua dentro de viviendas','Desagüe tapado o colapsado','Evacuados o autoevacuados','Corte de calle o ruta','Crecida del río','Otro, vinculado a lluvias o crecida'];
  function reportes(cfg,barrios,locs){
    var s=document.createElement('section');s.id='tc-rep';s.className='tc-card';
    var opts=['<option value="">Elija su barrio o localidad</option>'];
    if(barrios.length)opts.push('<optgroup label="Corrientes Capital">'+barrios.map(function(b){return '<option>'+b+'</option>';}).join('')+'</optgroup>');
    if(locs.length)opts.push('<optgroup label="Provincia de Corrientes">'+locs.map(function(b){return '<option>'+b+'</option>';}).join('')+'</optgroup>');
    s.innerHTML='<h2>Contanos qué pasa en tu barrio</h2><p style="margin:0;font-size:.9rem">Envíenos lo que ve en su barrio o localidad sobre lluvias, anegamientos y la crecida. Nos ayuda a conocer la situación real.</p>'+
      '<div class="av"><b>No es un servicio de emergencias.</b> Si su vida o sus bienes corren peligro, llame a Defensa Civil al <b>103</b> o al <b>911</b>.</div>'+
      (cfg.form_url?'<a class="env" style="display:inline-block;text-decoration:none" href="'+cfg.form_url+'" target="_blank" rel="noopener">Enviar un reporte</a>':
      '<label for="tc-al">Nombre o usuario (puede ser un alias)</label><input id="tc-al" maxlength="60" required>'+
      '<label for="tc-lu">Barrio o localidad</label><select id="tc-lu">'+opts.join('')+'</select>'+
      '<label for="tc-ti">Qué está pasando</label><select id="tc-ti"><option value="">Elija una opción</option>'+TIPOS.map(function(t){return '<option>'+t+'</option>';}).join('')+'</select>'+
      '<label for="tc-de">Descripción breve (calle, altura, desde cuándo)</label><textarea id="tc-de" maxlength="800"></textarea>'+
      '<label for="tc-co">Contacto (opcional, solo si acepta que le respondamos)</label><input id="tc-co" maxlength="80">'+
      '<label class="ck"><input type="checkbox" id="tc-ok"> Acepto que la información se use, sin mis datos personales, para el análisis y la difusión sobre el fenómeno de El Niño.</label>'+
      '<button class="env" id="tc-env">Enviar reporte por correo</button><p class="s">Se abrirá su aplicación de correo con el reporte listo; puede adjuntar fotos antes de enviarlo. Los reportes no se publican automáticamente. Datos tratados según la Ley 25.326 de Protección de Datos Personales.</p><p class="s" id="tc-msg" role="status"></p>');
    document.body.appendChild(s);
    var f=document.createElement('p');f.id='tc-foot';f.innerHTML='Tablero Ciudadano de Corrientes, información de fuentes oficiales. Contacto: <a href="mailto:'+(cfg.email||EMAIL)+'">'+(cfg.email||EMAIL)+'</a>';document.body.appendChild(f);
    var b=document.getElementById('tc-env');if(!b)return;
    b.onclick=function(){
      var g=function(i){return (document.getElementById(i).value||'').trim();},msg=document.getElementById('tc-msg');
      if(!g('tc-al')||!g('tc-lu')||!g('tc-ti')||!g('tc-de')){msg.textContent='Complete nombre o usuario, lugar, qué está pasando y la descripción.';return;}
      if(!document.getElementById('tc-ok').checked){msg.textContent='Para enviar el reporte, marque la autorización.';return;}
      var asunto='Reporte ciudadano: '+g('tc-ti')+', '+g('tc-lu');
      var cuerpo='Nombre o usuario: '+g('tc-al')+'\nLugar: '+g('tc-lu')+'\nQué está pasando: '+g('tc-ti')+'\nDescripción: '+g('tc-de')+'\nContacto: '+(g('tc-co')||'no informado')+'\nAutorización de uso sin datos personales: sí\nFecha y hora del reporte: '+new Date().toLocaleString('es-AR')+'\n\n(Puede adjuntar fotos a este correo.)';
      location.href='mailto:'+(cfg.email||EMAIL)+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(cuerpo);
      msg.textContent='Si no se abrió su correo, escriba a '+(cfg.email||EMAIL)+'.';
    };
  }
  function listas(){
    return fetch('/data/lugares.json').then(function(r){return r.json();}).then(function(d){return [d.barrios||[],d.localidades||[]];}).catch(function(){return [[],[]];});
  }
  /* 5. Arranque */
  function iniciar(){
    estilo();menu();
    var ib=document.getElementById('tc-inst-btn');if(ib){if(!instalada&&(esIOS||inApp))ib.hidden=false;ib.onclick=function(){if(dPrompt&&!esIOS&&!inApp){dPrompt.prompt();}else{aviso(true);window.scrollTo({top:0,behavior:'smooth'});}};}
    if(esIOS||inApp)aviso(false);
    cargarDatos().then(ejecutarPagina).then(function(){
      return Promise.all([fetch('/data/config.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};}),listas()]);
    }).then(function(r){reportes(r[0],r[1][0],r[1][1]);});
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
