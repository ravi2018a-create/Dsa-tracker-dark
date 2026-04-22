const NOTES_STORAGE_KEY = 'qualcomm-notes-v1';
const NOTES_DRAFT_KEY = 'qualcomm-notes-draft-v1';

const notesForm = document.querySelector('#notes-form');
const noteIdInput = document.querySelector('#note-id');
const noteTitleInput = document.querySelector('#note-title');
const noteContentInput = document.querySelector('#note-content');
const noteAccentInput = document.querySelector('#note-accent');
const notePinnedInput = document.querySelector('#note-pinned');
const noteCollapsedDefaultInput = document.querySelector('#note-collapsed-default');
const notesList = document.querySelector('#notes-list');
const notesEmpty = document.querySelector('#notes-empty');
const notesFormStatus = document.querySelector('#notes-form-status');
const notesModeHelp = document.querySelector('#notes-mode-help');
const notesSummary = document.querySelector('#notes-summary');
const notesSearchInput = document.querySelector('#notes-search');
const notesSortInput = document.querySelector('#notes-sort');
const notesExpandAllBtn = document.querySelector('#notes-expand-all');
const notesCollapseAllBtn = document.querySelector('#notes-collapse-all');
const clearFormBtn = document.querySelector('#clear-form-btn');
const cancelEditBtn = document.querySelector('#cancel-edit-btn');
const modeButtons = Array.from(document.querySelectorAll('.notes-mode-btn'));

let editorMode = 'text';
let notes = loadNotes();

const MODE_HELP = {
    text: 'Plain text mode. Write free-form notes.',
    checklist: 'Checklist mode: one line per item. Use !Title for plain line, [ ] task for checkbox, [x] task for completed.',
    outline: 'Book outline mode: indentation controls nesting (2 spaces or tab). Numbering auto-generated as 1, 1.01, 1.01.01...'
};

