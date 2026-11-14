---
tags: [ai, agent, aws, bedrock, agentcore, harness, strands]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["AgentCore Harness", "Bedrock AgentCore Harness", "관리형 에이전트 하네스", "AgentCore CLI"]
---

# Bedrock AgentCore Harness — 설정으로 정의하는 관리형 에이전트

AgentCore harness는 에이전트 루프를 직접 짜지 않고 모델, 시스템 프롬프트, 도구, 스킬과 상한을 설정으로 선언하면 실행 환경, 컴퓨트, 메모리, 신원, 네트워크와 관측을 AgentCore가 맡는 관리형 에이전트다. 2026-11-14 공식 문서 기준 Strands Agents 위에서 동작하고, 세션마다 AgentCore Runtime이 뒷받침하는 격리된 microVM에서 돌며 세션별 파일 시스템과 셸, 세션을 넘는 단기와 장기 메모리를 가진다. 문서는 표시한 리전에서 GA라고 적는다.

## 루프를 누가 소유하는가

| 구분 | Harness | 코드 기반 Runtime 에이전트 |
|---|---|---|
| 에이전트 루프 | 서비스가 제공한다 | 직접 작성한다. `BedrockAgentCoreApp`으로 감싸 배포한다 |
| 정의하는 것 | 모델, 시스템 프롬프트, 도구, 스킬, 메모리, 상한 | 코드 전체(Strands, LangChain, Vercel AI SDK 등 프레임워크 선택) |
| 도구 | AgentCore Gateway, MCP 서버, 내장 Browser와 Code Interpreter | 코드에서 연결 |
| 지원하지 않는 것 | 프레임워크 선택, 양방향 스트리밍, 그래프나 워크플로형 비에이전트 루프 | 해당 없음 |

Harness는 Runtime 안에서 도는 관리형 추상화다. 모델, 시스템 프롬프트와 도구만으로 충분한 에이전트는 harness로 빨리 시작하고, 루프 제어나 그래프형 흐름이 필요하면 코드 에이전트로 간다. 다단계 흐름을 노드와 엣지로 통제하는 방법은 [[Agent-Graph-Engineering|그래프 엔지니어링]]을 따른다.

## 모델 제공자를 설정으로 바꾼다

- Bedrock, OpenAI, Google Gemini와 LiteLLM을 거친 다른 제공자(OpenAI 호환 endpoint 포함)를 쓸 수 있고, 턴 사이에 제공자를 바꿔도 문맥이 이어진다. 설정은 harness에 두고, 호출별 덮어쓰기는 SDK의 InvokeHarness로 한다.
- 외부 제공자의 API key는 AgentCore Identity token vault에 둔다. Bedrock 모델은 실행 역할로 호출하며 모델 API key를 받지 않는다.
- Bedrock의 기본 API 형식은 `converse_stream`이다. `responses`와 `chat_completions`는 `bedrock-mantle` endpoint를 거치므로 Mantle 지원 모델에만 쓰고, Claude에는 `converse_stream`을 쓴다. Bedrock Guardrails도 `converse_stream`이 필요하다.
- `converse_stream` 형식을 쓰는 지원 Bedrock 모델에서는 prompt caching이 자동으로 적용된다. `additionalParams`에 명시적 `cachePoint`를 주면 관리형 캐시 지점을 추가하지 않고 그 설정을 그대로 넘긴다.
- `apiBase`와 `additionalParams`는 요청 경로를 바꿀 수 있으므로 값을 검증한다(공동 책임).
- 문서는 서비스 기본 모델이 바뀔 수 있다고 명시한다. CLI는 `--model`을 생략하면 자체 기본 모델을 `harness.yaml`에 써 넣으므로 서비스 기본값과 다를 수 있다. 운영 harness는 모델을 명시한다(설계 제안).

## 상한과 문맥 관리

