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
const queueMustDoBtn = $('#queue-mustdo-btn');
const addTopic      = $('#add-topic');
const addLink       = $('#add-link');
const currentTopic  = $('#current-topic');
const searchEl      = $('#search');
const fTopic        = $('#filter-topic');
const fStatus       = $('#filter-status');
const sortEl        = $('#sort-by');

// Stats/dashboard DOM cache for fast re-renders
const statTotalEl = $('#stat-total');
const statSolvedEl = $('#stat-solved');
const statUnsolvedEl = $('#stat-unsolved');
const statOverdueEl = $('#stat-overdue');
const statPercentEl = $('#stat-percent');
const progressBarEl = $('#progress-bar');
const deleteAllBtnEl = $('#delete-all-btn');

const dashboardWrapEl = $('.dashboard-wrap');
const dashboardToggleBtnEl = $('#dashboard-toggle-btn');
const dashboardScopeBtns = $$('.dashboard-scope-btn');
const dashboardTopicPickerEl = $('#dashboard-topic-picker');
const dashboardSolvedEl = $('#dashboard-solved');
const dashboardTotalEl = $('#dashboard-total');
const dashboardLeftEl = $('#dashboard-left');
const dashboardPercentEl = $('#dashboard-percent');
const dashboardTopicEl = $('#dashboard-topic');
const dashboardTimelineCountEl = $('#dashboard-timeline-count');
const dashboardTimelineListEl = $('#dashboard-timeline-list');
const dashboardRevisionCountEl = $('#dashboard-revision-count');
const dashboardRevisionListEl = $('#dashboard-revision-list');
const dashboardPlanCountEl = $('#dashboard-plan-count');
const dashboardPlanDateEl = $('#dashboard-plan-date');
const dashboardPlanMustDoEl = $('#dashboard-plan-mustdo');
const dashboardPlanStretchEl = $('#dashboard-plan-stretch');
const dashboardPlanProgressLabelEl = $('#dashboard-plan-progress-label');
const dashboardPlanProgressMetaEl = $('#dashboard-plan-progress-meta');
const dashboardPlanProgressFillEl = $('#dashboard-plan-progress-fill');
const dashboardWeeklyRangeEl = $('#dashboard-weekly-range');
const weeklySolvedEl = $('#weekly-solved');
const weeklyRevisionEl = $('#weekly-revision');
const weeklyOnTimeLateEl = $('#weekly-ontime-late');
const weeklyWeakTopicsEl = $('#weekly-weak-topics');
const weeklyNextFocusEl = $('#weekly-next-focus');
const ringProgressEl = $('#ring-progress');
const ringTrackEl = $('.ring-track');

const DASHBOARD_RING = {
    radius: 118,
    visibleRatio: 0.88,
    startOffset: 112
};

DASHBOARD_RING.circumference = 2 * Math.PI * DASHBOARD_RING.radius;
DASHBOARD_RING.visibleArc = DASHBOARD_RING.circumference * DASHBOARD_RING.visibleRatio;

if (ringTrackEl) {
    setStyleIfChanged(ringTrackEl, 'strokeDasharray', `${DASHBOARD_RING.visibleArc} ${DASHBOARD_RING.circumference}`);
    setStyleIfChanged(ringTrackEl, 'strokeDashoffset', String(DASHBOARD_RING.startOffset));
}

if (ringProgressEl) {
    setStyleIfChanged(ringProgressEl, 'strokeDashoffset', String(DASHBOARD_RING.startOffset));
}

function setTextIfChanged(el, value) {
    if (!el) return;
    const next = String(value);
    if (el.textContent !== next) el.textContent = next;
}

function setStyleIfChanged(el, prop, value) {
    if (!el) return;
    if (el.style[prop] !== value) el.style[prop] = value;
}

function formatSubmissionDate(dateString) {
    if (!dateString) return 'Unknown date';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isCompletedLate(dueDate, completionTimestamp) {
    if (!dueDate || !completionTimestamp) return false;
    const completedDate = completionTimestamp.includes('T') ? completionTimestamp.split('T')[0] : completionTimestamp;
    return completedDate > dueDate;
}

function getPlannedDateForTask(task) {
    if (task.due_date) return task.due_date;
    const topic = task.topic || 'General';
    const schedule = getTopicSchedule(topic);
    return schedule?.endDate || null;
}

function getTimelineTimingInfo(dueDate, completionTimestamp) {
    if (!dueDate) return { label: 'No Plan', className: 'no-plan' };
    const isLate = isCompletedLate(dueDate, completionTimestamp);
    return isLate
        ? { label: 'Late', className: 'late' }
        : { label: 'On Time', className: 'on-time' };
}

function getSubmissionTimestamp(task) {
    // Prefer immutable completion timestamps; avoid mutable updated_at for history display.
    return task.completed_at || getCompletionHistoryTimestamp(task.task_id) || task.created_at || task.updated_at || null;
}

function updateDashboardTimeline(dashboardTasks) {
    if (!dashboardTimelineListEl || !dashboardTimelineCountEl) return;

    const solved = dashboardTasks
        .filter(t => t.status === 'Completed')
        .map(t => ({
            id: t.task_id,
            title: t.task_title,
            topic: t.topic || 'General',
            dueDate: getPlannedDateForTask(t),
            timestamp: getSubmissionTimestamp(t)
        }))
        .sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        });

    setTextIfChanged(dashboardTimelineCountEl, `${solved.length} solved`);

    if (solved.length === 0) {
        dashboardTimelineListEl.innerHTML = '<div class="dashboard-timeline-empty">No submissions yet. Solve a question to see it here.</div>';
        return;
    }

    const html = solved.map(item => {
        const timing = getTimelineTimingInfo(item.dueDate, item.timestamp);
        return `
        <div class="timeline-row" data-task-id="${item.id}">
            <div class="timeline-date">${esc(formatSubmissionDate(item.timestamp))}</div>
            <div class="timeline-question-wrap">
                <div class="timeline-question timeline-open-code" data-id="${item.id}" title="Open code section for ${esc(item.title)}">${esc(item.title)}</div>
                <div class="timeline-meta">
                    <span>Plan: ${esc(formatSubmissionDate(item.dueDate))}</span>
                    <span>Actual: ${esc(formatSubmissionDate(item.timestamp))}</span>
                    <span class="timeline-pill ${timing.className}">${timing.label}</span>
                </div>
                <div class="timeline-actions">
                    <button class="timeline-open-btn" data-id="${item.id}" type="button">Open Code Section</button>
                </div>
            </div>
        </div>
    `;
    }).join('');

    dashboardTimelineListEl.innerHTML = html;
}

let user = null;
let tasks = [];

// ============================================
//  FILTER PERSISTENCE
// ============================================
const FILTER_STORAGE_KEY = 'dsa-tracker-filters';
const CURRENT_TOPIC_KEY = 'dsa-tracker-current-topic';
const DASHBOARD_SETTINGS_KEY = 'dsa-tracker-dashboard-settings';
const COMPLETION_HISTORY_KEY = 'dsa-tracker-completion-history';
const REVISION_QUEUE_KEY = 'dsa-tracker-revision-queue';
const POPUP_SNOOZE_KEY = 'dsa-tracker-popup-snooze-date';
const REVISION_INTERVALS = [1, 3, 7, 14, 30];

let completionHistoryStore = {};
let revisionQueueStore = {};

function formatLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toDateOnlyString(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return formatLocalDateKey(d);
}

function addDaysToDateString(dateString, days) {
    const dateOnly = toDateOnlyString(dateString);
    if (!dateOnly) return null;
    const d = new Date(dateOnly + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return formatLocalDateKey(d);
}

function diffDays(fromDateString, toDateString) {
    const from = toDateOnlyString(fromDateString);
    const to = toDateOnlyString(toDateString);
    if (!from || !to) return 0;
    const a = new Date(from + 'T00:00:00');
    const b = new Date(to + 'T00:00:00');
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function loadRevisionQueueStore() {
    const raw = localStorage.getItem(REVISION_QUEUE_KEY);
    if (!raw) {
        revisionQueueStore = {};
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        revisionQueueStore = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        revisionQueueStore = {};
    }
}

function saveRevisionQueueStore() {
    localStorage.setItem(REVISION_QUEUE_KEY, JSON.stringify(revisionQueueStore));
}

function getUserRevisionQueue() {
    if (!user?.id) return {};
    if (!revisionQueueStore[user.id]) revisionQueueStore[user.id] = {};
    return revisionQueueStore[user.id];
}

function getRevisionEntry(taskId) {
    const queue = getUserRevisionQueue();
    return queue[String(taskId)] || null;
}

function setRevisionEntry(taskId, entry) {
    const queue = getUserRevisionQueue();
    queue[String(taskId)] = entry;
    saveRevisionQueueStore();
}

function removeRevisionEntry(taskId) {
    const queue = getUserRevisionQueue();
    if (queue[String(taskId)]) {
        delete queue[String(taskId)];
        saveRevisionQueueStore();
    }
}

function ensureRevisionSeedForTask(task) {
    if (task.status !== 'Completed') {
        removeRevisionEntry(task.task_id);
        return;
    }

    const existing = getRevisionEntry(task.task_id);
    if (existing?.nextReviewDate) return;

    const completedAt = getSubmissionTimestamp(task);
    const completedDate = toDateOnlyString(completedAt) || getToday();
    const dueDate = addDaysToDateString(completedDate, REVISION_INTERVALS[0]);

    setRevisionEntry(task.task_id, {
        intervalIndex: 0,
        lastReviewedDate: completedDate,
        nextReviewDate: dueDate
    });
}

function updateRevisionQueue(dashboardTasks) {
    if (!dashboardRevisionListEl || !dashboardRevisionCountEl) return;

    const today = getToday();
    const completedTasks = dashboardTasks.filter(t => t.status === 'Completed');

    completedTasks.forEach(ensureRevisionSeedForTask);

    const items = completedTasks.map(task => {
        const entry = getRevisionEntry(task.task_id);
        if (!entry?.nextReviewDate) return null;

        const daysDelta = diffDays(today, entry.nextReviewDate);
        return {
            id: task.task_id,
            title: task.task_title,
            topic: task.topic || 'General',
            nextReviewDate: entry.nextReviewDate,
            intervalIndex: typeof entry.intervalIndex === 'number' ? entry.intervalIndex : 0,
            isDue: daysDelta <= 0,
            daysDelta
        };
    }).filter(Boolean);

    const dueItems = items
        .filter(item => item.isDue)
        .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));

    setTextIfChanged(dashboardRevisionCountEl, `${dueItems.length} due`);

    const list = dueItems.slice(0, 8);
    if (list.length === 0) {
        dashboardRevisionListEl.innerHTML = '<div class="dashboard-revision-empty">No reviews due right now. Upcoming reviews will appear automatically.</div>';
        return;
    }

    dashboardRevisionListEl.innerHTML = list.map(item => {
        const badgeClass = 'due';
        const badgeText = item.daysDelta < 0 ? `${Math.abs(item.daysDelta)}d overdue` : 'Due today';
        const stepDays = REVISION_INTERVALS[Math.min(item.intervalIndex, REVISION_INTERVALS.length - 1)];

        return `
            <div class="revision-row ${item.isDue ? 'due' : ''}">
                <div class="revision-top">
                    <div class="revision-title" title="${esc(item.title)}">${esc(item.title)}</div>
                    <span class="revision-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="revision-meta">
                    <span>Topic: ${esc(item.topic)}</span>
                    <span>Review: ${esc(formatSubmissionDate(item.nextReviewDate))}</span>
                    <span>Step: +${stepDays}d</span>
                </div>
                <div class="revision-actions">
                    <button class="revision-btn revision-btn-lg goto" data-id="${item.id}" data-action="goto">Go to Question</button>
                    <button class="revision-btn revision-btn-lg code" data-id="${item.id}" data-action="code">Open Code Section</button>
                </div>
                <div class="revision-actions revision-actions-secondary">
                    <button class="revision-btn done" data-id="${item.id}" data-action="done">Done</button>
                    <button class="revision-btn snooze" data-id="${item.id}" data-action="snooze">+1 Day</button>
                </div>
            </div>
        `;
    }).join('');
}

