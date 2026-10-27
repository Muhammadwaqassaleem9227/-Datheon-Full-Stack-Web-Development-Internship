/**
 * ============================================================================
 * TaskFlow — Dynamic Task Manager & Productivity Tracker
 * Core Application Logic (Vanilla JavaScript ES6+)
 * ============================================================================
 */

'use strict';

// ----------------------------------------------------------------------------
// 1. Constants & Application State
// ----------------------------------------------------------------------------
const STORAGE_KEY = 'taskflow_tasks';
const THEME_KEY = 'taskflow_theme';

/**
 * Global State
 * @type {Array<{id: string, title: string, category: string, dueDate: string, completed: boolean, createdAt: string}>}
 */
let tasks = [];

// Filter & Search State
let currentStatusFilter = 'all'; // 'all' | 'active' | 'completed'
let currentCategoryFilter = 'all'; // 'all' | 'Work' | 'Personal' | 'Study' | 'Other'
let searchQuery = '';

// Modal Context
let taskToEdit = null;
let taskToDelete = null;

// Drag and drop state
let draggedTaskId = null;

// ----------------------------------------------------------------------------
// 2. DOM Elements Cache
// ----------------------------------------------------------------------------
const elements = {
  // Theme Toggle
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeIconMoon: document.getElementById('themeIconMoon'),

  // Summary Counters
  statTotal: document.getElementById('statTotal'),
  statActive: document.getElementById('statActive'),
  statCompleted: document.getElementById('statCompleted'),
  statOverdue: document.getElementById('statOverdue'),

  // Creation Form
  createTaskForm: document.getElementById('createTaskForm'),
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskCategorySelect: document.getElementById('taskCategorySelect'),
  taskDueDateInput: document.getElementById('taskDueDateInput'),
  createTitleError: document.getElementById('createTitleError'),

  // Search & Filters
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  countFilterAll: document.getElementById('countFilterAll'),
  countFilterActive: document.getElementById('countFilterActive'),
  countFilterCompleted: document.getElementById('countFilterCompleted'),
  categoryFilterSelect: document.getElementById('categoryFilterSelect'),
  reorderInfoBadge: document.getElementById('reorderInfoBadge'),
  reorderInfoText: document.getElementById('reorderInfoText'),

  // Task List & Empty State
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateText: document.getElementById('emptyStateText'),

  // Edit Modal
  editModal: document.getElementById('editModal'),
  closeEditModalBtn: document.getElementById('closeEditModalBtn'),
  editTaskForm: document.getElementById('editTaskForm'),
  editTaskId: document.getElementById('editTaskId'),
  editTaskTitleInput: document.getElementById('editTaskTitleInput'),
  editTaskCategorySelect: document.getElementById('editTaskCategorySelect'),
  editTaskDueDateInput: document.getElementById('editTaskDueDateInput'),
  editTitleError: document.getElementById('editTitleError'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),

  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  deleteTaskTitleSpan: document.getElementById('deleteTaskTitleSpan'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer'),
};

// ----------------------------------------------------------------------------
// 3. Storage Functions (localStorage Persistence)
// ----------------------------------------------------------------------------

/**
 * Saves tasks to browser localStorage with error handling.
 */
function saveToLocalStorage() {
  try {
    const serialized = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('TaskFlow Error: Failed to save to localStorage:', error);
    showToast('Failed to save tasks to local storage. Storage might be full.', 'danger');
  }
}

/**
 * Loads and validates tasks from browser localStorage.
 * Ensures corrupt or invalid JSON is handled safely without crashing.
 * @returns {Array} parsed tasks array or empty array
 */
function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }

    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      console.warn('TaskFlow Warning: Stored data is not an array. Resetting.');
      return [];
    }

    // Validate and sanitize each item
    return parsed.filter(item => {
      return item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.completed === 'boolean';
    });
  } catch (error) {
    console.error('TaskFlow Error: Error parsing localStorage data:', error);
    showToast('Existing task data was corrupted. Initialized clean state.', 'warning');
    return [];
  }
}

// ----------------------------------------------------------------------------
// 4. Date Utilities & Overdue Calculation
// ----------------------------------------------------------------------------

/**
 * Returns today's local date formatted as YYYY-MM-DD.
 * Ensures consistent comparison with HTML date picker values.
 * @returns {string} e.g. "2026-10-27"
 */
function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines whether a task is overdue.
 * A task is overdue ONLY if it is NOT completed, has a valid due date,
 * and the due date is strictly before today's local date.
 * @param {Object} task
 * @returns {boolean}
 */