호출마다 반복 수 `maxIterations`(기본 75), 경과 시간 `timeoutSeconds`(기본 3600초), 출력 토큰 상한 `maxTokens`(기본값 없음)를 둔다. `maxTokens`의 범위는 API 문서마다 한 호출의 합계와 반복당으로 다르게 적혀 있다. 상한에 닿으면 응답 스트림의 `stopReason`에 `max_iterations_exceeded`, `max_output_tokens_exceeded`, `timeout_exceeded` 같은 값이 온다. 세션 유휴 시간 `idleRuntimeSessionTimeout`(기본 900초)과 최대 수명 `maxLifetime`(기본 28800초)도 설정한다. 긴 대화의 문맥 관리는 `sliding_window`, `summarization`, `none` 중에서 고른다. `none`은 이력을 줄이지 않으므로 문맥 크기를 직접 관리할 때만 쓴다. 비용 관점의 상한 설계는 [[Agent-Operations-Integration-Cost-Security#실행 전에 세고, 상한을 건다|에이전트 운영의 비용 상한]]을 따른다.

## 만들어지는 자원과 비용

Harness를 만들면 관리형 Runtime, Runtime endpoint와 관리형 Memory가 함께 생기고 harness 태그가 이 자원에 전파된다. 관리형 Memory는 기본으로 켜지며 Gateway, EFS, S3나 직접 만든 Memory는 따로 만든다. CloudTrail에는 harness 이벤트가 `AWS::BedrockAgentCore::Runtime` 리소스로 남는다.

Harness 자체의 추가 요금은 없고, 쓰는 기반 기능에 표준 요금을 낸다. Runtime microVM의 CPU와 최대 메모리 사용 시간, 모델 토큰, Memory, Browser와 Code Interpreter, Gateway, CloudWatch, 저장과 네트워크가 과금 대상이다. 세션 격리와 상태 경계는 [[Bedrock-AgentCore-Runtime|AgentCore Runtime 실행 계약]]과 [[Bedrock-AgentCore-Operations|AgentCore 운영 경계]]를 따른다.

## 코드로 옮기는 출구

`agentcore export harness`는 harness를 편집 가능한 Strands 기반 Python 코드(CodeZip 빌드)로 내보내며, 내보낸 코드는 일반 Runtime 에이전트로 `agentcore build`와 `agentcore deploy`를 거치거나 Python 3.12 이상 환경에서 직접 호스팅할 수 있다. Gateway, Browser와 Code Interpreter 도구, AWS 스킬, 관리형 메모리와 ARN으로 참조한 메모리는 옮겨지지 않고 `EXPORT_NOTES.md`에 목록으로 남는다. 경로로 지정한 스킬이 있으면 내보내기가 거부된다. Harness로 시작하더라도 내보낼 때 다시 연결할 구성 요소를 미리 기록해 둔다(설계 제안).

## AgentCore CLI의 개발 흐름

CLI는 npm 패키지 `@aws/agentcore`(Node.js 20.12 이상)로 설치한다. 예전 pip 패키지 `bedrock-agentcore-starter-toolkit`이 같은 명령 이름을 가려 다른 명령이 실행될 수 있다.

1. **생성:** `agentcore create`의 마법사는 기본으로 관리형 harness를 만든다. 코드 에이전트는 `--template agent-python-strands` 같은 템플릿으로 뼈대를 만든다.
2. **로컬 확인:** 코드 에이전트에서 `agentcore dev`는 Runtime을 로컬에서 hot reload로 띄우며, 옵션이 없으면 headless로 출력을 터미널에 보낸다. `agentcore dev --mode browser`는 Agent Inspector를 열어 대화와 로컬 trace를 보게 한다. Harness에서 `agentcore dev --mode browser`는 harness를 로컬에서 실행하지 않고, 프로젝트를 배포한 뒤 로컬 Agent Inspector를 연다.
3. **배포:** `agentcore deploy`는 코드를 빌드 방식에 맞게 묶고(CodeZip이면 zip) AWS CDK로 자원을 만들며, Runtime endpoint를 만들고 CloudWatch 로그와 관측을 구성한다. 첫 배포는 CDK bootstrap 때문에 느리다. 배포 때 CloudWatch Transaction Search도 켜며, 이를 원하지 않으면 `agentcore config transactionSearch false`로 opt-out한다.
4. **빌드 방식:** CodeZip은 Docker가 필요 없다. Container 빌드는 CodeBuild로 이미지를 만들어 ECR에 올리며, 로컬 컨테이너 엔진은 `agentcore dev`에만 필요하다.

배포 뒤 확인은 `agentcore logs runtime`과 `agentcore traces runtime list`, `agentcore traces runtime get <trace-id>`로 한다. CLI가 역할과 자원을 대신 만들어도 그 권한 범위는 배포 전에 검토 대상으로 남는다.

## 점검

- 루프 제어, 그래프형 흐름이나 양방향 스트리밍이 필요한데 harness를 고르지 않았는가
- 모델과 API 형식을 명시했고, Guardrails를 쓴다면 `converse_stream`인가
- 외부 제공자 키를 token vault에 두었는가
- 반복, 시간과 토큰 상한을 업무에 맞게 정했는가
- 내보내기로 옮겨지지 않는 도구와 메모리를 기록했는가

## 출처

- [GenerAIly Speaking: Let's build a research agent from scratch — Amazon Web Services](https://www.youtube.com/watch?v=ZEfmlXJOpME)
- [AWS, AgentCore harness](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html)
- [AWS, AgentCore harness, Get started](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-get-started.html)
- [AWS, AgentCore harness, Models and instructions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-models.html)
- [AWS, AgentCore harness, Observability and cost controls](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-operations.html)
- [AWS, AgentCore API Reference, CreateHarness](https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_CreateHarness.html)
- [AWS, AgentCore API Reference, HarnessMessageStopEvent](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_HarnessMessageStopEvent.html)
- [AWS, AgentCore API Reference, InvokeHarness](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeHarness.html)
- [AWS, AgentCore harness, Export harness to code](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-export.html)
- [AWS, AgentCore harness vs. Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-vs-runtime.html)
- [AWS, Get started with Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html)
- [AWS, Get started with AgentCore Runtime using the AgentCore CLI](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-cli.html)
- [AWS, AgentCore CLI](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-cli-way-to-interact.html)

## 관련 문서

- [[Bedrock-AgentCore-Runtime|AgentCore Runtime 실행 계약]]
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]]
- [[Agent-Operations-Integration-Cost-Security|에이전트 운영의 통합, 비용과 보안]]
- [[Agent-Declarative-Runtime|선언형 에이전트 런타임]]
- [[Agent-From-Scratch|에이전트 직접 만들기]]
- [[Agent-Graph-Engineering|그래프 엔지니어링]]
