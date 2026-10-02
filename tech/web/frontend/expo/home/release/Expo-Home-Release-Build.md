---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo production build와 스토어 제출"]
---

# Expo production build와 스토어 제출

## Artifact와 signing

Android store 제출은 signed AAB, iOS는 distribution-signed IPA를 사용한다. AAB는 일반 APK처럼 직접 설치하지 않고 store가 device별 APK를 생성한다. iOS store artifact도 ad hoc/Simulator binary와 다르다. Android production profile에 `buildType: apk`를 명시하면 직접 설치용 APK를 만들 수 있지만 store 기본은 AAB다.

```json
{ "build": { "production": {} } }
```

```sh
eas build --platform android --profile production
eas build --platform ios --profile production
eas build --platform all --profile production --message "Release candidate"
eas build:list
```

production profile을 명시해 의도를 분명히 한다. EAS CLI는 완료를 기다리며 terminal을 종료해도 dashboard/build:list에서 status/logs를 확인할 수 있다. organization build는 해당 account dashboard에서 확인한다.

Google Play/Apple developer 계정과 signing credentials가 필요하며 비용/예외는 현재 store 공식 안내에서 확인한다. EAS는 Android keystore, iOS distribution certificate/provisioning을 생성/관리하거나 manual credentials를 받을 수 있다. 기존 출시 앱의 signing identity를 실수로 바꾸지 않는다.

## Local release와 자동 build

native dirs를 수동 관리하면 Android Studio/Xcode의 release/signing 경로를 사용한다. CNG는 먼저 source generation이 필요하다. Android AAB는 `android`에서 `./gradlew app:bundleRelease`로 만들 수 있으며 Expo guide는 Community CLI build command 대신 이를 안내한다.

```yaml
name: Create builds
on:
  push:
    branches: ['main']
jobs:
  build_android:
    type: build
    params: { platform: android, profile: production }
  build_ios:
    type: build
    params: { platform: ios, profile: production }
```

두 platform job은 별도 build를 만든다. `.eas/workflows/create-builds.yml`과 project integration을 설정하고 `eas workflow:run create-builds.yml`로 요청할 수 있다.

## EAS Submit과 release 상태

EAS Submit은 binary upload를 자동화하며 EAS에서 만들지 않은 valid signed AAB/IPA도 제출한다. iOS upload도 Windows/Linux에서 요청할 수 있다. CLI submission은 metadata/screenshots/release notes를 대신 작성하거나 production 출시를 완료하지 않는다.

```sh
eas submit --platform android --path ./my-app.aab
eas submit --platform ios --path ./my-app.ipa
eas submit --platform android --latest --non-interactive
```

Android는 선택 track에 release를 만들며 새로운 앱의 기본 흐름은 internal testing이다. listing/setup을 끝내고 promotion해야 더 넓게 배포된다. `releaseStatus: draft`는 track rollout 없이 upload할 때 사용한다. first upload의 현재 API/console requirements는 Submit reference를 확인한다.

iOS는 App Store Connect processing 후 TestFlight에 표시된다. 처리 시간이 일정하지 않으며 metadata/screenshots, build 선택과 App Review 제출을 별도로 진행해야 App Store production으로 출시된다. upload success, processing, beta review와 production approval을 분리한다.

## 실패 조사와 Workflow

submission detail logs와 Build Annotations를 읽어 credentials, identifier, version와 store rejection 이유를 확인한다. automatic latest 선택은 실제 제출할 artifact의 platform/profile/version을 검토한 뒤 사용한다.

```yaml
jobs:
  submit_ios_to_store:
    type: submit
    needs: [build_ios]
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
```

build output ID를 직접 넘기면 다른 최신 build를 제출하는 위험을 줄인다. build/submit 성공 이후 store 측 review/rollout 상태는 따로 확인한다.

## 출처

- [Expo Documentation, Build your project for app stores](https://docs.expo.dev/deploy/build-project)
- [Expo Documentation, Submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores)

## 관련 문서

- [[Expo-Home-Store-Metadata]]
- [[Expo-Home-Review-Previews]]
