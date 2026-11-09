---
tags: [aws, api-gateway, rest, websocket, serverless, http-api]
status: done
category: "Infrastructure - AWS"
aliases: ["API Gateway", "AWS API Gateway", "Amazon API Gateway"]
verified_at: 2026-11-09
---

# Amazon API Gateway, 관리형 API 프론트도어

API Gateway는 **REST, HTTP, WebSocket API를 생성/배포/운영**하는 관리형 게이트웨이. 클라이언트의 요청을 받아 **Lambda, HTTP 백엔드, AWS 서비스, VPC 리소스**로 라우팅하고, 그 앞단에서 **인증, 스로틀링, 캐싱, CORS, 변환**을 처리한다. 서버리스 백엔드의 **HTTPS 엔드포인트 표준 진입점**.

## API 타입 3종

| 타입 | 프로토콜 | 특징 | 가격/지연 |
|---|---|---|---|
| **REST API** | HTTPS | 풀 기능 (캐싱, 요청 검증, 매핑 템플릿, SDK 생성, WAF 통합) | 비쌈, 지연 약간 높음 |
| **HTTP API** | HTTPS | 경량, 저지연, 저비용. REST API 기능 일부 미지원 | REST API보다 단가가 낮은 편, 빠름 |
| **WebSocket API** | WSS | 양방향 영구 연결. `$connect/$disconnect/$default` 라우트 키 기반 | 채팅, 실시간 알림, 게임 |

REST와 HTTP는 둘 다 RESTful API를 만들 수 있으나, **REST API는 기능 풀세트, HTTP API는 단순, 빠름**. 신규는 가능하면 HTTP API 권장.

## REST API 핵심 구성요소

- **Resource** — URI 경로 트리(`/users`, `/users/{id}`). 각 리소스에 메서드를 단다
- **Method** — `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` 등 HTTP 메서드. 통합(integration) 대상(Lambda, HTTP, AWS 서비스, Mock)을 지정
- **Stage** — 리소스, 메서드 묶음을 배포한 환경(`dev`, `prod`). 각 스테이지마다 고유 invoke URL
- **Deployment** — 현재 리소스 트리를 스테이지에 스냅샷으로 배포. **배포해야 변경이 외부에 반영됨**

## REST API 엔드포인트 타입

- **Edge-Optimized** (기본) — CloudFront 글로벌 엣지를 거쳐 가까운 PoP에서 응답. 글로벌 API에 적합
- **Regional** — 같은 리전 클라이언트(또는 자체 CloudFront/CDN 앞단)에 직접 노출
- **Private** — VPC 내부에서만 접근 가능. VPC 엔드포인트(인터페이스)를 통해 호출

## REST API Stage, Deployment, Canary

- 배포 사이클: **리소스/메서드 정의 → 배포(Deployment) → 스테이지에 연결**
- **Stage Variables** — 스테이지마다 다른 값(Lambda alias, 백엔드 URL) 주입 → 동일 코드로 dev/prod 분기
- **Canary 배포** — 새 배포를 일부 트래픽(예: 10%)에만 흘리고 점진 확장. 실패 시 즉시 롤백
- **Lambda alias + Stage variable** 조합으로 코드와 게이트웨이 양쪽에서 카나리/블루-그린 가능

## Authorizer (인증, 인가)

| 종류 | 동작 | 용도 |
|---|---|---|
| **IAM Authorization** | SigV4 서명 검증, 호출자 IAM 권한 체크 | AWS 내부 서비스, SDK 호출 |
| **Lambda Authorizer** (구 Custom) | 토큰/요청 컨텍스트를 Lambda가 검증 → IAM 정책 반환 | 외부 JWT, OAuth, 맞춤 인증 |
| **Cognito User Pools Authorizer** | Cognito가 발급한 JWT 검증 | 모바일/웹 앱 사용자 인증 |

