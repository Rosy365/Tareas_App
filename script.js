// Configuración y Gestión de IndexedDB
const dbManager = {
  dbName: 'TasksDB',
  dbVersion: 1,
  storeName: 'tasks',
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = (e) => reject("Error al abrir IndexedDB: " + e.target.error);
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  getAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  save(task) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(task);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  delete(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
};

// Variables globales
let tasks = [];
let editId = null;
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentFilter = 'pending';
let searchQuery = '';

// --- SISTEMA DE NOTIFICACIONES TOAST ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function toggleDarkMode() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  body.classList.toggle('dark');
  
  if (body.classList.contains('dark')) {
    btn.innerHTML = '☀️'; 
    btn.style.textShadow = "0 0 10px #FFD700"; 
  } else {
    btn.innerHTML = '🌙'; 
    btn.style.textShadow = "0 0 10px #ffeb7c";
  }
}

function renderStats(){
  const container = document.getElementById('stats');
  if(!container) return; 

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const overdue = tasks.filter(t => {
    if (!t.date || t.completed) return false;
    const [year, month, day] = t.date.split('-');
    const taskDeadline = new Date(year, month - 1, day);
    return taskDeadline < today;
  }).length;
  const pending = total - (completed + overdue);

  container.innerHTML = `
  <div style="padding: 5px;">
  <details>
    <summary style="font-size: 1.1em; font-weight: bold; cursor: pointer; user-select: none;">
      📊 Estadísticas
    </summary>
    <div style="margin:10px;">
      <div class="osc" style="background: #eee; border-radius: 5px; height: 10px; width: 100%; margin-bottom: 5px;">
        <div style="background: #4CAF50; width: ${percent}%; height: 100%; border-radius: 5px; transition: width 0.5s;"></div>
      </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 0.9em;">
        <div style="font-size: 0.9em; color: gray; margin-bottom: 12px;"><b>${percent}%</b> completadas</div>
        <div>
          <span class="link ${currentFilter === 'all' ? 'active-filter' : ''}" style="cursor: pointer;" onclick="filterTasks('all', this)">Total: <b>${total}</b></span>
          <span style="color: #ccc; margin: 0 6px;">|</span>
          <span class="link ${currentFilter === 'completed' ? 'active-filter' : ''}" style="cursor: pointer;" onclick="filterTasks('completed', this)">Completadas: <b>${completed}</b></span>
        </div>
        <div>
          <span class="link ${currentFilter === 'pending' ? 'active-filter' : ''}" style="cursor: pointer;" onclick="filterTasks('pending', this)">Pendientes: <b>${pending}</b></span>
          <span style="color: #ccc; margin: 0 6px;">|</span>
          <span class="link ${currentFilter === 'overdue' ? 'active-filter' : ''}" style="cursor: pointer;" onclick="filterTasks('overdue', this)">
            <span style="font-size: 1.1em;">🚨</span> <span>Vencidas: <b style="color: #d9383a;">${overdue}</b></span>
          </span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; justify-content: center; gap: 6px;">
        <button class="btn-filter" onclick="filterTasks('important', this)" style="cursor: pointer; padding: 6px 16px; display: inline-flex; justify-content: center; align-items: center; gap: 4px; width: 100%;">
          <span>⭐</span> <b>${tasks.filter(t => t.important && !t.completed).length}</b>
        </button>
        <button class="btn-filter" onclick="filterTasks('normal', this)" 
                style="cursor: pointer; padding: 6px 16px; display: inline-flex; justify-content: center; align-items: center; gap: 4px; width: 100%;">
          <span>📄</span> <b>${tasks.filter(t => !t.important && !t.completed).length}</b>
        </button>
      </div>
    </div>
  </div>
  </details>
  <div style="width: 100%;">
    <input type="text" id="searchBar" placeholder="🔍 Buscar tarea..." onkeyup="updateSearch()" style="width: 100%; padding: 8px; box-sizing: border-box; border-radius: 5px; border: 1px solid #ccc;">
  </div>
  </div>
`;
}

