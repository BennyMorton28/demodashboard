import { toolsList } from "../../config/tools-list";
import useToolsStore from "@/stores/useToolsStore";
import { WebSearchConfig } from "@/stores/useToolsStore";

interface WebSearchTool extends WebSearchConfig {
  type: "web_search";
}

interface FileSearchTool {
  type: "file_search";
  vector_store_ids: (string | undefined)[];
}

interface FunctionTool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
    additionalProperties: boolean;
  };
  strict: boolean;
}

type Tool = WebSearchTool | FileSearchTool | FunctionTool;

export const getTools = () => {
  // During build time or server-side, return an empty array
  if (typeof window === 'undefined') {
    return [];
  }

  const {
    webSearchEnabled,
    fileSearchEnabled,
    functionsEnabled,
    vectorStore,
    webSearchConfig,
  } = useToolsStore.getState();

  const tools: Tool[] = [];

  if (webSearchEnabled) {
    const webSearchTool: WebSearchTool = {
      type: "web_search",
    };
    if (
      webSearchConfig.user_location &&
      (webSearchConfig.user_location.country !== "" ||
        webSearchConfig.user_location.region !== "" ||
        webSearchConfig.user_location.city !== "")
    ) {
      webSearchTool.user_location = webSearchConfig.user_location;
    }

    tools.push(webSearchTool);
  }

  if (fileSearchEnabled) {
    const fileSearchTool: FileSearchTool = {
      type: "file_search",
      vector_store_ids: [vectorStore?.id],
    };
    tools.push(fileSearchTool);
  }

  if (functionsEnabled) {
    tools.push(
      ...toolsList.map((tool): FunctionTool => {
        return {
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: { ...tool.parameters },
            required: Object.keys(tool.parameters),
            additionalProperties: false,
          },
          strict: true,
        };
      })
    );
  }

  return tools;
};
