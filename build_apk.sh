#!/bin/bash
export JAVA_HOME=$JAVA_HOME_17_X64
export PATH=$JAVA_HOME_17_X64/bin:$PATH
java -version
echo "Using Java from: $JAVA_HOME"
cd frontend/android
chmod +x gradlew
./gradlew clean assembleDebug --no-daemon --info