function buildPlanRow(item) {
    const actionLabel = item.action === 'rev-done' ? 'Mark Review Done' : 'Go to Question';
    return `
        <div class="plan-row">
            <div class="plan-top">
                <div class="plan-title" title="${esc(item.title)}">${esc(item.title)}</div>
                <span class="plan-badge ${item.badgeClass}">${esc(item.badgeText)}</span>
            </div>
            <div class="plan-meta">${esc(item.meta)}</div>
            <button class="plan-btn" data-id="${item.id}" data-action="${item.action}">${actionLabel}</button>
        </div>
    `;
}

function getDailySolveTarget(dateString = getToday()) {
    const d = new Date(dateString + 'T00:00:00');
    const day = d.getDay();
    return day === 0 || day === 6 ? 6 : 3;
}

function updateDailyPlan(dashboardTasks) {
    if (!dashboardPlanCountEl || !dashboardPlanDateEl || !dashboardPlanMustDoEl || !dashboardPlanStretchEl) return;

    const today = getToday();
    const dailyTarget = getDailySolveTarget(today);
    const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });
    setTextIfChanged(dashboardPlanDateEl, `Today • ${dateLabel} • Working Mode target: ${dailyTarget}`);

    const pending = dashboardTasks.filter(t => t.status !== 'Completed');
    const completed = dashboardTasks.filter(t => t.status === 'Completed');

    completed.forEach(ensureRevisionSeedForTask);

    const overduePending = pending
        .filter(t => t.due_date && t.due_date < today)
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

    const dueTodayPending = pending
        .filter(t => t.due_date === today)
        .sort((a, b) => a.task_title.localeCompare(b.task_title));

    const dueRevisions = completed
        .map(task => {
            const entry = getRevisionEntry(task.task_id);
            if (!entry?.nextReviewDate) return null;
            const daysDelta = diffDays(today, entry.nextReviewDate);
            if (daysDelta > 0) return null;
            return {
                task,
                nextReviewDate: entry.nextReviewDate,
                daysDelta
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));

    const mustDo = [
        ...overduePending.map(task => ({
            id: task.task_id,
            title: task.task_title,
            badgeClass: 'overdue',
            badgeText: 'Overdue',
            meta: `${task.topic || 'General'} • Due ${formatSubmissionDate(task.due_date)}`,
            action: 'goto'
        })),
        ...dueRevisions.map(item => ({
            id: item.task.task_id,
            title: item.task.task_title,
            badgeClass: 'revision',
            badgeText: item.daysDelta < 0 ? `${Math.abs(item.daysDelta)}d overdue` : 'Review today',
            meta: `${item.task.topic || 'General'} • Revision ${formatSubmissionDate(item.nextReviewDate)}`,
            action: 'rev-done'
        })),
        ...dueTodayPending.map(task => ({
            id: task.task_id,
            title: task.task_title,
            badgeClass: 'today',
            badgeText: 'Due today',
            meta: `${task.topic || 'General'} • Planned ${formatSubmissionDate(task.due_date)}`,
            action: 'goto'
        }))
    ].slice(0, dailyTarget);

    const usedMustDoIds = new Set(mustDo.map(item => item.id));

    const stretchSource = pending
        .filter(t => !usedMustDoIds.has(t.task_id))
        .sort((a, b) => {
            const ad = a.due_date || '9999-12-31';
            const bd = b.due_date || '9999-12-31';
            return ad.localeCompare(bd);
        })
        .slice(0, dailyTarget);

    const stretch = stretchSource.map(task => ({
        id: task.task_id,
        title: task.task_title,
        badgeClass: 'pending',
        badgeText: task.due_date ? 'Upcoming' : 'No deadline',
        meta: `${task.topic || 'General'} • ${task.due_date ? `Due ${formatSubmissionDate(task.due_date)}` : 'Pick this next'}`,
        action: 'goto'
    }));

    const planTotal = mustDo.length + stretch.length;
    setTextIfChanged(dashboardPlanCountEl, `Target ${dailyTarget} • ${planTotal} planned`);

    const solvedToday = completed.filter(task => toDateOnlyString(getSubmissionTimestamp(task)) === today).length;
    const revisionsDoneToday = completed.filter(task => {
        const entry = getRevisionEntry(task.task_id);
        return Boolean(entry && entry.lastReviewedDate === today && (entry.intervalIndex || 0) > 0);
    }).length;
    const completionPct = dailyTarget > 0 ? Math.min(100, Math.round((solvedToday / dailyTarget) * 100)) : 0;

    setTextIfChanged(dashboardPlanProgressLabelEl, `${completionPct}% questions target done today`);
    setTextIfChanged(dashboardPlanProgressMetaEl, `${solvedToday}/${dailyTarget} • revisions ${revisionsDoneToday}`);
    setStyleIfChanged(dashboardPlanProgressFillEl, 'width', `${completionPct}%`);

    dashboardPlanMustDoEl.innerHTML = mustDo.length
        ? mustDo.map(buildPlanRow).join('')
        : '<div class="plan-empty">No urgent tasks. Great pace today.</div>';

    dashboardPlanStretchEl.innerHTML = stretch.length
        ? stretch.map(buildPlanRow).join('')
        : '<div class="plan-empty">You are all caught up. Solve one challenge to stay warm.</div>';
}

function updateWeeklyReview(dashboardTasks) {
    if (!weeklySolvedEl || !weeklyRevisionEl || !weeklyOnTimeLateEl || !weeklyWeakTopicsEl || !weeklyNextFocusEl || !dashboardWeeklyRangeEl) return;

    const today = getToday();
    const weekStart = addDaysToDateString(today, -6);
    const rangeText = `${formatSubmissionDate(weekStart)} - ${formatSubmissionDate(today)}`;
    setTextIfChanged(dashboardWeeklyRangeEl, rangeText);

    const completedInScope = dashboardTasks.filter(t => t.status === 'Completed');
    const solvedThisWeek = completedInScope.filter(task => {
        const date = toDateOnlyString(getSubmissionTimestamp(task));
        return date && date >= weekStart && date <= today;
    });

    const solvedCount = solvedThisWeek.length;
    setTextIfChanged(weeklySolvedEl, solvedCount);

    const revisionsInScope = completedInScope.map(task => ({
        task,
        entry: getRevisionEntry(task.task_id)
    })).filter(item => item.entry?.nextReviewDate);

    const dueRevisionsThisWeek = revisionsInScope.filter(item => {
        const d = item.entry.nextReviewDate;
        return d >= weekStart && d <= today;
    }).length;

    const doneRevisionsThisWeek = revisionsInScope.filter(item => {
        const lr = item.entry.lastReviewedDate;
        const idx = item.entry.intervalIndex || 0;
        return idx > 0 && lr && lr >= weekStart && lr <= today;
    }).length;

    setTextIfChanged(weeklyRevisionEl, `Done ${doneRevisionsThisWeek} / Due ${dueRevisionsThisWeek}`);

    let onTime = 0;
    let late = 0;
    solvedThisWeek.forEach(task => {
        const dueDate = getPlannedDateForTask(task);
        const actual = getSubmissionTimestamp(task);
        if (!dueDate || !actual) return;
        if (isCompletedLate(dueDate, actual)) late++;
        else onTime++;
    });
    setTextIfChanged(weeklyOnTimeLateEl, `On-time ${onTime} / Late ${late}`);

    const topicScore = {};
    const upsertTopic = topic => {
        const key = topic || 'General';
        if (!topicScore[key]) topicScore[key] = { score: 0, overdue: 0, unsolved: 0, late: 0 };
        return topicScore[key];
    };

    dashboardTasks.forEach(task => {
        const bucket = upsertTopic(task.topic);
        if (task.status !== 'Completed') {
            bucket.unsolved += 1;
            bucket.score += 1;
            if (task.due_date && task.due_date < today) {
                bucket.overdue += 1;
                bucket.score += 2;
            }
            return;
        }

        const submitted = toDateOnlyString(getSubmissionTimestamp(task));
        if (!submitted || submitted < weekStart || submitted > today) return;
        const dueDate = getPlannedDateForTask(task);
        if (dueDate && isCompletedLate(dueDate, submitted)) {
            bucket.late += 1;
            bucket.score += 2;
        }
    });

    const weakTopics = Object.entries(topicScore)
        .filter(([, v]) => v.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 3);

    weeklyWeakTopicsEl.innerHTML = weakTopics.length
        ? weakTopics.map(([topic, v]) => `
            <div class="weekly-focus-item">
                <span>${esc(topic)}</span>
                <span class="weekly-focus-item-meta">Score ${v.score} • Overdue ${v.overdue} • Unsolved ${v.unsolved} • Late ${v.late}</span>
            </div>
        `).join('')
        : '<div class="weekly-focus-empty">No major weak topics detected this week.</div>';

    const focusItems = weakTopics.length
        ? weakTopics.map(([topic]) => topic)
        : ['Continue current pace', 'Keep daily revisions', 'Maintain streak discipline'];

    weeklyNextFocusEl.innerHTML = focusItems.map((item, idx) => `
        <div class="weekly-focus-item">
            <span>${idx + 1}. ${esc(item)}</span>
            <span></span>
        </div>
    `).join('');
}

async function handleDailyPlanAction(taskId, action) {
    if (action === 'rev-done') {
        await handleRevisionAction(taskId, 'done');
        return;
    }
    goToTaskInList(taskId);
}

