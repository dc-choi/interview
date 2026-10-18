---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Media reference와 세부 접근 정책

Media reference는 원본 파일을 복제하지 않고 Ontology property로 연결해 preview, tile과 Functions 처리를 제공한다. Media reference list property는 지원하지 않는다. Action form의 media는 성공한 제출 때 backing set에 올라가도록 설명되며 취소/실패한 form의 orphan upload를 피하는 계약이다. 이 설명을 모든 raw upload API의 transaction 보장으로 확대하지 않는다.

## Item별 권한 흐름

Media set의 reference와 metadata를 dataset으로 만든 후 row-level policy가 있는 Restricted View를 만들고 이를 object type의 datasource로 사용한다. Reference column을 media reference property로 설정하고 media source를 연결한다.

기본적으로 backing media set의 모든 Marking 접근이 필요하다. 특정 Marking 상속을 중단할 수 있지만 해당 object 경로의 제한만 바꾸며 backing set의 Marking 자체를 지우지 않는다. 사용자는 여전히 RV granular policy를 만족해야 하고 중단하지 않은 inherited Marking도 적용된다.

따라서 object를 볼 수 있는지, media property가 요구하는 상속 Marking이 무엇인지, 원본 set에 직접 접근 가능한지를 분리해서 확인한다. 파일 이름이나 reference를 안다는 사실이 접근 허용이 되지는 않는다.

## 출처

- [Palantir, configure-granular-policies-media](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/configure-granular-policies-media)
- [Palantir, media-in-ontology](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-in-ontology)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
