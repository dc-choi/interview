---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build profile 구성"]
---

# EAS Build profile 구성

## eas.json

eas.json은 package.json 옆에 두는 EAS CLI 설정이다. `build` 아래의 각 이름이 profile이다. development/preview/production은 관례적인 이름이며 이름 자체가 설정을 만들어 주지는 않는다. `--profile` 생략 시 production이 있으면 사용한다.

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": { "distribution": "internal" },
    "production": {},
    "development-simulator": {
      "extends": "development",
      "ios": { "simulator": true }
    }
  }
}
```

Development는 개발 도구를 포함하며 스토어 제출용이 아니다. Preview는 dev tools 없이 production에 가까운 조건에서 직접 배포하는 build다. Production은 일반 사용자 배포뿐 아니라 TestFlight 같은 스토어 시험 경로에도 사용한다.

## 상속과 플랫폼

`extends`는 다른 profile의 설정을 상속한다. 순환 없이 최대 깊이 5까지 연결할 수 있다. 공통 속성은 profile root 또는 android/ios 아래에 둘 수 있으며 플랫폼별 값이 우선한다.

iOS 실기기와 Simulator는 별도 profile로 구분하기 좋다. Android APK는 실기기와 Emulator에서 함께 사용할 수 있다. 한 기기에 여러 앱 variant를 설치하려면 package/bundle ID도 구분해야 한다.

## 도구와 환경

node, yarn, CocoaPods 등 지원되는 도구 버전을 고정할 수 있다. OS와 Xcode는 build image에 의해 정해진다. resourceClass는 CPU/RAM 등 runner 자원이며 image 선택과 다른 값이다. large 사용에는 유료 요금제 조건이 있다.

SDK 57에 오래된 예제의 Node 12/16/18 값을 복사하지 않는다. [[Expo-SDK-Compatibility]]의 최소 버전과 현재 image를 대조한다. build profile의 env는 로컬 app.config 평가와 remote builder에서 사용하지만 `eas update`가 자동으로 같은 env를 받는 것은 아니다.

## 출처

- [Expo Documentation, Configure EAS Build with eas.json](https://docs.expo.dev/build/eas-json)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
