---
tags: [orm, mikroorm, modeling, typescript]
status: index
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 모델링", "MikroORM Modeling"]
---

# MikroORM 모델링

MikroORM 모델링은 테이블을 클래스에 기계적으로 옮기는 작업이 아니다. 엔티티의 식별자, 변경 경계, 관계의 소유자, 읽을 그래프와 API 응답 경계를 함께 정하는 일이다. 이 묶음은 안정 버전 7.1.11 기준이다.

## 이 폴더에서 답하는 질문

| 질문 | 문서 | 먼저 확인할 결론 |
| --- | --- | --- |
| 엔티티를 어떤 문법으로 정의할까? | [[MikroORM-Entity-Modeling]] | 새 v7.1 코드는 defineEntity와 클래스를 우선 검토한다. |
| FK와 조인 테이블을 어느 쪽이 관리할까? | [[MikroORM-Relationships]] | 양방향 관계에도 소유 측은 하나이며, 쓰기는 그 측을 기준으로 한다. |
| 언제 조인하고 언제 별도 조회할까? | [[MikroORM-Loading-Relations]] | v7.1 기본은 to-one join, to-many select-in인 balanced다. |
| 엔티티를 HTTP 응답으로 바로 내보내도 될까? | [[MikroORM-Serialization]] | populate 힌트와 DTO shape를 의도적으로 맞춘다. |

## 권장 학습 순서

1. [[MikroORM-Entity-Modeling|엔티티 모델링]]에서 메타데이터와 도메인 클래스의 역할을 분리한다.
2. [[MikroORM-Relationships|관계 모델링]]에서 소유 측, Collection, cascade와 orphan removal을 구별한다.
3. [[MikroORM-Loading-Relations|관계 로딩]]에서 한 유스케이스가 필요한 읽기 그래프를 populate로 선언한다.
4. [[MikroORM-Serialization|직렬화]]에서 외부 DTO를 명시하고 민감 필드를 막는다.

## 모델링 전 결정 표

| 결정 | 기본 선택 | 바꾸는 조건 |
| --- | --- | --- |
| 엔티티 정의 | defineEntity + class | 기존 프로젝트가 decorator와 metadata provider에 이미 표준화되어 있을 때 |
| 식별자 | 단일 surrogate PK | 자연키가 실제로 불변이며 전체 참조 비용을 감당할 때 |
| 값 객체 | embeddable | 독립 생명주기, 독립 식별자 또는 다른 aggregate의 참조가 필요할 때 |
| 다대다 | 단순 링크만이면 ManyToMany | 링크 자체에 수량, 상태, 권한 같은 속성이 생길 때는 명시적 조인 엔티티 |
| 관계 읽기 | 유스케이스별 populate | 항상 같은 작은 to-one을 필요로 하고 측정으로 유리함이 확인될 때 |
| API 출력 | explicit serialize 또는 별도 DTO | 내부 관리 화면처럼 노출 필드가 완전히 통제되고 회귀 검사가 있을 때 |

## 모델링 검증 질문

- 이 객체가 독립 식별자와 생명주기를 가져야 하는가, 아니면 엔티티 안의 값 객체인가?
- 관계를 바꿀 수 있는 쪽과 FK 또는 조인 테이블을 쓰는 소유 측이 일치하는가?
- 목록 API가 실제로 필요한 관계만 populate하는가?
- 비밀번호 해시, 내부 상태, 권한 판단용 값이 직렬화 경로에서 숨겨졌는가?
- 생성자에만 둔 불변식이 DB에서 hydrate한 엔티티에도 유지되는가?

## 관련 문서

- [[MikroORM-Entity-Modeling|엔티티 정의와 값 객체]]
- [[MikroORM-Relationships|관계와 생명주기]]
- [[MikroORM-Loading-Relations|populate와 로딩 전략]]
- [[MikroORM-Serialization|DTO와 직렬화 경계]]

## 출처

- [MikroORM documentation versions — MikroORM](https://mikro-orm.io/versions)
- [MikroORM v7.1.11 release — mikro-orm/mikro-orm](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [Defining Entities — MikroORM](https://mikro-orm.io/docs/defining-entities)
- [Modeling Entity Relationships — MikroORM](https://mikro-orm.io/docs/relationships)
