---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workflow Builder 실행 graph와 이름 충돌"]
---

# Workflow Builder 실행 graph와 이름 충돌

## 실행 구조

Beta Workflow Builder는 시간/객체 변경 trigger, Function/no-code/LLM compute, Action/no-op effect를 연결한다. Fork는 병렬 경로를 만들고 이에 묶인 after-fork는 모든 경로를 기다린다. Loop index는0부터 시작하며 after-loop는 모든 반복을 기다린다. Fork와 loop의 중첩도 지원하지만 결합된 wait node를 임의로 분리하는 것으로 해석하지 않는다.

Subgraph는 동일 graph 안에서만 참조한다. Workflow 복사는 subgraph를 함께 복사하며 다른 graph의 정의를 공유하는 모듈 계약과 다르다. Graph 구조의 유효성과 개별 Function/LLM/Action의 권한, 오류와 외부 부작용은 별도로 확인한다.

Preview는 실제 object를 입력으로 여러 테스트를 병렬 실행할 수 있고 live mode는 graph 편집 때 자동 재실행한다. 원문은 생성/수정/삭제 output을 보여주지만 preview의 모든 변경이 영속 저장되는지 또는 모두 격리되는지를 명시적으로 보장하지 않는다. 따라서 preview를 안전한 sandbox나 운영 적용으로 단정하지 않는다.

## URL과 제품 이름

동일 prefix의 overview URL은 실행 Builder가 아닌 Workflow Lineage 본문을 반환한다. Lineage는 이전에 Workflow Builder라는 이름을 썼다. 이 이름/URL 충돌을 별도 제품 계약으로 보존한다. 실행 graph의 fork/loop 의미를 Lineage 의존성 graph에 적용하거나 Lineage의 bulk edit 기능을 실행 Builder의 기능으로 옮기지 않는다.

실제 graph 생성, preview와 Action 실행은 수행하지 않았다.

## 출처

- [Palantir workflow-builder, workflow-builder](https://www.palantir.com/docs/foundry/workflow-builder)
- [Palantir workflow-builder, core-concepts](https://www.palantir.com/docs/foundry/workflow-builder/core-concepts)
- [Palantir workflow-builder, overview](https://www.palantir.com/docs/foundry/workflow-builder/overview)

## 관련 문서

- [[Palantir-Workflow-Operations]]
