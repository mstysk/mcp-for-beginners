import { Server, Tool, Resource } from "@modelcontextprotocol/typescript-server-sdk";

// Create a new MCP Server
const server = new Server({
  port: 3000,
  name: "Example MCP Server",
  version: "1.0.0"
});

server.registerTool({
  name: "calculator",
  description: "Performs basic calculations",
  parameters: {
    expression: {
      type: "string",
      description: "The math expression to evaluate"
    }
  },
  handler: async(params) => {
    const result = eval(params.expression);
    return { result };
  }
});

server.start();
