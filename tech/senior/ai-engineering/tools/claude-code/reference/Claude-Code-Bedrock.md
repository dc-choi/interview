---
tags: [senior, ai, claude-code, amazon-bedrock, aws, iam, governance]
status: done
verified_at: 2026-08-04
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code on Amazon Bedrock", "Claude Code Bedrock", "클로드 코드 Bedrock"]
---

# Claude Code on Amazon Bedrock 배포와 운영

## 정의와 경계

Claude Code의 모델 요청을 Anthropic API 대신 Amazon Bedrock으로 보내는 배포 방식이다. AWS의 자격 증명, IAM, 리전, inference profile, 사용량과 감사 체계 안에서 모델 호출을 관리할 수 있다.

Bedrock 연결이 Claude Code 전체를 AWS 안에서 실행한다는 뜻은 아니다. 로컬 또는 CI의 Claude Code 프로세스가 파일을 읽고 도구를 실행하며, 선택한 컨텍스트와 모델 응답이 Bedrock endpoint를 오간다. 모델 호출 통제와 에이전트 실행 통제를 분리해야 한다.

| 계층 | 통제 대상 | 대표 수단 |
|---|---|---|
| Claude Code host | 파일, shell, network, MCP와 승인 | settings, permissions, sandbox, Hook |
| Amazon Bedrock | 모델 호출 주체, 모델과 profile, 리전 | IAM, STS, inference profile, SCP |
| 조직 운영 | 정책 배포, 감사, 비용과 도입 | managed settings, CI gate, logging, budget |

IAM이 `InvokeModel`을 제한해도 로컬 shell 명령이나 MCP 접근까지 막아 주지는 않는다. 반대로 Claude Code 권한 규칙은 AWS 계정의 모델과 리전 접근을 대신 통제하지 않는다.

## 요청 흐름

```text
Developer or CI
  -> AWS credential chain
  -> Claude Code host and tools
  -> Bedrock Runtime or inference profile
  -> Claude model
```

운영 전에 네 가지 경계를 각각 정한다.

- Privilege: 누가 어떤 model/profile을 호출하고 어떤 로컬 도구를 쓰는가
- Data: 어떤 코드와 tool output이 어느 리전으로 전송되고 어디에 저장되는가
- Audit: API 호출, 모델 입출력과 로컬 작업 기록을 어디까지 남기는가
- Cost: 모델, profile, 계정과 팀별 사용량을 어떻게 제한하고 해석하는가

## 사전 조건

- AWS 계정에서 Anthropic model 사용 사례를 제출하고 필요한 model access를 확보한다.
- 개발자나 CI가 사용할 IAM role과 단기 자격 증명 경로를 준비한다.
- 사용할 Bedrock source region과 model 또는 inference profile을 정한다.
- Claude Code 실행 주체에 최소 IAM 권한을 부여한다.
- 조직의 data classification에 맞는 전송, logging과 보존 정책을 먼저 결정한다.

개발자마다 장기 access key를 배포하기보다 IAM Identity Center, role assumption과 임시 자격 증명을 우선한다. Model access를 여는 관리자 역할과 실제 호출 역할도 분리한다.

## 설정 경로

