---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Python Transform 정의"]
---

# Python Transform 정의와 실행 객체

Transform은 입력/출력 명세와 compute 함수를 묶는 실행 단위다. 명세 객체는 빌드 의존성과 JobSpec을 만들고, 실행 시 명세별 런타임 객체가 compute 인자로 주입된다. 데이터 처리 엔진, 입력 바인딩과 결과 쓰기 책임을 나누어 이해해야 한다.

## 데코레이터와 쓰기 책임

| 구성 | compute가 받는 것 | 결과를 쓰는 책임 |
|---|---|---|
| `@transform` | `TransformInput`, `TransformOutput`, 선택적 `TransformContext` | compute가 출력 객체에 직접 쓰기 |
| `@transform.using(...)` | single-node의 `LightweightInput`, `LightweightOutput`, 선택적 `LightweightContext` | compute가 직접 쓰기 |
| `@transform_df` | PySpark DataFrame | 하나의 반환 DataFrame을 단일 Output에 자동 저장 |
| `@transform_pandas` | pandas DataFrame | 단일 반환값을 저장, Spark 구성에서는 전후 변환 발생 |
| `@transform_polars` | Polars DataFrame | 단일 반환값을 저장하는 lightweight 실행 |

입출력 인자 이름은 데코레이터에 등록한 이름과 대응한다. 여러 출력, 파일 쓰기나 증분의 비기본 읽기/쓰기 모드가 필요하면 명시적 출력 객체를 받는 `transform` 계열을 사용한다. `transform_pandas`는 메모리에 들어가는 데이터에 사용하며 큰 입력은 Spark에서 먼저 줄이는 방식을 검토한다. pandas와 Polars는 `meta.yml`의 run dependency에 선언한다.

`transform.using`은 입출력 명세를 받고 `.with_resources(...)`, `.with_container(...)`로 자원과 컨테이너를 구성하는 builder를 반환한다. `ContainerTransform`은 single-node 실행 객체이며 `ContainerTransformsConfiguration`은 이전 이름과의 호환 경로다. `reference`는 파이프라인 내 식별자이며 compute 함수 이름 변경을 반영하도록 재계산된다.

## 명세 바인딩은 값 전달보다 앞선 계약이다

`Input`과 `Output`은 dataset RID 또는 절대 Compass 경로를 받는다. 별칭을 지정하지 않으면 unbound이며, 파라미터의 `json_value`가 `None`인 Transform은 JobSpec이 발행되지 않는다. 이는 실행 시 빈 데이터와 다른 상태다. 입력 branch를 생략하면 빌드 시 결정한다.

`InputSet`과 `OutputSet`은 여러 dataset을 하나의 인자로 묶는다. 별칭의 빈 목록은 허용되지 않으며 생략은 unbound다. 명세에 `description` 인자가 있다고 해서 모든 하위 명세가 이를 구현하는 것은 아니다. 확인일의 InputSet, Output과 OutputSet 설명 필드는 미구현으로 표시된다.

`FoundryInputParam`과 `FoundryOutputParam`은 직접 사용하기 위한 클래스가 아니다. 별칭을 JobSpec의 입력/출력 명세로 해석하며 RID를 쓰면 `defaultPath`를 전달하지 않는다. 입력 명세의 `properties`와 `failure_strategy`는 의존성/실패 처리를 표현한다.

### 값 파라미터와 확장 지점

- `BooleanParam`, `FloatParam`, `IntegerParam`, `StringParam`은 기본값과 설명을 받는다. StringParam은 `allowed_values`로 허용 문자열 집합을 제한할 수 있다.
- `Param.schema`는 유효한 JSON schema를 반환해야 한다. `json_value`는 JobSpec에 들어갈 값이다.
- `instance(context, json_value)`는 해석된 값을 실행 객체로 만들며 반환값이 compute에 주입된다. `ParamValueInput`은 명세 값의 wrapper다.
- `ParamContext`는 Foundry connector, RID별 input/output specs, branch, parameter overrides와 선택적 job RID를 제공한다.
- 입력의 `input_results`, 출력의 `output_results`는 RID별 결과를 구성해 TransformJobResult에 병합한다.
- lightweight용 사용자 파라미터는 해당 Foundry 기반 클래스도 상속하고 `lightweight_instance`를 구현한다. Spark의 객체 인터페이스 전부를 제공한다고 가정하지 않는다.

## 파이프라인 등록과 모듈 부수효과

`Pipeline.add_transforms`는 같은 Output alias를 쓰는 Transform이나 같은 compute function reference를 중복 등록하면 `ValueError`를 낸다. 여러 함수가 같은 출력에 각자 쓰도록 등록하는 방식으로 하나의 작업을 분산하지 않는다.

`discover_transforms`는 모듈 경로 아래를 재귀적으로 찾아 import한 다음 모듈 수준의 Transform 객체를 등록한다. 따라서 모듈 import 자체가 외부 호출이나 변경을 실행하도록 작성하지 않는다. `Pipeline.transforms`는 등록된 Transform 목록이다.

## Spark와 single-node 자원 설정

`@configure`는 Spark `Transform` 바깥에 적용한다. Spark profile, backend, 실행 제한 시간과 checkpoint용 출력을 설정하며 다른 객체를 감싸면 `TypeError`가 발생한다. backend의 `SPARK`와 `VELOX` 중 후자는 Spark native acceleration 경로다. 이는 lightweight와 다른 구분이다.

