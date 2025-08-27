const { testContextFiles } = require('./test-context-feature.js');

function verifyMCPTOOL() {
    return "MCP Tool is working!";
}

function main() {
    // Call function from test-mcp-basic.js
    const mcpResult = verifyMCPTOOL();
    console.log(mcpResult);
    
    // Call function from test-context-feature.js
    testContextFiles();
}

main();