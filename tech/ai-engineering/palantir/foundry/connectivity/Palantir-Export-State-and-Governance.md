---
tags: [palantir, export, transactions, governance]
status: done
verified_at: 2026-10-21
category: "AI엔지니어링(AIEngineering)"
---

# Export의 상태, 재실행과 통제

Export는 Foundry 밖에 접근과 보존의 새로운 지점을 만든다. 수신 목적, 대상 권한과 필드 최소화를 검토하고 source의 Export configuration에서 내보낼 수 있는 security marking과 organization을 지정한다. 목록에 없는 marking이나 organization이 붙은 데이터는 그 source로 내보낼 수 없다. 기본 역할 기준 필요한 권한은 작업마다 다르다.

| 작업 | 필요한 권한 |
| --- | --- |
| `Enable exports to this source` 켜기와 끄기 | source의 `Owner`와 `Information Security Officer` enrollment 역할 |
| Exportable security marking 추가 | source의 `Owner`와 그 marking의 Apply marking, Remove marking 권한 |
| Exportable organization 추가 | source의 `Owner`와 그 organization의 Expand access(자기 organization이면 Expand access 불필요) |

표의 작업 가운데 ISO 역할은 export 허용 스위치에 필요하고 exportable marking과 organization 추가에는 필요하지 않다. 아래 `Enable exports to this source without markings validations` 설정의 UI 권한은 Exports 문서에 없다. API의 `updateExportSettings`로 `exportsEnabled`와 `exportEnabledWithoutMarkingsValidation`을 바꾸는 일은 ISO 역할 사용자만 할 수 있다([[Palantir-Connection-API|Connection API]]). Exportable marking은 monitoring view가 보내는 Slack 알림에 어떤 resource metadata가 나타날 수 있는지도 정한다.

일부 대화형 workflow는 내보낼 데이터를 모두 추론하지 못하므로 `Enable exports to this source without markings validations`가 필요하다. Functions의 webhook이 그 예다. 이 경로에는 marking 검증이 적용된다고 설명하면 안 된다.

## 파일과 streaming

File export는 기본적으로 마지막 성공 export 이후 수정된 파일만 내보내며 대상의 같은 경로 파일을 덮어쓴다. 전체 재수출은 새 export를 만들거나 upstream에서 대상 파일을 모두 다시 쓰는 방식이다. 대상 전용 폴더를 두고 connector별 덮어쓰기 규칙을 확인한다.

2026-10-21 문서 기준 streaming export를 지원하는 source type은 Amazon Kinesis, Amazon SQS, Google Pub/Sub, Kafka, PostgreSQL, Solace다. Kafka로 보낼 때는 stream record의 Base64 decoding을 켤 수 있다.

Streaming export는 재시작 시 이전 위치에서 이어간다. Replay 처리에는 두 선택이 있다. Replayed record를 다시 보내면 외부 중복 처리가 필요하다. 보내지 않으면 이전 offset까지 기다리지만 replay 전후 offset 일치가 보장되지 않아 일부 record가 영구 누락되는 결과로 이어지는 경우가 많다. 중복 회피와 무손실을 동시에 보장하는 옵션으로 해석하지 않는다.

2025년 6월 이후 새 파일이나 행이 없는 export는 실패가 아닌 성공으로 표시된다. 상태만 감시하던 workflow는 실제 변경량과 기대 최신성을 별도로 확인한다.

## Table export 모드

Table export는 2024년 6월 GA지만 모든 source type에 있는 것은 아니다. Source 페이지의 `Table exports` 태그로 지원 여부를 확인하고, 지원되면 legacy export task보다 이 방식을 쓴다.

| 모드 | 상태 계약 |
| --- | --- |
| Efficient mirror | 미수출 transaction을 보내고 SNAPSHOT이면 대상 truncate, UPDATE/DELETE 미지원 |
| Full without truncation | 전체 view를 매번 추가하므로 일반적으로 중복 발생 |
| Full with truncation | 대상 비운 뒤 전체 view 전송, 외부 편집도 덮어씀 |
| Incremental | 미수출 transaction만 추가, SNAPSHOT이면 중복 가능, UPDATE/DELETE 미지원 |
| Incremental with truncation | 대상 비운 뒤 새 transaction만 전달, queue처럼 소비하는 대상용, UPDATE/DELETE 미지원 |
| Incremental, fail unless APPEND | 첫 실행 이후 SNAPSHOT/UPDATE/DELETE면 실패해 의도치 않은 재수출 차단 |

마지막 모드의 중복 방지는 transaction 재수출 규칙의 계약이다. 원천 dataset 자체의 중복이나 외부 시스템의 재시도 효과까지 없는 것으로 확대하지 않는다.

## Schema와 실행 전제

Table은 대상 시스템에 미리 있어야 하며 column 이름의 대소문자와 타입이 1:1로 맞아야 한다. Foundry backing file은 Parquet이어야 한다. Array/Map/Struct 등 미지원 타입이 있으면 실패한다. Agent worker로 table export를 실행하면 agent가 Linux host에 있어야 하며 Windows agent에서의 table export 실행은 지원하지 않는다.

`DATABASE`, `SCHEMA`, `TABLE` 필드는 source가 요구하는 것만 채운다. 필요한 필드를 빠뜨리면 runtime에 실패하고 불필요한 필드를 넣어도 실패할 수 있으므로 source의 explore와 autofill로 대상을 고른다.

