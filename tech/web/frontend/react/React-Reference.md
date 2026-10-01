---
tags: [web, frontend, react, reference]
status: index
category: "웹&네트워크(Web&Network)"
aliases: []
---

# React Reference 읽기 지도

React API, React DOM, Compiler, 성능 도구, lint, Rules, Server Components와 Legacy의 계약을 연결한다. 정리 기준은 2026-10-01 공식 Reference다.

## 기능별 경계

| 영역 | 사용 목적과 진입점 |
|---|---|
| React Hooks | [[React-Hooks]]에서 state, Effect, ref, 외부 store와 비긴급 갱신 계약 확인 |
| React Components와 APIs | [[React-Rendering]]에서 Suspense, Activity, Transition, cache, 개발 검사 확인 |
| React DOM | [[React-DOM]]에서 HTML/SVG, events, form, resources, client roots와 서버 HTML 처리 확인 |
| Compiler | [[React-Compiler-Configuration]]에서 빌드 시 분석 범위, runtime 대상과 배포 설정 확인 |
| DevTools | [[React-Performance-Tracks]]에서 React 작업을 네트워크/브라우저 시간축과 연결 |
| ESLint | [[React-Hooks-Lint]]에서 Hook과 render 규칙, Compiler 지원 범위 진단 |
| Rules | [[React-Rules-and-Call-Ownership]]에서 순수성, React의 호출 소유권과 Hook 순서 확인 |
| Server Components | [[React-Server-Boundaries]]에서 실행 환경, 모듈 경계, 서버 함수와 직렬화 확인 |
| Legacy | [[React-Legacy]]에서 기존 class/element API의 계약과 이행 대안 확인 |

## 읽기와 적용 확인

입문 원리는 [[React#읽기와 확인 방법|React 학습 지도]]에서 익히고, 구현할 동작에 해당하는 Reference 계약을 연결해 읽는다. 같은 API도 반환값, 호출 위치, identity, cleanup, 서버 실행과 실패 처리가 다르므로 이름만으로 대체하지 않는다.

자료를 정리한 것과 사용자가 학습을 마친 것은 구분한다. 각 문서의 이해 확인에서 결과를 먼저 예측하고 작은 예제로 검증한다. 후속 학습에서 같은 주제를 1~2회 짧게 회상하며 틀린 부분을 보강한다. Experimental/Canary 표기와 버전별 조건은 사용 프로젝트의 실제 패키지 및 framework 지원과 다시 맞춘다.

## 출처

- [React, React Reference Overview](https://react.dev/reference/react)
