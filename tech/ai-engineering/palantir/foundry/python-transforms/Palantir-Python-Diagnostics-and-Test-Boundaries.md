---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python 진단, metrics와 test의 증거 범위"]
---

# Python 진단, metrics와 test의 증거 범위

Build 실패는 Python traceback, environment setup, engine query와 resource failure를 구분한다. Traceback은 맨 아래가 가장 최근 호출/exception이고 logging은 INFO 이상 저장한다. Print는 lightweight에서 지원하지만 Spark transform의 driver logging 대체로 일반화하지 않는다. UDF log는 driver log에 자동 포함되지 않는다.

## Resource telemetry

Lightweight Metrics는 emit한 job에서만 표시되고 memory request/usage와 CPU request/usage를 구분한다. Memory limit을 넘는 container OOM은 allocation과 peak materialization을 조사한다. Scheduler는 requested CPU가 가능한 host를 기다리고 남는 CPU를 추가로 줄 수 있지만 spare capacity는 보장되지 않는다. 작은 request는 startup이 빠를 수 있고 runtime variance가 커질 수 있다. 이 Metrics view를 Spark 전용 telemetry와 혼동하지 않는다.

## Local 개발과 preview

Palantir VS Code extension은 administrator enablement와 local preview 허용이 필요할 수 있으며 VS Code workspace에는 기본 enable이라고 안내한다. Sample-less full dataset preview는 local memory/credential과 데이터 취급 경계를 고려한다. Clone한 source의 변경만으로 JobSpec/artifact가 publish되지는 않아 Foundry push/Checks가 필요하다.

Extension의 .maestro environment와 맞는 interpreter를 사용한다. Local test executable은 .maestro/bin/pytest이고 test discovery는 pytest convention을 따른다. macOS Apple silicon의 legacy Gradle local 개발은 Rosetta 등 별도 prerequisite가 있다. 실제 이 환경을 설치하거나 preview를 실행하지 않았다.

## Test 적용 범위와 isolation

공식 Python repository unit-test 안내는 **batch 전용이며 streaming pipeline에는 미지원**이다. Pytest Gradle plugin을 enable해야 Checks에서 test task가 실행된다. Runtime dependency와 test-only dependency를 구분하고 PEP8/Pylint의 모든 설정이 지원된다고 가정하지 않는다.

Spark fixture는 test별 새 session이 아니라 session scope로 공유된다. Timezone 같은 설정을 바꾼 test는 복구해야 뒤 test가 영향을 받지 않는다. xdist는 pending test를 worker에 보내며 순서를 보장하지 않아 앞 test가 만든 global state에 의존하면 안 된다.

Mock output 검증은 외부 write 없이 전달할 DataFrame을 확인하는 단위 증거다. Schema/row count와 양방향 exceptAll 또는 engine별 frame equality를 비교하되 ordering/duplicate/null semantics를 의도에 맞게 확인한다. Coverage percentage는 실행 경로 수치이고 business correctness/Foundry runtime 호환성 증명은 아니다.

## 원문 예제의 한계

원문의 일부 Polars/pandas test는 transform이 write_table을 호출하는데 write_polars/write_pandas를 읽거나 다른 input/output parameter name으로 호출한다. Spark filter에 여분 괄호가 있는 예제도 있다. 예제를 복사해 test 통과를 기대하지 말고 실제 compute signature와 호출한 method를 대조한다. Mock 통과가 job transactionality나 permission을 검증했다고 보고하지 않는다.

## 출처

- [Palantir Python transforms, debugging](https://www.palantir.com/docs/foundry/transforms-python/debugging)
- [Palantir Python transforms, local-development](https://www.palantir.com/docs/foundry/transforms-python/local-development)
- [Palantir Python transforms, metrics](https://www.palantir.com/docs/foundry/transforms-python/metrics)
- [Palantir Python transforms, unit-tests](https://www.palantir.com/docs/foundry/transforms-python/unit-tests)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