HTTP API는 더해 **JWT Authorizer**(Cognito 외 다른 OIDC IdP)를 네이티브 지원.

## 통합 타입 (Integration)

- **Lambda Proxy** — 요청을 그대로 Lambda로 전달, Lambda 응답을 그대로 클라이언트에 (가장 흔함)
- **Lambda Custom** — 매핑 템플릿으로 요청/응답을 변환 후 Lambda 호출
- **HTTP / HTTP Proxy** — 외부/내부 HTTP 엔드포인트로 프록시
- **AWS Service** — DynamoDB, SQS, SNS 등 AWS 서비스 직접 호출 (Lambda 없이도 간단한 PUT/Query 가능)
- **Mock** — 백엔드 없이 정적 응답. CORS preflight 처리에 활용
- **VPC Link** — 2026-09-03 AWS 문서 기준, REST API는 VPC link V2로 ALB에 직접 비공개 통합할 수 있다. NLB 전용 VPC link V1은 레거시이며, REST API의 비공개 통합은 Cloud Map을 지원하지 않는다. HTTP API는 ALB, NLB 또는 Cloud Map 서비스를 지원한다

### HTTP API의 비공개 통합 구성

2026-11-09 공식 문서 기준, 내부 ALB를 HTTP API 뒤에 두는 순서와 조건이다.

1. **VPC link V2 생성** — subnet과 security group을 지정한다. 생성 뒤에는 subnet과 security group을 바꿀 수 없으므로 처음부터 대상 로드밸런서에 닿는 private subnet과 규칙을 고른다. subnet은 공식 가용 표에 나온 리전과 AZ ID 안에 있어야 한다. 상태가 `PENDING`에서 `AVAILABLE`로 바뀌기까지 몇 분 걸릴 수 있다. 하나의 VPC link를 여러 리소스와 API에서 재사용할 수 있다.
2. **통합 생성** — ALB나 NLB는 HTTP proxy 통합에 VPC link와 로드밸런서 **listener ARN**을 지정한다. Cloud Map은 서비스 ARN을 지정하며, 등록한 리소스에 IP 주소와 port가 있어야 한다. 로드밸런서나 Cloud Map 서비스, VPC link, HTTP API는 모두 같은 AWS 계정 소유여야 한다.
3. **배포** — 자동 배포를 켜지 않았으면 stage에 배포한 뒤 invoke URL로 확인한다.

- 비공개 통합 트래픽은 기본적으로 HTTP다. 백엔드까지 HTTPS가 필요하면 통합에 `tlsConfig`를 지정한다. 콘솔에서는 고급 설정에서 보안 서버 이름을 입력한다.
- API Gateway는 invoke URL의 stage 부분을 백엔드 요청 경로에 포함한다. `test` stage라면 백엔드는 `test/<route 경로>`를 받으므로, 백엔드가 이를 기대하지 않으면 parameter mapping으로 경로를 `$request.path`로 덮어쓴다.
- 60일 동안 VPC link로 트래픽이 없으면 `INACTIVE`가 되고 API Gateway가 VPC link의 네트워크 인터페이스를 지운다. 그동안 VPC link에 의존하는 요청은 실패하고, 요청이 다시 들어오면 재프로비저닝에 몇 분이 걸린다. 그 몇 분 동안 요청이 계속 실패할 수 있으므로 사용량이 드문 내부 API는 이를 감안하고 VPC link 상태를 모니터링한다.

## 트래픽 제어

