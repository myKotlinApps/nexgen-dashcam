plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.nexgen.dashcam"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.nexgen.dashcam"
        minSdk = 21  // Android 5.0 for CameraX; 24 (7.0) recommended
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug { isDebuggable = true; applicationIdSuffix = ".debug" }
    }

    flavorDimensions += "target"
    productFlavors {
        create("standard") {
            dimension = "target"
            minSdk = 21  // Full CameraX, EIS software always
        }
        create("legacy") {
            dimension = "target"
            minSdk = 21  // Android 5.0 minimum
            versionNameSuffix = "-legacy"
        }
    }

    buildFeatures { compose = false; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }

    packaging {
        jniLibs { useLegacyPackaging = false }
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.camera:camera-core:1.4.0")
    implementation("androidx.camera:camera-camera2:1.4.0")
    implementation("androidx.camera:camera-lifecycle:1.4.0")
    implementation("androidx.camera:camera-video:1.4.0")
    implementation("androidx.camera:camera-view:1.4.0")
    implementation("com.google.mlkit:text-recognition:16.0.1")
    implementation("com.facebook.react:react-android:0.76.9")
}