function isTaskOverdue(task) {
  if (task.completed || !task.dueDate) {
    return false;
  }
  const today = getTodayLocalDateString();
  return task.dueDate < today;
}

/**
 * Formats a YYYY-MM-DD date string into a user-friendly label.
 * (e.g. "Today", "Tomorrow", "Yesterday", or "Oct 28, 2026")
 * @param {string} dateStr
 * @returns {string}
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';

  const today = getTodayLocalDateString();
  if (dateStr === today) return 'Today';

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  // Check Yesterday & Tomorrow
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  if (dateStr === tomorrowStr) return 'Tomorrow';

  // Standard readable date
  return targetDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

// ----------------------------------------------------------------------------
// 5. Statistics Calculation
// ----------------------------------------------------------------------------

/**
 * Computes metrics and updates summary cards.
 * Ensures the relationship: Total = Active + Completed
 */
function updateStatistics() {
  const total = tasks.length;
  let active = 0;
  let completed = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.completed) {
      completed++;
    } else {
      active++;
      if (isTaskOverdue(task)) {
        overdue++;
      }
    }
  }

  // Update Summary Header Cards
  elements.statTotal.textContent = String(total);
  elements.statActive.textContent = String(active);
  elements.statCompleted.textContent = String(completed);
  elements.statOverdue.textContent = String(overdue);

  // Update Toolbar Filter Counts
  elements.countFilterAll.textContent = String(total);
  elements.countFilterActive.textContent = String(active);
  elements.countFilterCompleted.textContent = String(completed);
}

// ----------------------------------------------------------------------------
// 6. Task Rendering (Safe DOM Construction)
// ----------------------------------------------------------------------------

/**
 * Returns filtered and searched tasks based on user selections.
 * @returns {Array}
 */
function getFilteredTasks() {
  return tasks.filter(task => {
    // 1. Status Filter
    if (currentStatusFilter === 'active' && task.completed) return false;
    if (currentStatusFilter === 'completed' && !task.completed) return false;

    // 2. Category Filter
    if (currentCategoryFilter !== 'all' && task.category !== currentCategoryFilter) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim() !== '') {
      const match = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Returns the CSS class and icon for a given category.
 * @param {string} category
 * @returns {{className: string, icon: string}}
 */
function getCategoryMeta(category) {
  switch (category) {
    case 'Work':
      return { className: 'badge-cat-work', icon: '💼' };
    case 'Personal':
      return { className: 'badge-cat-personal', icon: '🏡' };
    case 'Study':
      return { className: 'badge-cat-study', icon: '📚' };
    default:
      return { className: 'badge-cat-other', icon: '✨' };
  }
}

/**
 * Renders a single task list item element safely.
 * @param {Object} task
 * @param {boolean} isReorderAllowed
 * @returns {HTMLLIElement}
 */
function createTaskListItem(task, isReorderAllowed) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'is-completed' : ''}`;
  li.setAttribute('data-id', task.id);
  li.setAttribute('draggable', isReorderAllowed ? 'true' : 'false');

  // Drag Handle (only visible & active when reordering is possible)
  if (isReorderAllowed) {
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.setAttribute('aria-label', 'Drag to reorder task');
    dragHandle.title = 'Drag to reorder';
    dragHandle.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="6" r="1"></circle>
        <circle cx="15" cy="6" r="1"></circle>
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="9" cy="18" r="1"></circle>
        <circle cx="15" cy="18" r="1"></circle>
      </svg>
    `;
    li.appendChild(dragHandle);
  }

  // Completion Checkbox Container
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'task-checkbox-label';
  checkboxLabel.setAttribute('title', task.completed ? 'Mark as active' : 'Mark as completed');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'active' : 'completed'}`);
  checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

  checkboxLabel.appendChild(checkbox);
  li.appendChild(checkboxLabel);

  // Content Container
  const content = document.createElement('div');
  content.className = 'task-content';

  // Title Row
  const headerRow = document.createElement('div');
  headerRow.className = 'task-header-row';

  const titleEl = document.createElement('h4');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title; // Safe textContent avoids XSS
  headerRow.appendChild(titleEl);

  content.appendChild(headerRow);

  // Meta Row (Badges: Category, Due Date, Overdue, Status)
  const metaRow = document.createElement('div');
  metaRow.className = 'task-meta';

  // Category Badge
  const catMeta = getCategoryMeta(task.category);
  const catBadge = document.createElement('span');
  catBadge.className = `badge-category ${catMeta.className}`;
  catBadge.textContent = `${catMeta.icon} ${task.category}`;
  metaRow.appendChild(catBadge);

  // Due Date & Overdue Badge
  if (task.dueDate) {
    const isOverdue = isTaskOverdue(task);
    const dateLabel = formatDisplayDate(task.dueDate);

    if (isOverdue) {
      const overdueBadge = document.createElement('span');
      overdueBadge.className = 'badge-overdue';
      overdueBadge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Overdue (${dateLabel})</span>
      `;
      metaRow.appendChild(overdueBadge);
    } else {
      const dateBadge = document.createElement('span');
      dateBadge.className = 'badge-due-date';
      dateBadge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>${dateLabel}</span>
      `;
      metaRow.appendChild(dateBadge);
    }
  }

  // Status Badge
  const statusBadge = document.createElement('span');
  statusBadge.className = `badge-status ${task.completed ? 'badge-status-completed' : 'badge-status-active'}`;
  statusBadge.textContent = task.completed ? 'Completed' : 'Active';
  metaRow.appendChild(statusBadge);

  content.appendChild(metaRow);
  li.appendChild(content);

  // Action Buttons (Edit & Delete)
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'task-actions';

  // Edit Button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'action-btn btn-edit';
  editBtn.setAttribute('aria-label', `Edit task "${task.title}"`);
  editBtn.title = 'Edit task';
  editBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
  editBtn.addEventListener('click', () => openEditModal(task));
  actionsContainer.appendChild(editBtn);

  // Delete Button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'action-btn btn-delete';
  deleteBtn.setAttribute('aria-label', `Delete task "${task.title}"`);
  deleteBtn.title = 'Delete task';
  deleteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `;
  deleteBtn.addEventListener('click', () => openDeleteModal(task));
  actionsContainer.appendChild(deleteBtn);

  li.appendChild(actionsContainer);

  // Attach HTML5 Drag-and-Drop Event Listeners if reordering is allowed
  if (isReorderAllowed) {
    attachDragAndDropEvents(li, task.id);
  }

  return li;
}

