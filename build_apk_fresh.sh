#!/bin/bash
set -e

export JAVA_HOME=$JAVA_HOME_17_X64
export PATH=$JAVA_HOME_17_X64/bin:$PATH
java -version
echo "Using Java from: $JAVA_HOME"

# Create keystore in project root (outside android folder so it survives rebuild)
if [ ! -f "goldan-release-key.jks" ]; then
    echo "Creating release keystore..."
    keytool -genkeypair -v -keystore goldan-release-key.jks \
        -alias goldan-key -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass goldan123456 -keypass goldan123456 \
        -dname "CN=Goldan, OU=Plant Care, O=Goldan, L=Tehran, ST=Tehran, C=IR"
fi

# Remove old Android project
rm -rf frontend/android

# Reinstall Capacitor with correct versions
cd frontend
npm install

# Build React app
CI=false npm run build

# Regenerate Android project
npx cap add android

# Sync to Android
npx cap sync android

# === Upgrade Android Gradle Plugin to support compileSdk 35 ===
echo "Upgrading Android Gradle Plugin..."
PROJECT_GRADLE="android/build.gradle"
sed -i "s/classpath 'com.android.tools.build:gradle:8.0.0'/classpath 'com.android.tools.build:gradle:8.2.2'/" "$PROJECT_GRADLE"
echo "AGP version updated to 8.2.2"

# Upgrade Gradle wrapper to 8.4 (required for AGP 8.2.x)
echo "Upgrading Gradle wrapper to 8.4..."
sed -i 's|gradle-8.0.2-all.zip|gradle-8.4-all.zip|' "android/gradle/wrapper/gradle-wrapper.properties"

# Add suppress warning to gradle.properties
echo "" >> "android/gradle.properties"
echo "android.suppressUnsupportedCompileSdk=35" >> "android/gradle.properties"

# === Force targetSdkVersion and compileSdkVersion to 35 ===
echo "Updating SDK versions to 35..."
VARIABLES_FILE="android/variables.gradle"
sed -i 's/compileSdkVersion = .*/compileSdkVersion = 35/' "$VARIABLES_FILE"
sed -i 's/targetSdkVersion = .*/targetSdkVersion = 35/' "$VARIABLES_FILE"
sed -i 's/minSdkVersion = .*/minSdkVersion = 24/' "$VARIABLES_FILE"

# Also update build.gradle directly in case variables.gradle is not used
sed -i 's/compileSdk .*/compileSdk 35/' "android/app/build.gradle"
sed -i 's/targetSdkVersion .*/targetSdkVersion 35/' "android/app/build.gradle"
sed -i 's/minSdkVersion .*/minSdkVersion 24/' "android/app/build.gradle"

echo "SDK versions updated:"
grep -E "compileSdk|targetSdk|minSdk" "$VARIABLES_FILE"

# Copy new app icons from resources
if [ -d "resources/res" ]; then
    echo "Copying custom app icons..."
    cp -rf resources/res/mipmap-hdpi/* android/app/src/main/res/mipmap-hdpi/
    cp -rf resources/res/mipmap-mdpi/* android/app/src/main/res/mipmap-mdpi/
    cp -rf resources/res/mipmap-xhdpi/* android/app/src/main/res/mipmap-xhdpi/
    cp -rf resources/res/mipmap-xxhdpi/* android/app/src/main/res/mipmap-xxhdpi/
    cp -rf resources/res/mipmap-xxxhdpi/* android/app/src/main/res/mipmap-xxxhdpi/
    mkdir -p android/app/src/main/res/mipmap-anydpi-v26/
    cp -rf resources/res/mipmap-anydpi-v26/* android/app/src/main/res/mipmap-anydpi-v26/
    echo "Icons copied successfully"
fi

# Copy keystore into android app folder
cp ../goldan-release-key.jks android/app/goldan-release-key.jks

# Inject signing config into build.gradle
cd android

GRADLE_FILE="app/build.gradle"
echo "Injecting signing config into build.gradle..."

# Use sed to add signingConfigs block after compileSdk line
sed -i '/compileSdk/a\
\
    signingConfigs {\
        release {\
            storeFile file("goldan-release-key.jks")\
            storePassword "goldan123456"\
            keyAlias "goldan-key"\
            keyPassword "goldan123456"\
        }\
    }' "$GRADLE_FILE"

# Update release buildType to use signingConfig
sed -i 's/minifyEnabled false/minifyEnabled false\n            signingConfig signingConfigs.release/' "$GRADLE_FILE"

echo "=== Final build.gradle ==="
cat "$GRADLE_FILE"
echo "==========================="

chmod +x gradlew
./gradlew clean assembleRelease --no-daemon

echo ""
echo "=== Build Complete ==="
ls -la app/build/outputs/apk/release/ || echo "Release APK not found, checking debug..."
ls -la app/build/outputs/apk/debug/ 2>/dev/null || true