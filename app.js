// ============================================
//  SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://ngkdkokvpnddluqvhnqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2Rrb2t2cG5kZGx1cXZobnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzk3MjMsImV4cCI6MjA4ODY1NTcyM30.ZSe_24mU6yma3IOR8h6tOD9h_m9uX0twqoS1LkfItIg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
//  DOM REFERENCES & STATE
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const authContainer = $('#auth-container');
const appContainer  = $('#app-container');
const loginForm     = $('#login-form');
const signupForm    = $('#signup-form');
const authMsg       = $('#auth-msg');
const listEl        = $('#question-list');
const emptyEl       = $('#empty-state');
const loadingEl     = $('#loading');
const editOverlay   = $('#edit-overlay');
const addInput      = $('#add-input');
const addBtn        = $('#add-btn');
const addTopic      = $('#add-topic');
const searchEl      = $('#search');
const fTopic        = $('#filter-topic');
const fStatus       = $('#filter-status');
const sortEl        = $('#sort-by');

let user = null;
let tasks = [];

// ============================================
//  AUTH STATE LISTENER
// ============================================
db.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        $('#user-email').textContent = user.email;
        loadAll();
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        tasks = [];
    }
});

// ─── Auth Form Toggles ───
$('#switch-signup').onclick = e => { e.preventDefault(); loginForm.classList.remove('active'); signupForm.classList.add('active'); clearMsg(); };
$('#switch-login').onclick  = e => { e.preventDefault(); signupForm.classList.remove('active'); loginForm.classList.add('active'); clearMsg(); };

function showMsg(msg, type = 'error') { authMsg.textContent = msg; authMsg.className = 'auth-msg ' + type; }
function clearMsg() { authMsg.className = 'auth-msg'; authMsg.textContent = ''; }

// ─── Sign Up ───
signupForm.onsubmit = async e => {
    e.preventDefault(); clearMsg();
    const email = $('#signup-email').value.trim();
    const pw    = $('#signup-password').value;
    const pw2   = $('#signup-confirm').value;
    if (pw !== pw2) { showMsg('Passwords do not match.'); return; }
    const { data, error } = await db.auth.signUp({ email, password: pw });
    if (error) showMsg(error.message);
    else if (data.session) { toast('Account created!', 'success'); signupForm.reset(); }
    else { showMsg('Account created! You can now log in.', 'success'); signupForm.reset(); }
};

// ─── Log In ───
loginForm.onsubmit = async e => {
    e.preventDefault(); clearMsg();
    const { error } = await db.auth.signInWithPassword({
        email: $('#login-email').value.trim(),
        password: $('#login-password').value
    });
    if (error) showMsg(error.message);
};

// ─── Log Out ───
$('#logout-btn').onclick = async () => { await db.auth.signOut(); tasks = []; toast('Logged out', 'info'); };

// ============================================
//  LOAD
// ============================================
async function loadAll() {
    loadingEl.classList.remove('hidden'); emptyEl.classList.add('hidden'); listEl.innerHTML = '';
    const { data, error } = await db.from('tasks').select('*').eq('user_id', user.id).order('task_id', { ascending: true });
    loadingEl.classList.add('hidden');
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }
    tasks = data || [];
    render();
    // Check for deadline notifications after loading
    setTimeout(() => checkDeadlinesAndNotify(), 2000);
}

// ============================================
//  SMART PASTE — auto-detect topics (v2)
// ============================================

