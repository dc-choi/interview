---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ecosystem 공통 schema와 데이터 거버넌스"]
---

# Ecosystem 공통 schema와 데이터 거버넌스

## Schema 공유와 데이터 공유

Market/client/vendor/third-party ecosystem은 조직 간 협업의 다른 구조이며 함께 사용할 수 있다. Host가 enrollment 계약/과금/온보딩을 조정하더라도 각 참여자의 private space와 공유 범위/거버넌스 책임을 명시해야 한다.

공통 ontology는 같은 원천 시스템이나 raw format을 요구하지 않는다. 참여자는 private pipeline에서 공통 entity/property/link schema로 mapping하고 template을 재사용할 수 있다. Versioned schema의 개선이 모든 참여자에게 자동 안전하게 배포된다는 보장은 없으며 compatibility/identity/소유권을 따로 정한다.

여러 참여자의 데이터를 모아 model을 만드는 앱과 각 참여자의 private data 위에 같은 앱을 설치하는 구조는 다르다. Pooled data의 anonymization/aggregation은 합의된 설정과 재식별 가능성을 검토해야 하며 공통 schema 자체가 개인정보 보호를 보장하지 않는다.

## 권한 경계

Private/shared space, project와 organization/security marking이 실제 접근을 제어한다. Metadata/tag/diagram의 소속과 mandatory control을 혼동하지 않는다. 공유용 dataset을 별도 derive/export하는 경우 원본 권한과 export된 사본의 수명/권한이 자동 같다고 가정하지 않는다.

Third-party developer의 앱/데이터 인증은 host가 선택하는 governance 방식이며 모든 생태계 앱이 vendor 검증을 받았다는 뜻이 아니다. 경쟁 관계 참여자의 최소공유, 사용 목적, retention과 책임 경계를 계약과 실제 ACL에서 함께 확인한다. 실제 공유/설치나 조직 생성은 하지 않았다.

## 출처

- [Palantir use-case-patterns, use-case-patterns](https://www.palantir.com/docs/foundry/use-case-patterns)
- [Palantir use-case-patterns, alerting-workflow](https://www.palantir.com/docs/foundry/use-case-patterns/alerting-workflow)
- [Palantir use-case-patterns, investigation-and-cohorting](https://www.palantir.com/docs/foundry/use-case-patterns/investigation-and-cohorting)
- [Palantir use-case-patterns, multi-organization-ecosystems](https://www.palantir.com/docs/foundry/use-case-patterns/multi-organization-ecosystems)
- [Palantir use-case-patterns, operational-process-coordination](https://www.palantir.com/docs/foundry/use-case-patterns/operational-process-coordination)
- [Palantir use-case-patterns, resource-allocation-optimization](https://www.palantir.com/docs/foundry/use-case-patterns/resource-allocation-optimization)

## 관련 문서

- [[Palantir-Use-Case-Design]]
