---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Production build와 store 제출 단계"]
---

# Production build와 store 제출 단계

## Android AAB와 Play track

paid Google Play Developer account, production profile, 자동 제출에는 service account JSON key와 권한이 필요하다. `eas build --platform android --profile production`은 기본 store용 AAB를 만든다. AAB는 APK와 달리 직접 device install artifact가 아니며 Play가 device-specific APK를 만든다.

Play Console에 app을 생성하고 internal testing의 tester list, release details, app bundle upload, Save/publish를 구성한다. tutorial은 수동 첫 release를 학습 경로로 설명하지만 현재 원문은 `eas submit`으로 first release도 직접 만들 수 있다고 명시한다. 수동 upload를 항상 필수 조건으로 요구하지 않는다.

internal tester는 join link를 열고 test 참여를 수락한 뒤 Play에서 install한다. store listing이 review 전이면 temporary name이 보일 수 있다. privacy policy, target audience, data safety, screenshots 등 app setup은 public release 이전에 별도로 완료해야 한다. internal track에서 closed/production으로 promote하는 것은 EAS internal APK share와 다른 store operation이다.

service account key는 EAS credentials의 Android application identifier에 연결한다. key 자체를 source 저장소에 포함하지 않는다. submit.production.android.track을 internal 또는 production으로 설정해 upload destination을 선택한다.

```json
{"submit":{"production":{"android":{"track":"internal"}}}}
```

```sh
eas submit --platform android --profile production
eas build --platform android --profile production --auto-submit
```

track production 선택과 store review/release 완료는 구분한다. 필요한 Play Console review 작업과 계정 정책을 확인한다.

## iOS production IPA와 TestFlight

Apple Developer account와 production signing이 필요하다. `eas credentials`에서 iOS/production/Build credentials를 선택해 distribution certificate와 store provisioning profile을 준비한다. ad hoc과 store profile은 목적이 다르다.

```sh
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Submit은 EAS build ID를 선택하고 Apple/App Store Connect API key authentication을 이용해 binary를 upload한다. Apple processing 후 TestFlight에서 build가 사용 가능해진다. Internal group과 users를 연결하고 testers는 invite를 수락해 TestFlight로 install한다. internal/external tester count는 원문 기준100/10,000이며 실제 사용 시 Apple 현재 조건을 재확인한다.

App Store tab에서 metadata/screenshots/general 정보를 작성하고 build를 선택한 뒤 Submit to App Review한다. encryption compliance는 실제 app의 암호화 사용을 확인해 응답한다. tutorial sample의 exempt 값이 모든 app에 맞는 것은 아니다.

`eas build --platform ios --auto-submit`은 build와 TestFlight upload를 연결한다. App Store review 제출/public release는 자동으로 완료하지 않는다. binary build 성공, store upload 성공, processing, beta availability, review approval은 각각 별도 상태다.

## 출처

- [Expo Documentation, Create a production build for Android](https://docs.expo.dev/tutorial/eas/android-production-build)
- [Expo Documentation, Create a production build for iOS](https://docs.expo.dev/tutorial/eas/ios-production-build)

## 관련 문서

- [[Expo-Learn-EAS-Versioning]]
- [[Expo-Home-Store-Metadata]]