function goToTaskInList(taskId) {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) {
        toast('Question not found', 'error');
        return;
    }

    setCurrentTopic(task.topic || currentTopic.value);
    saveCurrentTopic();
    fTopic.value = 'all';
    fStatus.value = 'all';
    searchEl.value = '';
    saveFilters();
    render();

    requestAnimationFrame(() => {
        const row = listEl.querySelector(`.q-item[data-task-id="${taskId}"]`);
        if (!row) {
            toast('Question is filtered out', 'info');
            return;
        }
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('q-focus');
        setTimeout(() => row.classList.remove('q-focus'), 1800);
    });
}

function openCodeSectionForTask(taskId) {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) {
        toast('Question not found', 'error');
        return;
    }

    setCurrentTopic(task.topic || currentTopic.value);
    saveCurrentTopic();
    render();

    // If already solved with submitted code, open the read-only code section directly.
    if (task.status === 'Completed' && task.solution_code) {
        viewCode(task);
        return;
    }

    codeTaskId.value = task.task_id;
    codeInput.value = task.solution_code || '';
    if (codeLink) codeLink.value = task.question_link || '';
    codeOverlay.classList.remove('hidden');
    codeInput.focus();
}

async function handleRevisionAction(taskId, action) {
    const entry = getRevisionEntry(taskId);
    if (action === 'goto') {
        goToTaskInList(taskId);
        return;
    }
    if (action === 'code') {
        openCodeSectionForTask(taskId);
        return;
    }
    if (!entry) return;

    if (action === 'done') {
        const nextIndex = Math.min((entry.intervalIndex || 0) + 1, REVISION_INTERVALS.length - 1);
        const today = getToday();
        setRevisionEntry(taskId, {
            intervalIndex: nextIndex,
            lastReviewedDate: today,
            nextReviewDate: addDaysToDateString(today, REVISION_INTERVALS[nextIndex])
        });
        toast('Revision marked done', 'success');
        updateStats();
        return;
    }

    if (action === 'snooze') {
        const nextDate = addDaysToDateString(entry.nextReviewDate || getToday(), 1);
        setRevisionEntry(taskId, {
            intervalIndex: entry.intervalIndex || 0,
            lastReviewedDate: entry.lastReviewedDate || getToday(),
            nextReviewDate: nextDate
        });
        toast('Revision snoozed by 1 day', 'info');
        updateStats();
    }
}

// ============================================
//  DAILY REVISION POPUP
// ============================================

function getCurrentDashboardTasks() {
    if (dashboardScope === 'topic') {
        const topic = currentTopic.value;
        return tasks.filter(t => t.topic === topic);
    }
    return tasks; // 'all' scope
}

function getDueRevisions() {
    const today = getToday();
    const dashboardTasks = getCurrentDashboardTasks();
    const userQueue = getUserRevisionQueue();
    
    const dueItems = [];
    
    dashboardTasks.forEach(task => {
        const entry = userQueue[task.task_id];
        if (!entry) return;
        
        const nextReviewDate = entry.nextReviewDate;
        if (!nextReviewDate) return;
        
        const daysDelta = diffDays(today, nextReviewDate);
        
        if (daysDelta > 0) return; // Not yet due
        
        dueItems.push({
            taskId: task.task_id,
            title: task.task_title,
            daysOverdue: Math.abs(daysDelta),
            status: daysDelta < 0 ? 'overdue' : 'due'
        });
    });
    
    return dueItems.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (a.status !== 'overdue' && b.status === 'overdue') return 1;
        return b.daysOverdue - a.daysOverdue;
    });
}

function isPopupSnoozedToday() {
    const snoozeDate = localStorage.getItem(POPUP_SNOOZE_KEY);
    if (!snoozeDate) return false;
    return snoozeDate === getToday();
}

function snoozePopupUntilTomorrow() {
    const tomorrow = addDaysToDateString(getToday(), 1);
    localStorage.setItem(POPUP_SNOOZE_KEY, tomorrow);
}

function showDueRevisionPopup() {
    // Don't show if snoozed or not authenticated
    if (!user?.id || isPopupSnoozedToday()) return;
    
    const dueRevisions = getDueRevisions();
    if (dueRevisions.length === 0) {
        hideRevisionPopup();
        return; // No due revisions to show
    }
    
    const overlay = $('#revision-popup-overlay');
    const listEl = $('#revision-popup-list');
    const subtitleEl = $('#revision-popup-subtitle');
    
    if (!overlay || !listEl || !subtitleEl) {
        console.warn('Revision popup elements not found in DOM');
        return;
    }
    
    // Update subtitle
    const overdue = dueRevisions.filter(r => r.status === 'overdue').length;
    const due = dueRevisions.filter(r => r.status === 'due').length;
    let subtitle = `${dueRevisions.length} review${dueRevisions.length !== 1 ? 's' : ''} due`;
    if (overdue > 0) subtitle += ` (${overdue} overdue)`;
    subtitleEl.textContent = subtitle;
    
    // Render items (max 6)
    listEl.innerHTML = dueRevisions.slice(0, 6).map(item => `
        <div class="revision-popup-item">
            <div class="revision-popup-item-left">
                <div class="revision-popup-item-title">${esc(item.title)}</div>
                <span class="revision-popup-item-badge ${item.status}">
                    ${item.status === 'overdue' ? `${item.daysOverdue}d overdue` : 'due today'}
                </span>
            </div>
            <div class="revision-popup-item-buttons">
                <button class="revision-popup-btn" onclick="handleRevisionAction(${item.taskId}, 'goto'); hideRevisionPopup();">→ Question</button>
                <button class="revision-popup-btn" onclick="handleRevisionAction(${item.taskId}, 'code'); hideRevisionPopup();">→ Code</button>
                <button class="revision-popup-btn" onclick="markRevisionDoneFromPopup(${item.taskId});">✓ Done</button>
            </div>
        </div>
    `).join('');
    
    overlay.classList.remove('hidden');
}

function hideRevisionPopup() {
    const overlay = $('#revision-popup-overlay');
    if (overlay) overlay.classList.add('hidden');
}

async function markRevisionDoneFromPopup(taskId) {
    await handleRevisionAction(taskId, 'done');
    showDueRevisionPopup();
}

// Debug: Show popup with test data (call from console: testRevisionPopup())
function testRevisionPopup() {
    const overlay = $('#revision-popup-overlay');
    const listEl = $('#revision-popup-list');
    const subtitleEl = $('#revision-popup-subtitle');
    
    subtitleEl.textContent = '2 reviews due (1 overdue)';
    listEl.innerHTML = `
        <div class="revision-popup-item">
            <div class="revision-popup-item-left">
                <div class="revision-popup-item-title">Two Sum</div>
                <span class="revision-popup-item-badge overdue">2d overdue</span>
            </div>
            <div class="revision-popup-item-buttons">
                <button class="revision-popup-btn" onclick="toast('Test: Go to question', 'info')">→ Question</button>
                <button class="revision-popup-btn" onclick="toast('Test: Open code', 'info')">→ Code</button>
            </div>
        </div>
        <div class="revision-popup-item">
            <div class="revision-popup-item-left">
                <div class="revision-popup-item-title">Best Time to Buy and Sell Stock</div>
                <span class="revision-popup-item-badge due">due today</span>
            </div>
            <div class="revision-popup-item-buttons">
                <button class="revision-popup-btn" onclick="toast('Test: Go to question', 'info')">→ Question</button>
                <button class="revision-popup-btn" onclick="toast('Test: Open code', 'info')">→ Code</button>
            </div>
        </div>
    `;
    overlay.classList.remove('hidden');
}

function loadCompletionHistoryStore() {
    const raw = localStorage.getItem(COMPLETION_HISTORY_KEY);
    if (!raw) {
        completionHistoryStore = {};
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        completionHistoryStore = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        completionHistoryStore = {};
    }
}

function saveCompletionHistoryStore() {
    localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(completionHistoryStore));
}

function getUserCompletionHistory() {
    if (!user?.id) return {};
    if (!completionHistoryStore[user.id]) completionHistoryStore[user.id] = {};
    return completionHistoryStore[user.id];
}

function normalizeIsoTimestamp(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function getCompletionHistoryTimestamp(taskId) {
    const history = getUserCompletionHistory();
    return history[String(taskId)] || null;
}

function setCompletionHistoryTimestamp(taskId, timestamp) {
    if (!user?.id) return;
    const normalized = normalizeIsoTimestamp(timestamp);
    if (!normalized) return;
    const history = getUserCompletionHistory();
    history[String(taskId)] = normalized;
    saveCompletionHistoryStore();
}

function bootstrapCompletionHistoryFromTasks() {
    let changed = false;
    const history = getUserCompletionHistory();

    for (const task of tasks) {
        if (task.status !== 'Completed') continue;
        const key = String(task.task_id);
        const resolved = normalizeIsoTimestamp(task.completed_at || history[key] || task.created_at || task.updated_at);
        if (!resolved) continue;
        if (!history[key]) {
            history[key] = resolved;
            changed = true;
        }
        if (!task.completed_at) task.completed_at = history[key];
    }

    if (changed) saveCompletionHistoryStore();
}

loadCompletionHistoryStore();
loadRevisionQueueStore();

let dashboardScope = 'all';
let dashboardVisible = true;

function saveFilters() {
    const filters = {
        search: searchEl.value,
        topic: fTopic.value,
        status: fStatus.value,
        sort: sortEl.value
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}

function restoreFilters() {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) return;
    try {
        const filters = JSON.parse(saved);
        if (filters.search) searchEl.value = filters.search;
        if (filters.topic) fTopic.value = filters.topic;
        if (filters.status) fStatus.value = filters.status;
        if (filters.sort) sortEl.value = filters.sort;
    } catch (e) { /* ignore parse errors */ }
}

function setCurrentTopic(topic) {
    currentTopic.value = topic;
    addTopic.value = topic;
    if (dashboardTopicPickerEl) dashboardTopicPickerEl.value = topic;
    $$('#topic-chip-group .topic-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.topic === topic);
    });
}

