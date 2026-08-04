---
tags: [database, rdbms, aggregation, summary-table, batch, idempotency]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Summary Table", "Aggregate Table", "집계 테이블", "통계 테이블"]
---

# 집계 테이블과 재계산 가능한 통계

집계 table은 원본 OLTP row를 반복 scan하는 비용을 미리 계산한 값으로 바꾼 read model이다. 먼저 **grain, source 범위와 freshness 계약**을 정하고, 실패/지연 데이터에도 재계산 가능한 pipeline을 만든다.

## Grain이 schema를 결정한다

예를 들어 일별 상품 매출이라면 한 row의 의미를 먼저 고정한다.

```text
grain = business_date + product_id + currency
measures = order_count, quantity, gross_amount, refund_amount
dimensions = tenant/merchant, timezone, policy_version
```

```sql
CREATE TABLE daily_product_sales (
  business_date DATE NOT NULL,
  product_id BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  order_count BIGINT NOT NULL,
  quantity BIGINT NOT NULL,
  gross_amount DECIMAL(20, 2) NOT NULL,
  refund_amount DECIMAL(20, 2) NOT NULL,
  source_cutoff DATETIME(6) NOT NULL,
  calculated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (business_date, product_id, currency)
);
```

- business date의 timezone과 `[start, end)` 경계를 정한다.
- 금액은 currency를 포함하고 smallest unit/decimal 정책을 통일한다.
- 취소/환불을 원 거래일과 발생일 중 어디에 반영하는지 결정한다.
- distinct user 같은 비가산 measure는 일별 합으로 월간 값을 만들 수 없음을 표시한다.

일별 row를 합쳐 주/월 통계를 만들 수 있는지는 measure의 가산성에 달렸다. 단순 count/sum은 가능하지만 distinct, percentile과 마지막 상태는 별도 sketch/source가 필요할 수 있다.

## 도입 단계를 점진적으로 높인다

1. 원본 query와 적절한 index로 시작한다.
2. 부하와 latency가 기준을 넘으면 일별 summary를 만든다.
3. 과거 summary와 오늘 원본을 합치는 hybrid query로 freshness를 높인다.
4. 오늘 원본 scan도 크면 micro-batch/current summary를 추가한다.
5. 요구가 더 강하면 streaming materialization을 비교한다.

통계 query가 느리다는 이유만으로 production primary에 table과 batch를 바로 추가하지 않는다. read replica, warehouse, cache와 제품 freshness 요구도 함께 비교한다.

## Idempotency는 같은 입력에서 같은 상태다

단순 increment는 재실행 시 중복 합산되기 쉽다.

```sql
UPDATE summary
SET amount = amount + :delta;
```

더 안전한 기본은 확정된 source window를 다시 계산해 **목표 절대값을 대체**하는 것이다.

```sql
INSERT INTO daily_product_sales (...) VALUES (...) AS incoming
ON DUPLICATE KEY UPDATE
  order_count = incoming.order_count,
  quantity = incoming.quantity,
  gross_amount = incoming.gross_amount,
  refund_amount = incoming.refund_amount,
  source_cutoff = incoming.source_cutoff,
  calculated_at = incoming.calculated_at;
```

MySQL의 `VALUES(col)` 함수 형태는 deprecated됐으므로 새 row alias를 사용한다. Upsert 자체가 idempotency를 보장하는 것은 아니다. `existing + incoming`처럼 누적하면 retry 때 여전히 중복된다.

작은 grain은 transaction 안에서 delete 후 insert도 가능하지만 독자가 빈 구간을 보지 않게 transaction/temporary table swap을 고려한다. 큰 범위는 grain별 upsert와 run metadata가 더 적합할 수 있다.

## Watermark와 늦은 데이터

처리 시각과 event 발생 시각이 다르므로 자정에 전날을 한 번 계산했다고 완료가 아니다.

- `source_cutoff` 또는 source high-water mark를 저장한다.
- 최근 N개 partition을 매번 재계산하는 lookback window를 둔다.
- 매우 늦은 correction은 backfill job과 audit event로 처리한다.
- source schema/policy 변경 시 summary version을 올리거나 전체 rebuild한다.
- batch가 건너뛴 구간, 중복 run과 source lag를 metric으로 감시한다.

N은 고정 관행이 아니라 실제 late-arrival 분포와 비용으로 정한다. event time 기준 통계라면 timezone/DST와 source clock도 검증한다.

## Micro-batch와 hybrid query

```text
result = closed_days_summary
       + today_current_summary(up to cutoff)
       + optional raw tail(after cutoff)
```

각 구간이 겹치거나 비면 double count/누락이 생긴다. 모든 component가 같은 half-open boundary와 cutoff token을 사용해야 한다. raw tail을 합치는 동안 transaction snapshot이 필요한지도 제품 정확도 계약에 따라 정한다.

짧은 주기의 micro-batch는 freshness를 높이지만 다음 비용이 있다.

- 같은 hot key의 upsert lock contention
- secondary index와 redo/binlog write 증가
- source query가 반복되어 primary를 압박
- 실패 detection/retry가 더 자주 필요

batch 주기는 UI 새로고침 요구, source load와 허용 지연을 측정해 선택한다.

## 검증과 reconciliation

- source sample과 summary를 grain별로 재계산해 차이를 비교한다.
- `gross - refund`, count와 non-negative 같은 domain invariant를 검사한다.
- run별 source row 수, target row 수, cutoff, duration과 checksum을 남긴다.
- code 배포 전에 과거 partition backfill을 staging/replica에서 rehearsal한다.
- 통계 table을 금액 정산의 유일 근거로 쓴다면 정확도, audit와 승인 수준을 별도로 높인다.

## NestJS와 TypeORM 적용

- scheduler가 직접 큰 transaction 하나를 열기보다 bounded chunk와 stable cursor를 사용한다.
- `(grain key...)` unique/primary constraint를 두고 repository upsert의 생성 SQL을 확인한다.
- job execution table에 logical window와 job version을 unique하게 기록한다.
- 여러 worker가 같은 window를 처리하지 않도록 lease/lock을 사용하되 만료와 takeover를 설계한다.
- source query와 summary write를 같은 entity model에 억지로 묶지 않고 read model을 별도 module로 둔다.

## 출처

- [MySQL 8.4, INSERT ON DUPLICATE KEY UPDATE](https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html)
- [김영한 강사, 통계 data와 성능 문제](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401992)
- [김영한 강사, 통계 table 설계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401993)
- [김영한 강사, 주간/월간 통계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401994)
- [김영한 강사, 실시간 hybrid 통계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401995)
- [김영한 강사, 멱등성 설계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401996)
- [김영한 강사, micro-batch](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401997)
- [김영한 강사, upsert 최적화](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401998)
- [김영한 강사, 통계 table 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401999)
- [인프런, Hong, DB 설계 패턴](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338545)

## 관련 문서

- [[Idempotency|멱등성]]
- [[OLTP-vs-OLAP|OLTP와 OLAP]]
- [[Spring-Batch-Essentials|Batch 처리]]
