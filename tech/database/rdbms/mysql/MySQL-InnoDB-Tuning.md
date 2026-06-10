---
tags: [database, mysql, innodb, buffer-pool, tuning]
status: done
category: "Database - RDBMS"
aliases: ["MySQL InnoDB Tuning", "Buffer Pool", "innodb_flush_log_at_trx_commit"]
---

# InnoDB Tuning — Buffer Pool, 로그, I/O

InnoDB의 운영 성능은 **메모리(Buffer Pool) ↔ Redo Log ↔ 디스크 I/O** 삼각관계에서 결정된다. 기본값은 안전 우선이라 운영 트래픽에는 보수적 — 워크로드를 알고 조정하면 같은 하드웨어에서 수배 차이가 난다.

## 튜닝 우선순위

| 순위 | 항목 | 영향 |
|------|------|------|
| 1 | `innodb_buffer_pool_size` | 가장 큼 — 디스크 I/O 90% 결정 |
| 2 | `innodb_flush_log_at_trx_commit` | 쓰기 성능 vs 내구성 트레이드오프 |
| 3 | `innodb_log_file_size` | 쓰기 부하, 체크포인트 빈도 |
| 4 | `innodb_io_capacity` / `_max` | 더티 페이지 flush 속도 |
| 5 | `innodb_buffer_pool_instances` | 멀티코어 경합 분산 |
| 6 | `innodb_flush_method` | OS 캐시, 이중 버퍼링 |

## 1. Buffer Pool — 가장 중요한 변수

InnoDB의 **데이터, 인덱스 페이지 캐시**. Buffer Pool 적중률이 곧 성능. 디스크 I/O의 대부분이 이 캐시 미스에서 발생.

```sql
SET GLOBAL innodb_buffer_pool_size = '8G';
SET GLOBAL innodb_buffer_pool_instances = 8;
```

| 권장값 | 근거 |
|--------|------|
| 전용 DB 서버: **물리 메모리의 70~80%** | OS, 연결 메모리, tmp 테이블 여유 |
| 공용 서버: 30~50% | 다른 프로세스와 공존 |
| 작은 DB (< 8GB): DB 크기 + 30% 여유 | 전체 데이터를 메모리에 |

**`innodb_buffer_pool_instances`** — Buffer Pool을 N개로 분할해 mutex 경합 감소. 코어 수와 비슷하게(8~16). Buffer Pool 1GB 미만이면 1로 둠.

### 적중률 모니터링

```sql
SELECT
  ROUND(
    (1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)) * 100,
    2
  ) AS hit_rate
FROM (
  SELECT
    VARIABLE_VALUE AS Innodb_buffer_pool_reads
    -- ...
) t;
```

목표 99%+. 95% 미만이면 Buffer Pool 키우기 또는 워킹셋 분석.

### Warmup

재시작 후 Buffer Pool이 비면 응답 시간 폭증. **8.0+는 자동 dump/load**:

```sql
SET GLOBAL innodb_buffer_pool_dump_at_shutdown = ON;
SET GLOBAL innodb_buffer_pool_load_at_startup = ON;
```

종료 시 페이지 ID 덤프 → 시작 시 다시 적재.

## 2. Redo Log — 내구성 vs 성능

Redo Log는 **트랜잭션 commit이 디스크에 도달했음을 보장**하는 WAL. 설정 하나로 쓰기 성능이 크게 갈림.

```sql
SET GLOBAL innodb_flush_log_at_trx_commit = 1;   -- 기본 (가장 안전)
SET GLOBAL innodb_log_file_size = '1G';
SET GLOBAL innodb_log_buffer_size = '64M';
```

### `innodb_flush_log_at_trx_commit`

| 값 | 동작 | 손실 가능 |
|----|------|----------|
| **1** (기본) | 매 commit마다 flush + fsync | 0초 (완전 내구성) |
| **2** | 매 commit마다 OS 버퍼에 write, 1초마다 fsync | OS 크래시 시 1초 |
| **0** | 1초마다 write + fsync | MySQL 크래시 시 1초 |

- 금융, 결제 도메인은 **반드시 1**.
- 분석, 로그, 캐시성 데이터는 **2가 절충안** — 쓰기 처리량 ~5배.
- 0은 거의 안 씀 — MySQL 자체 크래시도 영향.

### `innodb_log_file_size`

체크포인트 주기 결정. **크면**: 체크포인트 빈도 ↓ → 쓰기 부하 균등, 회복 시간 ↑. **작으면**: 빈번한 체크포인트로 I/O 스파이크.

운영급은 1~4GB. log_file_size를 늘리면 회복 시간이 늘어 운영 RTO 영향 — 트레이드오프.

## 3. I/O Capacity

