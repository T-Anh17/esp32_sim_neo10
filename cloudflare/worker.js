let lastPayload = null;
const sockets = new Set();

function buildCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleUpdate(request) {
  const payload = await request.json();
  payload.ts = payload.ts ? payload.ts : Date.now();
  lastPayload = payload;

  const message = JSON.stringify(payload);
  for (const ws of sockets) {
    try {
      ws.send(message);
    } catch (err) {
      sockets.delete(ws);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...buildCorsHeaders() },
  });
}

function handleWebSocket(request) {
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  server.accept();
  sockets.add(server);

  if (lastPayload) {
    server.send(JSON.stringify(lastPayload));
  }

  server.addEventListener("close", () => sockets.delete(server));
  server.addEventListener("error", () => sockets.delete(server));

  return new Response(null, { status: 101, webSocket: client });
}

async function handleLatest() {
  return new Response(JSON.stringify(lastPayload || {}), {
    status: 200,
    headers: { "Content-Type": "application/json", ...buildCorsHeaders() },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: buildCorsHeaders() });
    }

    const url = new URL(request.url);
    if (url.pathname === "/update" && request.method === "POST") {
      return handleUpdate(request);
    }

    if (url.pathname === "/ws") {
      return handleWebSocket(request);
    }

    if (url.pathname === "/latest") {
      return handleLatest();
    }

    return new Response("Not found", { status: 404, headers: buildCorsHeaders() });
  },
};
