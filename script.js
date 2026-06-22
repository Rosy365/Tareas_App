
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editIndex = null;

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

function saveTasks(){ localStorage.setItem('tasks', JSON.stringify(tasks)); }
function toggleDarkMode() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  
  body.classList.toggle('dark');
  
  if (body.classList.contains('dark')) {
    btn.innerHTML = '☀️'; // Cambia a sol cuando está en modo oscuro // 
    btn.style.textShadow = "0 0 10px #FFD700"; // Efecto de resplandor
  } else {
    btn.innerHTML = '🌙'; // Regresa a luna en modo claro 
    btn.style.textShadow = "0 0 10px #ffeb7c";
  }
}

function renderStats(){
  const container = document.getElementById('stats');
  if(!container) return; // Seguridad

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const today = new Date();
  const overdue = tasks.filter(t => t.date && new Date(t.date) < today && !t.completed).length;

  container.innerHTML = `
    <div style="line-height: 1.6;">
      <strong>📊 Estadísticas</strong><br>
      <div style="background: #eee; border-radius: 5px; height: 10px; margin: 5px 0;">
        <div style="background: #4CAF50; width: ${percent}%; height: 100%; border-radius: 5px; transition: width 0.5s;"></div>
      </div>
      Total: <b>${total}</b> | Completadas: <b>${completed}</b><br>
      Pendientes: <b>${pending}</b> | 🚨 Vencidas: <b style="color: #e53935;">${overdue}</b>
    </div>
  `;
}

let currentFilter = 'pending'; // Variable global nueva

function filterTasks(type, btn) {
  currentFilter = type;
  
  // Cambiar estado visual de los botones
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  renderTasks();
}

let searchQuery = ''; // Nueva variable global para el texto de búsqueda

function updateSearch() {
  searchQuery = document.getElementById('searchBar').value.toLowerCase();
  renderTasks(); // Volvemos a dibujar la lista con el nuevo filtro de texto
}

function renderTasks() {
  const container = document.getElementById('tasks');
  container.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizamos hoy para comparar fechas

  // 1. CLONAR Y ORDENAR por fecha (Ascendente)
  // Las tareas sin fecha se van al final
  let sortedTasks = [...tasks].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  // 2. FILTRAR por categoría
  let filtered = sortedTasks;
  if (currentFilter === 'pending') filtered = sortedTasks.filter(t => !t.completed);
  if (currentFilter === 'important') filtered = sortedTasks.filter(t => t.important && !t.completed);
  if (currentFilter === 'normal') filtered = sortedTasks.filter(t => !t.important && !t.completed);
  if (currentFilter === 'completed') filtered = sortedTasks.filter(t => t.completed);

  // 3. FILTRAR por búsqueda
  if (searchQuery) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchQuery) || 
      (t.desc && t.desc.toLowerCase().includes(searchQuery))
    );
  }

  // 4. RENDERIZAR
  filtered.forEach((task) => {
    const originalIndex = tasks.indexOf(task); 
    const taskDate = task.date ? new Date(task.date + 'T00:00:00') : null;
    
    const isOverdue = taskDate && taskDate < today && !task.completed;
    const isToday = taskDate && taskDate.getTime() === today.getTime() && !task.completed;

    const div = document.createElement('div');
    div.id = 'task-' + originalIndex;

    // Lógica de colores mejorada
    let statusClass = '';
    if (task.important && !task.completed) statusClass = 'priority-important';
    if (isToday) statusClass = 'near-deadline'; // Tono rojizo si es para hoy
    if (isOverdue) statusClass = 'overdue';    // Franja roja si ya pasó

    div.className = `card ${statusClass} ${task.completed ? 'task-done' : ''}`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <strong>${task.title}</strong><br>
          <small>${task.desc || ''}</small>
        </div>
        ${task.important ? '<span>⭐</span>' : ''}
      </div>
      <div class="date" style="margin-top:5px; font-weight: ${isToday ? 'bold' : 'normal'}">
        ${task.date || 'Sin fecha'} ${isToday ? '— ¡Es hoy!' : ''}
      </div>
      ${task.fileData ? `<span class="file-link" onclick="openFile(${originalIndex})">📎 Ver archivo</span>` : ''}
      <div class="actions">
        <button class="btn-complete" onclick="toggleComplete(${originalIndex})">${task.completed ? '↩️' : '✅'}</button>
        <button class="btn-edit" onclick="openEdit(${originalIndex})">✏️</button>
        <button class="btn-delete" onclick="deleteTask(${originalIndex})">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:gray; margin-top:20px;">No hay tareas que mostrar.</p>`;
  }
}

