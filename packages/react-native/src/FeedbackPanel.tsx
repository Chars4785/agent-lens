import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createAgentLensAnnotation,
  formatAgentLensAnnotation
} from "./annotation";
import { copyTextToClipboard } from "./clipboard";
import type { AgentLensSelectedElement } from "./types";

interface FeedbackPanelProps {
  selectedElement: AgentLensSelectedElement;
  onClose: () => void;
}

export function FeedbackPanel({
  selectedElement,
  onClose
}: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const annotationJson = useMemo(() => {
    return formatAgentLensAnnotation(
      createAgentLensAnnotation(selectedElement, feedback)
    );
  }, [feedback, selectedElement]);

  const source = selectedElement.metadata.source;
  const layout = selectedElement.layout;

  async function copyAnnotation() {
    const copied = await copyTextToClipboard(annotationJson);
    setCopyState(copied ? "copied" : "failed");
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.componentName}>
            {selectedElement.metadata.component}
          </Text>
          <Text style={styles.sourceText}>
            {source.file}:{source.line}:{source.column}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close AgentLens feedback"
          hitSlop={12}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>x</Text>
        </Pressable>
      </View>

      <Text style={styles.layoutText}>
        {Math.round(layout.width)} x {Math.round(layout.height)} at{" "}
        {Math.round(layout.x)}, {Math.round(layout.y)}
      </Text>

      <TextInput
        multiline
        onChangeText={(value) => {
          setFeedback(value);
          setCopyState("idle");
        }}
        placeholder="What should change?"
        placeholderTextColor="#6b7280"
        style={styles.input}
        value={feedback}
      />

      <View style={styles.actions}>
        <Text
          numberOfLines={1}
          style={[
            styles.copyState,
            copyState === "failed" ? styles.copyFailed : null
          ]}
        >
          {copyState === "copied"
            ? "Copied annotation"
            : copyState === "failed"
              ? "Clipboard unavailable"
              : " "}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={copyAnnotation}
          style={styles.copyButton}
        >
          <Text style={styles.copyText}>Copy Annotation</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#111827",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  componentName: {
    color: "#f9fafb",
    fontSize: 17,
    fontWeight: "700"
  },
  sourceText: {
    marginTop: 4,
    color: "#9ca3af",
    fontSize: 13
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#374151"
  },
  closeText: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700"
  },
  layoutText: {
    marginTop: 10,
    color: "#d1d5db",
    fontSize: 13
  },
  input: {
    minHeight: 88,
    marginTop: 14,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#374151",
    color: "#f9fafb",
    backgroundColor: "#030712",
    textAlignVertical: "top"
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  copyState: {
    flex: 1,
    color: "#6ee7b7",
    fontSize: 13
  },
  copyFailed: {
    color: "#fca5a5"
  },
  copyButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#12b981"
  },
  copyText: {
    color: "#052e1b",
    fontSize: 14,
    fontWeight: "700"
  }
});
