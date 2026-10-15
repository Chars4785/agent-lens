const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { act, create } = require("react-test-renderer");
const { createRuntime } = require("./helpers/runtime.cjs");

const metadata = {
  id: "repeated-text",
  component: "Text",
  source: { file: "src/Verses.tsx", line: 12, column: 3 }
};

function nodeAt(x, y, width = 100, height = 30) {
  return { measureInWindow: (callback) => callback(x, y, width, height) };
}

test("repeated JSX instances remain individually selectable after a sibling unmounts", async () => {
  const registry = createRuntime().load("registry");
  const first = registry.createAgentLensRef(metadata);
  const second = registry.createAgentLensRef(metadata);
  first(nodeAt(20, 100));
  second(nodeAt(20, 200));

  assert.equal(registry.getAgentLensRegistrySize(), 2);
  const selectedFirst = await registry.findAgentLensElementAtPoint(25, 110);
  const selectedSecond = await registry.findAgentLensElementAtPoint(25, 210);
  assert.notEqual(selectedFirst.instanceId, selectedSecond.instanceId);
  assert.equal(selectedFirst.layout.y, 100);
  assert.equal(selectedSecond.layout.y, 200);

  second(null);
  assert.equal(registry.getAgentLensRegistrySize(), 1);
  assert.equal((await registry.findAgentLensElementAtPoint(25, 110)).layout.y, 100);
  assert.equal(await registry.findAgentLensElementAtPoint(25, 210), null);
});

test("selection chooses the smallest containing element", async () => {
  const registry = createRuntime().load("registry");
  registry.registerAgentLensElement({ ...metadata, id: "container" }, nodeAt(0, 0, 300, 500));
  registry.registerAgentLensElement(metadata, nodeAt(20, 100));
  const result = await registry.inspectAgentLensPoint(25, 110);
  assert.equal(result.registeredCount, 2);
  assert.equal(result.measuredCount, 2);
  assert.equal(result.selectedElement.metadata.id, metadata.id);
});

test("missing native callbacks time out without preventing other selections", async () => {
  const registry = createRuntime().load("registry");
  registry.registerAgentLensElement(metadata, { measureInWindow() {} });
  registry.registerAgentLensElement({ ...metadata, id: "working" }, nodeAt(20, 100));
  const result = await registry.inspectAgentLensPoint(25, 110);
  assert.equal(result.measuredCount, 1);
  assert.equal(result.selectedElement.metadata.id, "working");
});

test("a measurement completed after unmount does not select a stale instance", async () => {
  const registry = createRuntime().load("registry");
  let complete;
  const ref = registry.createAgentLensRef(metadata);
  ref({ measureInWindow: (callback) => { complete = callback; } });
  const pending = registry.inspectAgentLensPoint(25, 110);
  ref(null);
  complete(20, 100, 100, 30);
  assert.equal((await pending).selectedElement, null);
});

test("native errors and invalid layouts produce a diagnostic result", async () => {
  const registry = createRuntime({ findNodeHandle() { throw new Error("Detached node"); } }).load("registry");
  registry.registerAgentLensElement(metadata, {
    measureInWindow(callback) { callback(NaN, 0, 100, 30); }
  });
  const result = await registry.inspectAgentLensPoint(25, 110);
  assert.equal(result.registeredCount, 1);
  assert.equal(result.measuredCount, 0);
  assert.equal(result.selectedElement, null);
});

test("existing object refs and React 19 callback cleanup are preserved", () => {
  const registry = createRuntime().load("registry");
  const original = { current: null };
  const node = nodeAt(20, 100);
  const objectRef = registry.createAgentLensRef(metadata, original);
  objectRef(node);
  assert.equal(original.current, node);
  objectRef(null);
  assert.equal(original.current, null);

  const calls = [];
  const callbackRef = registry.createAgentLensRef(metadata, (value) => {
    calls.push(value);
    return () => calls.push("cleanup");
  });
  callbackRef(node);
  callbackRef(null);
  assert.deepEqual(calls, [node, "cleanup"]);
  assert.equal(registry.getAgentLensRegistrySize(), 0);
});

test("registry subscribers stop receiving updates after unsubscribe", () => {
  const registry = createRuntime().load("registry");
  let updates = 0;
  const unsubscribe = registry.subscribeAgentLensRegistry(() => { updates += 1; });
  const ref = registry.createAgentLensRef(metadata);
  ref(nodeAt(20, 100));
  ref(null);
  assert.equal(updates, 2);
  unsubscribe();
  ref(nodeAt(20, 100));
  assert.equal(updates, 2);
});

test("the published Babel entry instruments aliases and namespaces only in development", () => {
  const runtime = createRuntime();
  const source = `
    import { View as Container } from "react-native";
    import * as RN from "react-native";
    export const Probe = ({ forwardedRef }) => (
      <Container ref={forwardedRef} testID="existing"><RN.Text>Hello</RN.Text></Container>
    );
  `;
  const development = runtime.screen(source);
  assert.match(development.code, /@agentlens\/react-native\/runtime/);
  assert.match(development.code, /collapsable: false/);
  assert.match(development.code, /testID: "existing"/);
  assert.match(development.code, /src\/screens\/ProbeScreen.tsx/);
  const existing = { current: null };
  const element = development.exports.Probe({ forwardedRef: existing });
  const node = nodeAt(0, 0);
  element.ref(node);
  assert.equal(existing.current, node);
  element.ref(null);
  assert.equal(existing.current, null);

  const production = runtime.screen(source, "production");
  assert.doesNotMatch(production.code, /agentLensCreateRef/);
  assert.doesNotMatch(production.code, /collapsable: false/);
});

