# NexGen DashCam — ProGuard/R8 rules

# Keep React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep native module bridge
-keep class com.nexgen.dashcam.** { *; }

# CameraX
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# MLKit
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# ONNX Runtime
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# General
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Strip logs in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(...);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Remove unused resources
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
