---
tags: [architecture, ddd, bounded-context, domain-event, state-machine, wms, logistics]
status: done
verified_at: 2026-10-11
category: "아키텍처&설계(Architecture&Design)"
aliases: ["WMS Inbound Context Modeling", "WMS 입고 컨텍스트 모델링", "입고 관리 도메인 모델링"]
---

# WMS 입고(Inbound) 컨텍스트 모델링

창고 관리 시스템(WMS)의 입고 컨텍스트는 입고 예정 등록, 검수, 적재가 순서대로 이어져 흐름 자체는 단순하다. 대신 예정 정보를 보내는 구매, 영업, 화주 시스템부터 공장과 자동화 설비까지 경계 밖 연결이 많다. 이 문서는 유스케이스에서 도메인 이벤트까지 차례로 좁혀 가는 분석 순서와, 입고, 출고, 재고를 별도 컨텍스트로 나눈 설계에서 입고에 그 순서를 적용한 예시를 정리한다. 예시의 상태 이름과 엔티티 구성은 하나의 설계안이며 업계 표준이 아니다.

## 분석 순서

| 단계 | 질문 | 결과물 |
|---|---|---|
| 1. 유스케이스 | 누가 어떤 목표로 시스템을 쓰는가 | 행위자와 유스케이스 목록 |
| 2. 액티비티 | 유스케이스 하나가 어떤 액션(작업 단계)으로 진행되고 어디서 갈라지는가 | 정상 흐름과 예외 분기 |
| 3. 상태 전이 | 액션이 끝날 때 대상의 상태가 어떻게 바뀌는가 | 상태와 허용 전이 |
| 4. 핵심 엔티티 | 그 상태를 누가 소유하고 규칙을 지키는가 | 엔티티와 식별자 |
| 5. 연관 시스템 | 경계 밖에서 누가 정보를 주고받는가 | 연동 지점과 형식 |
| 6. 도메인 이벤트 | 어떤 전이를 다른 모델이나 컨텍스트가 알아야 하는가 | 과거형 이벤트 목록 |

앞 단계의 결과가 다음 단계의 입력이다. 입고와 출고처럼 유스케이스가 순서대로 이어지는 컨텍스트에서는 상태 전이가 액티비티 흐름과 거의 겹치고, 구현과 테스트도 유스케이스 순서를 따라가기 쉽다. 재고 컨텍스트는 이런 순차 구조와 달라 별도 분석이 필요하다([[WMS-Inventory-Context-Modeling|재고 컨텍스트 모델링]]).

## 용어

같은 대상을 제품과 표준마다 다르게 부른다. 팀이 쓸 말을 하나로 정하고 외부 용어와의 대응을 남긴다.

| 개념 | Dynamics 365 SCM | SAP EWM 9.0 문서 | GS1 |
|---|---|---|---|
| 입고 예정 통지 | 공급사 ASN(advanced shipment notice)으로 inbound load 생성 | ASN, inbound delivery | Despatch Advice(GS1 US 문서는 Advance Ship Notice, ASN) |
| 물류 단위 식별 | license plate | handling unit(HU) | SSCC |
| 품목 | item | product | trade item(GTIN) |
| 적재 위치 결정 | location directive | putaway strategy | 해당 없음 |
| 적재 지시 | putaway work | warehouse task | 해당 없음 |

## 유스케이스

| 행위자 | 유스케이스 | 요지 |
|---|---|---|
| 구매 담당자, 영업 담당자, 화주(물건을 맡긴 고객사) | 입고 예정(ASN) 등록 | 언제 무엇이 얼마나 들어오는지 미리 등록한다. 대형 물류센터는 회사 간 API나 EDI 문서로 받기도 한다 |
| 창고 관리자 | 입고 작업 할당 | 당일 입고 물량을 보고 근무조(shift)별 작업자에게 작업을 나눈다 |
| 입고 작업자 | 입고 스캔 검수 | PDA나 태블릿의 바코드, QR 스캐너로 실물을 찍어 예정 수량과 대조한다 |
| 입고 작업자 | 적재 | 사람이나 지게차로 지정된 로케이션에 옮기고 완료를 스캔한다 |

