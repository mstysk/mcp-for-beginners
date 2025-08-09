import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { Ollama } from "ollama"
import { z } from "zod"

class MyClient {
  private ollama: Ollama;
  private client: Client;

  constructor() {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    console.log(`Connecting to Ollama at ${host}`);
    this.ollama = new Ollama({
      host
    })
    this.client = new Client({
      name: "example-client",
      version: "1.0.0",
    },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {}
        }
      })
  }
  async connectToServer(transport: Transport) {
    await this.client.connect(transport);
    this.run();
    console.error("MCPClient started on stdin/stdout")
  }

  ollamaToolAdapter(tool: {
    name: string;
    description: string;
    input_schema: any;
  }) {
    const schema = z.object(tool.input_schema);

    return {
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.input_schema.properties,
          required: tool.input_schema.required,
        }
      }

    };
  }

  async callTools(
    tool_calls: any[],
    toolResults: any[]
  ) {
    for (const tool_call of tool_calls) {
      const toolName = tool_call.function.name;
      const args = tool_call.function.arguments;

      console.log(`Calling tool ${toolName} with args ${JSON.stringify(args)}`);

      // 2. Call the server's tool
      const toolResult = await this.client.callTool({
        name: toolName,
        arguments: typeof args === 'string' ? JSON.parse(args) : args,
      })

      console.log("Tool result: ", toolResult);

      // 3. Do something with the result
    }
  }

  async run() {
    console.log("Asking server for available tools");
    const toolResult = await this.client.listTools()
    const tools = toolResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema
    }))

    const messages = [
      {
        role: "user" as const,
        content: "What is the sum of 2 and 3?"
      }
    ];

    console.log("Querying LLM: ", messages[0].content);
    let response = await this.ollama.chat({
      model: process.env.OLLAMA_MODEL || "llama3.2",
      messages,
      tools: tools.map(tool => this.ollamaToolAdapter(tool))
    });

    let results: any[] = [];

    if (response.message.tool_calls) {
      console.log("Making tool call");
      await this.callTools(response.message.tool_calls, results);
    } else {
      console.log("Response: ", response.message.content);
    }
  }
}
let client = new MyClient();
const transport = new StdioClientTransport({
  command: "node",
  args: [
    "../bin/03-llm-client/index.js"
  ]
})

client.connectToServer(transport);
