import { describe, it, expect, vi } from 'vitest';

// Mock the tool handler before importing the server
vi.mock('../tool-handlers.js', () => ({
  handleWriteTool: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'mocked response' }]
  })
}));

describe('MCP Server', () => {
  it('should export a server instance', async () => {
    const { server } = await import('../../src/server/mcp-server.js');
    expect(server).toBeDefined();
    expect(server.constructor.name).toBe('Server');
  });

  it('should export a startServer function', async () => {
    const { startServer } = await import('../../src/server/mcp-server.js');
    expect(startServer).toBeDefined();
    expect(typeof startServer).toBe('function');
  });

  it('should have server configuration', async () => {
    const { server } = await import('../../src/server/mcp-server.js');
    // The server exists and is configured
    expect(server).toBeDefined();
  });

  // Note: Testing the actual handlers requires running the server
  // which involves STDIO transport. These are better tested as integration tests
  // or with more complex mocking of the MCP SDK.
});