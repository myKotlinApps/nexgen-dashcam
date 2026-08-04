import React from "react";
import { YStack, Text, XStack } from "tamagui";
import { FileVideo, Lock } from "@tamagui/lucide-icons";

export function GalleryScreen() {
  return (
    <YStack f={1} bg="$background" p="$6" gap="$4">
      <Text color="$color" fontSize="$7" fontWeight="700">
        Trip Gallery
      </Text>
      <XStack gap="$3">
        <YStack
          bg="$gray3"
          p="$4"
          br="$4"
          f={1}
          ai="center"
          gap="$2"
        >
          <FileVideo size={24} color="$gray10" />
          <Text color="$gray11" fontSize="$2" ta="center">
            No recordings yet
          </Text>
        </YStack>
        <YStack
          bg="$gray3"
          p="$4"
          br="$4"
          f={1}
          ai="center"
          gap="$2"
        >
          <Lock size={24} color="$gray10" />
          <Text color="$gray11" fontSize="$2" ta="center">
            No protected clips
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}
