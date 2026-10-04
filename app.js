'use strict';
const KEY = 'lifelog.v1';
const DEFAULT_CATS = [
  {id:'workout', emoji:'🏋️', name:'Workout', unit:'min', goal:45, color:'#ef4444'},
  {id:'meal',    emoji:'🍽️', name:'Meal',    unit:'kcal', goal:2200, color:'#f59e0b'},
  {id:'sleep',   emoji:'😴', name:'Sleep',   unit:'hrs', goal:8, color:'#6366f1'},
  {id:'work',    emoji:'💼', name:'Work',    unit:'hrs', goal:8, color:'#0ea5e9'},
  {id:'school',  emoji:'📚', name:'School',  unit:'hrs', goal:3, color:'#10b981'},
];
const PALETTE = ['#ec4899','#14b8a6','#a855f7','#84cc16','#f97316','#06b6d4'];

let state = load();
let editingId = null;
const $ = s => document.querySelector(s);
const today = () => fmt(new Date());
function fmt(d){ const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function parse(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function shift(s,n){ const d=parse(s); d.setDate(d.getDate()+n); return fmt(d); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function load(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.cats) && Array.isArray(s.entries)) return s;
  }catch(e){}
  return {cats: DEFAULT_CATS.map(c=>({...c})), entries: []};
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }
  catch(e){ alert('Could not save — browser storage may be full or disabled.'); }
}
const cat = id => state.cats.find(c=>c.id===id);

function el(tag, props={}, ...kids){
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(props)){
    if (k==='style') e.style.cssText=v; else if (k.startsWith('on')) e.addEventListener(k.slice(2),v); else e[k]=v;
  }
  for (const k of kids) e.append(k);
  return e;
}
const num = n => (Math.round(n*100)/100).toLocaleString();

// ---------- tabs ----------
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
function showView(v){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.querySelectorAll('.view').forEach(s=>s.hidden = s.id!=='view-'+v);
  render();
}

// ---------- today ----------
const dayInput = $('#day');
dayInput.value = today();
dayInput.addEventListener('change',()=>{ if(!dayInput.value) dayInput.value=today(); $('#f-date').value=dayInput.value; render(); });
$('#prev-day').onclick = ()=>setDay(shift(dayInput.value,-1));
$('#next-day').onclick = ()=>setDay(shift(dayInput.value,1));
$('#go-today').onclick = ()=>setDay(today());
function setDay(d){ dayInput.value=d; $('#f-date').value=d; render(); }

function fillCatSelect(sel, withAll){
  const prev = sel.value;
  sel.replaceChildren();
  if (withAll) sel.append(el('option',{value:'',textContent:'All'}));
  for (const c of state.cats) sel.append(el('option',{value:c.id,textContent:`${c.emoji} ${c.name}`}));
  if ([...sel.options].some(o=>o.value===prev)) sel.value = prev;
}
$('#f-cat').addEventListener('change',updateUnit);
function updateUnit(){ const c=cat($('#f-cat').value); $('#f-unit').textContent = c?`(${c.unit})`:''; }

