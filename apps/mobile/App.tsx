import "react-native-gesture-handler";
import "react-native-reanimated";

import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider, Text, Spinner, YStack } from "tamagui";
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

SplashScreen.preventAutoHideAsync();

export default function App() {
  const colorScheme = useAppStore((s) => s.theme);
  const [fontsLoaded, fontError] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
        <YStack f={1} ai="center" jc="center" gap="$3">
          <Spinner size="large" color="$blue10" />
        </YStack>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TamaguiProvider config={config} defaultTheme={colorScheme ?? "dark"}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SafeAreaProvider>
        </TamaguiProvider>
      </GestureHandlerRootView>
    </View>
  );
}
