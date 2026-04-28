module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  // Ignore node_modules and vendor folders
  testPathIgnorePatterns: ["/node_modules/", "/vendor/"],
  // Collect coverage from the js folder
  collectCoverageFrom: ["js/**/*.js", "!js/md5.js"],
};
