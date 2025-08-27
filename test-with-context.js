const { testContextFiles } = require('./test-context-feature');

function useTestContextFiles() {
  testContextFiles();
  console.log("Context integration successful!");
}

module.exports = { useTestContextFiles };