import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";

const server = new McpServer({
  name: "Demo",
  version: "1.1.0"
});

server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

server.tool("subtract",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a - b) }]
  })
);

server.tool("multiply",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a * b) }]
  })
);


server.tool("divide",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    if (b === 0) {
      return {
        content: [{ type: "text", text: "Error: Division by zero is not allowed." }],
        isError: true
      }
    }

    return {
      content: [{ type: "text", text: String(a / b) }]
    }
  }
);

server.tool("fibonacci",
  { n: z.number().int().min(0) },
  async ({ n }) => {
    console.log(`fibonacci tool called with n=${n}`);

    if (n === 0) {
      console.log("Returning single 0");
      return { content: [{ type: "text", text: "0" }] };
    }
    if (n === 1) {
      console.log("Returning 0, 1");
      return { content: [{ type: "text", text: "0, 1" }] };
    }

    const sequence = [0, 1];
    console.log("Calculating fibonacci sequence...");
    for (let i = 2; i < n; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
      console.log(`Added ${sequence[i]} to sequence`);
    }

    const result = sequence.join(", ");
    console.log(`Final result: ${result}`);
    return {
      content: [{ type: "text", text: result }]
    };
  }
);

server.resource(
  "greeting",
  new ResourceTemplate("greeting://{:name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCPServer started on stdin/stdout")
}

main().catch((error) => {
  console.error("Fatal error: ", error)
  process.exit(1);
})