function initDashboardTopicPicker() {
    if (!dashboardTopicPickerEl || !addTopic) return;

    const selected = currentTopic.value || addTopic.value || 'Arrays';
    const baseTopics = Array.from(addTopic.options).map(opt => opt.value).filter(Boolean);
    const taskTopics = tasks.map(t => t.topic || 'General');
    const allTopics = Array.from(new Set([...baseTopics, ...taskTopics]));

    const topicProgress = {};
    tasks.forEach(task => {
        const topic = task.topic || 'General';
        if (!topicProgress[topic]) topicProgress[topic] = { total: 0, solved: 0 };
        topicProgress[topic].total += 1;
        if (task.status === 'Completed') topicProgress[topic].solved += 1;
    });

    const topicsWithTasks = allTopics.filter(topic => (topicProgress[topic]?.total || 0) > 0);

    const sortWithTasks = (a, b) => {
        const pa = topicProgress[a] || { total: 0, solved: 0 };
        const pb = topicProgress[b] || { total: 0, solved: 0 };

        if (a === selected) return -1;
        if (b === selected) return 1;

        const aDone = pa.solved === pa.total;
        const bDone = pb.solved === pb.total;

        if (aDone !== bDone) return aDone ? 1 : -1;

        if (!aDone && pa.solved !== pb.solved) {
            return pb.solved - pa.solved;
        }

        if (aDone && pa.total !== pb.total) {
            return pb.total - pa.total;
        }

        return a.localeCompare(b);
    };

    topicsWithTasks.sort(sortWithTasks);

    const orderedTopics = topicsWithTasks;

    if (orderedTopics.length === 0) {
        dashboardTopicPickerEl.innerHTML = '<option value="">No topics with questions</option>';
        dashboardTopicPickerEl.disabled = true;
        return;
    }

    dashboardTopicPickerEl.disabled = false;

    dashboardTopicPickerEl.innerHTML = orderedTopics.map(topic => {
        const p = topicProgress[topic] || { total: 0, solved: 0 };
        const isDone = p.total > 0 && p.solved === p.total;
        let label = topic;

        if (isDone) {
            label = `${label} ✓`;
        }

        return `<option value="${esc(topic)}">${esc(label)}</option>`;
    }).join('');

    const nextTopic = orderedTopics.includes(selected) ? selected : orderedTopics[0];
    dashboardTopicPickerEl.value = nextTopic;

    if (currentTopic.value !== nextTopic) {
        setCurrentTopic(nextTopic);
        saveCurrentTopic();
    }
}

function saveCurrentTopic() {
    localStorage.setItem(CURRENT_TOPIC_KEY, currentTopic.value);
    addTopic.value = currentTopic.value;
}

function restoreCurrentTopic() {
    const saved = localStorage.getItem(CURRENT_TOPIC_KEY);
    if (saved) setCurrentTopic(saved);
    initDashboardTopicPicker();
}

function saveDashboardSettings() {
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify({
        scope: dashboardScope,
        visible: dashboardVisible
    }));
}

function applyDashboardVisibility() {
    if (dashboardWrapEl) dashboardWrapEl.classList.toggle('hidden', !dashboardVisible);
    if (dashboardToggleBtnEl) {
        dashboardToggleBtnEl.textContent = dashboardVisible ? '📊 Hide Dashboard' : '📊 Show Dashboard';
        dashboardToggleBtnEl.title = dashboardVisible ? 'Hide dashboard' : 'Show dashboard';
    }
}

function setDashboardScope(scope) {
    dashboardScope = scope === 'topic' ? 'topic' : 'all';
    dashboardScopeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dashboardScope === dashboardScope);
    });
    saveDashboardSettings();
    render();
}

function restoreDashboardSettings() {
    const saved = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            dashboardScope = settings.scope === 'topic' ? 'topic' : 'all';
            dashboardVisible = settings.visible !== false;
        } catch (e) {
            dashboardScope = 'all';
            dashboardVisible = true;
        }
    } else {
        // Default dashboard to all questions as requested.
        dashboardScope = 'all';
        dashboardVisible = true;
    }

    dashboardScopeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dashboardScope === dashboardScope);
    });
    applyDashboardVisibility();
}

$$('#topic-chip-group .topic-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        setCurrentTopic(btn.dataset.topic);
        saveCurrentTopic();
        fTopic.value = 'all';
        fStatus.value = 'Pending';
        saveFilters();
        render();
    });
});

dashboardToggleBtnEl?.addEventListener('click', () => {
    dashboardVisible = !dashboardVisible;
    applyDashboardVisibility();
    saveDashboardSettings();
});

dashboardScopeBtns.forEach(btn => {
    btn.addEventListener('click', () => setDashboardScope(btn.dataset.dashboardScope));
});

dashboardTopicPickerEl?.addEventListener('change', () => {
    setCurrentTopic(dashboardTopicPickerEl.value);
    saveCurrentTopic();
    render();
});

dashboardRevisionListEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.revision-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;
    await handleRevisionAction(id, btn.dataset.action);
});

dashboardPlanMustDoEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.plan-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;
    await handleDailyPlanAction(id, btn.dataset.action);
});

dashboardPlanStretchEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.plan-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;
    await handleDailyPlanAction(id, btn.dataset.action);
});

dashboardTimelineListEl?.addEventListener('click', (e) => {
    const target = e.target.closest('.timeline-open-code, .timeline-open-btn');
    if (!target) return;
    const id = parseInt(target.dataset.id, 10);
    if (!id) return;
    openCodeSectionForTask(id);
});

// ============================================
//  AUTH STATE LISTENER
// ============================================
db.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        $('#user-email').textContent = user.email;
        restoreFilters();
        restoreCurrentTopic();
        restoreDashboardSettings();
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

// ─── Daily Revision Popup ───
$('#revision-popup-close').onclick = hideRevisionPopup;
$('#revision-popup-dismiss').onclick = hideRevisionPopup;
$('#revision-popup-snooze').onclick = () => {
    snoozePopupUntilTomorrow();
    hideRevisionPopup();
    toast('Reminder snoozed until tomorrow', 'info');
};
$('#revision-popup-overlay').onclick = e => {
    if (e.target === $('#revision-popup-overlay')) hideRevisionPopup();
};

// ============================================
//  LOAD
// ============================================
async function loadAll() {
    loadingEl.classList.remove('hidden'); emptyEl.classList.add('hidden'); listEl.innerHTML = '';
    const { data, error } = await db.from('tasks').select('*').eq('user_id', user.id).order('task_id', { ascending: true });
    loadingEl.classList.add('hidden');
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }
    tasks = data || [];
    bootstrapCompletionHistoryFromTasks();
    await syncAutoQuestionLinks();
    await clearUnscheduledDeadlines();
    repairCorruptedSchedules();
    render();
    // Check for deadline notifications after loading
    setTimeout(() => checkDeadlinesAndNotify(), 2000);
    // Show daily revision popup if there are due revisions
    setTimeout(() => showDueRevisionPopup(), 500);
}

// Clear due_dates for topics that haven't been explicitly scheduled
async function clearUnscheduledDeadlines() {
    const schedules = getAllSchedules();
    const tasksToFix = tasks.filter(t => t.due_date && !schedules[t.topic]);
    if (tasksToFix.length === 0) return;

    const ids = tasksToFix.map(t => t.task_id);
    await db.from('tasks').update({ due_date: null }).in('task_id', ids).eq('user_id', user.id);

    // Update locally
    tasksToFix.forEach(t => { t.due_date = null; });
}