작업자는 교대로 일하므로 제조 현장처럼 근무조 관리가 작업 할당에 따라온다.

## 액티비티 흐름

액티비티는 유스케이스 하나를 이루는 액션의 흐름이다. 입고에서는 유스케이스별 액티비티가 다음 순서로 이어진다.

1. 입고 예정 등록: 예정 정보가 먼저 있어야 이후 작업을 계획할 수 있다.
2. 작업 할당: 날짜와 시간대별 예정 물량을 보고 작업자를 배정한다.
3. 하차와 스캔 검수: 실물을 스캔해 입고를 기록하고 예정 수량과 실제 수량을 대조한다.
4. 분기: 일치하면 다음 단계로 넘기고, 수량 불일치나 파손이면 이상 처리 흐름으로 보낸다.
5. 적재: 시스템이 정한 로케이션으로 옮긴 뒤 로케이션(랙)에 붙은 바코드를 스캔해 완료한다.

### 검수와 예외 처리

- 스캔 단위: 아이템 바코드를 하나씩 찍거나 팔레트, 박스 같은 물류 단위의 라벨을 찍는다. GS1의 SSCC는 물류 단위를 식별하는 18자리 번호다. 도착 전에 받은 ASN이 물류 단위별 SSCC와 담긴 품목을 알려 주면, 수령 지점에서 SSCC를 한 번 스캔해 내용과 연결하고 수령, 대조, 적재를 빠르게 처리할 수 있다. 물류 단위를 풀어 다시 꾸리면 새 SSCC를 붙인다(GS1 US 안내서 R3.0).
- 대조 기준: 예정 수량을 발주, 주문 확인으로 조정된 발주, ASN 가운데 무엇을 기준으로 볼지 정한다. GS1 Sweden의 Despatch Advice 문서 규격은 피킹 중 발견한 부족분을 통지에 적게 하고, 주문 확인 수량이 발주와 달랐던 품목의 재고가 피킹 시점에 채워졌으면 확인 수량보다 많은 수량도 적을 수 있게 하므로 ASN 수량이 발주와 다를 수 있다.
- 수량 차이: 덜 들어오면 이번 입고(ASN, load)의 예정 수량은 실제에 맞춰 줄일 수 있고, 남은 발주 잔량을 추가 납품으로 기다릴지 마감할지는 따로 정한다. 더 들어오면 허용 범위를 정책으로 정한다. Dynamics 365는 발주 라인의 초과 납품 비율을 기준으로 입고 load(트럭 한 대처럼 한 번에 도착하는 운송 단위)의 초과 입고를 허용, 차단, 마감된 load만 차단 중 하나로 처리하고, 부분 입고는 등록할 때마다 별도 재고 거래로 남긴다.
- 파손과 품질 의심: 일반 적재와 다른 경로로 보낸다. Dynamics 365는 작업자가 모바일 앱에서 고른 처분 코드(disposition code)에 따라 다른 위치 규칙을 적용해 검사 위치나 격리 위치로 옮기게 할 수 있다.

### 적재 위치 지정

- 시스템 지시형 적재에서는 작업자가 아니라 시스템이 규칙으로 로케이션을 정해 적재 지시에 담고, 예외로 위치를 바꾸는 경로를 따로 둔다(Dynamics 365 MHAX의 위치 변경 이벤트 등). 작업자 이동 거리를 줄이는 기준도 이 규칙에 넣을 수 있다.
- Dynamics 365의 location directive는 순서대로 평가하는 규칙이다. 같은 아이템이 이미 있는 위치에 합치는 전략(이후 피킹이 효율적)을 먼저 두고, 실패하면 재고와 들어올 작업이 모두 없는 빈 위치를 찾는 전략을 둘 수 있다. 어느 규칙으로도 위치를 못 찾을 때 위치 없이 작업을 만들지, 작업 생성을 멈출지도 설정한다. ASN 입고에서는 license plate의 내용 전체를 한 위치에 두도록 할 수 있다.
- SAP EWM 9.0 문서 기준으로 EWM은 inbound delivery의 창고 요청을 바탕으로 적재용 warehouse task를 자동으로 만들고, 이때 적재 전략으로 저장 빈을 정한다. warehouse task는 목적지와 그곳까지의 경로를 지정하며, 작업을 만들 때 handling unit을 바로 둘지 중간 빈을 거칠지도 저장 통제(storage control) 설정으로 정한다.
- 검수한 작업자가 이어서 적재까지 할 수도 있고, 입고 위치에 내려 둔 물건을 다른 작업자가 옮길 수도 있다(Dynamics 365의 2단계 처리).