$('#entry-form').addEventListener('submit',e=>{
  e.preventDefault();
  const data = {
    cat: $('#f-cat').value, date: $('#f-date').value, time: $('#f-time').value,
    title: $('#f-title').value.trim(), amount: parseFloat($('#f-amount').value)||0,
    notes: $('#f-notes').value.trim(),
  };
  if (!data.title || !data.date) return;
  if (editingId){
    Object.assign(state.entries.find(x=>x.id===editingId), data);
  } else {
    state.entries.push({id:uid(), ...data});
  }
  save();
  resetForm();
  dayInput.value = data.date;
  render();
});
$('#f-cancel').onclick = resetForm;
function resetForm(){
  editingId = null;
  $('#form-title').textContent='Add entry'; $('#f-submit').textContent='Add'; $('#f-cancel').hidden=true;
  $('#f-title').value=''; $('#f-amount').value=''; $('#f-notes').value=''; $('#f-time').value='';
  $('#f-date').value = dayInput.value;
}
function startEdit(en){
  editingId = en.id;
  $('#f-cat').value=en.cat; $('#f-date').value=en.date; $('#f-time').value=en.time||'';
  $('#f-title').value=en.title; $('#f-amount').value=en.amount||''; $('#f-notes').value=en.notes||'';
  $('#form-title').textContent='Edit entry'; $('#f-submit').textContent='Save'; $('#f-cancel').hidden=false;
  updateUnit();
  showView('today');
  $('#entry-form').scrollIntoView({behavior:'smooth'});
}
function del(en){
  if (!confirm(`Delete "${en.title}"?`)) return;
  state.entries = state.entries.filter(x=>x.id!==en.id);
  if (editingId===en.id) resetForm();
  save(); render();
}
function entryRow(en, showDate){
  const c = cat(en.cat) || {emoji:'❓',unit:'',color:'#888',name:'?'};
  const meta = [showDate?en.date:'', en.time, c.name, en.amount?`${num(en.amount)} ${c.unit}`:''].filter(Boolean).join(' · ');
  return el('li',{style:`--c:${c.color}`},
    el('span',{textContent:c.emoji,style:'font-size:1.4rem'}),
    el('div',{className:'body'},
      el('div',{className:'t',textContent:en.title}),
      el('div',{className:'m',textContent:meta}),
      en.notes ? el('div',{className:'m',textContent:en.notes}) : ''),
    el('button',{textContent:'Edit',onclick:()=>startEdit(en)}),
    el('button',{textContent:'✕',title:'Delete',onclick:()=>del(en)}));
}
const sorted = list => [...list].sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')));
function sumBy(date){
  const out = {};
  for (const en of state.entries) if (en.date===date) out[en.cat]=(out[en.cat]||0)+(en.amount||0);
  return out;
}
function renderToday(){
  const d = dayInput.value;
  const sums = sumBy(d);
  $('#totals').replaceChildren(...state.cats.map(c=>{
    const v = sums[c.id]||0;
    const pct = c.goal ? Math.min(100, v/c.goal*100) : 0;
    return el('div',{className:'card',style:`--c:${c.color}`},
      el('div',{className:'sub',textContent:`${c.emoji} ${c.name}`}),
      el('div',{className:'big',textContent:`${num(v)} ${c.unit}`}),
      c.goal ? el('div',{className:'bar'},el('i',{style:`width:${pct}%`})) : '',
      c.goal ? el('div',{className:'sub',textContent:`goal ${num(c.goal)}`}) : '');
  }));
  const list = sorted(state.entries.filter(e=>e.date===d)).reverse();
  const ul = $('#day-list');
  ul.replaceChildren(...(list.length ? list.map(e=>entryRow(e,false)) : [el('li',{className:'muted',textContent:'Nothing logged for this day yet.'})]));
}

// ---------- history ----------
$('#h-cat').addEventListener('change',renderHistory);
$('#h-q').addEventListener('input',renderHistory);
function renderHistory(){
  const c = $('#h-cat').value, q = $('#h-q').value.toLowerCase();
  const list = sorted(state.entries).filter(e=>(!c||e.cat===c) && (!q||(e.title+' '+(e.notes||'')).toLowerCase().includes(q)));
  const box = $('#history'); box.replaceChildren();
  if (!list.length){ box.append(el('p',{className:'muted',textContent:'No entries match.'})); return; }
  let last = null, ul = null;
  for (const e of list){
    if (e.date!==last){
      last = e.date;
      box.append(el('div',{className:'dayhead',textContent:parse(e.date).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'short',day:'numeric'})}));
      ul = el('ul',{className:'entries'}); box.append(ul);
    }
    ul.append(entryRow(e,false));
  }
}

