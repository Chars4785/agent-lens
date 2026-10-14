import { StatusBar } from "expo-status-bar";
import { AgentLens } from "@agentlens/react-native";

import { LoginScreen } from "./src/screens/LoginScreen";

export default function App() {
  return (
    <AgentLens>
      <StatusBar style="dark" />
      <LoginScreen />
    </AgentLens>
  );
}
