import { StyleSheet, View } from "react-native";

import type { ElementLayout } from "./types";

interface OverlayProps {
  layout: ElementLayout;
}

export function Overlay({ layout }: OverlayProps) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View
        style={[
          styles.highlight,
          {
            left: layout.x,
            top: layout.y,
            width: layout.width,
            height: layout.height
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20
  },
  highlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#12b981",
    backgroundColor: "rgba(18, 185, 129, 0.14)",
    borderRadius: 6
  }
});
