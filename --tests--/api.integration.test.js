const http = require("http");

// ─── JSON structure validators (mirror what the client expects) ───────────────

function isValidLoginResponse(obj) {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "number" &&
    typeof obj.firstName === "string" &&
    typeof obj.lastName === "string" &&
    typeof obj.error === "string"
  );
}

function isValidAddColorResponse(obj) {
  return typeof obj === "object" && obj !== null && typeof obj.error === "string";
}

function isValidSearchResponse(obj) {
  if (typeof obj !== "object" || obj === null) return false;
  if (typeof obj.error !== "string") return false;
  // results array only present on success
  if ("results" in obj) {
    return Array.isArray(obj.results) && obj.results.every((r) => typeof r === "string");
  }
  return true; // error response (no results key) is also valid
}

// ─── Unit tests for the validators themselves ─────────────────────────────────

describe("isValidLoginResponse", () => {
  test("accepts a successful login payload", () => {
    expect(isValidLoginResponse({ id: 5, firstName: "Jane", lastName: "Doe", error: "" })).toBe(
      true
    );
  });

  test("accepts a failed login payload (id = 0)", () => {
    expect(
      isValidLoginResponse({ id: 0, firstName: "", lastName: "", error: "Invalid credentials" })
    ).toBe(true);
  });

  test("rejects a payload missing the id field", () => {
    expect(isValidLoginResponse({ firstName: "Jane", lastName: "Doe", error: "" })).toBe(false);
  });

  test("rejects a payload where id is a string", () => {
    expect(isValidLoginResponse({ id: "5", firstName: "Jane", lastName: "Doe", error: "" })).toBe(
      false
    );
  });

  test("rejects null", () => {
    expect(isValidLoginResponse(null)).toBe(false);
  });
});

describe("isValidAddColorResponse", () => {
  test("accepts a success payload", () => {
    expect(isValidAddColorResponse({ error: "" })).toBe(true);
  });

  test("accepts an error payload", () => {
    expect(isValidAddColorResponse({ error: "DB connection failed" })).toBe(true);
  });

  test("rejects a payload without an error field", () => {
    expect(isValidAddColorResponse({ status: "ok" })).toBe(false);
  });
});

describe("isValidSearchResponse", () => {
  test("accepts a success payload with a results array", () => {
    expect(isValidSearchResponse({ results: ["Red", "Blue"], error: "" })).toBe(true);
  });

  test("accepts an error payload with no results key", () => {
    expect(isValidSearchResponse({ error: "No Records Found" })).toBe(true);
  });

  test("rejects results that contains non-string entries", () => {
    expect(isValidSearchResponse({ results: [42, "Blue"], error: "" })).toBe(false);
  });

  test("rejects a payload with no error key", () => {
    expect(isValidSearchResponse({ results: ["Red"] })).toBe(false);
  });
});

// ─── Integration tests: mock HTTP server ─────────────────────────────────────

function makeRequest(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "localhost",
      port,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error("Response is not valid JSON: " + data));
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

describe("Mock API server — integration tests", () => {
  let server;
  let port;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;

        if (req.url === "/Login.php") {
          // Simulate: user "admin" / "password" succeeds, everything else fails
          if (data.login === "admin" && data.password === "password") {
            res.end(JSON.stringify({ id: 1, firstName: "Admin", lastName: "User", error: "" }));
          } else {
            res.end(JSON.stringify({ id: 0, firstName: "", lastName: "", error: "Invalid" }));
          }
        } else if (req.url === "/AddColor.php") {
          if (data.color && data.userId > 0) {
            res.end(JSON.stringify({ error: "" }));
          } else {
            res.end(JSON.stringify({ error: "Missing fields" }));
          }
        } else if (req.url === "/SearchColors.php") {
          const colors = ["Red", "Blue", "Green", "Cobalt Blue", "Rose Red"];
          const q = (data.search || "").toLowerCase();
          const matches = colors.filter((c) => c.toLowerCase().includes(q));
          if (matches.length > 0) {
            res.end(JSON.stringify({ results: matches, error: "" }));
          } else {
            res.end(JSON.stringify({ error: "No Records Found" }));
          }
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
        }
      });
    });

    // Let OS pick a free port
    server.listen(0, "localhost", () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  // ── Login endpoint ──────────────────────────────────────────────────────────

  test("POST /Login.php — valid credentials return a user object with id > 0", async () => {
    const { status, body } = await makeRequest(port, "/Login.php", {
      login: "admin",
      password: "password",
    });
    expect(status).toBe(200);
    expect(isValidLoginResponse(body)).toBe(true);
    expect(body.id).toBeGreaterThan(0);
    expect(body.error).toBe("");
  });

  test("POST /Login.php — invalid credentials return id = 0 and a non-empty error", async () => {
    const { status, body } = await makeRequest(port, "/Login.php", {
      login: "wrong",
      password: "wrong",
    });
    expect(status).toBe(200);
    expect(isValidLoginResponse(body)).toBe(true);
    expect(body.id).toBe(0);
    expect(body.error).not.toBe("");
  });

  // ── AddColor endpoint ───────────────────────────────────────────────────────

  test("POST /AddColor.php — valid payload returns {error: ''}", async () => {
    const { status, body } = await makeRequest(port, "/AddColor.php", {
      color: "Aquamarine",
      userId: 1,
    });
    expect(status).toBe(200);
    expect(isValidAddColorResponse(body)).toBe(true);
    expect(body.error).toBe("");
  });

  test("POST /AddColor.php — missing userId returns an error string", async () => {
    const { status, body } = await makeRequest(port, "/AddColor.php", {
      color: "Aquamarine",
      userId: 0,
    });
    expect(status).toBe(200);
    expect(isValidAddColorResponse(body)).toBe(true);
    expect(body.error).not.toBe("");
  });

  // ── SearchColors endpoint ───────────────────────────────────────────────────

  test("POST /SearchColors.php — matching query returns results array of strings", async () => {
    const { status, body } = await makeRequest(port, "/SearchColors.php", {
      search: "blue",
      userId: 1,
    });
    expect(status).toBe(200);
    expect(isValidSearchResponse(body)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    body.results.forEach((r) => expect(typeof r).toBe("string"));
  });

  test("POST /SearchColors.php — non-matching query returns error message", async () => {
    const { status, body } = await makeRequest(port, "/SearchColors.php", {
      search: "xyzzy_no_match",
      userId: 1,
    });
    expect(status).toBe(200);
    expect(isValidSearchResponse(body)).toBe(true);
    expect(body.error).toBe("No Records Found");
  });

  test("POST /SearchColors.php — response JSON structure is always valid", async () => {
    const { body } = await makeRequest(port, "/SearchColors.php", {
      search: "red",
      userId: 1,
    });
    expect(isValidSearchResponse(body)).toBe(true);
  });
});