function filterTasks(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.link').forEach(l => l.classList.remove('active-filter'));
  
  if (btn) {
    if (btn.classList.contains('link')) {
      btn.classList.add('active-filter'); 
    } else {
      btn.classList.add('active'); 
    }
  }
  renderTasks();
}

function updateSearch() {
  searchQuery = document.getElementById('searchBar').value.toLowerCase();
  renderTasks(); 
}

function renderTasks() {
  const container = document.getElementById('tasks');
  container.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  let sortedTasks = [...tasks].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  let filtered = sortedTasks;
  if (currentFilter === 'completed') filtered = sortedTasks.filter(t => t.completed);
  
  if (currentFilter === 'overdue') {
    filtered = sortedTasks.filter(t => {
      if (!t.date || t.completed) return false;
      const [year, month, day] = t.date.split('-');
      const taskDate = new Date(year, month - 1, day);
      return taskDate < today;
    });
  }

  if (currentFilter === 'pending') {
    filtered = sortedTasks.filter(t => {
      if (t.completed) return false;
      if (!t.date) return true; 
      const [year, month, day] = t.date.split('-');
      const taskDate = new Date(year, month - 1, day);
      return taskDate >= today;
    });
  }

  if (currentFilter === 'important') filtered = sortedTasks.filter(t => t.important && !t.completed);
  if (currentFilter === 'normal') filtered = sortedTasks.filter(t => !t.important && !t.completed);

  if (searchQuery) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchQuery) || 
      (t.desc && t.desc.toLowerCase().includes(searchQuery))
    );
  }

  filtered.forEach((task) => {
    const taskDate = task.date ? new Date(task.date + 'T00:00:00') : null;
    const isOverdue = taskDate && taskDate < today && !task.completed;
    const isToday = taskDate && taskDate.getTime() === today.getTime() && !task.completed;

    const div = document.createElement('div');
    div.id = 'task-' + task.id;

    let statusClass = '';
    if (task.important && !task.completed) statusClass = 'priority-important';
    if (isToday) statusClass = 'near-deadline'; 
    if (isOverdue) statusClass = 'overdue';    

    div.className = `card ${statusClass} ${task.completed ? 'task-done' : ''}`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
        <div style="flex: 1;">
          <strong>${task.title}</strong><br>
          <small>${task.desc || ''}</small>
          ${task.fileData ? `<br><span class="file-link" onclick="openFileById(${task.id})">📎 Ver archivo</span>` : ''}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; text-align: right;">
          ${task.important ? '<span>⭐</span>' : ''}
          ${task.recurring && task.recurring !== 'none' ? `<small style="color: #4cadfc; font-weight: bold; font-size: 0.75em;">🔄 ${task.recurring}</small>` : ''}
          <div class="date" style="font-size: 0.85em; width: 100%; font-weight: ${isToday ? 'bold' : 'normal'}">
            ${task.date || 'Sin fecha'} ${isToday ? '— ¡Es hoy!' : ''}
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-complete" onclick="toggleComplete(${task.id})">${task.completed ? '↩️' : '✅'}</button>
        <button class="btn-edit" onclick="openEdit(${task.id})">✏️</button>
        <button class="btn-delete" onclick="deleteTask(${task.id})">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:gray; margin-top:20px;">No hay tareas que mostrar.</p>`;
  }
}

function addTask() {
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('desc');
  const dateInput = document.getElementById('date');
  const importantInput = document.getElementById('important');
  const recurringInput = document.getElementById('recurring');
  const fileInput = document.getElementById('file');

  if (!titleInput.value.trim()) {
    showToast("Por favor ingresa un título para la tarea", "error");
    titleInput.style.borderColor = "red";
    setTimeout(() => titleInput.style.borderColor = "", 2000);
    return;
  }

  const title = titleInput.value;
  const desc = descInput.value;
  const date = dateInput.value;
  const important = importantInput.checked;
  const recurring = recurringInput.value;
  const file = fileInput.files[0];

  const processSave = async (fileData) => {
    const newTask = { 
      title, 
      desc, 
      date, 
      fileData, 
      important, 
      recurring, 
      completed: false, 
      notified: false, 
      createdAt: new Date().toISOString() 
    };
    
    await dbManager.save(newTask);
    tasks = await dbManager.getAll();

    titleInput.value = '';
    descInput.value = '';
    dateInput.value = '';
    importantInput.checked = false;
    recurringInput.value = 'none';
    fileInput.value = '';

    renderStats();
    renderTasks();
    renderCalendar();

    showToast("¡Tarea creada con éxito!", "success");
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => processSave(e.target.result);
    reader.readAsDataURL(file);
  } else {
    processSave(null);
  }
}