개인 검증은 Claude Code의 `/setup-bedrock` wizard로 profile, 리전과 model을 확인할 수 있다. 팀 배포와 CI는 동일 설정을 수동으로 고정해 재현 가능하게 만든다.

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_PROFILE=team-developer
export AWS_REGION=<source-region>
export ANTHROPIC_MODEL=<inference-profile-id-or-arn>
```

IAM, SSO와 profile 기반 인증은 AWS SDK default credential chain을 사용한다. OIDC나 workload role이 자격 증명을 직접 주입하는 CI에서는 `AWS_PROFILE`을 생략한다. `AWS_BEARER_TOKEN_BEDROCK`을 설정하는 Bedrock API key 방식은 이 chain의 예외다. Project settings에는 profile 이름과 비밀이 아닌 정책만 공유하고 access key, session token과 Bedrock API key는 커밋하지 않는다.

설정 후 `/status`에서 실제 provider, profile과 region을 확인한다. Wizard 결과는 사용자 settings에 저장되므로 팀 표준의 정본으로 사용하지 않고 managed settings나 배포 자동화로 명시한다.

## 모델과 inference profile 고정

팀 배포에서는 `sonnet` 같은 alias보다 검증한 model ID, system-defined inference profile ID 또는 application inference profile ARN을 고정한다. Alias가 가리키는 기본값, 계정에서 활성화된 model과 region별 가용성은 서로 다를 수 있다.

- Primary model과 background task model을 각각 확인한다.
- Model 변경은 설정 변경으로 review하고 품질, 비용과 latency를 다시 측정한다.
- Application inference profile을 사용하면 허용 model version과 비용 귀속 단위를 조직이 통제하기 쉽다.
- 사용자가 임의 model ID로 profile을 우회하지 못하도록 IAM resource와 managed settings를 함께 제한한다.

Claude Code 시작 시 model availability 검사가 fallback을 제안할 수 있지만, fallback을 조직의 release policy로 삼지 않는다. 배포 전에 선택한 model과 profile을 실제 계정에서 호출해 확인한다.

## IAM 최소 권한

호출 역할에는 사용하는 경로에 맞춰 다음 action이 필요할 수 있다.

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListInferenceProfiles`
- `bedrock:GetInferenceProfile`

`Resource: *`로 시작해 방치하지 않고 허용한 foundation model과 inference profile ARN으로 줄인다. Marketplace subscription과 model 사용 사례 제출 권한은 일반 개발자 역할에서 분리한다. 별도 AWS account를 쓰면 비용과 권한 경계를 단순화할 수 있지만 조직의 account 전략과 운영 비용을 함께 검토한다.

## 리전과 데이터 경계

Cross-Region Inference는 source region 하나만 보고 판단하면 안 된다.

- Geographic profile은 미국, 유럽, 아시아 태평양 같은 지정 geography 안의 지원 리전으로 요청을 routing한다.
- Global profile은 지원되는 AWS commercial region으로 routing할 수 있다.
- 처리 리전은 CloudTrail event의 `additionalEventData.inferenceRegion`으로 확인할 수 있다.
- Geographic profile은 모든 destination region을 SCP와 조직 정책에서 허용해야 한다.
- Global profile은 현재 SCP의 `aws:RequestedRegion` 조건에서 `unspecified`를 허용해야 하므로 geographic profile과 같은 region allowlist를 그대로 적용하지 않는다.

AWS 문서가 설명하는 일반 Bedrock runtime 경로에서는 입력과 출력을 기반 model 학습에 사용하지 않고, model provider가 Bedrock log, customer prompt와 completion에 접근하지 않는다. 이를 모든 model과 mode의 무보존 보장으로 확대하지 말고, 선택한 model의 retention mode와 abuse detection 조건을 확인한다. 고객은 shared responsibility model에 따라 credential, logging, 보존, 네트워크와 입력 데이터 통제를 책임진다. MCP가 가져온 사내 데이터와 로컬 transcript도 Bedrock의 데이터 경계와 별도로 관리한다.

## 감사 로그와 민감 정보

CloudTrail과 model invocation logging은 목적이 다르다.

| 로그 | 확인 대상 | 본문 포함 가능성 |
|---|---|---|
| CloudTrail | 누가 어떤 Bedrock API를 언제 호출했는가 | 일반적으로 API 활동 metadata 중심 |
| Model invocation logging | model, token, request와 response | 설정에 따라 prompt와 completion 전문 포함 |
| Claude Code local transcript | 대화와 tool execution context | 코드, 명령 출력과 민감 정보 포함 가능 |