// Repair corrupted schedules where startDate > endDate
function repairCorruptedSchedules() {
    const schedules = getAllSchedules();
    let repaired = false;
    
    // Special case: Always fix Binary Search to start from March 10
    if (schedules['Binary Search']) {
        schedules['Binary Search'].startDate = '2026-03-10';
        repaired = true;
    }
    
    for (const [topic, schedule] of Object.entries(schedules)) {
        if (topic === 'Binary Search') continue; // Already handled above
        
        if (schedule.startDate && schedule.endDate && schedule.startDate > schedule.endDate) {
            // Invalid schedule - try to fix from task due_dates
            const topicTasks = tasks.filter(t => t.topic === topic && t.due_date);
            if (topicTasks.length > 0) {
                const dates = topicTasks.map(t => t.due_date).sort();
                schedule.startDate = dates[0];
                schedule.endDate = dates[dates.length - 1];
                repaired = true;
            } else {
                // No task dates to repair from - remove the schedule
                delete schedules[topic];
                repaired = true;
            }
        }
    }
    
    if (repaired) {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
    }
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

const QUEUE_MUST_DO_QUESTIONS = [
    'Implement Queue using Arrays',
    'Implement Queue using Linked List',
    'Implement Queue using Stacks',
    'Number of Recent Calls',
    'Time Needed to Buy Tickets',
    'Design Circular Queue',
    'Moving Average from Data Stream',
    'Sliding Window Maximum',
    'Shortest Subarray with Sum at Least K',
    'Rotting Oranges',
    '01 Matrix',
    'Binary Tree Level Order Traversal'
];

const DSA_COMPREHENSIVE_QUESTIONS = [
    'Binary Search (20 Questions)',
    'Binary Search',
    'Search Insert Position',
    'Sqrt(x)',
    'First Bad Version',
    'Find Peak Element',
    'First and Last Position of Element in Sorted Array',
    'Search in Rotated Sorted Array',
    'Find Minimum in Rotated Sorted Array',
    'Find Minimum in Rotated Sorted Array II',
    'Single Element in Sorted Array',
    'Koko Eating Bananas',
    'Capacity To Ship Packages Within D Days',
    'Minimum Days to Make Bouquets',
    'Split Array Largest Sum',
    'Aggressive Cows',
    'Median of Two Sorted Arrays',
    'Search a 2D Matrix',
    'Search a 2D Matrix II',
    'Kth Smallest Element in Sorted Matrix',
    'Peak Element II',
    'Arrays (30 Questions)',
    'Two Sum',
    'Best Time to Buy and Sell Stock',
    'Contains Duplicate',
    'Product of Array Except Self',
    'Maximum Subarray',
    'Maximum Product Subarray',
    'Move Zeroes',
    'Rotate Array',
    'Merge Sorted Array',
    'Missing Number',
    'Majority Element',
    'Find Duplicate Number',
    'Set Matrix Zeroes',
    'Spiral Matrix',
    'Sort Colors',
    'Longest Consecutive Sequence',
    'Subarray Sum Equals K',
    'Gas Station',
    'Jump Game',
    'Jump Game II',
    'Trapping Rain Water',
    'Container With Most Water',
    'Next Permutation',
    'Kadane Algorithm',
    'Merge Intervals',
    'Insert Interval',
    'Minimum Size Subarray Sum',
    'Longest Increasing Subsequence',
    'Maximum Area of Island',
    'Matrix Rotate',
    'Two Pointer / Sliding Window (20 Questions)',
    'Valid Palindrome',
    'Two Sum II',
    '3Sum',
    '4Sum',
    'Remove Duplicates from Sorted Array',
    'Longest Substring Without Repeating Characters',
    'Longest Repeating Character Replacement',
    'Minimum Window Substring',
    'Sliding Window Maximum',
    'Permutation in String',
    'Find All Anagrams in a String',
    'Fruit Into Baskets',
    'Longest Subarray with Sum K',
    'Count Subarrays with Given Sum',
    'Maximum Consecutive Ones III',
    'Subarray Product Less Than K',
    'Longest Ones After Replacement',
    'Stack (15 Questions)',
    'Valid Parentheses',
    'Min Stack',
    'Next Greater Element',
    'Next Greater Element II',
    'Daily Temperatures',
    'Largest Rectangle in Histogram',
    'Evaluate Reverse Polish Notation',
    'Remove K Digits',
    'Basic Calculator',
    'Asteroid Collision',
    'Car Fleet',
    'Stock Span Problem',
    'Simplify Path',
    'Decode String',
    'Linked List (20 Questions)',
    'Reverse Linked List',
    'Reverse Linked List Recursive',
    'Middle of Linked List',
    'Merge Two Sorted Lists',
    'Remove Nth Node From End',
    'Detect Cycle',
    'Detect Cycle II',
    'Intersection of Two Linked Lists',
    'Palindrome Linked List',
    'Swap Nodes in Pairs',
    'Reverse Nodes in K Group',
    'Rotate List',
    'Remove Elements',
    'Delete Duplicates',
    'Delete Duplicates II',
    'Copy List with Random Pointer',
    'Flatten Multilevel Doubly Linked List',
    'Add Two Numbers',
    'Add Two Numbers II',
    'LRU Cache',
    'Trees (30 Questions)',
    'Inorder Traversal',
    'Preorder Traversal',
    'Postorder Traversal',
    'Level Order Traversal',
    'Maximum Depth of Binary Tree',
    'Same Tree',
    'Symmetric Tree',
    'Invert Binary Tree',
    'Balanced Binary Tree',
    'Diameter of Binary Tree',
    'Path Sum',
    'Path Sum II',
    'Lowest Common Ancestor',
    'Binary Tree Right Side View',
    'Binary Tree Zigzag Traversal',
    'Kth Smallest in BST',
    'Validate BST',
    'Convert Sorted Array to BST',
    'Construct Binary Tree from Traversal',
    'Subtree of Another Tree',
    'Maximum Path Sum',
    'Serialize and Deserialize Binary Tree',
    'Vertical Order Traversal',
    'Boundary Traversal',
    'Morris Traversal',
    'Recover BST',
    'Flatten Binary Tree to Linked List',
    'Count Complete Tree Nodes',
    'Maximum Width of Binary Tree',
    'Distance K in Binary Tree',
    'Dynamic Programming (20 Questions)',
    'Climbing Stairs',
    'House Robber',
    'House Robber II',
    'Coin Change',
    'Coin Change II',
    'Longest Common Subsequence',
    'Edit Distance',
    'Word Break',
    'Unique Paths',
    'Unique Paths II',
    'Minimum Path Sum',
    'Partition Equal Subset Sum',
    'Target Sum',
    'Decode Ways',
    'Longest Palindromic Substring',
    'Palindromic Substrings',
    'Frog Jump'
];

const QUESTION_LINKS = {
    queue: {
        'implement queue using arrays': 'https://leetcode.com/problems/design-circular-queue/',
        'implement queue using linked list': 'https://leetcode.com/problems/design-circular-queue/',
        'implement queue using stacks': 'https://leetcode.com/problems/implement-queue-using-stacks/',
        'number of recent calls': 'https://leetcode.com/problems/number-of-recent-calls/',
        'time needed to buy tickets': 'https://leetcode.com/problems/time-needed-to-buy-tickets/',
        'design circular queue': 'https://leetcode.com/problems/design-circular-queue/',
        'moving average from data stream': 'https://leetcode.com/problems/moving-average-from-data-stream/',
        'sliding window maximum': 'https://leetcode.com/problems/sliding-window-maximum/',
        'shortest subarray with sum at least k': 'https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/',
        'rotting oranges': 'https://leetcode.com/problems/rotting-oranges/',
        '01 matrix': 'https://leetcode.com/problems/01-matrix/',
        'binary tree level order traversal': 'https://leetcode.com/problems/binary-tree-level-order-traversal/'
    }
};

const LEETCODE_CATALOG_URL = 'https://leetcode.com/api/problems/all/';
let leetCodeSlugByTitle = null;
let leetCodeCatalogPromise = null;

const LEETCODE_TITLE_SLUG_OVERRIDES = {
    'two sum ii': 'two-sum-ii-input-array-is-sorted',
    'two sum ii input array is sorted': 'two-sum-ii-input-array-is-sorted',
    'next greater element': 'next-greater-element-i',
    'next greater element i': 'next-greater-element-i'
};

function normalizeQuestionTitle(title) {
    return (title || '')
        .toLowerCase()
        .replace(/[\u2018\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function titleToLeetCodeSlug(title) {
    return (title || '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

function isLeetCodeProblemUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return /leetcode\.com$/i.test(parsed.hostname) && /^\/problems\/[^/]+\/?$/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

function isLeetCodeSearchUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return /leetcode\.com$/i.test(parsed.hostname) && /^\/problemset\/?$/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

function isSubmittedTask(task) {
    if (!task) return false;
    if (task.status === 'Completed') return true;
    return !!(task.solution_code && task.solution_code.trim());
}

async function getLeetCodeSlugMap() {
    if (leetCodeSlugByTitle) return leetCodeSlugByTitle;
    if (leetCodeCatalogPromise) return leetCodeCatalogPromise;

    leetCodeCatalogPromise = (async () => {
        try {
            const res = await fetch(LEETCODE_CATALOG_URL);
            if (!res.ok) throw new Error('Failed to fetch LeetCode catalog');

            const data = await res.json();
            const map = new Map();
            const list = data?.stat_status_pairs || [];

            list.forEach(item => {
                const title = item?.stat?.question__title;
                const slug = item?.stat?.question__title_slug;
                if (!title || !slug) return;
                map.set(normalizeQuestionTitle(title), slug);
            });

            leetCodeSlugByTitle = map;
            return map;
        } catch {
            leetCodeSlugByTitle = new Map();
            return leetCodeSlugByTitle;
        }
    })();

    return leetCodeCatalogPromise;
}

function getQuestionLink(title, topic, fallback = '') {
    const topicKey = (topic || '').toLowerCase().trim();
    const titleKey = (title || '').toLowerCase().trim();
    return QUESTION_LINKS[topicKey]?.[titleKey] || fallback;
}

async function resolveBestQuestionLink(title, topic, fallback = '') {
    const manual = getQuestionLink(title, topic, '');
    if (manual) return { url: manual, confidence: 'manual' };

    const normalizedTitle = normalizeQuestionTitle(title);
    const overrideSlug = LEETCODE_TITLE_SLUG_OVERRIDES[normalizedTitle];
    if (overrideSlug) {
        return { url: `https://leetcode.com/problems/${overrideSlug}/`, confidence: 'manual' };
    }

    const slugMap = await getLeetCodeSlugMap();
    const slug = slugMap.get(normalizedTitle);
    if (slug) return { url: `https://leetcode.com/problems/${slug}/`, confidence: 'catalog' };

    const guessedSlug = titleToLeetCodeSlug(title);
    if (guessedSlug) {
        return { url: `https://leetcode.com/problems/${guessedSlug}/`, confidence: 'heuristic' };
    }

    return { url: fallback, confidence: 'fallback' };
}

function normalizeLeetCodeUrl(link) {
    if (!link) return '';
    try {
        const parsed = new URL(link);
        if (!/leetcode\.com$/i.test(parsed.hostname)) return parsed.href;

        const descriptionMatch = parsed.pathname.match(/^\/problems\/([^/]+)\/description\/?$/i);
        if (descriptionMatch) {
            return `https://leetcode.com/problems/${descriptionMatch[1]}/`;
        }

        return parsed.href;
    } catch {
        return link;
    }
}

async function syncAutoQuestionLinks() {
    const pendingUpdates = [];

    for (const t of tasks) {
        if (isSubmittedTask(t)) continue;

        const resolved = await resolveBestQuestionLink(t.task_title, t.topic, '');
        if (!resolved?.url) continue;

        const target = normalizeLeetCodeUrl(resolved.url);
        const current = normalizeLeetCodeUrl(t.question_link || '');

        // Do not replace an existing direct LeetCode problem URL with a low-confidence guess.
        if (isLeetCodeProblemUrl(current) && resolved.confidence === 'heuristic') continue;

        // Replace search links with exact links whenever we can produce one.
        if (isLeetCodeSearchUrl(current) && isLeetCodeProblemUrl(target)) {
            pendingUpdates.push({ task_id: t.task_id, question_link: target });
            continue;
        }

        if (current === target) continue;
        pendingUpdates.push({ task_id: t.task_id, question_link: target });
    }

    if (pendingUpdates.length === 0) return;

    for (const item of pendingUpdates) {
        const { error } = await db
            .from('tasks')
            .update({ question_link: item.question_link, updated_at: new Date().toISOString() })
            .eq('task_id', item.task_id)
            .eq('user_id', user.id);

        if (!error) {
            const localTask = tasks.find(t => t.task_id === item.task_id);
            if (localTask) localTask.question_link = item.question_link;
        }
    }
}

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

// ─── Add-section collapse toggle ───
const addSectionToggle = $('#add-section-toggle');
const addSectionBody   = $('#add-section-body');
addSectionToggle.addEventListener('click', () => {
    const isOpen = !addSectionBody.classList.contains('hidden');
    addSectionBody.classList.toggle('hidden', isOpen);
    addSectionToggle.classList.toggle('open', !isOpen);
});

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

if (queueMustDoBtn) {
    queueMustDoBtn.onclick = () => {
        if (!smartMode) modeSmartBtn.click();

        setCurrentTopic('Queue');
        saveCurrentTopic();

        addInput.value = [
            'Queue (Core Questions)',
            ...QUEUE_MUST_DO_QUESTIONS
        ].join('\n');

        updatePreview();
        addInput.focus();
        toast('Queue Must Do list loaded. Click "Add Questions" to save it.', 'success');
    };
}

const dsaAllBtn = $('#dsa-all-btn');
if (dsaAllBtn) {
    dsaAllBtn.onclick = () => {
        if (!smartMode) modeSmartBtn.click();

        addInput.value = DSA_COMPREHENSIVE_QUESTIONS.join('\n');

        updatePreview();
        addInput.focus();
        toast('All 155+ DSA questions loaded. Click "Add Questions" to save them.', 'success');
    };
}

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
    return formatLocalDateKey(new Date());
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
    return formatLocalDateKey(d); // YYYY-MM-DD
}

function normalizeQuestionLink(rawLink) {
    const link = (rawLink || '').trim();
    if (!link) return { ok: true, value: '' };

    const candidate = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    try {
        const parsed = new URL(candidate);
        if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, value: '' };
        return { ok: true, value: parsed.href };
    } catch {
        return { ok: false, value: '' };
    }
}

// ─── Add button ───
addBtn.onclick = async () => {
    const raw = addInput.value.trim();
    if (!raw) { toast('Paste at least one question.', 'error'); return; }

    const normalizedAddLink = normalizeQuestionLink(addLink?.value || '');
    if (!normalizedAddLink.ok) {
        toast('Please enter a valid question link.', 'error');
        return;
    }
    const defaultQuestionLink = smartMode ? '' : normalizedAddLink.value;

    let rows;

    if (smartMode) {
        const parsed = smartParse(raw);
        if (parsed.length === 0) { toast('No questions detected. Check the format.', 'error'); return; }

        // Question 1 = +1 day, Question 2 = +2 days, etc.
        rows = parsed.map((q, index) => ({
            user_id: user.id,
            task_title: q.title,
            task_description: '',
            topic: q.topic === 'General' ? currentTopic.value : q.topic,
            question_link: getQuestionLink(q.title, q.topic === 'General' ? currentTopic.value : q.topic, defaultQuestionLink),
            status: 'Pending',
            due_date: null
        }));
    } else {
        const topic = currentTopic.value;
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
            question_link: getQuestionLink(title, topic, defaultQuestionLink),
            status: 'Pending',
            due_date: null
        }));
    }

    // Deduplicate against existing tasks by topic + title.
    // This allows the same question title to exist under different topics.
    const existingTaskKeys = new Set(
        tasks.map(t => `${(t.topic || 'General').toLowerCase().trim()}::${t.task_title.toLowerCase().trim()}`)
    );
    const newRows = rows.filter(r => {
        const key = `${(r.topic || 'General').toLowerCase().trim()}::${r.task_title.toLowerCase().trim()}`;
        return !existingTaskKeys.has(key);
    });
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
    await syncAutoQuestionLinks();
    addInput.value = '';
    if (addLink) addLink.value = '';
    previewEl.classList.add('hidden');
    render();

    const daysRange = data.length === 1 ? '1 day' : `1-${data.length} days`;
    let msg = `Added ${data.length} question${data.length > 1 ? 's' : ''}! Use "📅 Schedule" on the topic card to set deadlines.`;
    if (skipped > 0) msg += ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)`;
    toast(msg, 'success');
};

// ============================================
//  TOGGLE STATUS
// ============================================
const codeOverlay = $('#code-overlay');
const codeTaskId = $('#code-task-id');
const codeInput = $('#code-input');
const codeLink = $('#code-link');

async function toggle(id) {
    const t = tasks.find(x => x.task_id === id);
    if (!t) return;
    
    // If marking as Completed, require code submission
    if (t.status !== 'Completed') {
        codeTaskId.value = id;
        codeInput.value = t.solution_code || '';
        if (codeLink) codeLink.value = t.question_link || '';
        codeOverlay.classList.remove('hidden');
        codeInput.focus();
        return;
    }
    
    // If unchecking (going back to Pending), allow directly
    const { data, error } = await db.from('tasks').update({ status: 'Pending', updated_at: new Date().toISOString() }).eq('task_id', id).eq('user_id', user.id).select().single();
    if (error) { toast('Update failed', 'error'); return; }
    const i = tasks.findIndex(x => x.task_id === id);
    if (i !== -1) tasks[i] = data;
    render();
}

async function updateTaskAsCompleted(id, payload) {
    const completionTs = new Date().toISOString();
    const baseUpdate = {
        ...payload,
        status: 'Completed',
        updated_at: completionTs
    };

    // Prefer dedicated completed_at if schema has it.
    let result = await db.from('tasks')
        .update({ ...baseUpdate, completed_at: completionTs })
        .eq('task_id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    // Fallback for legacy schema without completed_at column.
    if (result.error && /completed_at/i.test(result.error.message || '')) {
        result = await db.from('tasks')
            .update(baseUpdate)
            .eq('task_id', id)
            .eq('user_id', user.id)
            .select()
            .single();
    }

    if (!result.error) {
        setCompletionHistoryTimestamp(id, completionTs);
        if (result.data && !result.data.completed_at) result.data.completed_at = completionTs;
    }

    return result;
}

// Code submission modal handlers
$('#code-cancel').onclick = () => {
    codeOverlay.classList.add('hidden');
    codeInput.value = '';
    if (codeLink) codeLink.value = '';
    render(); // Reset checkbox state
};

codeOverlay.onclick = e => { 
    if (e.target === codeOverlay) {
        codeOverlay.classList.add('hidden');
        codeInput.value = '';
        if (codeLink) codeLink.value = '';
        render();
    }
};

$('#code-submit').onclick = async () => {
    const code = codeInput.value.trim();
    if (!code) {
        toast('Please paste your code before marking as solved!', 'error');
        return;
    }

    const normalizedCodeLink = normalizeQuestionLink(codeLink?.value || '');
    if (!normalizedCodeLink.ok) {
        toast('Please enter a valid question link.', 'error');
        return;
    }
    
    const id = parseInt(codeTaskId.value);
    const { data, error } = await updateTaskAsCompleted(id, {
        solution_code: code,
        question_link: normalizedCodeLink.value
    });
    
    if (error) { toast('Update failed', 'error'); return; }
    
    const i = tasks.findIndex(x => x.task_id === id);
    if (i !== -1) tasks[i] = data;
    
    codeOverlay.classList.add('hidden');
    codeInput.value = '';
    if (codeLink) codeLink.value = '';
    render();
    
    // Show Late/On Time feedback
    const status = getDeadlineStatus(data);
    if (status === 'late') toast('⚠️ Completed Late!', 'info');
    else toast('✅ Solved On Time!', 'success');
};

// ============================================
//  VIEW SUBMITTED CODE
// ============================================
const viewCodeOverlay = $('#view-code-overlay');
const viewCodeTitle = $('#view-code-title');
const viewCodeContent = $('#view-code-content');

function viewCode(task) {
    viewCodeTitle.textContent = task.task_title;
    viewCodeContent.textContent = task.solution_code || 'No code submitted';
    viewCodeOverlay.classList.remove('hidden');
}

$('#view-code-close').onclick = () => viewCodeOverlay.classList.add('hidden');
viewCodeOverlay.onclick = e => { if (e.target === viewCodeOverlay) viewCodeOverlay.classList.add('hidden'); };

$('#view-code-copy').onclick = () => {
    const code = viewCodeContent.textContent;
    navigator.clipboard.writeText(code).then(() => {
        toast('Code copied to clipboard!', 'success');
    }).catch(() => {
        toast('Failed to copy', 'error');
    });
};

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
    $('#edit-link').value = t.question_link || '';
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

    const normalizedEditLink = normalizeQuestionLink($('#edit-link').value);
    if (!normalizedEditLink.ok) {
        toast('Please enter a valid question link.', 'error');
        return;
    }

    const updates = {
        task_title: title,
        task_description: $('#edit-notes').value.trim(),
        question_link: normalizedEditLink.value,
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
searchEl.addEventListener('input', () => { saveFilters(); render(); });
fTopic.addEventListener('change', () => { saveFilters(); render(); });
fStatus.addEventListener('change', () => { saveFilters(); render(); });
sortEl.addEventListener('change', () => { saveFilters(); render(); });

function render() {
    // Filter by current topic first
    let list = tasks.filter(t => t.topic === currentTopic.value);

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
        li.dataset.taskId = String(t.task_id);
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
                ${t.question_link ? `<a class="q-link" href="${esc(t.question_link)}" target="_blank" rel="noopener noreferrer">🔗 Open Question</a>` : ''}
            </div>
            <div class="q-actions">
                ${solved && t.solution_code ? '<button class="view-code-btn" title="View Code">💻</button>' : ''}
                <button class="edit-btn" title="Edit">✏️</button>
                <button class="del" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector('.q-check').onchange = () => toggle(t.task_id);
        li.querySelector('.edit-btn').onclick = () => openEdit(t);
        li.querySelector('.del').onclick = () => { if (confirm('Delete this question?')) remove(t.task_id); };
        if (solved && t.solution_code) {
            li.querySelector('.view-code-btn').onclick = () => viewCode(t);
        }

        listEl.appendChild(li);
    });

    updateStats();
}

// ============================================
//  PRACTICE HEATMAP
// ============================================

function generateYearHeatmapData() {
    const today = new Date();
    const dailyCount = {}; // { "2026-04-24": 3 }
    
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    completedTasks.forEach(task => {
        const timestamp = getSubmissionTimestamp(task);
        const dateStr = toDateOnlyString(timestamp) || toDateOnlyString(task.updated_at);
        
        if (dateStr) {
            dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
        }
    });
    
    return dailyCount;
}

function calculateHeatmapStats(dailyCount) {
    const counts = Object.values(dailyCount);
    const totalSubmissions = counts.reduce((sum, c) => sum + c, 0);
    const activeDays = counts.filter(c => c > 0).length;
    
    // Calculate current streak from today backwards.
    const today = getToday();
    let currentStreak = 0;
    let currentDate = new Date(today);
    
    while (true) {
        const dateStr = formatLocalDateKey(currentDate);
        if (!dailyCount[dateStr]) break;
        
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate max streak across the year window.
    const activeDateSet = new Set(
        Object.entries(dailyCount)
            .filter(([, value]) => value > 0)
            .map(([date]) => date)
    );
    const sortedActiveDates = Array.from(activeDateSet).sort();
    let maxStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    sortedActiveDates.forEach(dateStr => {
        if (!previousDate) {
            runningStreak = 1;
        } else {
            const diff = diffDays(previousDate, dateStr);
            runningStreak = diff === 1 ? runningStreak + 1 : 1;
        }
        if (runningStreak > maxStreak) maxStreak = runningStreak;
        previousDate = dateStr;
    });
    
    return { totalSubmissions, activeDays, currentStreak, maxStreak };
}

function getHeatmapLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
}

function getYearCalendar(endDate) {
    // Get 52 weeks ending at endDate
    const endDay = new Date(endDate);
    endDay.setHours(0, 0, 0, 0);
    
    // Start from 52 weeks ago (364 days)
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 363);
    
    const weeks = [];
    let currentWeek = [];
    let currentDate = new Date(startDay);
    
    while (currentDate <= endDay) {
        const dateStr = formatLocalDateKey(currentDate);
        currentWeek.push({ date: dateStr, day: currentDate.getDate() });
        
        if (currentWeek.length === 7) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }
    
    return weeks;
}

function buildMonthGroups(weeks) {
    const groups = [];
    let currentGroup = null;
    let previousKey = '';

    weeks.forEach((week, index) => {
        const firstDay = week.find(Boolean);
        if (!firstDay) return;

        const d = new Date(firstDay.date + 'T00:00:00');

        // Skip partial leading month at the very left edge.
        if (index === 0 && d.getDate() > 7) {
            return;
        }

        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== previousKey) {
            previousKey = key;
            currentGroup = {
                label: d.toLocaleDateString('en-US', { month: 'short' }),
                weeks: []
            };
            groups.push(currentGroup);
        }

        if (currentGroup) {
            currentGroup.weeks.push(week);
        }
    });

    return groups;
}

function updateHeatmap() {
    const heatmapEl = $('#dashboard-heatmap');
    if (!heatmapEl || heatmapEl.classList.contains('hidden')) return;
    
    const today = getToday();
    const dailyCount = generateYearHeatmapData();
    const weeks = getYearCalendar(today);
    const stats = calculateHeatmapStats(dailyCount);
    
    // Update stats
    setTextIfChanged($('#heatmap-stat-total'), stats.activeDays);
    setTextIfChanged($('#heatmap-stat-streak'), stats.currentStreak);
    setTextIfChanged($('#heatmap-stat-busiest'), stats.maxStreak);
    
    const yearLabel = `${stats.totalSubmissions} submissions in the past year`;
    setTextIfChanged($('#heatmap-period-info'), yearLabel);
    
    // Render calendar
    const calendarEl = $('#heatmap-calendar');
    const monthGroups = buildMonthGroups(weeks);
    
    let html = '<div class="heatmap-grid-shell">';
    html += '<div class="heatmap-month-groups">';

    monthGroups.forEach((group, groupIndex) => {
        html += '<div class="heatmap-month-group">';
        html += `<div class="heatmap-month-title">${group.label}</div>`;
        html += '<div class="heatmap-month-weeks">';

        group.weeks.forEach((week, weekIndex) => {
            html += '<div class="heatmap-week">';
            week.forEach(cell => {
                if (!cell) {
                    html += '<div class="heatmap-cell heatmap-cell-empty"></div>';
                    return;
                }

                const count = dailyCount[cell.date] || 0;
                const level = getHeatmapLevel(count);
                const isToday = cell.date === today;
                const tooltip = count > 0 ? `${count} solved` : 'No practice';
                const dayName = new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isRightEdgeWeek = groupIndex === monthGroups.length - 1 && weekIndex === group.weeks.length - 1;
                const tooltipClass = isRightEdgeWeek ? 'tooltip-flip-left' : '';

                html += `
                    <div class="heatmap-cell ${isToday ? 'today' : ''} ${tooltipClass}" 
                         data-level="${level}" 
                         data-tooltip="${dayName} - ${tooltip}"
                         title="${dayName}: ${tooltip}">
                    </div>
                `;
            });
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
    });

    html += '</div>';

    calendarEl.innerHTML = html;
}

// ============================================
//  STATS
// ============================================
function updateStats() {
    initDashboardTopicPicker();

    const topicTasks = tasks.filter(t => t.topic === currentTopic.value);
    const dashboardTasks = dashboardScope === 'all' ? tasks : topicTasks;

    const total = topicTasks.length;
    let solved = 0;
    let overdue = 0;

    for (const task of topicTasks) {
        if (task.status === 'Completed') solved++;
        if (isOverdue(task.due_date, task.status)) overdue++;
    }

    const pct = total === 0 ? 0 : Math.round((solved / total) * 100);

    const dashboardTotal = dashboardTasks.length;
    let dashboardSolved = 0;
    for (const task of dashboardTasks) {
        if (task.status === 'Completed') dashboardSolved++;
    }
    const dashboardLeft = dashboardTotal - dashboardSolved;
    const dashboardPct = dashboardTotal === 0 ? 0 : Math.round((dashboardSolved / dashboardTotal) * 100);
    const dashboardTopicLabel = dashboardScope === 'all' ? 'All Questions' : currentTopic.value;

    setTextIfChanged(statTotalEl, total);
    setTextIfChanged(statSolvedEl, solved);
    setTextIfChanged(statUnsolvedEl, total - solved);
    setTextIfChanged(statOverdueEl, overdue);
    setTextIfChanged(statPercentEl, pct + '%');
    setStyleIfChanged(progressBarEl, 'width', pct + '%');

    setTextIfChanged(dashboardSolvedEl, dashboardSolved);
    setTextIfChanged(dashboardTotalEl, dashboardTotal);
    setTextIfChanged(dashboardLeftEl, dashboardLeft);
    setTextIfChanged(dashboardPercentEl, dashboardPct + '%');
    setTextIfChanged(dashboardTopicEl, dashboardTopicLabel);

    const progressArc = Math.max(0, Math.min(DASHBOARD_RING.visibleArc, (DASHBOARD_RING.visibleArc * dashboardPct) / 100));
    setStyleIfChanged(ringProgressEl, 'strokeDasharray', `${progressArc} ${DASHBOARD_RING.circumference}`);

    updateDashboardTimeline(dashboardTasks);
    updateRevisionQueue(dashboardTasks);
    updateDailyPlan(dashboardTasks);
    updateWeeklyReview(dashboardTasks);
    updateHeatmap();

    // Show/hide delete all button
    if (deleteAllBtnEl) {
        if (total > 0) deleteAllBtnEl.classList.remove('hidden');
        else deleteAllBtnEl.classList.add('hidden');
    }

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
        if (!topicData[topic]) topicData[topic] = { total: 0, solved: 0, dates: [] };
        topicData[topic].total++;
        if (t.status === 'Completed') topicData[topic].solved++;
        if (t.due_date) topicData[topic].dates.push(t.due_date);
    });

    // Sort: 1) Completed topics first, 2) By nearest deadline (soonest first), 3) Unscheduled last
    const sortedTopics = Object.entries(topicData).sort((a, b) => {
        const aComplete = a[1].solved === a[1].total;
        const bComplete = b[1].solved === b[1].total;
        
        // Completed topics come first
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        
        // Get earliest deadline for each topic
        const aSchedule = getTopicSchedule(a[0]);
        const bSchedule = getTopicSchedule(b[0]);
        const aStart = aSchedule?.startDate || (a[1].dates.length > 0 ? a[1].dates.sort()[0] : null);
        const bStart = bSchedule?.startDate || (b[1].dates.length > 0 ? b[1].dates.sort()[0] : null);
        
        // Scheduled topics before unscheduled
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        
        // Both scheduled: sort by earliest deadline (soonest first)
        if (aStart && bStart) return aStart.localeCompare(bStart);
        
        // Both unscheduled: sort by total questions (descending)
        return b[1].total - a[1].total;
    });

    let html = '<div class="topic-stats-header">📊 Topic-wise Progress — Click to view, 📅 to schedule</div><div class="topic-stats-grid">';
    sortedTopics.forEach(([topic, data]) => {
        const pct = Math.round((data.solved / data.total) * 100);
        const isComplete = data.solved === data.total;
        // Show saved schedule range (preferred) or fall back to actual task dates
        let scheduleInfo;
        const savedSchedule = getTopicSchedule(topic);
        // Validate saved schedule (start must be <= end)
        const isValidSchedule = savedSchedule && savedSchedule.startDate && savedSchedule.endDate && savedSchedule.startDate <= savedSchedule.endDate;
        if (isValidSchedule) {
            // Use the saved schedule range
            scheduleInfo = `<span class="topic-schedule-info">📅 ${fmtDateShort(savedSchedule.startDate)} — ${fmtDateShort(savedSchedule.endDate)}</span>`;
        } else if (data.dates.length > 0) {
            // Fall back to actual task due_dates if no valid saved schedule
            const sortedDates = data.dates.sort();
            const minDate = sortedDates[0];
            const maxDate = sortedDates[sortedDates.length - 1];
            scheduleInfo = `<span class="topic-schedule-info">📅 ${fmtDateShort(minDate)} — ${fmtDateShort(maxDate)}</span>`;
        } else {
            scheduleInfo = '<span class="topic-schedule-info unscheduled">Not scheduled</span>';
        }
        html += `
            <div class="topic-stat-item${isComplete ? ' complete' : ''}" data-topic="${esc(topic)}">
                <div class="topic-stat-top">
                    <div class="topic-stat-name">${esc(topic)}</div>
                    <button class="topic-schedule-btn" data-topic="${esc(topic)}" title="Schedule this topic">📅</button>
                </div>
                ${scheduleInfo}
                <div class="topic-stat-progress">
                    <div class="topic-stat-bar">
                        <div class="topic-stat-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="topic-stat-nums">${data.solved}/${data.total}</span>
                    <span class="topic-stat-pct">(${pct}%)</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    topicStatsEl.innerHTML = html;

    // Click topic card → set current topic and show its questions
    topicStatsEl.querySelectorAll('.topic-stat-item').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            if (e.target.closest('.topic-schedule-btn')) return; // don't trigger on schedule btn
            const topic = el.dataset.topic;
            currentTopic.value = topic;
            saveCurrentTopic();
            fTopic.value = 'all';
            
            // If all questions in topic are completed, show Solved; otherwise show Pending
            const topicTasks = tasks.filter(t => t.topic === topic);
            const allCompleted = topicTasks.length > 0 && topicTasks.every(t => t.status === 'Completed');
            fStatus.value = allCompleted ? 'Completed' : 'Pending';
            
            saveFilters();
            render();
            toast(`Switched to ${topic}`, 'info');
        });
    });

    // Schedule button click
    topicStatsEl.querySelectorAll('.topic-schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openScheduleModal(btn.dataset.topic);
        });
    });
}