/**
 * Main render function. Refreshes the task list, empty states, and drag notice.
 */
function renderTaskList() {
  const filtered = getFilteredTasks();
  const isReorderAllowed = currentStatusFilter === 'all' &&
    currentCategoryFilter === 'all' &&
    searchQuery.trim() === '';

  // Update Reorder Notification Badge
  if (isReorderAllowed) {
    elements.reorderInfoBadge.classList.remove('is-disabled');
    elements.reorderInfoText.textContent = 'Drag & drop to reorder tasks';
  } else {
    elements.reorderInfoBadge.classList.add('is-disabled');
    elements.reorderInfoText.textContent = 'Reordering disabled in filtered/search view';
  }

  // Clear existing items
  elements.taskList.innerHTML = '';

  if (filtered.length === 0) {
    elements.taskList.classList.add('is-hidden');
    elements.emptyState.classList.remove('is-hidden');

    // Customize Empty State Message dynamically
    if (tasks.length === 0) {
      elements.emptyStateTitle.textContent = 'No tasks yet';
      elements.emptyStateText.textContent = 'Create your first task from the left sidebar to boost your productivity.';
    } else if (searchQuery.trim() !== '') {
      elements.emptyStateTitle.textContent = 'No matching tasks';
      elements.emptyStateText.textContent = `No tasks matched "${searchQuery}". Try a different keyword or clear your search.`;
    } else if (currentStatusFilter === 'active') {
      elements.emptyStateTitle.textContent = 'No active tasks';
      elements.emptyStateText.textContent = 'All caught up! Excellent work maintaining your productivity.';
    } else if (currentStatusFilter === 'completed') {
      elements.emptyStateTitle.textContent = 'No completed tasks';
      elements.emptyStateText.textContent = 'Complete tasks using the checkboxes to track your accomplishments.';
    } else if (currentCategoryFilter !== 'all') {
      elements.emptyStateTitle.textContent = `No ${currentCategoryFilter} tasks`;
      elements.emptyStateText.textContent = `You have no tasks under the "${currentCategoryFilter}" category.`;
    }
  } else {
    elements.taskList.classList.remove('is-hidden');
    elements.emptyState.classList.add('is-hidden');

    const fragment = document.createDocumentFragment();
    filtered.forEach(task => {
      fragment.appendChild(createTaskListItem(task, isReorderAllowed));
    });
    elements.taskList.appendChild(fragment);
  }

  updateStatistics();
}

