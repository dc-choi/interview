---
tags: [ai, agent, aws, bedrock, agentcore, runtime]
status: done
verified_at: 2026-10-20
category: "AI엔지니어링(AIEngineering)"
aliases: ["Bedrock AgentCore Runtime", "AgentCore Runtime 실행 계약"]
---

# Bedrock AgentCore Runtime의 실행 계약, 세션 수명과 배포 단위

AgentCore Runtime은 에이전트나 도구 서버를 컨테이너 또는 코드로 올려 세션 단위로 실행하는 AWS의 관리형 호스팅 환경이다. 프레임워크와 모델은 고를 수 있지만 컨테이너가 지킬 프로토콜 계약, 세션 수명, 배포 버전과 인증 방식은 플랫폼이 정한다. 사용자와 세션의 소유 관계, 기억과 도구 권한 같은 운영 경계는 [[Bedrock-AgentCore-Operations|AgentCore 운영 경계]]를 따른다.

이 문서는 2026-10-20 AWS 개발자 가이드, API 레퍼런스, 요금 페이지와 What's New를 대조한 기준이다. 리전, quota, 한도와 가격은 바뀔 수 있으므로 배포 전에 다시 확인한다.

## 컴퓨트 타입은 생성 때 고르고 바꿀 수 없다

| 항목 | microVM (기본) | Instances |
|---|---|---|
| 실행 단위 | 세션마다 전용 microVM | 세션마다 capacity provider로 만든 EC2 managed instance 한 대 (고객 계정 안) |
| 세션 최대 수명 | 8시간 | 14일 |
| 에이전트 배치 | 런타임 하나에 에이전트 하나 | 한 세션에 여러 에이전트 |
| 네트워크 | `PUBLIC` 또는 VPC | VPC |
| 아키텍처와 GPU | Linux `arm64`, GPU 미지원 | Linux `x86_64`와 `arm64`, 지원 GPU 계열 선택 가능 |
| 과금 | AgentCore의 사용량 기반 과금 | 계정 안 EC2 인스턴스 실행 요금과 EC2 On-Demand 가격 기준의 AgentCore 관리 수수료. Savings Plans, RI와 ODCR은 EC2 컴퓨트에만 적용 |

- **변경 불가:** 런타임의 컴퓨트 타입은 생성 뒤 바꿀 수 없다. capacity provider는 OS, 허용 인스턴스 타입, VPC와 서브넷, 볼륨과 IAM 역할을 정하는 재사용 템플릿이며 만든 뒤에는 description만 고칠 수 있다.
- **과금 기준:** 위 과금 행은 2026-10-20 요금 페이지 기준이다. 관리 수수료는 할인 계약과 관계없이 On-Demand 가격으로 계산한다.
- **세션 공유:** 같은 capacity provider를 쓰는 두 런타임을 같은 `runtimeSessionId`로 호출하면 두 에이전트가 한 인스턴스에 올라가 파일시스템을 공유한다. 한 세션의 에이전트는 최대 20개다(2026-10-20 quota, 조정 불가).
- **볼륨:** Instances 세션이 stop되면 인스턴스는 종료되지만 런타임이 마운트한 EBS 볼륨은 남고, 같은 `runtimeSessionId`로 다시 호출하면 새 인스턴스에 다시 붙는다. 남은 볼륨은 계정에 과금되며, 세션이나 capacity provider를 지우면 볼륨도 지워져 비용이 멈춘다.
- **선택 기준:** AWS는 빨리 끝나는 가벼운 API 중심 작업에 microVM을, 오래 상태를 유지하거나 GPU나 여러 에이전트 협업이 필요한 작업에 Instances를 권한다.
- **리전:** Instances는 2026-08-06 GA였다. 2026-10-20 지원 리전 표에서 서울(ap-northeast-2)은 microVM만 지원하고 Instances는 지원하지 않는다.
- **서울 배포 조건:** 2026-10-20 기준 서울의 VPC 모드 서브넷은 `apne2-az1`, `apne2-az2`, `apne2-az3`에 있어야 한다. 퍼블릭 서브넷에 두어도 인터넷 연결은 생기지 않으므로 외부 호출에는 NAT 게이트웨이로 가는 경로가 있는 프라이빗 서브넷을 쓴다. 활성 세션 기본 quota는 us-east-1과 us-west-2가 5,000, 그 밖의 리전이 2,500이며 조정할 수 있다.

