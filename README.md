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

The packages are not published to npm yet. From this repository's root, create
the two installable archives:

```sh
npm pack --workspace @agentlens/react-native
npm pack --workspace @agentlens/babel-plugin
```

Copy the archives into your app's `vendor` directory, then run these commands
from the app root. Keep the archives in the app repository for repeatable installs.

```sh
npm install ./vendor/agentlens-react-native-0.1.0.tgz @react-native-clipboard/clipboard
npm install -D ./vendor/agentlens-babel-plugin-0.1.0.tgz
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

In inspect mode, AgentLens renders a transparent native modal above the application.
The toolbar reports the registered element count. On tap, it measures every
registered instance using `measureInWindow`, converts the tap to window
coordinates, and selects the smallest matching element. Repeated JSX instances
are registered separately. Missing instrumentation, failed measurements, and
unmatched taps are reported in the inspector instead of silently doing nothing.

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
- Expo requires a native development build; Expo Go does not include this clipboard module.
- Production builds should disable the Babel plugin. The runtime also returns `children` unchanged when `__DEV__` is false.

## Example App

An Expo example lives in `example/expo-app`.

```sh
npm install
npm run ios --workspace @agentlens/example-expo-app
```

Run these commands from the repository root. Use the floating AgentLens button,
tap an instrumented element, enter feedback, and copy the annotation JSON.
Drag the floating button to uncover app controls. Its position stays in place
while opening and closing the inspector, and is clamped when the available area
changes. A full app reload resets the position. Screen reader actions also allow
moving the button up, down, left, and right.

## Testing

```sh
npm ci
npm test
npm run typecheck
```

The regression tests cover repeated instances, native measurement failures and
timeouts, ref forwarding, Babel instrumentation, production behavior, and the
selection-to-clipboard flow. Native measurements and the clipboard are mocked;
these tests do not replace simulator or device checks.

For native validation, run the example development build and check:

1. Normal app actions work while the inspector is closed.
2. Opening AgentLens shows a nonzero element count.
3. Tapping a supported element highlights it and opens its source and feedback panel.
4. Entering feedback and pressing Copy Annotation copies valid JSON with the correct source and layout.
5. Closing the panel and selecting another element works, including repeated rows.
6. Done exits inspection and restores normal app interactions.
7. Dragging the launcher moves it without opening inspection; a tap still opens it.
8. The launcher stays within the available area after dragging or rotating the device.

If the toolbar shows zero elements, verify the app's Babel plugin configuration
and restart Metro with its cache cleared. Apps installed from `.tgz` archives
need newly packed and reinstalled archives to receive local library changes.