// ----------------------------------------------------------------------------
// 7. Drag-and-Drop Reordering (HTML5 Native Drag API)
// ----------------------------------------------------------------------------

/**
 * Attaches drag event listeners to an individual task item.
 * @param {HTMLElement} itemEl
 * @param {string} taskId
 */
function attachDragAndDropEvents(itemEl, taskId) {
  itemEl.addEventListener('dragstart', (e) => {
    draggedTaskId = taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    itemEl.classList.add('is-dragging');
  });

  itemEl.addEventListener('dragend', () => {
    draggedTaskId = null;
    itemEl.classList.remove('is-dragging');
    clearAllDragOverIndicators();
  });

  itemEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedTaskId || draggedTaskId === taskId) return;

    const rect = itemEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      itemEl.classList.add('drag-over-top');
      itemEl.classList.remove('drag-over-bottom');
    } else {
      itemEl.classList.add('drag-over-bottom');
      itemEl.classList.remove('drag-over-top');
    }
  });

  itemEl.addEventListener('dragleave', () => {
    itemEl.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  itemEl.addEventListener('drop', (e) => {
    e.preventDefault();
    clearAllDragOverIndicators();

    if (!draggedTaskId || draggedTaskId === taskId) return;

    const sourceIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === taskId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const rect = itemEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropBefore = e.clientY < midY;

    // Remove item from source
    const [movedTask] = tasks.splice(sourceIndex, 1);

    // Calculate new insertion index
    let newIndex = tasks.findIndex(t => t.id === taskId);
    if (!dropBefore) {
      newIndex += 1;
    }

    tasks.splice(newIndex, 0, movedTask);

    saveToLocalStorage();
    renderTaskList();
    showToast('Task order updated', 'info');
  });
}

function clearAllDragOverIndicators() {
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });
}

// ----------------------------------------------------------------------------
// 8. CRUD Operations
// ----------------------------------------------------------------------------

/**
 * Creates a unique identifier.
 * Uses crypto.randomUUID when available, with fallback.
 * @returns {string}
 */
function generateTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `task_${crypto.randomUUID()}`;
  }
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a new task and updates the state.
 * @param {string} rawTitle
 * @param {string} category
 * @param {string} dueDate
 */
function handleCreateTask(rawTitle, category, dueDate) {
  const title = rawTitle.trim();

  // Validate
  if (!title) {
    elements.createTitleError.textContent = 'Please enter a task title.';
    elements.taskTitleInput.focus();
    return false;
  }

  elements.createTitleError.textContent = '';

  const newTask = {
    id: generateTaskId(),
    title: title,
    category: category || 'Work',
    dueDate: dueDate || '',
    completed: false,
    createdAt: new Date().toISOString()
  };

  // Add new tasks to the beginning of the list
  tasks.unshift(newTask);
  saveToLocalStorage();
  renderTaskList();

  // Reset form
  elements.createTaskForm.reset();
  elements.taskCategorySelect.value = 'Work';

  showToast('Task created successfully!', 'success');
  return true;
}

/**
 * Toggles task completed status.
 * @param {string} taskId
 */
function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveToLocalStorage();
  renderTaskList();

  if (task.completed) {
    showToast(`"${task.title}" completed! 🎉`, 'success');
  } else {
    showToast(`"${task.title}" marked as active.`, 'info');
  }
}

/**
 * Opens the Edit Modal and pre-populates values.
 * @param {Object} task
 */
function openEditModal(task) {
  taskToEdit = task;
  elements.editTaskId.value = task.id;
  elements.editTaskTitleInput.value = task.title;
  elements.editTaskCategorySelect.value = task.category;
  elements.editTaskDueDateInput.value = task.dueDate || '';
  elements.editTitleError.textContent = '';

  elements.editModal.classList.remove('is-hidden');
  elements.editTaskTitleInput.focus();
}

/**
 * Closes the Edit Modal safely without modifying anything.
 */
function closeEditModal() {
  taskToEdit = null;
  elements.editModal.classList.add('is-hidden');
  elements.editTaskForm.reset();
  elements.editTitleError.textContent = '';
}

/**
 * Handles updating an existing task.
 */
