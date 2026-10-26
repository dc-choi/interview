---
tags: [java, ai, inference, onnx, panama, babylon, gpu]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["Java AI 통합 경계", "Java AI Integration Boundaries"]
---

# Java AI 통합의 실행 경계

Java에서 AI를 사용한다는 말은 원격 모델 호출, 로컬 모델 실행, 모델 계산 코드 작성과 학습 구현을 모두 가리킬 수 있다. 어떤 층을 맡길지 먼저 정해야 필요한 런타임과 운영 책임을 구분할 수 있다.

## 호출과 계산을 나누어 본다

| 층 | Java가 맡는 일 | 따로 확인할 조건 |
|---|---|---|
| 원격 추론과 도구 연결 | HTTP 요청, 응답 처리와 업무 흐름 조정 | 모델 API의 인증, 제한, 오류와 도구 실행 권한 |
| 로컬 추론 | 내보낸 모델을 추론 런타임으로 실행 | 모델 입출력, 네이티브 라이브러리와 실행 장치 |
| 계산 코드 변환 | Java로 표현한 계산을 다른 실행 모델로 변환 | 지원하는 Java 부분집합, backend와 데이터 이동 |
| 학습 구현 | 학습 계산과 가중치 갱신을 구성 | 미분, 연산 지원과 학습 프레임워크의 구현 범위 |

이 표는 설계 판단을 위한 구분이다. 에이전트가 Java로 작성됐다는 사실만으로 모델 계산이나 학습도 JVM에서 수행된다고 판단하지 않는다.

## 원격 모델 호출은 서비스 통합으로 시작한다

JDK 22의 `HttpClient`는 동기 `send`와 비동기 `sendAsync`를 제공하며, 후자는 `CompletableFuture`를 반환한다. 따라서 HTTP 모델 API와 연결할 수 있지만, HTTP 응답 수신은 업무 성공이나 도구 실행 승인을 뜻하지 않는다. 응답 해석, 오류 처리와 실제 업무 변경은 애플리케이션이 설계한다.

운영 제안은 기존 백엔드의 인증, 시간 제한과 장애 관측 경계를 유지하면서 모델 호출을 붙이는 것이다. 모델이 제안한 도구 인자는 실제 실행 전에 권한과 입력을 검증한다. Java 언어 선택만으로 이 검증이 해결되지는 않는다.

## 로컬 추론은 모델 계약과 자원 수명을 함께 다룬다

ONNX Runtime의 Java binding은 JVM에서 ONNX 모델의 추론을 호출한다. 공식 시작 절차는 `OrtEnvironment`와 `OrtSession`을 만들고 `OrtSession.run`에 모델 입력 이름과 텐서를 전달하는 흐름이다. 입력 이름은 `getInputNames()`나 `getInputInfo()`로 확인한다.

`OrtSession.Result`는 `AutoCloseable`이며 `close()`는 결과 객체가 소유한 `OnnxValue`만 닫는다. 호출자가 `run`에 제공한 pinned output은 닫지 않으므로 호출자가 별도로 수명을 관리하고 사용을 마친 뒤 해제해야 한다. 출력별 소유권은 결과를 닫기 전에 `isResultOwner(int)`로 확인할 수 있다. 결과 처리 범위와 소유자별 해제 시점을 맞춘다.

CPU와 GPU용 배포물, 지원 플랫폼은 구분되므로 의존성을 추가했다는 사실만으로 GPU 사용을 확정하지 않는다.

이 경로는 이미 학습한 모델을 실행하는 선택지다. 학습 프레임워크를 Java로 다시 구현해야 하는 조건이 아니다. 전처리, tokenizer와 출력 해석이 원래 모델과 맞는지는 [[OpenSearch-Vector-Search-Embedding-Operations|임베딩 운영의 기준 구현 대조]]처럼 별도로 확인한다.

## Panama의 외부 호출과 Babylon의 코드 변환을 구분한다

JDK 22의 Foreign Function and Memory API는 `java.lang.foreign`에 있으며 Java 런타임 밖의 함수와 메모리에 접근하는 기능을 제공한다. 외부 라이브러리를 호출하는 경계와 Java 계산 자체를 GPU용 코드로 바꾸는 경계는 다르다. 기존 ONNX Runtime Java binding을 쓰는 방법과 FFM으로 직접 연동하는 방법도 같은 구현이라고 가정하지 않는다.

2026-10-22 확인한 Babylon 저장소의 `code-reflection` 브랜치는 `jdk.incubator.code` 모듈을 안내한다. 의존 코드를 컴파일하거나 실행할 때 해당 모듈을 명시적으로 추가한다. 이 개발 브랜치의 기능을 일반 JDK에 이미 포함된 확정 기능으로 취급하지 않는다.

HAT(Heterogeneous Accelerator Toolkit)는 Babylon의 code reflection으로 데이터 병렬 계산을 가속기에 전달하는 도구다. 공식 README는 kernel과 compute graph API, Panama FFM을 이용한 데이터 매핑, OpenCL C, CUDA C와 Java backend를 설명한다. HAT는 Babylon JDK를 요구하며 GPU 실행에는 해당 SDK도 필요하다.

