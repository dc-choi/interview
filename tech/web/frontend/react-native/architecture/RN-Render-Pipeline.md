---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Render, Commit, Mount

Fabric의 화면 갱신은 React element, C++ shadow node와 실제 native view를 연결하는 과정이다. 앱의 JSX component 하나마다 native view가 하나씩 생긴다고 해석하지 않는다.

## 세 tree의 차이

| tree | 표현과 수명 |
|---|---|
| React Element Tree | JavaScript에서 props, children과 component 구성을 기술한다. React fiber가 작업을 관리한다 |
| React Shadow Tree | host component를 나타내는 C++ node, props와 layout 정보를 가진다 |
| Host View Tree | Android/iOS의 실제 view 계층이다. mount 결과가 화면에 반영된다 |

사용자 정의 composite component는 host component로 펼쳐진다. `MyComponent`가 `View`와 `Text`를 반환하면 shadow node는 host component에 대응하며 `MyComponent` 자체의 shadow node를 만들지는 않는다.

## 초기 화면의 세 단계

1. **Render**: React가 component를 실행하고 host element에 대응하는 shadow node와 부모/자식 관계를 만든다. JSI를 통한 C++ 호출은 동기이며 thread-safe 계약을 따른다.
2. **Commit**: Yoga와 platform 측정 함수로 크기와 위치를 계산하고, tree를 mount할 다음 tree로 승격한다. Text 측정처럼 플랫폼의 도움을 받는 작업도 있다.
3. **Mount**: 이전/다음 tree를 비교해 create, update, remove 등의 mutation을 구한다. layout-only view를 flatten하고, native view 변경은 UI thread에서 적용한다.

commit의 계산과 scheduling이 어느 thread에서 이루어지는지는 event 우선순위와 render 경로에 따라 달라진다. render-pipeline 문서의 background 예를 모든 commit의 규칙으로 일반화하지 않는다.

## React state 갱신과 구조 공유

현재 tree를 제자리에서 고치지 않고 변경 node와 root까지의 경로를 복제한다. 바뀌지 않은 subtree는 기존 tree와 공유한다. 부모 layout 변화로 공유 node의 layout까지 바뀌면 추가 복제가 필요하다.

```text
빨간 View의 색상 변경
→ 해당 node와 root까지의 경로 복제
→ 변경 없는 형제 subtree 공유
→ 새 tree commit
→ native View의 색상 update
```

renderer는 중간 tree를 전부 mount할 필요 없이 현재 화면과 최신 tree 사이의 차이를 계산할 수 있다. React 렌더 실행 횟수와 native view 생성 횟수를 같은 수치로 취급하지 않는다.

## native C++ state 갱신

ScrollView의 native scroll offset처럼 JS가 정본이 아닌 정보는 renderer C++ state에 둘 수 있다. 이 경로는 React render를 건너뛰고 commit/mount를 진행한다. 다른 commit이 먼저 완료되면 최신 node를 다시 읽고 복제/commit을 재시도해 충돌을 피한다.

일반 앱 state를 native state로 무조건 옮기라는 지침은 아니다. native host component를 구현할 때 state의 소유자와 React props의 관계를 정하는 내부 계약이다.

## 출처

- [React Native, Render, Commit, and Mount](https://reactnative.dev/architecture/render-pipeline)

## 관련 문서

- [[RN-Fabric-Renderer]]
- [[RN-Renderer-Threads]]
- [[RN-View-Flattening]]
