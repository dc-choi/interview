---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native entry 등록과 headless task의 수명

React Native 0.87 기준이다.

AppRegistry는 native가 앱을 실행할 때 연결하는 JS entry다. registerComponent(appKey, provider)로 root component를 등록하고 native의 실행 경로에서 runApplication을 호출한다. surface를 파괴할 때는 같은 root tag로 unmountApplicationComponentAtRootTag를 대응시킨다.

Expo가 root 등록을 처리하는 구성에서는 중복 등록하지 않는다. framework가 registerRootComponent 등으로 entry를 관리하는지 먼저 확인한다. AppRegistry는 다른 module보다 이른 실행 단계에서 runtime 환경을 구성하는 역할도 한다.

## registry와 wrapper

registerConfig의 항목은 appKey와 component provider 또는 runnable을 가진다. registerRunnable/registerSection은 다른 실행/section 등록 형태다. getAppKeys/getSections/getRegistry/getRunnable은 등록 정보를 조회한다.

wrapper provider와 component instrumentation hook은 root/instrumentation 경계를 조정한다. hook이 component와 scoped performance logger를 받는 계약을 확인하고 반환 component를 보존한다. 화면마다 임의 root를 다시 만들기 위한 API로 쓰지 않는다.

## UI 없는 task

registerHeadlessTask는 task provider를 등록한다. provider가 반환한 task는 native data를 받고 Promise를 종료한다. 완료/실패가 native에 전달되면 JS context의 수명도 달라질 수 있다.

registerCancellableHeadlessTask는 취소 provider가 TaskCanceller를 반환하는 추가 계약이다. 취소 시 실행 중 task가 빨리 정리해야 한다. startHeadlessTask는 native에서 시작하는 호출이며 taskId와 taskKey를 구분한다. JS registration만으로 OS가 background 작업을 무제한 허용하는 것은 아니다.

## 출처

- [React Native, appregistry](https://reactnative.dev/docs/appregistry)

## 관련 문서

- [[RN-Android-Headless-JS]]
- [[RN-Platform-Identity]]
- [[RN-App-State]]
