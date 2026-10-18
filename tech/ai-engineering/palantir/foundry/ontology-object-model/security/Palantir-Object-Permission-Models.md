---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Ontology 스키마 권한과 데이터 권한의 분리

Object type, link type와 action type은 스키마 자원이다. 객체와 링크 인스턴스는 실제 데이터다. 스키마를 볼 수 있다는 사실은 데이터 조회 권한을 뜻하지 않는다.

현재 project-based 모델에서는 Compass project의 역할로 스키마를 관리한다. 데이터 조회에는 object type View와 데이터 접근이 모두 필요하다. 데이터 접근은 backing source 권한 또는 별도 object/property security policy로 결정한다. backing datasource는 object type의 project에 import해야 색인할 수 있다. source 없는 object type은 project 기반 권한과 object security policy가 필수다.

## 권한 모델별 차이

| 모델 | 스키마 권한 | 주의점 |
|---|---|---|
| Project-based | project/file 역할 | link 수정은 link와 양쪽 object type의 edit 필요 |
| Legacy Ontology roles | Ontology 자원의 역할 | link 수정은 link Editor와 양쪽 object type Viewer로 설명된다 |
| Legacy datasource-derived | backing datasource 역할 | Ontology Administrators 등 추가 조건, source가 사라지면 스키마 권한도 사라짐 |

Legacy Ontology-level Owner만 모든 자원에 상속된다. Ontology-level Editor를 모든 object type Editor로 확대하지 않는다. legacy 문서는 기본 Ontology Editor와 신규 자원의 모든 사용자 Viewer를 설명하므로 신규 project 모델의 기본값으로 적용하지 않는다. datasource-derived Action은 규칙을 포함한 메타데이터가 Ontology 사용자에게 보이는 구성이다.

Backing dataset을 영구 삭제해 고아가 된 datasource-derived object type은 자동 삭제 대상이며 문서는 24시간을 명시한다. Object security policy를 쓰더라도 이 legacy 모델에서는 source Viewer 요구가 남는다. 정책 생성/편집뿐 아니라 정책 적용 후 속성 추가/삭제에 Ontology Owner가 필요하므로 project 모델 전환을 검토한다.

## Marketplace와 분류

Marketplace는 패키징한 권한 모델로 설치한다. 새 자원을 project에 두도록 하는 대상 환경 toggle이 기존 product의 권한 모델을 바꾸지 않는다. 원본을 project 방식으로 이행하면 다음 upgrade에 대상도 이행된다.

CBAC project의 ontology resource는 허용 범위의 file classification이 필요하며, 누락하면 materialization이 실패한다. Marketplace product 자체에는 file classification을 담지 않는다. 설치 파일은 대상 project 분류를 받고, upgrade는 이후 수동 조정한 분류를 유지한다. source/store/target 사이 분류 하향에는 단계별 declassify 권한을 확인한다.

## 출처

- [Palantir, object-permissioning](https://www.palantir.com/docs/foundry/object-permissioning)
- [Palantir, ontology-permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions)
- [Palantir, ontology-permissions-legacy](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions-legacy)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-permissioning/overview)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
