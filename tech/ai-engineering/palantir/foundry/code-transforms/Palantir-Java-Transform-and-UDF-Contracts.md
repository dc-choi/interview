---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Java transform과 UDF의 실행 계약"]
---

# Java transform과 UDF의 실행 계약

Java transform은 Spark Dataset<Row>와 raw-file API를 제공한다. Batch/incremental을 지원하지만 Python의 증분 decorator처럼 자동으로 증분 가능성을 판단하지 않는다. 등록과 input read/output write의 의미를 명시해야 한다.

## 등록과 I/O 수준

High-level은 여러 Dataset<Row>를 받아 하나를 반환한다. Low-level은 FoundryInput/Output으로 여러 output과 file을 직접 읽고 쓴다. Compute는 public non-static method의 @Compute이며 annotation이 없으면 등록되지 않는다.

Java subproject마다 하나의 PipelineDefiner를 service-loader file에 등록한다. Auto-bind는 @Input/@Output을 갖춘 class를 package에서 찾고 manual builder는 parameter명과 input/output alias를 명시한다. StopPropagating/StopRequiring은 automatic registration만 지원한다. TransformContext의 authHeader/service discovery를 일반 log나 공개 URI로 노출하지 않는다.

## 증분 상태표

| Input modification | ReadRange | 예시 output WriteMode |
|---|---|---|
| UNCHANGED/APPENDED | UNPROCESSED | UPDATE |
| UPDATED/NEW_VIEW | ENTIRE_VIEW | SNAPSHOT |

PROCESSED는 이미 처리한 범위이며 ENTIRE_VIEW와 다르다. ReadRange만 바꾸고 writer의 mode를 생략하면 snapshot이므로 새 delta만 snapshot에 남겨 기존 결과를 잃을 수 있다. File API도 input.getFileSystem(readRange), output.getFileSystem(writeMode)를 함께 지정한다.

WriteMode.UPDATE는 downstream APPENDED가 되는 출력 계약이며 input modification UPDATED(기존 row/file 수정 포함)와 다르다. Snapshot trigger dataset을 추가하면 그 변경에 맞춰 다른 input read range와 output write mode도 전체로 바꿔야 한다.

Ignore incremental deletes와 Use schema modification type은 low-level 전용이다. 전자는 삭제를 무시해 증분성을 유지하지만 output의 과거 결과가 실제 source 삭제와 일치한다는 뜻이 아니다. 후자는 schema change를 NEW_VIEW 대신 UNCHANGED+NEW_SCHEMA flag로 분리하므로 author가 dependency를 판단해야 한다. 사용/출력 column이 삭제/변경되면 실패와 새 snapshot이 필요할 수 있다. Additive schema 성공 문구도 모든 임의 로직의 의미 불변을 보장하지 않는다.

## File 병렬화와 무결성

ZIP은 archive별 병렬 해제가 가능하지만 하나의 ZIP 내부를 자동 분할하지 않는다. Output path는 archive logical path와 entry name을 합쳐 충돌을 피한다. 동일 executor의 중복 path 쓰기는 error, 다른 executor끼리 충돌은 error 없이 undefined output일 수 있다.

CSV/GZ/ZIP→table 예시는 같은 schema의 CSV라는 전제와 UTF-8, inferSchema를 사용한다. 이를 서로 다른 header/schema의 archive에 그대로 적용하지 않는다. 모든 file을 한 ZIP으로 합치는 예시는 driver 단일 thread이며 대규모 분산 처리로 해석하지 않는다. Stream close와 task completion lifecycle도 확인한다.

## UDF의 타입, 행수와 배포 ID

PB UDF는 cloud-hosted/Rubix 조건이며 row map, flat map, keyed process/co-process를 지원한다. Async custom/deployed-app은 YAML enum에 있더라도 PB 배포 미지원이다. Row map은 input당 정확히1 output, flat map은0~여러 row다. Key/event-time column은 input schema에 있어야 한다.

Definition YAML의 name/inputSchema/outputSchema/arguments로 typed class를 생성하고 factory가 configuration으로 instance를 만든다. Schema보다 column이 많은 input도 select 가능하면 받을 수 있다. Field와 array element/map의 nullability를 분리하며 decimal precision1~38, scale0~precision을 지정한다. Schema가 허용하는 nullability와 Spark engine의 map key 제한을 자동으로 같다고 추정하지 않는다.