function loadNotes() {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

function saveNotes() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function saveDraft() {
    const draft = {
        title: noteTitleInput.value,
        content: noteContentInput.value,
        mode: editorMode,
        accent: noteAccentInput.value,
        pinned: notePinnedInput.checked,
        collapsed: noteCollapsedDefaultInput.checked
    };
    localStorage.setItem(NOTES_DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
    localStorage.removeItem(NOTES_DRAFT_KEY);
}

function restoreDraft() {
    const raw = localStorage.getItem(NOTES_DRAFT_KEY);
    if (!raw) return;
    try {
        const draft = JSON.parse(raw);
        if (noteIdInput.value) return;
        if (!draft || (!draft.title && !draft.content)) return;
        noteTitleInput.value = draft.title || '';
        noteContentInput.value = draft.content || '';
        noteAccentInput.value = draft.accent || 'indigo';
        notePinnedInput.checked = !!draft.pinned;
        noteCollapsedDefaultInput.checked = !!draft.collapsed;
        notesFormStatus.textContent = 'Draft restored';
    } catch {
        clearDraft();
    }
}

function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setEditorMode(mode) {
    editorMode = ['text', 'checklist', 'outline'].includes(mode) ? mode : 'text';
}

function clearForm() {
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteAccentInput.value = 'indigo';
    notePinnedInput.checked = false;
    noteCollapsedDefaultInput.checked = false;
    notesFormStatus.textContent = 'Creating a new note';
    clearDraft();
    noteTitleInput.focus();
}

function getNoteMode(note) {
    if (note?.mode) return note.mode;
    if (Array.isArray(note?.outline) && note.outline.length > 0) return 'outline';
    if (Array.isArray(note?.checklist) && note.checklist.length > 0) return 'checklist';
    return 'text';
}

function modeLabel(mode) {
    if (mode === 'outline') return 'Book';
    if (mode === 'checklist') return 'List';
    return 'Text';
}

function newNodeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseChecklistLine(rawLine) {
    const line = rawLine.trim();
    if (!line) return null;

    if (line.startsWith('!')) {
        const text = line.slice(1).trim();
        if (!text) return null;
        return { text, done: false, checkable: false };
    }

    const checkedMatch = line.match(/^[-*]?\s*\[(x|X)\]\s+(.+)$/);
    if (checkedMatch) return { text: checkedMatch[2].trim(), done: true, checkable: true };

    const uncheckedMatch = line.match(/^[-*]?\s*\[\s\]\s+(.+)$/);
    if (uncheckedMatch) return { text: uncheckedMatch[1].trim(), done: false, checkable: true };

    return { text: line, done: false, checkable: true };
}

function toChecklistItems(content) {
    return content.split('\n').map(parseChecklistLine).filter(Boolean);
}

function getIndentLevel(rawLine) {
    const match = rawLine.match(/^[\t ]*/);
    const indent = match ? match[0] : '';
    let spaces = 0;
    for (const ch of indent) spaces += ch === '\t' ? 2 : 1;
    return Math.floor(spaces / 2);
}

function parseOutlineLine(rawLine) {
    const line = rawLine.trim();
    if (!line) return null;

    if (line.startsWith('!')) {
        const text = line.slice(1).trim();
        if (!text) return null;
        return { text, checkable: false, done: false };
    }

    const checkedMatch = line.match(/^[-*]?\s*\[(x|X)\]\s+(.+)$/);
    if (checkedMatch) return { text: checkedMatch[2].trim(), checkable: true, done: true };

    const uncheckedMatch = line.match(/^[-*]?\s*\[\s\]\s+(.+)$/);
    if (uncheckedMatch) return { text: uncheckedMatch[1].trim(), checkable: true, done: false };

    return { text: line, checkable: false, done: false };
}

function toOutlineItems(content) {
    const root = [];
    const stack = [{ depth: -1, children: root }];

    content.split('\n').forEach(rawLine => {
        const parsed = parseOutlineLine(rawLine);
        if (!parsed) return;

        const depth = getIndentLevel(rawLine);
        while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();

        const node = {
            id: newNodeId(),
            text: parsed.text,
            checkable: parsed.checkable,
            done: parsed.checkable ? parsed.done : false,
            collapsed: false,
            children: []
        };

        stack[stack.length - 1].children.push(node);
        stack.push({ depth, children: node.children });
    });

    return root;
}

function flattenOutlineState(nodes, prefix = '', map = new Map()) {
    nodes.forEach((node, index) => {
        const path = prefix ? `${prefix}.${index}` : `${index}`;
        const key = `${path}|${node.text}|${node.checkable ? 1 : 0}`;
        map.set(key, { id: node.id, done: !!node.done, collapsed: !!node.collapsed });
        if (node.children?.length) flattenOutlineState(node.children, path, map);
    });
    return map;
}

function applyOutlineState(freshNodes, stateMap, prefix = '') {
    return freshNodes.map((node, index) => {
        const path = prefix ? `${prefix}.${index}` : `${index}`;
        const key = `${path}|${node.text}|${node.checkable ? 1 : 0}`;
        const existing = stateMap.get(key);
        return {
            ...node,
            id: existing?.id || node.id,
            done: node.checkable ? !!existing?.done : false,
            collapsed: !!existing?.collapsed,
            children: applyOutlineState(node.children || [], stateMap, path)
        };
    });
}

function mergeChecklistState(existingItems, freshItems) {
    return freshItems.map((item, index) => {
        const existing = existingItems[index];
        if (existing && existing.text === item.text && (existing.checkable ?? true) === (item.checkable ?? true)) {
            return { ...item, done: item.checkable ? !!existing.done : false };
        }
        return item;
    });
}

function renderChecklist(note) {
    const total = note.checklist.filter(item => item.checkable !== false).length;
    const done = note.checklist.filter(item => item.checkable !== false && item.done).length;

    const rows = note.checklist.map((item, index) => {
        if (item.checkable === false) {
            return `<div class="notes-checklist-text">${escapeHtml(item.text)}</div>`;
        }
        return `
            <label class="notes-checklist-row ${item.done ? 'done' : ''}">
                <input type="checkbox" data-action="toggle-item" data-index="${index}" ${item.done ? 'checked' : ''}>
                <span>${escapeHtml(item.text)}</span>
            </label>
        `;
    }).join('');

    return `
        <div class="notes-checklist-progress">Done: ${done}/${total}</div>
        <div class="notes-checklist-wrap">${rows}</div>
    `;
}

function countOutlineProgress(nodes) {
    return nodes.reduce((acc, node) => {
        if (node.checkable) {
            acc.total += 1;
            if (node.done) acc.done += 1;
        }
        if (node.children?.length) {
            const child = countOutlineProgress(node.children);
            acc.total += child.total;
            acc.done += child.done;
        }
        return acc;
    }, { done: 0, total: 0 });
}

function renderOutlineRows(nodes, parentNumber = '', depth = 0) {
    return nodes.map((node, index) => {
        const number = parentNumber ? `${parentNumber}.${String(index + 1).padStart(2, '0')}` : `${index + 1}`;
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;

        const row = `
            <div class="notes-outline-row ${node.done ? 'done' : ''}" style="--outline-depth:${depth};">
                <div class="notes-outline-left">
                    ${hasChildren
                        ? `<button class="notes-outline-collapse ${node.collapsed ? 'collapsed' : ''}" data-action="toggle-outline-collapse" data-node-id="${node.id}" type="button">▾</button>`
                        : '<span class="notes-outline-spacer"></span>'}
                    <span class="notes-outline-number">${number}</span>
                    ${node.checkable ? `<input type="checkbox" data-action="toggle-outline-check" data-node-id="${node.id}" ${node.done ? 'checked' : ''}>` : ''}
                    <span class="notes-outline-text">${escapeHtml(node.text)}</span>
                </div>
            </div>
        `;

        const children = hasChildren && !node.collapsed
            ? renderOutlineRows(node.children, number, depth + 1)
            : '';

        return row + children;
    }).join('');
}

function renderOutline(note) {
    const outline = Array.isArray(note.outline) ? note.outline : [];
    const progress = countOutlineProgress(outline);
    const rows = renderOutlineRows(outline);

    return `
        ${progress.total > 0 ? `<div class="notes-checklist-progress">Done: ${progress.done}/${progress.total}</div>` : ''}
        <div class="notes-outline-wrap">${rows || '<div class="notes-checklist-text">No outline entries</div>'}</div>
    `;
}

function updateOutlineNode(nodes, nodeId, updater) {
    return nodes.map(node => {
        if (node.id === nodeId) return updater(node);
        if (!node.children?.length) return node;
        return { ...node, children: updateOutlineNode(node.children, nodeId, updater) };
    });
}

function updateNoteById(noteId, updater) {
    notes = notes.map(n => n.id === noteId ? updater(n) : n);
    saveNotes();
    renderNotes();
}

function flattenOutlineText(nodes, parts = []) {
    nodes.forEach(node => {
        parts.push(node.text || '');
        if (node.children?.length) flattenOutlineText(node.children, parts);
    });
    return parts;
}

function getSearchBlob(note) {
    const chunks = [note.title || '', note.content || ''];
    if (Array.isArray(note.checklist)) chunks.push(...note.checklist.map(i => i.text || ''));
    if (Array.isArray(note.outline)) chunks.push(...flattenOutlineText(note.outline));
    return chunks.join(' ').toLowerCase();
}

function sortNotes(list) {
    const selected = notesSortInput.value;
    return list.sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return Number(b.pinned) - Number(a.pinned);
        if (selected === 'title') return (a.title || '').localeCompare(b.title || '');
        if (selected === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '');
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });
}

