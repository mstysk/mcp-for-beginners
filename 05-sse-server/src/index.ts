import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { z } from "zod"

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

// Store transports for each session type
const transports = {
  sse: {} as Record<string, SSEServerTransport>
}

app.get('/sse', async (_req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId]
  })

  await server.connect(transport)
})

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];

  if (transport) {
    await transport.handlePostMessage(req, res, req.body)
  } else {
    res.status(400).send("No transport found for sessionId")
  }
});

app.listen(3000)
