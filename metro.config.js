const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Prefer Hermes-oriented transforms so release bytecode accepts the bundle.
if (config.transformer) {
  config.transformer.unstable_transformProfile = "hermes-stable";
}

module.exports = config;