## 상태 전이 (설계 예시)

| 상태 | 의미 | 들어오는 계기 |
|---|---|---|
| 등록(Created) | ASN이 등록됨 | 입고 예정 등록 |
| 검수 중(In Inspection) | 하차하고 검수하는 중 | 하차와 검수 시작 |
| 검수 완료(Inspected) | 검수가 끝나 적재 로케이션이 배정됨 | 수량 대조 완료와 위치 결정 |
| 이동 중 | 로케이션으로 옮기는 중 | 이동 시작(컨베이어 투입 등) |
| 적재 완료 | 로케이션에 놓임 | 로케이션 바코드 스캔 |

- 이동 중 상태는 위치 추적이 필요한 대형 센터에서 두고, 작은 센터는 생략하기도 한다. SAP EWM 9.0 문서처럼 중간 빈을 거치는 warehouse task로 다단계 이동을 표현하는 방법도 있다.
- 상태를 어느 단위에 둘지 먼저 정한다. ASN 하나에 든 팔레트들이 서로 다른 시각에 적재되면 ASN 전체의 상태 하나로는 진행을 표현하기 어렵고, 물류 단위나 적재 지시 단위의 상태가 필요해진다.
- 전이는 이름 있는 메서드로 바꾸고 허용된 선행 상태를 확인한다([[DDD|DDD의 변경 경계와 생명주기 규칙]]). 상태(명사)와 전이 계기(이벤트)를 나누는 방식은 [[Commerce-Order|커머스 주문 상태]]와 같다.

## 핵심 엔티티 (설계 예시)

| 엔티티 | 책임 |
|---|---|
| 입고 예정(ASN) | 언제, 무엇이, 얼마나 들어오는지. 작업 할당과 검수 대조의 기준 |
| 입고 아이템(Inbound Item) | 예정 품목과 수량, 검수 결과 |
| 적재 지시(Put-away Instruction) | 어느 로케이션으로 옮길지 |

창고 쪽에서는 쇼핑몰 모델의 상품(Product) 대신 아이템(Item)이라는 말을 쓰기도 한다. 다만 제품마다 다르므로(Dynamics 365는 item, SAP EWM은 product) 팀이 쓸 말을 하나로 정한다. 같은 대상이 컨텍스트마다 다른 이름과 모델을 갖는 것은 바운디드 컨텍스트의 전형적인 모습이다([[DDD]]).

## 연관 시스템

| 시스템 | 입고와의 접점 |
|---|---|
| 구매, 영업 화면과 화주 시스템 | 입고 예정 등록. 회사 간에는 API나 EDI 문서(GS1 Despatch Advice 등)로 받는다 |
| ERP, SCM | 발주와 입고 결과를 주고받는다. Dynamics 365는 다른 ERP에서 온 발주를 WMS 안에서 inbound shipment order로 다룬다 |
| MES(제조 실행 시스템) | 공장이 직접 운영하는 창고나 외주 창고로 완제품이 들어갈 때 입고 처리를 요청한다 |
| WCS 같은 설비 제어 시스템 | 컨베이어에 올리는 순간이 이동 중 전이의 계기가 된다 |

