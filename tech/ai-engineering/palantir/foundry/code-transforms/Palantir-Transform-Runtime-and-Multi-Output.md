---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Transform runtime와 다중 output의 경계"]
---

# Transform runtime와 다중 output의 경계

Transform source version과 실제 Spark/Java/Scala runtime은 별도다. Foundry는 build마다 runtime을 선택하고 adjudication으로 새 version을 시험한 뒤 실패하면 이전 version으로 돌아갈 수 있다. Repository가 같은 코드라는 사실만으로 두 build의 runtime이 같다고 단정하지 않는다.

## Runtime 확인과 재현

현재 표는 Python/Java/SQL transforms 4.0.0+에 Spark 4.0.1/Java21/Scala2.13을 연결한다. 이전 Python 3.300.0+/SQL 3.236.0+는 Spark3.5.5/Java21/Scala2.13, Java3은 Scala2.12로 구분한다. Version은 출처 시점의 mapping이며 실제 job Environment의 sparkModuleVersion과 sparkVersion을 확인한다.

자동 업그레이드는 Spark legacy config와 호환성을 지향하지만 결과 불변의 보증은 아니다. Module pinning은 일시 고정 경로이며 업그레이드 불가 repository에는 약 한 달 뒤 prompt가 올 수 있다. Debug job에서 이전 성공 version을 지정해 원인을 좁힐 수 있지만 secret/credential을 쓰는 external transform은 OneTimeAccessKeyNotFound 실패가 예상되어 미지원이다.

## Preview의 실행 위치

Python extension preview는 일부 dataset을 로컬로 stream할 수 있다. Gradle local-preview는 명령을 로컬에서 실행해도 실제 compute는 Foundry 안에서 수행한다. 원문은 heading을 Java로 구분하면서 본문에는 Python/Java를 언급하므로 현재 template/extension 경로를 확인한다.

Gradle 경로는 remote tracking branch로 최소 한 번 push된 local branch와 최신 template가 필요하다. Preview URI는 실행한 사용자만 일시적으로 볼 수 있고 table mode는 처음 10 row, input/output file path를 별도로 지정한다. Preview 결과가 전체 input이나 production permission을 입증하지는 않는다.

## 하나의 job으로 묶을 때

Single-output은 build 주기, profile, framework와 실패를 따로 관리하고 필요한 input만 지정해 marking 전파를 줄일 수 있다. 대신 driver/startup과 공통 계산이 반복될 수 있다. Shared library나 intermediate dataset은 코드/계산 중복을 서로 다른 방식으로 줄인다.

Multi-output은 한 driver/job에서 공통 logic을 모으지만 output을 독립 build할 수 없고 한 profile/실패 경계를 공유한다. 느리거나 24시간 초과한 한 output이 전체를 실패시킬 수 있다. 비용은 output마다 균등 분할되어 actual 원인별 비용을 직접 보여주지 않는다.

원문은 intermediate 계산의 중복 비용이 없다고 설명하지만 lazy Spark DAG의 실제 재계산/캐시는 실행 계획에 달릴 수 있으므로 배치만으로 공유 계산의 물리적 1회 실행을 보장하지 않는다. Driver collect/UDF/Python API 호출을 nonparallel overhead로 묶은 문장도 모든 UDF가 driver-only라는 뜻으로 확대하지 않는다.

공통 logic, 병렬화와 공유 failure/schedule 제약이 맞을 때 묶고 독립 실행이 중요한 output은 나누는 것이 문서의 선택 기준이다. 실제 runtime upgrade/preview/build는 실행하지 않았다.

## 출처

- [Palantir transforms-common, transforms-common](https://www.palantir.com/docs/foundry/transforms-common)
- [Palantir transforms-common, local-preview](https://www.palantir.com/docs/foundry/transforms-common/local-preview)
- [Palantir transforms-common, optimize-multi-output-transforms](https://www.palantir.com/docs/foundry/transforms-common/optimize-multi-output-transforms)
- [Palantir transforms-common, transforms-versions](https://www.palantir.com/docs/foundry/transforms-common/transforms-versions)

## 관련 문서

- [[Palantir-Code-Transforms]]
