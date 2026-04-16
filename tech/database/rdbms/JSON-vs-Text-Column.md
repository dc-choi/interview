---
tags: [database, rdbms, mysql, json, text, column-type]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["JSON vs TEXT", "JSON vs Text 컬럼", "MySQL JSON vs TEXT"]
---

# JSON vs TEXT 컬럼

RDBMS에서 구조화된 데이터를 **하나의 컬럼에 담을 때**의 선택. MySQL·PostgreSQL 모두 JSON(또는 JSONB) 타입을 제공하지만, 단순 문자열(TEXT)로 저장하는 것과는 스토리지 형식·쿼리 능력·성능 특성이 다르다. 정답은 **접근 패턴에 따라 다르다**.

## 두 타입의 본질

| 축 | TEXT | JSON / JSONB |
|---|---|---|
| 저장 형식 | 원본 문자열 그대로 | 파싱된 **내부 표현**(MySQL: binary JSON, PG: JSONB) |
| 유효성 검사 | 없음(아무 문자열이나 가능) | 삽입 시 파싱 → 유효한 JSON만 허용 |
| 필드 접근 | 불가능, 전체를 앱에서 파싱 | `->`·`->>`·`JSON_EXTRACT` 등으로 필드 직접 접근 |
| 부분 업데이트 | 불가 — 전체 재저장 | `JSON_SET`·`jsonb_set`으로 필드만 수정 가능 |
| 인덱싱 | 전체 문자열만(FULLTEXT) | **가상 컬럼 + 인덱스**(MySQL), **GIN 인덱스**(PG JSONB) |
| 전체 조회 성능 | 빠름(파싱 없이 바이트 스트림 반환) | 느림 — 내부 표현 → JSON 문자열로 **직렬화** 필요 |
| 크기 | 원본 그대로 | 내부 표현이 약간 더 큼(필드 메타데이터 포함) |

## 핵심 트레이드오프

### JSON(B)의 강점

- **필드 레벨 연산** — 특정 키 검색·수정·인덱싱 가능
- **유효성 보장** — 잘못된 JSON이 들어갈 수 없음
- **부분 업데이트** — 큰 문서에서 한 필드만 바꿀 때 효율적
- **GIN 인덱스(PG)** — 중첩 구조 전체를 키·값 기반으로 검색 가능

### JSON의 약점

- **전체 조회가 느림** — 바이너리 내부 표현을 문자열로 직렬화해야 함. 100KB 문서에서 1ms 이상 차이가 누적되면 초당 수천 건에서 체감
- **직렬화 오버헤드** — API 응답에 통째로 내려줄 거면 TEXT가 단순 I/O
- **행 크기 증가** — 내부 메타데이터로 원본보다 살짝 큼

### TEXT의 강점

- **통째로 읽기가 가장 빠름** — 디스크에서 그대로 읽어 네트워크로
- **예측 가능** — 파싱·검증·인덱싱 없음 → 동작이 단순

### TEXT의 약점

- **필드 단위 쿼리 불가** — WHERE·인덱스에 쓸 수 없음
- **부분 수정 불가** — 한 필드만 바꿔도 전체 재저장
- **형식 보장 없음** — 잘못된 JSON·깨진 인코딩 가능

## 선택 가이드

**JSON을 선택할 때**
- WHERE 절·JOIN·인덱스에 **필드가 들어가는** 경우
- **부분 업데이트**가 빈번 — 큰 문서의 작은 필드만 바꿀 때
- 앱이 아닌 **DB 안에서 구조 검증**이 필요
- PostgreSQL에서 JSONB + GIN으로 복잡한 검색
- 스키마 진화 과정 중에 있는 유연한 속성

**TEXT를 선택할 때**
- **항상 통째로** 저장·조회(로그·감사·스냅샷)
- 스키마가 안정되어 DB 내부 구조화 이점이 없음
- 초당 수천~수만 건의 read-heavy 워크로드 + 직렬화 비용이 병목
- 바이너리·반구조화 데이터(예: 외부 API 응답 원본 아카이브)

**다른 저장소 고려**
- 수십 KB 이상 대용량 문서 → **S3 + 메타만 DB** 또는 전용 문서 스토어(MongoDB·DynamoDB)
- 고빈도 부분 업데이트 + 풍부한 쿼리 → 전용 Document DB가 오히려 단순할 수 있음

## MySQL vs PostgreSQL 관점

| 축 | MySQL JSON | PostgreSQL JSONB |
|---|---|---|
| 저장 형식 | Binary JSON(BSON 유사) | 커스텀 바이너리(JSONB) |
| 인덱스 | 가상 컬럼(`STORED`/`VIRTUAL`) + 일반 인덱스 | GIN 인덱스(다키 검색) + B-Tree(특정 경로) |
| 특정 경로 조회 성능 | 가상 컬럼 필요 | JSONB path ops 네이티브 |
| 전체 조회 성능 | TEXT 대비 느림 | TEXT 대비 약간 느림(더 성숙) |

실무에서 "필드 검색 + 부분 업데이트"가 있으면 PostgreSQL JSONB의 이점이 크다. MySQL도 가능하지만 설계 복잡도 올라감.

## 실전 패턴

- **Hybrid**: 자주 쓰는 필드는 **정규 컬럼**, 가변·예측 불가 속성은 JSON 하나에 — 스키마 유연성 + 인덱스 둘 다
- **Snapshot + Live**: 감사용 원본은 TEXT로 불변, 조작용 현재 상태는 JSON
- **가상 컬럼 인덱스(MySQL)**: `ALTER TABLE t ADD c VARCHAR(50) AS (data->>'$.id') STORED, ADD INDEX idx_c(c)`
- **크기 한도 관리**: JSON 컬럼이 행 크기를 폭증시키면 `TEXT`·외부 저장소로 분리

## 흔한 실수

- **모든 데이터를 JSON 한 컬럼에 몰기** → 스키마가 사라지면서 인덱스·무결성·리포팅 모두 어려워짐
- **JSON으로 저장하고 앱에서 다시 파싱해서 비교** → JSON 타입의 이점을 버림. 쿼리로 처리
- **가상 컬럼 없이 JSON 필드 WHERE 절** → 풀 스캔 + 파싱 오버헤드
- **대용량 JSON(수백 KB+)을 DB에 보관** → 페이지 입출력 폭증. 외부 스토리지 + 메타만
- **JSON의 부분 업데이트 안 쓰고 전체 덮어쓰기** → TEXT와 차이 없음

## 면접 체크포인트

- JSON과 TEXT의 **저장 형식 차이**(파싱 vs 원본)가 성능에 미치는 영향
- 직렬화 비용이 어디서 발생하는가(전체 조회 시)
- 가상 컬럼 + 인덱스로 JSON 필드를 빠르게 조회하는 패턴
- PostgreSQL JSONB + GIN 인덱스의 유리한 시나리오
- Hybrid 설계(정규 컬럼 + JSON 컬럼)의 이점

## 출처
- [당근마켓 — MySQL JSON vs TEXT](https://medium.com/daangn/json-vs-text-c2c1448b8b1f)

## 관련 문서
- [[Schema-Design|Schema design]]
- [[Index|Index 기본]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Normalization|Normalization / Denormalization]]