## 세션 수명은 두 타이머가 정한다

`LifecycleConfiguration`의 두 값이 실행 환경의 수명을 정한다.

| 파라미터 | 기본값 | 범위 | 동작 |
|---|---|---|---|
| `idleRuntimeSessionTimeout` | 900초 | microVM 60~28800초, Instances 60~1209600초 | 같은 세션에 호출이 올 때마다 다시 시작한다 |
| `maxLifetime` | 28800초 | idle 값과 같은 범위 | 실행 환경이 처음 만들어질 때 시작하며 리셋되지 않는다 |

idle 값이 `maxLifetime`보다 크거나 컴퓨트 타입의 범위를 벗어나면 `ValidationException`이다. Instances 런타임의 `maxLifetime`은 capacity provider의 `InstanceLifecycleConfiguration`에 정한 `maxLifetime` 이하여야 하고, 두 값의 기본도 28800초다. capacity provider는 생성 뒤 description만 바꿀 수 있어 Instances 문서는 다른 설정을 바꾸려면 provider를 복제해 수정하라고 안내한다. 따라서 8시간보다 긴 Instances 세션이 필요하면 더 큰 값을 가진 capacity provider를 따로 준비하고 런타임의 설정을 그에 맞춘다. 최대 수명에 도달해도 세션 자체는 다음 호출에서 새 실행 환경으로 이어진다.