// Exact topic name map (lowercase → canonical)
const TOPIC_MAP = {
    'array': 'Arrays', 'arrays': 'Arrays',
    'string': 'Strings', 'strings': 'Strings',
    'linked list': 'Linked List', 'linkedlist': 'Linked List',
    'stack': 'Stack', 'stacks': 'Stack',
    'queue': 'Queue', 'queues': 'Queue',
    'hash': 'Hashing', 'hashing': 'Hashing', 'hashmap': 'Hashing', 'hash map': 'Hashing', 'hash table': 'Hashing',
    'tree': 'Tree', 'trees': 'Tree', 'binary tree': 'Tree',
    'bst': 'BST', 'binary search tree': 'BST',
    'heap': 'Heap', 'heaps': 'Heap', 'priority queue': 'Heap',
    'graph': 'Graph', 'graphs': 'Graph',
    'recursion': 'Recursion', 'recursive': 'Recursion',
    'backtracking': 'Backtracking', 'backtrack': 'Backtracking',
    'dynamic programming': 'Dynamic Programming', 'dp': 'Dynamic Programming',
    'greedy': 'Greedy',
    'binary search': 'Binary Search',
    'sliding window': 'Sliding Window',
    'two pointers': 'Two Pointers', 'two pointer': 'Two Pointers',
    'bit manipulation': 'Bit Manipulation',
    'math': 'Math', 'maths': 'Math', 'mathematics': 'Math',
    'trie': 'Trie',
    'segment tree': 'Segment Tree', 'segment trees': 'Segment Tree',
};

