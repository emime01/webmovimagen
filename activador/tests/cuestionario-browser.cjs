const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/activador/?camara=0&cuestionario=inmobiliario',{waitUntil:'domcontentloaded'});
 await page.locator('.quiz-opcion').first().waitFor();
 await page.keyboard.press('1');assert.equal(await page.locator('.escena-cuestionario h1').innerText(),'¿Estás buscando mudarte?');
 await page.keyboard.press('1');assert.equal(await page.locator('.escena-cuestionario h1').innerText(),'¿A dónde te gustaría mudarte?');
 await page.keyboard.press('4');assert.match(await page.locator('.escena-cuestionario h1').innerText(),/Paysandú/);
 assert.equal(await page.locator('.quiz-qr').count(),1);
 const destinoReal = new URL(await page.locator('.quiz-qr').getAttribute('href'));
 assert.equal(destinoReal.hostname,'veocasas.com'); assert.equal(destinoReal.searchParams.get('location'),'11');
 assert.equal(destinoReal.searchParams.get('neighborhoods'),'ec42c906-78ff-4915-96c6-0b208e90b059');
 await page.keyboard.press('Escape');await page.waitForTimeout(800);assert.equal(await page.locator('.escena-cuestionario').count(),0);
 await page.goto('http://127.0.0.1:8000/activador/?camara=0',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {crearCuestionario,inmobiliario}=await import('./cuestionario.js');
  window.signals={camara:{estado:'apagada'},cercania:0,personas:0,gesto:null,teclas:{},toque:-Infinity};window.records=[];window.finishedCalls=0;
  
  window.root=document.createElement('div');document.body.append(root);
  window.quiz=crearCuestionario({raiz:root,senales:signals,pantalla:'mercedes-01',registrar:n=>records.push(n),terminar:()=>finishedCalls++});
  window.cfg=inmobiliario();cfg.ciudades.forEach(d=>d.url='https://example.com/propiedades?filtro='+encodeURIComponent(d.nombre));quiz.abrir(cfg);
 });
 // Gesture release, sustained start, then prevent same held gesture answering next question.
 const state=await page.evaluate(()=>{
  let t=performance.now();quiz.paso(t);quiz.paso(t+400);signals.gesto='Thumb_Up';quiz.paso(t+500);quiz.paso(t+1400);
  const first=root.querySelector('h1').textContent;quiz.paso(t+1500);quiz.paso(t+2500);const held=root.querySelector('h1').textContent;
  signals.gesto=null;quiz.paso(t+2600);quiz.paso(t+3000);signals.gesto='Thumb_Up';quiz.paso(t+3100);quiz.paso(t+4000);
  return {first,held,next:root.querySelector('h1').textContent};
 });assert.equal(state.first,state.held);assert.match(state.next,/dónde/);
 await page.evaluate(()=>{signals.gesto=null;let t=performance.now();quiz.paso(t+4100);quiz.paso(t+4500);signals.gesto='Victory';quiz.paso(t+4600);quiz.paso(t+5500);});
 const link=await page.locator('.quiz-qr').getAttribute('href');assert.equal(new URL(link).searchParams.get('filtro'),'Colonia');assert.equal(new URL(link).searchParams.get('utm_content'),'mercedes-01');assert.equal(await page.locator('.quiz-qr svg').count(),1);
 await page.screenshot({path:'/tmp/cuestionario-resultado.png'});
 // Timeout and negative branch.
 await page.evaluate(()=>{quiz.paso(performance.now()+30000);});assert.equal(await page.evaluate(()=>finishedCalls),1);
 await page.evaluate(()=>quiz.abrir(cfg));await page.keyboard.press('1');await page.keyboard.press('2');assert.match(await page.locator('body').innerText(),/Cuando quieras dar el paso/);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{quiz.abrir(cfg);signals.camara.estado='ok';signals.personas=0;signals.cercania=.6;const t=performance.now();quiz.paso(t);quiz.paso(t+8500);});assert.equal(await page.evaluate(()=>finishedCalls),3);
 await page.evaluate(()=>{const sinUrl=structuredClone(cfg);sinUrl.ciudades[0].url='';quiz.abrir(sinUrl);});await page.keyboard.press('1');await page.keyboard.press('1');await page.keyboard.press('1');assert.equal(await page.locator('.quiz-qr').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: teclado, cuatro destinos disponibles, no QR sin URL, gestos sostenidos y liberación, QR local con filtro y pantalla, resultado, timeout, no y abandono.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