// ---------- trends ----------
function streak(c){
  const days = new Set(state.entries.filter(e=>e.cat===c.id).map(e=>e.date));
  let d = today(), n = 0;
  if (!days.has(d)) d = shift(d,-1);
  while (days.has(d)){ n++; d = shift(d,-1); }
  return n;
}
function renderTrends(){
  const box = $('#trends'); box.replaceChildren();
  const days = Array.from({length:7},(_,i)=>shift(today(),i-6));
  const perDay = days.map(sumBy);
  for (const c of state.cats){
    const vals = perDay.map(s=>s[c.id]||0);
    const max = Math.max(...vals, c.goal||0, 1);
    const total = vals.reduce((a,b)=>a+b,0);
    const logged = vals.filter(v=>v>0).length;
    box.append(el('div',{className:'trend',style:`--c:${c.color}`},
      el('h2',{textContent:`${c.emoji} ${c.name}`}),
      el('div',{className:'muted',textContent:`7-day total ${num(total)} ${c.unit} · avg ${num(logged?total/logged:0)}/day logged · ${logged}/7 days · streak ${streak(c)}`}),
      el('div',{className:'chart'}, ...vals.map((v,i)=>
        el('div',{title:`${days[i]}: ${num(v)} ${c.unit}`},
          el('i',{style:`height:${v/max*70}%`}),
          el('span',{textContent:parse(days[i]).toLocaleDateString(undefined,{weekday:'narrow'})}))))));
  }
}

// ---------- settings ----------
function renderSettings(){
  $('#cat-list').replaceChildren(...state.cats.map(c=>{
    const n = state.entries.filter(e=>e.cat===c.id).length;
    return el('li',{style:`--c:${c.color}`},
      el('span',{textContent:c.emoji,style:'font-size:1.4rem'}),
      el('div',{className:'body'},
        el('div',{className:'t',textContent:c.name}),
        el('div',{className:'m',textContent:`unit: ${c.unit} · ${n} entries`})),
      el('label',{},'Daily goal',el('input',{type:'number',min:0,step:'any',value:c.goal||'',style:'width:6rem',
        onchange:e=>{c.goal=parseFloat(e.target.value)||0;save();}})),
      el('button',{textContent:'✕',title:'Delete category',onclick:()=>{
        if (!confirm(`Delete "${c.name}" and its ${n} entries?`)) return;
        state.cats = state.cats.filter(x=>x.id!==c.id);
        state.entries = state.entries.filter(e=>e.cat!==c.id);
        save(); render();
      }}));
  }));
}
$('#cat-form').addEventListener('submit',e=>{
  e.preventDefault();
  const name = $('#c-name').value.trim();
  state.cats.push({id:uid(), emoji:$('#c-emoji').value.trim(), name, unit:$('#c-unit').value.trim(),
    goal:parseFloat($('#c-goal').value)||0, color:PALETTE[state.cats.length%PALETTE.length]});
  e.target.reset(); save(); render();
});

function download(name, text, type){
  const a = el('a',{href:URL.createObjectURL(new Blob([text],{type})),download:name});
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$('#export').onclick = ()=>download(`lifelog-${today()}.json`, JSON.stringify(state,null,2), 'application/json');
$('#export-csv').onclick = ()=>{
  const q = v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const rows = [['date','time','category','title','amount','unit','notes'].join(',')];
  for (const e of sorted(state.entries).reverse()){
    const c = cat(e.cat)||{};
    rows.push([e.date,e.time,c.name,e.title,e.amount,c.unit,e.notes].map(q).join(','));
  }
  download(`lifelog-${today()}.csv`, rows.join('\n'), 'text/csv');
};
$('#import').addEventListener('change',async e=>{
  const f = e.target.files[0]; if (!f) return;
  try{
    const s = JSON.parse(await f.text());
    if (!Array.isArray(s.cats)||!Array.isArray(s.entries)) throw 0;
    if (!confirm('Replace all current data with this file?')) return;
    state = s; save(); render();
  }catch{ alert('That file is not a valid LifeLog export.'); }
  e.target.value='';
});
$('#wipe').onclick = ()=>{
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  state = {cats: DEFAULT_CATS.map(c=>({...c})), entries: []}; save(); render();
};

// ---------- render ----------
function render(){
  fillCatSelect($('#f-cat'),false); fillCatSelect($('#h-cat'),true); updateUnit();
  renderToday(); renderHistory(); renderTrends(); renderSettings();
}
$('#f-date').value = dayInput.value;
render();
