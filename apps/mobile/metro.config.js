const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

config.resolver.sourceExts.push("mjs");
config.resolver.assetExts.push("lottie");

module.exports = config;
