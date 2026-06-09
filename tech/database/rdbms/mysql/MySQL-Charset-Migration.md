---
tags: [database, rdbms, mysql, charset, utf8mb4, migration, ddl]
status: done
category: "Data & Storage - RDB"
aliases: ["utf8mb4 마이그레이션", "MySQL Charset Migration", "utf8mb3 to utf8mb4", "문자셋 변환"]
---

# utf8mb4 마이그레이션 — 운영 중 안전 절차

운영 중인 MySQL을 `utf8`(=3바이트 `utf8mb3`)에서 `utf8mb4`로 바꿀 때 "ALTER 한 방"이면 끝일 것 같지만, 실제로는 **테이블 락, 인덱스 키 길이 초과, collation 충돌** 셋 때문에 사고가 난다. 절차를 밟는 이유가 이 세 가지다.

## 왜 위험한가 (절차의 근거)

- **테이블 락**: `CONVERT TO CHARACTER SET`은 데이터를 다시 쓰므로 보통 테이블 복사(`ALGORITHM=COPY`)가 강제된다. 큰 테이블이면 그동안 쓰기가 막힌다. 락 없이 가는 법은 [[Schema-Migration-Large-Table]].
- **인덱스 키 길이 초과 (제일 흔한 실패)**: utf8mb3는 글자당 3바이트, utf8mb4는 4바이트. `VARCHAR(255)`에 인덱스가 걸려 있으면 utf8mb3에선 255×3=765바이트라 옛 767바이트 제한에 들어왔는데, utf8mb4로 바꾸면 255×4=1020바이트가 돼 인덱스 생성이 실패한다. **`VARCHAR(191)`이 마법의 숫자인 이유가 191×4=764**라서다.
- **collation 충돌**: collation을 바꾸면 비교 규칙이 바뀌어, 예전엔 다른 값이던 게 같은 값으로 취급되면 유니크 인덱스에서 중복 에러가 나며 ALTER가 깨진다.

**전제 — 데이터 자체는 안전하다.** utf8mb4는 utf8mb3의 상위 집합이라, 이미 제대로 저장된 글자는 재인코딩 없이 그대로 유지된다. (latin1에서 넘어오는 경우는 완전히 다르다. 맨 아래 별도.)

## 안전 절차

### 0. 스냅샷부터 (무조건)

RDS 스냅샷을 떠두고 시작한다. 최종 안전망이다.

### 1. 현황 감사

무엇을 바꿔야 하고 어디가 위험한지 먼저 본다.

```sql
-- (1) utf8mb4가 아닌 컬럼 전부
SELECT table_name, column_name, character_set_name, collation_name, column_type
FROM information_schema.columns
WHERE table_schema = 'mydb'
  AND character_set_name IS NOT NULL AND character_set_name <> 'utf8mb4'
ORDER BY table_name;

-- (2) 인덱스 걸린 긴 VARCHAR/CHAR (위험 후보 = 지뢰)
SELECT s.table_name, s.index_name, s.column_name, c.character_set_name, c.column_type
FROM information_schema.statistics s
JOIN information_schema.columns c
  ON s.table_schema = c.table_schema AND s.table_name = c.table_name AND s.column_name = c.column_name
WHERE s.table_schema = 'mydb' AND c.data_type IN ('varchar', 'char')
ORDER BY c.character_maximum_length DESC;
```

### 2. 클론에서 리허설 (RDS의 장점 활용)

0단계 스냅샷을 테스트 인스턴스로 복원해 같은 마이그레이션을 먼저 돌린다. 여기서 실제 변환 소요 시간(운영 다운타임 예측), 인덱스 길이/collation 에러, 검증까지 한 사이클을 잡는다. 이걸 건너뛰고 운영에서 처음 돌리면 30분짜리 ALTER인 줄 모르고 트래픽 시간에 걸어 서비스가 멈춘다.

### 3. 사전 조건 정리

- **row format을 DYNAMIC으로** (+ `innodb_large_prefix`) → 인덱스 한계가 767 → 3072바이트로 풀린다. MySQL 8.0은 기본, 5.7이면 확인.
- **인덱스 길이 초과 컬럼 처리** — 둘 중 하나:
  - 실제로 255자가 불필요하면 `VARCHAR(191)`로 축소
  - 길이가 필요하면 프리픽스 인덱스: `ALTER TABLE t ADD INDEX idx (col(191))`
- **collation 결정** — 8.0이면 `utf8mb4_0900_ai_ci`(기본 권장), 5.7이면 `utf8mb4_unicode_ci`. 유니크 인덱스 있는 테이블은 변환 전에 새 collation에서 중복될 후보를 점검한다.

```sql
-- 새 collation에서 대소문자 무시로 중복될지 점검
SELECT LOWER(email), COUNT(*) FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;
```

### 4. 실제 변환 (테이블 크기로 분기)

작은 테이블은 직접 ALTER로 충분하다. `CONVERT TO CHARACTER SET`이 테이블 기본 charset과 모든 char/varchar/text 컬럼을 한 번에 바꾼다.

