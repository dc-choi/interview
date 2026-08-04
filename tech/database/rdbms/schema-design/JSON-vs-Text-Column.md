---
tags: [database, rdbms, mysql, postgresql, json, jsonb, text, column-type]
status: done
verified_at: 2026-08-04
category: "데이터&저장소(Data&Storage)"
aliases: ["JSON vs TEXT", "JSON vs Text 컬럼", "MySQL JSON vs TEXT"]
---

# JSON vs TEXT 컬럼

RDBMS에서 구조화된 데이터를 **하나의 컬럼에 담을 때**의 선택. MySQL, PostgreSQL 모두 JSON(또는 JSONB) 타입을 제공하지만, 단순 문자열(TEXT)로 저장하는 것과는 스토리지 형식, 쿼리 능력, 성능 특성이 다르다. 정답은 **접근 패턴에 따라 다르다**.

## 두 타입의 본질

| 축 | TEXT | MySQL JSON / PostgreSQL JSONB |
|---|---|---|
| 저장 형식 | 원본 문자열 그대로 | 파싱된 **내부 표현**(MySQL: binary JSON, PG: JSONB) |
| 유효성 검사 | 없음(아무 문자열이나 가능) | 삽입 시 파싱 → 유효한 JSON만 허용 |
| 필드 접근 | native JSON 연산자 없음, cast 또는 별도 파싱 필요 | `->`, `->>`, `JSON_EXTRACT` 등으로 필드 직접 접근 |
| 부분 업데이트 API | 불가 — 전체 값을 앱에서 구성 | `JSON_SET`, `jsonb_set`으로 경로 단위 변경 표현 가능 |
| 인덱싱 | 문자열 인덱스는 가능하지만 JSON key 의미를 모름 | **생성 컬럼 또는 표현식 인덱스**(MySQL), **GIN/표현식 인덱스**(PG JSONB) |
| 전체 조회 비용 | 원본 텍스트를 그대로 반환 가능 | 출력 표현으로 변환하는 비용이 있어 실제 payload로 측정 필요 |
| 크기 | 원본과 압축 방식에 좌우 | 내부 메타데이터, 값 분포와 DB 압축 방식에 좌우 |

PostgreSQL의 `json`은 원문 텍스트를 보존하며 처리할 때 다시 파싱한다. `jsonb`는 분해된 binary 표현을 저장해 입력 변환 비용이 있지만 처리와 인덱싱에 유리하고, 공백, 객체 키 순서와 중복 키를 원문 그대로 보존하지 않는다.

## 핵심 트레이드오프

### JSON(B)의 강점

- **필드 레벨 연산** — 특정 키 검색, 수정, 인덱싱 가능
- **유효성 보장** — 잘못된 JSON이 들어갈 수 없음
- **경로 단위 갱신 문법** — 애플리케이션에서 전체 문서를 다시 조립하지 않고 의도를 표현
- **GIN 인덱스(PG)** — 중첩 구조 전체를 키, 값 기반으로 검색 가능

### JSON의 약점

- **직렬화 비용** — API 응답에 통째로 내릴 때는 내부 표현을 출력 형식으로 바꾸는 비용이 생김
- **행 단위 동시성** — PostgreSQL에서 JSON 문서 일부를 논리적으로 바꿔도 해당 행 전체에 row lock이 걸리므로 큰 문서는 경합을 키울 수 있음
- **쓰기 비용** — 경로 단위 함수가 물리적인 부분 쓰기를 보장한다고 가정하지 말고 WAL, TOAST와 실제 쓰기량을 측정해야 함

### MySQL의 물리적 partial update 경계

MySQL은 InnoDB JSON column을 `JSON_SET`, `JSON_REPLACE`, `JSON_REMOVE`로 갱신할 때 조건을 만족하면 기존 binary JSON을 제자리에서 일부만 바꿀 수 있다.

- 입력과 대상이 같은 JSON column이어야 한다.
- 기존 값을 교체하거나 제거해야 하며 새 object member나 array element 추가는 대상이 아니다.
- 교체 값이 기존 공간보다 크지 않아야 한다. 이전 partial update로 생긴 여유 공간은 재사용할 수 있다.

