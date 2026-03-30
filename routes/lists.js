// routes/lists.js
const express = require("express");
const { lists, todos } = require("../data/store");
const authMiddleware = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// GET /lists (any logged-in user)
router.get("/", authMiddleware, (req, res) => {
  res.json(lists);
});

// POST /lists (create list)
router.post("/", authMiddleware, (req, res) => {
  const { name } = req.body;

  const list = {
    id: uuidv4(),
    name,
    creatorId: req.user.userId,
  };

  lists.push(list);
  res.json(list);
});

// PATCH /lists/:id (only owner)
router.patch("/:id", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  list.name = req.body.name || list.name;

  res.json(list);
});

// POST /lists/:id/todos (only owner)
router.post("/:id/todos", authMiddleware, (req, res) => {
  const list = lists.find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: "List not found" });

  if (list.creatorId !== req.user.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const todo = {
    id: uuidv4(),
    task: req.body.task,
    completed: false,
    listId: list.id,
  };

  todos.push(todo);

  res.json(todo);
});

module.exports = router;