import "react-native-gesture-handler";
import "react-native-reanimated";

import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Spinner, TamaguiProvider, YStack } from "tamagui";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from "@expo-google-fonts/vazirmatn";

import config from "./tamagui.config";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppStore } from "./src/store/appStore";
import { applyLayoutDirection } from "./src/i18n/locale";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen may already be hidden during fast refresh.
});

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const [fontsLoaded, fontError] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
  });

  useEffect(() => {
    applyLayoutDirection();
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Render the app once fonts resolve. A font error is not fatal — the system
  // typeface is used instead so recording is never blocked by an asset.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
        <YStack f={1} ai="center" jc="center">
          <Spinner size="large" color="$blue10" />
        </YStack>
      </View>
    );
  }

  // "system" is resolved by Tamagui itself, so only map the explicit choices.
  const resolvedTheme = theme === "system" ? undefined : theme;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TamaguiProvider config={config} defaultTheme={resolvedTheme ?? "dark"}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SafeAreaProvider>
        </TamaguiProvider>
      </GestureHandlerRootView>
    </View>
  );
}
