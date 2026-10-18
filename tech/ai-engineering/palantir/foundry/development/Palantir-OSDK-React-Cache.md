---
tags: [palantir, osdk, react, cache, optimistic-update]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["OSDK React cache와 낙관적 갱신"]
---

# OSDK React의 cache와 낙관적 갱신

`@osdk/react`는 Ontology query와 Action을 React hook으로 연결하고 여러 component의 cache를 공유한다. 아래는 2026년 5월 GA 도입 계약이며 실제 앱의 동시 수정/권한 변경을 시험한 결과는 아니다.

## 객체와 query를 서로 다른 단위로 캐시한다

Normalized object cache는 객체를 한 번 저장하고 그 객체를 참조하는 list/link/view에 변경을 반영한다. 같은 query를 실행하는 component는 network request와 cache entry를 공유한다. Component 수만큼 별도 fetch가 필요하다고 가정하지 않는다.

Action response의 added/modified/deleted object를 사용해 list의 `where`를 재평가한다. Action-driven invalidation이 원천 pipeline의 모든 변경이나 외부 client의 모든 쓰기까지 즉시 알려주는 계약인 것은 아니다. 해당 query의 refresh/subscription 조건을 별도로 정한다.

## 낙관적 화면과 서버 결과를 구분한다

Optimistic update는 서버 응답 전에 임시 store layer를 적용하고 Action 실패 때 되돌린다. 이 rollback은 브라우저 cache의 rollback이며 이미 실행한 외부 webhook의 보상 transaction이 아니다. 사용자가 본 임시 성공 표시와 최종 Action 결과를 구분한다.

2026년 5월 beta import `@osdk/react/experimental`은 deprecated 호환 re-export로 남고 GA 경로로 점진 이전할 수 있었다. Path가 resolve되는 것과 무기한 지원은 다르므로 upgrade 때 실제 package version과 제거 정책을 확인한다.

`@osdk/react-components`의 2026년 9월 beta는 이 cache 위에 object table/filter/Action form/media viewer를 제공했다. CSS custom property/layer, base component와 hook으로 부분 교체할 수 있지만 release마다 component/API가 달라질 수 있다. 사용한 package version과 provider/CSS 구성을 함께 고정하고 생성 form의 인가를 서버 Action 조건으로 확인한다.

## 출처

- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)

## 관련 문서

- [[Palantir-SDK-and-Agent-Tools|OSDK 생성과 인가]]
- [[Palantir-Actions-and-Functions|Action transaction과 외부 효과]]
- [[Palantir-Generated-Applications-and-Seed-Data|생성 React 앱의 배포]]
