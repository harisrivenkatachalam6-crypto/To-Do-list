/* ═══════════════════════════════════════════
   TASKFLOW — APP LOGIC
   ═══════════════════════════════════════════ */

// ── State ────────────────────────────────────
const STORAGE_KEY = 'taskflow_tasks_v1';

let tasks  = loadTasks();
let filter = 'all'; // 'all' | 'pending' | 'completed'

// ── DOM References ───────────────────────────
const taskInput         = document.getElementById('taskInput');
const addBtn            = document.getElementById('addBtn');
const taskList          = document.getElementById('taskList');
const emptyState        = document.getElementById('emptyState');
const emptyTitle        = document.getElementById('emptyTitle');
const emptyDesc         = document.getElementById('emptyDesc');
const totalCountEl      = document.getElementById('totalCount');
const pendingCountEl    = document.getElementById('pendingCount');
const doneCountEl       = document.getElementById('doneCount');
const progressPctEl     = document.getElementById('progressPct');
const progressBarEl     = document.getElementById('progressBar');
const bulkFooter        = document.getElementById('bulkFooter');
const bulkInfo          = document.getElementById('bulkInfo');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const headerDate        = document.getElementById('headerDate');
const toast             = document.getElementById('toast');

// ── Date Header ──────────────────────────────
function setHeaderDate() {
  const now = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  headerDate.textContent = now.toLocaleDateString(undefined, opts);
}
setHeaderDate();

// ── LocalStorage ─────────────────────────────
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ── Task CRUD ────────────────────────────────
function addTask(text) {
  text = text.trim();
  if (!text) {
    showToast('Please type a task first!', 'error');
    taskInput.focus();
    return;
  }
  if (text.length > 150) {
    showToast('Task text is too long (max 150 chars).', 'error');
    return;
  }
  const task = {
    id:        crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  };
  tasks.unshift(task);
  saveTasks();
  taskInput.value = '';
  taskInput.focus();
  renderAll();
  showToast('Task added! ✨', 'success');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  saveTasks();
  renderAll();
  showToast(task.completed ? 'Task completed! 🎉' : 'Task reopened.', 'info');
}

function deleteTask(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    item.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    }, { once: true });
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderAll();
  }
  showToast('Task deleted.', 'error');
}

function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  if (!count) return;
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderAll();
  showToast(`${count} completed task${count > 1 ? 's' : ''} cleared.`, 'info');
}

// ── Render ───────────────────────────────────
function getFiltered() {
  switch (filter) {
    case 'pending':   return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t =>  t.completed);
    default:          return tasks;
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000; // seconds
  if (diff < 60)              return 'just now';
  if (diff < 3600)            return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)           return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.setAttribute('data-id', task.id);
  li.setAttribute('role', 'listitem');

  li.innerHTML = `
    <label class="task-checkbox" title="${task.completed ? 'Mark as pending' : 'Mark as complete'}">
      <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle task" />
      <span class="checkmark">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M5 13L9 17L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </label>
    <div class="task-text-wrap">
      <div class="task-text">${escapeHTML(task.text)}</div>
      <div class="task-meta">${formatDate(task.createdAt)}</div>
    </div>
    <button class="delete-btn" title="Delete task" aria-label="Delete task">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M3 6H21M8 6V4H16V6M19 6L18.1 20H5.9L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  // Events
  li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTask(task.id));
  li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

  return li;
}

function renderTasks() {
  const filtered = getFiltered();

  // Clear existing (non-removing) items
  Array.from(taskList.querySelectorAll('.task-item:not(.removing)')).forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.hidden = false;
    // Set empty message per filter
    if (filter === 'completed') {
      emptyTitle.textContent = 'No completed tasks yet.';
      emptyDesc.textContent  = 'Complete a task to see it here!';
    } else if (filter === 'pending') {
      emptyTitle.textContent = 'All caught up! 🎉';
      emptyDesc.textContent  = 'No pending tasks. Great work!';
    } else {
      emptyTitle.textContent = 'No tasks yet!';
      emptyDesc.textContent  = 'Add your first task above to get started.';
    }
  } else {
    emptyState.hidden = true;
    const frag = document.createDocumentFragment();
    filtered.forEach(task => frag.appendChild(createTaskEl(task)));
    taskList.appendChild(frag);
  }
}

function renderStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  totalCountEl.textContent   = total;
  pendingCountEl.textContent = pending;
  doneCountEl.textContent    = done;
  progressPctEl.textContent  = pct + '%';
  progressBarEl.style.width  = pct + '%';

  // Footer
  if (done > 0) {
    bulkFooter.classList.remove('hidden');
    bulkInfo.textContent = `${done} task${done > 1 ? 's' : ''} completed`;
  } else {
    bulkFooter.classList.add('hidden');
  }
}

function renderAll() {
  renderStats();
  renderTasks();
}

// ── Filter Tabs ──────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    renderTasks();
  });
});

// ── Add Task Events ──────────────────────────
addBtn.addEventListener('click', () => addTask(taskInput.value));

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask(taskInput.value);
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// ── Toast ────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  // Force reflow for re-trigger
  void toast.offsetWidth;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Keyboard Shortcut: Ctrl+/ to focus input ─
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    taskInput.focus();
  }
});

// ── Boot ─────────────────────────────────────
renderAll();