function openFromCalendar(i){
  document.getElementById('task-'+i).scrollIntoView({behavior:'smooth'});
}

function addTask() {
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('desc');
  const dateInput = document.getElementById('date');
  const importantInput = document.getElementById('important');
  const fileInput = document.getElementById('file');

  // VALIDACIÓN: Evita guardar si el título está vacío
  if (!titleInput.value.trim()) {
    titleInput.style.borderColor = "red";
    setTimeout(() => titleInput.style.borderColor = "", 2000);
    return;
  }

  const title = titleInput.value;
  const desc = descInput.value;
  const date = dateInput.value;
  const important = importantInput.checked;
  const file = fileInput.files[0];

  // Función interna para procesar el guardado y limpiar
  const processSave = (fileData) => {
    tasks.push({ title, desc, date, fileData, important, completed: false, createdAt: new Date().toISOString() });
    saveTasks();
    
    // LIMPIEZA: Resetear el formulario
    titleInput.value = '';
    descInput.value = '';
    dateInput.value = '';
    importantInput.checked = false;
    fileInput.value = '';

    // ACTUALIZAR VISTA
    renderStats();
    renderTasks();
    renderCalendar();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => processSave(e.target.result);
    reader.readAsDataURL(file);
  } else {
    processSave(null);
  }
}

function saveTask(title,desc,date,fileData,important){
  tasks.push({title,desc,date,fileData,important,completed:false, createdAt: new Date().toISOString()});
  saveTasks(); renderStats(); renderTasks(); renderCalendar();
}

function openEdit(i){
  editIndex=i;
  const t=tasks[i];

  document.getElementById('editTitle').value=t.title;
  document.getElementById('editDesc').value=t.desc||'';
  document.getElementById('editDate').value=t.date||'';
  document.getElementById('editImportant').checked=t.important;

  document.getElementById('editModal').style.display='flex';
}

function saveEdit(){
  const t=tasks[editIndex];

  t.title=document.getElementById('editTitle').value;
  t.desc=document.getElementById('editDesc').value;
  t.date=document.getElementById('editDate').value;
  t.important=document.getElementById('editImportant').checked;

  const file=document.getElementById('editFile').files[0];
  if(file){
    const reader=new FileReader();
    reader.onload=e=>{
      t.fileData=e.target.result;
      saveTasks(); renderStats(); renderTasks(); renderCalendar(); closeModal();
    };
    reader.readAsDataURL(file);
  } else {
    saveTasks(); renderStats(); renderTasks(); renderCalendar(); closeModal();
  }
}

function removeFile(){
  tasks[editIndex].fileData=null;
  saveTasks(); renderStats(); renderTasks(); renderCalendar();
}

function closeModal(){ document.getElementById('editModal').style.display='none'; }

function openFile(i){
  const win=window.open();
  win.document.write(`<iframe src="${tasks[i].fileData}" style="width:100%;height:100%"></iframe>`);
}

function deleteTask(i){
  if(confirm('¿Eliminar?')){
    tasks.splice(i,1);
    saveTasks(); renderStats(); renderTasks(); renderCalendar();
  }
}

function toggleComplete(i) {
  tasks[i].completed = !tasks[i].completed;
  saveTasks();
  renderTasks();
  renderStats(); // Para que el porcentaje suba al instante
}

