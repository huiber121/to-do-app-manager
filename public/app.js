const state = {
  authMode: "login",
  token: localStorage.getItem("todoManagerToken") || "",
  user: JSON.parse(localStorage.getItem("todoManagerUser") || "null"),
  lists: [],
  activeListId: null,
};

const elements = {
  authPanel: document.getElementById("auth-panel"),
  authForm: document.getElementById("auth-form"),
  authSubmit: document.getElementById("auth-submit"),
  authTabs: document.querySelectorAll(".auth-tab"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  welcomeTitle: document.getElementById("welcome-title"),
  sessionPill: document.getElementById("session-pill"),
  logoutButton: document.getElementById("logout-button"),
  messageBanner: document.getElementById("message-banner"),
  listForm: document.getElementById("list-form"),
  listName: document.getElementById("list-name"),
  listsContainer: document.getElementById("lists-container"),
  emptyState: document.getElementById("empty-state"),
  detailContent: document.getElementById("detail-content"),
  activeListName: document.getElementById("active-list-name"),
  deleteListButton: document.getElementById("delete-list-button"),
  todoForm: document.getElementById("todo-form"),
  todoTask: document.getElementById("todo-task"),
  todoItems: document.getElementById("todo-items"),
  heroTotalLists: document.getElementById("hero-total-lists"),
  heroTotalTasks: document.getElementById("hero-total-tasks"),
  heroCompletedTasks: document.getElementById("hero-completed-tasks"),
};

function setMessage(message, isError = false) {
  elements.messageBanner.textContent = message;
  elements.messageBanner.style.background = isError
    ? "linear-gradient(135deg, rgba(157, 47, 32, 0.16), rgba(255, 255, 255, 0.84))"
    : "linear-gradient(135deg, rgba(47, 127, 115, 0.14), rgba(255, 255, 255, 0.8))";
}

async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

function persistSession() {
  localStorage.setItem("todoManagerToken", state.token);
  localStorage.setItem("todoManagerUser", JSON.stringify(state.user));
}

function clearSession() {
  state.token = "";
  state.user = null;
  state.lists = [];
  state.activeListId = null;
  localStorage.removeItem("todoManagerToken");
  localStorage.removeItem("todoManagerUser");
}

function getActiveList() {
  return state.lists.find(list => list.id === state.activeListId) || null;
}

function renderSummary() {
  const totalTasks = state.lists.reduce((sum, list) => sum + list.todos.length, 0);
  const completedTasks = state.lists.reduce(
    (sum, list) => sum + list.todos.filter(todo => todo.completed).length,
    0
  );

  elements.heroTotalLists.textContent = String(state.lists.length);
  elements.heroTotalTasks.textContent = String(totalTasks);
  elements.heroCompletedTasks.textContent = String(completedTasks);
}

function renderLists() {
  if (!state.lists.length) {
    elements.listsContainer.innerHTML =
      '<div class="empty-message">No lists yet. Create one to start shaping your day.</div>';
    return;
  }

  elements.listsContainer.innerHTML = state.lists
    .map(list => {
      const progress = list.todoCount
        ? `${list.completedCount}/${list.todoCount} done`
        : "No tasks yet";

      return `
        <button class="list-card ${list.id === state.activeListId ? "active" : ""}" type="button" data-list-id="${list.id}">
          <div class="list-card__top">
            <h3 class="list-card__title">${escapeHtml(list.name)}</h3>
            <span class="pill">${list.todoCount}</span>
          </div>
          <div class="list-card__meta">${escapeHtml(progress)}</div>
        </button>
      `;
    })
    .join("");

  elements.listsContainer.querySelectorAll("[data-list-id]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeListId = button.dataset.listId;
      render();
    });
  });
}

