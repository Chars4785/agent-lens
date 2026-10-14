import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const CHECKMARK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJUlEQVR4AWMY2bNnzwAHmJiYGBgYGBhGhgYGJgYqkGJAAABO3QIFxMVdLgAAAABJRU5ErkJggg==";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [lastAction, setLastAction] = useState("No action yet");

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Image
            accessibilityLabel="AgentLens checkmark"
            source={{ uri: CHECKMARK_IMAGE }}
            style={styles.image}
          />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>AgentLens V0.1</Text>
            <Text style={styles.title}>Login Screen</Text>
          </View>
        </View>

        <Text style={styles.body}>
          Enable AgentLens, tap an element, add feedback, and copy the source
          annotation.
        </Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="email@example.com"
          style={styles.input}
          value={email}
        />

        <Pressable
          onPress={() => setLastAction("Login pressed")}
          style={({ pressed }) => [
            styles.loginButton,
            pressed ? styles.buttonPressed : null
          ]}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </Pressable>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setLastAction("Forgot password pressed")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Normal app action</Text>
          <Text style={styles.resultText}>{lastAction}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6"
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#d1fae5"
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    marginTop: 2,
    color: "#111827",
    fontSize: 26,
    fontWeight: "800"
  },
  body: {
    marginTop: 18,
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 22
  },
  input: {
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    color: "#111827",
    backgroundColor: "#ffffff"
  },
  loginButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 6,
    backgroundColor: "#111827"
  },
  buttonPressed: {
    opacity: 0.82
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  secondaryButtonText: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "700"
  },
  resultBox: {
    marginTop: 18,
    padding: 12,
    borderRadius: 6,
    backgroundColor: "#f9fafb"
  },
  resultLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  resultText: {
    marginTop: 4,
    color: "#111827",
    fontSize: 15
  }
});
