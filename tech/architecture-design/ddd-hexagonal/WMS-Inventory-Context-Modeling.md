---
tags: [architecture, ddd, bounded-context, domain-event, state-machine, wms, logistics, inventory]
status: done
verified_at: 2026-10-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["WMS Inventory Context Modeling", "WMS 재고 컨텍스트 모델링", "재고 관리 도메인 모델링"]
---

# WMS 재고(Inventory) 컨텍스트 모델링

재고 관리는 물건을 알맞은 로케이션에 두는 일로 끝나지 않는다. 상태 이상 확인, 재고조사, 반품 검수처럼 창고를 유지하기 위한 계획이 많고, 풀필먼트처럼 화주의 물류를 통째로 대행하면 화주마다 요구가 크게 달라지기 쉽다. 냉동 창고처럼 온도를 계속 지켜야 하는 창고에는 센서 정보를 받아 감시하는 일도 더해진다. 분석 순서(유스케이스, 액티비티, 상태 전이, 핵심 엔티티, 연관 시스템, 도메인 이벤트)는 [[WMS-Inbound-Context-Modeling#분석 순서|입고 컨텍스트]]와 같지만, 재고는 순차 흐름이 아니어서 액티비티와 상태 전이를 다르게 정리한다. 예시의 상태 이름과 엔티티 구성은 하나의 설계안이며 업계 표준이 아니다.

## 용어

같은 대상을 제품마다 다르게 부른다. 팀이 쓸 말을 하나로 정하고 외부 용어와의 대응을 남긴다.

| 개념 | Dynamics 365 SCM | SAP EWM 9.0 문서 |
|---|---|---|
| 재고의 사용 가능성 | inventory status(저장 차원, blocking 여부) | stock type(quant를 식별하는 stock key의 일부) |
| 사용 가능성 변경 | inventory status change | posting change |
| 로트 | batch(tracking dimension) | batch |
| 실사(재고조사) | cycle counting, counting journal | physical inventory(periodic, continuous, cycle counting) |
| 실사 차이 반영 | counting journal 전기와 reason code | Difference Analyzer로 ERP에 전기 |
| 피킹 구역 보충 | replenishment(wave demand, min/max, load demand, immediate) | replenishment control(planned, order-related, automatic, direct) |
| 출고 순서 규칙 | FIFO, FEFO date-controlled 예약과 location directive 전략 | stock removal strategy(FIFO, shelf life expiration date 등) |
| 반품 처분 | 반품 주문(RMA)의 return disposition code, 창고 모바일 앱의 disposition code | 품질 검사 뒤 logistical follow-up action |

## 유스케이스

| 행위자 | 유스케이스 | 요지 |
|---|---|---|
| 화주, 구매와 영업 담당자, OMS | 가용 재고와 상태 조회(ATP) | 지금 내보낼 수 있는 수량과 상태별 수량, 유통기한이 가까워 먼저 팔아야 할 수량을 본다 |
| 재고 관리자, 작업자 | 재고조사(cycle count)와 차이 승인 | 조사 일정과 범위를 정하고 실물을 세어 스캔한다. 장부와 다른 수량은 승인을 거쳐 재고 조정으로 반영한다 |
| 재고 관리자, 시스템 | 보충과 안전 재고 | 피킹 구역 재고가 기준 아래로 내려가면 보관 구역에서 채우고, 창고 전체가 모자라면 발주로 넘긴다 |
| 반품 검수자 | 반품 검수와 등급 판정 | 반품과 회수품의 상태를 보고 양품, 불량, 파손 같은 등급과 후속 처리를 정한다 |
| 품질 담당자, 재고 관리자 | 보류(hold)와 해제 | 품질, 유통기한, 사업 판단으로 출고를 막았다가 푼다 |
| 작업자, 재고 관리자 | 이상 보고와 로케이션 오류 이동 | 파손이나 잘못 적치한 재고를 보고하고, 잘못 적치한 재고는 원래 지시된 로케이션으로 옮기며 파손 재고는 할당 대상에서 뺀다 |

## 액티비티 구성

입고와 출고는 유스케이스가 차례로 이어져 액티비티 흐름과 상태 전이가 거의 겹친다. 재고 컨텍스트에서는 위 유스케이스마다 따로 시작하고 끝나는 액티비티가 있다. 흐름은 유스케이스별로 그리되, 모두 같은 재고 수량과 상태를 바꾸므로 상태 전이는 한 표로 모아 서로 부딪히는 지점을 확인한다.

### 가용 재고와 ATP

- 이 문서에서 가용 재고는 지금 할당할 수 있는 수량, 곧 실물 수량에서 예약과 사용 금지 수량을 뺀 값을 뜻한다. ATP(available-to-promise)는 여기에 시점을 더한다. Dynamics 365의 ATP는 특정 날짜에 고객에게 약속할 수 있는 수량이며 미확정 재고, 리드타임, 입고 예정과 출고 예정을 함께 계산한다. 첫 기간에는 현재고에서 납기가 됐거나 지난 고객 주문을 빼고, 음수가 나오면 0으로 보여 주며, 유통기한 정보는 이 계산에 넣지 않는다.
- Dynamics 365 창고 관리는 예약 계층의 수준마다 가용 실물, 가용 주문, 예약 실물, 예약 주문 수량을 따로 저장한다. 어떤 차원 조합의 가용 수량은 그 수준의 값과 위 수준들의 값 가운데 가장 작은 값이다. 다만 작업(work)은 로케이션과 그 아래 수준의 예약에만 영향을 주므로, 작업 거래의 현재고는 로케이션보다 위 수준을 보지 않고 로케이션 수준까지만 계산한다. 로케이션보다 위 수준의 가용이 10이고 로케이션 수준이 12이면 일반 계산은 10, 작업 계산은 12다. 예약 계층과 할당은 [[WMS-Outbound-Context-Modeling#재고 할당과 웨이브|출고 컨텍스트]]에서 다룬다.
- 입고 예정과 주문이 시점에 맞게 맞물려야 가용 판정이 맞는다. 사용처마다 필요한 정합성이 다르므로, 검색처럼 부정합 비용이 작은 파생 사용처는 이벤트를 구독해 따라오는 자체 저장소(최종 일관성)에 두고 상품 상세, 장바구니, 주문서처럼 구매를 결정하는 화면은 실시간 조회로 두는 설계가 있다([[Inventory-Data-Pipeline|재고 데이터 파이프라인의 Push와 Pull 분리]]).

### 유통기한과 출고 순서

- 선입선출(FIFO)은 먼저 들어온 재고를, FEFO(first expired first out)는 유통기한이 먼저 끝나는 재고를 먼저 내보낸다. FEFO는 식품과 의약품처럼 보관 기간이 짧은 상품에 쓴다(Dynamics 365 shelf life 문서).
- Dynamics 365에서 유통기한은 배치(로트) 추적 품목만 관리할 수 있다. 제조일에 shelf life 기간을 더한 날이 만료일이고 그 뒤에는 쓸 수 없다고 보며, best-before 날짜는 팔 수는 있지만 원래 특성이 떨어질 수 있는 시점이다. 고객별 sellable days는 판매 주문의 요청 수령일(확정 수령일이 있으면 그 날짜)을 기준으로 남은 판매 기간을 확인해 만료가 가까운 배치가 그 고객에게 가지 않게 하며, 품목이 FEFO date-controlled를 켠 품목 모델 그룹에 속해야 동작한다. master planning은 Use shelf life dates를 켠 master plan에서만 유통기한을 고려한다.
- 예약과 피킹: Dynamics 365는 입고일이 가장 빠른 배치를 예약하는 FIFO date-controlled와, 만료일이나 best-before 날짜가 가까운 배치를 예약하는 FEFO date-controlled 정책을 두고, 피킹 location directive에 FEFO batch reservation 전략을 둔다. FEFO, 동일 배치 예약(same batch reservation), batch disposition code 같은 배치 기능은 예약 계층에서 배치가 로케이션보다 위에 있을 때 모두 지원된다. 배치가 로케이션 아래인 WMS 품목을 WMS를 쓰지 않는 창고에서 다루면, 기본값(Simple)의 예약은 주문 라인에 배치를 지정했을 때만 batch disposition code를 적용하므로 배치를 지정하지 않은 예약에서는 사용 불가로 표시한 배치가 예약될 수 있고, FEFO 규칙도 평가하지 않는다. WMS를 켠 창고에서는 창고 작업 엔진이 batch disposition code를 적용한다. Batch reservation policy for non advanced warehouses를 Advanced로 두면 FEFO와 처분 코드를 모두 적용하지만 판매 주문(리테일 판매 주문 제외)에만 해당한다. 창고에 들어온 날짜로 고르는 location aging FIFO 전략은 배치 추적 여부와 관계없이 쓸 수 있고, 정렬할 만료일이 없는 배치 미추적 품목에 특히 쓸모 있다.
- SAP EWM 9.0 문서의 출고 전략에는 가장 오래된 quant를 찾는 FIFO와 만료일까지 남은 기간이 가장 짧은 제품을 찾는 shelf life expiration date 전략이 있다. 재고 결정은 warehouse task 생성, 창고 요청 생성, 창고 요청 항목 변경 때 일어나며, 출고 납품 주문의 창고 요청을 만들 때의 결정은 피킹 위치를 대략 정할 뿐 수량을 예약하지 않는다([[WMS-Outbound-Context-Modeling#재고 할당과 웨이브|출고 컨텍스트]]).

### 재고조사와 차이 승인

- Dynamics 365 Warehouse management의 cycle counting은 WMS를 켠 품목과 창고에 적용되며 조사 작업 생성, 모바일 앱으로 실사 입력, 차이 해소의 세 단계다. 작업은 로케이션 수량이 기준값(threshold) 아래로 내려갈 때, 조사 주기와 최대 조사 수를 정한 cycle count plan으로, 또는 수동으로 만든다. 작업을 미리 만들지 않고 바로 세는 spot cycle counting은 그 로케이션에 열린 조사 작업이 없으면 시스템이 spot count용 작업을 새로 만들고, 있으면 그 작업을 쓴다. 앱은 의도적인 오차 입력을 막으려고 예상 수량을 보여 주지 않으며, 재시도 횟수를 정해 다시 세게 할 수 있다.
- 차이 승인: cycle count supervisor가 아닌 작업자의 입력이 작업자별 허용 범위(비율이나 수량)를 벗어나거나, 허용 범위가 없는데 장부와 다르면 작업이 검토 대기(Pending review)가 된다. 예상에 없던 품목이나 license plate를 추가하면 supervisor의 입력은 자동 승인되지만, 다른 작업자의 입력은 허용 범위와 관계없이 검토 대기가 된다. 승인하면 차이를 표준 counting journal로 전기하고, 반려하면 작업을 닫는다. 같은 로케이션에 열림, 진행 중, 검토 대기 상태의 조사 작업을 둘 이상 둘 수 없다.
- SAP EWM 9.0 문서는 periodic, continuous, cycle counting 방식을 지원한다. cycle counting은 제품을 A, B, C, D 같은 등급으로 나눠 주기를 정하므로 회전이 빠른 제품을 더 자주 셀 수 있다. 실사 문서를 만들고, 세어 입력하고, 필요하면 재조사한 뒤 전기하며, 차이를 전기하려면 ERP 연동이 필요하다.

### 보충과 안전 재고

- 구분: 재고가 기준 아래로 떨어질 때의 대응은 둘로 나눈다. 창고 안에서 보관 구역의 재고를 피킹 구역으로 옮기는 보충과, 창고 전체 재고가 모자라 공급 측에 발주하고 입고 예정(ASN)을 받는 재주문이다. 재주문은 [[WMS-Inbound-Context-Modeling|입고 컨텍스트]]로 이어진다.
- 보충: Dynamics 365 Warehouse management의 보충은 WMS를 켠 품목과 창고에서 동작하며, 웨이브 수요, min/max, 적재 수요, 즉시 보충 전략을 두고 모두 보충 템플릿으로 보충 작업을 만든다. min/max 보충은 피킹 로케이션 재고를 최소와 최대 사이로 유지하는 주된 방법으로 보통 하루 한 번 피킹 전에 돌리고, 빈 로케이션은 그 품목의 고정 로케이션으로 지정해야 채울 수 있다. SAP EWM 9.0 문서의 replenishment control도 피킹 구역을 채우는 기능으로, 최소와 최대 수량을 쓰는 planned, 열린 창고 요청 수량을 쓰는 order-related(최대를 넘을 수 있음), warehouse task를 확정할 때 백그라운드에서 확인해 재고가 최소 수량보다 적으면 시작되는 automatic, 고정 빈 시나리오에서 빈 거부의 예외 코드가 내부 프로세스 코드 Replenishment를 가리킬 때 시작되는 direct 방식이 있다.
- 안전 재고: Dynamics 365에서 안전 재고는 품절 위험을 줄이려고 보유하는 수량이며 품목 coverage의 최소(Minimum) 값으로 둔다. master planning은 누적 재고가 최소 아래로 내려갈 것으로 보이면 그 전에 도착하도록 계획 주문을 만든다. coverage code가 min/max이고 최소 10, 최대 15, 현재고 4면 11개를 계획한다.
- 책임 경계: Dynamics 365는 피킹 로케이션 보충을 창고 관리의 보충 템플릿으로, 안전 재고는 master planning의 계획 주문으로 따로 다룬다. 재고 컨텍스트는 보충 작업을 만들고 재고 변동을 알리며 발주 판단은 계획 쪽에 맡기는 경계를 설계 예시로 둘 수 있다([[Supply-Chain-Planning|공급망 계획]]).

### 반품 검수와 등급 판정

- 재고 컨텍스트 안에서 반품은 검수 유스케이스지만 환불과 정산까지 이어져 창고 밖으로 영향이 커진다([[Commerce-Order#반품 프로세스|커머스 반품 프로세스]]).
- Dynamics 365의 실물 반품은 반품 주문(RMA) 생성, 창고 도착과 검수(추가 검사를 위한 격리 포함), 처분 결정, packing slip 갱신으로 처분을 확정해 실물 재고에 반영, 청구서 발행 순으로 진행한다. packing slip을 건너뛰고 바로 청구하면 그 단계의 처리가 청구 때 이뤄진다. 반품 주문 설정에서 정의하는 반품 처분 코드(return disposition code)는 고객에게 크레딧을 줄지와 수수료(charge), 재입고나 폐기나 고객 반송, 교체품 발송을 함께 정한다. 코드는 업무에 맞게 만들되 각 코드가 Credit only, Credit, Replace and credit, Replace and scrap, Return to customer, Scrap 여섯 기본 동작 중 하나를 참조한다. Credit은 반품한 품목의 원가만큼 재고 가치를 늘리고, 폐기가 따르는 Credit only, Scrap, Replace and scrap은 폐기 손실을 원장에 전기한다. 격리 검사로 보낸 라인에는 도착 때 처분 코드를 지정할 수 없고, 격리 주문의 검사 결과로 정한다.
- 창고 처분 코드는 이와 다르다. Warehouse management의 disposition code는 작업자가 모바일 앱에서 스캔하는 입고 규칙으로 재고 상태, 작업 템플릿과 위치 규칙을 정하고, 반품용 코드는 반품 처분 코드에 연결해 남은 반품 처리를 정한다. 모바일 앱으로 반품을 등록하면 이 코드가 필수다. [[WMS-Inbound-Context-Modeling#검수와 예외 처리|입고 검수]]에서 처분 코드로 검사 위치를 고르는 위치 규칙도 이 창고 처분 코드를 쓴다.
- SAP EWM 9.0 문서에서 품질 검사 뒤 후속 조치(적치, 재고 이전, 반송, 폐기)는 창고 문서와 warehouse task를 만든다. 재고 이전, 반송, 폐기의 warehouse task는 해당 창고 프로세스 유형을 정의했을 때 만들고, 적치는 필요하면 납품 항목의 창고 프로세스 유형으로 만든다(저장 통제 프로필이 있는 handling unit에 담긴 재고는 저장 통제가 처리한다). 폐기는 Scrap으로 표시한 재고 유형으로, 위치와 무관한 재고 유형 변경은 새 재고 유형으로 이전 전기한다. EWM과 함께 쓰는 advanced returns management는 SAP ERP의 LO-ARM이 반품 주문을 만들며 주도한다. 검사, 판정, 후속 조치를 ERP에서 끝내는 방식과, EWM에서 검사해 적치나 폐기 같은 단순 조치는 EWM에서 하고 복잡한 조치는 ERP로 넘길 수 있는 방식이 있다.
- 등급 설계(설계 예시): 양품, 불량, 파손에 수리 가능 같은 등급을 더할 수 있다. 수리 뒤 재보관, 렌털 회수품의 재대여 가능 판정처럼 업종마다 다른 등급은 제품의 기본 처분 동작에 그대로 대응하지 않을 수 있으므로, 등급과 후속 작업(수리 지시, 재검수)을 따로 두고 손상 비용 청구는 주문과 정산 쪽에 넘긴다.

### 보류와 해제

- Dynamics 365의 재고 상태(inventory status)는 저장 차원의 하나이며 가용과 비가용으로 나뉜다. Inventory blocking을 켠 상태의 재고는 실물 재고로 남지만 생산, 판매, 이동 주문과 출고 거래에 쓸 수 없고, master planning은 이를 없는 재고로 보고 보충을 계획한다. 재고 상태는 On-hand by location 화면이나 일괄 작업으로 바꾸지만, 열린 창고 작업이 있는 로케이션(예: 입고 뒤 적재 전)에서는 바꿀 수 없어 관련 작업을 완료하거나 취소해야 한다. 열린 작업에 걸린 재고의 상태는 보통 작업자가 모바일 앱에서 이동 같은 처리를 하며 바꾼다.
- 보류 수단은 여럿이다. Dynamics 365는 수동 차단, 품질 주문, 품질 주문을 만드는 프로세스, 재고 상태 차단을 두고, 수동 차단은 가용 현재고에만 걸 수 있으며 검사 뒤 돌아올 수량을 계획에 넣을지(expected receipts) 정한다. 배치에는 batch disposition code로 예약, 피킹, 출고를 주문 유형별로 막고 계획 반영 여부를 정한다. 다만 배치가 로케이션 아래인 품목은 [[#유통기한과 출고 순서|예약 조건]]에 따라 예약 때 코드가 적용되지 않을 수 있다. master planning은 배치 만료일과 재고 상태 차단을 함께 쓰는 구성을 지원하지 않아 현재고가 이중으로 빠질 수 있으므로, 만료 배치는 재고 상태 대신 batch disposition code로 막도록 권한다.
- SAP EWM 9.0 문서에서 재고 유형(stock type)은 quant를 식별하는 stock key의 일부다. 사용 제한 없음(unrestricted-use), 품질 검사, 보류, 반품 같은 유형을 정의해 ERP의 재고 유형과 저장 위치에 대응시키고, posting change로 stock key를 바꾼다. posting change는 원래 quant의 수량을 줄이고 대상 quant의 수량을 늘리지만 위치는 바꾸지 않는다.
- 보류 사유는 품질과 유통기한만이 아니다. 출고 시점을 늦추려는 사업 판단으로 보류를 걸기도 한다. 사유, 건 사람, 해제 조건을 함께 남긴다(설계 제안).

### 이상 보고와 로케이션 오류 이동

- 잘못된 로케이션에 적치한 재고는 이상 보고를 등록하고 원래 지시된 로케이션으로 옮긴다. 파손을 발견한 재고는 이상 보고와 함께 파손 상태로 바꿔 할당 대상에서 뺀다. Dynamics 365 모바일 앱의 Quarantine 메뉴 항목은 license plate나 로케이션의 현재고 상태를 바꿔 파손되거나 없어진 재고를 쓸 수 없게 한다. 보고 없이 위치만 바로잡으면 정정 이동의 이력이 남지 않아 오적치 원인과 그사이 생긴 차이를 추적하기 어려우므로, 정정 이동은 사유와 함께 재고 이동 거래로 남긴다(설계 제안). 이동을 즉시 반영할지 이동 작업으로 만들어 두고 나중에 수행할지도 정한다. Dynamics 365의 transfer journal은 이동을 즉시 반영하고 이동 중 재고를 추적하지 않는다. WMS 창고 안의 로케이션 이동은 모바일 앱의 Movement(작업자가 출발과 도착 로케이션을 지정)나 Movement by template(도착 로케이션은 location directive로 결정) 메뉴 항목으로 등록하고, Create movement를 켜면 이동 작업을 만들어 두고 바로 수행하지 않을 수 있다.
- Dynamics 365의 spot cycle counting에서 다른 로케이션에 있다고 기록된 license plate를 현재 위치에서 세면, 창고가 조사 중 license plate 이동을 허용할 때 이동 확인을 받아 재고 이동으로 기록한다. 실사와 수량 조정의 사유 코드(reason code)는 필수나 선택으로 정하고, 필수인데 비어 있으면 counting journal을 마감할 수 없다. 수량 조정(adjustment in, out) 메뉴 항목에서 Use process guide를 켜고(Adjustment in은 항상 켜져 있고 Adjustment out은 직접 켠다) Worker 설정의 Adjustment quantity limit에 작업자별 최대 조정 수량을 두면 그 한도를 넘는 조정 입력을 막아, 수량 대신 품목 바코드를 찍는 식의 실수로 큰 수량이 조정되는 일을 줄인다.

## 상태 전이 (설계 예시)

| 상태 | 의미 | 들어오는 계기 | 나가는 계기 |
|---|---|---|---|
| 가용(Available) | 바로 꺼낼 수 있음 | 적재 완료, 반품 검수 합격(양품), 보류 해제, 예약 해제, 수리 완료, 조사 종료, 도착 스캔 | 예약, 보류, 파손 판정, 실사 차이, 이동 시작 |
| 선점(Reserved) | 특정 주문이나 담당자에게 묶여 다른 용도로 쓸 수 없음 | 할당, 수동 예약 | 피킹, 예약 해제, 결품 |
| 보류(On Hold) | 품질, 유통기한, 사업 판단으로 사용 금지 | 보류 지정, 품질 검사 대기 | 해제, 폐기 판정 |
| 파손(Damaged) | 팔 수 없다고 판정됨 | 검수, 이상 보고 | 수리 뒤 가용, 반송, 폐기 판정 |
| 조사 중(Under Investigation) | 수량이나 위치를 확인하는 중 | 실사 차이, 결품(출고의 `ShortPickReported`) | 차이 승인, 반려 |
| 이동 중(In Transit) | 로케이션 사이를 옮기는 중 | 이동 시작 | 도착 스캔 |
| 폐기(Scrapped) | 판매와 할당 대상에서 빠지고, 반출하면 재고에서 빠짐 | 폐기 판정 | 폐기 반출(종료) |

- 한 상태 컬럼에 모든 의미를 넣지 않는다(설계 제안). Dynamics 365는 사용 가능성을 재고 상태라는 차원으로 두고 WMS를 켠 품목의 예약은 예약 계층 수준별 수량으로 따로 세며, SAP EWM 9.0 문서에서도 재고 유형은 stock key에 있고 피킹 warehouse task를 만들면 quant의 가용 수량이 줄어든다. 그러니 가용, 보류, 파손, 폐기는 상태 축으로, 선점은 예약 수량으로, 이동 중은 이동 작업으로, 조사 중은 로케이션 단위 제약이나 조사 작업으로 나누면 예약된 재고에 보류가 걸리는 경우도 다루기 쉽다. 이동 중 상태는 [[WMS-Inbound-Context-Modeling#상태 전이 (설계 예시)|입고의 적재 상태]]와 이어진다. 폐기도 판정(폐기 상태로 옮겨 할당 대상에서 뺌)과 반출(수량 감소)을 나눈다. SAP EWM 9.0 문서의 폐기 후속 조치도 Scrap 재고 유형으로의 이전 전기다.
- 상태를 둘 단위도 정한다. SAP EWM 9.0 문서의 quant는 한 저장 빈에 있는 같은 특성의 제품 재고이고 배치가 다르면 다른 quant다. 개별 물품이 아니라 아이템, 로케이션, 로트, 상태 조합의 수량에 상태를 두고, 여러 화주를 맡는 창고는 조합에 화주(소유자)를 더할 수 있다(설계 예시, SAP EWM 9.0 문서의 stock key에도 owner와 party entitled to dispose가 있다). 상태 변경과 위치 이동은 원천 조합 행의 조건부 차감과 대상 조합 행의 증가(행이 없으면 조합 키 유니크 제약과 UPSERT)를 한 트랜잭션으로 묶고([[Lock#MVCC와 Lock의 관계|조건부 UPDATE와 UPSERT]]), 전이는 이름 있는 메서드로 바꿔 허용된 선행 상태를 확인한다([[DDD#변경 경계와 생명주기 규칙|DDD의 변경 경계와 생명주기 규칙]]). 로트나 화주를 쓰지 않는 행도 같은 조합이 유니크 제약에서 같은 키로 잡히도록 해당 열에 NULL 대신 로트 없음 같은 고정값을 둔다. MySQL과 PostgreSQL의 기본 UNIQUE 제약은 NULL끼리 충돌로 보지 않아, NULL이 든 조합은 UPSERT가 충돌을 찾지 못하고 같은 조합의 행을 하나 더 만든다([[SQL-Fundamentals-NULL#중복, 그룹과 제약의 NULL 처리|UNIQUE 제약의 NULL 처리]]). PostgreSQL 18 문서 기준으로는 UNIQUE NULLS NOT DISTINCT로 NULL끼리도 충돌로 보게 할 수 있다.

## 핵심 엔티티 (설계 예시)

| 엔티티 | 책임 |
|---|---|
| 재고(Inventory) | 아이템, 로케이션, 로트, 상태 조합(여러 화주면 화주 포함)의 실물 수량과 예약 수량. 가용 판정과 수량 불변식 |
| 로케이션(Location) | 위치 식별, 보관 조건, 조사 중 같은 위치 단위 제약 |
| 로트(Lot) | 제조일, 유통기한, 처분 상태. 로트를 관리하는 품목에만 둔다 |
| 재고 조정(Stock Adjustment) | 실사 차이나 이상 처리로 생긴 증감, 사유, 승인자, 회계 반영 여부 |

- 재고와 로케이션이 중심이다. 로트는 쓰는 품목과 쓰지 않는 품목이 섞여 품목별 선택 속성에 가깝다. Dynamics 365 shelf life 문서는 배치 추적 여부를 정하는 tracking dimension group을 제품을 처음 만들 때만 지정할 수 있다고 하지만, Inventory costing FAQ는 현재고가 0이고 모든 재고 거래의 Value open이 No이면 출시 제품의 저장 차원 그룹과 추적 차원 그룹을 바꿀 수 있고 product dimension group은 만든 뒤 바꿀 수 없다고 한다. 두 문서 모두 현재고가 남았거나 Value open이 Yes인 거래가 있는 품목의 추적 차원 그룹을 바꾸는 방법은 제시하지 않으므로 로트 관리 대상은 품목 등록 단계에서 정한다(설계 제안).
- 재고 조정은 회계와 이어진다. Dynamics 365의 inventory adjustment journal을 전기하면 재고 입출고, 재고 가치 변경과 원장 거래가 함께 생기고, counting reason code에 상대 계정을 지정하면 counting journal 전기 금액이 기본 재고 전기 계정 대신 그 계정으로 간다. SAP EWM 9.0 문서의 Difference Analyzer는 실사, warehouse task 확정, 판매 주문과 재고 이전 클레임에서 생긴 차이를 ERP로 전기해 ERP 재고, 특히 재무 회계와 맞춘다. 사용자마다 허용 그룹을 지정해 그 기준값을 넘는 차이를 표시하고, 상세 수준에서 허용 범위를 넘었거나 차이를 잠갔거나 세관 보류 재고가 있으면 신호등이 빨강(전기 불가)이 되며, 노랑은 경고와 함께 전기할 수 있다. 전기하면 ERP에 자재 문서가 자동으로 생긴다. 그래서 조정 기록은 승인 이력과 함께 지우지 않고 남기며, 잘못된 조정은 반대 조정으로 바로잡는다(설계 제안).

## 연관 시스템

| 시스템 | 재고와의 접점(설계 예시) |
|---|---|
| ERP | 재고 가치와 회계, 조정과 실사 차이 전기, 반품 환불과 폐기 손실, 안전 재고와 발주 계획 |
| OMS, 화주 시스템 | 가용 재고와 ATP 조회, 예약, 반품 요청 |
| MES | 생산 투입 자재의 가용 조회와 완제품 수량 반영. 자재 출고와 완제품 입고 요청은 출고와 입고 컨텍스트를 거친다 |

- 재고 가치와 회계가 ERP에 있어 셋 가운데 접점이 가장 큰 쪽은 보통 ERP다. 운송 관리 시스템(TMS)은 재고보다 [[WMS-Outbound-Context-Modeling#연관 시스템|출고 컨텍스트]]의 접점이고, MES와 ERP의 계층 구분은 [[WMS-Inbound-Context-Modeling#연관 시스템|입고 컨텍스트]]에 있다. 외부 조회와 명령은 번역 계층에서 내부 모델로 바꾼다([[DDD-Hexagonal-In-Production-Pragmatics|ACL]]).

## 도메인 이벤트 도출

같은 컨텍스트 안의 후속 처리는 도메인 이벤트로, 다른 컨텍스트나 외부 시스템에 알리는 일은 통합 이벤트로 나누는 기준은 [[WMS-Inbound-Context-Modeling#도메인 이벤트 도출|입고 컨텍스트]]와 같다. 재고 컨텍스트는 받은 이벤트마다 반영할 것을 나눈다. 입고의 `InspectionCompleted`로 수량 확정을, `PutawayCompleted`로 보관 위치를 반영하고, 출고의 `StockAllocated`로 예약(수량 묶음, 비동기 반영 구조일 때)을, `PickCompleted`로 위치 이동을, `GoodsIssuePosted`로 물리 차감을, `ShipmentCancelled`로 할당 해제를 반영하며, `ShortPickReported`를 받으면 그 로케이션을 조사 중으로 돌린다([[WMS-Outbound-Context-Modeling#도메인 이벤트 도출|출고 컨텍스트]]). 청구와 회계 반영은 ERP가 맡는다. 재고 컨텍스트가 내는 후보는 아래와 같다.

| 계기 | 이벤트 후보 | 구분 | 알아야 하는 쪽 |
|---|---|---|---|
| 보류, 해제, 파손과 폐기 판정 | `InventoryStatusChanged` | 도메인, 가용 수량 변화는 통합 | 할당, OMS의 가용 재고 |
| 실사 차이 발견 | `CountDiscrepancyFound` | 도메인 | 차이 검토, 재조사 |
| 차이 승인과 조정 | `StockAdjusted` | 통합 | ERP 재고 가치, OMS의 가용 재고 |
| 피킹 구역 기준 미달 | `ReplenishmentTriggered` | 도메인 | 보충 작업 생성 |
| 반품 등급 판정 | `ReturnGraded` | 도메인, 처분 결과는 통합 | 재입고나 폐기 작업, 환불을 처리할 OMS와 ERP |
| 유통기한 임박과 만료 | `ShelfLifeThresholdReached`, `LotExpired` | 도메인, 판매 중지는 통합 | 보류 처리, OMS |
| 로케이션 정정 이동 | `StockRelocated` | 도메인 | 위치 정보, 이동 이력 |
| 폐기 반출 | `StockScrapped` | 통합 | ERP 손실 처리 |

재고 컨텍스트가 할당 요청을 판정하는 구조라면 판정 결과를, 비동기 반영 구조라면 예약 반영 실패를 출고 컨텍스트에 알리는 통합 이벤트도 후보에 더한다([[#정합성과 동시성 전략|정합성 전략]], 설계 제안). 조사 중과 이동 중은 진행 추적용 상태로 두고, 반응할 쪽이 생길 때 이벤트로 올린다. ERP나 계획 시스템이 재고 변동을 받아 발주를 판단한다면 재고 컨텍스트가 발주 이벤트를 따로 낼 필요는 없다.

## 정합성과 동시성 전략

- 수량 불변식: 가용 수량이 0 아래로 내려가지 않고 예약 수량이 실물 수량을 넘지 않게 한다. 같은 DB라면 한 행으로 표현되는 불변식은 조건부 UPDATE로 판정하고([[Lock#NestJS, TypeORM에서의 적용|DB Lock의 조건부 UPDATE]]), 한 요청이 여러 재고 행을 바꾸면(여러 SKU뿐 아니라 같은 SKU의 원천 행과 대상 행을 함께 바꾸는 이동과 상태 변경 포함) 한 트랜잭션 안에서 행마다 조건부 UPDATE를 조합 키 순서로 실행한다([[Lock-Deadlock#발생 확률 완화 전략|락 순서 통일]]). 예약을 로케이션보다 위 수준(SKU나 창고)에서 잡는다면 그 수준의 상태별 실물과 예약 합계를 담은 집계 행을 두고, 예약은 가용 상태 집계 행에서 조건부로 늘리며, 조합 행 변경과 같은 트랜잭션에서 집계 행도 함께 갱신한다. 집계 행도 잠금 순서에 넣어 집계 행을 먼저 키 순서로 갱신한 뒤 조합 행을 조합 키 순서로 갱신하고, 같은 SKU의 할당이 몰리면 집계 행의 경합이 처리량 상한이 된다는 점을 함께 본다(설계 제안). Dynamics 365 문서의 Default 예약 계층도 재고 상태(Inventory status)를 로케이션보다 위 수준에 두고 수준마다 수량을 따로 저장한다. 상태 키와 짧은 락은 같은 요청의 할당과 취소가 겹치지 않게 할 뿐 수량 불변식을 지키지 않으므로, DB가 나뉘었거나 요청 단위 직렬화가 필요할 때 조건부 갱신에 더해 쓴다([[Distributed-Lock|상태 키와 짧은 락]]).
- 갱신 실패와 재시도: 조건부 UPDATE 가운데 하나라도 갱신 행 수가 0이면 트랜잭션을 되돌리고 요청 실패(할당이면 할당 실패)로 알린다. 부분 할당을 허용하는 계약이면 행마다 묶을 수 있는 수량만큼만 갱신하고 남은 수량을 실패로 알린다. InnoDB에서 UPSERT가 잡는 gap 잠금처럼 키 순서로 막지 못하는 교착은 남으므로, 교착 오류는 새 트랜잭션으로 제한 횟수만큼 재시도한다([[Lock-Deadlock#감지 + 자동 복구 (InnoDB 기본 전략)|데드락 감지와 재시도]]).
- 예약된 수량까지 줄이는 변경: 보류, 파손 판정, 승인된 실사 차이처럼 실물이나 가용 수량을 줄이는 변경이 예약된 수량까지 건드리면, 같은 트랜잭션에서 줄어드는 만큼 예약을 풀거나 대상 행으로 옮기고 할당 쪽에 재할당이나 결품 처리를 알린다. 이미 일어난 실물 감소는 조건부 UPDATE로 거부할 대상이 아니므로 이 경로의 예약 조정 규칙을 따로 정한다(설계 제안).
- 거래 기록: 현재 수량 행을 갱신하는 같은 트랜잭션에서 입고, 출고, 이동, 상태 변경, 조정을 거래로 남겨 현재 수량을 설명할 수 있게 한다. 제품도 상태 변경을 quant 사이의 수량 이전(SAP EWM 9.0 문서의 posting change)으로, 실사 차이를 조정 전기(Dynamics 365 counting journal)로 남긴다. 거래 기록을 감사 이력으로 두는 일과 [[Event-Sourcing|이벤트 소싱]]은 별개 결정이다.
- 실사 중 동시 변경: Dynamics 365는 조사 작업을 만들어도 그 로케이션의 재고를 막지 않아 예약과 출고 처리에 계속 쓸 수 있다. SAP EWM 9.0 문서에서는 실사 중 재고 이동이 제품별 실사 진척의 완료 표시를 막을 수 있어, 한 실사 구역의 제품 재고를 짧은 시간에 모두 세거나 실사 동안 재고를 잠그라고 권한다. 실사 개요 문서도 실사 동안 관련 저장 빈을 잠그라고 권하되 RF 환경에서는 필요 없다고 한다. 위치 단위 잠금으로 정확도를 얻을지, 운영을 계속하고 재조사와 승인으로 차이를 걸러 낼지 정한다.
- 조회와 판정 분리: 검색처럼 늦게 따라와도 되는 사용처만 읽기 모델로 두고, 구매를 결정하는 화면은 실시간으로 조회하며, 할당과 차감 판정은 원장의 조건부 갱신으로 한다([[Lock#NestJS, TypeORM에서의 적용|조건부 UPDATE]]). 할당은 이 갱신이 성공해야 확정되므로, 출고 컨텍스트가 재고 원장을 동기로 갱신한 뒤 `StockAllocated`를 내거나 재고 컨텍스트가 할당 요청을 판정한 결과를 이벤트로 알린다. 이 두 방식에서는 예약이 이미 원장에 반영됐으므로 재고 컨텍스트는 `StockAllocated`를 받아 예약을 다시 반영하지 않는다. 이벤트를 비동기로 받아 예약을 반영하는 구조라면 재고 컨텍스트가 반영 실패를 출고 컨텍스트에 알리고, 출고 컨텍스트가 할당을 되돌려 `AllocationFailed`를 내는 보상 경로를 둔다. 이 구조의 `StockAllocated`는 원장 반영 전의 잠정 할당이므로, 이를 받아 작업을 만든 웨이브나 OMS는 뒤이은 `AllocationFailed`를 받으면 작업을 취소하고 부분 출고나 대기를 다시 정한다(설계 제안). 예약에는 만료와 해제 조건을 두고 실제 예약 기록을 기준으로 푼다([[Saga-Pattern#동시 실행 격리는 별도로 설계한다|semantic lock]]).
- 외부 반영: ERP와 OMS로 보내는 통합 이벤트는 저장이 성공한 뒤에만 보내고([[Transactional-Outbox]]), 다시 들어온 스캔과 메시지는 바코드 값이 아니라 스캔 이벤트 식별자나 메시지 ID로 걸러 한 번만 반영한다([[Idempotency-Key|멱등성 키]]). 같은 품목 바코드를 여러 번 찍는 것은 정상 수량일 수 있다.

## 트레이드오프와 체크포인트

- 화주 식별과 접근 제어를 분리한다. 2026-10-23 대조한 Dynamics 365 Warehouse management only mode는 공유 품목의 소유권을 owner inventory dimension으로 추적하는 구성을 설명한다. 이 식별 차원 자체를 사용자별 조회와 변경 권한의 증명으로 쓰지 않는다. 설계 제안으로, 인증된 사용자와 연동 시스템의 허용 화주를 서버에서 확인하고 조회, 예약, 조정과 외부 전송에 같은 경계를 적용한다. 다른 화주의 식별자를 넣은 요청이 거부되는지 따로 검증한다.
- 비기능 요구사항도 유스케이스의 실패 조건으로 구체화한다(설계 제안). 재고 1개에 대한 동시 할당, 스캔 재전송, DB 반영 뒤 외부 전송 실패, 권한 없는 재고 조정을 각각 재현하고 수량 불변식, 중복 방지, 재처리와 감사 기록을 확인한다. 장비 연동은 연결 여부뿐 아니라 응답 유실과 재전송 때의 계약을 정한다. 기존 정합성 전략을 실제 검사 항목으로 연결한 제안이며 실행 시험은 하지 않았다. 제품 전체를 다시 대조하지 않아 기존 `verified_at`은 유지한다.
- 상태를 잘게 나눌수록 추적성은 좋아지지만 전이 경로와 테스트할 조합이 늘어난다. 상태, 예약, 위치를 다른 축으로 나누면 조합이 덜 늘어난다.
- 작업자별 허용 범위를 넓히면 실사가 빨라지지만 작은 차이가 검토 없이 반영된다. 승인 한도를 실사 입력 단계(Dynamics 365의 작업자별 허용 범위)에만 둘지 ERP 전기 단계(SAP EWM 9.0 Difference Analyzer의 사용자별 허용 그룹)에도 둘지, 사유 코드 필수 여부와 상대 계정을 회계 담당과 함께 정한다.
- 여러 화주를 대행하는 풀필먼트는 상태 코드, 반품 등급, 보류 규칙을 화주별 설정으로 둘지 공통 모델과 대응표로 둘지 정한다.
- 확인 질문: 가용 재고에 입고 예정과 예약을 어떻게 반영하는가, 어떤 품목을 로트와 유통기한으로 관리하는가, 실사 차이를 누가 어디까지 승인하고 언제 ERP 회계로 넘기는가, 반품 등급마다 어떤 후속 작업과 비용 처리가 따르는가, 실사 중 출고를 막는가.

## 출처

- [Microsoft Learn, Warehouse management only mode overview](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/wms-only-mode-overview)
- [YouTube, 코딩하는오후, 6강 Inventory 재고 관리 Context 심층 분석](https://www.youtube.com/watch?v=Db9IHuhk_A8)
- [Microsoft Learn, Order promising](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/delivery-dates-available-promise-calculations)
- [Microsoft Learn, Reservations in Warehouse management](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/reservations-in-warehouse-management)
- [Microsoft Learn, Reserve inventory quantities](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/reserve-inventory-quantities)
- [Microsoft Learn, Master planning for products with limited shelf life](https://learn.microsoft.com/en-us/dynamics365/supply-chain/master-planning/planning-optimization/shelf-life)
- [Microsoft Learn, Work with location directives](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/create-location-directive)
- [Microsoft Learn, Cycle counting](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/cycle-counting)
- [Microsoft Learn, Cycle counting example scenarios](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/cycle-counting-scenarios)
- [Microsoft Learn, Reason codes for inventory counting](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/reason-codes-for-counting-journals)
- [Microsoft Learn, Inventory journals](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-journals)
- [Microsoft Learn, Inventory costing FAQ](https://learn.microsoft.com/en-us/dynamics365/supply-chain/cost-management/inventory-costing-faq)
- [Microsoft Learn, Replenishment overview](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/replenishment)
- [Microsoft Learn, Safety stock fulfillment for items](https://learn.microsoft.com/en-us/dynamics365/supply-chain/master-planning/safety-stock-replenishment)
- [Microsoft Learn, Sales returns](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/sales-returns)
- [Microsoft Learn, Set up dispositions codes](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/tasks/set-up-dispositions-codes)
- [Microsoft Learn, Inventory statuses](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-statuses)
- [Microsoft Learn, Inventory blocking](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-blocking)
- [Microsoft Learn, Use batch disposition codes to mark batches as available or unavailable](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/batch-disposition-codes)
- [Microsoft Learn, Create and configure mobile device menu items](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/configure-mobile-devices-warehouse)
- [SAP Help Portal, EWM 9.0 Stock Removal Strategies](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4c/b4cf0d0c056642e10000000a15822b/content.htm)
- [SAP Help Portal, EWM 9.0 Generation of Warehouse Request of Outbound Delivery Order Type](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4f/af5b22635e42f5e10000000a421937/content.htm)
- [SAP Help Portal, EWM 9.0 Physical Inventory](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4c/b4e7d54c1f1921e10000000a15822b/content.htm)
- [SAP Help Portal, EWM 9.0 Cycle Counting](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4c/b4e7e04c1f1921e10000000a15822b/content.htm)
- [SAP Help Portal, EWM 9.0 Physical Inventory Progress](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4c/b4ea364c1f1921e10000000a15822b/content.htm)
- [SAP Help Portal, EWM 9.0 Difference Analysis](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4c/b4e7d24c1f1921e10000000a15822b/content.htm)
- [SAP Help Portal, EWM 9.0 Replenishment Control](https://help.sap.com/saphelp_ewm900/helpdata/en/fb/4017416584f06fe10000000a1550b0/content.htm)
- [SAP Help Portal, EWM 9.0 Logistical Follow-Up Actions](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/3e/05c941c43e6124e10000000a1550b0/content.htm)
- [SAP Help Portal, EWM 9.0 Advanced Returns Management](https://help.sap.com/saphelp_ewm900/helpdata/en/57/0d7a28ff3e465d9780b3afcf1cab78/content.htm)
- [SAP Help Portal, EWM 9.0 Quant](https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4b/c49585921f4c88e10000000a42189e/content.htm)
- [MySQL 8.4 Reference Manual, CREATE INDEX Statement](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)
- [MySQL 8.4 Reference Manual, INSERT ... ON DUPLICATE KEY UPDATE Statement](https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [PostgreSQL 18 Documentation, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18 Documentation, INSERT](https://www.postgresql.org/docs/18/sql-insert.html)

## 관련 문서

- [[WMS-Inbound-Context-Modeling|WMS 입고 컨텍스트 모델링 (분석 순서와 도메인 이벤트 기준)]]
- [[WMS-Outbound-Context-Modeling|WMS 출고 컨텍스트 모델링 (재고 할당, 결품, 재고 차감 시점)]]
- [[DDD|DDD (Bounded Context, Context Map, 상태 전이 규칙)]]
- [[Lock|DB Lock (조건부 UPDATE와 낙관적 잠금)]]
- [[Distributed-Lock|Distributed Lock (WMS 재고 할당의 상태 키)]]
- [[Inventory-Data-Pipeline|재고 데이터 파이프라인 (가용 재고 조회의 Push와 Pull)]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Idempotency-Key|멱등성 키]]
- [[Saga-Pattern|Saga 패턴 (예약 만료와 semantic lock)]]
- [[Commerce-Order|커머스 주문과 반품 프로세스]]
- [[Supply-Chain-Planning|공급망 계획 (안전재고 정책과 발주)]]