function autoCleanOldTasks() {
  const now = new Date();
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000; // 14 días en milisegundos
  
  // Guardamos la longitud inicial para saber si realmente se borró algo
  const initialLength = tasks.length;

  tasks = tasks.filter(task => {
    // CASO 1: Tiene fecha límite
    if (task.date) {
      // Forzamos que la fecha límite se evalúe al final del día (T23:59:59)
      const deadlineDate = new Date(task.date + 'T23:59:59');
      return (now - deadlineDate) < TWO_WEEKS_MS;
    }
    
    // CASO 2: No tiene fecha límite (depende de createdAt)
    if (task.createdAt) {
      const createdDate = new Date(task.createdAt);
      return (now - createdDate) < TWO_WEEKS_MS;
    }

    // Respaldo por seguridad: Si es una tarea vieja que no tiene 'createdAt',
    // la dejamos pasar para que no se borre de golpe hasta que empiece a registrar fechas.
    return true;
  });

  // Si el tamaño del array cambió, guardamos y actualizamos la interfaz
  if (tasks.length !== initialLength) {
    saveTasks();
    console.log(`🧹 Limpieza automática: Se eliminaron ${initialLength - tasks.length} tareas obsoletas.`);
  }
}

function renderCalendar(){
  const calendar = document.getElementById('calendar');
  const label = document.getElementById('monthLabel');
  calendar.innerHTML = '';

  // Nota: Asegúrate de usar 'firstDay' en tu bucle de espacios vacíos en lugar de 'startingDay'
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  label.textContent = monthNames[currentMonth] + " " + currentYear;

  const daysHeader = ['D','L', 'M', 'M', 'J', 'V', 'S'];
  let html = '<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center;">';
  
  daysHeader.forEach(day => {
    html += `<div style="font-weight:bold; font-size:0.8em; padding-bottom:5px;">${day}</div>`;
  });

  // CORRECCIÓN: Cambié 'startingDay' por 'firstDay' que es la variable que declaras arriba
  for(let i = 0; i < firstDay; i++) html += '<div></div>';

  // OBTENER LA FECHA LOCAL DE HOY (Formato YYYY-MM-DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = tasks.filter(t => t.date === dateStr).length;
    
    // CORRECCIÓN: Comparamos directamente contra la cadena de fecha local
    const isToday = todayStr === dateStr;

    html += `
      <div style="padding:8px 2px; border-radius:8px; background:${isToday ? '#4cadfc' : '#eee'}; 
           color:${isToday ? 'white' : 'black'}; text-align:center; cursor:pointer; font-size:0.9em;" 
           onclick="showDayTasks('${dateStr}')">
        ${d}${count > 0 ? `<br><b style="font-size:0.7em;">• ${count}</b>` : ''}
      </div>`;
  }

  html += '</div>';
  calendar.innerHTML = html;
}

function prevMonth(){
  currentMonth--;
  if(currentMonth<0){ currentMonth=11; currentYear--; }
  renderCalendar();
}

function nextMonth(){
  currentMonth++;
  if(currentMonth>11){ currentMonth=0; currentYear++; }
  renderCalendar();
}

function showDayTasks(date){
  const list=document.getElementById('dayTasks');
  const title=document.getElementById('dayTitle');

  const dayTasks=tasks.map((t,i)=>({...t,index:i})).filter(t=>t.date===date);
  title.textContent = "Tareas para " + date;

  if(dayTasks.length===0){
    list.innerHTML = "<p>No hay tareas este día</p>";
  } else {
    list.innerHTML = dayTasks.map(t=>
      `<div class="link-task" onclick="goToTask(${t.index})">• ${t.title}</div>`
    ).join('');
  }

  document.getElementById('dayModal').style.display='flex';
}

function goToTask(i){
  closeDayModal();
  setTimeout(()=>{
    document.getElementById('task-'+i).scrollIntoView({behavior:'smooth'});
  },200);
}

function closeDayModal(){ document.getElementById('dayModal').style.display='none'; }

// Registrar el Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// 👇 EJECUTAR LIMPIEZA ANTES DE RENDERIZAR
autoCleanOldTasks();

renderTasks();
renderStats();
renderCalendar();