// Clean a header line down to just the meaningful words
function cleanHeaderText(line) {
    return line
        .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
        .replace(/\d+/g, '')
        .replace(/questions?/gi, '')
        .replace(/deadline/gi, '')
        .replace(/days?/gi, '')
        .replace(/[^\w\s\/&,\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// Match a cleaned string EXACTLY to a known topic (no substring matching)
function findTopicExact(cleaned) {
    if (TOPIC_MAP[cleaned]) return TOPIC_MAP[cleaned];
    const parts = cleaned.split(/[\/,&]/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
        if (TOPIC_MAP[part]) return TOPIC_MAP[part];
    }
    return null;
}

// Detect if a line is a TOPIC HEADER (not a question)
function detectTopicHeader(line) {
    const raw = line.trim();
    if (!raw) return null;

    const hasEmoji       = /[\u{1F1E6}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(raw) || /[️⃣]/.test(raw);
    const hasHashPrefix  = /^#{1,4}\s/.test(raw);
    const hasBoldPrefix  = /^\*\*/.test(raw);
    const hasQCount      = /\(\s*\d+\s*questions?\s*\)/i.test(raw);
    const hasNumberDot   = /^\d+[\.]\s/.test(raw) && /questions?/i.test(raw);

    const isHeader = hasEmoji || hasHashPrefix || hasBoldPrefix || hasQCount || hasNumberDot;
    if (!isHeader) return null;

    const cleaned = cleanHeaderText(raw);
    return findTopicExact(cleaned);
}

// Should this line be entirely skipped?
function shouldSkip(line) {
    const l = line.trim();
    if (!l) return true;
    if (/^⏳/u.test(l)) return true;
    if (/^\s*deadline\b/i.test(l)) return true;
    return false;
}

// SMART PARSE — the main function
function smartParse(text) {
    const lines = text.split('\n');
    const result = [];
    let currentTopic = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (shouldSkip(line)) continue;

        const headerTopic = detectTopicHeader(line);
        if (headerTopic) { currentTopic = headerTopic; continue; }

        if (!currentTopic) {
            const cleaned = line.replace(/[^\w\s]/g, '').trim().toLowerCase();
            const exact = TOPIC_MAP[cleaned];
            if (exact) { currentTopic = exact; continue; }
        }

        const title = line.replace(/^\s*\d+[\s]*[\.\)\-\:\]]\s*/, '').trim();
        if (!title) continue;

        result.push({ title, topic: currentTopic || 'General' });
    }

    return result;
}

// ─── Mode toggle ───
let smartMode = true;
const modeSmartBtn  = $('#mode-smart');
const modeManualBtn = $('#mode-manual');
const manualControls = $('#manual-controls');
const previewEl = $('#parse-preview');

modeSmartBtn.onclick = () => {
    smartMode = true;
    modeSmartBtn.classList.add('active');
    modeManualBtn.classList.remove('active');
    manualControls.classList.add('hidden');
    addInput.placeholder = "Paste your entire question list with topic headers — it auto-detects!\n\nExample:\n1️⃣ Binary Search (20 Questions)\nSearch Insert Position\nFind Peak Element";
    updatePreview();
};

modeManualBtn.onclick = () => {
    smartMode = false;
    modeManualBtn.classList.add('active');
    modeSmartBtn.classList.remove('active');
    manualControls.classList.remove('hidden');
    previewEl.classList.add('hidden');
    addInput.placeholder = "Paste questions here — one per line";
};

// ─── Live preview for smart mode ───
function updatePreview() {
    if (!smartMode) { previewEl.classList.add('hidden'); return; }
    const raw = addInput.value.trim();
    if (!raw) { previewEl.classList.add('hidden'); return; }

    const parsed = smartParse(raw);
    if (parsed.length === 0) { previewEl.classList.add('hidden'); return; }

    const groups = {};
    parsed.forEach(q => {
        if (!groups[q.topic]) groups[q.topic] = [];
        groups[q.topic].push(q.title);
    });

    let html = '<div class="preview-header">📋 Detected ' + parsed.length + ' questions:</div>';
    for (const [topic, qs] of Object.entries(groups)) {
        html += `<div class="preview-group"><span class="preview-topic">${esc(topic)}</span> — ${qs.length} question${qs.length > 1 ? 's' : ''}</div>`;
    }

    previewEl.innerHTML = html;
    previewEl.classList.remove('hidden');
}

addInput.addEventListener('input', updatePreview);

// ============================================
//  DEADLINE HELPERS
// ============================================
function getToday() {
    return new Date().toISOString().split('T')[0];
}

function isOverdue(dueDate, status) {
    if (status === 'Completed') return false;
    if (!dueDate) return false;
    return dueDate < getToday();
}

function isDueToday(dueDate, status) {
    if (status === 'Completed') return false;
    return dueDate === getToday();
}

function wasLate(dueDate, updatedAt) {
    if (!dueDate || !updatedAt) return false;
    const completedDate = updatedAt.split('T')[0];
    return completedDate > dueDate;
}

function getDeadlineStatus(task) {
    if (task.status === 'Completed') {
        return wasLate(task.due_date, task.updated_at) ? 'late' : 'ontime';
    }
    if (isOverdue(task.due_date, task.status)) return 'overdue';
    if (isDueToday(task.due_date, task.status)) return 'due-today';
    return 'pending';
}

function formatDeadline(task) {
    if (!task.due_date) return '';
    const status = getDeadlineStatus(task);
    const dueDate = new Date(task.due_date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Format date as "11th March"
    const day = dueDate.getDate();
    const suffix = getDaySuffix(day);
    const monthName = dueDate.toLocaleDateString('en-US', { month: 'long' });
    const formattedDate = `${day}${suffix} ${monthName}`;

    if (task.status === 'Completed') {
        return status === 'late' ? '⚠️ Completed Late' : '✅ Completed On Time';
    }

    if (status === 'overdue') {
        const daysLate = Math.abs(diffDays);
        return `🚨 Due on ${formattedDate} | ${daysLate} day${daysLate > 1 ? 's' : ''} overdue`;
    }
    if (status === 'due-today') return `⏰ Due Today (${formattedDate})`;
    return `📅 Due on ${formattedDate} | ${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
}

function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// ─── Get deadline N days from today ───
function getDeadlineInDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ─── Add button ───
addBtn.onclick = async () => {
    const raw = addInput.value.trim();
    if (!raw) { toast('Paste at least one question.', 'error'); return; }

    let rows;

    if (smartMode) {
        const parsed = smartParse(raw);
        if (parsed.length === 0) { toast('No questions detected. Check the format.', 'error'); return; }

        // Question 1 = +1 day, Question 2 = +2 days, etc.
        rows = parsed.map((q, index) => ({
            user_id: user.id,
            task_title: q.title,
            task_description: '',
            topic: q.topic === 'General' ? addTopic.value : q.topic,
            status: 'Pending',
            due_date: getDeadlineInDays(index + 1)
        }));
    } else {
        const topic = addTopic.value;
        const lines = raw.split(/\n/)
            .map(l => l.replace(/^\s*[\d]+[\.\)\-\:]\s*/, '').trim())
            .filter(l => l.length > 0);

        if (lines.length === 0) { toast('No valid questions found.', 'error'); return; }

        // Question 1 = +1 day, Question 2 = +2 days, etc.
        rows = lines.map((title, index) => ({
            user_id: user.id,
            task_title: title,
            task_description: '',
            topic,
            status: 'Pending',
            due_date: getDeadlineInDays(index + 1)
        }));
    }

    // Deduplicate against existing tasks
    const existingTitles = new Set(tasks.map(t => t.task_title.toLowerCase().trim()));
    const newRows = rows.filter(r => !existingTitles.has(r.task_title.toLowerCase().trim()));
    const skipped = rows.length - newRows.length;

    if (newRows.length === 0) {
        toast(`All ${rows.length} questions already exist!`, 'info');
        return;
    }

    addBtn.disabled = true;
    addBtn.textContent = `Adding ${newRows.length} question${newRows.length > 1 ? 's' : ''}…`;

    const { data, error } = await db.from('tasks').insert(newRows).select();

    addBtn.disabled = false;
    addBtn.textContent = 'Add Questions';

    if (error) { toast('Failed: ' + error.message, 'error'); return; }

    tasks = [...tasks, ...(data || [])];
    addInput.value = '';
    previewEl.classList.add('hidden');
    render();

    const daysRange = data.length === 1 ? '1 day' : `1-${data.length} days`;
    let msg = `Added ${data.length} question${data.length > 1 ? 's' : ''} with ${daysRange} deadlines!`;
    if (skipped > 0) msg += ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)`;
    toast(msg, 'success');
};

// ============================================
//  TOGGLE STATUS
// ============================================
async function toggle(id) {
    const t = tasks.find(x => x.task_id === id);
    if (!t) return;
    const ns = t.status === 'Completed' ? 'Pending' : 'Completed';
    const { data, error } = await db.from('tasks').update({ status: ns, updated_at: new Date().toISOString() }).eq('task_id', id).eq('user_id', user.id).select().single();
    if (error) { toast('Update failed', 'error'); return; }
    const i = tasks.findIndex(x => x.task_id === id);
    if (i !== -1) tasks[i] = data;
    render();

    // Show Late/On Time feedback
    if (ns === 'Completed') {
        const status = getDeadlineStatus(data);
        if (status === 'late') toast('⚠️ Completed Late!', 'info');
        else toast('✅ Solved On Time!', 'success');
    }
}

// ============================================
//  DELETE
// ============================================
async function remove(id) {
    const { error } = await db.from('tasks').delete().eq('task_id', id).eq('user_id', user.id);
    if (error) { toast('Delete failed', 'error'); return; }
    tasks = tasks.filter(x => x.task_id !== id);
    render();
    toast('Deleted', 'info');
}

// ============================================
//  EDIT
// ============================================
function openEdit(t) {
    $('#edit-id').value = t.task_id;
    $('#edit-title').value = t.task_title;
    $('#edit-notes').value = t.task_description || '';
    $('#edit-topic').value = t.topic || 'Arrays';
    $('#edit-deadline').value = t.due_date || '';
    editOverlay.classList.remove('hidden');
    $('#edit-title').focus();
}

$('#edit-cancel').onclick = () => editOverlay.classList.add('hidden');
editOverlay.onclick = e => { if (e.target === editOverlay) editOverlay.classList.add('hidden'); };

$('#edit-save').onclick = async () => {
    const id = parseInt($('#edit-id').value);
    const title = $('#edit-title').value.trim();
    if (!title) { toast('Title cannot be empty', 'error'); return; }

    const updates = {
        task_title: title,
        task_description: $('#edit-notes').value.trim(),
        topic: $('#edit-topic').value,
        due_date: $('#edit-deadline').value || null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await db.from('tasks').update(updates).eq('task_id', id).eq('user_id', user.id).select().single();
    if (error) { toast('Update failed', 'error'); return; }

    const i = tasks.findIndex(x => x.task_id === id);
    if (i !== -1) tasks[i] = data;
    editOverlay.classList.add('hidden');
    render();
    toast('Updated!', 'success');
};

// ============================================
//  FILTER / SORT / RENDER
// ============================================
searchEl.addEventListener('input', render);
fTopic.addEventListener('change', render);
fStatus.addEventListener('change', render);
sortEl.addEventListener('change', render);

function render() {
    let list = [...tasks];

    // Search
    const q = searchEl.value.trim().toLowerCase();
    if (q) list = list.filter(t => t.task_title.toLowerCase().includes(q) || (t.task_description && t.task_description.toLowerCase().includes(q)));

    // Filters
    if (fTopic.value !== 'all') list = list.filter(t => t.topic === fTopic.value);
    if (fStatus.value === 'Overdue') {
        list = list.filter(t => isOverdue(t.due_date, t.status));
    } else if (fStatus.value !== 'all') {
        list = list.filter(t => t.status === fStatus.value);
    }

    // Sort
    const [field, dir] = sortEl.value.split('-');
    const m = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
        if (field === 'due_date') {
            const da = a.due_date || '9999-12-31';
            const db = b.due_date || '9999-12-31';
            return da.localeCompare(db) * m;
        }
        return (a.task_id - b.task_id) * m;
    });

    // Build HTML
    listEl.innerHTML = '';

    if (list.length === 0) { emptyEl.classList.remove('hidden'); } else { emptyEl.classList.add('hidden'); }

    list.forEach((t, index) => {
        const li = document.createElement('li');
        const solved = t.status === 'Completed';
        const deadlineStatus = getDeadlineStatus(t);
        const isOverdueItem = deadlineStatus === 'overdue';
        const questionNum = index + 1;

        li.className = `q-item${solved ? ' solved' : ''}${isOverdueItem ? ' overdue-item' : ''}`;

        const deadlineText = formatDeadline(t);
        const deadlineClass = deadlineStatus === 'overdue' ? 'overdue' : (deadlineStatus === 'due-today' ? 'due-today' : '');

        // Deadline status tag
        let statusTag = '';
        if (solved) {
            statusTag = deadlineStatus === 'late'
                ? '<span class="tag tag-late">Late</span>'
                : '<span class="tag tag-ontime">On Time</span>';
        } else if (isOverdueItem) {
            statusTag = '<span class="tag tag-overdue">Overdue</span>';
        }

        li.innerHTML = `
            <span class="q-num">${questionNum}</span>
            <input type="checkbox" class="q-check" ${solved ? 'checked' : ''}>
            <div class="q-body">
                <div class="q-title">${esc(t.task_title)}</div>
                <div class="q-deadline ${deadlineClass}">${deadlineText}</div>
                <div class="q-tags">
                    <span class="tag tag-topic">${esc(t.topic || 'General')}</span>
                    ${statusTag}
                </div>
                ${t.task_description ? `<div class="q-notes">${esc(t.task_description)}</div>` : ''}
            </div>
            <div class="q-actions">
                <button class="edit-btn" title="Edit">✏️</button>
                <button class="del" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector('.q-check').onchange = () => toggle(t.task_id);
        li.querySelector('.edit-btn').onclick = () => openEdit(t);
        li.querySelector('.del').onclick = () => { if (confirm('Delete this question?')) remove(t.task_id); };

        listEl.appendChild(li);
    });

    updateStats();
}

// ============================================
//  STATS
// ============================================
function updateStats() {
    const total = tasks.length;
    const solved = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => isOverdue(t.due_date, t.status)).length;
    const pct = total === 0 ? 0 : Math.round((solved / total) * 100);

    $('#stat-total').textContent = total;
    $('#stat-solved').textContent = solved;
    $('#stat-unsolved').textContent = total - solved;
    $('#stat-overdue').textContent = overdue;
    $('#stat-percent').textContent = pct + '%';
    $('#progress-bar').style.width = pct + '%';

    // Show/hide delete all button
    const delBtn = $('#delete-all-btn');
    if (total > 0) delBtn.classList.remove('hidden');
    else delBtn.classList.add('hidden');

    // Update topic-wise stats
    updateTopicStats();
}

function updateTopicStats() {
    const topicStatsEl = $('#topic-stats');
    if (tasks.length === 0) {
        topicStatsEl.innerHTML = '';
        return;
    }

    // Group by topic
    const topicData = {};
    tasks.forEach(t => {
        const topic = t.topic || 'General';
        if (!topicData[topic]) topicData[topic] = { total: 0, solved: 0 };
        topicData[topic].total++;
        if (t.status === 'Completed') topicData[topic].solved++;
    });

    // Sort by total questions (descending)
    const sortedTopics = Object.entries(topicData).sort((a, b) => b[1].total - a[1].total);

    let html = '<div class="topic-stats-header">📊 Topic-wise Progress</div><div class="topic-stats-grid">';
    sortedTopics.forEach(([topic, data]) => {
        const pct = Math.round((data.solved / data.total) * 100);
        const isComplete = data.solved === data.total;
        html += `
            <div class="topic-stat-item${isComplete ? ' complete' : ''}">
                <div class="topic-stat-name">${esc(topic)}</div>
                <div class="topic-stat-progress">
                    <div class="topic-stat-bar">
                        <div class="topic-stat-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="topic-stat-nums">${data.solved}/${data.total}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    topicStatsEl.innerHTML = html;
}

// ============================================
//  DELETE ALL
// ============================================
$('#delete-all-btn').onclick = async () => {
    if (tasks.length === 0) { toast('Nothing to delete', 'info'); return; }
    const count = tasks.length;
    if (!confirm(`Delete ALL ${count} questions? This cannot be undone.`)) return;

    const btn = $('#delete-all-btn');
    btn.disabled = true;
    btn.textContent = 'Deleting…';

    const { error } = await db.from('tasks').delete().eq('user_id', user.id);

    btn.disabled = false;
    btn.textContent = '🗑️ Delete All';

    if (error) { toast('Delete failed: ' + error.message, 'error'); return; }

    tasks = [];
    render();
    toast(`Deleted all ${count} questions.`, 'info');
};

// ============================================
//  UTILS
// ============================================
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toast(msg, type='info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    $('#toast-box').appendChild(el);
    setTimeout(() => el.remove(), 3200);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') editOverlay.classList.add('hidden'); });

// ============================================
//  BROWSER NOTIFICATIONS
// ============================================
let notificationPermission = Notification.permission;
let lastNotificationCheck = 0;
const NOTIFICATION_INTERVAL = 60 * 60 * 1000; // Check every hour

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
    }
    if (Notification.permission === 'granted') {
        notificationPermission = 'granted';
        return true;
    }
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        return permission === 'granted';
    }
    return false;
}

function sendNotification(title, body, tag = 'dsa-reminder') {
    if (notificationPermission !== 'granted') return;
    
    const notification = new Notification(title, {
        body,
        icon: '📚',
        tag,
        requireInteraction: false,
        silent: false
    });
    
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
    
    setTimeout(() => notification.close(), 10000);
}

function checkDeadlinesAndNotify() {
    const now = Date.now();
    if (now - lastNotificationCheck < NOTIFICATION_INTERVAL) return;
    lastNotificationCheck = now;
    
    if (notificationPermission !== 'granted' || !tasks.length) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let overdueCount = 0;
    let dueTodayCount = 0;
    let dueTomorrowCount = 0;
    
    for (const t of tasks) {
        if (t.status === 'Done' || !t.due_date) continue;
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        
        if (due < today) overdueCount++;
        else if (due.getTime() === today.getTime()) dueTodayCount++;
        else if (due.getTime() === tomorrow.getTime()) dueTomorrowCount++;
    }
    
    if (overdueCount > 0) {
        sendNotification(
            `⚠️ ${overdueCount} Overdue Question${overdueCount > 1 ? 's' : ''}!`,
            `You have ${overdueCount} DSA question${overdueCount > 1 ? 's' : ''} past the deadline. Open the tracker to solve them!`,
            'overdue'
        );
    } else if (dueTodayCount > 0) {
        sendNotification(
            `📅 ${dueTodayCount} Due Today!`,
            `You have ${dueTodayCount} DSA question${dueTodayCount > 1 ? 's' : ''} due today. Don't miss your deadline!`,
            'due-today'
        );
    } else if (dueTomorrowCount > 0) {
        sendNotification(
            `🔔 ${dueTomorrowCount} Due Tomorrow`,
            `You have ${dueTomorrowCount} DSA question${dueTomorrowCount > 1 ? 's' : ''} due tomorrow. Plan ahead!`,
            'due-tomorrow'
        );
    }
}

// Request permission on page load and set up periodic checks
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
});

