import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { EventId, EventStore, StreamableHTTPServerTransport, StreamId } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import { randomUUID } from "crypto";
import { isInitializeRequest, JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

class InMemoryEventStore implements EventStore {
  private events: Map<EventId, { streamId: StreamId, message: JSONRPCMessage }> = new Map();
  async storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId> {
    const eventId: EventId = randomUUID();
    this.events.set(eventId, { streamId, message });
    return eventId;
  }
  async replayEventsAfter(
    lastEventId: EventId,
    { send }: { send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>; }): Promise<StreamId> {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return '';
    }
    const event = this.events.get(lastEventId);
    if (!event) {
      return '';
    }
    const streamId = event.streamId;
    // Sort events by eventId for chronological ordering
    const sortedEvents = [...this.events.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    let foundLastEvent = false;

    for (const [eventId, { streamId: eventStreamId, message }] of sortedEvents) {
      // Only include events from the same stream
      if (eventStreamId !== streamId) {
        continue;
      }
      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue; // Skip the last event as we start after it
      }

      if (foundLastEvent) {
        await send(eventId, message);

      }
    }
    console.log(`Replayed events for stream ${streamId} after event ${lastEventId}`);
    return streamId;
  }
}

const server = new McpServer({
  name: "backwards-compatible-server",
  version: "1.0.0",
})

server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    console.log(`Adding ${a} + ${b}`);
    return { content: [{ type: "text", text: String(a + b) }] }
  })

const app = express()
app.use(express.json());

const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.log(`Received request with session ID: ${sessionId}`);
    let transport: StreamableHTTPServerTransport;

    // session used
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (
      // new session
      // 1. 初期化リクエストまたは、セッションIDがない場合
      // 2. server/infoリクエスト
      (
        (isInitializeRequest(req.body) || req.body.method === 'initialize') && !sessionId) ||
      req.body.method === 'server/info'
    ) {
      console.log(`Creating new session for request: ${JSON.stringify(req.body)}`);

      const eventStore = new InMemoryEventStore();

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized: ${sessionId}`);
          transports[sessionId] = transport;
          console.log(`list session: ${Object.keys(transports).join(', ')}`);
        }
      })
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session: ${sid}`);
          delete transports[sid];
        }
      }
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // 無効なSession
      // 400 Bad Request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Bad Request: No valid session ID proided",
        },
        id: null
      })
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal Server Error: " + (error instanceof Error ? error.message : String(error)),
      },
      id: null
    })
    return;

  }
})

app.delete('mcp', async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID. Please provide a valid session ID');
    return;
  }

  console.log(`Closing session: ${sessionId}`);

  try {
    const transport = transports[sessionId];

    // Delete リクエストを渡すとSessionを破棄してくれる
    await transport.handleRequest(req, res)
  } catch (error) {
    console.error("Error closing session:", error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
})


app.listen(3000)
