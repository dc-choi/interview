---
tags: [react-native, android, deployment, signing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Android 서명과 Google Play 배포"]
---

# React Native Android 서명과 Google Play 배포

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 서명과 key 구분

Android 앱은 설치 전에 인증서로 서명해야 한다. Google Play App Signing을 사용하면 Google이 실제 배포 signing을 관리하고 개발자는 업로드 binary를 **upload key**로 서명한다. upload key와 Google이 관리하는 app signing key는 역할이 다르다.

기존 앱의 업데이트 서명 연속성을 유지한다. 새 upload key를 만드는 것만으로 기존 release key 기반 앱의 migration이 완료되지 않는다. Expo 앱은 [[Expo]]와 EAS 배포 흐름을 함께 검토한다.

## upload key 생성

설치된 JDK의 `keytool`을 사용한다.

```sh
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-upload-key.keystore \
  -alias my-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

명령은 keystore/key 비밀번호와 인증서 식별 정보를 묻고 keystore 파일을 만든다. alias와 비밀번호는 다음 서명 설정에서 사용한다. 10000은 예제 key의 유효 일수다.

Windows는 해당 JDK `bin` 경로에서 실행할 수 있다. macOS에서는 `/usr/libexec/java_home`으로 JDK 위치를 찾는다. 일반 사용자 디렉터리에 생성 가능한 key를 만들기 위해 무조건 관리자 권한을 사용할 필요는 없다.

keystore와 비밀번호는 비공개로 관리한다. upload key 유실/침해는 Google Play의 reset 절차를 따르고, app signing key의 상태와 구분한다.

## Gradle signing 설정

keystore의 예제 위치는 `android/app/`다. 비밀값은 `~/.gradle/gradle.properties` 등 저장소 밖 설정에서 제공할 수 있다.

```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=<store-password>
MYAPP_UPLOAD_KEY_PASSWORD=<key-password>
```

사용자 Gradle 설정에 값을 둬도 keystore 파일 자체를 저장소에 넣지 않도록 별도로 관리한다. RN 가이드는 macOS Keychain 저장 대안도 안내한다. 실제 CI의 비밀값 주입 방식은 CI 설정과 함께 정한다.

```groovy
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

배포 release build가 template의 debug signing을 계속 사용하는지 확인한다. key가 없어서 조건 블록이 생략된 상태를 정상 배포 준비로 해석하지 않는다.

## release AAB 생성

앱 루트에서 실행한다.

```sh
npx react-native build-android --mode=release
```

내부에서는 Gradle `bundleRelease`를 사용하고 필요한 JS와 asset을 AAB에 묶는다. 기본 산출물은 다음 경로다.

```text
android/app/build/outputs/bundle/release/app-release.aab
```

`gradle.properties`의 `org.gradle.configureondemand=true`는 release JS/assets bundling을 건너뛰게 할 수 있으므로 RN 가이드에서 금지한다. `debuggableVariants`에 배포 variant를 넣어 bundle이 생략되지 않았는지도 확인한다.

Google Play에 AAB를 제출하려면 해당 앱의 Play App Signing 구성이 필요하다. App Signing을 사용하지 않던 기존 앱은 migration 정책에 맞춰 원래 release key와 새 upload key를 처리한다.

## release 기기 테스트

```sh
npm run android -- --mode="release"
```

위 release mode 설치는 signing을 준비한 상태를 전제로 한다. 개발 설치와 서명이 달라 충돌하면 기존 앱을 제거하고 설치해야 할 수 있다. 제거 전에 보존할 로컬 데이터가 있는지 확인한다.

release 앱에는 JS가 binary에 포함되므로 Metro를 종료한 상태에서도 시작할 수 있어야 한다. 실행, network, native modules와 asset 표시를 실제 release 구성에서 확인한다. debug 실행 성공을 release 검증으로 대체하지 않는다.

## 다른 store와 ABI 분할

기본 예제 APK에는 x86, x86_64, armeabi-v7a, arm64-v8a native 코드가 함께 들어간다. ABI별 APK는 크기를 줄이지만 store가 device targeting을 지원하는지 확인해야 한다.

```groovy
splits {
    abi {
        reset()
        enable true
        universalApk false
        include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
    }
}
```

여러 APK를 지원하지 않는 배포처에는 `universalApk true`를 검토한다. ABI별 배포에서는 Android의 distinct version code 정책도 구성한다. 이 수동 APK 전략과 Google Play AAB의 자동 분할은 구분한다.

## 축소와 권한

RN 가이드의 `enableProguardInReleaseBuilds = true`는 release Java bytecode 축소를 활성화하는 설정 예다. native 라이브러리마다 keep rule이 필요할 수 있으므로 `app/proguard-rules.pro`와 축소 후 동작을 검증한다.

기본 `INTERNET` 권한은 일반 앱에도 들어간다. debug용 `SYSTEM_ALERT_WINDOW`는 production에서 제거되는 template 계약을 안내한다. 최종 merged manifest로 실제 배포 권한을 확인한다.

## 출처

- [React Native, Publishing to Google Play Store](https://reactnative.dev/docs/signed-apk-android)

## 관련 문서

- [[RN-Android-Build]]
- [[Expo]]