test("the inspector reports missing Babel instrumentation instead of staying silent", async () => {
  const runtime = createRuntime();
  const { Inspector } = runtime.load("Inspector");
  let renderer;
  act(() => { renderer = create(React.createElement(Inspector)); });
  act(() => renderer.root.findByProps({ accessibilityLabel: "Open AgentLens inspector" }).props.onPress());
  assert.match(JSON.stringify(renderer.toJSON()), /No registered elements/);
  assert.match(JSON.stringify(renderer.toJSON()), /@agentlens\/babel-plugin/);
  act(() => renderer.root.findByProps({ accessibilityLabel: "Close AgentLens inspector" }).props.onPress());
  assert.equal(renderer.root.findAllByProps({ accessibilityLabel: "AgentLens inspect surface" }).length, 0);
  act(() => renderer.unmount());
});

test("instrumented repeated rows can be selected, annotated, copied, and closed", async () => {
  const copied = [];
  const runtime = createRuntime({}, { setString: (text) => copied.push(text) });
  const { AgentLens } = runtime.load("AgentLens");
  const { FeedbackPanel } = runtime.load("FeedbackPanel");
  const { Overlay } = runtime.load("Overlay");
  const { Probe } = runtime.screen(`
    import { View, Text } from "react-native";
    export function Probe() {
      return <View testID="verses">{[1, 2].map((id) => (
        <Text key={id} testID={"verse-" + id}>Verse {id}</Text>
      ))}</View>;
    }
  `).exports;
  const layouts = {
    verses: [0, 50, 390, 800],
    "verse-1": [20, 150, 300, 40],
    "verse-2": [20, 250, 300, 40],
    "AgentLens inspect surface": [0, 50, 390, 800]
  };
  let renderer;
  act(() => {
    renderer = create(React.createElement(AgentLens, null, React.createElement(Probe)), {
      createNodeMock(element) {
        const layout = layouts[element.props.testID ?? element.props.accessibilityLabel];
        return layout ? { measureInWindow: (callback) => callback(...layout) } : null;
      }
    });
  });
  assert.equal(runtime.load("registry").getAgentLensRegistrySize(), 3);
  act(() => renderer.root.findByProps({ accessibilityLabel: "Open AgentLens inspector" }).props.onPress());
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: "AgentLens inspect surface" }).props.onPress({
      nativeEvent: { locationX: 25, locationY: 110, pageX: 999, pageY: 999 }
    });
  });
  assert.equal(renderer.root.findByType(FeedbackPanel).props.selectedElement.layout.y, 150);
  assert.equal(renderer.root.findByType(Overlay).props.layout.y, 100);
  act(() => renderer.root.findByType("TextInput").props.onChangeText("Increase the verse spacing"));
  await act(async () => {
    const button = renderer.root.findAllByType("Pressable").find((item) =>
      item.findAllByType("Text").some((text) => text.children.includes("Copy Annotation"))
    );
    await button.props.onPress();
  });
  const annotation = JSON.parse(copied[0]);
  assert.equal(annotation.component, "Text");
  assert.equal(annotation.source.file, "src/screens/ProbeScreen.tsx");
  assert.equal(annotation.layout.y, 150);
  assert.equal(annotation.feedback, "Increase the verse spacing");
  assert.match(JSON.stringify(renderer.toJSON()), /Copied annotation/);

  act(() => renderer.root.findByProps({ accessibilityLabel: "Close AgentLens feedback" }).props.onPress());
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: "AgentLens inspect surface" }).props.onPress({
      nativeEvent: { locationX: 25, locationY: 210 }
    });
  });
  assert.equal(renderer.root.findByType(FeedbackPanel).props.selectedElement.layout.y, 250);
  assert.equal(renderer.root.findByType("TextInput").props.value, "");
  act(() => renderer.root.findByProps({ accessibilityLabel: "Close AgentLens inspector" }).props.onPress());
  assert.equal(renderer.root.findAllByType(FeedbackPanel).length, 0);
  act(() => renderer.unmount());
  assert.equal(runtime.load("registry").getAgentLensRegistrySize(), 0);
});

test("production runtime leaves application children unchanged", async () => {
  globalThis.__DEV__ = false;
  try {
    const runtime = createRuntime();
    const { AgentLens } = runtime.load("AgentLens");
    let renderer;
    act(() => { renderer = create(React.createElement(AgentLens, null, React.createElement("AppContent"))); });
    assert.equal(renderer.toJSON().type, "AppContent");
    assert.equal(runtime.load("registry").registerAgentLensElement(metadata, nodeAt(0, 0)), null);
    assert.equal(await runtime.load("registry").findAgentLensElementAtPoint(0, 0), null);
    act(() => renderer.unmount());
  } finally {
    delete globalThis.__DEV__;
  }
});
