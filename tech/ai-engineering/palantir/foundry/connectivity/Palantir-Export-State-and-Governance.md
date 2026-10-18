---
tags: [palantir, export, transactions, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Export의 상태, 재실행과 통제

Export는 Foundry 밖에 접근과 보존의 새로운 지점을 만든다. 수신 목적, 대상 권한과 필드 최소화를 검토하고 exportable security/Organization markings를 설정한다. 문서는 ISO 역할과 해당 marking 제거 권한을 요구한다.

일부 대화형 workflow는 내보낼 데이터를 모두 추론하지 못하므로 `Enable exports to this source without markings validations`가 필요하다. Functions의 webhook이 그 예다. 이 경로에는 marking 검증이 적용된다고 설명하면 안 된다.

## 파일과 streaming

File export는 기본적으로 마지막 성공 export 이후 수정된 파일만 내보내며 대상의 같은 경로 파일을 덮어쓴다. 전체 재수출은 새 export를 만들거나 upstream에서 대상 파일을 모두 다시 쓰는 방식이다. 대상 전용 폴더를 두고 connector별 덮어쓰기 규칙을 확인한다.

Streaming export는 재시작 시 이전 위치에서 이어간다. Replay 처리에는 두 선택이 있다. Replayed record를 다시 보내면 외부 중복 처리가 필요하다. 보내지 않으면 이전 offset까지 기다리지만 replay 전후 offset이 일치하지 않아 일부 record가 영구 누락될 수 있다. 중복 회피와 무손실을 동시에 보장하는 옵션으로 해석하지 않는다.

2025년 6월 이후 새 파일이나 행이 없는 export는 실패가 아닌 성공으로 표시된다. 상태만 감시하던 workflow는 실제 변경량과 기대 최신성을 별도로 확인한다.

## Table export 모드

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

Table은 대상 시스템에 미리 있어야 하며 column 이름의 대소문자와 타입이 1:1로 맞아야 한다. Foundry backing file은 Parquet이어야 한다. Array/Map/Struct 등 미지원 타입이 있으면 실패한다. Legacy agent worker 경로는 Linux만 지원하고 Windows는 지원하지 않는다.

Custom JDBC의 INSERT 문법은 임의 수정할 수 없다. Database/schema/table을 대상에 맞게 지정하고 실제 dialect를 확인한다. Truncate 모드는 truncate 권한이 필요하다. 일부 connector의 다중 thread export는 임시 staging table에 병렬 기록한 뒤 최종 table로 복사하므로 CREATE/READ/UPDATE/DELETE 권한도 필요하다. 이를 모든 connector와 외부 시스템의 보편적 원자성으로 확대하지 않는다.

일반 export job은 변환을 수행하지 않는다. 필드, 파일 형식과 디렉터리 구조는 upstream에서 준비한다. 현재 export는 `master` branch를 사용하며 일부 설정은 생성 후 바꿀 수 없어 재생성이 필요하다. Streaming export는 start/stop으로 운영하고, schedule이 있으면 중지된 작업을 다시 시작할 수 있다.

## Legacy export task의 통제 공백

Legacy task는 agent worker에서 YAML로 설정하며 markings/export controls와 통합되지 않는다. 따라서 데이터 unmarking 권한을 요구하지 않는다는 명시적 차이가 있다. 새 export의 통제를 legacy에도 있다고 가정하지 않는다. 입력 Source와 output 이름은 각각 `inputSource`, `outputDataset`이어야 한다.

Legacy `incrementalType: incremental`은 최초 전체를 내보낸 후 새 transaction만 처리하지만 기준 transaction이 사라지면 전체 snapshot으로 돌아간다. 새 export의 엄격한 APPEND 모드와 다르다. Path rewriting의 regex group, 날짜, transaction/dataset ID 템플릿도 legacy 설정이다.

이전은 수동이다. 새 workflow의 결과를 검증한 뒤 기존 task를 제거한다. pre/staging/after SQL, 수동 transaction 관리와 세밀한 thread 제어가 필요하면 external transform을 검토한다. 문서의 general overview가 BigQuery를 legacy task 사례로 들더라도 실제 선택은 최신 connector별 export 지원을 확인한다.

## 출처

- [Palantir, Exports](https://www.palantir.com/docs/foundry/data-connection/export-overview)
- [Palantir, Export tasks, legacy](https://www.palantir.com/docs/foundry/data-connection/export-tasks)

## 관련 문서

- [[Palantir-Sync-State-and-Files|수집 transaction과 파일 모드]]
- [[Palantir-External-Transforms-Governance|외부 코드와 통제]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 문서 계약을 비교했다. 외부 table 생성, truncate, export와 재시도는 실행하지 않았다.
