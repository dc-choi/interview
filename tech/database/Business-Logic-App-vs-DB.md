---
tags: [database, business-logic, architecture, scalability, sql]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["Business Logic App vs DB", "비즈니스 로직 위치", "DB 로직 vs 앱 로직"]
---

# 비즈니스 로직 · DB에 둘 것인가 앱에 둘 것인가

복잡한 조인·계산·조건 분기를 **SQL에 밀어 넣을 것인가, 애플리케이션 계층에서 처리할 것인가**. 과거에는 "DB 안에서 다 처리"가 미덕이었지만, 현대 분산 시스템에서는 **애플리케이션 계층으로 뺀다**는 쪽으로 기울었다. 이유는 단순하다 — **앱 서버는 수평 확장이 쉽지만 RDB는 어렵다**.

## 핵심 명제

- **앱 리소스 = 풍족 · DB 리소스 = 빈약** — 이 비대칭이 모든 선택의 배경
- 복잡 SQL·Stored Procedure는 **DB 부하 집중 + 확장 비용 상승**
- 애플리케이션으로 로직을 옮기면 **테스트·버전 관리·디버깅**이 쉬워진다
- 단, DB가 잘 할 수 있는 것(원자성·집계·참조 무결성)은 **DB에 맡긴다**

## 리소스 확장성 비대칭

### 앱 서버

- **수평 확장 쉬움** — 인스턴스 추가, 오토스케일링
- 상태 없으면 **N대로 무한 증설 가능**
- 실패 시 재시작·교체 단순
- 비용 탄력적

### RDB

- **수평 확장 어려움** — Master-Slave는 읽기만, 쓰기는 여전히 단일 Master
- 샤딩은 **샤드 키 설계의 영구 구속**
- 백업·복구·스키마 변경 비용 큼
- 버티컬 스케일(CPU·메모리 증설)은 한계 존재

→ 따라서 **"컴퓨팅 리소스는 풍족, DB 리소스는 빈약"** 이라는 보편적 진리. DB를 아껴 쓰는 설계가 장기 지속성 확보.

## 3가지 리팩토링 패턴

### 1. 필터링과 추출 분리

**나쁜 예**: 복잡한 WHERE 절이 한 쿼리에 몰려 인덱스 활용 어려움.

```sql
-- 복잡·비효율
SELECT * FROM orders
WHERE status = 'PAID'
  AND created_at BETWEEN ? AND ?
  AND user_id IN (SELECT user_id FROM users WHERE tier = 'VIP')
  AND amount > (SELECT AVG(amount) FROM orders WHERE user_id = orders.user_id)
```

**개선**: 필터용 ID만 뽑은 뒤 앱 레벨에서 추가 조건 적용.

```sql
-- 단순화: 필터 키만
SELECT id FROM orders WHERE status = 'PAID' AND created_at BETWEEN ? AND ?;
```

이후 앱에서:
- VIP 여부를 in-memory 캐시에서 판단
- 평균과의 비교는 컬렉션 연산으로

### 2. 반환 결과 계산 분리

**나쁜 예**: DB 안에서 수학 함수 연쇄.

```sql
SELECT POWER(SQRT(field1) * SIN(field2), 5) AS metric
FROM big_table
```

대형 테이블에서 DB CPU 급증.

**개선**: 원본 필드만 조회해 앱에서 계산.

```sql
SELECT field1, field2 FROM big_table WHERE ...
```

```python
for row in rows:
    row['metric'] = (math.sqrt(row['field1']) * math.sin(row['field2'])) ** 5
```

앱 서버는 수평 확장 가능 → 계산을 N대에 분산.

### 3. 복잡 조인 → 앱 조합

**나쁜 예**: 5~10개 테이블 JOIN 한 번의 SQL.

**개선**: 필요한 테이블을 각각 단순 쿼리로 가져와 앱에서 조합.

- 각 쿼리는 **인덱스 활용 쉽고 캐시 가능**
- 분산 저장소(샤딩)에서도 쿼리 쪼개기 자연스러움
- 특정 테이블만 다른 저장소(Elasticsearch·Redis)로 이동 가능

단점: 왕복 횟수 증가 → 지연 대신 **DataLoader·배치·병렬**로 완화.

## DB가 잘 하는 것은 여전히 DB에

모든 로직을 앱에 넣으면 안 됨. 다음은 DB가 절대적으로 우월.

