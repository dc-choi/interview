---
tags: [palantir, compute-modules, functions, sdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compute Module 함수 스키마와 client"]
---

# Compute Module 함수 스키마와 client

컨테이너에 함수가 존재하는 것, runtime에서 endpoint로 발견되는 것, Foundry의 callable function으로 import하는 것은 별도 단계다. 실행 중 responsive한 module에서 schema를 발견한 뒤 Functions UI에서 import한다. API name은 consumer의 locator이며 변경하면 호출 코드가 깨진다.

## 스키마는 배포 버전과 별개 계약이다

수동 등록은 function name, named inputs, output과 API name을 지정한다. 입력은 각 named property를 가진 JSON object로 전달된다. API name 형식은 `com.<namespace>.computemodules.<MyApiName>`이며 namespace는 lowercase, 마지막 이름은 camel case이고 special character를 허용하지 않는다. 문서의 대문자 시작 예제를 naming validation보다 우선하지 않는다.

등록 버전은 `0.0.0`이며 수정하면 덮어쓴다. 최신 published query만 지원하므로 image tag를 바꾼다고 함수 schema의 이전 버전이 유지되는 것은 아니다. 소비자가 기대하는 input/output을 함께 검토한다.

| SDK | 함수와 schema 정의 |
|---|---|
| Python | `@function`, context와 event 순서. TypedDict/dataclass 또는 class와 constructor 양쪽 type hint |
| Java | ComputeModule builder의 function reference, input class, output class, endpoint name. 첫 인자는 Context. Record 또는 Jackson @JsonProperty class와 기본 생성자 |
| TypeScript | register와 TypeBox input/output definitions. SDK가 요구하는 callback signature에 맞춤 |

Python 자동 추론 입력은 complex type으로 감싼다. 단일 primitive, type hint 없는 class, constructor의 `*args`/`**kwargs`는 자동 추론 경계에 걸릴 수 있다. Java의 primitive hello 예제를 Python의 complex-input 규칙으로 일반화하거나 반대로 적용하지 않는다. Schema가 감지되어도 Foundry import 완료 여부를 따로 확인한다.

Wire type은 timestamp가 epoch milliseconds integer, date/decimal/binary가 string인 식으로 언어 타입과 다르다. Functions type 표의 `str -> Byte`, datetime의 Date/Timestamp 중복은 일반 Python string 전체가 Byte라는 근거가 아니다. 실제 SDK inference와 등록 schema를 대조한다. JSON 직렬화가 불가능한 반환값이나 비유한 float도 정상 전송으로 가정하지 않는다.

## Streaming은 iterable의 전송 방법이다

Python은 `@function(streaming=True)`로 dict를 제외한 Iterable을 element별 JSON stream으로 보낸다. 반환 type도 Iterable 계열로 선언해 Array로 등록한다. Decorator가 없으면 iterable 전체를 하나의 JSON으로 보내므로 list는 가능해도 generator는 실행 시 직렬화에 실패한다.

TypeScript는 output을 `Type.Array(...)`로 선언하고 registerStreaming에서 각 write가 유효한 JSON을 생성하도록 하며 종료 시 end한다. SDK별 streaming API를 같은 signature로 섞지 않는다.

## Custom client의 필수 완료 보고

지원 언어에서는 SDK가 polling/동시성/직렬화를 맡도록 한다. Custom client는 내부 service의 token 파일과 CA를 읽고 GET job을 반복한다. HTTP 200이면 jobId/queryType/query를 처리하고, 204면 작업 없이 다음 long poll로 간다. 초기 service connection refused에는 재시도가 필요할 수 있다.

모든 수신 job에 결과를 POST해야 한다. 완료를 보고하지 않으면 새 작업 routing이 멈출 수 있다. Result는 job ID endpoint에 octet-stream, schema는 JSON array로 전송하며 성공 응답 204를 확인한다. Schema 등록은 startup에서 main loop 전에 수행한다. MAX_CONCURRENT_TASKS는 replica 시작 시 thread pool 등 구현에 반영하고 실행 중 값 변경이 자동 적용된다고 가정하지 않는다.

예제 custom client는 schema POST 상태를 확인하지 않고 등록 완료로 표시하거나 result 실패를 log만 남길 수 있다. 예외 후 loop만 계속 돌면 해당 job의 완료가 유실될 수 있다. 오류 결과 보고, 제한된 재시도와 idempotency를 별도로 설계한다. 단일 schema object를 POST하는 예제와 endpoint의 array 계약도 대조한다.

## HTTP server 연결과 호출 경로 제한

실험 단계의 server integration은 image `server.openapi` label에서 OAS 3.0 이상을 읽는다. localhost HTTP server 하나, operationId, GET/PUT/POST/DELETE, schema가 있는 parameter, endpoint별 JSON response code 하나가 필요하다. Cookie parameter, anyOf/oneOf/allOf/multiple types는 지원 범위 밖이다. 생성한 함수 정의를 image schema와 독립적으로 수정하지 않는다.

TypeScript function에서 호출하려면 resource generation, Query Functions import와 workspace rebuild가 필요하다. Import 과정의 Ontology 선택이 compute module 자체를 그 Ontology에 종속시키지는 않는다. Live preview는 같은 Project와 실행 중 module이 필요하다. Function-executor를 경유하는 이 경로는 5분을 넘으면 timeout하므로 module 자체의 모든 호출 시간 제한으로 확대하지 않는다.

## 출처

- [Palantir, Functions](https://www.palantir.com/docs/foundry/compute-modules/functions)
- [Palantir, Custom client](https://www.palantir.com/docs/foundry/compute-modules/advanced-custom-client)
- [Palantir, Python SDK](https://www.palantir.com/docs/foundry/compute-modules/python-sdk)
- [Palantir, Java SDK](https://www.palantir.com/docs/foundry/compute-modules/java-sdk)
- [Palantir, TypeScript SDK](https://www.palantir.com/docs/foundry/compute-modules/typescript-sdk)

## 관련 문서

- [[Palantir-Compute-Execution-and-Identity|실행 권한]]
- [[Palantir-Compute-Containers-and-Distribution|이미지와 schema 배포]]
