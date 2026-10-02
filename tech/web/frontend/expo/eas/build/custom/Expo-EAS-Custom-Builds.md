---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS custom build 구성"]
---

# EAS custom build 구성

## 기본 절차에 필요한 단계만 추가한다

Custom build는 하나의 build runner에서 실행할 단계들을 YAML로 정의한다. 여러 job의 의존성을 연결하는 EAS Workflows와 구분한다. `.eas/build/` 아래 설정을 두고 eas.json의 build profile에서 `config` 또는 android/ios별 config로 파일을 지정한다.

```json
{ "build": { "custom": { "config": "custom.yml" } } }
```

```yaml
build:
  name: Build with checks
  steps:
    - eas/build
    - run:
        name: Check artifact
        command: echo '빌드 후 검사 명령을 이 단계에 둔다'
```

`eas build --platform android --profile custom`로 이 profile을 선택한다. 시작 안내는 .yml을 사용하고 schema는 .yml/.yaml을 허용한다. 설정 파일 확장자와 참조 이름을 일치시킨다.

## eas/build와 수동 단계

`eas/build`는 eas.json으로 전체 기본 빌드 절차를 결정하며 inputs를 받지 않는다. 전후 단계 추가에는 적합하지만 내부 단계의 설정을 바꾸려면 필요한 built-in 함수를 직접 나열한다.

수동 절차는 checkout, dependencies, config 평가, prebuild, credentials/version/update 설정, native compile와 artifact upload를 직접 연결한다. iOS에는 pod install과 Gymfile 단계도 필요하다. 기본 hook이 custom 절차에서도 자동 실행된다고 가정하지 않는다.

## 실행 단위와 출력

build.name은 로그의 표시 이름이며 steps에는 적어도 하나가 필요하다. step은 순서대로 실행한다. run은 명령 문자열 또는 name/command/working_directory/shell 등의 객체다. working_directory는 존재하는 디렉터리를 지정하고 각 step에 적용한다.

실패 뒤 정리/진단 작업은 `if: ${ always() }`, 실패 알림은 failure(), 성공 후 작업은 success()를 사용한다. 외부 알림은 실제 발송 동작이므로 사용자에게 필요한 자동화일 때만 구성한다. 예시를 읽거나 문서화하는 것만으로 해당 작업을 실행하지 않는다.

## 출처

- [Expo Documentation, Get started with custom builds](https://docs.expo.dev/custom-builds/get-started)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
