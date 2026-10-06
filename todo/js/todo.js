/* ============================================================
   Todo 리스트
   ------------------------------------------------------------
   구조
   1. 상태(state)  : todos 배열(객체 목록) + 현재 필터 + 수정 중인 id
   2. 데이터 함수  : 배열을 직접 바꾸지 않고 map / filter / reduce 로
                     "새 배열"을 만들어 돌려주는 순수 함수
   3. 화면 함수    : 상태를 받아 DOM 을 그리는 함수 (render)
   4. 이벤트       : 목록·필터는 부모 요소 하나에만 리스너를 다는
                     이벤트 위임(event delegation) 방식
   흐름: 이벤트 → 상태 변경(setState) → render() 로 화면 갱신
============================================================ */

// ------------------------------------------------------------
// 1. 상태
// ------------------------------------------------------------
const state = {
  todos: [], // { id, date, subject, content, done, createdAt }
  filter: "all", // "all" | "active" | "done"
  editingId: null, // 수정 중인 할일 id (없으면 null)
};

// 필터 이름 → 조건 함수 (조회 기능)
const FILTERS = {
  all: () => true,
  active: (todo) => !todo.done,
  done: (todo) => todo.done,
};

const EMPTY_MESSAGES = {
  all: "등록된 할일이 없습니다.",
  active: "진행 중인 할일이 없습니다.",
  done: "완료한 할일이 없습니다.",
};

// ------------------------------------------------------------
// 2. 데이터 함수 (원본 배열을 바꾸지 않고 새 배열 반환)
// ------------------------------------------------------------
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

// [C] 추가
const addTodo = (todos, { date, subject, content }) => [
  { id: createId(), date, subject, content, done: false, createdAt: Date.now() },
  ...todos,
];

// [U] 수정: id 가 같은 항목만 새 값으로 교체
const updateTodo = (todos, id, changes) =>
  todos.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo));

// [U] 완료 토글
const toggleTodo = (todos, id) =>
  todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));

// [D] 삭제: id 가 다른 항목만 남김
const removeTodo = (todos, id) => todos.filter((todo) => todo.id !== id);

// [R] 조회: 필터 조건에 맞는 항목을 최신 등록순으로
const getVisibleTodos = (todos, filter) =>
  [...todos.filter(FILTERS[filter])].sort((a, b) => b.createdAt - a.createdAt);

// [R] 단건 조회
const findTodo = (todos, id) => todos.find((todo) => todo.id === id);

// 현황 통계: reduce 로 한 번에 집계
const getStats = (todos) =>
  todos.reduce(
    (stats, todo) => ({
      total: stats.total + 1,
      done: stats.done + (todo.done ? 1 : 0),
    }),
    { total: 0, done: 0 },
  );

// 입력값 정리 + 검증: 앞뒤 공백 제거 후 빈 항목 이름 목록 반환
const FIELD_LABELS = { date: "날짜", subject: "제목", content: "내용" };

const readForm = (form) =>
  Object.fromEntries(
    Object.keys(FIELD_LABELS).map((name) => [name, form.elements[name].value.trim()]),
  );

const getMissingFields = (values) =>
  Object.entries(values)
    .filter(([, value]) => value.length === 0)
    .map(([name]) => FIELD_LABELS[name]);

// ------------------------------------------------------------
// 3. 화면
// ------------------------------------------------------------
const $ = (selector) => document.querySelector(selector);

const els = {
  form: $("#todoForm"),
  formTitle: $("#formTitle"),
  formError: $("#formError"),
  submitBtn: $("#submitBtn"),
  cancelBtn: $("#cancelBtn"),
  list: $("#todoList"),
  emptyText: $("#emptyText"),
  statsText: $("#statsText"),
  filterGroup: $("#filterGroup"),
};

// 요소 생성 도우미: make("p", { className: "card-text", textContent: "..." }, ...children)
function make(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("aria-") || key === "role") el.setAttribute(key, value);
    else el[key] = value;
  });
  el.append(...children);
  return el;
}

// 할일 1개 → 카드 요소
function createCard(todo) {
  const isEditing = todo.id === state.editingId;
  const label = todo.subject;

  const checkBtn = make("button", {
    type: "button",
    className: "check-btn",
    textContent: todo.done ? "✓" : "",
    dataset: { action: "toggle" },
    "aria-pressed": String(todo.done),
    "aria-label": `${label} ${todo.done ? "완료 취소" : "완료 처리"}`,
  });

  const title = make("h3", { className: "card-title", textContent: `[${todo.date}] ${todo.subject}` });
  const text = make("p", { className: "card-text", textContent: todo.content });

  const deleteBtn = make("button", {
    type: "button",
    className: "btn flex-1 bg-red-500",
    textContent: "삭제",
    dataset: { action: "delete" },
    "aria-label": `${label} 삭제`,
  });
  const editBtn = make("button", {
    type: "button",
    className: "btn flex-1 bg-indigo-500",
    textContent: "수정",
    dataset: { action: "edit" },
    "aria-label": `${label} 수정`,
  });

  const classNames = ["card", todo.done && "done", isEditing && "editing"].filter(Boolean);

  return make(
    "li",
    { className: classNames.join(" "), dataset: { id: todo.id } },
    make("div", { className: "mb-2 flex items-center gap-2" }, checkBtn, title),
    text,
    make("div", { className: "flex gap-1" }, deleteBtn, editBtn),
  );
}

