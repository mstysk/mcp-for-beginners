import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"]
})

const client = new Client({
  name: "example-client",
  version: "1.0.0"
})

await client.connect(transport);

const prompts = await client.listPrompts();
const resources = await client.listResources();
const tools = await client.listTools();

const resource = await client.readResource({
  uri: "file://example.txt"
});

const result = await client.callTool({
  name: "example-tool",
  argumetns: {
    arg1: "value"
  }
});

const promptResult = await client.getPrompt({
  name: "review-code",
  arguments: {
    code: "console.log(\"Hello, world!\")"
  }
})

