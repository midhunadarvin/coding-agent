import type { FileStore } from "../workspace/interface.ts";
import type { Tool } from "./types.ts";

export function createListReposTool(files: FileStore): Tool {
  return {
    definition: {
      name: "list_repos",
      description:
        "List attached workspaces. Extra repos are addressed as name:relative/path.",
      parameters: { type: "object", properties: {} },
    },
    async execute(): Promise<string> {
      const lines = files.roots().map((workspace, index) => {
        const tag = workspace.root === files.root ? "primary" : workspace.name;
        return `${index + 1}. ${tag}  ${workspace.root}`;
      });
      return `OK list_repos\ncount: ${lines.length}\n${lines.join("\n")}`;
    },
  };
}