- **Throttling** — 계정/스테이지/메서드별로 **rate(rps) + burst bucket** 한도. burst는 token bucket의 순간 요청 흡수 용량이지 동시 실행 수가 아니다. 계정, 리전 기본값은 보통 10,000 rps와 최대 bucket 5,000이지만, 일부 리전은 2,500 rps와 1,250 burst이며 최신 quota는 공식 표를 확인한다.
- **Usage Plan + API Key (REST API와 WebSocket API 지원, HTTP API 미지원)** — API 키별 분기와 요청 한도를 설정한다. WebSocket API는 `$connect` 라우트에서 API 키를 요구하도록 설정해 usage plan과 함께 쓴다. API 키는 인증이나 인가 수단이 아니며 quota와 throttling은 best effort이므로 비용 통제나 접근 차단의 유일한 장치로 쓰면 안 된다
- **Caching** — 스테이지별로 0.5~237GB 캐시. TTL, 쿼리 파라미터 기반 캐시 키. **REST API 전용** (HTTP API는 미지원)
- **CORS** — 콘솔에서 활성화 시 OPTIONS 메서드와 헤더 자동 설정
- **WAF (REST API 전용)** — REST API stage에 Regional WAFv2 Web ACL을 연결해 SQLi, XSS, IP 기반 요청을 필터링한다

## Mapping Template

- **Velocity Template Language(VTL)** 로 요청/응답 변환
- 클라이언트 입력 → 백엔드 입력 형태로 가공 (예: JSON → XML)
- 헤더, 쿼리스트링, path parameter를 백엔드 페이로드에 주입
- HTTP API는 매핑 템플릿 미지원 — 단순 프록시 위주

## 모니터링, 관측

- **CloudWatch Metrics** — 4XXError, 5XXError, Latency, IntegrationLatency, CacheHitCount
- **CloudWatch Logs** — 메서드/스테이지별 액세스 로그
- **X-Ray** — 분산 추적. Gateway → Lambda → DynamoDB 호출 체인 시각화

### 요청 ID로 실패 요청 찾기

2026-10-07 공식 문서 기준, API 종류에 따라 응답 헤더와 로그 지원 범위를 구분한다.

| 대상 | 수집할 값 | 주의점 |
|---|---|---|
| REST API 요청 ID | `x-amzn-RequestId`, 로그의 `$context.requestId` | 클라이언트가 유효한 UUID로 덮어쓸 수 있어 단독 식별 근거로 신뢰하지 않는다 |
| REST API 확장 요청 ID | `x-amz-apigw-id`, 로그의 `$context.extendedRequestId` | API Gateway가 생성하며 호출자가 덮어쓸 수 없다 |
| HTTP API 응답 | `apigw-requestid` | REST API 헤더명으로 찾지 않는다. 실행 로그를 지원하지 않아 액세스 로그나 응답 헤더를 확인한다 |

- REST API 액세스 로그 형식에는 두 ID를 함께 넣는다. 실행 로그와 액세스 로그는 별도로 활성화하며, 응답 헤더는 브라우저 Network 탭이나 `curl -v`로 확인할 수 있다.
- REST API의 CloudWatch 로그 권한은 `apigateway.amazonaws.com`을 신뢰하는 IAM 역할과 리전별 `cloudWatchRoleArn` 설정을 확인한다. 해당 리전의 STS도 활성화되어 있어야 한다.
- 로그가 없으면 요청이 해당 API와 stage에 도달했는지, 액세스 로그가 켜졌는지부터 확인한다. 액세스 로그는 도달한 요청의 인증, 인가, 스로틀링과 WAF 거절도 포함하므로 로그 부재만으로 정상 처리라고 판단하지 않는다.

이 절의 요청 식별과 로깅 조건만 대조했으며 기존 기능과 quota 전체를 재검증한 것은 아니다.

## 다른 AWS 계정에서 호출하기

2026-11-09 공식 문서 기준, 엔드포인트 종류와 IAM 인증 사용 여부에 따라 경로가 갈린다.

