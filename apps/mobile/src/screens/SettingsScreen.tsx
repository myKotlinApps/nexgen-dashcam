import React from "react";
import { ScrollView } from "react-native";
import { YStack, Text, XStack, Switch, Separator, Button } from "tamagui";
import { Info, Shield, MapPin, Mic, Camera, ScanEye } from "@tamagui/lucide-icons";

import { useAppStore } from "../store";

export function SettingsScreen() {
  const {
    quality,
    audioEnabled,
    gpsEnabled,
    alprEnabled,
    plateCityLookup,
    storageLimitMB,
    setQuality,
    toggleAudio,
    toggleGps,
    toggleAlpr,
    togglePlateCityLookup,
  } = useAppStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <YStack p="$6" gap="$6">
        <Text color="$color" fontSize="$7" fontWeight="700">
          Settings
        </Text>

        <YStack gap="$4">
          <Text color="$gray10" fontSize="$3" tt="uppercase" fontWeight="600">
            Recording
          </Text>
          <YStack bg="$gray2" br="$4" p="$4" gap="$3">
            <XStack ai="center" jc="space-between">
              <XStack ai="center" gap="$2">
                <Camera size={18} color="$blue10" />
                <Text color="$color">Video Quality</Text>
              </XStack>
              <XStack gap="$2">
                <Button
                  size="$3"
                  bg={quality === "720p" ? "$blue10" : "$gray5"}
                  onPress={() => setQuality("720p")}
                >
                  720p
                </Button>
                <Button
                  size="$3"
                  bg={quality === "1080p" ? "$blue10" : "$gray5"}
                  onPress={() => setQuality("1080p")}
                >
                  1080p
                </Button>
              </XStack>
            </XStack>

            <Separator />

            <XStack ai="center" jc="space-between">
              <XStack ai="center" gap="$2">
                <Mic size={18} color={audioEnabled ? "$green10" : "$gray10"} />
                <Text color="$color">Audio Recording</Text>
              </XStack>
              <Switch
                checked={audioEnabled}
                onCheckedChange={toggleAudio}
                bg={audioEnabled ? "$green10" : "$gray5"}
              >
                <Switch.Thumb animation="quick" />
              </Switch>
            </XStack>
          </YStack>
        </YStack>

        <YStack gap="$4">
          <Text color="$gray10" fontSize="$3" tt="uppercase" fontWeight="600">
            Telemetry
          </Text>
          <YStack bg="$gray2" br="$4" p="$4" gap="$3">
            <XStack ai="center" jc="space-between">
              <XStack ai="center" gap="$2">
                <MapPin size={18} color={gpsEnabled ? "$green10" : "$gray10"} />
                <Text color="$color">GPS & Speed</Text>
              </XStack>
              <Switch
                checked={gpsEnabled}
                onCheckedChange={toggleGps}
                bg={gpsEnabled ? "$green10" : "$gray5"}
              >
                <Switch.Thumb animation="quick" />
              </Switch>
            </XStack>

            <Separator />

            <XStack ai="center" jc="space-between">
              <XStack ai="center" gap="$2">
                <ScanEye size={18} color={alprEnabled ? "$green10" : "$gray10"} />
                <Text color="$color">Live Plate Recognition</Text>
              </XStack>
              <Switch
                checked={alprEnabled}
                onCheckedChange={toggleAlpr}
                bg={alprEnabled ? "$green10" : "$gray5"}
              >
                <Switch.Thumb animation="quick" />
              </Switch>
            </XStack>

            {alprEnabled && (
              <XStack ai="center" jc="space-between">
                <XStack ai="center" gap="$2">
                  <Info size={18} color="$yellow10" />
                  <Text color="$color">Show City & Province</Text>
                </XStack>
                <Switch
                  checked={plateCityLookup}
                  onCheckedChange={togglePlateCityLookup}
                  bg={plateCityLookup ? "$green10" : "$gray5"}
                >
                  <Switch.Thumb animation="quick" />
                </Switch>
              </XStack>
            )}
          </YStack>
        </YStack>

        <YStack bg="$gray2" br="$4" p="$4" gap="$2">
          <XStack ai="center" gap="$2">
            <Shield size={18} color="$green10" />
            <Text color="$green10" fontSize="$3" fontWeight="600">
              Privacy by Design
            </Text>
          </XStack>
          <Text color="$gray11" fontSize="$2">
            All recording and plate recognition happens on-device. Nothing is
            uploaded without your consent. You can delete plate data independently
            from video.
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
