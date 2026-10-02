---
tags: [expo, expo-sdk, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SecureStore key와 biometric lifecycle"]
---

# Expo SecureStore key와 biometric lifecycle

expo-secure-store는 Android SharedPreferences+Keystore, iOS/tvOS Keychain의 string key-value 저장이다. expo install 후 namespace import한다. 각 Expo project storage가 분리되지만 irreversible data의 유일한 원본으로 사용하지 않는다. web secure equivalent가 없다.

## Read/write API

setItemAsync(key, value, options)/deleteItemAsync는 Promise<void>, getItemAsync는 Promise<string|null>다. missing/biometric-invalidated는 null, native retrieval failure는 reject다. key는 alphanumeric과 . - _만 허용한다. getItem/setItem은 synchronous라 requireAuthentication prompt 동안 JS thread를 block한다. large payload는 native가 거부할 수 있고 historical iOS 약 2048bytes는 universal hard limit이 아니다.

```ts
await SecureStore.setItemAsync('session.token', token, {keychainService:'session'});
const stored = await SecureStore.getItemAsync('session.token', {keychainService:'session'});
```

keychainService를 설정한 item은 읽을 때 같은 service가 필요하다. iOS accessGroup은 entitled sharing group, keychainAccessible 기본 WHEN_UNLOCKED, authenticationPrompt는 biometric prompt 문구다. requireAuthentication은 Android 모든 operation, iOS existing item read/update에 prompt하며 create에는 안 뜰 수 있다. iOS fresh biometric key와 nonauth service를 섞지 않는다. canUseBiometricAuthentication은 sufficient enrolled security boolean이며 tvOS=false, isAvailableAsync는 permission을 검사하지 않으며 reference는 Android/iOS true라고 설명한다.

## Accessibility와 persistence

WHEN_UNLOCKED는 unlock시에만, AFTER_FIRST_UNLOCK은 reboot 후 첫 unlock부터, *_THIS_DEVICE_ONLY는 restore migration을 제한한다. WHEN_PASSCODE_SET_THIS_DEVICE_ONLY는 passcode 필요/제거시 삭제다. ALWAYS/AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY의 deprecated guidance와 이력은 source를 확인하고 가장 덜 보호하는 ALWAYS를 신규 default로 선택하지 않는다.

Android uninstall은 data/key를 삭제한다. iOS same bundle reinstall에서 Keychain이 남을 수 있지만 source도 보장하지 않아 first-install/reset/logout 정책을 별도로 둔다. requireAuthentication item은 fingerprint 추가/face profile 변경에 invalidated되어 다시 읽을 수 없다. 이를 영구 계정 손실과 구분하고 reauthentication 경로를 제공한다.

## Native plugin과 backup

configureAndroidBackup 기본 true는 SecureStore sharedpref를 Android backup/transfer에서 제외한다. uninstall로 Keystore key가 사라져 restored ciphertext를 decrypt할 수 없기 때문이다. custom backup이면 SecureStore domain 제외를 Android12 data-extraction/Android11이하 full-backup 모두 설정하고 plugin configureAndroidBackup=false로 중복을 피한다.

faceIDPermission NSFaceIDUsageDescription과 binary rebuild가 필요하며 Expo Go requireAuthentication이 FaceID available 상황에서 미지원이다. simulator는 실제 authentication을 요구하지 않을 수 있어 real device로 검증한다. ios.config.usesNonExemptEncryption=false는 source가 제공한 SecureStore export-compliance 설정이지만 다른 encryption이 있는 앱 전체 판정을 자동으로 대체하지 않는다.

## 출처

- [Expo Documentation, SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore)

## 관련 문서

- [[Expo-SDK-Local-Authentication-Tracking]]
- [[Expo-Integrations-Privacy]]
- [[Expo-Integrations-Clerk]]
