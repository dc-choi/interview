---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native renderer의 thread와 우선순위

Fabric은 immutable shadow tree를 사용해 여러 thread에서 작업할 수 있도록 설계한다. 갱신마다 tree를 복제하고 변경하지 않은 구조를 공유한다. 앱의 JS 로직이 자유롭게 native view를 여러 thread에서 변경할 수 있다는 뜻은 아니다.

## 기본 경계

- **UI/main thread**: 실제 host view를 조작하는 thread다.
- **JavaScript thread**: 일반적인 React render와 관련 작업이 실행되는 경로다.
- commit의 layout 계산과 scheduling은 renderer 경로에 따라 달라질 수 있다.

## event에 따른 실행

일반 경로에서는 render pipeline의 많은 작업이 JS thread에서 진행된다. 높은 우선순위 event는 진행 중인 render를 중단하고 UI thread에서 동기 작업을 수행할 수 있다.

연속/default event는 state를 합치고 JS thread의 render를 이어갈 수 있다. discrete event처럼 즉각 반영이 필요한 입력은 UI thread에서 동기 render 경로를 사용할 수 있다. native C++ state 갱신은 React render를 건너뛰며 UI thread 등에서 시작할 수 있다.

이 설명은 renderer scheduling의 개념 모델이다. 모든 touch callback이 UI thread에서 JavaScript를 실행한다거나 JS blocking이 사라진다는 보장은 아니다. event의 우선순위, 작업 종류와 실제 profile을 함께 본다.

## 출처

- [React Native, Threading Model](https://reactnative.dev/architecture/threading-model)
- [React Native, Render, Commit, and Mount](https://reactnative.dev/architecture/render-pipeline)

## 관련 문서

- [[RN-Render-Pipeline]]
- [[React-Native-Performance]]
- [[React-Native-Profiling]]
