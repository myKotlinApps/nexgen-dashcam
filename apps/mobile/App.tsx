import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider } from "tamagui";

import config from "./tamagui.config";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppStore } from "./src/store/appStore";

export default function App() {
  const colorScheme = useAppStore((s) => s.theme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme={colorScheme ?? "dark"}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SafeAreaProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
