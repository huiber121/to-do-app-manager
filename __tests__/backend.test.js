const request = require("supertest");
const app = require("../app");
const { resetStore } = require("../data/store");

describe("TodoManager backend", () => {
  beforeEach(() => {
    resetStore();
  });

  async function signupAndLogin(username = "demo", password = "secret123") {
    await request(app).post("/signup").send({ username, password }).expect(201);

    const loginResponse = await request(app)
      .post("/login")
      .send({ username, password })
      .expect(200);

    return loginResponse.body.accessToken;
  }

  test("creates a user and returns an access token on login", async () => {
    await request(app)
      .post("/signup")
      .send({ username: "demo", password: "secret123" })
      .expect(201, { message: "User created" });

    const response = await request(app)
      .post("/login")
      .send({ username: "demo", password: "secret123" })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ username: "demo" });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")])
    );
  });

  test("rejects duplicate usernames", async () => {
    await request(app)
      .post("/signup")
      .send({ username: "demo", password: "secret123" })
      .expect(201);

    const response = await request(app)
      .post("/signup")
      .send({ username: "demo", password: "secret123" })
      .expect(409);

    expect(response.body).toEqual({ error: "Username already exists" });
  });

  test("creates lists and todos for the authenticated user", async () => {
    const token = await signupAndLogin();

    const listResponse = await request(app)
      .post("/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: " Work " })
      .expect(201);

    expect(listResponse.body.name).toBe("Work");

    const todoResponse = await request(app)
      .post(`/lists/${listResponse.body.id}/todos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ task: " Ship backend tests " })
      .expect(201);

    expect(todoResponse.body).toMatchObject({
      task: "Ship backend tests",
      completed: false,
      listId: listResponse.body.id,
    });

    const listsResponse = await request(app)
      .get("/lists")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listsResponse.body).toHaveLength(1);
    expect(listsResponse.body[0]).toMatchObject({
      name: "Work",
      todoCount: 1,
      completedCount: 0,
    });
    expect(listsResponse.body[0].todos).toHaveLength(1);
  });

  test("updates and deletes todos", async () => {
    const token = await signupAndLogin();

    const listResponse = await request(app)
      .post("/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Launch" })
      .expect(201);

    const todoResponse = await request(app)
      .post(`/lists/${listResponse.body.id}/todos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ task: "Write docs" })
      .expect(201);

    await request(app)
      .patch(`/lists/${listResponse.body.id}/todos/${todoResponse.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true, task: "Write launch docs" })
      .expect(200);

    const listsResponse = await request(app)
      .get("/lists")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listsResponse.body[0]).toMatchObject({
      completedCount: 1,
      todoCount: 1,
    });
    expect(listsResponse.body[0].todos[0]).toMatchObject({
      task: "Write launch docs",
      completed: true,
    });

    await request(app)
      .delete(`/lists/${listResponse.body.id}/todos/${todoResponse.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const afterDeleteResponse = await request(app)
      .get("/lists")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(afterDeleteResponse.body[0].todos).toHaveLength(0);
  });

  test("blocks list access without a bearer token", async () => {
    const response = await request(app).get("/lists").expect(401);
    expect(response.body).toEqual({ error: "Missing token" });
  });
});
