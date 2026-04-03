// routes/lists.js
const express = require("express");
const { lists, todos } = require("../data/store");
const authMiddleware = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

function serializeListsForUser(userId) {
  return lists
    .filter(list => list.creatorId === userId)
    .map(list => ({
      ...list,
      todoCount: todos.filter(todo => todo.listId === list.id).length,
      completedCount: todos.filter(
        todo => todo.listId === list.id && todo.completed
      ).length,
      todos: todos.filter(todo => todo.listId === list.id),
    }));
}

// GET /lists (any logged-in user)
router.get("/", authMiddleware, (req, res) => {
  res.json(serializeListsForUser(req.user.userId));
});

// POST /lists (create list)
router.post("/", authMiddleware, (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "List name is required" });
  }

  const list = {
    id: uuidv4(),
    name: name.trim(),
    creatorId: req.user.userId,
  };

  lists.push(list);
  res.status(201).json(list);
});

// PATCH /lists/:id (only owner)
router.patch("/:id", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    list.name = req.body.name.trim();
  }

  res.json(list);
});

// DELETE /lists/:id (only owner)
router.delete("/:id", authMiddleware, (req, res) => {
  const listIndex = lists.findIndex(l => l.id === req.params.id);
  if (listIndex === -1) return res.status(404).json({ error: "List not found" });

  const list = lists[listIndex];
  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  lists.splice(listIndex, 1);

  for (let index = todos.length - 1; index >= 0; index -= 1) {
    if (todos[index].listId === req.params.id) {
      todos.splice(index, 1);
    }
  }

  res.status(204).send();
});

// POST /lists/:id/todos (only owner)
router.post("/:id/todos", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!req.body.task || !req.body.task.trim()) {
    return res.status(400).json({ error: "Task is required" });
  }

  const todo = {
    id: uuidv4(),
    task: req.body.task.trim(),
    completed: false,
    listId: list.id,
  };

  todos.push(todo);

  res.status(201).json(todo);
});

// PATCH /lists/:id/todos/:todoId (only owner)
router.patch("/:id/todos/:todoId", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const todo = todos.find(
    item => item.id === req.params.todoId && item.listId === list.id
  );

  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  if (typeof req.body.task === "string" && req.body.task.trim()) {
    todo.task = req.body.task.trim();
  }

  if (typeof req.body.completed === "boolean") {
    todo.completed = req.body.completed;
  }

  res.json(todo);
});

// DELETE /lists/:id/todos/:todoId (only owner)
router.delete("/:id/todos/:todoId", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const todoIndex = todos.findIndex(
    item => item.id === req.params.todoId && item.listId === list.id
  );

  if (todoIndex === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  todos.splice(todoIndex, 1);
  res.status(204).send();
});

module.exports = router;
