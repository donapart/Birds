# Add project specific ProGuard rules here.

# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# BirdSound specific
-keep class com.birdsound.** { *; }

# Audio processing
-keep class * implements android.media.AudioRecord { *; }
-keep class * implements android.media.AudioTrack { *; }
