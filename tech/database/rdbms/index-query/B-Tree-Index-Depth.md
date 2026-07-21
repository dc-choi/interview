---
tags: [database, rdbms, mysql, innodb, index, btree]
status: done
category: "Data & Storage - RDB"
aliases: ["B-Tree Index Depth", "B-Tree 인덱스 깊이", "InnoDB 페이지 깊이"]
verified_at: 2026-07-21
---

# B-Tree 인덱스 깊이

InnoDB의 B+Tree 인덱스 깊이를 페이지 구조로 추정하는 방법을 설명한다. 깊이는 페이지 크기, 키와 row 폭, 레코드 포맷, fill 상태에 따라 달라지므로 행 수만으로 고정할 수 없다. 대개 fan-out이 커 깊이는 낮지만 실제 인덱스는 측정해야 한다.

## 페이지 구조의 기본

- InnoDB 페이지 크기 기본값은 **16KiB**다. 인스턴스 초기화 시 `innodb_page_size`를 4, 8, 16, 32, 64KiB 중 지원 범위에서 선택할 수 있으며 이후 변경할 수 없다.
- B+Tree는 **루트, 필요하면 여러 단계의 브랜치, 리프**로 구성된다. 항상 3단인 것은 아니다.
- `tree_level`: 리프 = 0, 그 위로 +1씩 증가 (즉, 깊이 = `tree_level + 1`)
- 리프 페이지는 **이중 링크**로 연결돼 있어 범위 스캔이 효율적 (`page_prev`, `page_next`)

## 깊이 증가가 일어나는 시점

- **리프 페이지가 가득 차면** → 페이지 분할 발생, 같은 레벨에 페이지가 늘어남
- **넌 리프 페이지가 가득 차면** → 한 레벨 위에 새 노드가 생기면서 **깊이 +1**
- 전체 수용량은 대략 `리프당 레코드 수 × 내부 노드 fan-out^(리프 위 레벨 수)`로 생각할 수 있다. 실제 페이지 오버헤드와 채움률 때문에 이론 최대치와 운영값은 다르다.

## 깊이를 좌우하는 두 값

- **내부 노드 fan-out**: separator key, child page number, 레코드와 페이지 오버헤드에 좌우된다. PK가 길면 보통 fan-out이 낮아진다.
- **리프 밀도**: clustered index 리프는 PK만 저장하는 것이 아니라 **전체 row**를 저장한다. 따라서 row 폭, 가변 길이 컬럼, off-page 저장, 레코드 포맷, 페이지 채움률이 리프당 행 수를 좌우한다.

예를 들어 내부 fan-out을 1,000, 리프당 행 수를 50으로 **가정**하면 리프 위 내부 레벨이 두 개인 트리는 이론상 약 `50 × 1,000²`행을 가리킨다. 이는 원리를 설명하는 계산일 뿐 InnoDB의 보장값이 아니다. INT 또는 BIGINT PK 크기만으로 최대 행 수나 테이블 크기를 확정해서는 안 된다.

## 왜 깊이가 성능에 결정적이지 않은가

- 깊이 4라면 논리적으로 루트부터 리프까지 네 페이지 레벨을 지난다.
- 루트와 상위 페이지가 buffer pool에 있을 가능성은 높지만, 실제 물리 I/O 횟수는 workload와 cache 상태에 따라 달라진다.
- 깊이가 한 단계 줄어도 지연이 같은 비율로 줄지는 않는다. 보조 인덱스에서는 리프 접근 뒤 clustered PK lookup이 추가될 수 있고, 범위 크기와 cache hit가 더 큰 비용 요인이 될 수 있다.

## PK 설계가 중요한 다른 이유

깊이 자체는 4를 넘기 어렵지만, **PK 선택은 여전히 중요하다.** 다른 비용 채널이 있기 때문이다.

- **UUID v4 (16B 랜덤)**: 페이지 분할 위치가 랜덤 → 페이지 분할 빈발 → 디스크 단편화 → 캐시 적중률 저하
- **컴파운드 PK (예: VARCHAR(64) + BIGINT)**: 보조 인덱스가 PK 전체를 함께 저장 → **모든 보조 인덱스가 비대해짐** (InnoDB는 보조 인덱스 리프에 PK 값을 저장)
- **순차성 부족한 PK**: 클러스터드 인덱스라서 INSERT가 임의 위치에 들어감 → 페이지 분할 + I/O 증가
- 결론: 깊이 절감보다 **(a) 단조 증가 (b) 짧은 사이즈 (c) 변하지 않음** 3요건을 만족하는 PK가 더 큰 효과를 낸다 → 보통 BIGINT AUTO_INCREMENT 또는 ULID/Snowflake 같은 시간 정렬 ID

## 보조 인덱스의 깊이는 다르다

본문은 클러스터드 인덱스(PK) 기준 깊이만 다루지만, 면접에서는 보조 인덱스도 같은 논리가 적용됨을 알아야 한다.
- 보조 인덱스의 리프 = **(인덱싱한 컬럼 값, PK 값)** 쌍을 저장
- 따라서 보조 인덱스 노드 1개에 들어가는 엔트리 수는 **(인덱스 컬럼 크기 + PK 크기)**에 반비례
- PK가 길수록 보조 인덱스도 깊어지고 비대해짐 → **PK 짧게 유지**가 보조 인덱스 효율로 직결

## 면접 체크포인트

- 왜 RDB가 **레드블랙트리가 아니라 B+Tree**를 쓰는가 (디스크 I/O 단위, 한 노드당 자식 수)
- InnoDB 페이지 크기의 기본값과 설정 가능 범위, B+Tree **깊이 추정식**
- 행 수만으로 깊이를 확정할 수 없는 이유를 설명할 수 있는가
- **PK 사이즈와 보조 인덱스 비대화**의 관계를 설명할 수 있는가
- UUID PK가 왜 안 좋은가 (페이지 분할, 단편화, 보조 인덱스 비대)

## 출처
- [mysqlinternal.com — B-Tree 인덱스의 깊이에 대해서](https://mysqlinternal.com/2024/10/31/b-tree-%ec%9d%b8%eb%8d%b1%ec%8a%a4%ec%9d%98-%ea%b9%8a%ec%9d%b4%ec%97%90-%eb%8c%80%ed%95%b4%ec%84%9c/)
- [velog 480 — B-Tree 알고리즘 : DB 인덱스의 내부 알고리즘](https://velog.io/@480/B-Tree-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-DB-%EC%9D%B8%EB%8D%B1%EC%8A%A4%EC%9D%98-%EB%82%B4%EB%B6%80-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98)
- [MySQL 8.4 — `innodb_page_size`](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_page_size)
- [MySQL 8.4 — Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)

## 관련 문서
- [[Index|Index 기본 (B-Tree, 커버링, 카디널리티)]]
- [[Execution-Plan|실행 계획 분석]]
- [[Sharding|샤딩]]
- [[Schema-Design|스키마 설계]]
- [[Latency-Optimization|레이턴시 최적화 개관]]
