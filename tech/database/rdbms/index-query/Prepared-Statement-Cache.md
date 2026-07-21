---
tags: [database, mysql, performance, troubleshooting, nodejs]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["Prepared Statement Cache", "Prepared Statement 캐시", "PS 캐시 폭발"]
verified_at: 2026-07-21
---

# Prepared Statement 캐시 폭발

Prepared Statement는 반복되는 쿼리에서는 최적화 수단이지만, **매번 다른 쿼리 틀을 생성하면 서버의 열린 statement 수와 클라이언트 캐시가 불필요하게 커질 수 있다**. Node.js + MySQL 사례를 기준으로 함정과 대응법을 정리한다. 이를 곧바로 누수라고 단정하지 않고 연결 종료, 명시적 close, LRU eviction 여부를 함께 본다.

## Prepared Statement 정상 동작 원리

Prepared Statement는 쿼리 틀(템플릿)을 DB에 먼저 등록하고, 이후 파라미터만 바꿔가며 반복 실행하는 방식이다.

**동작 흐름:**
1. 클라이언트가 쿼리 틀 전송: `INSERT INTO USERS (name, email) VALUES (?, ?)`
2. DB가 해당 세션에 server-side prepared statement를 생성
3. 이후 실행 시 파라미터만 바인딩 (재파싱 불필요)
4. 같은 틀이 반복될수록 성능 이득

**이점:**
- 파싱, 계획 수립 비용 절감
- SQL 인젝션 방어 (파라미터 바인딩)
- 네트워크 페이로드 감소

## 언제 함정이 되는가

Prepared Statement는 **"같은 쿼리 틀이 반복될 것"** 이라는 전제 위에서 최적화된다. 이 전제가 깨지면 캐시만 쌓이고 재사용은 일어나지 않는다.

### 실전 사례: 동적 벌크 INSERT

Kafka에서 메시지를 읽어 MySQL에 벌크 INSERT하는 Node.js 서비스에서 발생한 OOM 사례:

```typescript
// BAD: 매 배치마다 쿼리 틀이 달라짐
async bulkInsert(table: string, rows: BulkInsertItem[]): Promise<void> {
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const query = this.createInsertQuery(table, columns, rows);
    const params = rows.flatMap(row => columns.map(col => row[col]));
    await this.pool.execute(query, params);  // prepared statement 자동 생성
}
```

**문제점:**
- 매 배치마다 **행 개수**가 다름 → `VALUES (?, ?, ?), (?, ?, ?), ...` 반복 횟수 변동
- 매 배치마다 **컬럼 조합**이 다름 → `(col1, col2, col3)` vs `(col1, col2, col4)`
- 테이블 이름도 다양 → `INSERT INTO table1` vs `INSERT INTO table2`

결과: 거의 모든 쿼리가 한 번만 실행되는데도 연결이 유지되는 동안 server-side statement와 mysql2의 커넥션별 LRU 항목이 늘어난다. 명시적 close, 연결 종료, LRU eviction이 일어나면 해제된다.

### 서버 전역 상한과 커넥션별 캐시를 분리한다

**MySQL 서버 측:**
- `max_prepared_stmt_count`는 커넥션별 수가 아니라 **서버 전체에서 동시에 열린 prepared statement 상한**이다.
- 커넥션 풀 크기를 이 전역 상한에 곱하면 안 된다.
- statement 하나의 메모리 크기는 SQL과 메타데이터, 서버 버전에 따라 달라져 보편적인 32KB 상수로 계산할 수 없다.
- `Prepared_stmt_count` 증가와 서버 메모리를 함께 관측해 실제 영향을 판단한다.

**Node.js 클라이언트 측:**
- mysql2의 `execute()`는 **커넥션별** LRU에 prepared statement를 저장하며 기본 최대치는 16,000개다.
- eviction 시 mysql2가 statement를 close한다. 따라서 서버 전역 cap과 클라이언트의 커넥션별 캐시 크기를 각각 관측하고 조정한다.

## 진단 방법

### 1. 힙 스냅샷 분석
```bash
node --inspect app.js
# chrome://inspect → 힙 스냅샷(Take heap snapshot)
```
스냅샷에서 retained size가 큰 객체를 확인. `PreparedStatementInfo` 류의 객체가 수만 개 이상이면 이 함정에 빠진 것이다.