- ISA-95는 MES를 제조 운영을 맡는 레벨 3에, ERP를 사업 운영을 맡는 레벨 4에 두고 주로 두 레벨 사이의 연동을 다룬다.
- Dynamics 365의 MHAX는 WMS와 물리 설비 사이를 두 큐로 잇는다. WMS가 작업 생성, 시작, 완료 같은 발신 이벤트를 쌓으면 설비 시스템이 주기적으로 가져가 처리하고, 작업 확정, 위치 변경, license plate 입고 같은 수신 이벤트를 돌려준다. 같은 메시지 ID로 다시 들어온 수신 이벤트를 거부하는 옵션도 있다.
- 외부 시스템 입력(API, EDI)은 내부 모델에 그대로 들이지 않고 번역 계층에서 입고 예정 모델로 바꾸고([[DDD-Hexagonal-In-Production-Pragmatics|ACL]]), 자체 화면 입력은 애플리케이션 계층의 명령으로 받는다. 예정 정보 출처가 여럿이면 같은 입고가 두 번 등록될 수 있으므로 ASN 번호 같은 외부 식별자로 중복을 막는다. GS1 Sweden의 Despatch Advice 규격도 통지 문서마다 고유 번호를 요구한다.

## 도메인 이벤트 도출

- 도메인 이벤트는 도메인 전문가가 관심을 두는, 도메인에서 일어난 일이다. 모든 활동을 이벤트로 만들지 않고 도메인 전문가가 추적하거나 통지받고 싶은 일, 다른 모델의 상태 변화와 이어지는 일만 드러낸다(Evans, DDD Reference).
- 이미 일어난 일이므로 과거형으로 이름 짓고, 만든 뒤에는 바꾸지 않는다. 발생 시각과 관련 엔티티 식별자를 담고, 시스템에 기록된 시각과 기록한 사람을 따로 둘 수 있다. 입고에서는 스캔 시각, 작업자, ASN, 물류 단위, 로케이션이 후보다.
- 같은 컨텍스트 안의 후속 처리는 도메인 이벤트로, 다른 컨텍스트나 외부 시스템에 알리는 일은 통합 이벤트로 나눈다. 통합 이벤트는 저장이 성공한 뒤에만 비동기로 보낸다([[Transactional-Outbox]]).

위 상태 전이와 예외 분기에 이 기준을 적용한 후보 예시다. 구분 열은 같은 컨텍스트 안의 후속 처리(도메인)와 다른 컨텍스트나 외부로 보내는 통지(통합)를 나눈다.

| 계기 | 이벤트 후보 | 구분 | 알아야 하는 쪽 |
|---|---|---|---|
| 입고 예정 등록 | `AsnRegistered` | 도메인 | 작업 할당 계획 |
| 검수 중 불일치, 파손 발견 | `ReceivingDiscrepancyFound` | 도메인, 외부 통지는 통합 | 이상 처리, 구매 담당자와 화주 |
| 검수 완료와 위치 배정 | `InspectionCompleted` | 도메인, 수량 확정 통지는 통합 | 적재 지시, 수량 확정을 기다리는 재고 컨텍스트와 ASN을 보낸 시스템 |
| 적재 완료 | `PutawayCompleted` | 통합 | 재고 컨텍스트의 보관 위치 반영 |

검수 중과 이동 중은 진행 추적용 상태로 두고, 반응할 쪽이 생길 때 이벤트로 올린다. 수령 결과를 공급 측에 알리는 시점도 정한다. GS1 EANCOM 2002의 입고 통지(RECADV)는 실물을 받은 뒤 수령 측(유통사)이 공급사에 보내고, 정상 납품과 불일치를 모두 알리며 통지 수량과 실제 수령 수량의 차이를 적는다(GS1 Germany EANCOM 안내 기준). 이벤트를 감사 이력으로 남기는 일과 이벤트를 상태의 원본으로 삼는 [[Event-Sourcing|이벤트 소싱]]은 별개 결정이다.

재고 반영 시점도 따로 정한다. Dynamics 365는 입고 등록을 마치면 수량을 입고 도크 위치에 두고 예약할 수 있게 하며, 기본 흐름에서는 적재 작업을 자동으로 만든다(작업 정책으로 끌 수 있다). 재고 원장 반영은 제품 입고 전기(product receipt posting)에서 한다. SAP EWM 9.0 문서의 단순 하역 절차도 하역하면서 입고를 전기하고, 물건은 예를 들어 입고 구역에서 최종 적재를 기다린다. 그러니 적재 완료를 곧 재고 증가로 보지 말고 수량 확정, 보관 위치 반영, 회계 반영을 구분한다.

## 트레이드오프와 체크포인트

