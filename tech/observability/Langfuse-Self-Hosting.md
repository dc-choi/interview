---
tags: [langfuse, llm, observability, self-hosting, ecs]
status: done
verified_at: 2026-11-04
category: "관측가능성(Observability)"
aliases: ["Langfuse Self Hosting", "Langfuse 자체 호스팅"]
---

# Langfuse 자체 호스팅과 수집 경계

Langfuse는 LLM 호출의 입력, 출력과 중간 실행을 추적하고 지연, 토큰 사용량, 비용과 평가 결과를 살펴보는 도구다. 자체 호스팅에서는 애플리케이션뿐 아니라 추적 데이터를 저장하고 처리하는 구성도 운영한다.

2026-11-04 공식 self-hosting 문서의 v4 표기를 기준으로 정리했다. 실제 AWS 배포나 SDK 연동 시험은 하지 않았다.

## 과거 배포 예제를 적용하기 전에

2024년 AWS의 ECS/Fargate 예제는 컨테이너와 PostgreSQL을 중심으로 구성하고, LangChain callback으로 실행 과정을 기록한다. 예제의 이미지, SDK import와 환경 변수를 현재 버전에 그대로 적용할 수 있다고 가정하지 않는다.

현재 공식 AWS 배포 안내는 Terraform 모듈을 제공하며 기존 AWS 자원을 사용하는 설정도 지원한다. Kubernetes의 Helm 배포도 별도 선택지다. 과거 CDK 예제와 현재 공식 배포 모듈을 같은 구성으로 취급하지 않는다.

## 현재 구성 요소와 데이터 흐름

| 구성 요소 | 역할 |
| --- | --- |
| Web | UI와 API 제공, 이벤트 수신 |
| Worker | 비동기 이벤트 처리 |
| PostgreSQL | 트랜잭션 데이터 저장 |
| ClickHouse | trace, observation, score 등 관측 데이터 저장 |
| Redis/Valkey | 작업 큐와 캐시 |
| S3/Blob Store | 수신 이벤트, 멀티모달 입력과 큰 내보내기 저장 |

Web이 받은 추적 이벤트는 먼저 객체 저장소에 기록되고, Redis에는 큐 처리를 위한 참조가 들어간다. Worker가 객체 저장소에서 읽어 ClickHouse에 반영한다. 따라서 수신 성공과 분석 화면에서 조회 가능한 시점은 구분해야 한다.

Docker Compose는 로컬 사용과 시험용 단일 VM 구성이다. 해당 구성에 고가용성, 확장과 백업이 갖춰졌다고 가정하지 않는다. 자체 호스팅에도 일부 부가 기능은 별도 라이선스가 필요하다.

## 민감정보는 어느 경계 전에 가리는가

클라이언트 마스킹은 SDK가 데이터를 전송하기 전에 적용한다. 민감정보가 애플리케이션 밖으로 나가면 안 되는 요구라면 이 단계가 필요하다.

서버 수집 마스킹은 Enterprise 기능이며 Worker의 HTTP callback으로 처리한다. 마스킹 전에 이벤트가 Blob Store에 임시로 저장될 수 있으므로, ClickHouse에 가려진 값만 보인다고 원문이 수집되지 않았다는 뜻은 아니다.

서버 callback은 `/api/public/otel`로 들어온 이벤트에 적용된다. 이전 `/api/public/ingestion` 경로에는 적용되지 않는다. SDK와 수집 경로를 함께 확인한다.

callback 실패의 기본 동작은 fail open이다. 마스킹 없이 이벤트를 처리할 수 있다. `LANGFUSE_INGESTION_MASKING_CALLBACK_FAIL_CLOSED=true`는 실패나 시간 초과 때 이벤트를 버리므로 개인정보 노출과 관측 데이터 손실의 선택을 운영 요구에 맞춰 검토한다. 이 설정도 앞단 Blob Store에 원문이 들어오는 경계를 없애지는 않는다.

## 프로세스 상태와 수집 완료를 따로 확인한다

| 검사 | 확인 범위 |
| --- | --- |
| Web `/api/public/health` | 기본값은 API 실행 여부이며 DB 연결은 검사하지 않음 |
| Web `/api/public/health?failIfDatabaseUnavailable=true` | DB 연결 검사 추가 |
| Web `/api/public/ready` | 트래픽 수신 준비, 종료 신호를 받으면 500 반환 |
| Worker `/api/health` | Worker 상태와 DB 연결 |

연결 검사만으로 큐 소비가 멈춘 Worker를 찾을 수는 없다. 현재 문서는 큐 처리 정체 검사 옵션도 제공하지만, 유휴 replica가 많은 환경에서는 임계값 조정이 필요하다.

운영 점검안으로 합성 trace 하나를 보내 수신, Worker 처리와 최종 조회를 이어 확인한다. health 응답만으로 전체 수집 경로의 정상 동작을 판정하지 않는다. 컨테이너 내부 health check는 이미지에 포함된 `wget`과 `127.0.0.1`을 사용하도록 안내되어 있으며, 외부 실행용 `curl` 예제를 그대로 복사하지 않는다.

## 출처

- [Amazon ECS와 AWS Fargate를 사용하여 AWS CDK Python으로 Langfuse 호스팅하기 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/hosting-langfuse-with-aws-cdk-python-using-amazon-ecs-and-aws-fargate/) — 2024년 배포와 추적 예제
- [Langfuse, Self-host Langfuse](https://langfuse.com/self-hosting) — v4 구성과 이벤트 흐름, 배포 책임
- [Langfuse, Deploy Langfuse on AWS with Terraform](https://langfuse.com/self-hosting/deployment/aws) — 현재 AWS 배포 안내
- [Langfuse, Data Masking](https://langfuse.com/self-hosting/security/data-masking) — 클라이언트와 서버 경계, Blob Store, 수집 경로와 실패 정책
- [Langfuse, Health and Readiness Check Endpoints](https://langfuse.com/self-hosting/configuration/health-readiness-endpoints) — 검사 범위와 컨테이너 내부 probe

## 관련 문서

- [[OpenTelemetry|OpenTelemetry와 추적 문맥]]
- [[PII-Masking|개인정보 마스킹]]
- [[Log-Pipeline|로그 파이프라인]]