이 조건은 application에서 경로 단위 의도를 표현하는 것과 storage write가 줄어드는 것을 구분하게 해 준다. Binary log에 compact한 partial JSON만 기록하는 기능은 별도이며 row-based logging에서 `binlog_row_value_options=PARTIAL_JSON` 설정을 검토한다. 실제 redo, binlog와 replica 영향을 측정한다.

### TEXT의 강점

- **통째로 읽는 경로가 단순함** — 구조 연산이 없다면 불필요한 파싱과 인덱스 유지가 없음
- **예측 가능** — JSON 파싱, 구조 검증과 JSON 인덱스 유지가 없어 동작이 단순

### TEXT의 약점

- **native 필드 단위 쿼리 없음** — cast나 문자열 처리는 가능하지만 JSON 구조에 맞춘 연산과 인덱스 설계가 어려움
- **부분 수정 불가** — 한 필드만 바꿔도 전체 재저장
- **형식 보장 없음** — 잘못된 JSON, 깨진 인코딩 가능

## 선택 가이드

**JSON을 선택할 때**
- WHERE 절, JOIN, 인덱스에 **필드가 들어가는** 경우
- DB 안에서 **경로 단위 갱신**을 표현해야 하는 경우
- 앱이 아닌 **DB 안에서 구조 검증**이 필요
- PostgreSQL에서 JSONB + GIN으로 복잡한 검색
- 스키마 진화 과정 중에 있는 유연한 속성

**TEXT를 선택할 때**
- **항상 통째로** 저장, 조회(로그, 감사, 스냅샷)
- 스키마가 안정되어 DB 내부 구조화 이점이 없음
- 통째로 읽는 워크로드에서 측정상 구조 변환 비용이 병목인 경우
- 바이너리, 반구조화 데이터(예: 외부 API 응답 원본 아카이브)

**다른 저장소 고려**
- 문서가 커져 행 읽기, 백업, 복제와 갱신 비용이 병목 → **Object Storage + 메타만 DB** 또는 전용 문서 스토어 검토
- 고빈도 부분 업데이트 + 풍부한 쿼리 → 전용 Document DB가 오히려 단순할 수 있음

## MySQL vs PostgreSQL 관점

| 축 | MySQL JSON | PostgreSQL JSONB |
|---|---|---|
| 저장 형식 | Binary JSON | 커스텀 바이너리(JSONB) |
| 인덱스 | 생성 컬럼 + 일반 인덱스, 표현식 인덱스, 배열용 multi-valued index | GIN 인덱스(다키 검색) + B-Tree(특정 경로) |
| 특정 경로 조회 | 생성 컬럼 또는 표현식 인덱스 검토 | 표현식 B-tree/GIN 또는 containment용 GIN 검토 |
| 전체 조회 | payload와 직렬화 경로로 측정 | payload와 직렬화 경로로 측정 |

특정 제품이 항상 우세한 것은 아니다. 필요한 연산자, 인덱스 표현식, 배열 검색, 쓰기 증폭과 운영 도구를 대상 버전에서 검증한다.

## 실전 패턴

- **Hybrid**: 자주 쓰는 필드는 **정규 컬럼**, 가변, 예측 불가 속성은 JSON 하나에 — 스키마 유연성 + 인덱스 둘 다
- **Snapshot + Live**: 감사용 원본은 TEXT로 불변, 조작용 현재 상태는 JSON
- **가상 컬럼 인덱스(MySQL)**: `ALTER TABLE t ADD c VARCHAR(50) AS (data->>'$.id') STORED, ADD INDEX idx_c(c)`
- **표현식 인덱스(PostgreSQL)**: 자주 조회하는 경로만 `CREATE INDEX ON t ((data->>'customer_id'))`
- **크기 한도 관리**: 큰 문서 때문에 페이지 입출력, 복제 또는 백업 비용이 커지면 정규 테이블이나 외부 저장소로 분리

## PostgreSQL JSONB 인덱스 선택

`->`와 `#>`는 JSON 값을, `->>`와 `#>>`는 text 값을 반환한다. 경로가 없거나 구조가 맞지 않으면 extraction 연산자는 오류 대신 SQL `NULL`을 반환한다. containment `@>`와 key 존재 `?`는 JSONB 구조를 조건으로 표현한다.