function renderList() {
  const visible = getVisibleTodos(state.todos, state.filter);

  // 카드를 한 번에 교체 → 리플로우 1회
  els.list.replaceChildren(...visible.map(createCard));

  els.emptyText.hidden = visible.length > 0;
  els.emptyText.textContent = EMPTY_MESSAGES[state.filter];
}

function renderStats() {
  const { total, done } = getStats(state.todos);
  const percent = total === 0 ? 0 : Math.floor((done / total) * 100);

  els.statsText.textContent =
    total === 0 ? "" : `전체 ${total}개 · 진행 중 ${total - done}개 · 완료 ${done}개 (${percent}%)`;
}

function renderFilters() {
  [...els.filterGroup.querySelectorAll("[data-filter]")].forEach((btn) => {
    const isActive = btn.dataset.filter === state.filter;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function renderForm() {
  const isEditing = state.editingId !== null;
  els.form.classList.toggle("edit-mode", isEditing);
  els.formTitle.textContent = isEditing ? "할일 수정" : "할일 등록";
  els.submitBtn.textContent = isEditing ? "수정 완료" : "등록하기";
}

function render() {
  renderList();
  renderStats();
  renderFilters();
  renderForm();
}

// 상태 변경은 모두 이 함수를 거쳐서 → 항상 화면과 데이터가 일치
function setState(changes) {
  Object.assign(state, changes);
  render();
}

// ------------------------------------------------------------
// 폼 도우미
// ------------------------------------------------------------
function fillForm({ date = "", subject = "", content = "" } = {}) {
  els.form.elements.date.value = date;
  els.form.elements.subject.value = subject;
  els.form.elements.content.value = content;
}

function showError(message) {
  els.formError.textContent = message;
}

function startEdit(id) {
  const todo = findTodo(state.todos, id);
  if (!todo) return;

  fillForm(todo);
  showError("");
  setState({ editingId: id });
  els.form.elements.subject.focus();
}

function endEdit() {
  fillForm();
  showError("");
  setState({ editingId: null });
}

// ------------------------------------------------------------
// 4. 이벤트
// ------------------------------------------------------------

// 등록 / 수정 완료
function handleSubmit(event) {
  event.preventDefault();

  const values = readForm(els.form);
  const missing = getMissingFields(values);

  if (missing.length > 0) {
    showError(`${missing.join(", ")} 항목을 입력해주세요.`);
    const firstEmpty = Object.keys(values).find((name) => values[name] === "");
    els.form.elements[firstEmpty].focus();
    return;
  }

  if (state.editingId !== null) {
    state.todos = updateTodo(state.todos, state.editingId, values);
    endEdit();
    return;
  }

  // 새 할일이 진행 중 목록에 보이도록, 완료 필터에서 등록하면 전체로 전환
  const filter = state.filter === "done" ? "all" : state.filter;
  fillForm();
  showError("");
  setState({ todos: addTodo(state.todos, values), filter });
}

// 목록 클릭 → 이벤트 위임: 카드마다 리스너를 달지 않고 <ul> 하나에서 처리
const LIST_ACTIONS = {
  toggle: (id) => setState({ todos: toggleTodo(state.todos, id) }),
  edit: (id) => startEdit(id),
  delete: (id) => {
    // 수정 중이던 할일을 지우면 수정 모드도 함께 종료
    if (state.editingId === id) {
      fillForm();
      showError("");
    }
    setState({
      todos: removeTodo(state.todos, id),
      editingId: state.editingId === id ? null : state.editingId,
    });
  },
};

function handleListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || !els.list.contains(button)) return;

  const { id } = button.closest("[data-id]").dataset;
  LIST_ACTIONS[button.dataset.action]?.(id);
}

// 필터 클릭 → 이벤트 위임
function handleFilterClick(event) {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  setState({ filter: button.dataset.filter });
}

// Esc 로 수정 취소
function handleKeydown(event) {
  if (event.key === "Escape" && state.editingId !== null) endEdit();
}

function init() {
  els.form.addEventListener("submit", handleSubmit);
  els.cancelBtn.addEventListener("click", endEdit);
  els.list.addEventListener("click", handleListClick);
  els.filterGroup.addEventListener("click", handleFilterClick);
  document.addEventListener("keydown", handleKeydown);
  render();
}

init();