// ============================================
//  TOPIC SCHEDULING SYSTEM
// ============================================
const SCHEDULE_KEY = 'dsa-tracker-schedules';

function getAllSchedules() {
    try {
        return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}');
    } catch { return {}; }
}

function getTopicSchedule(topic) {
    return getAllSchedules()[topic] || null;
}

function saveTopicSchedule(topic, startDate, endDate) {
    const schedules = getAllSchedules();
    schedules[topic] = { startDate, endDate };
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
}

function removeTopicSchedule(topic) {
    const schedules = getAllSchedules();
    delete schedules[topic];
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
}

function fmtDateShort(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    const day = dt.getDate();
    const suffix = getDaySuffix(day);
    const month = dt.toLocaleDateString('en-US', { month: 'short' });
    return `${day}${suffix} ${month}`;
}

// Get all dates occupied by other topics (not the given topic).
// Prefer saved schedule ranges; fall back to task deadlines for unscheduled topics.
function getOccupiedDates(excludeTopic) {
    const occupiedByTopic = {};
    const schedules = getAllSchedules();

    for (const [topic, schedule] of Object.entries(schedules)) {
        if (topic === excludeTopic) continue;
        if (!schedule?.startDate || !schedule?.endDate) continue;
        if (schedule.startDate > schedule.endDate) continue;
        occupiedByTopic[topic] = { topic, start: schedule.startDate, end: schedule.endDate };
    }

    const topicDates = {};
    tasks.forEach(t => {
        if (t.topic === excludeTopic || !t.due_date || occupiedByTopic[t.topic]) return;
        if (!topicDates[t.topic]) topicDates[t.topic] = [];
        topicDates[t.topic].push(t.due_date);
    });

    for (const [topic, dates] of Object.entries(topicDates)) {
        const sorted = dates.sort();
        occupiedByTopic[topic] = { topic, start: sorted[0], end: sorted[sorted.length - 1] };
    }

    return Object.values(occupiedByTopic);
}

