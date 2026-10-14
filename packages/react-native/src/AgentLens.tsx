import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { isAgentLensDevelopment } from "./development";
import { Inspector } from "./Inspector";
import type { AgentLensProps } from "./types";

export function AgentLens({ children, enabled = true }: AgentLensProps) {
  if (!enabled || !isAgentLensDevelopment()) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <View style={styles.root}>
      {children}
      <Inspector />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
