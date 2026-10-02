---
tags: [react-native, mobile, performance]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 프로파일링과 native trace"]
---

# React Native 프로파일링과 native trace

React Native 0.87 문서 기준이다.

프로파일링은 같은 재현 동작에서 CPU, UI와 메모리 비용을 관찰해 병목을 좁히는 과정이다. 개발 검사 비용을 제품 비용과 혼동하지 않도록 development mode를 끄고 실제 기기 조건을 기록한다.

## 도구와 질문

| 질문 | 도구 |
|---|---|
| JS task와 React render 중 무엇이 긴가 | React Native DevTools Performance, React Profiler |
| Android frame에서 UI와 Render thread가 어디서 지연되는가 | Android Studio System Tracing, Perfetto |
| Java/Kotlin method의 상대적 실행 비중은 어떤가 | Android Studio CPU Hotspots |
| iOS CPU, 메모리와 실행 특성은 어떤가 | Xcode Instruments |

standalone `systrace`는 Android platform-tools에서 제거됐다. 새 조사에서는 Android Studio Profiler를 사용한다.

## Android System Trace

1. 문제가 발생하는 기기를 연결하고 Android 프로젝트를 연다.
2. profileable 앱으로 실행한다.
3. 재현할 이동이나 animation 바로 전 상태로 진입한다.
4. Capture System Activities를 시작한다.
5. 짧고 일정한 동작을 수행하고 기록을 종료한다.
6. Studio에서 보거나 Export recording으로 Perfetto에 연다.

VSync와 frame 경계를 표시하고 해당 process의 UI, JavaScript와 Render thread를 찾는다. 과거 trace의 `mqt_js`, `mqt_native_modules`, `Bridge.executeJSCall` 이름은 legacy 예시다. 현재 New Architecture에서도 같은 이름과 thread 구성이 반드시 나온다고 가정하지 않는다.

## 시간선 해석

JS 작업이 frame 경계를 연속으로 넘어가면 해당 구간의 계산, event 빈도와 React 갱신을 확인한다. 매 frame 여러 번 발생하는 event는 실제 별개 입력인지 중복 listener인지 소스와 대조한다.

UI 또는 Render thread의 긴 draw는 복잡한 합성이나 GPU 작업의 후보다. animation 중 새로운 view가 대량 생성되면 measure/layout/draw 비용도 함께 늘 수 있다. trace만 보고 GPU가 원인이라고 단정하지 않고 draw, 대기와 view 생성 구간을 구분한다.

복잡하지만 내용이 고정된 view의 transform에는 hardware texture가 도움이 될 수 있다. 메모리 증가를 함께 측정한다. `needsOffscreenAlphaCompositing`은 정확한 합성을 위해 필요한 경우가 있지만 비용이 크므로 시각적 정합성을 깨면서 무조건 끄지 않는다.

새 화면 구성 비용이 병목이면 hierarchy를 단순화하거나 비긴급 생성을 뒤로 미룬다. 오래된 문서의 향후 renderer 개선 계획을 현재 미구현 상태로 단정하지 않는다.

## CPU Hotspots

Android Studio의 Find CPU Hotspots에서 Java/Kotlin Method Recording과 Callstack Sample은 다른 방식이다. 목적에 맞는 기록 방식을 선택하고, method recording은 부하가 커지므로 재현 구간을 짧게 유지한다.

instrumentation 기록은 method별 상대적 비중을 찾는 데 유용하지만 원래 앱의 절대 latency와 같다고 볼 수 없다. 수정 후에는 낮은 관측 비용의 동일한 기준 측정으로 효과를 다시 비교한다.

## 기록에 남길 조건

기기, OS, 앱 build, release/profileable 여부, 입력과 데이터량, cold/warm 상태를 함께 기록한다. 평균만 보지 않고 사용자 입력 지연과 긴 frame, 메모리 peak를 비교한다. 개선한 화면 하나의 통과를 전체 앱 성능 보증으로 확대하지 않는다.

## Systrace marker API

React Native Systrace의 marker API와 제거된 standalone systrace 실행 도구는 구분한다. beginEvent/endEvent는 같은 call stack, beginAsyncEvent/endAsyncEvent는 반환 cookie로 비동기 구간을 대응시킨다. counterEvent는 이름과 숫자 값을 기록한다. isEnabled로 관측 상태를 확인한다.

Android Studio/Perfetto 같은 capture 도구와 실제 trace를 연결해야 marker를 볼 수 있다. begin/end를 누락하지 않고, 예외/취소 경로에서도 대응시킨다. API 페이지의 예전 platform-tools 설명을 현재 command 설치 안내로 사용하지 않는다.

## 출처

- [React Native, Profiling](https://reactnative.dev/docs/profiling)

- [React Native, systrace](https://reactnative.dev/docs/systrace)

## 관련 문서

- [[React-Native-DevTools]]
- [[React-Native-Performance]]
- [[React-Native-FlatList-Performance]]
- [[RN-Web-Performance-APIs]]
