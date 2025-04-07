import { toolsList } from "../../config/tools-list";
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

// Create a function to get tools that works in both client and server environments
export const getTools = (): Tool[] => {
  // During build time or server-side, return an empty array
  if (typeof window === 'undefined') {
    return [] as Tool[];
  }

  try {
    // Only import useToolsStore on the client side
    const useToolsStore = require('@/stores/useToolsStore').default;
    const {
      webSearchEnabled,
      fileSearchEnabled,
      functionsEnabled,
      vectorStore,
      webSearchConfig,
    } = useToolsStore.getState();

    // Initialize arrays for each tool type
    const webSearchTools: WebSearchTool[] = [];
    const fileSearchTools: FileSearchTool[] = [];
    const functionTools: FunctionTool[] = [];

    // Add web search tool if enabled
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
      webSearchTools.push(webSearchTool);
    }

    // Add file search tool if enabled
    if (fileSearchEnabled) {
      const fileSearchTool: FileSearchTool = {
        type: "file_search",
        vector_store_ids: [vectorStore?.id],
      };
      fileSearchTools.push(fileSearchTool);
    }

    // Add function tools if enabled
    if (functionsEnabled) {
      functionTools.push(
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

    // Combine all tools into a single array
    const allTools: Tool[] = [
      ...webSearchTools,
      ...fileSearchTools,
      ...functionTools,
    ];

    return allTools;
  } catch (error) {
    console.error("Error getting tools:", error);
    return [] as Tool[];
  }
};