세션은 Active(요청 처리, 명령 실행이나 백그라운드 작업 중), Idle(다음 호출 대기), Stopped(유휴 시간 초과, 최대 수명 도달, `StopRuntimeSession` 호출, 비정상 헬스 체크)로 바뀐다. 개요 문서는 마지막 상태를 Terminated로 부르기도 한다. 종료 뒤 같은 세션 ID로 호출하면 새 실행 환경이 뜨고 이전 메모리 상태는 남지 않는다. microVM의 실행 상태는 휘발성이므로 대화 맥락의 보존은 [[Bedrock-AgentCore-Operations#실행 환경의 상태와 영속 기억을 구분한다|상태와 기억의 구분]]대로 외부 저장소에 둔다.

`runtimeSessionId`는 요청 기준 33~256자다. 비워 두면 첫 호출에서 Runtime이 만들어 응답 헤더 `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id`로 돌려준다. `StopRuntimeSession`은 세션을 즉시 끝내고 진행 중인 스트리밍 응답도 멈춘다. 세션을 준비하거나 정리하는 중에 다른 작업이 오면 `RetryableConflictException`(HTTP 409)이 오므로 짧은 지수 백오프로 재시도한다. `InvokeAgentRuntime`, `InvokeAgentRuntimeCommand`와 `StopRuntimeSession` 같은 HTTP 기반 API는 AWS SDK가 기본 재시도 설정에서 자동으로 재시도하지만, 재시도를 껐거나 HTTPS로 직접 호출하면 호출자가 재시도한다. `InvokeAgentRuntimeWithWebSocketStream` 같은 WebSocket 기반 API는 SDK도 재시도하지 않는다.

### 새 버전은 이미 떠 있는 세션에 반영되지 않는다

microVM 세션은 생성 시점에 배포돼 있던 코드 자산(`agentRuntimeArtifact`)을 쓴다. 따라서 배포 뒤에도 기존 세션은 종료될 때까지 이전 버전으로 돈다. AWS 문제 해결 문서가 안내하는 확인 방법은 새 세션 ID로 호출하는 것이며, 이때 `qualifier`는 새 버전을 가리켜야 한다(생략하면 `DEFAULT`, 또는 새 버전으로 옮긴 엔드포인트). 고정 엔드포인트로 새 세션을 열면 여전히 그 엔드포인트가 가리키는 버전이 실행된다. 종료된 세션 ID로 호출하면 새 실행 환경이 뜬다는 설명에 따라 `StopRuntimeSession` 뒤 같은 ID를 다시 쓰는 방법도 생각할 수 있지만 이는 추론이다. 배포 직후의 확인 호출이 이전 버전에 닿아 수정이 반영되지 않은 것처럼 보이는 혼동을 막는 점검이다.

## 버전과 엔드포인트로 배포를 통제한다

- 런타임을 만들면 version 1이 자동 생성되고, 컨테이너 이미지, 프로토콜 설정, 네트워크 설정 같은 구성 변경마다 새 버전이 생긴다. 버전은 immutable이다.
- `DEFAULT` 엔드포인트는 생성 때 자동으로 만들어지고 런타임을 갱신하면 자동으로 최신 버전을 가리킨다. dev, test, prod 같은 사용자 정의 엔드포인트는 명시적으로 갱신해야 다른 버전으로 옮긴다. 엔드포인트마다 고유 ARN이 있다.
- 호출의 `qualifier`에 엔드포인트 이름을 넣고, 생략하면 `DEFAULT` 엔드포인트로 간다.
- 엔드포인트는 다운타임 없이 갱신할 수 있어 버전 전환과 롤백에 쓴다.

다음은 이 구조를 운영에 적용하는 제안이다. 운영 클라이언트가 `qualifier`를 생략하면 배포가 끝난 뒤 새로 시작되는 세션부터 새 버전을 받고, microVM에서는 진행 중인 세션이 종료될 때까지 이전 버전에 남는다. Instances에서 진행 중인 세션의 동작은 확인하지 못했다. 운영 호출은 고정 엔드포인트를 지정하고, 새 버전을 다른 엔드포인트에서 검증한 뒤 운영 엔드포인트를 옮긴다. 롤백은 운영 엔드포인트를 이전 버전으로 되돌리는 작업으로 준비한다.

## 컨테이너가 지킬 서비스 계약

| 프로토콜 | 포트 | 경로 | 오류 표현 |
|---|---|---|---|
| HTTP | 8080 | POST `/invocations`, GET `/ping`, 선택 `/ws` | HTTP 상태 코드와 `x-amzn-ErrorType` 헤더 |
| MCP | 8000 | POST `/mcp` | 대부분 HTTP 200 안의 JSON-RPC `error` |
| A2A | 9000 | POST `/`, `/.well-known/agent-card.json`, `/ping` | 실제 HTTP 상태 코드와 JSON-RPC error 본문 |
| AG-UI | 8080 | `/invocations`(SSE), `/ws`, `/ping` | SSE `RUN_ERROR` 이벤트 |

각 계약 문서는 컨테이너가 host `0.0.0.0`에서 듣고 ARM64 컨테이너로 만들어질 것을 요구한다. Instances 문서는 `x86_64`도 지원한다고 적으므로, ARM64 조건을 microVM 배포 기준으로 읽는 것은 두 문서를 맞춘 해석이다.

MCP 서버는 streamable HTTP가 필수이고, AWS는 기본으로 stateless 모드(`stateless_http=True`)를 쓰라고 권한다.

- **세션 ID 재사용:** stateless 모드에서는 플랫폼이 `Mcp-Session-Id`를 만들어 서버에 넘기므로 서버는 이를 거부하지 않아야 한다. 두 모드 모두 클라이언트는 응답의 `Mcp-Session-Id`를 이후 요청마다 다시 보낸다. 빠뜨리면 요청이 새 microVM으로 갈 수 있어 cold start 지연이 생길 수 있고, stateful 모드에서는 이 ID가 세션 상태도 함께 잇는다.
- **stateful 조건:** MCP 2025-11-25 이하에서는 elicitation과 sampling에 stateful 모드가 필요하다. 2026-07-28 이후 버전은 stateful 모드가 필요 없는 multi round-trip requests(MRTR) 패턴을 쓴다.
- **재시도:** MCP에서는 인증, 인가와 Accept 헤더 오류(401, 403, 406)만 200이 아닌 상태 코드를 쓴다. `RetryableConflictException`도 HTTP 200 안의 JSON-RPC 오류(`-32005`, Session operation in progress, please retry)로 오고 MCP 클라이언트가 자동으로 재시도하지 않는다. 호출자가 본문의 메시지를 확인해 짧은 지수 백오프로 재시도해야 한다. 같은 코드의 `ConflictException`과는 메시지로 구분한다. 계약 문서는 A2A와 AG-UI 클라이언트도 이 예외를 자동으로 재시도하지 않는다고 적는다.

## /ping으로 바쁜 상태를 알린다

`/ping` 응답의 `status`는 `Healthy` 또는 `HealthyBusy`이고 `time_of_last_update`는 선택이다. `Healthy`로 유휴 시간이 지나면 세션이 멈추고, `HealthyBusy`를 보고하는 세션은 유휴 시간을 넘어 유지된다. 비동기 작업은 응답을 먼저 돌려준 뒤 백그라운드에서 계속하며 결과는 같은 세션 ID로 확인한다. AgentCore SDK는 `add_async_task`와 `complete_async_task`로 이 상태를 관리하며, 공식 문서는 `@app.entrypoint` 핸들러에서 블로킹 작업을 하지 말라고 권한다.

**`time_of_last_update`는 상태가 실제로 바뀔 때만 넣는다.** 매 ping에 현재 시각을 넣으면 유휴 종료가 일어나지 않아 세션이 `maxLifetime`까지 남고 세션 quota를 소진할 수 있다. 필드를 빼면 플랫폼이 상태 변화를 추적한다.

2026-10-20 한도 기준 비동기 작업은 최대 8시간, 동기 요청은 15분, 스트리밍은 최대 60분이며 조정할 수 없다. 요금 페이지는 microVM 과금 구간에 세션 종료 전의 유휴 기간을 포함하므로, 필요 없이 유지된 세션은 비용으로도 이어진다고 추론할 수 있다.

## 들어오는 호출의 인증

- **SigV4와 JWT 중 하나:** 기본은 IAM SigV4다. JWT bearer를 쓰면 discovery URL(`/.well-known/openid-configuration`으로 끝나는 주소)의 issuer, `allowedAudience`와 `aud`, `allowedClients`와 `client_id`, `allowedScopes`와 `scope`, 필수 custom claim을 대조한다. `aud`와 `client_id` 조건을 함께 설정하면 둘 다 검증한다.
- **런타임 단위 선택:** 한 런타임은 SigV4와 JWT 가운데 하나만 쓸 수 있다. 둘 다 필요하면 다른 버전을 각각 구성한다. `DEFAULT`는 최신 버전만 가리키므로 두 방식을 함께 열어 두려면 버전별 엔드포인트가 필요하다는 것은 이 구조에서 도출한 추론이다.
- **SDK 호출 제약:** OAuth로 구성한 런타임은 AWS SDK의 `InvokeAgentRuntime`으로 부를 수 없어 HTTPS로 직접 요청한다. 인증이 빠지면 OAuth 런타임은 401과 `WWW-Authenticate` 헤더를, SigV4 런타임은 403을 돌려준다.

### Scope 목록과 서로 다른 claim 조건의 결합

2026-10-30 inbound JWT authorizer 공식 문서 기준, `allowedAudience`, `allowedClients`, `allowedScopes`, 필수 custom claim 가운데 하나 이상을 설정한다. 여러 종류를 설정하면 **설정한 종류를 모두 검증**한다. 반면 `allowedScopes` 목록 안에서는 토큰의 scope가 허용값 하나 이상과 일치하면 된다. 따라서 `[read, write]`를 넣었다고 두 권한을 모두 요구하는 것은 아니다.

Custom claim은 이름, 값의 타입과 비교 조건을 지정한다. `STRING`에는 `EQUALS`를, `STRING_ARRAY`에는 `CONTAINS` 또는 `CONTAINS_ANY`를 사용한다. 부서나 역할 조건을 넣을 때는 IdP가 발급하는 실제 claim 타입과 맞춘다.

설계 점검 예시로, write scope가 필요한 런타임에는 read만 있는 토큰을 거절하는지 확인한다. Audience와 부서 조건을 함께 요구한다면 각각 하나만 어긋난 요청도 따로 시험한다. 이 조건은 런타임 호출 허용 여부를 정하므로, 컨테이너 내부 도구별 읽기와 쓰기 권한을 자동 분리한다고 해석하지 않는다. 이는 authorizer의 적용 경계에서 도출한 점검 제안이며 실제 호출 시험 결과가 아니다.

### 사용자 ID 헤더는 인증된 신원이 아니다

`X-Amzn-Bedrock-AgentCore-Runtime-User-Id` 헤더는 에이전트가 최종 사용자를 대신해 OAuth 토큰을 받을 때 사용자 식별자를 넘긴다. 이 헤더를 쓰려면 `bedrock-agentcore:InvokeAgentRuntime`에 더해 `bedrock-agentcore:InvokeAgentRuntimeForUser` 권한이 필요하다. AgentCore는 값을 불투명한 식별자로 다루고 인증된 신원과 대조하지 않는다.

- 공식 문서의 대응은 네 가지다. 권한을 신뢰하는 주체와 특정 런타임으로 좁히고, 값은 클라이언트 입력이 아니라 인증된 주체의 정보에서 만들며, SigV4 주체와 사용자 ID의 관계를 기록하고, 위임이 필요 없는 런타임에서는 `InvokeAgentRuntimeForUser`를 명시적으로 거부한다.
- IdP가 있는 운영 환경에서는 issuer, 서명과 만료를 검증하는 JWT 경로를 쓰라고 권한다. AWS는 사용자 ID를 인증된 주체에서 만들면 인증된 사용자가 다른 사용자를 사칭하는 것을 막는다고 설명한다. 클라이언트가 보낸 식별자를 믿지 않는다는 점에서 [[Bedrock-AgentCore-Operations#세션 격리는 사용자 인증을 대신하지 않는다|세션 소유 관계 점검]]과 같은 원칙으로 읽을 수 있다(해석).

Gateway를 단일 진입점으로 두려면 직접 호출 경로도 막는다. SigV4 런타임은 Gateway 실행 역할만 허용하고 나머지 주체를 명시적으로 거부하는 리소스 기반 정책을 쓴다. 이 통제는 그 역할을 누가 assume할 수 있는지에 달려 있으므로, AWS는 Gateway 실행 역할의 trust policy에 `aws:SourceArn`과 `aws:SourceAccount` 조건을 넣어 해당 Gateway만 역할을 맡게 하라고 안내한다. JWT 런타임은 `allowedWorkloadConfiguration`으로 허용할 Gateway를 지정한다. 2026-10-30 공식 안내는 AgentCore CLI 프로젝트의 `agentcore/cdk/lib/cdk-stack.ts`에 CloudFormation 속성 override를 넣고 배포하는 방법과 control plane API로 설정하는 방법을 제공한다.

2026-10-30에는 scope와 custom claim의 결합, Gateway 제한 설정 경로를 추가 대조했다. 컴퓨트, 리전, quota와 가격 전체를 다시 검증하지 않았으므로 frontmatter의 검증일은 유지한다.

## 나가는 호출의 자격 증명

AgentCore Identity는 OAuth와 API key를 관리하며 두 모드를 둔다. user-delegated는 최종 사용자의 자격 증명으로 그 사용자를 대신해 호출하고, autonomous는 서비스 수준 자격 증명으로 독립적으로 호출한다. SDK에서 사용자 위임 3LO는 authorization code grant(`auth_flow="USER_FEDERATION"`), 2LO는 client credentials grant(`auth_flow="M2M"`), API key는 `@requires_api_key`로 받는다.

token vault는 OAuth 토큰, client credentials와 API key를 KMS로 암호화해 보관한다. 3LO로 받은 사용자 토큰은 에이전트의 workload identity와 들어온 JWT의 사용자 ID를 묶은 키로 저장되고, 꺼낼 수 있는 자격 증명도 workload access token에 담긴 사용자 신원으로 범위가 정해진다. 반면 credential provider 접근은 에이전트에 붙인 IAM 역할이 정하며, AWS는 같은 계정 안의 workload identity와 credential provider 사이에 추가 바인딩을 강제하지 않는다고 밝힌다. AWS는 IAM 정책의 `Resource`를 `*` 대신 특정 workload identity와 credential provider ARN으로 좁히라고 권한다. 사용자 신원으로 범위가 정해지지 않는 API key와 client credentials에서는 이 IAM 범위가 주된 통제라는 것은 해석이다. 사용자 ID가 사용자 토큰의 범위를 정하므로 위 사용자 ID 헤더의 통제와도 연결된다.

## Platform version V2는 스냅샷에서 시작한다

platform version은 런타임을 시작하는 방식이며 `platformVersion` 필드의 `V1`(기본) 또는 `V2`로 정한다. 구성 이력을 남기는 runtime version과 별개다. 개요 문서가 첫 runtime version도 V1로 표기하므로 두 버전을 혼동하지 않는다. V2는 microVM 컴퓨트의 시작 방식이며 2026-09-18 출시가 공지됐다. 2026-10-20 기준 us-east-1, us-east-2, us-west-2, eu-west-1, ap-northeast-1에서만 쓸 수 있어 서울은 지원하지 않는다. 기존 런타임도 update로 platform version을 옮길 수 있다.

V2는 환경을 한 번 준비해 스냅샷을 찍고 새 인스턴스마다 이를 복원한다. AWS는 이 방식으로 동시성이나 이미지 크기와 관계없이 cold start 지연을 일정하게 유지한다고 설명한다.

- **스냅샷 시점:** 첫 healthy `/ping` 응답 때 찍는다. 시작 후 120초 안에 healthy를 보고하지 못하면 생성이 실패한다. SDK에서는 `app.run()` 전 모듈 범위에서 의존성 import, 모델 가중치, 정적 설정과 재사용 클라이언트를 준비한다.
- **핸들러에서 만들 값:** 난수, 식별자, 토큰, 현재 시각과 경과 시간의 기준점은 요청마다 만들고, 자격 증명은 핸들러에서 만료될 때 갱신한다. 시작 때 만든 값은 모든 인스턴스에 같은 값으로 복사된다. `time.monotonic()`은 복원 전후로 진행하지 않고, 복원된 인스턴스는 모두 hostname `localhost`와 PID `1`을 보고하므로 인스턴스 식별자로 쓰지 않는다.
- **암호 난수:** 2026-10-20 기준 암호 라이브러리의 스냅샷 대응 빌드가 복원 뒤 reseed되지 않는다. 비밀값과 키는 요청 처리 중에 운영체제 난수(`secrets`, `os.urandom`, `/dev/urandom` 등)로 만든다.
- **고정되는 캐시:** 시작 때 가져온 AgentCore Gateway 도구 목록은 스냅샷 시점에 고정된다.
- **배포 시간과 한도:** V1은 수 초 만에 `READY`가 되지만 V2의 생성과 갱신은 수 분이 걸린다. 끝나기 전에 update나 delete를 부르면 `ConflictException`이다. 2026-10-20 기준 환경 변수 총량은 직접 코드 배포 1.5 KB, 컨테이너 2.5 KB로 V1의 4 KB보다 작으며 AWS는 이 한도를 V1 수준으로 올리겠다고 밝혔다. CloudFormation과 CDK는 아직 `platformVersion`을 설정하지 못한다.
- **스냅샷 정리:** 엔드포인트가 가리키는 버전마다 스냅샷이 있고, 어떤 엔드포인트도 가리키지 않으면 진행 중인 세션이 끝난 뒤 지워진다. 삭제에는 최대 8시간이 걸릴 수 있다.

요금 페이지(2026-10-20 확인)는 V2의 단가가 V1보다 높지만 V2가 쓰지 않는 메모리를 120초 뒤 회수한다고 안내한다. 어느 쪽이 싼지는 실제 유휴 비율과 메모리 사용 패턴으로 비교한다.

## 운영 점검

- 운영 호출이 `qualifier`로 고정 엔드포인트를 지정하고, 롤백 경로를 엔드포인트 이동으로 준비했는가
- 배포 확인 호출이 새 버전을 가리키는 `qualifier`로 새 세션을 여는가
- `/ping`이 실제 작업 중에만 `HealthyBusy`를 보고하고 `time_of_last_update`를 상태 변경 때만 넣는가
- MCP 클라이언트가 `Mcp-Session-Id`를 재사용하고, MCP, A2A, AG-UI와 WebSocket 호출의 재시도 가능 오류를 호출자가 처리하는가
- 사용자 ID 헤더를 쓴다면 `InvokeAgentRuntimeForUser`를 신뢰 주체로 제한하고 값을 인증 정보에서 도출하는가
- 서울 리전 배포라면 2026-10-20 기준 Instances와 V2를 쓸 수 없고, VPC 서브넷의 AZ와 NAT 경로를 확인했는가

## 출처

- [AWS, microVMs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html)
- [AWS, Instances](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-instances-how-it-works.html)
- [AWS, Use isolated sessions for agents](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html)
- [AWS, Configure Amazon Bedrock AgentCore lifecycle settings](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-lifecycle-settings.html)
- [AWS, Stop a running session](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-stop-session.html)
- [AWS, AgentCore Runtime versioning and endpoints](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agent-runtime-versioning.html)
- [AWS, Understand the AgentCore Runtime service contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html)
- [AWS, HTTP protocol contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-http-protocol-contract.html)
- [AWS, MCP protocol contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp-protocol-contract.html)
- [AWS, A2A protocol contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a-protocol-contract.html)
- [AWS, AG-UI protocol contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui-protocol-contract.html)
- [AWS, Handle asynchronous and long running agents with Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-long-run.html)
- [AWS, Troubleshoot AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-troubleshooting.html)
- [AWS, Quotas for Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html)
- [AWS, Authenticate and authorize with Inbound Auth and Outbound Auth](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html)
- [AWS, Configure inbound JWT authorizer](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/inbound-jwt-authorizer.html) — scope 목록의 일치 조건과 custom claim 타입, 여러 조건의 결합. 2026-10-30 확인.
- [Secure Agent Authorization with OAuth 2.0 — Amazon Web Services](https://www.youtube.com/watch?v=ECFfIMJECac) — 2026-02-16 공개 영상의 06:24~10:23 scope와 custom claim 설명. 전사 용어를 공식 문서와 대조했으며 화면 코드는 확인하지 않았다.
- [AWS, InvokeAgentRuntime](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeAgentRuntime.html)
- [AWS, Obtain OAuth 2.0 access token](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-authentication.html)
- [AWS, Features of AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/key-features-and-benefits.html)
- [AWS, Scope down access to credential providers by workload identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/scope-credential-provider-access.html)
- [AWS, Configure Amazon Bedrock AgentCore Runtime and tools for VPC](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-vpc.html)
- [AWS, Optimize your agent for Amazon Bedrock AgentCore Runtime V2](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-v2-optimize.html)
- [AWS, Supported AWS Regions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-regions.html)
- [Amazon Bedrock AgentCore Pricing — AWS](https://aws.amazon.com/bedrock/agentcore/pricing/) — 2026-10-20 확인
- [The new AgentCore Runtime is now available in Amazon Bedrock AgentCore — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/09/new-agentcore-runtime-generally-available/) — 2026-09-18
- [AgentCore runtime instances are now generally available — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/08/aws-bedrock-agentcore-runtime-instances-generally-available/) — 2026-08-06

## 관련 문서

- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]] — 세션 소유 관계, 영속 상태, Gateway Policy와 모델 접근
- [[Agent-Runtime-Deployment|에이전트 런타임과 배포]] — 다른 런타임의 정의, 영속 상태와 배포 경계
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[JWT|JWT]] — 토큰 검증과 상태 관리
