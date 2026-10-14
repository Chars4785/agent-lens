# AgentLens

> Agent-agnostic visual feedback for React Native.

AgentLens is an early proof of concept for selecting a React Native UI element in a running development build, resolving it back to TSX source, entering feedback, and copying a structured annotation for a coding agent.

## V0.1 Scope

V0.1 proves this path:

```text
Tap UI Element
  -> Registered React Native ref
  -> Measured screen layout
  -> Babel-instrumented source metadata
  -> Feedback JSON
  -> Clipboard
```

The project is intentionally agent-agnostic. There is no MCP server, AI API integration, backend, authentication, annotation history, or production inspection.

## Packages

- `@agentlens/react-native`: development runtime, inspect mode, element registry, overlay, feedback panel, annotation generation, and clipboard copy.
- `@agentlens/babel-plugin`: development-only JSX instrumentation for supported React Native components.

## Installation

```sh
npm install @agentlens/react-native @agentlens/babel-plugin @react-native-clipboard/clipboard
```

Configure Babel in an Expo or React Native app:

```js
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@agentlens/babel-plugin",
        {
          enabled: process.env.NODE_ENV !== "production"
        }
      ]
    ]
  };
};
```

Wrap the app root:

```tsx
import { AgentLens } from "@agentlens/react-native";

export default function App() {
  return (
    <AgentLens>
      <YourApp />
    </AgentLens>
  );
}
```

## Supported Components

The V0.1 Babel plugin instruments React Native imports for:

- `View`
- `Text`
- `Pressable`
- `TouchableOpacity`
- `Image`
- `TextInput`
- `ScrollView`

The plugin injects official React Native props only:

- `ref`, chained with an existing expression ref when present
- `testID` when one is not already present, for debugging and test visibility
- `collapsable={false}` for `View`, so layout-only views can be measured reliably

## How Selection Works

In inspect mode, AgentLens renders a transparent full-screen tap catcher above the application. On tap, it measures every registered element using `measureInWindow`, filters elements whose bounds contain the tap point, and selects the smallest matching element. That keeps V0.1 simple and avoids depending on private native hit-testing APIs.

## Annotation Format

```json
{
  "version": "0.1",
  "component": "Pressable",
  "source": {
    "file": "src/screens/LoginScreen.tsx",
    "line": 42,
    "column": 5
  },
  "layout": {
    "x": 24,
    "y": 320,
    "width": 240,
    "height": 52
  },
  "feedback": "Make this button taller"
}
```

## Known V0.1 Limitations

- Custom components are not instrumented yet.
- Parent/child navigation is not implemented.
- Recycled list rows, portals, bottom sheets, gesture-handler surfaces, and animated native components need more validation.
- Clipboard copy uses `@react-native-clipboard/clipboard`.
- Production builds should disable the Babel plugin. The runtime also returns `children` unchanged when `__DEV__` is false.

## Example App

An Expo example lives in `example/expo-app`.

```sh
cd example/expo-app
npm install
npm run ios
```

Use the floating AgentLens button, tap an instrumented element, enter feedback, and copy the annotation JSON.
