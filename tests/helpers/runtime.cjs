const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "../..");
const plugin = require("../../packages/babel-plugin/dist/index.cjs");

class AnimatedValue {
  constructor(value = 0) { this.value = value; }
  __getValue() { return this.value; }
}

class AnimatedValueXY {
  constructor() {
    this.x = new AnimatedValue();
    this.y = new AnimatedValue();
  }
  setValue({ x, y }) {
    this.x.value = x;
    this.y.value = y;
  }
  getTranslateTransform() {
    return [{ translateX: this.x }, { translateY: this.y }];
  }
}

function createRuntime(nativeOverrides = {}, clipboard = { setString() {} }) {
  const cache = new Map();
  const native = {
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    TextInput: "TextInput",
    ScrollView: "ScrollView",
    SafeAreaView: "SafeAreaView",
    KeyboardAvoidingView: "KeyboardAvoidingView",
    ActivityIndicator: "ActivityIndicator",
    Animated: { View: "AnimatedView", ValueXY: AnimatedValueXY },
    PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
    Modal: ({ visible, children }) => visible ? children : null,
    Keyboard: { dismiss() {} },
    Platform: { OS: "ios" },
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
      absoluteFillObject: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }
    },
    findNodeHandle: () => null,
    UIManager: {},
    ...nativeOverrides
  };

  function compile(source, filename, instrument = false, envName = "development") {
    return babel.transformSync(source, {
      filename,
      envName,
      babelrc: false,
      configFile: false,
      presets: [
        [require.resolve("@babel/preset-react"), { runtime: "automatic" }],
        require.resolve("@babel/preset-typescript")
      ],
      plugins: [
        ...(instrument ? [[plugin, { rootDir: path.join(root, "example/expo-app") }]] : []),
        require.resolve("@babel/plugin-transform-modules-commonjs")
      ]
    }).code;
  }

  function execute(code, filename) {
    const loaded = new Module(filename, module);
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.require = (request) => {
      if (request === "react-native") return native;
      if (request === "@react-native-clipboard/clipboard") return clipboard;
      if (request === "@agentlens/react-native/runtime") return load("registry");
      if (request.startsWith(".")) {
        return load(path.resolve(path.dirname(filename), request));
      }
      return require(request);
    };
    cache.set(filename, loaded);
    loaded._compile(code, filename);
    return loaded.exports;
  }

  function load(name) {
    let filename = path.isAbsolute(name)
      ? name
      : path.join(root, "packages/react-native/src", name);
    if (!path.extname(filename)) {
      filename += fs.existsSync(`${filename}.ts`) ? ".ts" : ".tsx";
    }
    if (cache.has(filename)) return cache.get(filename).exports;
    return execute(compile(fs.readFileSync(filename, "utf8"), filename), filename);
  }

  function screen(source, envName = "development") {
    const filename = path.join(root, "example/expo-app/src/screens/ProbeScreen.tsx");
    const code = compile(source, filename, true, envName);
    return { code, exports: execute(code, filename) };
  }

  return { load, screen, native };
}

module.exports = { createRuntime };
