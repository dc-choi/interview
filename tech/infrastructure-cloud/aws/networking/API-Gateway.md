---
tags: [aws, api-gateway, rest, websocket, serverless, http-api]
status: done
category: "Infrastructure - AWS"
aliases: ["API Gateway", "AWS API Gateway", "Amazon API Gateway"]
---

# Amazon API Gateway · 관리형 API 프론트도어

API Gateway는 **REST·HTTP·WebSocket API를 생성/배포/운영**하는 관리형 게이트웨이. 클라이언트의 요청을 받아 **Lambda·HTTP 백엔드·AWS 서비스·VPC 리소스**로 라우팅하고, 그 앞단에서 **인증·스로틀링·캐싱·CORS·변환**을 처리한다. 서버리스 백엔드의 **HTTPS 엔드포인트 표준 진입점**.

## API 타입 3종

| 타입 | 프로토콜 | 특징 | 가격/지연 |
|---|---|---|---|
| **REST API** | HTTPS | 풀 기능 (캐싱·요청 검증·매핑 템플릿·SDK 생성·WAF 통합) | 비쌈, 지연 약간 높음 |
| **HTTP API** | HTTPS | 경량·저지연·저비용. REST API 기능 일부 미지원 | REST 대비 ~70% 저렴, 빠름 |
| **WebSocket API** | WSS | 양방향 영구 연결. `$connect/$disconnect/$default` 라우트 키 기반 | 채팅·실시간 알림·게임 |

REST와 HTTP는 둘 다 RESTful API를 만들 수 있으나, **REST API는 기능 풀세트, HTTP API는 단순·빠름**. 신규는 가능하면 HTTP API 권장.

## 핵심 구성요소

- **Resource** — URI 경로 트리(`/users`, `/users/{id}`). 각 리소스에 메서드를 단다
- **Method** — `GET`·`POST`·`PUT`·`DELETE`·`OPTIONS` 등 HTTP 메서드. 통합(integration) 대상(Lambda·HTTP·AWS 서비스·Mock)을 지정
- **Stage** — 리소스·메서드 묶음을 배포한 환경(`dev`·`prod`). 각 스테이지마다 고유 invoke URL
- **Deployment** — 현재 리소스 트리를 스테이지에 스냅샷으로 배포. **배포해야 변경이 외부에 반영됨**

## 엔드포인트 타입

- **Edge-Optimized** (기본) — CloudFront 글로벌 엣지를 거쳐 가까운 PoP에서 응답. 글로벌 API에 적합
- **Regional** — 같은 리전 클라이언트(또는 자체 CloudFront/CDN 앞단)에 직접 노출
- **Private** — VPC 내부에서만 접근 가능. VPC 엔드포인트(인터페이스)를 통해 호출

## Stage · Deployment · Canary

- 배포 사이클: **리소스/메서드 정의 → 배포(Deployment) → 스테이지에 연결**
- **Stage Variables** — 스테이지마다 다른 값(Lambda alias, 백엔드 URL) 주입 → 동일 코드로 dev/prod 분기
- **Canary 배포** — 새 배포를 일부 트래픽(예: 10%)에만 흘리고 점진 확장. 실패 시 즉시 롤백
- **Lambda alias + Stage variable** 조합으로 코드와 게이트웨이 양쪽에서 카나리/블루-그린 가능

## Authorizer (인증·인가)

| 종류 | 동작 | 용도 |
|---|---|---|
| **IAM Authorization** | SigV4 서명 검증, 호출자 IAM 권한 체크 | AWS 내부 서비스·SDK 호출 |
| **Lambda Authorizer** (구 Custom) | 토큰/요청 컨텍스트를 Lambda가 검증 → IAM 정책 반환 | 외부 JWT·OAuth·맞춤 인증 |
| **Cognito User Pools Authorizer** | Cognito가 발급한 JWT 검증 | 모바일/웹 앱 사용자 인증 |

