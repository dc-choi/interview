---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native ref node와 native tree 탐색

React Native 0.87의 native component ref는 실제 UI tree를 조회하는 DOM 유사 node를 제공한다. 이 tree의 구조는 renderer가 소유한다. appendChild처럼 node를 수정해 UI 정본을 바꾸는 API는 제공하지 않는다.

## 세 node

| node | 얻는 경로와 역할 |
|---|---|
| Element | native component ref, children와 layout/임의 조작 접근 |
| Text | element.childNodes 등으로 접근, raw text의 data/length 조회 |
| Document | element.ownerDocument, 완전한 native tree의 root와 id 탐색 |

native navigation은 screen별 document가 존재할 수 있다. 하나의 앱 전체가 언제나 document 하나라는 전제로 찾지 않는다. 사용자 component는 실제 native node까지 ref를 전달해야 하며 ScrollView처럼 여러 native view를 담는 component는 제공 helper를 사용한다.

## 탐색과 측정

Element/Document는 children와 childNodes, parentElement/parentNode, first/last child, sibling과 contains/compareDocumentPosition/getRootNode 등을 제공한다. Text는 nodeValue/textContent뿐 아니라 CharacterData의 data, length, substringData를 읽을 수 있다. 마운트하지 않은 element의 getRootNode는 자기 자신을 반환할 수 있다.

Element의 getBoundingClientRect, client/offset/scroll 크기는 layout을 읽는 도구다. id는 id/nativeID props 값을 반영하고 tagName은 RN:View처럼 normalized native 이름이다. core component 중 scrollLeft/Top이 0이 아닌 값을 주는 것은 ScrollView다. focus/blur의 options는 지원하지 않는다. measure/measureInWindow/measureLayout/setNativeProps의 이전 계약도 남아 있다.

```tsx
useEffect(() => {
  const element = ref.current;
  if (!element) return;
  const input = element.ownerDocument.getElementById('search-input');
  input?.focus();
}, []);
```

이 조각은 ref와 id를 연결한 상태의 조회 예이며 기기 실행 검증은 하지 않았다. ref node가 React element(JSX 결과)나 renderer의 C++ shadow node와 같은 객체라고 취급하지 않는다.

## object type의 경계

LayoutEvent는 nativeEvent.layout의 x/y가 부모 기준이고 width/height는 layout 이후 크기다. target은 nullable node id다. Rect는 top/right/bottom/left의 선택적 숫자로 영역 확장을 표현하며 bounding rect와 다르다. React Node는 element, string, number와 배열 등의 렌더 입력이고 boolean/null/undefined는 무시한다. native tree node와 용어가 비슷해도 계약이 다르다.

## 출처

- [React Native, nodes](https://reactnative.dev/docs/nodes)
- [React Native, element-nodes](https://reactnative.dev/docs/element-nodes)
- [React Native, text-nodes](https://reactnative.dev/docs/text-nodes)
- [React Native, document-nodes](https://reactnative.dev/docs/document-nodes)
- [React Native, layoutevent](https://reactnative.dev/docs/layoutevent)
- [React Native, rect](https://reactnative.dev/docs/rect)
- [React Native, react-node](https://reactnative.dev/docs/react-node)

## 관련 문서

- [[RN-Render-Pipeline]]
- [[RN-View-Flattening]]
- [[RN-Touch-Event-Types]]
