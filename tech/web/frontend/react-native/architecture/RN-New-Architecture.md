---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native New Architecture의 역할과 적용 조건

React Native의 New Architecture는 Fabric renderer, Turbo Native Modules와 JSI를 중심으로 UI 렌더링과 JavaScript/native 연동의 기반을 바꾼다. 앱을 구성하는 React component와 state 모델은 유지하면서 host platform과 연결하는 내부 계약을 바꾼다.

## 무엇이 달라지는가

- **동기 layout과 effect**: `useLayoutEffect` 안에서 native view를 측정하고 위치를 조정하면 중간 배치가 먼저 보이는 문제를 줄일 수 있다. tooltip의 대상 위치 측정과 표시를 같은 commit에 맞추는 사례다.
- **Concurrent rendering**: 자동 batching과 transition을 이용해 상태 갱신을 묶고, 오래 걸리는 낮은 우선순위 렌더를 새 사용자 입력으로 중단할 수 있다.
- **JSI 연동**: JS와 C++가 객체 참조를 주고받는 인터페이스다. legacy 비동기 bridge의 JSON 직렬화 중심 호출을 줄이며 큰 native 데이터와 instance를 연결할 수 있다.

```tsx
useLayoutEffect(() => {
  targetRef.current?.measureInWindow((x, y, width, height) => {
    setTargetRect({x, y, width, height});
  });
}, []);
```

`targetRef`는 측정 가능한 native component를 가리켜야 한다. 위 조각은 tooltip 배치의 입력을 얻는 패턴이며 실제 기기 실행 결과는 아니다.

## 성능과 도입 판단

새 아키텍처 자체가 앱의 모든 병목을 해결하지 않는다. 직렬화가 병목이 아니거나 JS 작업이 과도하면 기반 변경만으로 체감이 개선되지 않을 수 있다. 실제 화면에서 측정, transition, native 연동을 어떻게 쓰는지와 라이브러리 호환성을 함께 확인한다.

0.76은 New Architecture가 기본이 된 시점이고, **0.82부터는 New Architecture만 실행한다**. 0.87 프로젝트에서 `newArchEnabled=false`나 `RCT_NEW_ARCH_ENABLED=0`으로 legacy renderer로 되돌린다고 안내하지 않는다. Architecture 설명 페이지의 opt-out 예제는 이전 버전의 이력이다.

Architecture Overview는 내부 동작을 이해할 때 쓰는 자료다. 앱 개발의 선행 필수 지식과 renderer/library 개발자의 내부 구현 지식을 구분한다.

## 출처

- [React Native, Architecture Overview](https://reactnative.dev/architecture/overview)
- [React Native, About the New Architecture](https://reactnative.dev/architecture/landing-page)
- [React Native, React Native 0.82, New Architecture Only](https://reactnative.dev/blog/2025/10/08/react-native-0.82)

## 관련 문서

- [[RN-Fabric-Renderer]]
- [[RN-Turbo-Native-Modules]]
- [[RN-Fabric-Native-Components]]