HTTP API는 더해 **JWT Authorizer**(Cognito 외 다른 OIDC IdP)를 네이티브 지원.

## 통합 타입 (Integration)

- **Lambda Proxy** — 요청을 그대로 Lambda로 전달, Lambda 응답을 그대로 클라이언트에 (가장 흔함)
- **Lambda Custom** — 매핑 템플릿으로 요청/응답을 변환 후 Lambda 호출
- **HTTP / HTTP Proxy** — 외부/내부 HTTP 엔드포인트로 프록시
- **AWS Service** — DynamoDB·SQS·SNS 등 AWS 서비스 직접 호출 (Lambda 없이도 간단한 PUT/Query 가능)
- **Mock** — 백엔드 없이 정적 응답. CORS preflight 처리에 활용
- **VPC Link** — VPC 내부 NLB(또는 PrivateLink)로 연결 → API Gateway에서 사설 리소스 호출

## 트래픽 제어

- **Throttling** — 계정/스테이지/메서드별로 **rate(rps) + burst(동시)** 한도. 기본 10,000 rps / 5,000 burst (계정)
- **Usage Plan + API Key** — API 키별 분기·요청 한도. SaaS 제공시 클라이언트별 쿼터
- **Caching** — 스테이지별로 0.5~237GB 캐시. TTL·쿼리 파라미터 기반 캐시 키. **REST API 전용** (HTTP API는 미지원)
- **CORS** — 콘솔에서 활성화 시 OPTIONS 메서드와 헤더 자동 설정
- **WAF** — Regional/Edge 엔드포인트 앞단에 WAF 연결, SQLi/XSS/IP 차단

## Mapping Template

- **Velocity Template Language(VTL)** 로 요청/응답 변환
- 클라이언트 입력 → 백엔드 입력 형태로 가공 (예: JSON → XML)
- 헤더·쿼리스트링·path parameter를 백엔드 페이로드에 주입
- HTTP API는 매핑 템플릿 미지원 — 단순 프록시 위주

## 모니터링·관측

- **CloudWatch Metrics** — 4XXError·5XXError·Latency·IntegrationLatency·CacheHitCount
- **CloudWatch Logs** — 메서드/스테이지별 액세스 로그
- **X-Ray** — 분산 추적. Gateway → Lambda → DynamoDB 호출 체인 시각화

## 실무 패턴

- **서버리스 3종 세트** — API Gateway + Lambda + DynamoDB
- **정적 + 동적 분리** — CloudFront로 정적 S3, 동적은 API Gateway → Lambda
- **백엔드 보호** — Throttling·API Key·WAF로 DoS·악성 호출 차단
- **마이크로서비스 게이트웨이** — VPC Link로 내부 ECS/EKS 서비스 묶기
- **WebSocket 실시간** — 연결 ID를 DynamoDB에 저장, fanout은 Gateway Management API로

## 시험 체크포인트

- REST · HTTP · WebSocket **세 API 타입의 차이**(기능·가격·지연)
- **엔드포인트 3종**(Edge-Optimized·Regional·Private)과 적합한 시나리오
- **Authorizer 3가지**(IAM·Lambda·Cognito)와 각 사용처
- Stage·Deployment·**Canary 배포** 동작 방식
- **Throttling·Caching·Usage Plan**으로 트래픽/비용 통제
- **VPC Link** — Gateway에서 사설 NLB로 연결
- **Mapping Template / VTL** — 요청/응답 변환 (REST API만)
- API Gateway + CloudFront + WAF + Lambda 조합의 역할 분담

## 출처
- AWS SAA C03 학습 자료 (로컬)
- [Amazon API Gateway 공식 문서](https://docs.aws.amazon.com/apigateway/)

## 관련 문서
- [[AWS-Lambda|AWS Lambda]]
- [[Cognito|Amazon Cognito]]
- [[CloudFront|CloudFront]]
- [[Route53|Route 53]]
- [[IAM|IAM]]
- [[ELB]]
- [[AWS|AWS]]
