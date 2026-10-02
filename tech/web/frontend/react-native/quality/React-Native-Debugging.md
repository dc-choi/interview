---
tags: [react-native, mobile, quality]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 디버깅 진입점과 LogBox"]
---

# React Native 디버깅 진입점과 LogBox

React Native 0.87 문서 기준이다.

디버깅 도구는 실패가 발생한 계층에 맞춰 고른다. React 상태와 JavaScript 실행은 React Native DevTools, 네이티브 모듈과 운영체제 충돌은 Android Studio나 Xcode, 배포된 번들의 stack trace는 source map으로 조사한다.

## Dev Menu와 도구 연결

개발 빌드에서 기기를 흔들거나 다음 단축키를 사용한다.

| 실행 환경 | Dev Menu 열기 |
|---|---|
| iOS Simulator | `Ctrl + Cmd + Z` 또는 Device > Shake |
| macOS Android emulator | `Cmd + M` |
| Windows/Linux Android emulator | `Ctrl + M` |
| Android 명령줄 | `adb shell input keyevent 82` |

Dev Menu의 Open DevTools 또는 개발 서버 CLI의 `j`로 DevTools를 연다. Dev Menu, LogBox와 React Native DevTools는 release 빌드에서 사용할 수 없다. 개발 화면에서 재현되지 않는 배포 장애는 release 로그와 해당 빌드 산출물이 필요하다.

## LogBox의 오류 구분

- 문법 오류처럼 JavaScript 실행 자체를 막는 fatal error는 수정될 때까지 닫을 수 없다. 수정 후 Fast Refresh 또는 reload로 해제된다.
- 일반 console error는 개수 표시를 눌러 상세 로그를 확인한다.
- warning은 배너로 표시되며 상세 조사는 DevTools Console에서 한다.
- DevTools가 열려 있으면 fatal error를 제외한 LogBox 표시가 숨겨진다. 화면에 배너가 없다는 이유로 오류가 없다고 판단하지 않는다.

알려진 외부 라이브러리 경고만 좁게 제외할 수 있다.

```ts
import {LogBox} from 'react-native';

LogBox.ignoreLogs(['Known third-party warning']);
```

`LogBox.ignoreAllLogs()`는 데모 중 알림을 가리는 용도로 쓸 수 있지만 오류를 고치거나 로깅 원인을 제거하지 않는다. React 오류 일부는 LogBox의 warning filter에 의해 경고로 보일 수 있으므로 Console을 함께 확인한다.

## 성능 오버레이와 조사 순서

Perf Monitor는 앱 안에서 JS/UI frame rate 등의 변화를 관찰하는 개발용 단서다. 정확한 네이티브 측정은 Android Studio와 Xcode 도구를 사용한다.

1. 개발/배포 빌드, 플랫폼, 엔진, 재현 입력을 고정한다.
2. syntax/fatal error, JS exception, native crash를 구분한다.
3. DevTools Console의 첫 오류와 breakpoint의 call stack을 확인한다.
4. 네이티브 crash나 디버거 연결 종료면 native log로 넘어간다.
5. 성능 문제는 release 조건에서도 같은 증상이 있는지 확인한다.

이 문서의 명령과 절차는 공식 문서 대조이며 실제 앱 실행 검증 결과가 아니다.

## 출처

- [React Native, Debugging Basics](https://reactnative.dev/docs/debugging)

## 관련 문서

- [[React-Native-DevTools]]
- [[React-Native-Native-Debugging]]
- [[React-Native-Release-Debugging]]
