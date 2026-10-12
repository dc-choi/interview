---
tags: [architecture, ddd, bounded-context, domain-event, state-machine, wms, logistics]
status: done
verified_at: 2026-10-12
category: "아키텍처&설계(Architecture&Design)"
aliases: ["WMS Outbound Context Modeling", "WMS 출고 컨텍스트 모델링", "출고 관리 도메인 모델링"]
---

# WMS 출고(Outbound) 컨텍스트 모델링

창고 관리 시스템(WMS)의 출고 컨텍스트도 입고처럼 주문 접수, 재고 할당, 피킹, 패킹, 상차, 출고 확정이 순서대로 이어진다. 다른 점은 시점을 맞출 바깥 시스템이 더 많다는 것이다. 주문은 외부 시스템에서 들어오고, 운송장 번호는 운송사와 맞춰 발급하며, 차량 배차는 운송 관리 시스템(TMS)과 함께 정한다. 분석 순서(유스케이스, 액티비티, 상태 전이, 핵심 엔티티, 연관 시스템, 도메인 이벤트)는 [[WMS-Inbound-Context-Modeling#분석 순서|입고 컨텍스트]]와 같고, 이 문서는 그 순서를 출고에 적용한 예시다. 예시의 상태 이름과 엔티티 구성은 하나의 설계안이며 업계 표준이 아니다.

## 용어

같은 대상을 제품과 표준마다 다르게 부른다. 팀이 쓸 말을 하나로 정하고 외부 용어와의 대응을 남긴다.

| 개념 | Dynamics 365 SCM | SAP EWM 9.0 문서 | GS1 |
|---|---|---|---|
| 출고 요청 | 판매, 이동 주문(외부 ERP와 OMS는 outbound shipment order) | outbound delivery request에서 만든 outbound delivery order | Despatch Advice가 참조하는 주문 |
| 창고 처리 시작 | release to warehouse | 창고 요청 생성과 웨이브 릴리스 | 해당 없음 |
| 작업 묶음 | wave | wave | 해당 없음 |
| 피킹 지시 | picking work | stock removal warehouse task | 해당 없음 |
| 피킹 결품 | short pick 예외 | pick denial | 부족분 통지 |
| 물류 단위 | license plate, container | handling unit(HU) | SSCC |
| 운송 단위 | load | vehicle, transportation unit(TU) | 탁송 단위(GINC) |
| 출고 확정 | shipment confirmation 뒤 packing slip 전기 | goods issue 전기 | Despatch Advice 발송 |

## 유스케이스

| 행위자 | 유스케이스 | 요지 |
|---|---|---|
| 화주, 외부 협력사, 영업 담당자 | 출고 요청과 출고 주문 등록 | 무엇을 언제 어디로 보낼지 등록한다. 주문 관리 시스템(OMS)이나 ERP가 연동돼 있으면 시스템 간 전송으로 받는다 |
| 창고 관리자 | 출고 작업 할당 | 출고 물량을 보고 피킹과 패킹 작업을 작업자에게 나눈다 |
| 출고 작업자 | 피킹 | 지시받은 로케이션에서 지정 수량을 꺼낸다. 이동 거리를 줄이는 순서로 지시를 받는다 |
| 패킹 작업자 | 패킹 검수와 운송장 부착 | 피킹한 물건이 주문과 맞는지 확인하고 포장한 뒤 라벨을 붙인다 |
| 출고 담당자, 배송 기사 | 상차 검수와 출고 확정 | 실을 박스가 모두 올라갔는지 확인하고 출고를 확정한다 |

패킹은 모든 창고에 있는 공정이 아니다. 팔레트나 박스 단위로 이미 포장된 물건을 그대로 싣는 출고는 피킹 뒤 바로 상차할 수 있고, 여러 품목을 모아 고객 단위로 다시 포장하는 3PL이나 풀필먼트 센터에서는 패킹과 오피킹 검수가 별도 공정이 된다. 배송 기사를 외부에 맡기는지 직접 고용하는지도 회사마다 달라 상차 검수의 행위자가 바뀐다.

## 액티비티 흐름

1. 출고 주문 수신: 외부 시스템이나 화면에서 주문을 받는다. 수량 변경과 취소 요청도 같은 경로로 들어온다.
2. 가용 재고 확인과 할당: 내보낼 재고가 있는지 확인하고 주문에 묶는다. 할당하지 못한 수량을 기다릴지, 있는 만큼만 보낼지(부분 출고)는 정책으로 정한다.
3. 웨이브와 작업 생성: 할당된 주문 라인을 묶어 피킹 작업을 만들고 작업자에게 배정한다.
4. 피킹: 지시받은 로케이션에서 꺼내 패킹 구역이나 스테이징 구역으로 옮긴다. 수량이 모자라면 결품 처리로 보낸다.
5. 패킹과 라벨: 오피킹을 검수하고 박스나 팔레트로 포장한 뒤 물류 단위 라벨과 운송장을 붙인다. 패킹이 없는 창고는 이 단계를 건너뛴다.
6. 상차와 상차 검수: 실을 물류 단위를 스캔해 차량별 목록과 맞춘다.
7. 출고 확정: 출고를 확정하고 재고 차감(전기)과 주문 시스템, ERP, 수신처 통지로 이어 간다.

### 재고 할당과 웨이브

- 할당은 수량을 다른 주문이 가져가지 못하게 묶는 일이다. Dynamics 365에서 판매 주문은 창고로 릴리스하기 전에 재고를 예약해야 웨이브에서 처리할 수 있다. 창고별 릴리스 규칙은 전체 수량 예약을 요구하거나 부분 예약을 허용한다. 전체 수량 예약을 요구한 데모 시나리오에서는 예약이 모자란 라인이 하나 있는 주문에 작업, 출하, 적재가 하나도 만들어지지 않았고, 부분 예약을 허용하면 예약된 수량만큼만 작업을 만든다.
- 할당을 두 단계로 나누기도 한다. Dynamics 365의 창고 관리 판매 주문은 기본 예약 계층에서 로케이션보다 위의 재고 차원까지만 예약하고, 실제로 꺼낼 로케이션은 작업을 만들 때 location directive가 정한다. 특정 배치나 license plate를 주문에 묶는 유연한 예약 정책을 쓰면 로케이션까지 예약하고 그 피킹 작업에는 location directive를 쓰지 않는다. SAP EWM 9.0 문서도 창고 요청을 만들 때 피킹 위치를 전략으로 대략 정할 뿐 수량을 예약하지 않으며, 웨이브를 릴리스할 때 warehouse task를 만든다. SAP ERP에서 복제한 주문은 가용성 확인을 ERP가 하므로, 가용성 확인과 할당(수량 묶음)의 책임이 서로 다른 시스템에 있을 수 있다.
- 웨이브는 출하 라인을 묶어 할당, 보충, 작업 생성을 한 번에 돌리는 단위다. Dynamics 365는 웨이브 할당 중 로케이션보다 위의 차원만 잠그고, 제시간에 잠금을 얻지 못하면 웨이브 처리가 실패한다. 재고 부족으로 할당하지 못한 출하 라인만 웨이브에서 빼고 나머지를 계속 처리한 뒤, 배치 작업이 그 라인을 최대 다섯 번까지 다시 웨이브에 넣는 기능도 있다.

### 피킹과 결품

- 피킹 지시는 출발 로케이션, 수량과 놓을 곳을 담는다. Dynamics 365의 판매 출고 작업은 피킹, 스테이징 구역에 놓기, 스테이징에서 다시 꺼내기, 트럭에 싣기 라인으로 이어질 수 있다. SAP EWM 9.0은 개별 작업자에게 줄 작업 패키지(warehouse order)를 만든다.
- 결품은 할당 때 있던 재고가 로케이션에 없을 때 생긴다. Dynamics 365의 short pick 예외는 재고 조정을 켜면 그 로케이션 재고를 0으로 맞추고, 조정 유형에 따라 예약도 풀며, 다른 로케이션에 자동이나 수동으로 다시 할당할 수 있다. SAP EWM 9.0의 pick denial은 요청 수량을 채울 재고를 찾지 못한 경우에 쓰며, 창고 번호와 창고 프로세스 유형에서 켰을 때 동작한다. Customizing에서 정한 조치(예: 창고 요청 수량을 실제 피킹 수량으로 조정)와 함께 경보와 워크플로 작업을 만들고, 필요하면 ERP에 알린다(EWM에서 직접 만든 출고 주문은 ERP에 알리지 않는다). 결품을 재할당할지, 부분 출고할지, 주문 시스템에 알릴지를 정책으로 정한다.

### 패킹과 물류 단위 라벨

- Dynamics 365의 컨테이너 패킹은 패킹 스테이션에서 품목을 검증하며 컨테이너에 담고, 다 담은 컨테이너를 닫아 출고 도크로 보낸다. 닫은 컨테이너를 스테이징이나 도크로 옮기는 작업을 만들지는 정책으로 고른다. SAP EWM 9.0은 work center에서 제품을 handling unit에 담고 닫기, 무게 측정, 출력을 한다.
- GS1 물류 라벨에서 필수 요소는 물류 단위를 식별하는 SSCC 하나다. 라벨은 보통 출하하는 쪽(공급사나 공급사를 대신하는 물류 대행사)이 만들어 붙인다. 지침은 SSCC를 WMS나 ERP 같은 물류 관리 시스템에서 출하하는 쪽 자신의 GS1 업체 코드로 만들도록 권하고, 라벨 구획을 더하거나 바꿀 때도 이미 붙은 SSCC는 바꾸지 않게 한다. 물류 단위를 풀어 다시 꾸리면 새 SSCC를 붙인다([[WMS-Inbound-Context-Modeling#검수와 예외 처리|입고 컨텍스트]]). 고객별로 팔레트를 피킹하는 시점에 라벨을 출력해 붙이는 방식도 있다.
- 운송장 번호와 운임은 운송사와 맞춘다. Dynamics 365 기본 기능은 외부 운송사 시스템과 바로 연동하지 않으며, 운송사나 운송사 허브 서비스와 협력해 rate engine을 구하거나 만들어 붙여야 포장한 컨테이너 정보를 보내고 라벨, 운임과 추적 번호를 받는다. 운송사 연동은 WMS 밖의 계약이므로 번역 계층을 둔다([[DDD-Hexagonal-In-Production-Pragmatics|ACL]]).

### 상차와 출고 확정

- 상차는 스테이징 구역의 물류 단위를 도크와 차량으로 옮기는 단계다. GS1 물류 라벨 지침은 실제로 실은 팔레트만 스캔해 출고 통지와 운송 서류가 실물과 맞게 하라고 권한다.
- 출고 확정과 재고 차감은 같은 순간이 아닐 수 있다. Dynamics 365는 기본 흐름에서 적재의 모든 작업이 닫히거나 취소돼야 출고 확정을 할 수 있고, 출고 확정은 적재 상태를 Shipped로 바꾸고 적재의 백그라운드 출고 전표 전기 상태를 Queued로 바꿀 뿐이며, 실제 전기는 예약된 배치 작업이 따로 한다. 작업을 마치면 판매 라인 재고 거래가 Picked가 되고, 출고 전표(packing slip)를 전기하면 물리 출고인 Deducted, 청구서를 전기하면 재무 출고인 Sold가 된다. SAP EWM 9.0 문서에서는 goods issue 전기가 창고 재고를 줄이며, 상차 없이도 상차 뒤에도 전기할 수 있다.
- 출고 통지는 상차에 맞춘다. GS1 지침은 Despatch Advice를 스테이징이나 상차 때 보내 실제 출고와 맞을 가능성을 높이고, 물류 단위마다 SSCC와 담긴 품목을 적으라고 권한다. 통지 문서마다 고유 번호를 두고, 피킹 중 발견한 부족분은 통지에 적어야 한다. 교체 품목으로 보낼지 부족 수량으로 적을지는 계약으로 정하며, 주문보다 적은 수량을 통지하려면 계약이 분할 납품을 허용해야 한다(GS1 Sweden 규격). Dynamics 365는 적재를 출고할 때 outbound ASN을 만들 수 있지만 기본 구조는 출하와 적재 라인을 따르고 컨테이너 구성은 반영하지 않는다.

## 상태 전이 (설계 예시)

| 상태 | 의미 | 들어오는 계기 |
|---|---|---|
| 주문 접수(Ordered) | 출고 주문이 등록됨 | 출고 주문 수신 |
| 배정(Assigned) | 할당을 마치고 피킹 작업자가 배정됨 | 작업 생성과 할당 |
| 피킹 중(Picking) | 로케이션에서 꺼내는 중 | 피킹 시작 |
| 패킹 완료(Packed) | 검수를 마치고 라벨과 운송장을 붙임 | 패킹 검수 완료 |
| 상차 검수 중(Loading) | 차량에 실으며 목록과 맞추는 중 | 상차 시작 |
| 출고 확정(Shipped) | 출고가 확정됨 | 상차 검수 완료와 확정 |
| 취소(Cancelled) | 주문이 취소됨 | 취소 요청 수락 |

- 입고의 ASN 등록처럼 출고도 주문 접수로 시작한다. 회사에 따라 할당 완료나 웨이브 릴리스 같은 상태를 더하거나 패킹을 뺀다. 제품의 상태 체계도 서로 다르다. Dynamics 365는 웨이브(Created, Executing, Held, Released, Picked, Shipped 등), 작업과 적재의 상태를 따로 둔다.
- 상태를 어느 단위에 둘지 먼저 정한다. 한 주문이 여러 박스와 차량으로 나뉘거나 일부만 먼저 나가면 주문 상태 하나로는 진행을 표현하기 어렵고, 주문 라인이나 물류 단위의 상태가 필요해진다. Dynamics AX에서 Dynamics 365로 올라오면 출하와 적재의 In packing 상태가 사라진다. 일관되게 동작하지 않고 중복 데이터를 만들었기 때문이며, 패킹할 컨테이너는 로케이션 수준에서 추적한다.
- 전이는 이름 있는 메서드로 바꾸고 허용된 선행 상태를 확인한다([[DDD|DDD의 변경 경계와 생명주기 규칙]]).

### 취소와 되돌림

취소는 어느 단계에서 받느냐에 따라 할 일이 다르다. 아래 시점 구분과 첫 문장은 설계 기준이고, 이어지는 제품 동작은 각 문서가 설명하는 동작이다.

| 시점 | 처리 |
|---|---|
| 작업 생성 전 | 할당만 풀면 된다. Dynamics 365는 기본적으로 작업이 만들어지기 전까지만 주문의 수량 감소를 출하와 적재에 자동 반영한다. SAP EWM 9.0 문서도 처리가 시작되기 전까지만 출고 주문의 수량 변경을 받고, 처리 중인 주문의 수량 변경은 거부한다 |
| 작업 생성 뒤, 피킹 전 | 작업을 취소하고 예약을 푼다 |
| 피킹 뒤 | 꺼낸 재고를 되돌리는 처리가 필요하다. Dynamics 365는 작업이 연결된 판매 주문을 작업 취소와 되돌림 전에는 취소할 수 없다. 적재의 피킹 수량을 줄이면 이전 작업은 Canceled가 되고, 줄인 수량을 되돌리는 재고 이동 작업이 새로 생긴다. SAP EWM 9.0의 피킹 취소는 재고 배정을 풀고 이동용 warehouse task를 함께 만들 수 있으며, 물류 단위 일부만 취소하려면 먼저 다시 포장한다 |
| 출고 전표 전기 뒤 | 제품이 허용하는 전기 취소 경로를 먼저 확인하고, 실물이 나간 뒤에는 반품이나 회수 흐름으로 다룬다. Dynamics 365는 창고 관리 품목의 출고 전표를 판매 주문에서 전기했으면 되돌릴 수 없어 적재에서 전기하도록 권하고, 적재에서 전기한 경우 적재에서 되돌릴 수 있다 |

## 핵심 엔티티 (설계 예시)

| 엔티티 | 책임 |
|---|---|
| 출고 주문(Shipment Order) | 무엇을 언제 어디로 보낼지. 할당과 작업 계획의 기준 |
| 출고 아이템(Shipment Item) | 주문 품목과 요청, 할당, 피킹, 패킹 수량 |
| 피킹 지시(Picking Instruction) | 어느 로케이션에서 무엇을 얼마나 꺼내 어디에 둘지 |
| 출고 물류 단위(Package) | 패킹한 박스나 팔레트, SSCC와 운송장 번호 |

출고 주문, 출고 아이템, 피킹 지시가 기본 구성이고, 물류 단위는 GS1 라벨과 출고 통지가 물류 단위마다 내용을 적기 때문에 따로 둔다. 입고처럼 창고 쪽에서는 상품 대신 아이템이라는 말을 쓰기도 한다([[WMS-Inbound-Context-Modeling#용어|입고 컨텍스트의 용어 표]]).

## 연관 시스템

| 시스템 | 출고와의 접점 |
|---|---|
| OMS, 화주와 판매 시스템 | 출고 요청, 수량 변경과 취소를 보내고 출고 결과를 받는다 |
| ERP | 가용성 확인을 맡기도 하고 출고 확정 뒤 청구와 회계를 처리한다 |
| TMS | 출하를 차량 단위 적재로 묶고 경로와 운임을 정한다 |
| 운송사 | 라벨과 추적 번호를 발급하고 배송 상태를 알린다 |
| WCS 같은 설비 제어 시스템 | 소터, 컨베이어 같은 자동화 설비의 작업을 실행한다 |

- 외부 주문은 번역 계층에서 내부 출고 주문 모델로 바꾼다. Dynamics 365의 창고 관리 전용 모드는 외부 ERP나 OMS가 보낸 outbound shipment order 메시지를 큐에 쌓아 처리하고, 헤더의 주문 번호와 출처 시스템이 같은 메시지를 갱신으로, 그중 라인 데이터를 모두 뺀 메시지를 삭제로 해석한다. 출고 확정은 business event로 알리며 상세 출고 통지 데이터의 위치를 함께 준다. 같은 주문이 두 번 등록되지 않게 외부 식별자로 중복을 막는다([[Idempotency-Key|멱등성 키]]).
- Dynamics 365의 load building workbench는 릴리스 전 원천 문서 라인으로 적재를 만들고, 적재 템플릿의 최대 무게와 부피를 기준으로 하는 부피 기반 전략을 기본으로 제공한다. 지정한 순서대로 템플릿에 맞춰 보며 작은 템플릿을 앞에 두라고 안내한다. 웨이브 컨테이너화는 컨테이너 유형에 정한 외부 치수로 포장된 컨테이너가 차지할 공간을 계산한다. 그러니 이 기준 데이터가 부정확하면 이후 적재 공간 계산도 어긋날 수 있다(설계상 추론).
- 자동화 설비가 들어오면 WCS 연동이 더해진다. Dynamics 365에서 설비와 작업 이벤트를 큐로 주고받는 예는 [[WMS-Inbound-Context-Modeling#연관 시스템|입고 컨텍스트의 MHAX]]에 있다.

## 도메인 이벤트 도출

같은 컨텍스트 안의 후속 처리는 도메인 이벤트로, 다른 컨텍스트나 외부 시스템에 알리는 일은 통합 이벤트로 나누는 기준은 [[WMS-Inbound-Context-Modeling#도메인 이벤트 도출|입고 컨텍스트]]와 같다. 아래는 출고에 적용한 후보 예시다.

| 계기 | 이벤트 후보 | 구분 | 알아야 하는 쪽 |
|---|---|---|---|
| 출고 주문 수신 | `ShipmentOrderReceived` | 도메인 | 할당 |
| 할당 성공과 실패 | `StockAllocated`, `AllocationFailed` | 도메인, 수량 묶음과 실패 통지는 통합 | 웨이브, 재고 컨텍스트, 부분 출고나 대기를 정할 OMS |
| 피킹 완료 | `PickCompleted` | 도메인, 위치 이동 반영은 통합 | 패킹이나 상차, 재고 컨텍스트 |
| 피킹 결품 | `ShortPickReported` | 도메인, 결품 통지는 통합 | 재할당, 재고 조사, OMS |
| 물류 단위 패킹 완료 | `PackageClosed` | 도메인 | 상차 계획, 출고 통지 준비 |
| 출고 확정 | `ShipmentConfirmed` | 통합 | OMS, 수신처의 Despatch Advice |
| 출고 전기 | `GoodsIssuePosted` | 통합 | 재고 컨텍스트의 물리 차감, ERP 청구 |
| 취소 수락 | `ShipmentCancelled` | 도메인, 통합 | 할당 해제, 되돌림 작업, 재고 컨텍스트, OMS |

재고 컨텍스트에 알릴 변화는 할당(수량 묶음), 피킹(위치 이동), 출고 전기(물리 차감)로 나누고, 청구(재무 반영)는 ERP가 이어받는다. 출고 확정과 출고 전기를 한 시점에 처리하는 설계라면 두 이벤트를 합칠 수 있다. 어느 시점을 가용 재고 감소로 볼지는 재고 컨텍스트와 합의하고, 통합 이벤트는 저장이 성공한 뒤에만 보낸다([[Transactional-Outbox]]).

## 트레이드오프와 체크포인트

- 할당 시점: 주문 수신 때 일찍 할당하면 재고가 오래 묶이고, 웨이브 직전에 늦게 할당하면 결품과 재웨이브가 늘어난다. 전체 수량 예약과 부분 예약 가운데 무엇을 허용할지도 OMS와의 계약이다.
- 동시성: 여러 주문이 같은 재고를 할당하므로 할당 순간을 잠금이나 조건부 갱신으로 보호하고 잠금 범위와 대기 시간을 정한다([[Distributed-Lock|상태 키와 짧은 락]]). 다시 들어온 주문 메시지와 스캔은 식별자로 걸러 한 번만 반영한다.
- 패킹 공정: 고객 단위로 다시 포장하는 풀필먼트는 오피킹 검수와 컨테이너 상태가 필요하지만, 팔레트 단위 출고는 패킹 상태를 두지 않아도 된다.
- 테스트: 순차 흐름이라 유스케이스 순서대로 시나리오 테스트를 짜기 쉽다. 결품, 부분 출고와 단계별 취소처럼 분기가 많은 경로는 따로 둔다([[Test-Fixture-Scenario-Setup|상태별 픽스처]]).
- 확인 질문: 가용 재고 확인과 할당을 WMS와 ERP 중 누가 하는가, 결품이면 재할당, 부분 출고, 대기 중 무엇을 하는가, 피킹 뒤 취소를 받는가, 재고 차감과 출고 통지는 어느 시점인가.

## 출처

- [YouTube, 하찮은오후, 5강 Outbound 출고 관리 Context 심층 분석](https://www.youtube.com/watch?v=nENjG5wwr3E)
- [Microsoft Learn, Release to warehouse](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/release-to-warehouse-process)
- [Microsoft Learn, Release to warehouse rule](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/release-to-warehouse-rule)
- [Microsoft Learn, Wave creation and processing](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wave-processing)
- [Microsoft Learn, Wave allocation](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wave-allocation-method)
- [Microsoft Learn, Automatic rewaving of nonallocated shipment lines](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/auto-rewave-shipments)
- [Microsoft Learn, Reservations in Warehouse management](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/reservations-in-warehouse-management)
- [Microsoft Learn, Control warehouse work by using work templates and location directives](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/control-warehouse-location-directives)
- [Microsoft Learn, Set up short picking item reallocation](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/tasks/set-up-short-picking-item-reallocation)
- [Microsoft Learn, Pack containers for shipment](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/packing-containers)
- [Microsoft Learn, Containerization](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wave-containerization)
- [Microsoft Learn, Small parcel shipping](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/small-parcel-shipping)
- [Microsoft Learn, Warehouse handling of outbound loads for sales, transfer, and outbound shipment orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/outbound-load-handling)
- [Microsoft Learn, You can't confirm a shipment because of incomplete or missing work](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/supply-chain/warehousing/shipment-for-load-could-not-confirmed-all-work-must-complete)
- [Microsoft Learn, Shipment for load was confirmed but no lines are posted](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/supply-chain/warehousing/shipment-confirmed-no-posting)
- [Microsoft Learn, Physical and financial updates](https://learn.microsoft.com/en-us/dynamics365/supply-chain/cost-management/physical-financial-updates)
- [Microsoft Learn, Warehouse-specific inventory transactions](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/warehouse-transactions)
- [Microsoft Learn, Shipment auto-updates](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/auto-update-shipment)
- [Microsoft Learn, The quantity can't be reduced when a sales order is canceled](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/supply-chain/sales/quantity-cannot-be-reduced)
- [Microsoft Learn, Flexible warehouse-level dimension reservation policy](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/flexible-warehouse-level-dimension-reservation)
- [Microsoft Learn, Can't cancel packing slip after it's posted from an order](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/supply-chain/warehousing/cancel-posted-packing-slip)
- [Microsoft Learn, Warehouse management only mode with external ERP systems](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wms-only-mode-external-erp)
- [Microsoft Learn, Exchange data between systems](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wms-only-mode-exchange-data)
- [Microsoft Learn, Load building workbench](https://learn.microsoft.com/en-us/dynamics365/supply-chain/transportation/tasks/load-building-workbench)
- [SAP Help Portal, EWM 9.0 Generation of Warehouse Request of Outbound Delivery Order Type](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4f/af5b22635e42f5e10000000a421937/content.htm)
- [SAP Help Portal, EWM 9.0 Direct Outbound Delivery Order](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/01/e0a649b5da488086b461a0eff3d2af/content.htm)
- [SAP Help Portal, EWM 9.0 Pick Denial](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/f4/119b41a934a509e10000000a155106/content.htm)
- [SAP Help Portal, EWM 9.0 Cancellation of Picking](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4f/414373dd89535be10000000a421937/content.htm)
- [SAP Help Portal, EWM 9.0 Processing of Outbound Deliveries](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/3a/c90441e2c7ee6fe10000000a1550b0/content.htm)
- [SAP Help Portal, EWM 9.0 Packing at the Work Center](https://help.sap.com/saphelp_ewm900/helpdata/en/d4/d83d41d19bf623e10000000a155106/content.htm)
- [SAP Help Portal, EWM 9.0 Goods Issue](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/41/e67941601b040de10000000a1550b0/content.htm)
- [SAP Help Portal, EWM 9.0 Loading and Unloading](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/0f/08b240ac052817e10000000a1550b0/content.htm)
- [GS1, Logistic Label Guideline Release 1.3](https://ref.gs1.org/guidelines/logistic-label/)
- [GS1 Sweden, Business Document Specification Despatch Advice 20.1.5](https://gs1.se/wp-content/uploads/sites/2/2022/11/bds_200105_en.pdf)

## 관련 문서

- [[WMS-Inbound-Context-Modeling|WMS 입고 컨텍스트 모델링]]
- [[DDD|DDD (Bounded Context, Context Map, 상태 전이 규칙)]]
- [[DDD-Hexagonal-In-Production-Pragmatics|DDD + Hexagonal 외부 통합과 ACL]]
- [[Commerce-Order|커머스 주문 상태와 전환 트리거]]
- [[Distributed-Lock|Distributed Lock (WMS 재고 할당의 상태 키)]]
- [[Idempotency-Key|멱등성 키]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Inventory-Data-Pipeline|재고 데이터 파이프라인 (재고 변동 이벤트의 하류 처리)]]
- [[Saga-Pattern|Saga 패턴 (여러 시스템에 걸친 취소와 보상)]]
- [[Test-Fixture-Scenario-Setup|상태별 픽스처와 시나리오 준비]]