function openEdit(id){
  editId = id;
  const t = tasks.find(task => task.id === id);
  if(!t) return;

  document.getElementById('editTitle').value = t.title;
  document.getElementById('editDesc').value = t.desc || '';
  document.getElementById('editDate').value = t.date || '';
  document.getElementById('editImportant').checked = t.important;
  document.getElementById('editRecurring').value = t.recurring || 'none';

  document.getElementById('editModal').style.display = 'flex';
}

async function saveEdit(){
  const t = tasks.find(task => task.id === editId);
  if(!t) return;

  t.title = document.getElementById('editTitle').value;
  t.desc = document.getElementById('editDesc').value;
  t.date = document.getElementById('editDate').value;
  t.important = document.getElementById('editImportant').checked;
  t.recurring = document.getElementById('editRecurring').value;

  const file = document.getElementById('editFile').files[0];
  
  const finishEdit = async () => {
    await dbManager.save(t);
    tasks = await dbManager.getAll();
    renderStats(); renderTasks(); renderCalendar(); closeModal();
    showToast("Tarea actualizada correctamente", "success");
  };

  if(file){
    const reader = new FileReader();
    reader.onload = async e => {
      t.fileData = e.target.result;
      await finishEdit();
    };
    reader.readAsDataURL(file);
  } else {
    await finishEdit();
  }
}

async function removeFile(){
  const t = tasks.find(task => task.id === editId);
  if(t) {
    t.fileData = null;
    await dbManager.save(t);
    tasks = await dbManager.getAll();
    renderStats(); renderTasks(); renderCalendar();
    showToast("Archivo adjunto eliminado", "info");
  }
}

function closeModal(){ document.getElementById('editModal').style.display='none'; }

function openFileById(id){
  const t = tasks.find(task => task.id === id);
  if(t && t.fileData) {
    const win = window.open();
    win.document.write(`<iframe src="${t.fileData}" style="width:100%;height:100%"></iframe>`);
  }
}

async function deleteTask(id){
  if(confirm('¿Eliminar esta tarea?')){
    await dbManager.delete(id);
    tasks = await dbManager.getAll();
    renderStats(); renderTasks(); renderCalendar();
    showToast("Tarea eliminada", "info");
  }
}

function getNextDate(dateStr, frequency) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    return null;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function toggleComplete(id) {
  const t = tasks.find(task => task.id === id);
  if(t) {
    const wasCompleted = t.completed;
    t.completed = !t.completed;
    await dbManager.save(t);

    if (!wasCompleted && t.recurring && t.recurring !== 'none' && t.date) {
      const nextDate = getNextDate(t.date, t.recurring);
      
      if (nextDate) {
        const nextTask = {
          title: t.title,
          desc: t.desc,
          date: nextDate,
          fileData: t.fileData,
          important: t.important,
          recurring: t.recurring,
          completed: false,
          notified: false,
          createdAt: new Date().toISOString()
        };
        await dbManager.save(nextTask);
        showToast(`Tarea completada. Siguiente programada para ${nextDate}`, "success");
      }
    } else {
      showToast(t.completed ? "Tarea completada" : "Tarea marcada como pendiente", "info");
    }

    tasks = await dbManager.getAll();
    renderTasks();
    renderStats(); 
    renderCalendar();
  }
}

