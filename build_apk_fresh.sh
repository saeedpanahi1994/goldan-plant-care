#!/bin/bash
export JAVA_HOME=$JAVA_HOME_17_X64
export PATH=$JAVA_HOME_17_X64/bin:$PATH
java -version
echo "Using Java from: $JAVA_HOME"

# Remove old Android project
rm -rf frontend/android

# Reinstall Capacitor with correct versions
cd frontend
npm install

# Regenerate Android project
npx cap add android

# Build React app
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android
chmod +x gradlew
./gradlew clean assembleDebug --no-daemon