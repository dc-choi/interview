---
tags: [react-native, mobile, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 프레임 예산과 성능 병목"]
---

# React Native 프레임 예산과 성능 병목

React Native 0.87 문서 기준이다.

성능 문제는 JavaScript 실행, 네이티브 UI 구성, draw와 GPU 작업을 나눠 조사한다. React Native를 사용한다는 사실만으로 프레임 유지나 메모리 사용량이 보장되지는 않는다.

## 프레임 예산

60 Hz 화면에서 한 프레임의 시간은 약 16.67 ms다. 120 Hz에서는 약 8.33 ms다. 주사율에 맞춰 다음 화면을 준비하지 못하면 프레임이 누락된다. 모든 기기를 60 Hz로 고정해 해석하지 않는다.

JS thread에서는 업무 로직, React render와 event 처리가 진행된다. 긴 계산이나 큰 subtree의 render는 JS 기반 animation과 입력 반응을 지연시킬 수 있다. UI thread에서는 네이티브 layout과 화면 동작이 진행된다. JS가 바빠도 네이티브 ScrollView 자체의 스크롤은 진행될 수 있지만 JS로 전달된 scroll event 처리는 늦을 수 있다.

native stack의 전환 animation은 JS 기반 전환과 실행 위치가 다르다. 화면이 부드럽게 움직인다는 것과 JS event가 제때 처리된다는 것은 별개다.

## 증상에서 원인 후보로

| 증상 | 먼저 확인할 것 | 적용 조건 |
|---|---|---|
| 개발 모드에서만 느림 | release 재현 | 경고와 검사 비용을 실제 제품 성능과 구분 |
| 입력 뒤 응답 지연 | 긴 JS task, render, 과도한 logging | 먼저 profile로 실행 구간 식별 |
| 큰 목록의 빈 영역 | batch/window와 행 render 비용 | 메모리와 반응성의 비용을 함께 측정 |
| 이미지 확대 중 끊김 | 매번 width/height 변경 여부 | layout 재계산 대신 `transform: [{scale}]` 검토 |
| 겹친 투명 view 이동 중 끊김 | 합성과 GPU draw 비용 | rasterization의 메모리 비용을 함께 측정 |
| 화면 전환 중 지연 | 초기화, network 결과 render가 겹치는지 | 긴 작업을 분할하거나 뒤로 배치 |

## 조정 순서

1. 동일 기기와 release 조건에서 재현한다.
2. JS와 native UI 중 시간이 쓰이는 계층을 찾는다.
3. 불필요한 계산, render와 logging을 줄인다.
4. 비긴급 작업은 `requestIdleCallback` 등의 시점으로 미루되 작업량도 나눈다.
5. 지원되는 animation은 native driver를 검토한다.
6. 변경 전후의 프레임, 입력 지연과 메모리를 같은 조건으로 비교한다.

`requestAnimationFrame`으로 눌림 피드백과 무거운 동작의 시점을 나눌 수 있지만 무거운 계산 자체를 다른 스레드로 이동시키지는 않는다. 긴 동기 작업을 callback 안에 그대로 넣으면 이후 프레임을 다시 막을 수 있다.

`Animated`의 native driver는 지원하는 property와 event에 한정된다. `LayoutAnimation`은 다음 layout 변화에 적용하는 방식이며 중간 상호작용으로 계속 제어해야 하는 animation과 용도가 다르다.

## 메모리와 시각 효과

`renderToHardwareTextureAndroid` 같은 캐시는 반복 합성 비용을 줄일 수 있지만 메모리를 더 쓴다. 움직이지 않게 된 view에 계속 유지할 이유가 있는지 확인한다. iOS rasterization도 실제 View API 기본값을 확인해 선택하며 플랫폼 기본값을 추정하지 않는다.

console 제거는 진단 가능성과 비용을 함께 고려한다. 모든 release logging을 일괄 제거하기보다 민감 정보와 고빈도 debug log를 정리하고 필요한 운영 오류 수집을 보존한다.

## 이해 확인

- JS thread가 막혔는데 네이티브 스크롤이 계속되는 이유는 무엇인가?
- memo를 추가했는데 UI draw가 그대로 느리면 다음으로 무엇을 조사할 것인가?
- 캐시로 FPS가 나아졌지만 메모리가 증가했다면 어떤 기기에서 다시 측정할 것인가?

## 출처

- [React Native, Performance Overview](https://reactnative.dev/docs/performance)

## 관련 문서

- [[React-Native-Profiling]]
- [[React-Native-FlatList-Performance]]
- [[React-Native-JavaScript-Loading]]
