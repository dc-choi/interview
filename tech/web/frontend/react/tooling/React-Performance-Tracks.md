---
tags: [web, frontend, react, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# React Performance tracks로 비용 읽기

React Performance tracks는 브라우저 DevTools Performance timeline에 React 작업을 네트워크, JavaScript와 같은 시간축으로 표시한다. 느린 반응의 원인이 React render인지, Effect의 후속 갱신인지, 데이터 대기인지 연결해서 찾는 도구다.

## 빌드별 지원 범위

| 빌드 | 표시 범위 |
|---|---|
| Development | 기본 활성화. Scheduler, Components, Server 관련 정보를 확인할 수 있다 |
| Profiling | Scheduler는 기본 활성화. Components는 기본적으로 `<Profiler>` subtree이며 React DevTools extension이 있으면 전체 component가 포함된다 |
| 일반 production | 계측 비용 때문에 기본 비활성화 |

Server Components와 Server Requests track은 development에서만 지원하며 profiling build에는 없다. 브라우저도 DevTools extensibility API를 지원해야 한다.

profiling build는 `react-dom/client` 대신 `react-dom/profiling`을 사용한다. 여러 import를 수작업으로 바꾸기보다 bundler alias나 framework의 profiling 옵션을 사용한다. 계측 자체의 overhead와 개발 검사를 고려해 실제 사용자 성능 수치와 구분한다.

## Scheduler와 render 단계

| 우선순위 track | 의미 |
|---|---|
| Blocking | 사용자 상호작용 등에서 시작된 동기 갱신 |
| Transition | `startTransition` 등으로 표시한 비긴급 작업 |
| Suspense | fallback 표시와 content reveal 관련 작업 |
| Idle | 더 높은 우선순위 작업이 없을 때 처리하는 작업 |

한 render pass는 원인을 보여 주는 **Update**, component 계산인 **Render**, DOM 반영과 layout Effect인 **Commit**, passive Effect인 **Remaining Effects**로 읽는다. Remaining Effects는 보통 paint 뒤지만 클릭 같은 discrete event에서는 paint 전에 실행될 수 있다. `useEffect`가 항상 화면 표시 뒤라고 단정하지 않는다.

작업 중 추가 state 갱신으로 이미 한 작업을 버리고 다시 render하면 cascading update가 생길 수 있다. development의 해당 entry를 클릭해 어떤 component와 메서드가 갱신을 예약했는지 확인한다. 단순 render 횟수보다 갱신의 원인과 반복 비용을 찾는다.

## Components flamegraph

component entry의 시간에는 해당 component와 하위 component 작업이 함께 포함된다. 부모와 자식 시간을 그대로 더하면 중복 계산한다. Effect도 Scheduler 단계와 맞는 색으로 표시되지만, 기본적으로 0.05ms 이상 걸리거나 갱신을 발생시킨 Effect만 보여 준다. entry가 없다고 Effect가 실행되지 않았다고 결론 내리지 않는다.

Mount/Unmount는 subtree의 생성/제거, Reconnect/Disconnect는 `<Activity>`에 따른 Effect 연결 상태 변화를 설명한다. development에서 render entry를 클릭하면 변경 가능성이 있는 props도 볼 수 있다. props 변경 정보는 조사 단서이며 모든 re-render가 제거할 낭비라는 뜻은 아니다.

## Server Requests와 Server Components

Server Requests는 Server Component에 도달하는 Promise 작업을 보여 준다. `fetch`뿐 아니라 비동기 파일 I/O도 포함한다. third-party 함수 안에서 여러 fetch가 실행되면 사용자가 호출한 작업 하나의 span으로 묶일 수 있다. 클릭하면 Promise 생성 위치, 가능하면 결과값을 확인하며 reject는 빨간색으로 표시된다.

Server Components는 component render와 그 하위 작업/기다린 Promise의 시간을 보여 준다. 더 진한 색은 긴 시간을 나타낸다. 모든 I/O를 찾으려면 Requests track과 대조한다. Primary 외에 동시 실행되는 component는 Parallel track에 나타나며 8개를 넘는 동시 작업은 마지막 Parallel track으로 묶인다.

track 수를 서버 동시 요청 수나 connection pool 크기로 해석하지 않는다. 계측에서 묶인 작업과 실제 네트워크/DB 단위를 구분한다.

## 조사 순서와 이해 확인

1. 느린 사용자 동작을 하나 정해 trace를 기록한다.
2. Update에서 render를 유발한 원인을 찾고 네트워크 대기와 나란히 본다.
3. 긴 component/Effect와 cascading update를 찾아 원래 데이터 흐름을 확인한다.
4. 한 원인을 수정하고 같은 조건에서 다시 기록한다. Compiler 배지나 lint 통과를 측정 결과로 대신하지 않는다.

- 부모 10ms와 자식 7ms를 더해 17ms라고 하면 왜 틀릴 수 있는가?
- Effect entry가 없는데도 후속 render가 보인다면 무엇을 더 확인할 것인가?
- profiling build에서 Server Requests가 없는 것은 계측 실패인가, 지원 범위인가?

## 출처

- [React, React Performance tracks](https://react.dev/reference/dev-tools/react-performance-tracks)

## 관련 문서

- [[React-Compiler]]
- [[React-Hooks-Lint-Rendering]]
- [[React-Server-Components]]
- [[Browser-Main-Thread]]
