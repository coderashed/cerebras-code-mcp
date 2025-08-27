// Test file to verify context_files feature works
// This file would be used to test if the MCP server
// properly reads and includes context files

function testContextFiles() {
  console.log("Testing context files feature");
  // The MCP server should now be able to read this file
  // and include it as context when generating new code
}

module.exports = { testContextFiles };

