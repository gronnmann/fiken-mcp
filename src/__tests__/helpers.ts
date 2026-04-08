import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type Handler = (params: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
}>;

export function createMockServer() {
    const handlers = new Map<string, Handler>();
    const server = {
        registerTool(name: string, _config: unknown, handler: Handler) {
            handlers.set(name, handler);
        },
        getHandler(name: string): Handler {
            const h = handlers.get(name);
            if (!h) throw new Error(`No handler registered for tool: ${name}`);
            return h;
        },
    };
    return server as unknown as McpServer & { getHandler(name: string): Handler };
}