Exports 문서의 SQL dialect 절은 table export가 현재 custom JDBC source type에서 지원되며, Oracle처럼 전용 connector가 있는 시스템도 custom JDBC 연결로 만들어야 table export 선택지가 나타난다고 설명한다. 그러나 2026-10-20 수집한 Oracle Database connector 문서는 Table exports를 Generally available로 표시해 이 절과 상충하고, Db2와 Redshift도 connector 문서에 table export가 있다([[Palantir-Database-CDC-Connectors|Database CDC connector]]). Oracle을 포함한 각 source는 실제 source 페이지의 `Table exports` 태그로 확인한다. Palantir가 만드는 INSERT 문은 사용자가 바꿀 수 없고, 여러 행을 한 문장에 넣는 batch insert 여부는 source마다 다르다. Snowflake는 batch insert를 지원해 여러 행을 한 문장에 쓸 수 있고, batch insert 지원이 제한적인 Apache Hive는 문서 예시에서 행마다 INSERT를 실행한다. Custom JDBC 문서는 export batching을 기본 비활성으로 두고, 켜면 batch 크기 2~5,000을 고를 수 있으며 driver가 batching 대상이면 다음 export부터 적용된다고 설명한다. 이 설정이 위 예시의 다중 행 INSERT 문을 만드는지는 밝히지 않는다([[Palantir-JDBC-Connector|JDBC connector]]). 직접 넣은 driver를 쓰면 이 문법을 대상 dialect가 받아들이는지 확인하고, 받아들이지 않으면 external transform 같은 코드 기반 연결로 쓴다. 문서가 지원 타입으로 든 것은 `DECIMAL`, `BIGINT`, `BINARY`, `BOOLEAN`, `SMALLINT`, `DATE`, `DOUBLE`, `FLOAT`, `INTEGER`, `VARCHAR`, `TIMESTAMP`이며, 목록에 없는 타입(예: `GEOGRAPHY`)도 실패한다. Truncate 모드는 truncate 권한이 필요하다. 일부 connector의 다중 thread export는 임시 staging table에 병렬 기록한 뒤 최종 table로 복사하므로 CREATE/READ/UPDATE/DELETE 권한도 필요하다. 이를 모든 connector와 외부 시스템의 보편적 원자성으로 확대하지 않는다.

일반 export job은 변환을 수행하지 않는다. 필드, 파일 형식과 디렉터리 구조는 upstream에서 준비한다. 구조화 dataset의 backing file은 기본적으로 `spark/` 디렉터리 아래에 있다. 날짜 partition 같은 대상 경로가 필요하면 Python transform의 filesystem API로 파일을 원하는 경로(예: `data_dt=20240101/part-00000-xxx.parquet`)에 복사한 dataset을 만들어 그 dataset을 export한다. 이 dataset은 첫 build 뒤 Apply schema를 해야 Foundry에서 표로 보인다. 현재 export는 `master` branch를 사용하며 일부 설정은 생성 후 바꿀 수 없어 재생성이 필요하다. Streaming export는 start/stop으로 운영하고, schedule이 있으면 중지된 작업을 다시 시작할 수 있다.

Export는 sync처럼 Foundry build system의 job으로 실행된다. History의 각 job에서 Builds의 build report를 열어 실패 원인을 보고, streaming export는 History에서 실행 중인지 중지됐는지도 확인한다. Batch export의 schedule은 export Overview의 Add schedule에서 Data Lineage로 넘어가 만든다.

## Legacy export task의 통제 공백

2026-10-21 문서 기준 export task는 sunset 단계이며 게시된 product lifecycle에 따라 deprecated될 예정이다. Legacy task는 agent worker에서 YAML로 설정하며 markings/export controls와 통합되지 않는다. 따라서 데이터 unmarking 권한을 요구하지 않는다는 명시적 차이가 있다. 새 export의 통제를 legacy에도 있다고 가정하지 않는다. 입력 Source와 output 이름은 각각 `inputSource`, `outputDataset`이어야 한다.

Legacy `incrementalType: incremental`은 최초 전체를 내보낸 후 새 transaction만 처리하지만 기준 transaction이 사라지면 전체 snapshot으로 돌아간다. 새 export의 엄격한 APPEND 모드와 다르다. Path rewriting의 regex group, 날짜, transaction/dataset ID 템플릿도 legacy 설정이다.

이전은 수동이다. 새 workflow의 결과를 검증한 뒤 기존 task를 제거한다. pre/staging/after SQL, 수동 transaction 관리와 세밀한 thread 제어가 필요하면 external transform을 검토한다. 새 export는 legacy의 `writeDirectly: true`, `copyMode: insert`에 해당하는 동작으로 고정되고, transaction isolation은 source 설정에 있으면 그 값을 따른다. `batchSize` 지원은 source type마다 다르다. Exports 문서의 기능 비교표는 JDBC source의 지원을 명시하고, Redshift처럼 connector 문서에 별도 batch 계약을 둔 경우도 있다. 대상 table 생성을 지원하지 않으므로 `quoteIdentifiers`도 없다. 문서의 general overview가 BigQuery를 legacy task 사례로 들더라도 실제 선택은 최신 connector별 export 지원을 확인한다.

## 출처

- [Palantir, Exports](https://www.palantir.com/docs/foundry/data-connection/export-overview)
- [Palantir, Export tasks, legacy](https://www.palantir.com/docs/foundry/data-connection/export-tasks)

## 관련 문서

- [[Palantir-Sync-State-and-Files|수집 transaction과 파일 모드]]
- [[Palantir-External-Transforms-Governance|외부 코드와 통제]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 문서 계약을 비교했다. 2026-10-21에는 Exports 개정본만 다시 대조했고 legacy export task 문서는 다시 대조하지 않았다. 외부 table 생성, truncate, export와 재시도는 실행하지 않았다.
