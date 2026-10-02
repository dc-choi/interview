---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS project와 development profile 준비"]
---

# EAS project와 development profile 준비

## 서비스와 runtime 경계

EAS tutorial은 Build로 native binary 생성/서명, Submit으로 store upload, Update로 native 변경 없는 JS/assets 배포를 연결한다. 기존 Expo project 또는 expo package가 설치된 React Native project가 출발점이다. Orbit은 artifact 설치/launch 보조 도구이고 emulator/simulator는 별도 local 환경이다. iOS Simulator는 macOS가 필요하다.

development build는 expo-dev-client가 포함된 debug app이다. Expo Go의 정해진 native runtime과 달리 custom native library, config plugin, 직접 native 변경을 포함할 수 있다. JS의 빠른 반복은 유지하지만 새 native dependency/config 변경은 새 binary를 요구한다. shared development build는 팀에 같은 native runtime을 제공한다.

```sh
npx expo install expo-dev-client
eas login
eas init
eas build:configure
```

EAS CLI는 global install 또는 프로젝트가 정한 실행 방법으로 사용한다. `eas init`은 owner를 선택하고 EAS project를 생성/연결하며 `extra.eas.projectId`를 app config에 기록한다. ID는 app store identifier와 다른 EAS server project 식별자다. `build:configure`는 platform 선택 후 eas.json을 만든다.

## Build profile 계약

```json
{
  "cli": {"appVersionSource": "remote"},
  "build": {
    "development": {"developmentClient": true, "distribution": "internal"},
    "preview": {"distribution": "internal"},
    "production": {"autoIncrement": true}
  },
  "submit": {"production": {}}
}
```

developmentClient true는 debug/dev-client app을 만든다. internal은 store가 아닌 install/share 목적이다. preview는 일반적으로 server 없이 embedded JS를 실행하는 release형 내부 배포이고 production은 store용이다. profile 이름은 사용자 정의이며 값이 실제 동작을 정한다. platform별 overrides와 extends로 공통 설정을 재사용할 수 있다.

`npx expo start`는 expo-dev-client가 설치되면 development build 대상 launcher URL을 제공한다. 아직 binary가 없으면 server만으로 phone에서 실행할 수 없다. 원문의 `__expo_url` URL은 SDK58 새 dev-client 동작이므로 SDK57에서는 legacy dev-client URL 형식을 Home development 문서로 확인한다.

EAS dashboard build detail의 profile, SDK, app version, build number/code, commit hash, initiator와 logs를 함께 확인해야 어떤 source와 native runtime이 만들어졌는지 추적할 수 있다.

## 출처

- [Expo Documentation, EAS Tutorial: Introduction](https://docs.expo.dev/tutorial/eas/introduction)
- [Expo Documentation, Configure a development build in cloud](https://docs.expo.dev/tutorial/eas/configure-development-build)

## 관련 문서

- [[Expo-Home-Development-Builds]]
- [[Expo-Learn-EAS-Devices]]
