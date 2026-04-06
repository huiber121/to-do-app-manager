// data/store.js
const users = [];
const lists = [];
const todos = [];
const refreshTokens = [];

function resetStore() {
  users.length = 0;
  lists.length = 0;
  todos.length = 0;
  refreshTokens.length = 0;
}

module.exports = { users, lists, todos, refreshTokens, resetStore };
