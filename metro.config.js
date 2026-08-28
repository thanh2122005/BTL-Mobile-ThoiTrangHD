const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore Jupyter Notebook checkpoint files so they don't appear as routes
config.resolver.blockList = [
  /.*\.ipynb_checkpoints.*/,
  ...config.resolver.blockList || []
];

module.exports = config;