### 2. MySQL 서버 확인
```sql
SHOW GLOBAL STATUS LIKE 'Prepared_stmt_count';
SHOW GLOBAL VARIABLES LIKE 'max_prepared_stmt_count';
```
`Prepared_stmt_count`가 빠르게 증가하고 있다면 캐시 재사용이 안 되고 있다는 증거.

### 3. 프로파일링 도구
- **ClinicJS doctor**: `clinic doctor -- node app.js`로 메모리 추이 시각화
- **flamegraph**: `clinic flame -- node app.js`로 핫 패스 확인

## 해결책

### A. 캐시 크기 제한 (빠른 처방)
`node-mysql2`의 `maxPreparedStatements` 옵션으로 클라이언트 캐시 상한을 낮춘다. LRU 특성상 자주 안 쓰이는 구문이 즉시 밀려나므로 메모리가 안정된다.

```typescript
mysql.createPool({
    host: '...',
    connectionLimit: 10,
    maxPreparedStatements: 1,  // 또는 낮은 수치
});
```

서버의 `max_prepared_stmt_count`는 전체 안전 상한으로 관리하고, 사용이 끝난 statement는 드라이버의 `unprepare()`나 프로토콜 close로 해제한다. 전역 상한을 낮추는 것만으로 쿼리 모양 폭증의 원인이 해결되지는 않는다.

### B. Prepared Statement 자체를 쓰지 않기 (근본 처방)
일회성 쿼리 패턴이 명확하다면 `execute()` 대신 `query()`를 사용한다. `query()`는 prepared statement를 사용하지 않고 일반 텍스트 프로토콜로 전송된다.

```typescript
// execute() → prepared statement 생성 (캐시 대상)
await pool.execute(query, params);

// query() → 일반 쿼리 (캐시 없음)
await pool.query(query, params);
```

**주의:** `query()`는 파라미터 바인딩 방식이 다르므로 SQL 인젝션 방어는 드라이버의 이스케이핑에 의존한다. 입력값 검증이 필수.

### C. 쿼리 틀 정규화
벌크 INSERT 시 **행 수와 컬럼 집합을 고정**하여 쿼리 틀이 재사용되도록 만든다.
- 배치 크기를 고정 (예: 항상 100행)
- 컬럼 집합을 테이블별로 미리 정의
- 부족한 값은 NULL로 패딩

이렇게 하면 같은 쿼리 틀이 반복 사용되어 prepared statement 캐시가 본래 의도대로 동작한다.

## 핵심 교훈

| 항목 | 요약 |
|---|---|
| **트레이드오프** | Prepared Statement는 반복 쿼리에서만 효과적, 일회성 쿼리에는 오버헤드 |
| **서로 다른 범위** | MySQL 서버 상한은 전역, mysql2 LRU는 커넥션별이므로 따로 계산하고 관측 |
| **동적 쿼리 주의** | 행 수, 컬럼 조합이 가변이면 `query()` 또는 캐시 상한 제한 |
| **진단 순서** | 힙 스냅샷 → MySQL 상태 변수 → 드라이버 옵션 확인 |

## 면접 포인트

- "Prepared Statement의 트레이드오프는?" → **반복 쿼리에는 유리하지만, 매번 다른 쿼리 틀이면 열린 statement와 클라이언트 캐시가 불필요하게 증가할 수 있다.**
- "MySQL 커넥션 풀에서 메모리가 급증하면?" → **prepared statement 캐시 폭발 가능성을 의심.** 서버의 `Prepared_stmt_count`, 드라이버 힙 스냅샷으로 진단한 뒤, 캐시 상한 조정 또는 `query()` 사용으로 대응.

## 관련 문서
- [[Execution-Plan|실행 계획]]
- [[SQL|SQL 기초]]
- [[OOM-Troubleshooting-Cases|Node.js OOM 발생 케이스]]
- [[Consumer-Group|Consumer Group]]
- [[MQ-Kafka|Kafka]]

## 출처

- [MySQL 8.4 — `max_prepared_stmt_count`](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_max_prepared_stmt_count)
- [mysql2 — Prepared Statements](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements)