```sql
-- 다양한 key 존재와 containment 질의
CREATE INDEX events_payload_gin ON events USING gin (payload);

-- containment와 jsonpath 중심, 더 제한적인 operator 지원
CREATE INDEX events_payload_path_gin
ON events USING gin (payload jsonb_path_ops);

SELECT *
FROM events
WHERE payload @> '{"type":"payment"}';
```

- 기본 `jsonb_ops`는 `?`, `?|`, `?&`, `@>`, `@?`, `@@`를 지원한다.
- `jsonb_path_ops`는 key 존재 연산자를 지원하지 않지만 `@>`, `@?`, `@@` 중심 워크로드에서 보통 더 작고 구체적인 검색을 제공한다.
- `payload->'tags' ? 'vip'`처럼 연산자가 indexed column에 직접 적용되지 않으면 전체 GIN을 그대로 쓰지 못할 수 있다. 해당 표현식에 GIN을 만들거나 containment 형태로 바꿀 수 있는지 검토한다.
- 모든 key를 담는 범용 GIN과 자주 쓰는 경로만 담는 expression index는 유연성, 크기와 쓰기 비용의 교환이다.

## 흔한 실수

- **모든 데이터를 JSON 한 컬럼에 몰기** → 스키마가 사라지면서 인덱스, 무결성, 리포팅 모두 어려워짐
- **JSON으로 저장하고 앱에서 다시 파싱해서 비교** → JSON 타입의 이점을 버림. 쿼리로 처리
- **인덱스 표현식과 맞지 않는 JSON path predicate** → 조건을 계산한 뒤 많은 행을 필터링할 수 있음
- **문서 크기와 접근 패턴을 측정하지 않음** → 큰 행이 페이지 입출력, 복제, 백업과 갱신 비용을 키울 수 있음
- **경로 단위 함수면 물리적으로 일부 바이트만 쓴다고 가정** → MVCC 행 갱신과 WAL 비용을 측정해야 함

## 면접 체크포인트

- JSON과 TEXT의 **저장 형식 차이**(파싱 vs 원본)가 성능에 미치는 영향
- 직렬화 비용이 어디서 발생하는가(전체 조회 시)
- 가상 컬럼 + 인덱스로 JSON 필드를 빠르게 조회하는 패턴
- PostgreSQL JSONB + GIN 인덱스의 유리한 시나리오
- Hybrid 설계(정규 컬럼 + JSON 컬럼)의 이점

## 출처
- [MySQL 8.4 Reference Manual, JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html)
- [MySQL 8.4 Reference Manual, Multi-Valued Indexes](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-multi-valued)
- [MySQL 8.4 Reference Manual, Binary Logging Options](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html)
- [PostgreSQL 18 Documentation, JSON Types and JSONB Indexing](https://www.postgresql.org/docs/18/datatype-json.html)
- [PostgreSQL 18 Documentation, JSON Functions and Operators](https://www.postgresql.org/docs/18/functions-json.html)
- [인프런, EAV의 한계와 JSON의 필요성](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402018)
- [인프런, JSON 문법](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402019)
- [인프런, MySQL에서 JSON 사용하기 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402020)
- [인프런, MySQL에서 JSON 사용하기 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402021)
- [인프런, JSON 실무 사례 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402022)
- [인프런, JSON 실무 사례 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402023)
- [인프런, JSON 인덱스와 성능 최적화 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402024)
- [인프런, JSON 인덱스와 성능 최적화 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402025)
- [인프런, JSON 설계의 장단점과 한계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402026)
- [인프런, JSON 사용 가이드라인](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402027)
- [인프런, 관계형 데이터베이스 vs NoSQL](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402028)
- [인프런, JSON 설계 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402029)
- [PostgreSQL JSONB와 역인덱싱 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439099)
- [당근마켓 — MySQL JSON vs TEXT](https://medium.com/daangn/json-vs-text-c2c1448b8b1f)
- [인프런, Real MySQL 시즌 1 - Part 2, JSON 타입 활용](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226581)

## 관련 문서
- [[Schema-Design|Schema design]]
- [[Index|Index 기본]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Normalization|Normalization / Denormalization]]