`allowed_run_duration`은 분 단위이며 초과하면 인프라가 실패 처리하고 재시도할 수 있다. 데이터 크기/분포가 바뀌거나 증분 작업이 snapshot으로 전환되면 소요 시간이 달라지므로 증분 Transform에 이 제한을 쓰지 말라는 경고가 있다. `checkpoint_outputs`를 생략하면 전체 출력이 후보이며 증분 출력에 checkpoint 쓰기가 부적절하면 대상을 따로 정한다.

`@lightweight`와 `configure(run_as_user=...)`는 3.85.0부터 deprecated로 표시된다. 신규 single-node 코드는 `transform.using` 경로를 우선 검토한다. single-node에는 Spark profile이 적용되지 않는다.

이전 `lightweight` 설정에서 `memory_mb`와 `memory_gb`는 함께 지정할 수 없다. BYOC 관련 인자를 쓰면 image와 tag를 모두 정해야 하며 image는 코드 저장소의 artifacts-backing repository에서 사용할 수 있어야 한다. 기본 entrypoint는 Python 환경을 준비해 compute를 실행한다. 별도 shell command를 쓰면 코드 위치와 실행 환경의 보장 범위를 확인한다.

## 실행 제어, 오류와 보안

Spark context는 `auth_header`, resolved conda environment, fallback branches, parameters와 Spark session을 제공한다. lightweight context는 `auth_header`, `is_incremental`, `abort_job`을 제공한다. `abort_job()`은 실행을 종료하고 모든 출력 트랜잭션을 중단한다. 출력 하나의 `abort()`와 범위가 다르다. 인증 header는 실행 권한이므로 로그나 결과 데이터에 남기지 않는다. 마지막 문장은 해당 값의 성격에서 도출한 보안 점검이다.

`LightweightException`은 호환성 검사 오류의 기반이며 `LightweightTypeError`, `LightweightValueError`, `LightweightNotImplementedError`는 각각 타입, 값과 미지원 기능을 구분한다. 이름이 비슷한 Spark 객체와 single-node 객체를 바꾸어 넣기 전에 기능 지원을 확인한다.

`Check(expectation, name, on_error=...)`는 기대 조건을 Data Health에 등록한다. name은 시간에 걸쳐 유지할 식별자이고 `on_error`는 `WARN` 또는 `FAIL`이다. Input의 업데이트 실패 정책은 `continue` 또는 `fail`이며 기본은 `fail`이다. 검증 실패 정책과 상류 데이터 갱신 실패 정책은 별도다.

보안 marking의 `stop_propagating=Markings(...)`와 조직 marking의 `stop_requiring=OrgMarkings(...)`는 서로 다른 선언이다. ID와 적용 branch를 명시한다. `Output.sever_permissions`와 OutputSet의 같은 인자는 3.85.0부터 deprecated이며 위 입력 선언을 사용하도록 안내된다. 이 명세가 임의의 사용자에게 declassification 권한까지 부여한다고 해석하지 않는다.

공식 API 계약을 확인한 기록이며 실제 Foundry 빌드, 권한 변경과 런타임 실패 시험은 수행하지 않았다.

## 출처

- [Palantir, transforms-python-library](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library)
- [Palantir, booleanparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-booleanparam)
- [Palantir, check](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-check)
- [Palantir, computebackend](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-computebackend)
- [Palantir, configure](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-configure)
- [Palantir, containertransform](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-containertransform)
- [Palantir, containertransformsconfiguration](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-containertransformsconfiguration)
- [Palantir, floatparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-floatparam)
- [Palantir, foundryinputparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-foundryinputparam)
- [Palantir, foundryoutputparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-foundryoutputparam)
- [Palantir, input](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-input)
- [Palantir, inputset](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-inputset)
- [Palantir, integerparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-integerparam)
- [Palantir, lightweight](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweight)
- [Palantir, lightweightcontext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightcontext)
- [Palantir, lightweightexception](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightexception)
- [Palantir, lightweightinputparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinputparam)
- [Palantir, lightweightnotimplementederror](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightnotimplementederror)
- [Palantir, lightweightoutputparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutputparam)
- [Palantir, lightweighttypeerror](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweighttypeerror)
- [Palantir, lightweightvalueerror](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightvalueerror)
- [Palantir, markings](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-markings)
- [Palantir, orgmarkings](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-orgmarkings)
- [Palantir, output](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-output)
- [Palantir, outputset](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-outputset)
- [Palantir, param](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-param)
- [Palantir, paramcontext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-paramcontext)
- [Palantir, paramvalueinput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-paramvalueinput)
- [Palantir, pipeline](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-pipeline)
- [Palantir, stringparam](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-stringparam)
- [Palantir, transform](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform)
- [Palantir, transform-df](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-df)
- [Palantir, transform-pandas](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-pandas)
- [Palantir, transform-polars](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-polars)
- [Palantir, transformcontext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformcontext)

## 관련 문서

- [[Palantir-Python-Dataset-IO]]
- [[Palantir-Python-Incremental-Contract]]
- [[Palantir-Data-Pipeline-Operations]]
