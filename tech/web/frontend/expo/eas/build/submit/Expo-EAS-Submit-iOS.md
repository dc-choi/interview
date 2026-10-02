---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["iOS 제출과 App Store Connect"]
---

# iOS 제출과 App Store Connect

## App Store Connect 업로드

EAS Submit은 macOS뿐 아니라 Linux/Windows에서도 iOS 업로드를 요청할 수 있다. 유효한 Apple Developer membership, 앱과 일치하는 bundle identifier, store 서명한 IPA와 App Store Connect 레코드가 필요하다. Simulator 또는 ad hoc artifact는 TestFlight 제출용이 아니다.

```json
{
  "submit": {
    "production": {
      "ios": { "ascAppId": "1234567890" }
    }
  }
}
```

ascAppId는 App Store Connect의 숫자 Apple ID다. bundle identifier나 Apple Team ID와 다르다. 업로드 뒤 Apple의 processing이 끝나야 TestFlight에서 보인다. 공식 페이지의 몇 분 단위 처리 시간은 예상치이며 완료 보장이 아니다.

## 인증 방법

App Store Connect API key를 EAS credentials로 관리하거나 ascApiKeyPath/ascApiKeyIssuerId/ascApiKeyId를 설정한다. 키의 역할과 앱 접근 범위를 확인하고 개인 키를 Git에 넣지 않는다. 대안으로 appleId와 `EXPO_APPLE_APP_SPECIFIC_PASSWORD`를 사용할 수 있다.

App Store 공개 출시는 스크린샷, 개인정보 정보, 심사 자료 등을 준비한 후 App Review에 제출하는 별도 절차다. TestFlight build만 올라온 상태를 출시 완료로 기록하지 않는다.

## Xcode와 Transporter 수동 경로

macOS/Xcode에서 native iOS workspace를 열고 bundle ID, signing team과 Release 설정을 확인한다. CNG 프로젝트라면 필요한 native 생성 절차를 먼저 수행한다. Run scheme만 Release로 바꾸고 Archive도 같은 설정이라고 가정하지 않는다.

Product Archive 후 Organizer에서 App Store Connect 배포를 선택하거나 IPA를 export해 Transporter로 업로드한다. 이미 유효한 IPA가 있다면 업로드를 위해 다시 빌드할 필요는 없다. Apple processing, signing 오류와 실제 buildNumber를 확인한 후 테스트/심사를 진행한다.

## 출처

- [Expo Documentation, Submit to the Apple App Store with EAS Submit](https://docs.expo.dev/submit/ios)
- [Expo Documentation, Manually submit an iOS app to the Apple App Store](https://docs.expo.dev/submit/ios-manual)

## 관련 문서

- [[Expo-EAS-Submit]]

- [[Expo]]