function handleSaveTaskEdit() {
  if (!taskToEdit) return;

  const updatedTitle = elements.editTaskTitleInput.value.trim();

  if (!updatedTitle) {
    elements.editTitleError.textContent = 'Task title cannot be empty.';
    elements.editTaskTitleInput.focus();
    return;
  }

  // Find target task
  const taskIndex = tasks.findIndex(t => t.id === taskToEdit.id);
  if (taskIndex === -1) {
    showToast('Task not found.', 'danger');
    closeEditModal();
    return;
  }

  // Update while preserving ID, completed status, and creation date
  tasks[taskIndex].title = updatedTitle;
  tasks[taskIndex].category = elements.editTaskCategorySelect.value;
  tasks[taskIndex].dueDate = elements.editTaskDueDateInput.value || '';

  saveToLocalStorage();
  closeEditModal();
  renderTaskList();
  showToast('Task updated successfully!', 'success');
}

/**
 * Opens Delete Confirmation Modal.
 * @param {Object} task
 */
function openDeleteModal(task) {
  taskToDelete = task;
  elements.deleteTaskTitleSpan.textContent = `"${task.title}"`;
  elements.deleteModal.classList.remove('is-hidden');
  elements.confirmDeleteBtn.focus();
}

/**
 * Closes Delete Modal safely.
 */
function closeDeleteModal() {
  taskToDelete = null;
  elements.deleteModal.classList.add('is-hidden');
}

/**
 * Permanently deletes the selected task.
 */
function handleConfirmDelete() {
  if (!taskToDelete) return;

  const targetId = taskToDelete.id;
  const targetTitle = taskToDelete.title;

  tasks = tasks.filter(t => t.id !== targetId);
  saveToLocalStorage();
  closeDeleteModal();
  renderTaskList();
  showToast(`"${targetTitle}" deleted.`, 'danger');
}

// ----------------------------------------------------------------------------
// 9. Toast Notification System
// ----------------------------------------------------------------------------

/**
 * Displays a lightweight toast notification.
 * @param {string} message
 * @param {'success'|'danger'|'info'|'warning'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  // Auto remove after timeout
  setTimeout(() => {
    toast.classList.add('is-hiding');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }, duration);
}

// ----------------------------------------------------------------------------
// 10. Theme Preference (Light / Dark Mode)
// ----------------------------------------------------------------------------

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    elements.themeIconSun.classList.add('is-hidden');
    elements.themeIconMoon.classList.remove('is-hidden');
  } else {
    document.documentElement.removeAttribute('data-theme');
    elements.themeIconSun.classList.remove('is-hidden');
    elements.themeIconMoon.classList.add('is-hidden');
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
}

// ----------------------------------------------------------------------------
// 11. Event Listeners Setup
// ----------------------------------------------------------------------------

function setupEventListeners() {
  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Create Task Form Submit
  elements.createTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCreateTask(
      elements.taskTitleInput.value,
      elements.taskCategorySelect.value,
      elements.taskDueDateInput.value
    );
  });

  // Clear Title Validation on Input
  elements.taskTitleInput.addEventListener('input', () => {
    if (elements.taskTitleInput.value.trim().length > 0) {
      elements.createTitleError.textContent = '';
    }
  });

  // Filter Buttons
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentStatusFilter = btn.getAttribute('data-filter');
      renderTaskList();
    });
  });

  // Category Filter Select
  elements.categoryFilterSelect.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    renderTaskList();
  });

  // Search Input with Debounce / Instant Response
  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.trim().length > 0) {
      elements.clearSearchBtn.classList.remove('is-hidden');
    } else {
      elements.clearSearchBtn.classList.add('is-hidden');
    }
    renderTaskList();
  });

  // Clear Search Button
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    searchQuery = '';
    elements.clearSearchBtn.classList.add('is-hidden');
    elements.searchInput.focus();
    renderTaskList();
  });

  // Edit Modal Events
  elements.closeEditModalBtn.addEventListener('click', closeEditModal);
  elements.cancelEditBtn.addEventListener('click', closeEditModal);
  elements.editTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveTaskEdit();
  });
  elements.editTaskTitleInput.addEventListener('input', () => {
    if (elements.editTaskTitleInput.value.trim().length > 0) {
      elements.editTitleError.textContent = '';
    }
  });

  // Delete Modal Events
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Close modals on Backdrop Click
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) {
      closeEditModal();
    }
  });

  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) {
      closeDeleteModal();
    }
  });

  // Keyboard accessibility: Escape key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!elements.editModal.classList.contains('is-hidden')) {
        closeEditModal();
      }
      if (!elements.deleteModal.classList.contains('is-hidden')) {
        closeDeleteModal();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 12. Application Initialization
// ----------------------------------------------------------------------------

function initializeApp() {
  initializeTheme();
  setupEventListeners();

  // Load persisted tasks
  tasks = loadFromLocalStorage();

  // Initial render
  renderTaskList();
}

// Start application once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
