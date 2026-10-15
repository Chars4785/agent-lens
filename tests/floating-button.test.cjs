const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { act, create } = require("react-test-renderer");
const { createRuntime } = require("./helpers/runtime.cjs");

function setup() {
  const { FloatingButton } = createRuntime().load("FloatingButton");
  let presses = 0;
  const onPress = () => { presses += 1; };
  let renderer;
  act(() => { renderer = create(React.createElement(FloatingButton, { onPress, visible: true })); });
  function layout(width, height) {
    act(() => renderer.root.findByType("View").props.onLayout({ nativeEvent: { layout: { width, height } } }));
  }
  layout(390, 844);
  const wrapper = () => renderer.root.findByType("AnimatedView");
  const button = () => renderer.root.findByType("Pressable");
  function position() {
    const transform = wrapper().props.style[1].transform;
    return { x: transform[0].translateX.__getValue(), y: transform[1].translateY.__getValue() };
  }
  function drag(dx, dy, terminate = false) {
    act(() => button().props.onPressIn());
    act(() => wrapper().props.onPanResponderGrant());
    act(() => wrapper().props.onPanResponderMove({}, { dx, dy }));
    act(() => terminate
      ? wrapper().props.onPanResponderTerminate()
      : wrapper().props.onPanResponderRelease({}, { dx, dy }));
  }
  function visible(value) {
    act(() => renderer.update(React.createElement(FloatingButton, { onPress, visible: value })));
  }
  return { renderer, wrapper, button, position, drag, layout, visible, presses: () => presses };
}

test("small finger movements remain taps and diagonal drags exceed the threshold", () => {
  const app = setup();
  const handlers = app.wrapper().props;
  assert.equal(handlers.onStartShouldSetPanResponder(), false);
  assert.equal(handlers.onMoveShouldSetPanResponder({}, { dx: 3, dy: 4 }), false);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture({}, { dx: 6, dy: 6 }), true);
  act(() => app.button().props.onPressIn());
  act(() => app.button().props.onPress());
  assert.equal(app.presses(), 1);
  act(() => app.renderer.unmount());
});

test("dragging freely moves the launcher without opening the inspector", () => {
  const app = setup();
  assert.deepEqual(app.position(), { x: 264, y: 768 });
  app.drag(-100, -200);
  assert.deepEqual(app.position(), { x: 164, y: 568 });
  act(() => app.button().props.onPress());
  assert.equal(app.presses(), 0);
  act(() => app.button().props.onPressIn());
  act(() => app.button().props.onPress());
  assert.equal(app.presses(), 1);
  act(() => app.renderer.unmount());
});

test("the position survives opening and closing the inspector", () => {
  const app = setup();
  app.drag(-100, -200);
  app.visible(false);
  assert.equal(app.renderer.root.findByType("SafeAreaView").props.pointerEvents, "none");
  app.visible(true);
  assert.deepEqual(app.position(), { x: 164, y: 568 });
  assert.equal(app.renderer.root.findByType("SafeAreaView").props.accessibilityElementsHidden, false);
  act(() => app.renderer.unmount());
});

test("dragging past any edge keeps the whole launcher inside the available area", () => {
  const app = setup();
  app.drag(10000, 10000);
  assert.deepEqual(app.position(), { x: 274, y: 792 });
  app.drag(-10000, -10000);
  assert.deepEqual(app.position(), { x: 8, y: 8 });
  act(() => app.renderer.unmount());
});

test("rotation or a smaller parent clamps the existing position to the new bounds", () => {
  const app = setup();
  app.layout(240, 320);
  assert.deepEqual(app.position(), { x: 124, y: 268 });
  app.layout(80, 30);
  assert.deepEqual(app.position(), { x: 0, y: 0 });
  act(() => app.renderer.unmount());
});

test("an interrupted drag keeps its last position and does not activate the inspector", () => {
  const app = setup();
  app.drag(-100, -200, true);
  assert.deepEqual(app.position(), { x: 164, y: 568 });
  act(() => app.button().props.onPress());
  assert.equal(app.presses(), 0);
  app.drag(-50, -50);
  assert.deepEqual(app.position(), { x: 114, y: 518 });
  act(() => app.renderer.unmount());
});

test("screen reader actions can move and activate the launcher without dragging", () => {
  const app = setup();
  act(() => app.button().props.onAccessibilityAction({ nativeEvent: { actionName: "moveUp" } }));
  assert.deepEqual(app.position(), { x: 264, y: 724 });
  act(() => app.button().props.onAccessibilityAction({ nativeEvent: { actionName: "moveLeft" } }));
  assert.deepEqual(app.position(), { x: 220, y: 724 });
  act(() => app.button().props.onAccessibilityAction({ nativeEvent: { actionName: "activate" } }));
  assert.equal(app.presses(), 1);
  act(() => app.renderer.unmount());
});
