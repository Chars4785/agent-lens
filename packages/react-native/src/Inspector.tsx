import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { GestureResponderEvent } from "react-native";

import { FeedbackPanel } from "./FeedbackPanel";
import { Overlay } from "./Overlay";
import { findAgentLensElementAtPoint } from "./registry";
import type { AgentLensSelectedElement } from "./types";

export function Inspector() {
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<AgentLensSelectedElement | null>(null);

  const selectElement = useCallback(async (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const nextSelectedElement = await findAgentLensElementAtPoint(pageX, pageY);
    setSelectedElement(nextSelectedElement);
  }, []);

  function toggleInspectMode() {
    setInspectMode((current) => {
      const next = !current;

      if (!next) {
        setSelectedElement(null);
      }

      return next;
    });
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {inspectMode ? (
        <Pressable
          accessibilityLabel="AgentLens inspect surface"
          onPress={selectElement}
          style={styles.tapSurface}
        />
      ) : null}

      {selectedElement ? <Overlay layout={selectedElement.layout} /> : null}

      {selectedElement ? (
        <FeedbackPanel
          onClose={() => setSelectedElement(null)}
          selectedElement={selectedElement}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          inspectMode ? "Disable AgentLens inspect mode" : "Enable AgentLens inspect mode"
        }
        onPress={toggleInspectMode}
        style={[
          styles.floatingButton,
          inspectMode ? styles.floatingButtonActive : null
        ]}
      >
        <Text style={styles.floatingButtonText}>
          {inspectMode ? "Inspect" : "Lens"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tapSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.03)"
  },
  floatingButton: {
    position: "absolute",
    right: 18,
    bottom: 32,
    zIndex: 40,
    minWidth: 58,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "#111827",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  floatingButtonActive: {
    backgroundColor: "#12b981"
  },
  floatingButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  }
});
