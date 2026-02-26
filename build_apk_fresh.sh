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

# Create keystore if doesn't exist
if [ ! -f "app/goldan-release-key.jks" ]; then
    echo "Creating release keystore..."
    keytool -genkeypair -v -keystore app/goldan-release-key.jks \
        -alias goldan-key -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass goldan123456 -keypass goldan123456 \
        -dname "CN=Goldan, OU=Plant Care, O=Goldan, L=Tehran, ST=Tehran, C=IR"
fi

# Set environment variables for signing
export KEYSTORE_FILE=goldan-release-key.jks
export KEYSTORE_PASSWORD=goldan123456
export KEY_ALIAS=goldan-key
export KEY_PASSWORD=goldan123456

./gradlew clean assembleRelease --no-daemon