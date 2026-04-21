---
tags: [database, rdbms, mysql, architecture]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL Architecture", "MySQL 엔진 구조"]
---

# MySQL 아키텍처 · SQL 처리 파이프라인

MySQL은 **두 계층**으로 나뉜다: 위쪽 **MySQL 엔진**(SQL 파싱·옵티마이저·결과 가공)과 아래쪽 **스토리지 엔진**(실제 디스크/메모리에서 데이터 읽고 쓰기). 이 분리 덕에 같은 SQL 인터페이스 아래 InnoDB·MyISAM·Memory·NDB 같은 다양한 저장 방식을 갈아끼울 수 있다.

## 2계층 구조

```
[MySQL 엔진 (Server Layer)]
  - 파서 → 전처리기 → 옵티마이저 → 엔진 실행기
  - 결과 정렬·조인·필터링 등 후처리
       ↓ Storage Engine API
[스토리지 엔진 (Storage Layer)]
  - InnoDB / MyISAM / Memory / NDB / ...
  - 실제 디스크·메모리에서 데이터 읽기·쓰기
```

핵심 분리:
- **MySQL 엔진**은 SQL 문법·옵티마이저·결과 후처리를 담당. 엔진 종류와 무관
- **스토리지 엔진**은 데이터를 실제로 어떻게 저장·읽을지 담당
- 둘 사이는 **Storage Engine API**(handler interface)로 통신

이 구조 때문에 같은 SQL이라도 어떤 스토리지 엔진을 쓰는지에 따라 트랜잭션·락·인덱스 동작이 달라진다.

## SQL 처리 파이프라인

요청이 들어오면 MySQL 엔진은 다음 4단계로 SQL을 처리.

### 1. 파서 (Parser)
SQL 문자열을 **토큰 단위로 분해**해 트리 구조(AST)로 만들고 **문법 검사**. 이 단계에서 SQL 문법 오류가 나면 다음 단계로 넘어가지 않음.

### 2. 전처리기 (Preprocessor)
파서 트리를 받아 **의미 검증** 수행:
- 참조한 테이블·컬럼·뷰·함수가 **실제로 존재**하는가
- 사용자가 그 객체에 **접근 권한**이 있는가
- ALL/JOIN/뷰 같은 구조의 의미적 일관성

문법이 맞아도 존재하지 않는 컬럼을 참조하면 여기서 잡힘.

### 3. 옵티마이저 (Optimizer)
가장 핵심적인 단계. 같은 SQL이라도 **어떻게 실행하느냐**가 성능을 결정.

- 불필요한 조건 제거 (`WHERE 1=1` 같은 trivially true 조건 정리)
- 연산 단순화 (상수 폴딩 등)
- 어떤 **테이블 접근 순서**가 최적인가 (조인 순서)
- 어떤 **인덱스**를 쓸 것인가
- 정렬·집계 시 **임시 테이블** 필요한가

비용 기반(Cost-Based Optimizer): 실행 후보가 많을 땐 **모든 경우를 다 비교하지 않고**, 휴리스틱으로 후보를 좁힌 뒤 그중에서 비용이 낮은 것을 선택. **항상 최적은 아닐 수 있으며**, 통계가 부정확하거나 데이터 분포가 편향되면 잘못 고를 수 있음 → 그래서 힌트가 필요.

### 4. 엔진 실행기 (Executor)
옵티마이저가 만든 실행 계획대로 **스토리지 엔진을 호출**해 데이터를 가져온 뒤, MySQL 엔진 단에서:
- 정렬 (filesort)
- 조인 (NL/BNL/BKA/Hash)
- 임시 테이블 작업 (GROUP BY, DISTINCT)
- 필터링 (필터 조건 적용)
- 함수 평가, 결과 포맷팅

핵심 튜닝 원칙: **MySQL 엔진의 부하를 최소화하려면 스토리지 엔진에서 가져오는 데이터를 최대한 줄여야 한다**. WHERE 조건이 액세스 조건으로 잡혀 인덱스에서 처리되면 스토리지 엔진이 적은 데이터만 반환 → 엔진 실행기 부하도 작음. 필터 조건 비중이 크면 그 반대.

## 스토리지 엔진 종류

