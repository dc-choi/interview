---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Python 증분 처리 계약"]
---

# Python 증분 처리의 이력, 읽기 모드와 재계산

`@incremental`은 출력 dataset의 이전 build 이력으로 직전 입력 상태를 찾아 runtime input/output/context를 증분 객체로 바꾼다. 일부 데이터만 읽는 최적화이며, join이나 aggregation을 자동으로 올바른 증분 알고리즘으로 바꾸는 기능은 아니다.

## 처음 실행과 이력 무효화

`require_incremental=True`이면 비증분 실행을 거부한다. 다만 모든 출력에 committed transaction이 없는 최초 실행은 예외다. `semantic_version` 기본값은 1이며 기존 결과를 무효화하는 로직 변경 때 값을 바꾸면 다음 실행이 비증분으로 재계산된다.

`snapshot_inputs`는 참조 테이블처럼 새 snapshot이 기존 출력의 의미를 무효화하지 않는 입력을 지정한다. 나머지 입력이 추가 데이터만 가지면 증분을 유지할 수 있다. 지정 입력은 현재 전체 view로 읽힌다. 기존 출력과 새 참조 데이터의 결합이 어떤 업무 의미인지 확인한 뒤 선택한다. 과거 결과도 새 참조값으로 고쳐야 한다면 이 설정으로 재계산을 피해서는 안 된다.

`allow_retention`은 Foundry retention 삭제로 증분이 깨지는 것을 허용 범위에서 제외한다. 일반 사용자 삭제에 대한 `allow_user_deletes`는 `v2_semantics=True`를 요구하고 lightweight에서는 지원하지 않는다. 삭제를 허용하는 설정과 그 삭제를 업무 결과에 실제 반영하는 알고리즘은 구별한다.

## 읽기 모드와 출력 모드는 독립이다

| 대상 | 기본 읽기 모드 | 주요 제약 |
|---|---|---|
| 증분 Spark input | `added` | current, previous, added 지원을 확인 |
| 증분 lightweight input | `added` | arrow/pandas/polars/filesystem에서 모드 지정 |
| 증분 Spark output | `current` | `previous`에서 이전 transaction이 없으면 schema 필수 |
| 증분 lightweight output | `current` | 빈 결과를 구성할 때 FoundryFieldSchema 전달 가능 |

`@incremental`로 감싼 `transform_df`와 `transform_pandas`는 입력 DataFrame을 인자 없이 읽어 `added`를 사용하고 output 모드는 데코레이터가 정한다. `previous`나 다른 명시적 입출력 조합이 필요하면 입력/출력 객체를 직접 받는 `@transform`을 사용한다.

출력의 `current` filesystem만 writable이다. output을 읽는다고 해서 `previous` filesystem에도 쓸 수 있는 것은 아니다. Spark output의 `previous` 읽기에서 이전 transaction이 없고 schema도 주지 않으면 ValueError다. 빈 초기 상태를 정상 데이터로 다루려면 초기 schema를 설계한다.

증분 lightweight의 `path(mode=...)`에서 mode 지정은 `@incremental`과 v2 semantics를 함께 사용할 때 적용된다. 일부 accessor의 설명에 full view라는 표현이 있어도 인자의 기본값은 `added`이므로 호출 모드로 의도를 명시한다.

### 문서 내부의 모드 나열 상충

확인일의 `IncrementalTransformInput.dataframe`과 `filesystem` 설명은 current/previous/added만 지원한다고 쓰지만 parameter 목록은 modified/removed까지 나열한다. 지원 범위를 일관되게 확정할 수 없어 modified/removed 사용 가능성을 일반 계약으로 채택하지 않는다. Virtual Table의 별도 API 설명과도 구분한다. 실제 enrollment의 지원 버전과 호출 결과를 확인해야 한다.

## v2 semantics와 batch 경계

v2 semantics의 기본값은 False이나 공식 reference는 True 설정을 권장한다. non-Catalog 증분 입출력과 media sets는 v2 semantics에서만 지원한다. `Input(transaction_limit=...)`으로 한 job이 읽을 입력 transaction 수를 제한하는 기능도 v2 semantics를 요구한다.