function isDateOccupied(dateStr, excludeTopic) {
    const occupied = getOccupiedDates(excludeTopic);
    for (const o of occupied) {
        if (dateStr >= o.start && dateStr <= o.end) return o.topic;
    }
    return null;
}

// Check if a range conflicts with existing schedules
function getConflicts(startDate, endDate, excludeTopic) {
    const occupied = getOccupiedDates(excludeTopic);
    const conflicts = [];
    for (const o of occupied) {
        if (startDate <= o.end && endDate >= o.start) {
            conflicts.push(o);
        }
    }
    return conflicts;
}

function openScheduleModal(topic) {
    const modal = $('#schedule-overlay');
    const unsolvedTasks = tasks.filter(t => t.topic === topic && t.status !== 'Completed');
    const allTopicTasks = tasks.filter(t => t.topic === topic);
    const totalUnsolved = unsolvedTasks.length;
    
    if (totalUnsolved === 0) {
        toast(`No unsolved questions in ${topic}!`, 'info');
        return;
    }

    $('#schedule-topic-name').textContent = topic;
    $('#schedule-topic-input').value = topic;
    $('#schedule-question-count').textContent = `${allTopicTasks.length} total questions (${totalUnsolved} unsolved) — 1 per day`;
    
    const existing = getTopicSchedule(topic);
    const startInput = $('#schedule-start-date');
    startInput.value = existing ? existing.startDate : '';
    startInput.min = getToday();
    
    // Set occupied dates info
    updateScheduleConflictInfo(topic);
    
    $('#schedule-end-preview').textContent = '';
    modal.classList.remove('hidden');
    startInput.focus();
}

