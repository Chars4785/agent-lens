import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { GestureResponderEvent } from "react-native";

import { FeedbackPanel } from "./FeedbackPanel";
import { FloatingButton } from "./FloatingButton";
import { Overlay } from "./Overlay";
import {
  getAgentLensRegistrySize,
  inspectAgentLensPoint,
  measureAgentLensNode,
  subscribeAgentLensRegistry
} from "./registry";
import type { AgentLensSelectedElement } from "./types";

type SelectionStatus = "ready" | "measuring" | "miss" | "unmeasurable" | "failed";

export function Inspector() {
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<AgentLensSelectedElement | null>(null);
  const [status, setStatus] = useState<SelectionStatus>("ready");
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const surfaceRef = useRef<View>(null);
  const selectionRequest = useRef(0);
  const elementCount = useSyncExternalStore(
    subscribeAgentLensRegistry,
    getAgentLensRegistrySize,
    () => 0
  );

  useEffect(() => () => { selectionRequest.current += 1; }, []);

  async function selectElement(event: GestureResponderEvent) {
    const { locationX, locationY } = event.nativeEvent;
    const request = ++selectionRequest.current;
    Keyboard.dismiss();
    setSelectedElement(null);
    setStatus("measuring");

    try {
      const surfaceLayout = await measureAgentLensNode(surfaceRef.current);
      if (!surfaceLayout) {
        if (request === selectionRequest.current) {
          setStatus("failed");
        }
        return;
      }

      // Touch locations and native measurements must share window coordinates.
      const result = await inspectAgentLensPoint(
        surfaceLayout.x + locationX,
        surfaceLayout.y + locationY
      );
      if (request !== selectionRequest.current) {
        return;
      }

      setOrigin({ x: surfaceLayout.x, y: surfaceLayout.y });
      setSelectedElement(result.selectedElement);
      setStatus(result.selectedElement || result.registeredCount === 0
        ? "ready"
        : result.measuredCount === 0 ? "unmeasurable" : "miss");
    } catch {
      if (request === selectionRequest.current) {
        setStatus("failed");
      }
    }
  }

  function closeSelection() {
    selectionRequest.current += 1;
    Keyboard.dismiss();
    setSelectedElement(null);
    setStatus("ready");
  }

  function closeInspector() {
    closeSelection();
    setInspectMode(false);
  }

  const message = elementCount === 0
    ? "No registered elements. Check @agentlens/babel-plugin and restart Metro with a cleared cache."
    : status === "unmeasurable"
      ? "Registered elements could not be measured."
      : status === "miss"
        ? "No registered element at this position."
        : status === "failed"
          ? "Element measurement failed."
          : null;

  return (
    <View pointerEvents="box-none" style={styles.launcherLayer}>
      <FloatingButton
        onPress={() => {
          Keyboard.dismiss();
          setInspectMode(true);
        }}
        visible={!inspectMode}
      />

      <Modal
        animationType="none"
        onRequestClose={closeInspector}
        presentationStyle="overFullScreen"
        transparent
        visible={inspectMode}
      >
        <View style={styles.inspectorRoot}>
          <Pressable
            ref={surfaceRef}
            accessibilityLabel="AgentLens inspect surface"
            collapsable={false}
            onPress={selectElement}
            style={styles.tapSurface}
          />

          {selectedElement ? (
            <Overlay layout={{
              ...selectedElement.layout,
              x: selectedElement.layout.x - origin.x,
              y: selectedElement.layout.y - origin.y
            }} />
          ) : null}

          <SafeAreaView pointerEvents="box-none" style={styles.chrome}>
            <View style={styles.toolbar}>
              <View style={styles.toolbarTitle}>
                <Text style={styles.brand}>AgentLens</Text>
                <Text style={styles.count}>{elementCount} elements</Text>
              </View>
              {status === "measuring" ? (
                <ActivityIndicator accessibilityLabel="Measuring elements" color="#059669" />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close AgentLens inspector"
                onPress={closeInspector}
                style={styles.doneButton}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>

            {message ? (
              <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
            ) : null}

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              pointerEvents="box-none"
              style={styles.feedbackContainer}
            >
              {selectedElement ? (
                <FeedbackPanel
                  key={selectedElement.instanceId ?? selectedElement.metadata.id}
                  onClose={closeSelection}
                  selectedElement={selectedElement}
                />
              ) : null}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  launcherLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10
  },
  inspectorRoot: {
    flex: 1
  },
  tapSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.03)"
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db"
  },
  toolbarTitle: {
    flex: 1
  },
  brand: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  count: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563"
  },
  doneButton: {
    minWidth: 56,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  doneText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857"
  },
  message: {
    padding: 16,
    fontSize: 13,
    lineHeight: 20,
    color: "#991b1b",
    backgroundColor: "#fef2f2"
  },
  feedbackContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16
  }
});
