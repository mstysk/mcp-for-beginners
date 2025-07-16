import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["build/index.js"]
})

const client = new Client({
  name: "example-client",
  version: "1.0.0"
})

await client.connect(transport);


// List resources
const resources = await client.listResources();
for (let resource in resources.resources) {
  console.log("Resource: ", resource);
}

// Use the greeting resource
const greeting = await client.readResource({
  uri: "greeting://World"
});
console.log("Greeting:", greeting.contents[0].text);

const templates = await client.listResourceTemplates();
for (let template of templates.resourceTemplates) {
  console.log("Resource template:", template.name);
}

// Call a tool
const result = await client.callTool({
  name: "add",
  arguments: {
    a: 1,
    b: 8
  }
})

console.log("Tool result:", result);