function renderTodos() {
  const activeList = getActiveList();

  if (!activeList) {
    elements.emptyState.classList.remove("hidden");
    elements.detailContent.classList.add("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.detailContent.classList.remove("hidden");
  elements.activeListName.textContent = activeList.name;

  if (!activeList.todos.length) {
    elements.todoItems.innerHTML =
      '<div class="empty-message">This list is ready for its first task.</div>';
    return;
  }

  elements.todoItems.innerHTML = activeList.todos
    .map(
      todo => `
        <article class="todo-card ${todo.completed ? "completed" : ""}">
          <div class="todo-card__main">
            <label>
              <input type="checkbox" data-toggle-id="${todo.id}" ${todo.completed ? "checked" : ""} />
              <span class="todo-text">${escapeHtml(todo.task)}</span>
            </label>
            <button class="text-button" type="button" data-delete-id="${todo.id}">Remove</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.todoItems.querySelectorAll("[data-toggle-id]").forEach(input => {
    input.addEventListener("change", async () => {
      await updateTodo(input.dataset.toggleId, { completed: input.checked });
    });
  });

  elements.todoItems.querySelectorAll("[data-delete-id]").forEach(button => {
    button.addEventListener("click", async () => {
      await deleteTodo(button.dataset.deleteId);
    });
  });
}

function renderSession() {
  const loggedIn = Boolean(state.token && state.user);
  elements.authPanel.classList.toggle("hidden", loggedIn);
  elements.logoutButton.classList.toggle("hidden", !loggedIn);
  elements.listForm.classList.toggle("hidden", !loggedIn);
  elements.todoForm.classList.toggle("hidden", !loggedIn || !getActiveList());
  elements.deleteListButton.classList.toggle("hidden", !loggedIn || !getActiveList());

  elements.welcomeTitle.textContent = loggedIn
    ? `${state.user.username}'s planning board`
    : "Your planning board";
  elements.sessionPill.textContent = loggedIn ? "Signed in" : "Guest mode";
}

function render() {
  renderSession();
  renderSummary();
  renderLists();
  renderTodos();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadLists() {
  if (!state.token) {
    state.lists = [];
    state.activeListId = null;
    render();
    return;
  }

  try {
    const lists = await apiFetch("/lists");
    state.lists = lists;

    if (!state.activeListId || !state.lists.some(list => list.id === state.activeListId)) {
      state.activeListId = state.lists[0]?.id || null;
    }

    render();
  } catch (error) {
    clearSession();
    setMessage(error.message, true);
    render();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const username = elements.username.value.trim();
  const password = elements.password.value.trim();

  try {
    if (state.authMode === "signup") {
      await apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setMessage("Account created. You can sign in right away.");
      state.authMode = "login";
      syncAuthMode();
      elements.password.value = "";
      return;
    }

    const result = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    state.token = result.accessToken;
    state.user = result.user;
    persistSession();
    setMessage(`Welcome back, ${result.user.username}.`);
    elements.authForm.reset();
    await loadLists();
  } catch (error) {
    setMessage(error.message, true);
  }
}

function syncAuthMode() {
  elements.authTabs.forEach(button => {
    button.classList.toggle("active", button.dataset.authMode === state.authMode);
  });

  elements.authSubmit.textContent = state.authMode === "login" ? "Login" : "Create account";
  elements.password.autocomplete =
    state.authMode === "login" ? "current-password" : "new-password";
}

async function createList(event) {
  event.preventDefault();

  try {
    const list = await apiFetch("/lists", {
      method: "POST",
      body: JSON.stringify({ name: elements.listName.value }),
    });

    elements.listForm.reset();
    setMessage(`List "${list.name}" is ready.`);
    await loadLists();
    state.activeListId = list.id;
    render();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function createTodo(event) {
  event.preventDefault();

  const activeList = getActiveList();
  if (!activeList) {
    return;
  }

  try {
    await apiFetch(`/lists/${activeList.id}/todos`, {
      method: "POST",
      body: JSON.stringify({ task: elements.todoTask.value }),
    });

    elements.todoForm.reset();
    setMessage("Task added to the active list.");
    await loadLists();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function updateTodo(todoId, payload) {
  const activeList = getActiveList();
  if (!activeList) {
    return;
  }

  try {
    await apiFetch(`/lists/${activeList.id}/todos/${todoId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    await loadLists();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function deleteTodo(todoId) {
  const activeList = getActiveList();
  if (!activeList) {
    return;
  }

  try {
    await apiFetch(`/lists/${activeList.id}/todos/${todoId}`, {
      method: "DELETE",
    });

    setMessage("Task removed.");
    await loadLists();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function deleteList() {
  const activeList = getActiveList();
  if (!activeList) {
    return;
  }

  try {
    await apiFetch(`/lists/${activeList.id}`, {
      method: "DELETE",
    });

    setMessage(`List "${activeList.name}" removed.`);
    await loadLists();
  } catch (error) {
    setMessage(error.message, true);
  }
}

function logout() {
  clearSession();
  elements.authForm.reset();
  setMessage("Signed out. Your session has been cleared.");
  render();
}

elements.authTabs.forEach(button => {
  button.addEventListener("click", () => {
    state.authMode = button.dataset.authMode;
    syncAuthMode();
  });
});

elements.authForm.addEventListener("submit", handleAuthSubmit);
elements.listForm.addEventListener("submit", createList);
elements.todoForm.addEventListener("submit", createTodo);
elements.logoutButton.addEventListener("click", logout);
elements.deleteListButton.addEventListener("click", deleteList);

syncAuthMode();
render();
loadLists();
