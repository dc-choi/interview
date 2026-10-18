---
tags: [palantir, ontology, data-modeling, schema, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 온톨로지 모델링", "Palantir Ontology Modeling"]
---

# Palantir Ontology 모델링: 객체의 단위와 의미 계약

모델링의 시작은 테이블을 객체로 바꾸는 작업이 아니라, 업무에서 같은 대상으로 취급할 것과 서로 다른 사건을 구분하는 일이다. Object type은 개체 또는 사건의 스키마, object는 그 인스턴스, object set은 인스턴스 집합이다. Dataset과 row의 비유는 데이터 연결을 설명하지만 업무 경계를 대신 정하지 않는다. [Core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts), [Object types](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview)

아래 예시는 모델링 판단을 위한 가상 설계다. 공식 기능과 설계 해석을 구분하며 실제 Foundry 환경에서 검증한 구현은 아니다.

## 먼저 객체 하나의 뜻을 고정한다

주문 CSV에 고객, 상품과 수량이 같이 있어도 행 하나가 곧 업무 객체 하나라는 뜻은 아니다. 독립적으로 식별하고 조회하거나 상태를 바꾸는 대상이라면 별도 object type을 검토한다. 원천 시스템명이나 부서별 사본을 타입 경계로 삼기보다 업무 개체를 먼저 정의하고 데이터를 매핑한다. [Design best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)

| 질문 | 배송 예시의 설계 해석 |
|---|---|
| 한 객체가 무엇 하나를 뜻하는가? | `Order`는 주문, `OrderLine`은 주문 내 상품 항목, `Shipment`는 실제 운송 단위 |
| 같은 대상의 상태인가, 별도 사건인가? | 배송 상태는 Shipment의 현재 값, 인수인계는 별도 `HandlingEvent` |
| 원천이 다른가, 실체가 다른가? | ERP 주문과 판매 채널 주문이 같은 주문이면 원천 ID를 통합 ID에 대응 |
| 관계 자체에 속성이 있는가? | 운송 배정의 유효 기간, 역할과 수량은 배정 객체에 둠 |
| 집계의 분모는 무엇인가? | 주문 수, 주문 항목 수와 배송 건수를 혼용하지 않음 |

이 구분은 재사용 가능한 판단 예시이며 Palantir가 위 타입 구성을 강제한다는 뜻은 아니다. 타입에 따라 값의 의미가 달라지고 대부분 속성이 비는 거대 객체는 분리 신호다. 반대로 같은 고객을 부서마다 복제하면 정본과 업무 로직이 갈라진다. 현재 개체와 관측 사건을 분리하되 현재 개체의 변경 때마다 전체 사본을 새 개체로 만들지는 않는다. [Anti-patterns: Department Silos, God Object, Time Machine](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns)

## 식별자는 값과 생애주기를 함께 설계한다

| 구분 | 역할 | 혼동하면 생기는 문제 |
|---|---|---|
| Object type ID | 애플리케이션 설정에서 타입을 참조 | 타입의 식별과 인스턴스 식별을 혼용 |
| RID | Foundry 자원에 자동 부여되는 식별자 | 오류의 자원 RID를 업무 키로 오해 |
| API name | 코드가 타입을 참조하는 이름 | 표시명 변경과 코드 계약 변경을 혼용 |
| Primary key | 타입 안의 객체 인스턴스를 식별 | 중복이나 재생성으로 편집과 링크의 대상이 달라짐 |
| Title key | 객체를 화면에 표시할 값 | 이름이 바뀌거나 중복된 사람을 다른 개체로 취급 |

타입 메타데이터와 객체 값의 키는 서로 다른 층이다. 객체 title은 표시용이며 primary key의 대체물이 아니다. [Object type metadata](https://www.palantir.com/docs/foundry/object-link-types/object-type-metadata), [Create an object type: primary key and title key](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)

Primary key는 고유하면서 반복 빌드에서 결정적이어야 한다. 빌드마다 달라지는 행 번호나 무작위 생성값을 쓰면 기존 편집이 연결되지 않거나 링크가 사라질 수 있다. OSv2는 중복 키를 Funnel batch build 오류로 처리하며 OSv1은 성공처럼 보여도 예기치 않은 객체 변경이 생길 수 있다. Action으로만 생성하는 타입도 고유 primary key가 필요하다. [Create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)

설계할 때 원천 키 충돌, 병합과 분리, 삭제 후 재등장, 키 재사용을 어떻게 다룰지 정한다. 예를 들어 여러 판매 채널의 주문 번호가 겹치면 `채널 + 원천주문ID`를 안정적으로 인코딩한 키를 고려하고, 주문의 이름이나 배송 상태는 키에서 제외한다. 이는 설계 예시다. 신규 객체 생성 때 한 번 발급하고 계속 유지하는 ID와, 매 수집 빌드 때 다시 생성하는 무작위 키를 같은 문제로 취급하지 않는다.

키의 타입도 소비자를 고려한다. String, Integer, Short는 지원되지만 부동소수형은 primary key로 쓸 수 없다. Date/Timestamp는 충돌과 표시 형식의 차이, Long은 JavaScript 표현 문제 때문에 일반적으로 String 사용을 권장한다. [Properties: supported property types](https://www.palantir.com/docs/foundry/object-link-types/properties-overview)

## 속성의 재사용과 데이터 보장을 구분한다

Shared property는 여러 타입이 속성 메타데이터를 중앙에서 함께 관리하는 수단이다. 값 자체를 공유하거나 같은 개체로 합치는 기능은 아니다. `Employee.startDate`와 `Contractor.startDate`의 의미가 같을 때 메타데이터를 재사용할 수 있지만, 서로 다른 의미의 날짜를 이름이 같다는 이유로 합치면 안 된다. [Shared properties](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview)

Required property는 저장 버튼 단계의 완결성 보장이 아니다. 원천 값은 색인 시, Action 편집은 적용 시 검사한다. OSv2에서 지원하며, 기존 null이 있으면 스키마 저장 후 reindex가 실패할 수 있다. 배열은 기본적으로 빈 배열도 거부하지만 빈 배열을 허용하도록 구성할 수 있다. [Required properties](https://www.palantir.com/docs/foundry/object-link-types/required-properties)

특히 multi-datasource object에서 필수 속성을 공급하는 datasource에 해당 객체의 행 자체가 없으면, 결과 객체에 필수 값이 없어도 색인될 수 있다. 그 datasource의 다른 속성을 Action으로 추가하면 필수 검증이 발생한다. 따라서 Required 표시만 보고 객체 전체가 업무상 완전하다고 판단하지 않고 원천별 존재 조건도 확인한다. [Required properties: multiple backing datasources](https://www.palantir.com/docs/foundry/object-link-types/required-properties)

같은 사실은 의미상 소유하는 객체에 두고 링크를 통해 읽는다. 입력이 안정적이고 같은 파이프라인에서 갱신되는 값은 사전 계산을 검토한다. Action으로 바뀌는 연결 대상의 개수처럼 동적인 값은 derived property를 검토한다. 런타임 계산 비용 때문에 비정규화를 택하면 정본과 복사본의 갱신 전략을 함께 정한다. 주소나 AI 결과와 신뢰도처럼 함께 해석할 다중 필드는 struct로 묶을 수 있다. [Structural guidance: normalization and structs](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance)

## 링크는 방향, 카디널리티와 관계의 내용을 나눠 본다

Link type 하나는 양쪽 방향을 가지며 각 방향에 표시명과 API name이 있다. `Shipment.order`와 `Order.shipments`를 위해 같은 관계의 역방향 link type을 별도로 만들 필요는 없다. 동일한 두 타입 사이에도 배정과 승인처럼 의미가 다른 관계는 각각 정의할 수 있다. 서로 다른 Ontology 사이의 직접 링크는 지원하지 않는다. [Link types](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview)

| 구현 방식 | 맞는 관계 | 확인할 점 |
|---|---|---|
| Object property의 foreign key | 1:1 또는 N:1 | 상대 primary key를 참조하는 값과 타입 |
| Join table dataset | N:M | 두 타입의 키 쌍과 편집 설정 |
| Object-backed link | 관계에 역할, 기간, 상태 등 속성이 있음 | 중간 객체와 양쪽을 연결할 링크를 먼저 생성 |

1:1 선언은 의도 표시이며 실제 1:1을 강제하지 않는다. 단독 배정 같은 업무 무결성은 데이터와 변경 경로에서 별도로 검증해야 한다. Object-backed link는 관계의 속성을 보존하면서 직접 연결과 중간 객체의 상세 보기를 제공한다. [Create a link type](https://www.palantir.com/docs/foundry/object-link-types/create-link-type)

가령 사람과 프로젝트의 연결에 배정 기간과 역할이 있으면 `Assignment`를 독립 객체로 둔다. 같은 두 사람과 프로젝트 사이에 여러 기간의 배정이 있을 수 있으므로 단순 N:M 연결 하나가 각각의 배정 사건을 대체한다고 가정하지 않는다. 실제 링크 탐색과 상세 배정 조회의 기대 결과를 따로 정의한다. 이 예시는 관계 모델링의 해석이며 제품의 중복 관계 보장에 대한 주장이 아니다.

## 구조 검토 다음에는 업무 질문으로 검증한다

모델 작성자가 답을 찾는다는 사실만으로 탐색 가능성이 입증되지는 않는다. 처음 접한 사용자에게 중요한 업무 질문을 주고 범용 분석 도구로 답하게 한다. 정답 외에 시작 타입, 검색어, 경로, 수동 조인, 시간과 도움 요청을 관찰한다. 같은 질문을 사람과 에이전트에게 경로 힌트 없이 제시하면 모델이 담지 못한 암묵지를 찾는 데 도움이 된다. [Ontology design: Validation](https://www.palantir.com/docs/foundry/ontology/ontology-design-validation)

위 배송 예시라면 지연이 많은 지역에서 센터, 주문, 배송과 운송 사건으로 내려가 원인 후보와 영향받을 다음 배송을 설명하게 한다. 경로별 주문 건수가 다르면 객체 단위, 중복 키와 집계 정의부터 확인한다. 탐색 실패는 권한, 데이터 누락이나 도구 한계일 수도 있으므로 링크 추가만으로 해결하려 하지 않는다.

## 출처

- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts)
- [Palantir, Object types](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview)
- [Palantir, Ontology design: Best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)
- [Palantir, Ontology design: Anti-patterns](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns)
- [Palantir, Object type metadata reference](https://www.palantir.com/docs/foundry/object-link-types/object-type-metadata)
- [Palantir, Create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)
- [Palantir, Properties](https://www.palantir.com/docs/foundry/object-link-types/properties-overview)
- [Palantir, Shared properties](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview)
- [Palantir, Required properties](https://www.palantir.com/docs/foundry/object-link-types/required-properties)
- [Palantir, Ontology design: Structural guidance](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance)
- [Palantir, Link types](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview)
- [Palantir, Create a link type](https://www.palantir.com/docs/foundry/object-link-types/create-link-type)
- [Palantir, Ontology design: Validation](https://www.palantir.com/docs/foundry/ontology/ontology-design-validation)

## 관련 문서

- [[Palantir-Foundry|Palantir 학습 지도]]
- [[Palantir-Ontology-Evolution|인터페이스 계약과 스키마 변경]]
- [[Palantir-Object-Backend|객체의 원천과 편집]]
- [[Ontology-Knowledge-Graph|일반 온톨로지와 지식 그래프]]