| 엔진 | 트랜잭션 | 락 | 외래키 | 적합 워크로드 |
|---|---|---|---|---|
| **InnoDB** | ✅ ACID | row-level | ✅ | OLTP (기본) |
| **MyISAM** | ✗ | table-level | ✗ | 대량 INSERT, 분석성 (구식) |
| **Memory** | ✗ | table-level | ✗ | 휘발성 캐시·임시 테이블 |
| **NDB** | ✅ | row-level | ✅ | 분산·MySQL Cluster |
| **Archive** | ✗ | row-level | ✗ | append-only 로그 |
| **CSV** | ✗ | - | ✗ | 외부 CSV 파일 인터페이스 |

### InnoDB (기본·표준)
- ACID 트랜잭션, MVCC, row-level lock
- 클러스터드 인덱스 (PK 순으로 정렬 저장)
- 외래키 지원
- **OLTP의 사실상 표준**. MySQL 5.5부터 기본 엔진

### MyISAM (레거시)
- 트랜잭션·MVCC·외래키 모두 미지원
- table-level lock → 동시 쓰기 어려움
- 한때 빠른 SELECT 때문에 사용되었으나 **현대 InnoDB가 동등 이상의 성능** + 트랜잭션 안전성을 제공해 사실상 deprecated
- 마이그레이션 권장

### Memory (HEAP)
- 데이터를 **메모리에만** 저장 (서버 재시작 시 데이터 소실)
- 매우 빠른 SELECT/INSERT
- 임시 결과·세션 캐시·룩업 테이블에 가끔 사용
- BLOB/TEXT 컬럼 미지원, hash 인덱스 기본

스토리지 엔진은 **테이블별로 다르게 지정** 가능 (`CREATE TABLE ... ENGINE=InnoDB`).

## DB 오브젝트

### 인덱스
키 기준으로 정렬된 오브젝트로 데이터 접근 속도를 높임. 자세한 내용은 [[Index|Index 문서]]·[[Covering-Index|커버링 인덱스]] 참고.

### 뷰 (View)
**가상 테이블**. 저장 공간을 차지하지 않고, 정의된 쿼리의 결과를 테이블처럼 사용.

```sql
CREATE VIEW active_users AS
  SELECT id, email, created_at
    FROM users
   WHERE deleted_at IS NULL;

SELECT * FROM active_users WHERE email LIKE '%@example.com';
```

용도:
- **보안** — 민감 컬럼 숨기고 공개 가능한 컬럼만 노출
- **추상화** — 복잡한 JOIN·집계를 단일 이름으로 캡슐화
- **권한 분리** — 테이블 접근권한 없는 사용자에게 뷰 권한만 부여
- **인터페이스 안정성** — 테이블 스키마가 바뀌어도 뷰 정의만 갱신하면 클라이언트 코드 보호

특징:
- **원본 테이블이 변하면 뷰 결과도 변함** (실시간 반영)
- 단순 뷰는 INSERT·UPDATE·DELETE 가능 (조건부)
- 복잡한 JOIN·집계 뷰는 보통 **읽기 전용**

한계:
- **성능** — 뷰는 매번 정의된 쿼리를 실행. 같은 데이터를 자주 조회하면 비효율
- **인덱스 제약** — 뷰 자체에 인덱스를 만들 수 없음 (대안: **Materialized View**)
- **MySQL은 Materialized View 미지원** — PostgreSQL은 지원 (`CREATE MATERIALIZED VIEW`)

성능을 위해 결과를 캐시하려면 PostgreSQL의 Materialized View를 쓰거나, MySQL이라면 **요약 테이블 + 트리거/배치 갱신** 패턴.

## 면접 체크포인트

- MySQL 엔진과 스토리지 엔진을 분리한 설계의 이점
- SQL 처리 4단계 (파서 → 전처리기 → 옵티마이저 → 실행기)의 역할 구분
- 옵티마이저가 항상 최적 계획을 못 고르는 이유 (통계 부정확·데이터 분포·휴리스틱 한계)
- InnoDB와 MyISAM의 차이가 운영에 미치는 영향 (트랜잭션·락·외래키)
- 뷰의 용도와 한계 (실시간 반영·인덱스 불가·성능)
- Materialized View가 MySQL에 없을 때 대안

## 출처
- [yoonseon — 물리 엔진과 오브젝트 용어](https://yoonseon.tistory.com/142)

## 관련 문서
- [[Execution-Plan|Execution Plan · EXPLAIN]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어]]
- [[SQL-Joins|SQL 조인]]
- [[Index|Index]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