async function autoCleanOldTasks() {
  const now = new Date();
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000; 
  let deletedCount = 0;

  for (const task of tasks) {
    let shouldDelete = false;
    if (task.date) {
      const deadlineDate = new Date(task.date + 'T23:59:59');
      shouldDelete = (now - deadlineDate) >= TWO_WEEKS_MS;
    } else if (task.createdAt) {
      const createdDate = new Date(task.createdAt);
      shouldDelete = (now - createdDate) >= TWO_WEEKS_MS;
    }

    if(shouldDelete) {
      await dbManager.delete(task.id);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    tasks = await dbManager.getAll();
    showToast(`Limpieza automática: ${deletedCount} tareas obsoletas eliminadas.`, "info");
  }
}

function renderCalendar(){
  const calendar = document.getElementById('calendar');
  const label = document.getElementById('monthLabel');
  if(!calendar) return;
  calendar.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  label.textContent = monthNames[currentMonth] + " " + currentYear;

  const daysHeader = ['D','L', 'M', 'M', 'J', 'V', 'S'];
  let html = '<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center;">';
  
  daysHeader.forEach(day => {
    html += `<div style="font-weight:bold; font-size:0.8em; padding-bottom:5px;">${day}</div>`;
  });

  for(let i = 0; i < firstDay; i++) html += '<div></div>';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = tasks.filter(t => t.date === dateStr).length;
    const isToday = todayStr === dateStr;

    html += `
      <div class="dar ${isToday ? 'calendar-today' : ''}" 
           style="padding:8px 2px; border-radius:8px; text-align:center; cursor:pointer; font-size:0.9em;" 
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

function showDayTasks(date) {
  const list = document.getElementById('dayTasks');
  const title = document.getElementById('dayTitle');
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  const dayTasks = tasks.filter(t => t.date === date);

  title.textContent = "Tareas para " + date;

  if (dayTasks.length === 0) {
    list.innerHTML = "<p style='text-align:center; color:gray;'>No hay tareas este día</p>";
  } else {
    list.innerHTML = '';

    dayTasks.forEach((task) => {
      const taskDate = task.date ? new Date(task.date + 'T00:00:00') : null;
      const isOverdue = taskDate && taskDate < today && !task.completed;
      const isToday = taskDate && taskDate.getTime() === today.getTime() && !task.completed;

      let statusClass = '';
      if (task.important && !task.completed) statusClass = 'priority-important';
      if (isToday) statusClass = 'near-deadline';
      if (isOverdue) statusClass = 'overdue';

      const div = document.createElement('div');
      div.className = `card ${statusClass} ${task.completed ? 'task-done' : ''}`;
      div.style.marginBottom = "15px"; 

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
          <div style="flex: 1;">
            <strong class="link-task" onclick="goToTask(${task.id})" style="cursor:pointer; text-decoration:underline; color:#007bff;">
              ${task.title} 🔍
            </strong><br>
            <small>${task.desc || ''}</small>
            ${task.fileData ? `<br><span class="file-link" onclick="openFileById(${task.id})">📎 Ver archivo</span>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; text-align: right;">
            ${task.important ? '<span>⭐</span>' : ''}
            ${task.recurring && task.recurring !== 'none' ? `<small style="color: #4cadfc; font-weight: bold; font-size: 0.75em;">🔄 ${task.recurring}</small>` : ''}
            <div class="date" style="font-size: 0.85em; width: 100%; font-weight: ${isToday ? 'bold' : 'normal'}">
              ${task.date || 'Sin fecha'} ${isToday ? '— ¡Es hoy!' : ''}
            </div>
          </div>
        </div>
        <div class="actions">
          <button class="btn-complete" onclick="toggleCompleteFromModal(${task.id}, '${date}')">${task.completed ? '↩️' : '✅'}</button>
          <button class="btn-edit" onclick="openEditFromModal(${task.id})">✏️</button>
          <button class="btn-delete" onclick="deleteTaskFromModal(${task.id}, '${date}')">🗑️</button>
        </div>
      `;
      list.appendChild(div);
    });
  }

  document.getElementById('dayModal').style.display = 'flex';
}

async function toggleCompleteFromModal(id, date) {
  await toggleComplete(id);
  renderCalendar();
  showDayTasks(date); 
}

async function deleteTaskFromModal(id, date) {
  if (confirm('¿Eliminar?')) {
    await dbManager.delete(id);
    tasks = await dbManager.getAll();
    renderTasks();
    renderStats();
    renderCalendar();
    showDayTasks(date); 
    showToast("Tarea eliminada", "info");
  }
}

function openEditFromModal(id) {
  closeDayModal(); 
  openEdit(id);
}

function goToTask(id){
  closeDayModal();
  currentFilter = 'all'; 
  searchQuery = '';
  
  const searchBar = document.getElementById('searchBar');
  if (searchBar) searchBar.value = ''; 
  
  renderStats();
  renderTasks();

  setTimeout(()=>{
    const targetTask = document.getElementById('task-'+id);
    if (targetTask) {
      targetTask.scrollIntoView({behavior:'smooth'});
    }
  },200);
}

function closeDayModal(){ document.getElementById('dayModal').style.display='none'; }

// --- GESTIÓN DE NOTIFICACIONES NATIVAS ---
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Este navegador no soporta notificaciones", "error");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    showNotification("¡Notificaciones activadas!", "Te avisaremos cuando tus tareas venzan.");
    showToast("Permisos de notificación concedidos", "success");
  } else {
    showToast("Permisos de notificación denegados", "error");
  }
}

function showNotification(title, body) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [200, 100, 200]
      });
    });
  } else if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

async function checkDueTasksAndNotify() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let updated = false;

  for (const task of tasks) {
    if (task.completed || task.notified) continue;

    if (task.date) {
      const [year, month, day] = task.date.split('-');
      const taskDate = new Date(year, month - 1, day);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate <= today) {
        const isToday = taskDate.getTime() === today.getTime();
        const title = isToday ? "⏰ ¡Tarea para hoy!" : "🚨 ¡Tarea vencida!";
        const body = `La tarea "${task.title}" requiere tu atención.`;

        showNotification(title, body);

        task.notified = true;
        await dbManager.save(task);
        updated = true;
      }
    }
  }

  if (updated) {
    tasks = await dbManager.getAll();
  }
}

// --- COPIA DE SEGURIDAD (EXPORTAR E IMPORTAR) ---
async function exportData() {
  try {
    const allTasks = await dbManager.getAll();
    
    if (allTasks.length === 0) {
      showToast("No hay tareas para exportar", "info");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allTasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const date = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `tareas_backup_${date}.json`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("Copia de seguridad descargada", "success");
  } catch (error) {
    console.error("Error al exportar datos:", error);
    showToast("Error al exportar las tareas", "error");
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importedTasks = JSON.parse(e.target.result);
      
      if (!Array.isArray(importedTasks)) {
        showToast("El archivo seleccionado no es válido", "error");
        return;
      }

      if (confirm(`Se encontraron ${importedTasks.length} tareas. ¿Deseas importarlas?`)) {
        for (const task of importedTasks) {
          delete task.id; 
          await dbManager.save(task);
        }

        tasks = await dbManager.getAll();
        renderStats();
        renderTasks();
        renderCalendar();
        
        showToast("¡Copia de seguridad importada con éxito!", "success");
      }
    } catch (error) {
      console.error("Error al leer el archivo JSON:", error);
      showToast("El archivo no es un JSON válido", "error");
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

// Manejar accesos directos desde el Manifest
function handleShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');

  if (action === 'new') {
    const addDetails = document.querySelector('.card details');
    if (addDetails) addDetails.open = true;
  } else if (action === 'calendar') {
    const calendarCard = document.getElementById('calendar');
    if (calendarCard) calendarCard.scrollIntoView({ behavior: 'smooth' });
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// --- ARRANQUE DE LA APLICACIÓN ---
async function initApp() {
  try {
    await dbManager.init();
    tasks = await dbManager.getAll();
    await autoCleanOldTasks();
    
    await checkDueTasksAndNotify();

    renderTasks();
    renderStats();
    renderCalendar();

    handleShortcuts();
  } catch (error) {
    console.error("No se pudo iniciar la aplicación correctamente:", error);
    showToast("Error al iniciar la base de datos", "error");
  }
}

initApp();