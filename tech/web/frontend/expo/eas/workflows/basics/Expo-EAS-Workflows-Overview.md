---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Workflows 시작과 실행 모델"]
---

# EAS Workflows 시작과 실행 모델

## Job으로 배포 절차를 연결한다

EAS Workflows는 EAS-managed Linux/macOS runner에서 build, update, submit, tests와 web deploy를 실행한다. 의존성이 없는 job은 병렬이며 needs/after로 순서를 정한다. Expo CNG와 기존 React Native 앱 모두 EAS Build 구성을 준비해 사용할 수 있다.

```sh
eas workflow:create --template build
eas workflow:validate .eas/workflows/build.yml
eas workflow:run .eas/workflows/build.yml
```

생성 명령은 프로젝트 구성과 파일을 바꾸므로 출력과 요청 동작을 검토한다. deploy template은 native 변경 여부에 따라 스토어 제출 또는 OTA publish까지 실행할 수 있다. YAML 생성과 실제 release 실행을 별도 단계로 취급한다.

## 설정 파일과 사전 조건

`.eas/workflows/` 아래 .yml/.yaml을 둔다. eas.json과 같은 프로젝트 기준이며 각 workflow 파일은 최대 16 KiB다. build job의 platform/profile, 해당 eas.json profile과 signing credential을 준비한다. credential 준비만 할 때는 credentials:configure-build를 사용할 수 있다.

GitHub 연결 후 push/PR 등의 trigger를 쓰고 CLI로는 on 유무와 무관하게 수동 실행할 수 있다. 앱 식별자, 실제 SHA, environment와 artifact를 run detail에서 확인한다. 개발 build 설치 뒤 JavaScript를 공급하려면 로컬 Expo dev server가 필요하다.

## 범위와 현재 제한

EAS의 mobile 작업과 통합 UI에는 적합하지만 Docker/자체 runner가 필요한 범용 CI의 모든 기능을 대체하지 않는다. 현재 전체 job/workflow 구성을 다른 파일에서 공유하거나 matrix로 확장할 수 없다. 반복 step은 custom function으로 재사용하고 필요한 플랫폼 job은 명시적으로 둔다.

API/CLI의 완료 상태와 사용자 배포 완료를 구분한다. Cloud build와 E2E 실행은 비용이 발생할 수 있는 실제 작업이다. 이 지식 문서의 예시는 실행 증거가 아니다.

## 출처

- [Expo Documentation, Introduction to EAS Workflows](https://docs.expo.dev/eas/workflows/introduction)
- [Expo Documentation, Get started with EAS Workflows](https://docs.expo.dev/eas/workflows/get-started)
- [Expo Documentation, EAS Workflows limitations](https://docs.expo.dev/eas/workflows/limitations)

## 관련 문서

- [[Expo-EAS-Workflow-Basics]]

- [[Expo]]
