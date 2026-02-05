import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServer = vi.hoisted(() => ({
  setRequestHandler: vi.fn(),
  connect: vi.fn()
}));

const mockTransportInstance = vi.hoisted(() => ({}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class {
    constructor() {
      Object.assign(this, mockServer);
    }
  }
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    constructor() {
      Object.assign(this, mockTransportInstance);
    }
  }
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  CallToolRequestSchema: 'CallToolRequestSchema'
}));

const mockHandleWriteTool = vi.hoisted(() => vi.fn());

vi.mock('../../src/server/tool-handlers.js', () => ({
  handleWriteTool: mockHandleWriteTool
}));

import { server, startServer } from '../../src/server/mcp-server.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('server', () => {
  it('should create server with setRequestHandler method', () => {
    expect(server.setRequestHandler).toBeDefined();
    expect(server.connect).toBeDefined();
  });

  it('should register ListToolsRequestSchema handler', () => {
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      ListToolsRequestSchema,
      expect.any(Function)
    );
  });

  it('should register CallToolRequestSchema handler', () => {
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      CallToolRequestSchema,
      expect.any(Function)
    );
  });
});

describe('ListToolsRequestSchema handler', () => {
  let listToolsHandler;

  beforeEach(() => {
    listToolsHandler = mockServer.setRequestHandler.mock.calls.find(
      call => call[0] === ListToolsRequestSchema
    )?.[1];
  });

  it('should return tools array with write tool', async () => {
    const result = await listToolsHandler();
    expect(result).toHaveProperty('tools');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]).toMatchObject({
      name: 'write',
      description: expect.stringContaining('MANDATORY CODE TOOL')
    });
    expect(result.tools[0].inputSchema).toMatchObject({
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        prompt: { type: 'string' },
        context_files: { type: 'array' }
      },
      required: ['file_path', 'prompt']
    });
  });
});

describe('CallToolRequestSchema handler', () => {
  let callToolHandler;

  beforeEach(() => {
    callToolHandler = mockServer.setRequestHandler.mock.calls.find(
      call => call[0] === CallToolRequestSchema
    )?.[1];
  });

  it('should call handleWriteTool for write tool', async () => {
    const args = { file_path: '/test/file.js', prompt: 'test prompt' };
    await callToolHandler({ params: { name: 'write', arguments: args } });
    expect(mockHandleWriteTool).toHaveBeenCalledWith(args);
  });

  it('should throw error for unknown tool', async () => {
    await expect(
      callToolHandler({ params: { name: 'unknown', arguments: {} } })
    ).rejects.toThrow('Unknown tool: unknown');
  });
});

describe('startServer', () => {
  it('should connect server', async () => {
    await startServer();
    expect(mockServer.connect).toHaveBeenCalled();
  });

  it('should return server instance', async () => {
    const result = await startServer();
    expect(result).toBeDefined();
    expect(result.setRequestHandler).toBeDefined();
  });
});