function renderNotes() {
    notesList.innerHTML = '';

    const query = notesSearchInput.value.trim().toLowerCase();
    let list = notes.slice();
    if (query) list = list.filter(note => getSearchBlob(note).includes(query));
    list = sortNotes(list);

    notesSummary.textContent = `${list.length} shown / ${notes.length} total`;

    if (list.length === 0) {
        notesEmpty.classList.remove('hidden');
        notesEmpty.textContent = notes.length === 0
            ? 'No notes yet. Create your first note.'
            : 'No notes match your search.';
        return;
    }

    notesEmpty.classList.add('hidden');

    list.forEach(note => {
        const li = document.createElement('li');
        const accent = note.accent || 'indigo';
        const collapsed = !!note.collapsed;
        const mode = getNoteMode(note);
        li.className = `notes-item accent-${accent}`;
        li.innerHTML = `
            <button class="notes-fold-btn" data-action="toggle-fold" aria-expanded="${collapsed ? 'false' : 'true'}" type="button">
                <span class="notes-fold-left">
                    <span class="notes-fold-chevron ${collapsed ? 'collapsed' : ''}">▾</span>
                    <span class="notes-fold-title">${escapeHtml(note.title)}</span>
                    <span class="notes-mode-badge">${modeLabel(mode)}</span>
                    ${note.pinned ? '<span class="notes-pill">Pinned</span>' : ''}
                </span>
                <span class="notes-meta-inline">${formatTime(note.updatedAt || note.createdAt)}</span>
            </button>
            <div class="notes-item-body ${collapsed ? 'hidden' : ''}">
                <div class="notes-item-content">
                    ${mode === 'outline' && Array.isArray(note.outline) && note.outline.length > 0
                        ? renderOutline(note)
                        : mode === 'checklist' && Array.isArray(note.checklist) && note.checklist.length > 0
                        ? renderChecklist(note)
                        : `<p>${escapeHtml(note.content)}</p>`}
                </div>
                <div class="notes-meta">Updated: ${formatTime(note.updatedAt || note.createdAt)}</div>
                <div class="notes-item-actions">
                    <button class="btn btn-sm" data-action="edit" type="button">Edit</button>
                    <button class="btn btn-sm" data-action="delete" type="button">Delete</button>
                </div>
            </div>
        `;

        li.querySelector('[data-action="toggle-fold"]').addEventListener('click', () => {
            updateNoteById(note.id, n => ({ ...n, collapsed: !n.collapsed }));
        });

        li.querySelector('[data-action="edit"]').addEventListener('click', () => {
            noteIdInput.value = note.id;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            noteAccentInput.value = note.accent || 'indigo';
            notePinnedInput.checked = !!note.pinned;
            noteCollapsedDefaultInput.checked = !!note.collapsed;
            notesFormStatus.textContent = `Editing: ${note.title}`;
            noteTitleInput.focus();
        });

        li.querySelectorAll('[data-action="toggle-item"]').forEach(checkbox => {
            checkbox.addEventListener('change', e => {
                const index = Number(e.currentTarget.dataset.index);
                const isChecked = e.currentTarget.checked;
                updateNoteById(note.id, n => ({
                    ...n,
                    checklist: n.checklist.map((item, i) => {
                        if (i !== index || item.checkable === false) return item;
                        return { ...item, done: isChecked };
                    }),
                    updatedAt: new Date().toISOString()
                }));
            });
        });

        li.querySelectorAll('[data-action="toggle-outline-check"]').forEach(checkbox => {
            checkbox.addEventListener('change', e => {
                const nodeId = e.currentTarget.dataset.nodeId;
                const isChecked = e.currentTarget.checked;
                updateNoteById(note.id, n => ({
                    ...n,
                    outline: updateOutlineNode(n.outline || [], nodeId, node => ({ ...node, done: isChecked })),
                    updatedAt: new Date().toISOString()
                }));
            });
        });

        li.querySelectorAll('[data-action="toggle-outline-collapse"]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const nodeId = e.currentTarget.dataset.nodeId;
                updateNoteById(note.id, n => ({
                    ...n,
                    outline: updateOutlineNode(n.outline || [], nodeId, node => ({ ...node, collapsed: !node.collapsed }))
                }));
            });
        });

        li.querySelector('[data-action="delete"]').addEventListener('click', () => {
            if (!window.confirm('Delete this note?')) return;
            notes = notes.filter(n => n.id !== note.id);
            saveNotes();
            renderNotes();
            if (noteIdInput.value === note.id) clearForm();
        });

        notesList.appendChild(li);
    });
}

