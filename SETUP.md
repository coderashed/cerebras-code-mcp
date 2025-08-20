# 🚀 Cerebras Code MCP Server Setup

## 🔑 **Configure Your API Key**

The MCP server now reads your Cerebras API key from the MCP configuration instead of hardcoding it. Here's how to set it up:

### **1. Get Your Cerebras API Key**

1. Visit [Cerebras Console](https://console.cerebras.ai/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key (format: `csk-abc123def456ghi789`)

### **2. Update Your MCP Configuration**

Edit `~/.cursor/mcp.json` and replace `YOUR_CEREBRAS_API_KEY_HERE` with your actual API key:

```json
{
  "mcpServers": {
    "cerebras-code": {
      "command": "node",
      "args": ["/Users/Kevin.Taylor/Documents/GitHub/cerebras-code-mcp/mcp-server-sdk.js"],
      "env": {
        "CEREBRAS_API_KEY": "csk-your-actual-api-key-here"
      }
    }
  }
}
```

### **3. Optional: Customize Model Settings**

You can also customize the model behavior:

```json
{
  "mcpServers": {
    "cerebras-code": {
      "command": "node",
      "args": ["/Users/Kevin.Taylor/Documents/GitHub/cerebras-code-mcp/mcp-server-sdk.js"],
      "env": {
        "CEREBRAS_API_KEY": "csk-your-actual-api-key-here",
        "CEREBRAS_MODEL": "qwen-3-coder-480b",
        "CEREBRAS_MAX_TOKENS": "2048",
        "CEREBRAS_TEMPERATURE": "0.1"
      }
    }
  }
}
```

### **4. Restart Cursor**

After updating the configuration, restart Cursor completely for the changes to take effect.

## 🔒 **Security Benefits**

- ✅ **No hardcoded API keys** in source code
- ✅ **API keys stored securely** in Cursor's MCP configuration
- ✅ **Easy to update** without modifying server files
- ✅ **Environment-specific** configuration support

## 🚨 **Important Notes**

- **Never commit your API key** to version control
- **Keep your API key private** and secure
- **Rotate your API key** regularly for security
- **Check your API usage** in the Cerebras console

## 🧪 **Test the Setup**

Once configured, you can test the tool in Cursor:

```
@cerebras-code-write Write a hello world function in Python
```

## 🆘 **Troubleshooting**

If you get configuration errors:
1. Check that your API key is correct
2. Verify the MCP configuration syntax
3. Ensure Cursor was restarted after changes
4. Check the server logs for detailed error messages


