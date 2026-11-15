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
  '#tc-inst{margin:8px 12px!important;padding:8px!important}'+
  '#tc-inst .tc-blink{cursor:pointer;list-style:none;display:flex;gap:10px;align-items:center;background:linear-gradient(90deg,#ff9f1c,#ffcf4a);color:#2a1600;border-radius:14px;padding:10px 12px;animation:tcPulso 1.6s ease-in-out infinite}'+
  '#tc-inst .tc-blink b{display:block;font-size:.92rem;letter-spacing:.02em}#tc-inst .tc-blink small{display:block;font-size:.78rem;opacity:1}'+
  '#tc-inst .tc-blink .ic{font-size:1.8rem;line-height:1;animation:tcTit 1s steps(2,start) infinite}#tc-inst .tc-blink .fl{margin-left:auto;font-weight:900;font-size:1.4rem}'+
  '#tc-inst-d[open] .tc-blink{animation:none}#tc-inst-d[open] .tc-blink .fl{transform:rotate(90deg)}'+
  '@keyframes tcPulso{0%,100%{box-shadow:0 0 0 0 rgba(255,159,28,.85);filter:brightness(1)}50%{box-shadow:0 0 0 8px rgba(255,159,28,0);filter:brightness(1.12)}}'+
  '@keyframes tcTit{to{visibility:hidden}}'+
  '#tc-inst .tc-dev .si{display:block;width:100%;box-sizing:border-box;margin:6px 0 2px;background:#0c3f52;color:#fff}#tc-inst .tc-msg{font-size:.8rem;color:#13262d;margin:4px 0 0}#tc-inst .tc-msg:empty{display:none}'+
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
  /* 5. Arranque */
  function iniciar(){
    estilo();menu();
    guiaInicial();window.addEventListener('hashchange',function(){if(location.hash==='#instalar')aviso(true);});var ib=document.getElementById('tc-inst-btn');if(ib){ib.hidden=false;ib.onclick=function(){aviso(true);};}
    if(esIOS||inApp)aviso(false);
    cargarDatos().then(ejecutarPagina).then(function(){
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