// Check deadlines when tasks are loaded or rendered
const originalRender = typeof render === 'function' ? render : null;
function setupNotificationCheck() {
    setInterval(() => {
        if (user && tasks.length) checkDeadlinesAndNotify();
    }, NOTIFICATION_INTERVAL);
    
    // Also check when visibility changes (user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && user && tasks.length) {
            checkDeadlinesAndNotify();
        }
    });
}
setupNotificationCheck();

// ============================================
//  EMAIL REMINDER SETUP (Supabase Edge Function)
// ============================================
/*
To enable daily email reminders for overdue questions, deploy this Supabase Edge Function:

1. Create file: supabase/functions/send-reminders/index.ts
2. Add this code:

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const today = new Date().toISOString().split('T')[0]

  // Get all overdue pending tasks grouped by user
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('*, users:user_id(email)')
    .eq('status', 'Pending')
    .lt('due_date', today)

  if (!overdueTasks || overdueTasks.length === 0) {
    return new Response(JSON.stringify({ message: 'No overdue tasks' }), { status: 200 })
  }

  // Group by user
  const userTasks = {}
  for (const task of overdueTasks) {
    const email = task.users?.email
    if (!email) continue
    if (!userTasks[email]) userTasks[email] = []
    userTasks[email].push(task.task_title)
  }

  // Send emails (using Supabase's built-in email or a service like Resend)
  for (const [email, questions] of Object.entries(userTasks)) {
    // Use your email service here (Resend, SendGrid, etc.)
    console.log(`Would send email to ${email} about ${questions.length} overdue questions`)
  }

  return new Response(JSON.stringify({ sent: Object.keys(userTasks).length }), { status: 200 })
})

3. Deploy: supabase functions deploy send-reminders
4. Set up a cron job in Supabase Dashboard > Database > Extensions > pg_cron:

   SELECT cron.schedule('daily-reminders', '0 9 * * *', 
     $$SELECT net.http_post('https://ngkdkokvpnddluqvhnqt.supabase.co/functions/v1/send-reminders', '{}', '{}', '{"Authorization": "Bearer YOUR_SERVICE_KEY"}')$$
   );

This sends reminder emails every day at 9 AM for overdue questions.
*/
