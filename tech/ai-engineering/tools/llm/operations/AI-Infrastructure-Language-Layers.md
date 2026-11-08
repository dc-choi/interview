---
tags: [ai, infrastructure, programming-language, rust, python, pyo3, safetensors, serving]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Infrastructure Language Layers", "AI 서비스 스택의 언어 계층", "AI 인프라와 Rust", "PyO3와 safetensors"]
---

# AI 서비스 스택의 언어 계층 — Python 아래에서 네이티브 구현이 맡는 일

AI 서비스는 한 언어로 끝나지 않는다. 연구와 학습 코드, 요청 처리 경로, 모델 파일 적재, GPU 연산 커널은 지켜야 할 조건이 서로 달라서 계층마다 쓰는 언어가 갈린다. 나누는 기준은 언어의 유행이 아니라 그 계층의 제약이다. 언어 일반의 메모리 관리, 실행 경로와 교체 효과의 상한은 [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]에 있고, 아래는 그 기준을 AI 스택의 계층에 적용한다.

## 계층마다 우선하는 조건

| 계층 | 하는 일 | 우선하는 조건 | 확인한 예 |
|---|---|---|---|
| 연구, 학습과 애플리케이션 | 모델 정의, 데이터 처리, 학습과 평가 스크립트 | 실험을 고치고 다시 돌리는 속도, 라이브러리 생태계 | Transformers와 PyTorch의 Python API |
| 요청 처리와 데이터 준비 | 요청 수신, 토큰화, 배치 스케줄링, 응답 스트리밍, 모델 파일 적재 | 꼬리 지연, 메모리 안전, 동시성 | Rust로 구현한 Tokenizers와 safetensors |
| 에이전트 런타임과 SDK | 애플리케이션과 서비스에 내장돼 모델 제공자 API를 호출하는 에이전트 하네스 | 클라이언트별 프로세스 수와 메모리, 장애 경계 | TypeScript에서 Rust로 다시 쓴 Copilot CLI와 SDK의 에이전트 런타임 |
| 분산 실행과 운영 제어 | 학습과 추론 인프라 운영, 하드웨어 고장 식별과 자동 처리 | 확장성, 신뢰성, 유지보수 | Kubernetes, Rust, JAX 기반의 xAI 학습 및 추론 스택(2023년 발표, Rust를 인프라 언어로 평가했지만 고장 처리 시스템의 구현 언어는 밝히지 않음) |
| GPU 연산 커널 | 행렬곱, attention처럼 가속기에서 병렬로 실행하는 함수 | 하드웨어 성능과 벤더 도구 | CUDA C++ 커널, PyTorch의 C++ 텐서 라이브러리 ATen, Triton |

표는 역할을 나누는 판단 기준이다. 같은 계층도 프로젝트마다 언어가 다르고, 한 언어가 한 계층을 독점한다는 뜻은 아니다.

## 요청 처리 경로의 꼬리 지연과 GC

