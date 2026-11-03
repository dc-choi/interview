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

### Hugging Face의 모델 호출과 앱 배포를 구분한다

2026-11-02 공식 문서 부분 대조 기준이다. Hub에서 모델을 찾는 일, 그 모델을 추론 서비스로 배포하는 일과 Java 애플리케이션을 실행하는 일은 서로 다른 선택이다.

| 선택지 | 맡는 역할 | Java 애플리케이션에서 확인할 경계 |
|---|---|---|
| Inference Providers | 여러 공급자의 모델을 API로 호출하는 serverless 추론 접근 | 공급자별 지원 task와 모델을 확인한다. Hub에 있다는 사실만으로 호출 가능하다고 가정하지 않는다 |
| Inference Endpoints | 모델과 추론 엔진을 선택해 전용 관리형 인프라에 배포 | 모델 파일, 추론 엔진과 서비스 인프라를 나누어 검토한다. 앱의 HTTP 호출 코드는 별도다 |
| Docker Spaces | Dockerfile로 정의한 애플리케이션 실행 환경 | 앱 컨테이너의 실행과 모델 호출 성공을 각각 검증한다. 앱 배포만으로 모델도 같은 컨테이너에서 실행되는 것은 아니다 |

Docker Space는 README의 YAML에서 `sdk: docker`를 지정하고 `app_port`로 외부에 노출할 앱 포트를 정한다. 기본 포트는 7860이다. Java 웹 앱을 올릴 때는 실제 서버가 듣는 포트와 이 값을 맞춘다(적용 제안). 내부에서 여러 포트를 쓰는 것과 외부에 여러 포트를 노출하는 것은 다르며, 여러 내부 서비스를 공개할 때 공식 문서는 단일 외부 포트에서 요청을 나누는 reverse proxy 구성을 제시한다.

적용 순서는 작은 입력으로 모델 API를 검증한 뒤 앱 실행 환경을 선택하는 것이다. 원격 모델 호출을 선택했다면 앱과 모델 서버를 따로 배포할 수 있으므로, Java 통합을 위해 학습 코드나 모델 런타임을 JVM 안에 옮길 필요가 있는지부터 확인한다(설계 제안).

이 절은 서비스 역할과 Docker Spaces 설정의 문서 대조다. Java 앱 배포, 모델 호출, 성능과 비용은 시험하지 않았고 기존 ONNX와 HAT 절 전체의 검증일은 갱신하지 않았다.

### Spring AI로 로컬 모델 서버에 연결한다

2026-11-04 Spring AI 2.0.2 Reference의 Ollama Chat 문서를 부분 대조했다. 이 경로는 Java 앱이 별도 Ollama 서버를 호출하는 방식이다. 아래의 ONNX Runtime Java binding과 실행 경계를 구분한다.

- `spring-ai-starter-model-ollama`는 Spring Boot의 Ollama 통합 자동 설정을 제공한다. 먼저 접근 가능한 Ollama 인스턴스와 사용할 모델이 필요하다.
- `spring.ai.ollama.base-url`은 서버 주소이며 기본값은 `http://localhost:11434`다. 주소를 바꾸는 일과 모델 가중치를 준비하는 일은 별도다.
- 시작 시 모델 다운로드 전략인 `spring.ai.ollama.init.pull-model-strategy`의 기본값은 `never`다. 자동 다운로드를 켜면 모델 준비까지 앱 초기화가 기다리므로, 운영 환경에서는 필요한 모델을 미리 확보하는 방식을 검토한다.
- `OllamaChatModel`은 도구 호출을 지원하지만 모델이 직접 도구를 실행하지는 않는다. 실행은 Spring AI가 맡는다. 문서의 최소 Ollama 버전은 도구 호출 0.2.8, 스트리밍 도구 호출 0.4.6이다.

적용 제안: 모델과 서버를 바꿀 때 일반 텍스트 응답, 도구 인자와 실행 권한, 스트리밍 종료를 각각 확인한다. 공통 호출 추상화가 있어도 임의의 모델과 서버에서 같은 기능이나 정확도를 보장하는 것으로 확대하지 않는다. 로컬 서버 호출 성공을 JVM 내부 추론이나 학습 지원으로 해석하지 않는다.

이 절은 문서상의 연결과 초기화 조건만 확인했다. 실제 서버 연결, 모델 실행과 성능은 시험하지 않았으며 기존 절의 검증일은 유지한다.

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

- [Spring AI 2.0.2 Reference, Ollama Chat](https://docs.spring.io/spring-ai/reference/api/chat/ollama-chat.html) — 서버 연결, 모델 준비와 도구 실행 경계(2026-11-04 부분 대조).
- [Hugging Face, Inference Providers](https://huggingface.co/docs/inference-providers/index) — 공급자별 추론 접근과 지원 task.
- [Hugging Face, About Inference Endpoints](https://huggingface.co/docs/inference-endpoints/about) — 모델 파일, 추론 엔진과 관리형 인프라의 구분.
- [Hugging Face, Docker Spaces](https://huggingface.co/docs/hub/spaces-sdks-docker) — Docker 앱 실행, 포트 설정과 reverse proxy.
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