- 순차 흐름이라 유스케이스 순서대로 시나리오 테스트를 짜기 쉽다. 특정 상태의 입고 건이 필요하면 상태 값을 직접 넣지 않고 전이 메서드를 거쳐 만든다([[Test-Fixture-Scenario-Setup|상태별 픽스처]]).
- 이동 중 상태와 설비 연동은 대형 센터의 추적성을 높이는 대신 상태와 신호 처리 경로를 늘린다. 규모가 작으면 적재 완료 스캔 하나로 충분할 수 있다.
- 여러 작업자나 설비가 같은 입고 건을 동시에 바꿀 수 있으면 전이 순간을 보호하고([[Distributed-Lock|상태 키와 짧은 락]]), 다시 들어온 스캔과 설비 신호는 메시지 ID로 걸러 한 번만 반영한다([[Idempotency-Key|멱등성 키]]).
- 확인 질문: ASN 수량과 실물이 다를 때 어디까지 자동으로 받고 어디부터 사람이 판단하는가, 재고로 잡는 시점은 검수, 적재, 회계 반영 중 어디인가, 이동 중 상태가 정말 필요한 규모인가.

## 출처

- [YouTube, 코딩하는오후, 4강 Inbound 입고 관리 Context 심층 분석](https://www.youtube.com/watch?v=APBH-cQovdg)
- [Microsoft Learn, Warehouse handling of inbound loads for purchase and inbound shipment orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/inbound-load-handling)
- [Microsoft Learn, Work with location directives](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/create-location-directive)
- [Microsoft Learn, Material handling equipment interface (MHAX)](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/mhax)
- [Domain events: Design and implementation — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)
- [SAP Help Portal, EWM 9.0 Loading and Unloading](https://help.sap.com/saphelp_ewm900/helpdata/en/0f/08b240ac052817e10000000a1550b0/content.htm)
- [SAP Help Portal, EWM 9.0 Creation of Warehouse Tasks for Putaway](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/08/802f418378ef23e10000000a155106/content.htm)
- [GS1 US, An Introduction to the Serial Shipping Container Code (SSCC) Release 3.0](https://documents.gs1us.org/adobe/assets/deliver/urn:aaid:aem:494e625b-e1d8-4bbd-a1be-5918879cfc3d/An-Introduction-to-the-Serial-Shipping-Container-Code-SSCC.pdf)
- [GS1 Sweden, Business Document Specification Despatch Advice 20.1.5](https://gs1.se/wp-content/uploads/sites/2/2022/11/bds_200105_en.pdf)
- [GS1 Ireland, Electronic Data Interchange (EDI)](https://www.gs1ie.org/standards/data-exchange/edi/)
- [GS1 Germany, EANCOM 2002 S3 RECADV Introduction](https://www.publikationen.gs1-germany.de/Complete/CFB_Version_2.1/english/messages/recadv/intro.htm)
- [ISA, ISA-95 Standard: Enterprise-Control System Integration](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- [Domain-Driven Design Reference — Domain Language, Eric Evans](https://www.domainlanguage.com/ddd/reference/)

## 관련 문서

- [[WMS-Outbound-Context-Modeling|WMS 출고 컨텍스트 모델링 (같은 분석 순서를 출고에 적용)]]
- [[WMS-Inventory-Context-Modeling|WMS 재고 컨텍스트 모델링 (순차 흐름이 아닌 재고 컨텍스트에 적용)]]
- [[DDD|DDD (Bounded Context, Context Map, 상태 전이 규칙)]]
- [[DDD-Hexagonal-In-Production-Pragmatics|DDD + Hexagonal 외부 통합과 ACL]]
- [[Commerce-Order|커머스 주문 상태와 전환 트리거]]
- [[Event-Driven-Architecture|Event-Driven Architecture (사실 기반 이벤트)]]
- [[Event-Sourcing|Event Sourcing]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Distributed-Lock|Distributed Lock (WMS 재고 할당의 상태 키)]]
- [[Idempotency-Key|멱등성 키]]
- [[Inventory-Data-Pipeline|재고 데이터 파이프라인 (재고 변동 이벤트의 하류 처리)]]
- [[Test-Fixture-Scenario-Setup|상태별 픽스처와 시나리오 준비]]
