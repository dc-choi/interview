---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SQL worksheet과 함수 결과 형태"]
---

# SQL worksheet과 함수 결과 형태

## 저장 상태와 발행

Scratchpad는 private 임시 editor이며 Foundry resource, 공유와 version history가 없다. Private worksheet은 개인 저장, project worksheet은 resource와 project 권한으로 공유한다. 수동 save가 version을 만들고 save 사이 자동 보존된 미저장 변경은 아직 version이 아니다.

Ontology SQL function은 project worksheet으로 저장해야 publish할 수 있다. Private worksheet은 publish 대상이 아니다. Function은 read-only query이며 Action/Automate/Workshop/OSDK에서 소비하더라도 스스로 Ontology를 수정하는 함수로 바뀌지 않는다. Beta 단계의 고동시성 제한과 일반 Ontology SQL 자원 제약을 상속한다.

## 매개변수와 반환형

Literal parameter는 문자열/숫자/Boolean 같은 literal 위치에만 쓸 수 있다. SQL fragment, 동적 표현식이나 임의 column/table 문자열로 대체하는 매개변수가 아니다. ObjectSet parameter는 FROM 위치에만 쓰며 editor의 default는 시험용 값이다.

여러 column을 SELECT하면 행별 struct의 list를, 하나의 column만 SELECT하면 그 column 타입의 list를 반환한다. 두 형태가 같은 List<Struct>라고 가정하면 호출부가 깨질 수 있다. Result column 이름 변경도 함수 소비 계약에 영향을 준다. ObjectSet을 input으로 쓸 수 있어도 SQL 결과를 ObjectSet으로 직접 반환하는 것은 지원하지 않는다.

## 결과를 판단하는 범위

SQL Studio와 embedded console은 같은 엔진 계약 위의 서로 다른 진입점이다. Ontology Manager에서는 data/object mode를 고를 수 있지만 다른 embedded app은 data mode만 제공할 수 있다. Chart도 preview 제한을 적용받으므로 전체 100,000행 중 첫1,000행의 그래프를 전체 분포로 읽지 않는다.

Selected SQL만 실행할 수 있으므로 editor 전체와 실제 실행 statement를 구분한다. Console 확장, saved worksheet와 published Function, SQL definition의 active rebuild는 모두 다른 산출물이다. 이 문서는 본문과 예제를 학습한 것으로 실제 publish나 Function 호출은 수행하지 않았다.

## 출처

- [Palantir sql-warehousing, sql-warehousing](https://www.palantir.com/docs/foundry/sql-warehousing)
- [Palantir sql-warehousing, arrow-flight-sql](https://www.palantir.com/docs/foundry/sql-warehousing/arrow-flight-sql)
- [Palantir sql-warehousing, compute-usage](https://www.palantir.com/docs/foundry/sql-warehousing/compute-usage)
- [Palantir sql-warehousing, furnace](https://www.palantir.com/docs/foundry/sql-warehousing/furnace)
- [Palantir sql-warehousing, ontology-sql](https://www.palantir.com/docs/foundry/sql-warehousing/ontology-sql)
- [Palantir sql-warehousing, overview](https://www.palantir.com/docs/foundry/sql-warehousing/overview)
- [Palantir sql-warehousing, sql-console](https://www.palantir.com/docs/foundry/sql-warehousing/sql-console)
- [Palantir sql-warehousing, sql-definitions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-definitions)
- [Palantir sql-warehousing, sql-dialect](https://www.palantir.com/docs/foundry/sql-warehousing/sql-dialect)
- [Palantir sql-warehousing, sql-examples](https://www.palantir.com/docs/foundry/sql-warehousing/sql-examples)
- [Palantir sql-warehousing, sql-functions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-functions)
- [Palantir sql-warehousing, sql-permissions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-permissions)
- [Palantir sql-warehousing, sql-studio](https://www.palantir.com/docs/foundry/sql-warehousing/sql-studio)
- [Palantir sql-warehousing, worksheets](https://www.palantir.com/docs/foundry/sql-warehousing/worksheets)

## 관련 문서

- [[Palantir-SQL-Warehousing]]