| 상황 | 필요한 구성 |
|---|---|
| Public 엔드포인트(Regional, Edge-Optimized), IAM 인증 없음 | 다른 계정에서도 invoke URL이나 custom domain name으로 호출한다. 호출 가능 여부는 계정이 아니라 resource policy, authorizer와 WAF 같은 접근 제어 설정이 정한다 |
| Private REST API | 소비자 계정의 VPC에 `execute-api` interface VPC endpoint를 두고, API resource policy에서 그 endpoint를 `aws:SourceVpce`(또는 VPC를 `aws:SourceVpc`)로 허용한다. 다른 계정의 VPC endpoint에도 접근을 줄 수 있다 |
| Private custom domain name | 제공자가 API Gateway나 AWS RAM으로 도메인을 공유하고 도메인 resource policy에 소비자의 VPC endpoint를 허용한다. 소비자가 자기 VPC endpoint와 도메인 사이의 domain name access association을 직접 만들고, Route 53 private hosted zone에 도메인을 VPC endpoint로 가리키는 alias 레코드를 만든다 |
| REST API + IAM 인증 | API resource policy에 소비자 계정의 IAM role이나 user를 넣어 `execute-api:Invoke`를 허용하고, 호출자의 IAM 정책도 같은 권한을 허용한다. 요청은 SigV4로 서명한다 |
| HTTP API + IAM 인증 | HTTP API는 resource policy를 지원하지 않는다. AWS Knowledge Center 글과 영상 기준, API 계정에 `execute-api` 권한을 가진 role을 두고 소비자가 STS `AssumeRole`로 받은 임시 자격 증명으로 서명해 호출한다. IAM의 교차 계정 role 일반 규칙대로 그 role의 trust policy `Principal`에 소비자 계정을 지정하고, 소비자 계정도 자기 사용자에게 그 role에 대한 `sts:AssumeRole` 권한을 명시적으로 주어야 한다 |

- **교차 계정 IAM 평가** — 같은 계정 호출은 IAM 정책과 resource policy 중 하나만 명시적으로 허용해도 통과한다. 다른 계정 호출은 둘 다 명시적으로 허용해야 하며, 한쪽이라도 침묵하면 암묵적 거부, 한쪽이라도 Deny면 명시적 거부다. resource policy만 고치고 소비자 계정의 IAM 정책을 빠뜨리면 403이 난다. resource policy를 고친 뒤 재배포하지 않은 경우도 같은 증상이 난다.
- **Private API 호출 방식** — 소비자 VPC endpoint에 private DNS를 켜면 `{rest-api-id}.execute-api.{region}.amazonaws.com`으로 바로 부른다. 대신 그 VPC에서 public API의 기본 엔드포인트에 닿지 못한다. public API는 custom domain name으로 부르거나, private DNS를 끄고 private API마다 private hosted zone을 만드는 방법이 있다. private DNS를 끈 상태에서는 VPC endpoint 전용 DNS에 `Host`나 `x-apigw-api-id` 헤더를 붙이거나, VPC endpoint를 API에 연결해 생기는 Route 53 alias(`{rest-api-id}-{vpce-id}.execute-api.{region}.amazonaws.com`)를 쓴다.
- resource policy를 바꾸거나 VPC endpoint를 API에 연결 또는 해제한 뒤에는 API를 다시 배포해야 반영된다. 정책 저장만으로는 런타임 동작이 바뀌지 않는다.
- private custom domain name은 도메인과 VPC endpoint가 같은 리전에 있어야 하고, 소비자는 RAM 공유를 12시간 안에 수락해야 한다. 제공자와 같은 AWS Organizations 조직이면 공유가 자동으로 수락된다. association이 동작하기까지 최대 15분이 걸릴 수 있다. 소비자의 요청은 도메인 resource policy, private API resource policy와 VPC endpoint policy를 모두 통과해야 한다.

## 실무 패턴

- **서버리스 3종 세트** — API Gateway + Lambda + DynamoDB
- **정적 + 동적 분리** — CloudFront로 정적 S3, 동적은 API Gateway → Lambda
- **백엔드 보호** — 인증과 인가, Throttling, WAF를 조합한다. API Key는 사용량 식별용이며 접근 통제를 대신하지 않는다
- **마이크로서비스 게이트웨이** — VPC Link로 내부 ECS/EKS 서비스 묶기
- **WebSocket 실시간** — 연결 ID를 DynamoDB에 저장, fanout은 Gateway Management API로