```sql
ALTER TABLE small_table CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

큰 테이블(수백만 행 이상)은 직접 ALTER의 락이 위험하니 **온라인 스키마 변경 도구**(pt-online-schema-change, gh-ost)를 쓴다. 그림자 테이블에 청크 복사 후 원자적 교체라 변환 내내 락이 거의 없다. 도구 메커니즘과 트리거 vs binlog 차이는 [[Schema-Migration-Large-Table]]. charset 변환용 호출만 옮기면 이렇다.

```bash
pt-online-schema-change \
  --alter "CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci" --execute \
  D=mydb,t=big_table --host=mydb.xxxx.rds.amazonaws.com --user=admin --ask-pass \
  --max-lag=5 --critical-load="Threads_running=50"
```

`--max-lag`로 복제 지연을 보며 스로틀하므로 Multi-AZ나 Read Replica가 있어도 안전하다. 복제본 지연이 특히 걱정되면 트리거 없이 binlog로 따라잡는 gh-ost가 더 부드럽다(`binlog_format=ROW` 필요).

### 5. DB 기본값 + 커넥션 charset

테이블만 바꾸면 끝이 아니다. 앞으로 만들 테이블과 커넥션도 utf8mb4여야 한다.

```sql
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;  -- 이후 생성 테이블에 적용
```

```
# 앱 커넥션 charset — 빼먹으면 테이블 다 바꿔놓고도 글자가 깨진다
DATABASE_URL="mysql://user:pw@host:3306/mydb?charset=utf8mb4"
```

Prisma는 마이그레이션 시 DB 기본 charset을 따라가므로, DB 기본값을 utf8mb4로 바꿔두면 이후 `prisma migrate`로 만드는 테이블도 utf8mb4로 생성된다. 서버 파라미터 그룹의 `character_set_server` / `collation_server`까지 맞추면 더 확실하다(정적 파라미터라 적용 시 재부팅이 필요할 수 있다 → [[RDS-Operational-Pitfalls]]).

### 6. 검증

```sql
SHOW CREATE TABLE users;  -- 테이블/컬럼 charset 확인
INSERT INTO test_table (content) VALUES ('테스트 😀🎉 完了');  -- 4바이트 문자 테스트
SELECT content FROM test_table WHERE content LIKE '%😀%';
```

이모지가 깨짐 없이 들어가고 그대로 조회되면 성공이다. 1단계 감사 쿼리를 다시 돌려 utf8mb4가 아닌 컬럼이 0건인지도 확인한다.

## 롤백

- **변환 도중 문제**: pt-osc/gh-ost는 그림자 테이블 교체 전까지 원본이 그대로라 중단해도 안전하다. 그림자 테이블만 정리한다.
- **교체까지 끝난 뒤 문제**: 0단계 스냅샷에서 복원이 최종 수단이다(그래서 0단계가 중요하다).

## latin1에서 넘어오는 경우는 완전히 다르다

컬럼이 `latin1`인데 실제로는 UTF-8 바이트가 들어있는 상태(옛 시스템에서 흔한 "깨진 듯 저장된" 케이스)라면, 위 `CONVERT TO CHARACTER SET`을 그냥 쓰면 **데이터가 손상된다**. MySQL이 그 바이트를 latin1로 해석해 다시 인코딩하기 때문이다. 이럴 땐 **바이너리 경유 트릭** — 일단 VARBINARY로 바꿔 원본 바이트를 보존한 뒤 utf8mb4로 재해석시킨다.

```sql
ALTER TABLE t MODIFY col VARBINARY(255);
ALTER TABLE t MODIFY col VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

다만 "정상 latin1"인지 "UTF-8이 잘못 담긴 latin1"인지에 따라 처리가 또 갈리고, 둘이 섞여 있으면 까다롭다. 반드시 클론에서 충분히 검증하고 간다.

## 면접 체크포인트

- charset 변환이 운영에서 위험한 3가지: 테이블 락(COPY 강제), 인덱스 키 길이 초과, collation 충돌
- `VARCHAR(191)`이 마법의 숫자인 이유(191×4=764 ≤ 767), DYNAMIC row format으로 3072까지 푸는 법
- utf8mb3 → utf8mb4가 데이터 안전한 이유(상위 집합)와 latin1이 다른 이유
- 큰 테이블에 온라인 스키마 변경 도구를 쓰는 이유와 복제 지연 스로틀링
- 테이블만 바꾸면 안 되는 이유 — DB 기본값과 커넥션 charset 네 군데 일치
- latin1에 UTF-8이 잘못 담긴 경우의 바이너리 경유 복구

## 출처

- [MySQL Reference — Converting between 3-byte and 4-byte Unicode](https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-conversion.html)
- [Percona — pt-online-schema-change](https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)

## 관련 문서

- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경 (pt-osc, gh-ost)]]
- [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 — utf8/utf8mb4 등]]
- [[Index|Index 추가의 운영 리스크]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
