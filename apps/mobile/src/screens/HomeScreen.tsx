import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from "react-native-vision-camera";
import { YStack, Button, Text, XStack } from "tamagui";
import { Activity, Video, Shield, AlertTriangle } from "@tamagui/lucide-icons";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../store";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { hasPermission: camOk, requestPermission: reqCam } =
    useCameraPermission();
  const { hasPermission: micOk, requestPermission: reqMic } =
    useMicrophonePermission();
  const quality = useAppStore((s) => s.quality);
  const audioEnabled = useAppStore((s) => s.audioEnabled);

  const device = useCameraDevice("back");
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    setPermissionsReady(camOk && (!audioEnabled || micOk));
  }, [camOk, micOk, audioEnabled]);

  const handleRequestPermissions = useCallback(async () => {
    await reqCam();
    if (audioEnabled) await reqMic();
  }, [reqCam, reqMic, audioEnabled]);

  const handleStartRecording = useCallback(() => {
    navigation.navigate("Recording", {});
  }, [navigation]);

  if (!permissionsReady) {
    return (
      <YStack f={1} bg="$background" ai="center" jc="center" p="$6" gap="$6">
        <AlertTriangle size={64} color="$yellow10" />
        <Text color="$color" fontSize="$6" fontWeight="700" ta="center">
          Camera Permission Required
        </Text>
        <Text color="$gray11" ta="center" fontSize="$4">
          DashCam needs camera access to record your drives.
          All video stays on your device.
        </Text>
        <Button
          onPress={handleRequestPermissions}
          bg="$blue10"
          color="white"
          size="$5"
          br="$4"
          pressStyle={{ bg: "$blue9" }}
        >
          Grant Permissions
        </Button>
      </YStack>
    );
  }

  return (
    <YStack f={1} bg="$background">
      {device ? (
        <Camera
          device={device}
          isActive={true}
          style={StyleSheet.absoluteFill}
          video={true}
          audio={audioEnabled && micOk}
        />
      ) : null}

      <YStack f={1} jc="flex-end" p="$6" gap="$4">
        <YStack
          bg="$background/90"
          p="$4"
          br="$6"
          gap="$3"
        >
          <XStack ai="center" gap="$2">
            <Shield size={18} color="$green10" />
            <Text color="$green10" fontSize="$3">
              All video stored on-device — No cloud upload
            </Text>
          </XStack>

          <Text color="$color" fontSize="$6" fontWeight="700">
            Ready to Record
          </Text>

          <XStack gap="$4">
            <Text color="$gray11" fontSize="$3">
              Quality: {quality}
            </Text>
            <Text color="$gray11" fontSize="$3">
              Audio: {audioEnabled && micOk ? "On" : "Off"}
            </Text>
            <Text color="$gray11" fontSize="$3">
              GPS: On
            </Text>
          </XStack>
        </YStack>

        <Button
          onPress={handleStartRecording}
          bg="$red10"
          color="white"
          size="$7"
          br="$6"
          pressStyle={{ bg: "$red9", scale: 0.97 }}
          icon={<Activity size={28} />}
          animation="quick"
        >
          Start Recording
        </Button>

        <XStack gap="$4" jc="center">
          <Button
            chromeless
            icon={<Video size={18} />}
            onPress={() => navigation.navigate("Gallery")}
          >
            <Text color="$gray11">Gallery</Text>
          </Button>
          <Button
            chromeless
            onPress={() => navigation.navigate("Settings")}
          >
            <Text color="$gray11">Settings</Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