Model invocation logging은 기본 비활성화다. 활성화하면 지원 호출의 입력과 출력을 CloudWatch Logs 또는 S3에 저장할 수 있으므로, 보안 관측 기능인 동시에 새로운 민감 데이터 저장소가 된다. 저장 목적, 대상 계정과 리전, encryption, 접근 권한, retention과 삭제 절차를 먼저 정한다.

2026-08-04 기준 Bedrock Mantle endpoint 호출은 Bedrock model invocation logging에 수집되지 않는다. Endpoint를 바꾸면 기존 audit coverage가 유지되는지 다시 검증한다.

## 비용과 생산성 측정

다음 비용 귀속 방식은 `bedrock-runtime` endpoint 기준이다. Bedrock Mantle은 Project와 Workspace를 별도 귀속 단위로 사용하고 model invocation logging에도 수집되지 않으므로, endpoint를 바꾸면 비용과 감사 pipeline을 함께 재설계한다.

- Model과 version을 고정해 단가 변화와 품질 변화를 분리한다.
- IAM principal, AWS account와 application inference profile 단위로 사용량을 귀속한다.
- Token, 요청 수와 비용에는 budget과 anomaly alert를 둔다.
- 팀별 사용량은 활동량이지 생산성 자체가 아니다. Lead time, 재작업, defect와 review 통과율을 함께 본다.
- CI에는 turn, timeout과 budget 상한을 두어 무한 agent loop를 막는다.

Prompt와 completion을 비용 분석에 그대로 저장하지 않아도 token과 principal metadata로 1차 집계가 가능하다. 상세 logging이 필요한 경우에도 최소 수집 원칙을 적용한다.

## 팀 배포 체크리스트

1. 한 계정과 한 profile에서 기능, model access와 region을 검증한다.
2. IAM role, model/profile allowlist와 credential refresh를 표준화한다.
3. Project instructions, permissions, Hook, Skills와 MCP를 Git으로 공유한다.
4. Static review와 실행 test를 CI gate로 만들어 작성자와 검증자를 분리한다.
5. CloudTrail, 필요한 invocation log와 local transcript의 보존 경계를 문서화한다.
6. Model pin, cost attribution, budget과 품질 metric을 함께 배포한다.
7. 소규모 team에서 failure mode를 수집한 뒤 조직 단위로 확장한다.

## 흔한 실패

- Bedrock IAM만 설정하면 Claude Code의 shell과 MCP도 통제된다고 생각한다.
- Model alias를 사용하면서 version과 비용이 고정됐다고 본다.
- Source region만 확인하고 cross-region profile의 destination을 검토하지 않는다.
- CloudTrail에 prompt와 response가 모두 남는다고 가정한다.
- Invocation logging을 켠 뒤 source code와 secret이 담긴 log를 넓게 공개한다.
- 장기 access key를 project settings나 shell script에 넣는다.
- 도구 사용량 증가를 개발 생산성 향상으로 보고 품질 gate를 생략한다.

## 출처

- [개인 생산성에서 조직 생산성으로, Claude Code on Amazon Bedrock 학습 플랜 - AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/claude-code-on-amazon-bedrock-training/)
- [Claude Code on Amazon Bedrock 온라인 교육 프로그램 - AWS](https://dtlpyb0rtvxql.cloudfront.net/)
- [Claude Code on Amazon Bedrock - Anthropic](https://code.claude.com/docs/en/amazon-bedrock)
- [Cross-Region Inference - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)
- [Data protection - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)
- [Data retention - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)
- [Abuse detection - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html)
- [Model invocation logging - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Cost management - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-management.html)
- [Application inference profile 비용 관리 - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-application-inference-profiles.html)

## 관련 문서

- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]
- [[Claude-Code-Operations|Claude Code 운영과 CI]]
- [[Claude-Code-Cloud-Security|Claude Code 클라우드 실행과 보안]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[IAM-Policy|AWS IAM 정책 평가]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리]]
