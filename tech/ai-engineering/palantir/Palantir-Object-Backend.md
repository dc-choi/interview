---
tags: [palantir, foundry, ontology, indexing, storage]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Ontology 백엔드", "Object Storage v2"]
---

# Palantir 객체 백엔드

Ontology 백엔드는 데이터 원천과 업무 의미를 연결하고 객체를 색인, 조회하며 변경하는 실행 계층이다. 단일 그래프 DB의 별칭으로 보면 의미 정의, 읽기, 쓰기와 영속화의 책임을 놓친다. 객체와 관계의 개념은 [[Ontology-Knowledge-Graph]]에서 다룬다.

2026-10-16 공식 문서 대조 기준이다. 실제 데이터 규모, 지연, 장애 복구와 동시 수정은 실행 검증하지 않았다.

## 의미 정의, 조회와 쓰기를 나눈다

| 구성 요소 | 책임 |
|---|---|
| Ontology Metadata Service(OMS) | object type, link type과 action type 등의 의미와 메타데이터 정의 |
| Object databases | 색인된 객체 저장, 조회 계산과 사용자 편집 처리 |
| Object Set Service(OSS) | 객체 검색, 필터, 집계와 로딩을 제공하는 읽기 서비스 |
| Actions | 조건과 권한을 가진 사용자 편집 적용 |
| Object Data Funnel | 데이터 원천과 사용자 편집을 객체 DB에 반영하는 쓰기 조정 |
| Functions on Objects | 업무 앱과 대시보드에서 실행할 로직 |

