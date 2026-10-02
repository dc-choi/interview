---
tags: [react-native, mobile, quality]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["React Native DevTools 패널과 관측 범위"]
---

# React Native DevTools 패널과 관측 범위

React Native 0.87 문서 기준이다.

React Native DevTools는 Chrome DevTools frontend를 기반으로 JavaScript와 React를 조사하는 도구다. 네이티브 메모리, 운영체제 스레드, Kotlin/Swift breakpoint까지 대신하지 않는다.

## Console과 Sources

Console에서 로그 수준과 문자열로 필터링하고, 객체 값을 확인하고 JavaScript를 평가한다. Live Expressions는 값의 변화를, Preserve Logs는 reload 전후의 메시지를 추적한다. `Ctrl + L`은 표시된 콘솔을 비운다.

Sources에서 `Cmd + P` 또는 `Ctrl + P`로 파일을 찾고 줄 번호를 눌러 breakpoint를 설정한다. 정지 상태에서는 scope, call stack, watch expression을 조사하고 step 명령으로 다음 실행을 확인한다. Conditional breakpoint는 특정 입력에서만 멈추고, logpoint는 소스를 수정하지 않고 관찰점을 둔다. `debugger;`를 추가하는 방법도 있다.

앱의 Paused in Debugger overlay는 실행 정지 상태다. 이때 화면이 멈춘 것을 성능 장애로 오인하지 않는다.

## Network의 지원과 한계

0.83부터 제공된 Network 패널은 DevTools가 열린 동안 요청을 기록한다. 요청의 시간, 헤더, 응답 미리보기와 Initiator call stack을 연결해 중복 요청이나 지연 원인을 조사한다.

| 항목 | 0.87 문서 기준 |
|---|---|
| 기록 대상 | `fetch`, `XMLHttpRequest`, `<Image>` 요청 |
| Expo Fetch 등의 사용자 정의 계층 | 기본 Network 포괄 범위 밖. Expo Network 패널 확인 |
| Expo Network 차이 | 추가 Expo 요청을 기록하지만 Initiator와 Performance 통합은 없음 |
| WebSocket event | 미지원 |
| 응답 mocking, 네트워크 throttling | 미지원 |
| 응답 preview buffer | 기기에서 최대 100 MB, 초과 시 오래된 preview부터 제거 |

preview가 사라져도 요청 metadata는 남을 수 있다. 패널에 보이지 않는 통신은 실제 통신 부재의 증거가 아니다. Expo와 서드파티 네트워크 구현별 지원은 버전이 바뀌면 다시 확인한다.

## Performance와 React Profiler

0.83부터 Performance timeline에서 JavaScript 실행, React Performance tracks, Network event와 User Timing을 함께 볼 수 있다. `shift`를 누른 채 드래그해 구간 annotation을 남겨 기록을 공유할 수 있다. 앱에서 성능 event를 관찰할 때는 `PerformanceObserver` 지원 범위도 확인한다.

React Profiler는 component render와 commit 비용을 중심으로 본다. 전체 JavaScript task가 긴지, 특정 component가 자주 렌더되는지, 네이티브 UI 작업이 긴지는 서로 다른 질문이다.

Components 패널은 React tree, props와 state를 확인하고 수정할 수 있다. 선택 도구로 기기 화면의 요소를 tree와 대응시킨다. Highlight updates when components render는 재렌더 위치를 보여 준다. React Compiler의 Memo badge는 컴파일 최적화 표시이며 실제 성능 향상을 보장하지 않는다.

## Memory와 재연결

Memory heap snapshot과 allocation timeline은 JavaScript 객체의 보존과 증가를 조사한다. snapshot에서 객체를 검색하고 같은 화면을 반복 진입한 뒤 해제되지 않는 참조를 찾는다. JS heap 결과만으로 네이티브 이미지와 플랫폼 메모리 누수를 배제할 수 없다.

앱 종료, 재빌드, native crash, Metro 종료나 기기 연결 해제는 DevTools 연결을 끊을 수 있다. `Debugging connection was closed`가 나오면 원인을 먼저 복구한 뒤 Reconnect DevTools를 선택한다. 창을 닫는 것은 마지막 관측 상태로 돌아가는 동작이다.

## 이해 확인

- Network 기록에 없는 WebSocket event를 찾으려면 어떤 계층을 확인해야 하는가?
- JS heap이 안정적인데 앱 메모리가 증가하면 어떤 도구가 더 필요한가?
- render 횟수 감소와 frame 시간 개선을 어떻게 따로 검증할 것인가?

## DevSettings 확장

DevSettings.addMenuItem(title, handler)는 개발 메뉴에 custom 작업을 추가하고 reload(reason?)는 앱을 다시 로드한다. 개발 도구의 편의 기능이며 production 사용자 설정이나 권한 제어가 아니다. debug screen에만 있어도 sensitive data 접근 경계는 별도로 유지한다.

## 출처

- [React Native, React Native DevTools](https://reactnative.dev/docs/react-native-devtools)

- [React Native, devsettings](https://reactnative.dev/docs/devsettings)

## 관련 문서

- [[React-Native-Debugging]]
- [[React-Native-Profiling]]
- [[React-Performance-Tracks]]
- [[RN-Global-APIs]]
