---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Fabric과 공유 renderer

Fabric은 React element를 Android/iOS 등의 host view에 연결하는 렌더링 시스템이다. JavaScript 쪽 React renderer와 C++ core, platform별 mount 계층이 함께 동작한다. JSI 자체를 renderer나 JavaScript engine과 같은 것으로 취급하지 않는다.

## 설계 목적

동기 측정, 우선순위가 다른 event, Concurrent React와 Suspense를 지원할 토대를 제공한다. host view 안에 React surface를 넣을 때 layout이 늦게 확정되는 문제도 줄인다. Codegen으로 JS/native props 계약의 타입 불일치를 빌드에서 발견할 수 있다.

핵심 render logic을 C++로 공유하면 플랫폼별 shadow tree와 layout 구현 중복을 줄이고, Yoga와 renderer의 연결 비용을 낮춘다. immutable data와 C++ const 규칙은 여러 thread에서 tree를 안전하게 읽는 기반이다.

## C++와 platform의 경계

| 연결 | 역할 |
|---|---|
| React → C++ renderer | host component tree 생성, props 갱신, event 수신 |
| C++ renderer → host platform | native view 생성, 삽입, 수정, 삭제와 native event 전달 |
| Yoga → native text 측정 | Text/TextInput처럼 플랫폼 측정이 필요한 콘텐츠 처리 |

C++ 공유 core가 Android의 JNI 비용을 없애는 것은 아니다. native text 측정과 mount mutation 전달에는 JNI 경계가 남는다. 모든 화면을 C++ view로 그리는 방식도 아니다.

## 적용에서 확인할 점

view flattening의 개선은 여러 플랫폼에서 공유된다. 그러나 platform별 font, event, mount 구현 차이까지 없애지는 않는다. Architecture 문서의 JNI 절감 목표, 새 플랫폼 확장과 animation 통합 계획은 구현 보장이나 현재 수치로 옮기지 않는다.

## 출처

- [React Native, Fabric](https://reactnative.dev/architecture/fabric-renderer)
- [React Native, Cross Platform Implementation](https://reactnative.dev/architecture/xplat-implementation)

## 관련 문서

- [[RN-Render-Pipeline]]
- [[RN-View-Flattening]]
- [[RN-Codegen]]