Custom type은 customTypes.types 아래에서 정의하며 같은 struct를 input/output 양쪽에 재사용하면 별도 generated class 변환이 필요하지 않다. Example framework는 row-map만 지원하고 name이 UDF와 같아야 등록된다. Flat-map은 자체 JUnit으로 검증하며 PB documentation에 자동 표시되지 않는다.

PB publish에는 generateEddieLockfile, commit/tag와 성공 checks가 필요하다. Lockfile ID는 UDF 이름을 바탕으로 무작위로 생성되며 rename/삭제 후 재생성은 기존 것의 갱신이 아니라 새 UDF 등록을 만든다. 이미 publish한 UDF는 unpublish할 수 없다고 설명한다. 새 버전은 PB에서 Edit version, deployment repository에서는 dependency tag를 갱신해야 하며 자동 latest로 보장하지 않는다.

## 개발과 시험의 조건

Java 공유 코드는 artifact 접근 설정과 subproject build.gradle의 RID/subproject/version Maven coordinate로 참조한다. Shared repository 재compile 후 dependent version을 직접 올려야 한다. Java library/tagging 기능의 미지원 설명은 일반 repository 공유에 관한 것으로 UDF release tagging과 구분한다.

Local-development 안내는 Java17까지만 지원하지만 현재 transforms runtime 표는 Java21도 사용한다. 로컬 Gradle 호환성과 원격 runtime을 분리하고 wrapper를 사용한다. Clone URI는 계정 민감정보를 담을 수 있고 token은 짧은 수명의 제한된 권한이다. JobSpec/artifact/check/build는 push가 필요하다.

Java batch unit test는 defaults plugin과 JUnit5 SparkSessionExtension 또는 deprecated JUnit4 rule을 쓴다. ClassRule은 session/classpath를 공유해 빠르지만 test 간 상태 영향이 있고 per-test Rule은 격리 비용이 크다. Streaming/interactive unit-test debugging은 이 경로에서 미지원이다.

MaxAllowedDuration은 ISO8601 duration이지만5분마다 poll하므로3분 지정도5분경,7분도10분경 취소될 수 있다. Spark syntax cheat sheet는 누락 semicolon, undefined variable과 struct explode 같은 예제 문제를 포함하므로 그대로 compile 보장으로 쓰지 않는다. 실제 Java compile, unit test나 UDF publish를 실행하지 않았다.

## 출처

- [Palantir transforms-java, transforms-java](https://www.palantir.com/docs/foundry/transforms-java)
- [Palantir transforms-java, advanced-configuration](https://www.palantir.com/docs/foundry/transforms-java/advanced-configuration)
- [Palantir transforms-java, getting-started](https://www.palantir.com/docs/foundry/transforms-java/getting-started)
- [Palantir transforms-java, incremental-transforms](https://www.palantir.com/docs/foundry/transforms-java/incremental-transforms)
- [Palantir transforms-java, local-development](https://www.palantir.com/docs/foundry/transforms-java/local-development)
- [Palantir transforms-java, overview](https://www.palantir.com/docs/foundry/transforms-java/overview)
- [Palantir transforms-java, share-code](https://www.palantir.com/docs/foundry/transforms-java/share-code)
- [Palantir transforms-java, spark-syntax](https://www.palantir.com/docs/foundry/transforms-java/spark-syntax)
- [Palantir transforms-java, transforms-examples](https://www.palantir.com/docs/foundry/transforms-java/transforms-examples)
- [Palantir transforms-java, transforms-pipelines](https://www.palantir.com/docs/foundry/transforms-java/transforms-pipelines)
- [Palantir transforms-java, unit-tests](https://www.palantir.com/docs/foundry/transforms-java/unit-tests)
- [Palantir transforms-java, unstructured-files](https://www.palantir.com/docs/foundry/transforms-java/unstructured-files)
- [Palantir transforms-java, user-defined-functions](https://www.palantir.com/docs/foundry/transforms-java/user-defined-functions)

## 관련 문서

- [[Palantir-Code-Transforms]]
- [[Palantir-Transform-Runtime-and-Multi-Output]]
- [[Palantir-Pipeline-Model-Execution-and-Packaging]]
