import React from "react";
import { YStack, Text } from "tamagui";

import { useAppStore } from "../store";

export function RecordingScreen() {
  const quality = useAppStore((s) => s.quality);

  return (
    <YStack f={1} bg="$background" ai="center" jc="center" gap="$4" p="$6">
      <Text color="$red10" fontSize="$8" fontWeight="900">
        ● REC
      </Text>
      <Text color="$gray11" fontSize="$4">
        Recording at {quality} · Segment 00:02:15
      </Text>
      <Text color="$gray9" fontSize="$3">
        Storage: 6.8 GB free · Temp: 42°C
      </Text>
    </YStack>
  );
}
