---
tags: [palantir, superrepo, ontology-as-code, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SuperRepo local preview와 product 배포"]
---

# SuperRepo preview와 product 배포

SuperRepo는 Ontology definition, function과 React 앱을 한 versioned monorepo에서 개발하고 Marketplace product로 배포하는 경로다. 아래는 2026년 8월 beta 도입 계약이며 현재 모든 기능의 지원을 보증하는 목록은 아니다.

## Code와 기존 자원의 소유를 나눈다

TypeScript Ontology-as-code definition이 관리하는 object/link/interface/action은 배포 때 실제 enrollment entity로 materialize된다. 이미 Ontology Manager에서 만든 자원은 다시 정의하지 않고 import할 수 있다. Imported resource와 code-owned definition의 변경 책임을 구분한다.

Local CLI는 embedded Ontology server, 언어별 function preview runtime과 React 앱을 함께 실행한다. 시작할 때 seed file로 fresh local DB를 채우고 code definition 변경마다 SDK를 재생성한다. SDK republish 없는 개발 loop와 배포된 SDK/API의 호환성을 다른 계약으로 검토한다. Local server가 실제 enrollment의 권한, index와 concurrency를 모두 동일 재현한다고 가정하지 않는다.

## 같은 배포 입력을 서로 다른 CI에서 사용한다

`foundry deploy configure`가 쓰는 `env.yml`을 두 배포 경로가 사용한다. 플랫폼 hosting source는 version tag와 Foundry CI, 외부 hosting source는 local/외부 CI의 CLI build/deploy를 사용한다. Product의 재현/서명과 실제 target의 permission/input mapping을 함께 확인한다.

한 artifact에 묶는 것은 모든 외부 효과까지 원자적으로 rollback하는 보장이 아니다. Generated code, product version, install target과 실제 실행 환경을 각각 추적한다. 당시 Python function/agent/external source/Automate/data pipeline은 후속 개발 목록이었다.

## 출처

- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)

## 관련 문서

- [[Palantir-Generated-Applications-and-Seed-Data|생성 앱과 seed data]]
- [[Palantir-Branching-and-Packaging-Boundaries|Branch와 Marketplace]]
- [[Palantir-OSDK-React-Cache|React state와 server result]]
