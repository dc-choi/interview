---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Legacy Phonograph 등록과 재색인

OSv1 Phonograph는 backing/writeback datasource 등록 뒤 색인한 데이터를 앱에 제공한다. 등록 해제는 조회를 막고 user edit history도 제거할 수 있다. Schema 변경 때문에 unregister가 필요한지와 기존 편집 보존을 먼저 확인한다.

APPEND/UPDATE transaction은 incremental, SNAPSHOT은 full batch reindex한다. Datasources의 등록 상태와 마지막 reindex success/in progress/failed를 별도로 본다. 신규 또는 완전 이전된 Ontology는 OSv2만 사용한다. 공식 페이지의 2026-06-30 unavailable 예정 문구는 실제 특정 enrollment의 종료를 검증한 결과가 아니며, legacy 동작을 이해하는 자료로 유지한다.

## 출처

- [Palantir, object-databases](https://www.palantir.com/docs/foundry/object-databases)
- [Palantir, object-storage-v1](https://www.palantir.com/docs/foundry/object-databases/object-storage-v1)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
