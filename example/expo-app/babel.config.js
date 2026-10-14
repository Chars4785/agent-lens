module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@agentlens/babel-plugin",
        {
          enabled: process.env.NODE_ENV !== "production",
          rootDir: __dirname
        }
      ]
    ]
  };
};