OSv2는 색인과 조회의 책임을 분리한 구조다. 원천의 dataset과 모델, Ontology 메타데이터와 객체 DB를 같은 자원으로 취급하지 않는다. ([Ontology architecture](https://www.palantir.com/docs/foundry/object-backend/overview))

Object set도 데이터 스냅샷과 같지 않다. Static set은 primary key 목록, dynamic set은 필터 정의를 저장한다. 동적 set은 입력이 변하면 결과도 바뀔 수 있으므로 저장한 질문과 그 시점의 결과를 구분한다.

## 원천 데이터와 객체 색인의 차이

색인은 Foundry datasource를 특화된 DB에서 빠르게 조회할 수 있게 만드는 과정이다. Funnel은 batch와 streaming 파이프라인을 관리하며 원천 구성, 지연 요구와 비용에 맞춰 경로를 고른다. 연결이나 원천 transaction 완료만으로 객체 조회에 반영됐다고 판단하지 않는다. ([Indexing](https://www.palantir.com/docs/foundry/object-indexing/overview))

객체 DB의 색인 데이터는 재구성 가능한 임시 계층으로 설명된다. 지속 보존은 backing datasource와 Funnel이 관리하는 dataset 등 별도 저장이 맡는다. 사용자 편집은 색인에 적용되고 영속 저장으로 반영된다. 따라서 MMDP의 원천 가상화와 객체 색인의 존재는 서로 다른 질문이다. ([How edits are applied](https://www.palantir.com/docs/foundry/object-edits/how-edits-applied), [[Palantir-Data-and-Model-Integration]])

## 색인 실패와 데이터 유실을 구분한다

OSv2 데이터 제약은 색인 때 검사한다. Batch 위반은 색인 job 실패로, streaming 위반은 해당 record drop으로 처리한다. 작업이 계속 실행된다는 이유만으로 모든 record가 들어갔다고 판단하면 안 된다. ([Data restrictions](https://www.palantir.com/docs/foundry/object-indexing/data-restrictions))

- 같은 transaction 안의 중복 primary key는 실패한다. 다른 transaction 간에는 나중 transaction의 값이 사용된다.
- 원천 schema와 객체 property 타입의 호환성을 검사한다. 기존 값이 새 타입에 맞지 않으면 migration이 실패하며 자동 정제나 강제 변환을 기대하지 않는다.
- `NaN`, 무한대, 빈 문자열, 중첩 배열과 null 원소를 가진 배열 등에는 제한이 있다.

Primary key 충돌, 타입 불일치와 누락 record를 따로 관찰해야 한다. 구체적인 허용 타입과 추가 제한은 실제 적용 시 제약 문서에서 다시 확인한다.

## 사용자 편집은 원천 갱신과 충돌할 수 있다

Virtual table와 Iceberg table-backed object도 Ontology Manager에서 구성할 수 있다. 2025년 9월 안내에서 외부 virtual table은 update detection을 활성화해 reindex를 자동화하고 managed Iceberg/managed virtual output은 Foundry가 reindex를 trigger했다. Source의 저장 위치와 변경 감지 경로를 함께 정하며 외부 변경이 곧 객체 갱신인 것으로 취급하지 않는다.

Action은 한 번에 하나 이상의 객체를 변경하는 transaction이며 객체 생성/삭제, property 변경과 link 변경을 지원한다. 외부 앱에서도 API로 실행할 수 있다. 이는 원천 시스템의 동일 transaction이나 외부 API까지 묶인 원자성을 뜻하지 않는다. ([Object edits](https://www.palantir.com/docs/foundry/object-edits/overview))

기본 충돌 전략은 편집한 property에 대해 사용자 편집을 우선한다. 다른 전략으로 가장 최근 값을 적용할 수 있으므로, 원천이 갱신되면 사람의 수정이 반드시 덮인다고 가정하지 않는다. OSv2 Actions 서버는 편집 생성에 직접 사용한 객체의 버전을 제한적으로 검사하며, 모든 읽기 대상의 변경을 막는다는 보장은 없다. 화면에서 읽은 버전과 서버가 `/apply`에서 읽은 버전도 같다고 보장하지 않는다. ([How edits are applied](https://www.palantir.com/docs/foundry/object-edits/how-edits-applied))

예를 들어 설비 상태를 근거로 정비 일정을 바꾸는 작업은 화면의 오래된 상태, 서버 검사에 쓰인 상태와 실제 변경 결과를 나누어 확인해야 한다. 이는 업무 설계 점검 예시다.

2024년 5월 도입 공지는 most-recent 전략에 datasource의 `Timestamp` property가 필요하며 `Date`는 대신 쓸 수 없다고 명시했다. Multi-datasource object는 datasource마다 다른 전략을 둘 수 있어 한 Action이 바꾼 property도 각 backing source의 정책에 따라 적용된다. User-edits 우선 기본값과 source update timestamp의 의미를 함께 정한다. 같은 달 stream input의 GA는 초 단위 색인을 지향했지만 일반 stream과 이후 direct datasource의 edit 조건은 구분한다. ([May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05))

## 저지연 쓰기에는 별도 조건이 있다

Direct datasources는 2026-10-16 기준 Beta이며 enrollment에서 사용할 수 없을 수 있다. 지원 writer는 Pipeline Builder이고, 처리량과 저지연 쓰기 기능 사이에 트레이드오프가 있다. Stream 기반 객체의 사용자 편집도 이 경로의 기능이다. 일반 Foundry stream datasource의 Action 미지원 설명을 모든 streaming 경로에 확대하지 않는다. ([Direct datasources](https://www.palantir.com/docs/foundry/object-indexing/direct-datasources), [Object edits](https://www.palantir.com/docs/foundry/object-edits/overview))

Source timestamp property를 설정하면 기존 값보다 오래된 direct write를 버리는 순서 제어를 사용할 수 있다. 설정 뒤 들어오는 쓰기에만 적용된다. 과거 유입을 바로잡기 위한 replay는 객체 view를 초기화해 기존 객체를 제거하므로 실행 전 복구와 재생 범위를 검토한다.

## 운영 점검

다음은 문서의 구조를 실제 시스템에 적용할 때 확인할 사항이다.

1. 원천 갱신, 색인 완료와 조회 반영 시각을 구분해서 관찰하는가?
2. Batch 실패와 stream record drop을 서로 다른 경보로 다루는가?
3. 사용자 편집 우선순위, 삭제와 schema 변경 시 보존할 상태를 정했는가?
4. UI에서 본 상태와 실행 시점 상태가 달라도 업무 제약이 유지되는가?
5. Direct write replay의 초기화 영향을 확인하고 복원 가능한가?

## 출처

- [Palantir, Ontology architecture](https://www.palantir.com/docs/foundry/object-backend/overview)
- [Palantir, Indexing](https://www.palantir.com/docs/foundry/object-indexing/overview)
- [Palantir, Data restrictions](https://www.palantir.com/docs/foundry/object-indexing/data-restrictions)
- [Palantir, Object edits and materializations](https://www.palantir.com/docs/foundry/object-edits/overview)
- [Palantir, How user edits are applied](https://www.palantir.com/docs/foundry/object-edits/how-edits-applied)
- [Palantir, Direct datasources](https://www.palantir.com/docs/foundry/object-indexing/direct-datasources)
- [Palantir, May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)

## 관련 문서

- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Palantir-Data-and-Model-Integration|데이터와 모델 통합]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
