---
tags: [database, mysql, performance, troubleshooting, nodejs]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["Prepared Statement Cache", "Prepared Statement 캐시", "PS 캐시 폭발"]
---

# Prepared Statement 캐시 폭발

Prepared Statement는 반복되는 쿼리에서는 최적화 수단이지만, **매번 다른 쿼리 틀을 생성하면 오히려 메모리 누수의 원인**이 된다. Node.js + MySQL 실전 사례를 기준으로 함정과 대응법을 정리한다.

## Prepared Statement 정상 동작 원리

Prepared Statement는 쿼리 틀(템플릿)을 DB에 먼저 등록하고, 이후 파라미터만 바꿔가며 반복 실행하는 방식이다.

**동작 흐름:**
1. 클라이언트가 쿼리 틀 전송: `INSERT INTO USERS (name, email) VALUES (?, ?)`
2. DB가 파싱·분석·실행 계획 수립 후 **캐시에 저장**
3. 이후 실행 시 파라미터만 바인딩 (재파싱 불필요)
4. 같은 틀이 반복될수록 성능 이득

**이점:**
- 파싱·계획 수립 비용 절감
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

결과: **거의 모든 쿼리가 단 1회만 실행되고 캐시에 영원히 남음.**

### 메모리 폭발 계산

**MySQL 서버 측:**
- 커넥션당 최대 캐싱 수: **16,382개** prepared statement (MySQL 기본값)
- 커넥션 풀 크기 10 → 최대 **163,820개** 캐싱 가능
- 구문당 약 **32KB** → **약 5GB** 메모리 점유
- 4개 토픽 × 4개 프로세스 멀티 → **총 20GB** 규모의 메모리 압박

**Node.js 클라이언트 측:**
- `node-mysql2` 드라이버도 클라이언트에서 prepared statement를 LRU 캐싱
- 커넥션당 최대 16,000개 저장
- 서버와 클라이언트 양쪽에서 **이중으로** 메모리를 잠식

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

서버 측도 `max_prepared_stmt_count`를 조정하거나 `COM_STMT_CLOSE`를 명시적으로 호출해 해제한다.

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
| **이중 캐싱** | 서버·드라이버 양쪽에서 캐싱하므로 메모리 영향이 2배 |
| **동적 쿼리 주의** | 행 수·컬럼 조합이 가변이면 `query()` 또는 캐시 상한 제한 |
| **진단 순서** | 힙 스냅샷 → MySQL 상태 변수 → 드라이버 옵션 확인 |

## 면접 포인트

- "Prepared Statement의 트레이드오프는?" → **반복 쿼리 최적화에는 유리하지만, 매번 다른 쿼리 틀이면 캐시만 쌓여 메모리 누수 원인이 된다.**
- "MySQL 커넥션 풀에서 메모리가 급증하면?" → **prepared statement 캐시 폭발 가능성을 의심.** 서버의 `Prepared_stmt_count`, 드라이버 힙 스냅샷으로 진단한 뒤, 캐시 상한 조정 또는 `query()` 사용으로 대응.

## 관련 문서
- [[Execution-Plan|실행 계획]]
- [[SQL|SQL 기초]]
- [[OOM-Troubleshooting-Cases|Node.js OOM 발생 케이스]]
- [[Consumer-Group|Consumer Group]]
- [[MQ-Kafka|Kafka]]
