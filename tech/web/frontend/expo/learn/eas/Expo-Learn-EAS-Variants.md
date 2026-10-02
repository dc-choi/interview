---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["앱 variants와 내부 배포의 식별자 계약"]
---

# 앱 variants와 내부 배포의 식별자 계약

## 여러 app을 동시에 설치하는 조건

development/preview/production을 한 device에 같이 설치하려면 android.package와 ios.bundleIdentifier가 각각 달라야 한다. app display name 변경만으로 별도 설치되지 않는다. dynamic config가 static app.json을 받아 nested ios/android 값을 보존하면서 identifier와 name을 선택한다.

```js
const variant = process.env.APP_VARIANT;
const suffix = variant === 'development' ? '.dev' : variant === 'preview' ? '.preview' : '';
export default ({ config }) => ({
  ...config,
  name: `StickerSmash${suffix}`,
  ios: {...config.ios, bundleIdentifier: `com.example.stickersmash${suffix}`},
  android: {...config.android, package: `com.example.stickersmash${suffix}`},
});
```

```json
{"build":{
  "development":{"developmentClient":true,"distribution":"internal","env":{"APP_VARIANT":"development"}},
  "preview":{"distribution":"internal","env":{"APP_VARIANT":"preview"}}
}}
```

new native identity는 signing credentials와 provisioning도 새로 확인해야 한다. extends development인 simulator에도 env가 상속된다. local server도 같은 APP_VARIANT로 config를 평가해야 올바른 scheme/identity로 연결된다. POSIX `APP_VARIANT=development npx expo start` 문법은 Windows shell에서 동일하게 실행되지 않을 수 있으므로 shell에 맞는 env 설정을 사용한다.

## Internal distribution

preview/internal binary는 embedded JS를 포함해 Metro 없이 실행되므로 비개발자 피드백과 팀 테스트에 적합하다. Android APK와 iOS IPA를 install link/Orbit/QR로 공유한다. build link 접근과 native install eligibility는 서로 다른 조건이다. iOS ad hoc은 profile에 UDID가 명시된 device만 설치한다.

```sh
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

같은 app identity의 Android signing key를 재사용할 수 있다. variants가 다른 경우 identity별 credential을 확인한다. iOS에 새 device를 등록한 뒤에는 해당 device가 포함된 새 build 또는 `eas build:resign`이 필요하다. 기존 IPA의 ad hoc profile은 registration만으로 변하지 않는다.

Enterprise membership은 eligible organization에서 사전 UDID 등록 없는 배포를 제공하는 별도 제도다. App Store와 enterprise context는 distinct identifier를 사용하며 generated config는 dynamic ID, existing native project는 scheme/profile 분리로 구성할 수 있다. 비용/eligibility는 Apple의 현재 조건을 확인한다.

manual local credentials는 credentials.json이 ad hoc/enterprise profile을 가리키게 하고 UDID registration을 직접 관리한다. EAS CLI의 제한된 validation만으로 잘못된 profile/identity 조합을 모두 발견한다고 가정하지 않는다.

원문의 TestFlight one active build 제한 문장은 일반 정책으로 적용하지 않는다. EAS internal 배포와 store testing을 비교할 때 현재 Apple/Google 계약과 대상 tester의 조건을 확인한다.

## 출처

- [Expo Documentation, Configure multiple app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants)
- [Expo Documentation, Create and share internal distribution build](https://docs.expo.dev/tutorial/eas/internal-distribution-builds)

## 관련 문서

- [[Expo-Learn-EAS-Devices]]
- [[Expo-Learn-EAS-Versioning]]