입력 객체의 start/end transaction RID와 batch incremental configuration은 이번 실행의 처리 범위를 표현한다. 이를 현재 dataset 전체와 같은 것으로 취급하면 밀린 transaction을 아직 처리하지 않았는데 최신 상태를 따라잡았다고 오인할 수 있다. 마지막 문장은 범위 제한에서 도출한 운영 점검이다.

`strict_append=True`인 증분 실행은 underlying Foundry transaction을 APPEND로 만든다. 비증분 상태에서 강제 APPEND를 요구하면 `require_incremental=True`도 필요하다. 기존 파일은 데이터뿐 아니라 Parquet summary metadata와 Hadoop SUCCESS 같은 보조 파일도 덮어쓸 수 없다. append 모드의 금지를 데이터 파일로만 좁혀 해석하지 않는다.

## Iceberg changelog는 행 변경을 별도로 표현한다

`IncrementalTableTransformInput.changelog(identifier_columns=...)`는 마지막 처리 snapshot ID 이후의 view를 만든다. 확인일 기준 Iceberg table에서만 지원한다.

- 식별 column을 주면 identifier-based changelog이며 INSERT, DELETE, UPDATE_AFTER와 UPDATE_BEFORE를 표현한다.
- 식별 column을 주지 않으면 net-changes 방식으로 INSERT/DELETE를 상쇄해 순변경을 계산한다. 더 많은 shuffle이 발생하고 느릴 수 있다.
- 원래 schema에 `_change_type`, `_change_ordinal`, `_commit_snapshot_id`가 추가된다.
- 이 변경으로 output table을 갱신한다면 입력 changelog와 output 갱신의 식별 column이 맞아야 한다.

`dataframe(mode='changelog')`는 항상 net-changes를 만들며 deprecated다. 새 코드에서는 명시적 `changelog()`를 사용한다. Spark table의 dataframe에는 read options가 있고 기반 table에 따라 catalog와 Spark V2 identifier가 제공된다. table용 API와 일반 dataset용 API의 지원 모드를 섞지 않는다.

## 알고리즘과 운영 검증

추가 출력이 추가 입력만의 함수인 단순 append 계산은 기본 모드와 잘 맞는다. join, distinct와 aggregation은 이전 결과, 참조 데이터 변경과 삭제가 신규 결과에 미치는 영향을 따로 설계한다. decorator 존재만으로 결과 정합성을 결론내리지 않는다.

설계 점검은 최초 snapshot, 정상 증분, 참조 snapshot, semantic version 변경, retention/사용자 삭제, transaction batch 분할과 빈 이전 출력을 구분한다. context의 `is_incremental`로 실행 형태를 확인할 수 있으며 `abort_job`은 모든 출력 transaction을 중단한다. 단일 output의 abort 범위와 다르다.

이 검증 목록은 API 계약에서 도출한 점검이며 실제 Foundry 실행 시험의 통과 기록이 아니다.

## 출처

- [Palantir, incremental](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incremental)
- [Palantir, incrementallightweightinput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementallightweightinput)
- [Palantir, incrementallightweightoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementallightweightoutput)
- [Palantir, incrementaltabletransforminput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltabletransforminput)
- [Palantir, incrementaltransformcontext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltransformcontext)
- [Palantir, incrementaltransforminput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltransforminput)
- [Palantir, incrementaltransformoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltransformoutput)
- [Palantir, input](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-input)
- [Palantir, lightweight](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweight)
- [Palantir, lightweightcontext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightcontext)
- [Palantir, transform](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform)
- [Palantir, transform-df](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-df)
- [Palantir, transform-pandas](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-pandas)

## 관련 문서

- [[Palantir-Python-Transform-Definition]]
- [[Palantir-Python-Dataset-IO]]
- [[Palantir-Data-Pipeline-Operations]]