notesForm.addEventListener('submit', e => {
    e.preventDefault();

    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const accent = noteAccentInput.value;
    const pinned = notePinnedInput.checked;
    const collapsed = noteCollapsedDefaultInput.checked;
    if (!title || !content) return;

    const now = new Date().toISOString();
    const editingId = noteIdInput.value;
    
    // Auto-detect mode from content
    let mode = 'text';
    let checklist = [];
    let outline = [];
    
    const hasCheckboxes = /\[\s*[\sx]\s*\]/i.test(content);
    const hasHeadings = /📚|^\s*#/m.test(content);
    
    if (hasCheckboxes || hasHeadings) {
        // Mixed mode - parse both
        if (hasCheckboxes) {
            checklist = toChecklistItems(content);
            mode = checklist.length > 0 ? 'checklist' : 'text';
        }
        if (hasHeadings) {
            outline = toOutlineItems(content);
            mode = outline.length > 0 ? 'outline' : 'text';
        }
    }

    if (editingId) {
        const oldNote = notes.find(note => note.id === editingId);

        if (checklist.length > 0) checklist = mergeChecklistState(oldNote?.checklist || [], checklist);
        if (outline.length > 0) outline = applyOutlineState(outline, flattenOutlineState(oldNote?.outline || []));

        notes = notes.map(note => note.id === editingId
            ? {
                ...note,
                title,
                content,
                mode,
                checklist,
                outline,
                accent,
                pinned,
                collapsed,
                updatedAt: now
            }
            : note
        );
    } else {
        notes.push({
            id: String(Date.now()),
            title,
            content,
            mode,
            checklist,
            outline,
            accent,
            pinned,
            collapsed,
            createdAt: now,
            updatedAt: now
        });
    }

    clearDraft();
    saveNotes();
    renderNotes();
    clearForm();
});

cancelEditBtn.addEventListener('click', clearForm);
clearFormBtn.addEventListener('click', clearForm);

// Text selection & format popup
const formatPopup = document.querySelector('#notes-format-popup');
const formatInput = document.querySelector('#notes-format-input');
const formatButtons = Array.from(document.querySelectorAll('.notes-format-btn'));

let currentSelection = {
    text: '',
    start: 0,
    end: 0
};

