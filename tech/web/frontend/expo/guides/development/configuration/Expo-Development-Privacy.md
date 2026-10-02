---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo iOS Privacy Manifest 구성"]
---

# Expo iOS Privacy Manifest 구성

## manifest와 권한 메시지의 차이

`PrivacyInfo.xcprivacy`는 iOS native 코드가 Apple의 required-reason API를 사용하는 이유를 선언한다. 사용자에게 표시하는 camera/photo 권한 문구와 별개다. UserDefaults, 파일 timestamp, boot time, disk space와 active keyboard 같은 API가 대상이며 목록과 허용 reason은 Apple 요구에 따라 바뀔 수 있다.

## CNG 설정

```json
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": [{
          "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
          "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
        }]
      }
    }
  }
}
```

이 reason은 예제이며 앱의 실제 사용이 해당 reason에 맞아야 한다. `npx expo install --fix`로 현재 SDK 범위의 Expo 패키지를 맞춘 뒤 native 바이너리를 다시 만든다. 수동 native 앱은 Xcode에서 파일을 만들고 app target에 포함한다.

## 의존성까지 점검하기

required-reason API를 쓰는 Expo 패키지는 package 내부에 manifest를 포함한다. 제3자 라이브러리는 `node_modules/<package>/ios/PrivacyInfo.xcprivacy`에서 type/reason을 확인한다. static CocoaPods 의존성 manifest가 제출 처리에서 충분히 반영되지 않을 수 있으므로 app manifest에 의존성 이유를 합칠 필요가 있다.

앱 자체 API만 조사하고 라이브러리 호출을 빼면 제출 경고가 생길 수 있다. 반대로 reason을 무조건 많이 나열하는 것은 실제 사용을 설명하지 못한다.

## 제출 확인과 한계

App Store 제출 또는 TestFlight 외부 검토에서 누락 이유 통지를 확인할 수 있다. config 파일이 존재한다는 검사만으로 Apple 검토 통과를 보장하지 않는다. 이 문서는 설정 계약을 정리한 것이며 실제 제출을 수행한 기록은 아니다. Apple의 API 목록, 허용 reason과 aggregation 처리는 제출 시점의 공식 요구를 다시 확인한다.

## 출처

- [Expo Documentation, Privacy manifests](https://docs.expo.dev/guides/apple-privacy)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
