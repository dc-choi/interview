---
tags: [web, frontend, react, legacy]
status: index
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React legacy API

## 지원과 migration 판단

Legacy는 현재 export되지만 신규 code에 우선 권장하지 않는 API다. 지원 중인 class를 즉시 전부 바꿔야 한다는 뜻은 아니다. 호출부와 lifecycle, identity, fallback 동작을 보존하며 개별 대안으로 옮긴다.

- [[React-Legacy-Elements-and-Children|Children, createElement, cloneElement, isValidElement와 explicit composition]]
- [[React-Class-Component-Contracts|Component, setState, PureComponent와 derived state]]
- [[React-Class-Lifecycles|commit lifecycle, DOM snapshot과 UNSAFE migration]]
- [[React-Error-Boundaries|render 오류 격리, logging과 retry]]
- [[React-Legacy-Refs|createRef, forwardRef와 React 19 ref prop]]

React 19에서는 createFactory, class의 contextTypes/childContextTypes/getChildContext, propTypes와 this.refs가 제거됐다. 각각 JSX, modern context, TypeScript 같은 type system과 명시적 ref로 옮긴다. TypeScript는 runtime 입력 검증을 대체하지 않는다. forwardRef는 React 19에서 불필요해졌지만 미래 deprecated 예정이며 이 제거 목록과 구분한다.

## 출처

- [React, Legacy React APIs](https://react.dev/reference/react/legacy)

## 관련 문서

- [[React-Core-Mental-Model]]
- [[React-Rules-and-Call-Ownership]]
