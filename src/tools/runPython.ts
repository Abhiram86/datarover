import OpenAI from "openai";

export const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "run_python",
      description:
        "Run's python is in a python sandbox, the sandbox runs in the browser via pyodide",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to run in the sandbox",
          },
        },
        required: ["code"],
      },
    },
  },
];