LLM 요청은 GPU에 닿기 전후로 CPU에서 도는 단계를 거친다. 서버가 요청을 받고, 토크나이저가 텍스트를 토큰 ID로 바꾸고, 스케줄러가 다른 요청과 묶어 배치를 만들고, 생성한 토큰을 텍스트로 바꿔 스트리밍한다. 엔진과 서비스의 책임 분담은 [[LLM-Inference-Serving-Engines#엔진과 서비스의 책임을 나눈다|추론 서빙 엔진의 책임 표]]를 따른다.

사용자가 겪는 지연 문제는 평균보다 느린 꼬리에서 드러난다([[Latency-Optimization#측정과 검증 — 평균이 아니라 꼬리를 본다|꼬리 지연 측정]]). Dean과 Barroso의 The Tail at Scale(CACM 2013년 2월호)은 다음 근거를 든다.

- **팬아웃이 꼬리를 키운다:** 보통 10ms에 응답하지만 99번째 백분위 지연이 1초인 서버가 있을 때, 그 서버 하나만 거치는 요청은 100건 중 1건이 느리다. 요청 하나가 이런 서버 100대의 응답을 모두 모아야 하면 요청의 63%가 1초를 넘는다. 후보 생성을 여러 source로 팬아웃하는 추천 시스템 서빙에도 같은 구조가 있다([[Recommendation-System-Serving-Operations#End-to-end Deadline|추천 시스템의 단계별 deadline]]).
- **변동의 원인은 여러 겹이다:** 공유 자원 경합, 백그라운드 데몬, 분산 파일시스템의 데이터 재구성과 BigTable 같은 저장 시스템의 주기적 로그 압축 같은 유지보수 작업, 중간 서버와 네트워크 스위치의 여러 단계 큐가 지연을 흔든다. GC 언어의 주기적 garbage collection도 이 유지보수 작업의 하나로 들어 있다.
- **언어를 바꾸지 않는 완화도 있다:** 같은 글은 GC 언어의 garbage collector 활동도 관리할 백그라운드 작업의 예로 들고, 이런 작업을 조절하고, 무거운 작업을 작게 나누고, 전체 부하가 낮을 때 실행하는 조합이 대화형 요청의 지연에 미치는 영향을 줄이는 경우가 많다고 설명한다.

다음은 이를 언어 선택에 적용한 판단이다. GC가 없는 언어는 GC 정지라는 원인 하나를 없애지만 공유 자원 경합과 큐 대기는 언어와 무관하게 남는다. 같은 부하에서 단계별 p99를 재고 GC 기록과 요청 지연의 시간축을 맞춰 본 뒤 교체를 판단한다. 짧은 pause 목표와 할당 정체의 구분은 [[JVM-GC#짧은 GC pause와 서비스 지연을 구분한다|JVM GC]]에 있다. 요청 시간의 대부분이 GPU 연산이나 외부 대기라면 CPU 쪽 구현을 바꿔 줄일 수 있는 몫에 상한이 있다([[Programming-Language-Landscape#언어 교체로 얻는 속도의 상한|언어 교체의 상한]]).

## 메모리 안전과 data race를 컴파일 시점에 검사한다

추론 서버를 한 프로세스의 여러 스레드로 구성하면 새 요청 접수, 배치 구성과 여러 사용자에게 보내는 토큰 스트리밍을 동시에 처리하면서 요청 큐와 배치 상태 같은 데이터를 스레드끼리 공유한다. 서버와 엔진을 별도 프로세스로 나누는 구성에서는 공유 지점의 일부가 프로세스 사이의 메시지 경계로 옮겨 간다(적용 판단).

- **data race:** 둘 이상의 스레드가 같은 메모리 위치에 동시에 접근하고, 그중 하나 이상이 쓰기이며, 하나 이상이 동기화되지 않은 경우다. C++에서는 data race가 생기면 프로그램의 동작이 정의되지 않는다. 실행 순서에 따라 나타나므로 실행한 경로만 검사하는 도구는 모든 경우를 찾지 못한다([[Go-Concurrency-Patterns-and-Pitfalls#공유 상태: data race와 Mutex|Go race detector의 범위]]).
- **안전한 Rust의 보장:** 안전한 Rust는 data race가 없음을 보장한다. 스레드 사이 소유권 이전은 `Send`, 여러 스레드에서의 참조는 `Sync` 마커 트레이트로 표현한다. 두 스레드가 참조 카운트를 동시에 갱신할 수 있는 `Rc<T>`는 `Send`가 아니므로 다른 스레드로 넘기는 코드가 컴파일되지 않는다. 이 트레이트를 직접 구현하려면 unsafe 코드가 필요하다.
- **보장 밖:** 일반적인 경쟁 상태(race condition)와 데드락은 막지 않는다. 경쟁 상태만으로 메모리 안전이 깨지지는 않지만 unsafe 코드와 결합하면 깨질 수 있다. unsafe와 FFI 경계의 계약은 [[Rust-Soundness-and-Lifetime-Boundaries#안전한 인터페이스의 계약|Rust 건전성]]을 따른다.
- **비용:** 규칙을 어기는 코드는 컴파일되지 않으므로 익숙해지는 데 시간이 든다([[Programming-Language-Landscape#메모리 관리 방식|메모리 관리 방식 비교]]). 상시 운영하는 서버라면 이 결함 유형을 배포 전에 거르는 이득과 학습 비용을 함께 비교한다(적용 판단).

## Python에서 네이티브 구현을 부르는 두 방식

Python 사용자는 대부분 Python 함수를 호출하고, 계산은 그 아래의 네이티브 구현이 맡는다. NumPy, Tokenizers, pydantic-core와 uv의 구분은 [[Programming-Language-Landscape#플랫폼과 생태계가 좁히는 선택|플랫폼과 생태계가 좁히는 선택]]에 있고, 여기서는 Python과 네이티브 코드를 잇는 방식을 본다.

### Python 확장 모듈: PyO3

- PyO3는 Python용 Rust 바인딩으로, 네이티브 Python 확장 모듈을 만드는 도구를 포함한다. maturin은 Rust 기반 Python 패키지를 빌드하고 배포한다. 2026-11-08 PyO3 0.30.1 가이드 기준 CPython 3.9 이상, PyPy 7.3(Python 3.11 이상), GraalPy 25.4 이상(Python 3.13 이상)을 지원한다.
- 사용자는 일반 패키지처럼 설치하고 `import`한다. 2026-11-08 safetensors 저장소 main 브랜치의 Python 바인딩은 Rust `safetensors` 크레이트를 PyO3로 감싼 `cdylib` 확장 모듈이다(Cargo 라이브러리 이름 `safetensors_rust`).
- GIL이 있는 CPython 빌드에서는 한 번에 한 스레드만 인터프리터를 실행하므로 순수 Python 스레드로는 CPU 계산을 병렬로 나누기 어렵다. 확장 모듈은 Rust 작업을 하는 동안 `Python::detach`로 GIL을 놓아 다른 Python 스레드가 실행되게 할 수 있다.
- **사례: Transformers의 토크나이저.** 2026-11-08 Transformers v5.22.2 문서 기준 `AutoTokenizer.from_pretrained()`는 모델 설정의 토크나이저 클래스를 읽어 백엔드를 고르고, 대부분의 모델은 Rust 기반 Tokenizers 라이브러리를 쓰는 `TokenizersBackend`로 정해진다. 배치 토큰화에서는 이 Rust 백엔드가 작업을 여러 스레드로 나눈다. SentencePiece가 필요한 모델은 `SentencePieceBackend`, 특수한 토크나이저가 필요한 모델은 순수 Python인 `PythonBackend`, Mistral과 Pixtral 모델은 mistral-common을 쓰는 `MistralCommonBackend`(mistral-common이 없으면 `TokenizersBackend`로 대체)를 쓰므로 실제 백엔드는 `tokenizer.backend` 속성으로 확인한다. Rust 기반 토크나이저는 원문의 문자, 단어 위치와 토큰 사이를 대응시키는 메서드도 제공한다.
- Tokenizers 공식 문서는 Rust 구현 덕분에 서버 CPU에서 텍스트 1GB를 20초 안에 토큰화한다고 밝히지만, 측정한 CPU와 토크나이저 종류는 적지 않는다.

### C ABI 공유 라이브러리: 별도 프로세스를 없애는 통합

Rust의 `cdylib` 형식은 다른 언어에서 적재하는 동적 라이브러리(Linux `.so`, macOS `.dylib`, Windows `.dll`)를 만든다. `extern "C"`로 ABI를 지정하고 `#[unsafe(no_mangle)]`로 이름 변환을 끈 함수는 다른 언어가 호출할 수 있다. `no_mangle`, `export_name`, `link_section`의 `unsafe(...)` 표기는 Rust 1.82부터 모든 에디션에서 쓸 수 있고 2024 에디션부터 필수라 이전 에디션 코드에는 `#[no_mangle]`로 남아 있을 수 있다. 이름 변환을 끄면 라이브러리 사이의 이름 충돌을 피할 책임이 작성자에게 넘어온다.

GitHub의 Copilot 런타임 재작성(2026-09-16 게시, 2026-09-23 갱신된 공식 글 기준)이 이 방식의 사례다.

- **이전 구조:** 런타임은 Node.js와 V8 위의 TypeScript였다. 각 언어 SDK는 Copilot CLI를 headless 모드의 하위 프로세스로 띄웠고 `CopilotClient`를 만들 때마다 프로세스가 하나 더 생겼다. 그래서 C#, Python, Go, Java, Rust SDK는 클라이언트마다 최소 100 MB 정도의 작업 집합(working set)을 쓰는 두 번째 언어 런타임을 떠안았다.
- **이후 구조:** 배포하는 `runtime.node`는 일반 플랫폼 공유 라이브러리이고 C ABI 진입점이 있어 어느 언어든 자기 프로세스에 적재해 FFI로 호출할 수 있다. SDK는 TypeScript, Python, Go, C#, Java, Rust로 제공된다. 프로세스 내부 진입점은 글 작성 시점에 선택 기능(opt-in)이었고, 포팅하는 동안 기본은 하위 프로세스 방식이었다.
- **측정과 읽는 법:** C# SDK로 클라이언트 10개를 돌리는 동안 기준선 대비 늘어난 상주 private 메모리(resident private memory)의 최고치는 포팅 전 구성 1,383 MB, Rust 별도 프로세스 247 MB, Rust 프로세스 내부 126 MB였다. 247 MB와 126 MB는 같은 8월 21일 결과에서 Rust 런타임을 별도 프로세스 서버와 FFI를 통한 프로세스 내부 적재로 각각 실행한 값이라, 두 값의 차이는 실행 방식의 차이로 읽을 수 있다(적용 판단). 1,383 MB와 247 MB의 차이는 포팅 전 빌드와 비교한 전체 시스템의 차이이고 같은 기간의 다른 변경도 들어 있어, 런타임 교체만의 효과로 떼어 읽지 않는다. 로컬의 고정 응답 서버로 모델 추론과 네트워크 지연을 일부러 뺀 측정이며, 글도 작업 부하에 한정된 결과라 Rust 런타임이 일반적으로 몇 배 빠르다는 뜻은 아니라고 적는다. 시간 수치와 그 불일치는 [[Agent-Test-Verification-Behavior#컴파일 진단과 성능 수치는 분모와 측정 경계를 남긴다|측정 경계]]를 따른다.

같은 프로세스에 넣으면 프로세스 생성과 언어 런타임 중복이 사라지는 대신 프로세스 격리도 사라진다. 네이티브 코드의 메모리 결함이나 비정상 종료가 호스트 프로세스에 바로 영향을 주므로 FFI 경계의 계약과 실패 처리를 따로 검토한다([[Nodejs-Native-Addons#선택 기준|네이티브 애드온의 선택 기준]]). GitHub이 프로세스 내부 진입점을 선택 기능으로 둔 이유도 프로세스 공유에 대한 확신을 쌓는 중이라는 것이었다.

## 모델 파일을 받을 때의 안전

Python으로 공개 모델을 내려받아 쓰는 사람에게 가장 직접 닿는 계층이다.

- **pickle은 읽는 순간 코드를 실행할 수 있다:** Python 공식 문서는 pickle 모듈이 안전하지 않다고 경고한다. 악의적으로 만든 pickle 데이터는 unpickling 중에 임의 코드를 실행할 수 있으므로 신뢰할 수 없거나 변조됐을 수 있는 데이터를 unpickle하지 않는다. PyTorch Foundation도 이전의 pickle 형식 모델 파일을 공유할 때 임의 코드를 실행할 기회가 있었다고 설명한다. 역직렬화 경계 일반은 [[Signed-Payload-Deserialization|서명된 페이로드의 역직렬화]]를 따른다.
- **`torch.load`의 제한된 unpickler:** 2026-11-08 PyTorch 2.15 문서 기준 `torch.load`는 내부에서 unpickler를 쓴다. 기본값 `weights_only=True`에서는 텐서, 기본 타입, 딕셔너리와 `torch.serialization.add_safe_globals()`로 추가한 타입만 읽는다. 같은 문서는 그래도 신뢰할 수 없는 출처의 데이터는 읽지 말라고 경고하고, 예제에서 `weights_only=False`를 안전하지 않을 수 있는 설정으로 표시한다. Transformers v5.22.2의 `from_pretrained`도 같은 의미의 `weights_only`를 기본 True로 둔다.
- **safetensors는 텐서와 메타데이터만 담는다:** 파일은 헤더 크기를 담은 8바이트(부호 없는 little-endian 64비트 정수), 텐서 이름마다 `dtype`, `shape`, `data_offsets`를 적은 JSON 헤더, 나머지 바이트 버퍼로 이뤄져 실행할 코드가 들어갈 자리가 없다. README는 아주 큰 JSON의 파싱을 막으려 헤더를 100MB로 제한하고, 중복 키를 허용하지 않지만 모든 파서가 이를 지키지는 않을 수 있다고 적는다. 복사 비용은 장치에 따라 다르다. 같은 README는 ML에서 완전한 zero-copy 형식은 없다고 전제하고, CPU에서는 파일이 이미 캐시에 있으면 복사 없이 읽을 수 있지만 GPU로 올릴 때는 복사가 필요하며 헤더는 zero-copy가 아니라고 적는다. 필요한 텐서만 읽는 lazy loading을 지원하며, 텐서의 일부만 읽을 때는 `safe_open`의 `get_slice`를 쓴다. Transformers v5.22.2는 safetensors 체크포인트를 기본으로 메모리 매핑해 읽고, HF Spaces와 Endpoints가 쓰는 `hf-mount` FUSE 파일시스템에서는 자동으로 끈다.

```python
from safetensors.torch import load_file, save_file
import torch

save_file({"embedding": torch.zeros((512, 1024))}, "model.safetensors")
tensors = load_file("model.safetensors")  # safetensors 0.8.0 기준 기본값 device="cpu", backend="mmap"
```

- **형식이 막지 못하는 것:**
  - Transformers의 `trust_remote_code=True`는 Hub 저장소에 있는 모델 정의 코드를 로컬에서 실행한다. 기본값은 False이고, 문서는 신뢰하며 코드를 직접 읽은 저장소에만 켜라고 한다. 가중치가 safetensors여도 이 옵션을 켜면 코드 실행 경로가 생긴다.
  - safetensors는 파일을 읽을 때의 코드 실행을 막을 뿐 가중치가 만드는 동작을 검증하지 않는다. 공개 모델을 특정 문구가 붙을 때만 악성 도구 호출을 내도록 미세조정한 개념 증명은 [[Agent-Execution-Isolation#가중치를 수정한 공개 모델의 조건부 백도어|조건부 백도어]]에 있다.
  - 받을 파일의 revision 고정은 [[Hugging-Face-Hub#다운로드할 버전을 고정한다|모델 허브의 버전 고정]], 라이선스 확인은 [[Hugging-Face-Hub#접근 승인과 라이선스|접근 승인과 라이선스]], 모델 공급망 전반은 [[LLM-Application-Security#LLM03 공급망|LLM 공급망]]을 따른다.
- **사례: 재단 이관(2026-04-08).** PyTorch Foundation은 PyTorch Conference EU(파리)에서 safetensors가 DeepSpeed, Helion, PyTorch, Ray, vLLM과 함께 재단이 호스팅하는 프로젝트가 됐다고 발표했다. Hugging Face는 형식, API와 Hub 연동에 바뀌는 것이 없다고 밝히고, safetensors를 PyTorch core 안에서 torch 모델의 직렬화 방식으로 쓸 수 있게 하는 것을 목표로 들었다. 목표 발표이므로 실제 반영은 사용하는 PyTorch 릴리스 문서로 확인한다.

## AI 에이전트와 기존 E2E 테스트로 낮아진 재작성 비용

같은 Copilot 런타임 재작성은 코드 작성 비용과 검증 조건을 나눠 보여 준다(같은 GitHub 글 기준).

- **규모와 분담:** 결과물은 Rust 운영 코드 80만 줄 이상이고, 이전을 거친 TypeScript 운영 코드는 약 43만 줄로 추정했다. 이전 기간은 약 14.5주였다. 주로 개발자 한 명이 진행하고 코드는 대부분 AI 에이전트가 썼다. 신구 구현의 대조는 에이전트가 하고, 사람은 목표 아키텍처 선택, 작업 분할, 고위험 영역의 수동 검토와 최종 병합 결정을 맡았다.
- **점진 교체:** main에 들어간 128개 PR로 나눠 점진 배포했고, 이전 PR은 기존 TypeScript 구현을 Rust를 호출하는 얇은 shim으로 바꾸는 방식을 따랐다. shim은 호출자가 Rust로 옮겨 가면 지웠다. CLI와 SDK의 기존 E2E 테스트를 매 단계 새 코드에 실행해 필수 테스트가 실패하면 병합하지 않았고 main은 늘 배포 가능한 상태였다. 같은 기간에도 에이전트의 도움을 받는 개발자 수십 명이 주당 수백 개 PR을 병합했다.
- **읽는 법(적용 판단):** 줄 수는 작업량이나 품질의 척도로 바로 쓰지 않는다. 낮아진 것은 코드를 쓰는 비용이고, 동작을 고정하는 기존 E2E 테스트와 컴포넌트 단위의 교체 경계는 여전히 전제다. 테스트 오라클과 면제 라벨 우회 시도는 [[Agent-Test-Verification-Behavior#포팅에서는 기존 E2E 테스트를 오라클로 지킨다|기존 E2E 테스트 오라클]], 점진 이주 일반은 [[Legacy-Modernization-Strategies#1. Strangler Fig Pattern|Strangler Fig]]와 [[Runtime-Stack-Evolution|런타임 스택 진화]]를 따른다.

## Rust가 주로 맡지 않는 계층

- **GPU 커널:** CUDA C++에서 커널은 호스트가 호출해 GPU에서 실행하는 함수로, 많은 스레드가 동시에 실행하도록 작성하고 `__global__` 지정자로 선언한다(CUDA Programming Guide v13.5).
- **딥러닝 프레임워크의 핵심:** PyTorch C++ API 문서는 ATen을 다른 모든 것이 기반으로 삼는 텐서와 수학 연산 라이브러리로 설명하고, C++ extension을 Python API에 사용자 정의 C++와 CUDA 루틴을 더하는 수단으로 둔다. Python에서 부르는 텐서 연산 아래에 C++와 CUDA 계층이 있다.
- **커널 언어도 하나가 아니다:** Triton은 맞춤 딥러닝 연산을 작성하는 언어와 컴파일러로, CUDA보다 높은 생산성으로 빠른 코드를 쓰는 것을 목표로 한다. README 기준 compute capability 8.0 이상의 NVIDIA GPU와 ROCm 6.2 이상의 AMD GPU를 지원한다. 서빙 엔진이 쓰는 커널 묶음의 예는 [[LLM-Inference-Serving-Engines#DeepInfer 공개판이 포함하는 범위|DeepInfer 공개판의 범위]]에 있다.

## JAX와 Rust를 한 스택에서 쓰는 사례

다음 두 사례는 Rust가 맡지 않는 계층의 근거가 아니라 JAX와 Rust를 한 스택에서 함께 쓰는 구성의 예다.

- **사례: xAI의 학습 스택(2023-11-03 Grok 발표 기준).** Kubernetes, Rust, JAX 기반의 자체 학습 및 추론 스택을 만들었고, Rust가 확장 가능하고 신뢰할 수 있으며 유지보수하기 쉬운 인프라에 맞았다고 밝혔다. GPU는 제조 결함, 느슨한 연결, 잘못된 설정 등 여러 방식으로 고장 나므로 고장 유형마다 즉시 식별하고 자동으로 처리하는 자체 분산 시스템을 쓰며, 발표 전 몇 달 동안 인프라 덕분에 신뢰하기 어려운 하드웨어에서도 중단 시간을 최소화하고 MFU를 높게 유지했다고 밝혔다. 발표는 이 분산 시스템의 구현 언어나 JAX가 맡은 역할을 따로 적지 않으며, 현재 구성은 확인하지 않았다.
- **사례: X For You 피드 공개 저장소.** README의 Ranking 표는 랭킹 모델 phoenix를 JAX로 작성한 학습 및 서빙 코드와 Rust 서빙 계층으로 설명한다. 2026-11-08 GitHub 언어 통계(바이트 기준)는 Rust 약 47%, Python 약 29%, Scala 약 17%, Java 약 5%, C++ 약 1%, CUDA 약 0.6%다. README에 2026-08-13 필터링 관련 시스템 코드 추가가 기록돼 있듯 저장소가 갱신되면 비율도 바뀌므로 측정일과 함께 인용한다. 추천 파이프라인의 단계는 [[Recommendation-System-Industry-Social-Graph#X For You 피드 공개 저장소|X For You 피드 공개 저장소]]에 있다.

## Python 사용자에게 주는 의미

- **어디서 계산되는지 구분한다:** Python 반복문은 인터프리터가 실행하고 배열 연산, Rust 백엔드 토크나이저의 토큰화와 텐서 연산은 네이티브 구현이 맡는다. 같은 일을 Python 반복으로 풀지 라이브러리의 배치 호출로 넘길지가 처리 시간을 가른다(적용 판단).
- **모델 파일은 실행될 수 있는 입력으로 다룬다:** safetensors 파일을 우선하고, pickle 기반 파일은 `weights_only` 기본값을 유지한 채 신뢰하는 출처에서만 읽고, `trust_remote_code`는 코드를 읽은 저장소에만 켠다.
- **모델 코드와 서빙 계층의 언어가 갈릴 수 있다:** X For You 피드의 phoenix는 README 기준 랭킹 모델의 학습과 서빙 코드를 JAX로 쓰고 Rust 서빙 계층을 함께 둔다. 온라인과 오프라인 경로의 구분은 [[Recommendation-System-Serving-Operations#온라인과 오프라인 경로|추천 시스템 서빙과 운영]]에 있다.

## 판단 질문

- 바꾸려는 구간의 병목이 GC 정지인가, 큐 대기와 공유 자원 경합인가, GPU 연산인가? 같은 부하의 단계별 p99로 확인했는가?
- 네이티브 구현을 같은 프로세스의 확장 모듈이나 C ABI 라이브러리로 넣을지 별도 프로세스로 둘지 정할 때, 격리, 메모리와 시작 비용 중 무엇이 중요한가?
- 재작성한다면 동작을 고정할 기존 E2E 테스트와 컴포넌트 단위로 교체할 경계가 있는가?
- 대상이 GPU 커널 계층이라면 언어 선호보다 하드웨어와 커널 컴파일러의 지원 범위를 먼저 확인했는가?

## 확인 질문

- `AutoTokenizer`로 불러온 토크나이저가 Rust 백엔드인지 어떻게 확인하는가?
- safetensors 파일을 받아도 `trust_remote_code=True`를 켜면 왜 코드 실행 경로가 남는가?
- 안전한 Rust가 막는 data race와 막지 않는 경쟁 상태는 어떻게 다른가?

공식 문서, 공식 블로그, 논문, 저장소 README와 GitHub 언어 통계 API를 2026-11-08에 대조했다. 성능 측정, 코드 실행과 모델 다운로드는 하지 않았다.

## 출처

- [Migrating the GitHub Copilot runtime to Rust, using Copilot — GitHub, Stephen Toub](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/) — 2026-09-16 게시, 2026-09-23 갱신. 이전 구조와 클라이언트당 메모리, `runtime.node`의 C ABI 진입점과 opt-in 상태, 메모리 측정 지표와 비교 범위, 규모와 PR 운영을 2026-11-08 대조
- [The Tail at Scale — Communications of the ACM, Jeffrey Dean, Luiz André Barroso](https://doi.org/10.1145/2408776.2408794) — 2013년 2월호. 팬아웃 증폭, 변동 원인과 백그라운드 작업 완화
- [The Rustonomicon, Data Races and Race Conditions](https://doc.rust-lang.org/nomicon/races.html)
- [The Rust Programming Language, Extensible Concurrency with Send and Sync](https://doc.rust-lang.org/book/ch16-04-extensible-concurrency-sync-and-send.html)
- [The Rust Programming Language, Unsafe Rust](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html) — 다른 언어에서 Rust 함수 호출
- [The Rust Reference, Linkage](https://doc.rust-lang.org/reference/linkage.html)
- [The Rust Edition Guide, Unsafe attributes](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-attributes.html) — `unsafe(...)` 속성 표기의 도입 버전과 2024 에디션의 필수화
- [cppreference, Multi-threaded executions and data races](https://en.cppreference.com/w/cpp/language/multithread.html)
- [PyO3, User Guide](https://pyo3.rs/) — 0.30.1 가이드
- [PyO3, Parallelism](https://pyo3.rs/v0.30.1/parallelism.html)
- [Hugging Face, Tokenizers](https://huggingface.co/docs/tokenizers/index)
- [Hugging Face Transformers, Tokenizers](https://huggingface.co/docs/transformers/en/fast_tokenizers) — v5.22.2 백엔드 네 종류의 선택과 배치 병렬화
- [Hugging Face Transformers, Tokenizer](https://huggingface.co/docs/transformers/en/main_classes/tokenizer) — Rust 기반 구현의 문자와 토큰 대응 메서드
- [Hugging Face Transformers, Models](https://huggingface.co/docs/transformers/en/main_classes/model) — v5.22.2 `weights_only`와 `disable_mmap`
- [Hugging Face Transformers, Auto Classes](https://huggingface.co/docs/transformers/main/en/model_doc/auto) — `trust_remote_code`
- [Hugging Face, Safetensors](https://huggingface.co/docs/safetensors/index) — `safe_open`의 `get_slice`로 텐서 일부를 읽는 예
- [Hugging Face, Safetensors Torch API](https://huggingface.co/docs/safetensors/api/torch) — `load_file` 기본 device와 backend. 값은 v0.8.0 태그의 `bindings/python/py_src/safetensors/torch.py`와 같음을 2026-11-08 대조
- [huggingface/safetensors — GitHub](https://github.com/huggingface/safetensors) — 형식, 헤더 제한, 중복 키와 zero-copy의 조건. Python 바인딩의 [Cargo.toml](https://github.com/huggingface/safetensors/blob/main/bindings/python/Cargo.toml)로 PyO3와 `cdylib` 구성을 2026-11-08 대조
- [Python, pickle — Python object serialization](https://docs.python.org/3/library/pickle.html)
- [PyTorch 2.15, torch.load](https://docs.pytorch.org/docs/2.15/generated/torch.load.html)
- [PyTorch, C++ API](https://docs.pytorch.org/cppdocs/)
- [PyTorch Foundation Announces Safetensors as Newest Contributed Project to Secure AI Model Execution — PyTorch Foundation](https://pytorch.org/blog/pytorch-foundation-announces-safetensors-as-newest-contributed-project-to-secure-ai-model-execution/) — 2026-04-08 발표
- [Safetensors is Joining the PyTorch Foundation — Hugging Face](https://huggingface.co/blog/safetensors-joins-pytorch-foundation) — 2026-04-08 게시, 바뀌지 않는 범위와 PyTorch core 통합 목표
- [NVIDIA, CUDA Programming Guide v13.5, Intro to CUDA C++](https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/intro-to-cuda-cpp.html)
- [triton-lang/triton — GitHub](https://github.com/triton-lang/triton)
- [Announcing Grok — xAI](https://x.ai/news/grok) — 2023-11-03 게시
- [xai-org/x-algorithm — GitHub](https://github.com/xai-org/x-algorithm) — README의 phoenix 설명과 2026-08-13 갱신 기록, 2026-11-08 GitHub 언어 통계 API 조회
- [Why AI Infrastructure Is Moving to Rust — YouTube, The Coding Gopher](https://www.youtube.com/watch?v=b03BdfL2s3k) — 2026-10-27 업로드, 학습 계기. 사실은 위 1차 출처로 다시 확인했다. 공인의 소셜 미디어 발언, X 추천 저장소 공개 당시의 Rust 비율, 프로세스 내부 실행의 배수 범위와 하드웨어 고장의 밀리초 단위 복구는 1차 출처로 확인하지 못해 쓰지 않았다.

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]
- [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]]
- [[LLM-Inference-Serving-Engines|추론 서빙 엔진의 기능 경계]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
- [[Hugging-Face-Hub|Hugging Face 모델 허브와 버전 고정]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]
- [[Runtime-Stack-Evolution|런타임 스택 진화]]
- [[Recommendation-System-Industry-Social-Graph|소셜 그래프 추천 사례]]
- [[Nodejs-Native-Addons|Node.js Native Addons]]
- [[JVM-GC|JVM GC]]