HAT 예제의 kernel은 제한된 Java 부분집합을 사용하고 코드 모델을 최적화한 뒤 OpenCL/CUDA 코드를 생성한다. 임의의 Java 서비스 전체가 수정 없이 GPU에서 실행된다는 뜻이 아니다. 이 문서는 공개 문서의 계약을 확인했으며 HAT를 빌드하거나 성능을 재현하지 않았다.

## 선택과 검증 질문

### HAT의 애플리케이션, compute와 kernel 경계

2026-10-27에 확인한 HAT README의 SIMT 예제는 다음 세 층을 구분한다. [[Java-Reflection#멤버 조회와 code reflection을 구분한다|Code reflection]]은 계산을 모델로 다루는 기반이며, 실행 장치 선택과 데이터 전달은 HAT의 별도 책임이다.

| 층 | 맡는 일 |
|---|---|
| Java 애플리케이션 | `Accelerator`와 데이터를 준비하고 compute를 호출한다 |
| Compute | `NDRange`로 실행 범위를 정하고 kernel을 dispatch한다. 여러 kernel을 계산 그래프로 조합할 수 있다 |
| Kernel | 가속기 스레드 하나가 수행할 계산을 제한된 Java 부분집합으로 표현한다 |

커널 예제는 `GIX()`로 전역 스레드 인덱스를 얻고 배열 길이보다 작은지 검사한다. 실행 범위 설정과 배열 접근의 경계 검사는 구분한다. HAT가 코드 모델을 최적화해 OpenCL/CUDA 코드를 생성해도, 계산의 인덱스와 결과 검증은 애플리케이션 설계에 남는다.

적용 시에는 같은 입력의 CPU 기준 결과와 비교한 뒤 kernel 시간과 데이터 이동을 포함한 전체 시간을 나누어 측정한다. Java backend의 실행 성공은 GPU backend의 실행이나 성능을 입증하지 않는다. 이 절은 공식 예제의 구조를 확인한 것이며 GPU 실행과 발표의 성능 수치는 재현하지 않았다.

### 통합 경로를 고를 때

다음은 위 기능 경계에 기반한 적용 제안이다.

- 필요한 것이 업무 흐름과 원격 모델 연결이면 HTTP 통합부터 평가한다. GPU 프로그래밍을 선행 과제로 만들지 않는다.
- 로컬 실행이 필요하면 기존 ONNX 모델과 추론 런타임의 호환성을 먼저 확인한다. 원격 API와 로컬 실행은 데이터 이동, 배포와 장애 책임이 다르다.
- 계산 코드 자체가 병목일 때 코드 변환과 가속기 경로를 검토한다. kernel 시간뿐 아니라 CPU와 GPU 사이의 데이터 이동을 포함해 측정한다.
- 학습이 목적이면 추론 성공을 학습 지원 증거로 삼지 않는다. 필요한 연산과 미분, 가중치 갱신 경로를 따로 확인한다.

## 출처

- [Oracle Java SE 22, HttpClient](https://docs.oracle.com/en/java/javase/22/docs/api/java.net.http/java/net/http/HttpClient.html) — 동기 및 비동기 HTTP 호출 계약.
- [ONNX Runtime, Get Started with ORT for Java](https://onnxruntime.ai/docs/get-started/with-java.html) — 모델 실행, 입력 이름, 결과 수명과 배포물 구분.
- [ONNX Runtime Java API, OrtSession.Result](https://onnxruntime.ai/docs/api/java/ai/onnxruntime/OrtSession.Result.html) — 소유한 출력만 해제하는 `close()`, pinned output 예외와 `isResultOwner(int)`.
- [Oracle Java SE 22, Foreign Function and Memory API](https://docs.oracle.com/en/java/javase/22/core/foreign-function-and-memory-api.html) — 외부 함수와 메모리 접근.
- [Babylon code-reflection README — OpenJDK](https://github.com/openjdk/babylon/blob/code-reflection/README.md) — 개발 브랜치의 incubating 모듈.
- [Heterogeneous Accelerator Toolkit — OpenJDK](https://github.com/openjdk/babylon/blob/code-reflection/hat/README.md) — 실행 전제, backend와 kernel의 제한된 Java 범위.
- [Reflect, Transform, Accelerate: Bringing GPU Computing to Java — Java, Juan Fumero](https://www.youtube.com/watch?v=_1fi5GaWXxY) — 17:31~28:48의 코드 모델과 실행 계층. 전사문의 coreflexion은 code reflection으로 교정하고, API 표기는 공식 HAT 예제와 대조했다.
- [How does Java fit into the world of AI—and how can it become an even better fit? — Java, Paul Sandoz](https://www.youtube.com/watch?v=rL3sWS_8b-g) — 10:42~24:33의 실행 층과 외부 프로그래밍 모델 구분. 전사문의 Onyx/ONIX는 공식 표기 ONNX로 교정했으며 시연 성능과 전망은 일반 사실로 사용하지 않았다.

## 관련 문서

- [[Java-Reflection|Java reflection과 code reflection의 구분]]
- [[Java-Spring-Stack-Migration|Java와 Spring 스택 전환]] — 플랫폼 변경과 AI 기능 도입 분리
- [[OpenSearch-Vector-Search-Embedding-Operations|임베딩 추론 운영]] — 모델 입출력과 기준 구현 대조
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 실행 장치와 지연 측정