function updateScheduleConflictInfo(topic) {
    const occupied = getOccupiedDates(topic);
    const infoEl = $('#schedule-occupied-info');
    if (occupied.length === 0) {
        infoEl.innerHTML = '<span class="schedule-ok">✅ No other topics scheduled — all dates available</span>';
    } else {
        let html = '<span class="schedule-warn">Occupied date ranges:</span><ul class="schedule-occupied-list">';
        occupied.forEach(o => {
            html += `<li>📅 <strong>${esc(o.topic)}</strong>: ${fmtDateShort(o.start)} — ${fmtDateShort(o.end)}</li>`;
        });
        html += '</ul>';
        infoEl.innerHTML = html;
    }
}

// Schedule modal event handlers
$('#schedule-start-date').addEventListener('input', function() {
    const topic = $('#schedule-topic-input').value;
    const unsolvedTasks = tasks.filter(t => t.topic === topic && t.status !== 'Completed');
    const allTopicTasks = tasks.filter(t => t.topic === topic);
    const startDate = this.value;
    
    if (!startDate || unsolvedTasks.length === 0) {
        $('#schedule-end-preview').textContent = '';
        $('#schedule-conflict-warn').innerHTML = '';
        return;
    }

    // Use total tasks count for end date calculation
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + allTopicTasks.length - 1);
    const endDate = d.toISOString().split('T')[0];
    
    $('#schedule-end-preview').textContent = `End date: ${fmtDateShort(endDate)} (${allTopicTasks.length} days total, ${unsolvedTasks.length} unsolved)`;
    
    // Check for conflicts
    const conflicts = getConflicts(startDate, endDate, topic);
    const warnEl = $('#schedule-conflict-warn');
    if (conflicts.length > 0) {
        let html = '<div class="schedule-conflict">⚠️ <strong>Date conflict!</strong> Overlaps with:<ul>';
        conflicts.forEach(c => {
            html += `<li><strong>${esc(c.topic)}</strong>: ${fmtDateShort(c.start)} — ${fmtDateShort(c.end)}</li>`;
        });
        html += '</ul>You can still schedule, but consider picking another date.</div>';
        warnEl.innerHTML = html;
    } else {
        warnEl.innerHTML = '<div class="schedule-no-conflict">✅ No conflicts — dates are free!</div>';
    }
});

$('#schedule-cancel').onclick = () => {
    $('#schedule-overlay').classList.add('hidden');
};

$('#schedule-overlay').onclick = e => {
    if (e.target === $('#schedule-overlay')) $('#schedule-overlay').classList.add('hidden');
};

$('#schedule-save').onclick = async () => {
    const topic = $('#schedule-topic-input').value;
    const startDate = $('#schedule-start-date').value;
    
    if (!startDate) {
        toast('Please select a start date.', 'error');
        return;
    }
    
    const topicTasks = tasks.filter(t => t.topic === topic && t.status !== 'Completed');
    if (topicTasks.length === 0) {
        toast('No unsolved questions to schedule!', 'info');
        return;
    }

    // Calculate end date based on TOTAL tasks in topic (not just unsolved)
    // This ensures the schedule range reflects the full topic duration
    const allTopicTasks = tasks.filter(t => t.topic === topic);
    const totalQuestions = allTopicTasks.length;
    const endD = new Date(startDate + 'T00:00:00');
    endD.setDate(endD.getDate() + totalQuestions - 1);
    const endDate = endD.toISOString().split('T')[0];

    // Assign deadlines: question 1 = startDate, question 2 = startDate+1, etc.
    const updates = topicTasks.map((t, i) => {
        const d = new Date(startDate + 'T00:00:00');
        d.setDate(d.getDate() + i);
        return { id: t.task_id, due_date: d.toISOString().split('T')[0] };
    });

    // Update in DB
    let failed = 0;
    for (const u of updates) {
        const { error } = await db.from('tasks').update({ due_date: u.due_date, updated_at: new Date().toISOString() }).eq('task_id', u.id).eq('user_id', user.id);
        if (error) failed++;
    }

    if (failed > 0) {
        toast(`${failed} updates failed. Try again.`, 'error');
        return;
    }

    // Update local tasks
    updates.forEach(u => {
        const t = tasks.find(x => x.task_id === u.id);
        if (t) t.due_date = u.due_date;
    });

    // Save schedule
    saveTopicSchedule(topic, startDate, endDate);

    // Switch to this topic
    currentTopic.value = topic;
    saveCurrentTopic();

    $('#schedule-overlay').classList.add('hidden');
    render();
    toast(`📅 ${topic} scheduled: ${fmtDateShort(startDate)} — ${fmtDateShort(endDate)}`, 'success');
};

$('#schedule-remove').onclick = () => {
    const topic = $('#schedule-topic-input').value;
    removeTopicSchedule(topic);
    $('#schedule-overlay').classList.add('hidden');
    render();
    toast(`Schedule removed for ${topic}`, 'info');
};

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
    
    // Only consider UNSOLVED (Pending) questions with deadlines
    const pendingWithDeadline = tasks.filter(t => t.status === 'Pending' && t.due_date);
    
    let overdueQuestions = [];
    let dueTodayQuestions = [];
    let dueTomorrowQuestions = [];
    
    for (const t of pendingWithDeadline) {
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        
        if (due < today) overdueQuestions.push(t);
        else if (due.getTime() === today.getTime()) dueTodayQuestions.push(t);
        else if (due.getTime() === tomorrow.getTime()) dueTomorrowQuestions.push(t);
    }
    
    // Sort by deadline (nearest first)
    const sortByDate = (a, b) => new Date(a.due_date) - new Date(b.due_date);
    overdueQuestions.sort(sortByDate);
    dueTodayQuestions.sort(sortByDate);
    dueTomorrowQuestions.sort(sortByDate);
    
    if (overdueQuestions.length > 0) {
        const nearest = overdueQuestions[0];
        const questionNames = overdueQuestions.slice(0, 3).map(q => `• ${q.task_title}`).join('\n');
        const moreText = overdueQuestions.length > 3 ? `\n...and ${overdueQuestions.length - 3} more` : '';
        sendNotification(
            `⚠️ ${overdueQuestions.length} Overdue Question${overdueQuestions.length > 1 ? 's' : ''}!`,
            `Pending questions past deadline:\n${questionNames}${moreText}`,
            'overdue'
        );
    } else if (dueTodayQuestions.length > 0) {
        const nearest = dueTodayQuestions[0];
        const questionNames = dueTodayQuestions.slice(0, 3).map(q => `• ${q.task_title}`).join('\n');
        const moreText = dueTodayQuestions.length > 3 ? `\n...and ${dueTodayQuestions.length - 3} more` : '';
        sendNotification(
            `📅 ${dueTodayQuestions.length} Due Today!`,
            `Solve these before deadline:\n${questionNames}${moreText}`,
            'due-today'
        );
    } else if (dueTomorrowQuestions.length > 0) {
        const nearest = dueTomorrowQuestions[0];
        const questionNames = dueTomorrowQuestions.slice(0, 3).map(q => `• ${q.task_title}`).join('\n');
        const moreText = dueTomorrowQuestions.length > 3 ? `\n...and ${dueTomorrowQuestions.length - 3} more` : '';
        sendNotification(
            `🔔 ${dueTomorrowQuestions.length} Due Tomorrow`,
            `Upcoming deadlines:\n${questionNames}${moreText}`,
            'due-tomorrow'
        );
    }
}

// Request permission on page load and set up periodic checks
document.addEventListener('DOMContentLoaded', () => {
    updateNotifyButton();
});

// Notification button click handler
function updateNotifyButton() {
    const btn = $('#notify-btn');
    if (!btn) return;
    
    if (!('Notification' in window)) {
        btn.textContent = '🔕 Not Supported';
        btn.disabled = true;
        btn.classList.add('disabled');
        return;
    }
    
    if (Notification.permission === 'granted') {
        btn.textContent = '🔔 Alerts On';
        btn.classList.add('active');
        btn.disabled = true;
    } else if (Notification.permission === 'denied') {
        btn.textContent = '🔕 Blocked';
        btn.classList.add('denied');
        btn.title = 'Notifications blocked. Enable in browser settings.';
    } else {
        btn.textContent = '🔔 Enable Alerts';
        btn.classList.remove('active', 'denied');
    }
}

$('#notify-btn')?.addEventListener('click', async () => {
    const btn = $('#notify-btn');
    if (Notification.permission === 'denied') {
        toast('Notifications blocked. Please enable in browser settings (click 🔒 in address bar)', 'error');
        return;
    }
    
    const granted = await requestNotificationPermission();
    updateNotifyButton();
    
    if (granted) {
        toast('🔔 Notifications enabled! You\'ll get reminders for deadlines.', 'success');
        // Send a test notification
        sendNotification('✅ Notifications Enabled!', 'You will now receive deadline reminders.', 'test');
    } else {
        toast('Notification permission denied', 'error');
    }
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
