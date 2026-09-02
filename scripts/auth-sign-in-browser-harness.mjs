// Local-only browser regression fixture. Never forwards an authentication POST.
// Start Next on 3002, then open http://127.0.0.1:3004/login.
// Use any dummy password with html-error@..., network-error@..., or timeout@example.com.
import http from "node:http";

const target = new URL(process.env.AUTH_TEST_TARGET || "http://127.0.0.1:3002");
if (target.hostname !== "127.0.0.1" || target.protocol !== "http:") {
  throw new Error("The login test fixture may proxy only a local HTTP server.");
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/auth/sign-in") {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 4096) { response.writeHead(413).end(); return; }
    }
    const { email } = JSON.parse(body);
    if (email === "html-error@example.com") {
      response.writeHead(500, { "content-type": "text/html" }).end("<h1>Test server error</h1>");
    } else if (email === "network-error@example.com") {
      request.socket.destroy();
    } else if (email === "timeout@example.com") {
      // Intentionally wait for the client's timeout to abort this request.
    } else {
      response.writeHead(401, { "content-type": "application/json" })
        .end(JSON.stringify({ error: "Email or password is incorrect." }));
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end("This test fixture does not forward mutations.");
    return;
  }

  const upstream = http.request(new URL(request.url, target), {
    method: request.method,
    headers: {
      ...request.headers,
      host: "login-regression.invalid",
      "x-forwarded-host": "login-regression.invalid",
      cookie: "",
    },
  }, (incoming) => {
    const headers = { ...incoming.headers };
    delete headers["set-cookie"];
    response.writeHead(incoming.statusCode, headers);
    incoming.pipe(response);
  });
  upstream.on("error", () => response.writeHead(502).end("Start the local Next.js server on port 3002 first."));
  request.pipe(upstream);
});

server.listen(3004, "127.0.0.1", () => {
  console.log("Login regression fixture: http://127.0.0.1:3004/login (dummy credentials only)");
});