function getSelectionByWholeLines() {
    const text = noteContentInput.value;
    const selStart = noteContentInput.selectionStart;
    const selEnd = noteContentInput.selectionEnd;

    if (selStart === selEnd) {
        return null;
    }

    // Expand selection to full lines for predictable formatting.
    let lineStart = selStart;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }

    let lineEnd = selEnd;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }

    return {
        text: text.substring(lineStart, lineEnd),
        start: lineStart,
        end: lineEnd
    };
}

function normalizeLinePrefix(line, format) {
    const indent = (line.match(/^\s*/) || [''])[0];
    const stripped = line.slice(indent.length).replace(/^(\[[ xX]\]\s*|📚\s*)/, '');

    if (!stripped.trim()) {
        return '';
    }

    if (format === 'checkbox') {
        return `${indent}[ ] ${stripped}`;
    }

    if (format === 'heading') {
        return `${indent}📚 ${stripped}`;
    }

    return `${indent}${stripped}`;
}

function updateSelectedBlock(transformLine) {
    const text = noteContentInput.value;
    const selStart = noteContentInput.selectionStart;
    const selEnd = noteContentInput.selectionEnd;

    let blockStart = selStart;
    while (blockStart > 0 && text[blockStart - 1] !== '\n') {
        blockStart--;
    }

    let blockEnd = selEnd;
    while (blockEnd < text.length && text[blockEnd] !== '\n') {
        blockEnd++;
    }

    const block = text.slice(blockStart, blockEnd);
    const updatedBlock = block.split('\n').map(transformLine).join('\n');

    noteContentInput.value = text.slice(0, blockStart) + updatedBlock + text.slice(blockEnd);
    noteContentInput.focus();
    noteContentInput.setSelectionRange(blockStart, blockStart + updatedBlock.length);
    saveDraft();
    syncPopupToSelection();
}

function applyLineFormat(format) {
    if (currentSelection.end <= currentSelection.start) {
        return;
    }

    const editedBlock = formatInput.value;
    const updatedBlock = editedBlock
        .split('\n')
        .map(line => normalizeLinePrefix(line, format))
        .join('\n');

    const before = noteContentInput.value.substring(0, currentSelection.start);
    const after = noteContentInput.value.substring(currentSelection.end);
    noteContentInput.value = before + updatedBlock + after;

    // Keep selection on updated block so user can immediately see and continue editing.
    const newEnd = currentSelection.start + updatedBlock.length;
    noteContentInput.focus();
    noteContentInput.setSelectionRange(currentSelection.start, newEnd);

    currentSelection = {
        text: updatedBlock,
        start: currentSelection.start,
        end: newEnd
    };

    formatInput.value = updatedBlock;
    saveDraft();
}

function syncPopupToSelection() {
    const selected = getSelectionByWholeLines();

    if (!selected) {
        formatPopup.classList.add('hidden');
        return;
    }

    currentSelection = {
        text: selected.text,
        start: selected.start,
        end: selected.end
    };

    formatInput.value = selected.text;
    formatPopup.classList.remove('hidden');
}

noteContentInput.addEventListener('mouseup', syncPopupToSelection);
noteContentInput.addEventListener('keyup', syncPopupToSelection);
noteContentInput.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;

    e.preventDefault();

    if (e.shiftKey) {
        updateSelectedBlock(line => line.replace(/^(\t|  )/, ''));
        return;
    }

    updateSelectedBlock(line => `  ${line}`);
});

document.addEventListener('mousedown', e => {
    if (!formatPopup.contains(e.target) && e.target !== noteContentInput) {
        formatPopup.classList.add('hidden');
    }
});

formatPopup.addEventListener('mousedown', e => {
    e.stopPropagation();
});

formatInput.addEventListener('input', () => {
    currentSelection.text = formatInput.value;
});

formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        applyLineFormat(btn.dataset.format);
    });
});

[noteTitleInput, noteContentInput, noteAccentInput, notePinnedInput, noteCollapsedDefaultInput].forEach(el => {
    el.addEventListener('input', saveDraft);
    el.addEventListener('change', saveDraft);
});

notesSearchInput.addEventListener('input', renderNotes);
notesSortInput.addEventListener('change', renderNotes);

notesExpandAllBtn.addEventListener('click', () => {
    notes = notes.map(note => ({ ...note, collapsed: false }));
    saveNotes();
    renderNotes();
});

notesCollapseAllBtn.addEventListener('click', () => {
    notes = notes.map(note => ({ ...note, collapsed: true }));
    saveNotes();
    renderNotes();
});

document.addEventListener('keydown', e => {
    const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
    if (!isSave) return;
    e.preventDefault();
    notesForm.requestSubmit();
});

restoreDraft();
renderNotes();
