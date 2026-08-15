import fs from 'node:fs';

const gradlePath = 'android/app/build.gradle';
if (!fs.existsSync(gradlePath)) throw new Error('Capacitor Android project was not generated.');

let gradle = fs.readFileSync(gradlePath, 'utf8');
const versionCode = Math.max(1, Number(process.env.SMOKESTACK_ANDROID_VERSION_CODE) || 1);
const versionName = String(process.env.SMOKESTACK_ANDROID_VERSION_NAME || '0.02A').replace(/[^0-9A-Za-z._-]/g, '');

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);

if (!gradle.includes('SMOKESTACK_MANAGED_SIGNING')) {
  gradle = gradle.replace('android {', `android {
    // SMOKESTACK_MANAGED_SIGNING: credentials are supplied only by GitHub Actions.
    def smokeStackKeystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
    signingConfigs {
        smokeStackRelease {
            if (smokeStackKeystorePath) {
                storeFile file(smokeStackKeystorePath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }`);
  gradle = gradle.replace(/buildTypes\s*\{\s*release\s*\{/, `buildTypes {
        release {
            if (smokeStackKeystorePath) signingConfig signingConfigs.smokeStackRelease`);
}

fs.writeFileSync(gradlePath, gradle);
console.log(`Configured Android version ${versionName} (${versionCode}).`);
