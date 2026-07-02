// Headless functional/a11y assertions via CDP (Node 24 global WebSocket).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:8745/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9555;
const userDir = mkdtempSync(join(tmpdir(), 'sel-check-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${userDir}`,'about:blank'], { stdio:['ignore','ignore','ignore'] });

let ws, msgId=0; const pending=new Map();
const send=(method,params={},sessionId)=>{const id=++msgId;ws.send(JSON.stringify({id,method,params,sessionId}));return new Promise((res,rej)=>pending.set(id,{res,rej}));};
const getJson=async p=>(await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

async function main(){
  let v; for(let i=0;i<60;i++){try{v=await getJson('/json/version');break;}catch{await sleep(150);}}
  ws=new WebSocket(v.webSocketDebuggerUrl); await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const{res,rej}=pending.get(m.id);pending.delete(m.id);m.error?rej(new Error(m.error.message)):res(m.result);}};
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const S=(m,p)=>send(m,p,sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  const errors=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));
  });
  await S('Page.navigate',{url}); await sleep(1800);

  const expr = `(function(){
    var r={};
    // landmarks
    r.hasMain = !!document.querySelector('main#main');
    r.hasSkip = !!document.querySelector('a.skip-link[href="#main"]');
    // tabs
    var tabs=[].slice.call(document.querySelectorAll('[role=tab]'));
    r.tabCount=tabs.length;
    r.tabsHaveControls=tabs.every(function(t){return t.getAttribute('aria-controls')==='phase-body';});
    r.rovingOK=(tabs.filter(function(t){return t.getAttribute('tabindex')==='0';}).length===1)&&(tabs.filter(function(t){return t.getAttribute('tabindex')==='-1';}).length===tabs.length-1);
    var panel=document.getElementById('phase-body');
    r.panelRole=panel&&panel.getAttribute('role');
    r.panelLabelled=panel&&/^tab-/.test(panel.getAttribute('aria-labelledby')||'');
    // selected tab + name shown
    var sel=document.querySelector('[role=tab][aria-selected=true]');
    r.selectedTab=sel&&sel.id;
    r.panelName=(document.getElementById('p-name')||{}).textContent;
    // arrow-key nav: dispatch ArrowRight on tablist
    var tl=document.getElementById('phase-tabs');
    tl.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    r.afterArrowSelected=(document.querySelector('[role=tab][aria-selected=true]')||{}).id;
    r.afterArrowName=(document.getElementById('p-name')||{}).textContent;
    // star will-change check
    var star=document.querySelector('.star');
    r.starWillChange=star?getComputedStyle(star).willChange:'(no star)';
    var layer=document.querySelector('#hero-stars > div');
    r.layerWillChange=layer?layer.style.willChange:'(no layer)';
    // waitlist invalid path
    var form=document.getElementById('waitlist-form'), inp=document.getElementById('wl-email'), err=document.getElementById('wl-error');
    inp.value='notanemail';
    form.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    r.errShownOnInvalid = err && !err.hidden;
    r.ariaInvalid = inp.getAttribute('aria-invalid');
    // waitlist valid path
    inp.value='mira@example.com';
    form.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
    var inner=document.querySelector('.closing-inner');
    r.isDone = inner.classList.contains('is-done');
    r.errHiddenOnValid = err.hidden;
    var ok=inner.querySelector('.waitlist-success');
    r.successFocused = document.activeElement===ok;
    r.successRole = ok.getAttribute('role');
    return r;
  })()`;
  const {result}=await S('Runtime.evaluate',{expression:expr,returnByValue:true});
  console.log(JSON.stringify(result.value,null,2));
  console.log('JS_ERRORS:', errors.length?errors:'none');
}
main().then(()=>{chrome.kill('SIGKILL');try{rmSync(userDir,{recursive:true,force:true});}catch{}process.exit(0);})
  .catch(e=>{console.error('ERR',e.message);chrome.kill('SIGKILL');try{rmSync(userDir,{recursive:true,force:true});}catch{}process.exit(1);});
