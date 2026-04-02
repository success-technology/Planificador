/* ── UTILIDADES DE FECHA ── */
function localDateStr(date){
  const d=date||new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDate(isoStr){
  const[y,m,d]=isoStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}

/* ── LOCALSTORAGE ── */
const SK='diariotareas_v1', HK='diariotareas_history_v1';
function loadTasks(){try{return JSON.parse(localStorage.getItem(SK))||[]}catch{return[]}}
function saveTasks(t){localStorage.setItem(SK,JSON.stringify(t))}
function loadHistory(){try{return JSON.parse(localStorage.getItem(HK))||{}}catch{return{}}}
function saveHistory(h){localStorage.setItem(HK,JSON.stringify(h))}

/* ── MIGRACIÓN AL HISTORIAL ── */
function migrateOldTasks(){
  const today=localDateStr(), tasks=loadTasks(), history=loadHistory(), remaining=[];
  tasks.forEach(task=>{
    if(task.date<today){
      if(!history[task.date])history[task.date]=[];
      history[task.date].push(task);
    } else remaining.push(task);
  });
  saveTasks(remaining); saveHistory(history);
}

/* ── FORMULARIO ── */
let selectedDate='today';
function selectDate(val){
  selectedDate=val;
  document.getElementById('btnToday').classList.toggle('selected',val==='today');
  document.getElementById('btnTomorrow').classList.toggle('selected',val==='tomorrow');
}

function addTask(){
  const input=document.getElementById('taskInput');
  const err=document.getElementById('errorMsg');
  const text=input.value.trim();
  if(!text){
    input.classList.add('error'); err.classList.add('show'); input.focus();
    setTimeout(()=>{input.classList.remove('error');err.classList.remove('show')},2500);
    return;
  }
  const today=localDateStr();
  const tomorrow=localDateStr(new Date(Date.now()+86400000));
  const taskDate=selectedDate==='today'?today:tomorrow;
  const task={
    id:Date.now().toString(), text, date:taskDate, done:false,
    createdAt:new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
  };
  const tasks=loadTasks(); tasks.push(task); saveTasks(tasks);
  input.value=''; input.focus(); err.classList.remove('show');
  renderTasks(); showToast('✓ Tarea agregada');
}

/* ── ACCIONES DE TAREA ── */
function toggleTask(id){
  const tasks=loadTasks(), task=tasks.find(t=>t.id===id);
  if(!task)return;
  task.done=!task.done; saveTasks(tasks);
  renderTasks(); showToast(task.done?'✓ Tarea completada':'↩ Tarea reabierta');
}
function deleteTask(id){
  const el=document.querySelector(`[data-id="${id}"]`);
  if(el){
    el.classList.add('removing');
    el.addEventListener('animationend',()=>{
      saveTasks(loadTasks().filter(t=>t.id!==id)); renderTasks();
    },{once:true});
  }
  showToast('🗑 Tarea eliminada');
}

/* ── RENDER TAREAS ── */
const CHECK_ICON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const TRASH_ICON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

function taskHTML(task){
  const dc=task.done?'done':'';
  const dateLabel=capitalize(formatDate(task.date));
  return`<div class="task-item ${dc}" data-id="${task.id}">
    <div class="task-check" onclick="toggleTask('${task.id}')" title="Alternar estado">${CHECK_ICON}</div>
    <div class="task-body">
      <div class="task-text">${escapeHTML(task.text)}</div>
      <div class="task-meta">
        <span class="task-date-chip">${dateLabel}</span>
        <span class="task-time">Creada ${task.createdAt}</span>
      </div>
    </div>
    <button class="task-delete" onclick="deleteTask('${task.id}')" title="Eliminar">${TRASH_ICON}</button>
  </div>`;
}

function renderTasks(){
  const today=localDateStr();
  const tomorrow=localDateStr(new Date(Date.now()+86400000));
  const tasks=loadTasks();
  const todayT=tasks.filter(t=>t.date===today);
  const tomorrowT=tasks.filter(t=>t.date===tomorrow);

  document.getElementById('listToday').innerHTML=todayT.map(taskHTML).join('');
  document.getElementById('listTomorrow').innerHTML=tomorrowT.map(taskHTML).join('');
  document.getElementById('groupToday').style.display=todayT.length?'block':'none';
  document.getElementById('groupTomorrow').style.display=tomorrowT.length?'block':'none';

  const any=todayT.length+tomorrowT.length>0;
  const es=document.getElementById('emptyTasks');
  es.style.display=any?'none':'flex';
  if(!any)es.style.flexDirection='column';

  const pw=document.getElementById('progressWrap');
  pw.style.display=todayT.length?'flex':'none';
  const done=todayT.filter(t=>t.done).length;
  const pct=todayT.length?Math.round(done/todayT.length*100):0;
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('progressText').textContent=`${done} / ${todayT.length} completadas`;

  updateBadge('badgeTasks',tasks.filter(t=>!t.done).length);
}

/* ── RENDER HISTORIAL ── */
function renderHistory(){
  const history=loadHistory();
  const dates=Object.keys(history).sort((a,b)=>b.localeCompare(a));
  const container=document.getElementById('historyContent');
  const empty=document.getElementById('emptyHistory');
  const clearBtn=document.getElementById('clearHistoryBtn');

  if(!dates.length){
    container.innerHTML='';
    empty.style.display='flex'; empty.style.flexDirection='column';
    clearBtn.style.display='none';
    updateBadge('badgeHistory',0); return;
  }
  empty.style.display='none'; clearBtn.style.display='block';
  let total=0;
  container.innerHTML=dates.map(date=>{
    const items=history[date]; total+=items.length;
    const done=items.filter(t=>t.done).length;
    const tasksH=items.map(task=>`
      <div class="task-item history-item ${task.done?'done':''}" data-id="${task.id}">
        <div class="task-check" style="cursor:default">${CHECK_ICON}</div>
        <div class="task-body">
          <div class="task-text">${escapeHTML(task.text)}</div>
          <div class="task-meta"><span class="task-time">Creada ${task.createdAt||'—'}</span></div>
        </div>
      </div>`).join('');
    return`<div class="history-day">
      <div class="history-date-header"><span class="day-label">${capitalize(formatDate(date))}</span></div>
      <div class="history-stats">${done} de ${items.length} completadas</div>
      <div class="task-list">${tasksH}</div>
    </div>`;
  }).join('');
  updateBadge('badgeHistory',total);
}

function clearHistory(){
  if(!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.'))return;
  saveHistory({}); renderHistory(); showToast('🗑 Historial eliminado');
}

/* ── NAVEGACIÓN ── */
function showPanel(name,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  btn.classList.add('active');
  if(name==='history')renderHistory();
}

/* ── HELPERS ── */
function updateBadge(id,count){
  const el=document.getElementById(id);
  if(!el)return;
  el.setAttribute('data-count',count); el.textContent=count;
  if(count>0){el.classList.add('pop-anim');setTimeout(()=>el.classList.remove('pop-anim'),400)}
}
function escapeHTML(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
let toastTimer;
function showToast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2400);
}
function updateHeaderDate(){
  document.getElementById('dateDisplay').textContent=capitalize(
    new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  );
}

/* ── ENTER para agregar ── */
document.getElementById('taskInput').addEventListener('keydown',e=>{if(e.key==='Enter')addTask()});

/* ── INIT ── */
function init(){
  updateHeaderDate();
  migrateOldTasks();
  renderTasks();
  const h=loadHistory();
  updateBadge('badgeHistory',Object.values(h).flat().length);
  setInterval(()=>{migrateOldTasks();renderTasks();updateHeaderDate()},60000);
}
init();