InnoDB가 백그라운드로 **dirty page를 flush하는 속도** 한계.

```sql
SET GLOBAL innodb_io_capacity = 2000;       -- SSD 기준
SET GLOBAL innodb_io_capacity_max = 4000;   -- 부하 폭증 시 상한
```

| 디스크 | 권장 |
|--------|------|
| HDD | 100~200 |
| SATA SSD | 1000~2000 |
| NVMe SSD | 5000~20000 |

**낮으면** 더티 페이지 누적 → 체크포인트 시 폭발적 I/O. **너무 높으면** 다른 작업 I/O 압박.

## 4. flush_method, 더티 페이지

```sql
SET GLOBAL innodb_flush_method = 'O_DIRECT';
SET GLOBAL innodb_max_dirty_pages_pct = 75;   -- 기본
```

`O_DIRECT` — OS 페이지 캐시 우회. InnoDB가 자체 Buffer Pool 갖고 있어 **이중 캐싱 회피**. Linux + NVMe 표준.

`innodb_max_dirty_pages_pct` — Buffer Pool 중 더티 비율 상한. 초과 시 강제 flush. 일관 쓰기 부하면 75 적정, 쓰기 폭증 환경은 60~70.

## 5. file_per_table, 테이블 압축

```sql
SET GLOBAL innodb_file_per_table = ON;        -- 8.0 기본 ON
```

각 테이블이 별도 `.ibd` 파일 — 테이블 DROP 시 디스크 회수, 백업 단위 분리, 압축 가능. 끄면 system tablespace 한 파일에 누적되어 회수 어려움.

### 압축 — `ROW_FORMAT=COMPRESSED`

```sql
CREATE TABLE compressed_logs (
  id BIGINT PRIMARY KEY,
  data TEXT
) ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```

디스크 50~70% 절감. 단점: CPU 비용, Buffer Pool 효율 ↓ (압축 + 비압축 페이지 둘 다 가질 수 있음). **콜드 데이터, 로그 테이블에 적합**, 핫 OLTP에는 부적합.

## 6. 모니터링

```sql
-- Buffer Pool 통계
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';

-- 더티 페이지, 체크포인트
SHOW ENGINE INNODB STATUS\G

-- 히스토그램(8.0+)
SELECT * FROM performance_schema.events_waits_summary_global_by_event_name
WHERE event_name LIKE 'wait/io/file/innodb%';
```

핵심 신호:
- `Innodb_buffer_pool_pages_dirty / total` ↑ → I/O capacity 부족
- `Innodb_log_waits` > 0 → log_buffer 부족
- `Innodb_buffer_pool_wait_free` > 0 → Buffer Pool 부족 또는 flush 부족

## 흔한 실수

- **Buffer Pool을 메모리의 95%로 설정** → OS, 연결, tmp 메모리 부족 → swap 발생 → 성능 폭락. 70~80% 상한.
- **`flush_log_at_trx_commit = 2`로 두고 결제 운영** → OS 크래시 시 1초 손실. 도메인별 분리 또는 1로.
- **log_file_size 너무 작게(48MB 기본)** → 빈번한 체크포인트 I/O 스파이크.
- **NVMe인데 io_capacity = 200** → 디스크 능력 못 살림. 5000+로.
- **압축을 OLTP 테이블에 일괄 적용** → CPU 비용, Buffer Pool 효율 저하.
- **Buffer Pool 적중률 95%인 채로 두고 인덱스 튜닝만** → 워킹셋이 메모리 초과면 어떤 인덱스도 효과 한계. Buffer Pool 먼저 확인.
- **`innodb_buffer_pool_dump` 비활성** → 재시작 후 콜드 캐시로 응답 폭증.

## 면접 체크포인트

- Buffer Pool 크기 결정 — 메모리의 70~80%, OS 여유
- `flush_log_at_trx_commit` 0/1/2 차이와 도메인별 선택
- `log_file_size`의 트레이드오프 — 쓰기 부하 vs 회복 시간
- `io_capacity` — 디스크 종류별 권장값
- Buffer Pool 적중률 99% 목표, 관찰 방법
- 적중률 99%인데 느리다면? — 워킹셋, 인덱스, 쿼리 패턴 확인
- `O_DIRECT`로 이중 캐싱 회피
- 압축의 트레이드오프 — 디스크 ↓, CPU, Buffer Pool 효율 ↓
- Buffer Pool dump/load로 warmup

## 관련 문서

- [[MySQL-Architecture|MySQL 아키텍처, SQL 처리 파이프라인]]
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]]
- [[MySQL-Partitioning|MySQL Partitioning]]
- [[Transactions|ACID, MVCC]]
- [[Isolation-Level|격리 수준]]
