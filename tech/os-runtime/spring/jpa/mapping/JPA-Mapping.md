---
tags: [jpa, entity, relationship, value-object, embeddable, aggregate]
status: index
category: "OS & Runtime"
aliases: ["JPA Mapping", "JPA 매핑"]
---

# JPA 매핑

매핑은 객체 model의 identity, 참조, 값 개념을 relational schema의 key, foreign key, column으로 옮기는 선언이다. Annotation을 붙이는 순서가 아니라 무엇이 entity이고 무엇이 값인지, foreign key를 어느 쪽이 기록하는지, 어디까지가 하나의 애그리거트인지를 먼저 정한다. 선언 결과는 생성 DDL과 실제 constraint로 확인한다.

- [[JPA-Entity-Mapping|엔티티 매핑]]: entity 요건, schema 생성, field, identifier와 상속
- [[JPA-Relationship-Mapping|연관관계 매핑]]: FK 소유, 방향, 다중성과 관계 entity
- [[JPA-Value-Types|값 타입]]: embeddable, 불변성, equality와 element collection
- [[JPA-Aggregate-Collection-Mapping|애그리거트 컬렉션 매핑]]: root가 통제하는 자식, cascade와 orphanRemoval, 순서와 조회 계획

## 함께 볼 문서

- [[JPA|JPA와 Jakarta Persistence]]