- **원자성·트랜잭션** — ACID 보장, 레이스 조건 방지
- **참조 무결성** — FK·UNIQUE 제약
- **집계 쿼리** — COUNT·SUM·GROUP BY·Window 함수 (적절한 규모에서는)
- **인덱스 기반 탐색** — B-Tree·Hash 인덱스
- **락·동시성 제어** — Gap Lock·Next-Key Lock
- **단순 CRUD** — 앱으로 옮겨도 이득 거의 없음

### 판단 기준

- **작은 결과집합** 반환 + 인덱스로 커버되는 쿼리는 **DB에**
- **대량 데이터** 대상 연산·변환은 **앱에**
- **트랜잭션 경계 필요**한 원자적 조작은 **DB에**
- **복잡 분기·비즈니스 규칙**은 **앱에**

## Stored Procedure 기피

### 과거 왜 썼는가

- 네트워크 왕복 비용 절감
- DB 안에 배포되므로 배포 절차 단순
- 성능 이득이 있다고 믿음

### 왜 지양하게 됐는가

- **만든 사람도 수정 어렵다** — 길면 수백 줄, 디버깅 지옥
- **테스트 어려움** — 앱 테스트와 분리된 생태계
- **버전 관리 미비** — 별도 도구 없이는 SQL 스크립트가 Git 바깥
- **DB CPU 소모** — 서비스 확장 시 DB가 병목
- 현대 프레임워크의 ORM·리포지토리 패턴이 대부분 대체

**이동 권장**: 기존 SP로 개발된 로직 → 앱 서비스 레이어로 이관이 서비스 성장 과정의 흔한 작업.

## 캐싱과 결합

앱 레벨로 로직이 이동하면 **캐싱 전략**이 자연스러워진다.

- 계산 결과를 Redis에 TTL로 저장
- 읽기 트래픽을 DB에서 캐시로 오프로드
- **쓰기**는 여전히 DB, 읽기는 캐시 중심
- 자세한 내용: [[Cache-Strategies|Cache 전략]]

## 마이크로서비스와의 관계

- 로직이 앱에 있으면 **마이크로서비스로 분할 쉬움**
- SP·복잡 SQL이 많으면 **공유 DB 접근이 분할의 장벽**
- **DB-per-Service** 원칙을 위해서도 앱 로직이 유리

## 실전 예시

### E-커머스 할인 계산

- **DB 로직**: SQL에서 `CASE WHEN user_tier='VIP' THEN price*0.8 ELSE ...`로 분기
- **앱 로직**: 사용자·제품·주문 데이터를 앱에서 조합, 도메인 서비스에서 할인 규칙 적용
- 후자가 **비즈니스 규칙 변경·테스트·다국가화**에 훨씬 유리

### 대시보드 집계

- **DB 로직**: 복잡한 JOIN + GROUP BY + Window 함수
- **앱 로직**: 일차 조회 후 앱에서 집계, 또는 Materialized View·OLAP로 분리
- 자주 보는 대시보드는 **미리 계산해 저장**하는 패턴(Read Model)

## 흔한 실수

- **모든 로직을 앱에** — 트랜잭션이 깨짐. ACID 필요한 곳은 DB로
- **SP 고수** — 팀 변경·기술 교체 시 족쇄
- **ORM에 과도 의존** — N+1 쿼리 폭발. 필요한 곳은 **네이티브 SQL**로
- **앱 조합 쿼리의 왕복 지연 무시** — DataLoader·배치 없이 N번 호출
- **"앱 서버는 무한 확장"이라 가정** — 실제론 스레드풀·GC·네트워크 한계
- **캐시 없이 앱 계산 반복** — 동일 결과 매번 계산 = 비효율

## 면접 체크포인트

- "앱 vs DB 로직 위치"의 판단 기준 3가지 이상
- Stored Procedure를 기피하는 이유 3가지 이상
- 복잡 JOIN을 앱 조합으로 바꿀 때의 **지연 vs 이득** 트레이드오프
- DB가 잘 하는 영역 3가지(원자성·집계·인덱스 탐색)
- 마이크로서비스 전환에서 DB 로직이 왜 장벽인가
- ORM + 네이티브 SQL의 균형을 어떻게 잡는가

## 출처
- [ITWorld — 비즈니스 로직을 DB가 아닌 앱에 넣어야 하는 이유](https://www.itworld.co.kr/article/3566061/)

## 관련 문서
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Sharding|Sharding]]
- [[Cache-Strategies|Cache 전략]]
- [[ORM|ORM]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Index|Index 기본]]