## 시험 체크포인트

- REST, HTTP, WebSocket **세 API 타입의 차이**(기능, 가격, 지연)
- **엔드포인트 3종**(Edge-Optimized, Regional, Private)과 적합한 시나리오
- **Authorizer 3가지**(IAM, Lambda, Cognito)와 각 사용처
- Stage, Deployment, **Canary 배포** 동작 방식
- **Throttling, Caching, Usage Plan**으로 트래픽/비용 통제
- **VPC Link** — Gateway에서 사설 ALB 또는 NLB로 연결. REST API는 VPC link V2로 ALB에 직접 연결하고, HTTP API는 ALB, NLB, Cloud Map을 지원
- **Mapping Template / VTL** — 요청/응답 변환 (REST API만)
- API Gateway + CloudFront + WAF + Lambda 조합의 역할 분담

## 출처
- [AWS 공식 문서, Access logging for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-access-logging.html)
- [AWS 공식 문서, Set up CloudWatch logging for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html)
- [How do I collect API Gateway extended request IDs? — AWS re:Post](https://repost.aws/knowledge-center/collect-api-gateway-extended-request-ids)
- AWS SAA C03 학습 자료 (로컬)
- [Amazon API Gateway 공식 문서](https://docs.aws.amazon.com/apigateway/)
- [AWS 공식 문서, Amazon API Gateway quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html)
- [AWS 공식 문서, API endpoint types for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html)
- [AWS 공식 문서, Stage variables for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html)
- [AWS 공식 문서, Canary release deployments for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/create-canary-deployment.html)
- [AWS 공식 문서, Usage plans and API keys for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)
- [AWS 공식 문서, AWS WAF for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html)
- [AWS 공식 문서, Private integrations for REST APIs in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/private-integration.html)
- [AWS 공식 문서, WebSocket API routes](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html)
- [AWS 공식 문서, Create private integrations for HTTP APIs in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html)
- [AWS 공식 문서, Set up VPC links V2 in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html)
- [AWS 공식 문서, Stages for HTTP APIs in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html)
- [AWS 공식 문서, How API Gateway resource policies affect authorization workflow](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html)
- [AWS 공식 문서, Private REST APIs in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html)
- [AWS 공식 문서, Create a private API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-create.html)
- [AWS 공식 문서, Invoke a private API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-test-invoke-url.html)
- [AWS 공식 문서, Custom domain names for private APIs in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html)
- [AWS 공식 문서, Create and attach an API Gateway resource policy to an API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-create-attach.html)
- [AWS 공식 문서, Domain name access associations for private custom domain names](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains-associations.html)
- [AWS 공식 문서, Consume a private custom domain name](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains-consumer-create.html)
- [AWS 공식 문서, Share a private custom domain name](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains-provider-share.html)
- [AWS 공식 문서, Control access to HTTP APIs with IAM authorization in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-access-control-iam.html)
- [AWS 공식 문서, Choose between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [AWS 공식 문서, Access for an IAM user in another AWS account that you own](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_aws-accounts.html)
- [How do I provide cross-account IAM authorization for API Gateway HTTP APIs? — AWS re:Post](https://repost.aws/knowledge-center/api-gateway-iam-cross-account)
- [How do I access an API Gateway API from another AWS account? — Amazon Web Services](https://www.youtube.com/watch?v=NV1RJa9YCYo)

## 관련 문서
- [[AWS-Lambda|AWS Lambda]]
- [[Cognito|Amazon Cognito]]
- [[CloudFront|CloudFront]]
- [[Route53|Route 53]]
- [[IAM|IAM]]
- [[ELB]]
- [[AWS서비스(AWSServices)|AWS]]
