---
tags: [web, frontend, react]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["React", "리액트"]
---

# React

React 지식은 JSX 문법보다 state를 어디에 두고, render를 순수하게 유지하며, 외부 시스템과 어떻게 동기화할지를 중심으로 정리한다.

## 학습 지도

- [[React-Reference|React Reference 읽기 지도]] — API 계약과 적용 조건

- [[React-Core-Mental-Model|핵심 mental model, JSX, component, props와 state]]
- [[React-UI|UI 구성]] — component, JSX, 조건과 목록, 순수성, render tree와 module tree
- [[React-State|state와 동기화 (Effect, 영속화, 공유 state, server state)]]
- [[React-Tooling-and-Project-Setup|프로젝트 생성, Vite, CRA 전환과 도구 설정]]
- [[React-Tooling|빌드, lint와 성능 도구]] — Compiler, 17개 lint 규칙과 Performance tracks
- [[React-DOM|React DOM]] — HTML, events, form, resource, root와 SSR
- [[React-Server-Boundaries|서버와 client 경계]] — Server Components, Server Functions와 직렬화
- [[React-Application-Design|요구사항에서 component와 data 계약 도출하기]]
- [[React-Routing-and-Styling|React Router와 styling 경계, runtime CSS-in-JS와 CSS Modules 비용]]
- [[TS-React-Type-Contracts|React와 TypeScript 타입 계약]]
- [[React-Form-Builder-Practice|설문, admin과 form builder 설계]]

## 읽기와 확인 방법

기본 흐름은 입문과 UI 구성, 상호작용, 상태 관리, 외부 시스템 연결 순서다. 설치와 개발 환경은 실습 환경을 준비할 때, Compiler는 render와 Effect를 이해한 뒤 연결해 읽을 수 있다. 이는 자료를 읽는 안내이며 사용자의 확정 학습 일정이나 숙련 기록은 아니다.

- 개념을 읽고 코드 결과를 먼저 예측한 뒤 작은 예제에서 확인한다.
- 같은 입력, 연속 클릭, 목록 순서 변경, unmount와 재진입처럼 조건을 바꿔 본다.
- 문서에 있는 이해 확인을 자기 말로 설명하고, 틀린 부분만 원문과 예제로 다시 확인한다.
- 후속 학습 때 같은 주제를 짧은 회상이나 적용 문제로 1~2회 다시 확인한다. 한 번의 정답을 영구 숙달로 기록하지 않는다.

## 통합 연습

- 검색 목록에서 원본 data, 검색어와 필터를 나누고 검색 결과를 별도 state 없이 계산한다.
- 같은 화면에 Counter 두 개를 놓고 독립 state와 공통 parent state의 차이를 설명한다.
- 이력 있는 보드에서 과거 이동 후 새 수를 두고 이전 snapshot이 변하지 않는지 확인한다.
- key를 유지한 정렬과 key를 바꾼 form 초기화를 비교한다.
- 채팅방 연결의 setup/cleanup을 그리고, 방 변경과 테마 변경 중 어느 것이 재연결을 유발해야 하는지 설명한다.
- DOM focus는 ref로 처리하고, 화면에 표시할 값은 state에 두는 이유를 설명한다.
- Compiler 적용 여부와 성능 개선 여부를 각각 어떤 근거로 확인할지 정한다.

## 출처

- [React, Learn React](https://react.dev/learn)

## 관련 문서

- [[Declarative-Programming|선언형 프로그래밍]]
- [[Single-Host-SPA-API-Deployment|SPA와 API 배포]]
