import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { LayoutChangeEvent } from "react-native";

const BUTTON_WIDTH = 108;
const BUTTON_HEIGHT = 44;
const EDGE_MARGIN = 8;
const DRAG_THRESHOLD = 8;

interface FloatingButtonProps {
  onPress: () => void;
  visible: boolean;
}

export function FloatingButton({ onPress, visible }: FloatingButtonProps) {
  const translation = useRef(new Animated.ValueXY()).current;
  const bounds = useRef({ width: 0, height: 0 });
  const position = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  const moveTo = useCallback((x: number, y: number) => {
    const { width, height } = bounds.current;
    const maxX = Math.max(0, width - Math.min(BUTTON_WIDTH, width) - EDGE_MARGIN);
    const maxY = Math.max(0, height - Math.min(BUTTON_HEIGHT, height) - EDGE_MARGIN);
    const next = {
      x: Math.max(Math.min(EDGE_MARGIN, maxX), Math.min(x, maxX)),
      y: Math.max(Math.min(EDGE_MARGIN, maxY), Math.min(y, maxY))
    };
    position.current = next;
    translation.setValue(next);
  }, [translation]);

  const panResponder = useMemo(() => {
    const shouldDrag = (_event: unknown, gesture: { dx: number; dy: number }) =>
      Math.hypot(gesture.dx, gesture.dy) > DRAG_THRESHOLD;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: shouldDrag,
      onMoveShouldSetPanResponderCapture: shouldDrag,
      onPanResponderGrant: () => {
        dragStart.current = { ...position.current };
        didDrag.current = true;
        setDragging(true);
      },
      onPanResponderMove: (_event, gesture) => {
        moveTo(dragStart.current.x + gesture.dx, dragStart.current.y + gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        moveTo(dragStart.current.x + gesture.dx, dragStart.current.y + gesture.dy);
        setDragging(false);
      },
      onPanResponderTerminate: () => setDragging(false),
      onPanResponderTerminationRequest: () => false
    });
  }, [moveTo]);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    bounds.current = { width, height };
    if (ready) {
      moveTo(position.current.x, position.current.y);
    } else {
      moveTo(width - BUTTON_WIDTH - 18, height - BUTTON_HEIGHT - 32);
      setReady(true);
    }
  }

  return (
    <SafeAreaView
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      pointerEvents={visible ? "box-none" : "none"}
      style={[styles.layer, { opacity: visible && ready ? 1 : 0 }]}
    >
      <View onLayout={handleLayout} pointerEvents="box-none" style={styles.container}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.position, { transform: translation.getTranslateTransform() }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AgentLens inspector"
            accessibilityHint="Drag to reposition the button."
            accessibilityActions={[
              { name: "activate", label: "Open inspector" },
              { name: "moveUp", label: "Move up" },
              { name: "moveDown", label: "Move down" },
              { name: "moveLeft", label: "Move left" },
              { name: "moveRight", label: "Move right" }
            ]}
            onAccessibilityAction={(event) => {
              const { actionName } = event.nativeEvent;
              if (actionName === "activate") {
                onPress();
              } else {
                const step = 44;
                moveTo(
                  position.current.x + (actionName === "moveRight" ? step : actionName === "moveLeft" ? -step : 0),
                  position.current.y + (actionName === "moveDown" ? step : actionName === "moveUp" ? -step : 0)
                );
              }
            }}
            onAccessibilityTap={onPress}
            onPressIn={() => { didDrag.current = false; }}
            onPress={() => { if (!didDrag.current) onPress(); }}
            style={[styles.button, dragging ? styles.dragging : null]}
          >
            <Text maxFontSizeMultiplier={1.2} style={styles.label}>AgentLens</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject
  },
  container: {
    flex: 1
  },
  position: {
    position: "absolute",
    left: 0,
    top: 0,
    maxWidth: "100%",
    maxHeight: "100%"
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    maxWidth: "100%",
    maxHeight: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#111827",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  dragging: {
    backgroundColor: "#047857"
  },
  label: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  }
});
