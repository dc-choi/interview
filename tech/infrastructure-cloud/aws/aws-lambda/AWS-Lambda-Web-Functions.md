---
tags: [aws, lambda, serverless, web-functions, http, concurrency, multi-region]
status: done
verified_at: 2026-11-24
category: "Infrastructure - AWS"
aliases: ["AWS Lambda Web Functions", "Lambda Web Functions", "람다 웹 펑션스"]
---

# Lambda Web Functions — 포트에서 대기하는 HTTP 서버를 서버리스로 실행

Lambda Web Functions는 이벤트 핸들러 대신 포트에서 HTTP 요청을 기다리는 웹 서버를 그대로 올리는 Lambda의 실행 유형이다. 기존 이벤트 핸들러 방식(Event Functions)은 실행 환경 하나가 한 번에 요청 하나를 처리하지만, Web Functions는 실행 환경 하나가 여러 요청을 동시에 처리한다. 동시 요청이 늘어도 실행 환경을 그만큼 새로 만들지 않으므로 cold start를 겪는 요청 비율이 줄어든다. cold start가 사라지는 것은 아니다.

아래 수치와 동작은 2026-11-24 AWS Lambda 개발자 가이드 기준이다. 출시 직후의 서비스라 런타임, quota와 지원 리전이 바뀔 수 있으므로 적용 전에 다시 확인한다.

## 실행 유형 비교

AWS 개발자 가이드는 Lambda의 컴퓨팅 기본 단위를 Event Functions, Web Functions와 MicroVMs 셋으로 나눈다. Managed Instances와 Durable Functions는 Event Functions의 실행 선택지다.

| 유형 | 한 실행 환경의 동시 처리 | 상태 | 주 용도 |
|---|---|---|---|
| Event Functions (기본) | 요청 하나 | 호출 간 유지 보장 없음 | S3, SQS 같은 이벤트 처리 |
| Event Functions, Managed Instances | 여러 호출 | 환경이 호출 사이에도 계속 실행, 공유 상태 격리 필요 | 고객 계정 EC2 용량 활용 |
| Event Functions, Durable | 요청 하나 | checkpoint로 재개 | 장기 워크플로 |
| Web Functions | 기본 64, 최대 128 | 요청 사이에도 서버가 계속 실행되어 환경을 재사용하는 동안 전역 상태가 남지만 수명은 보장되지 않음, 동시 접근에 안전해야 함 | HTTP API, 웹 백엔드 |
| MicroVMs | 여러 동시 연결(사용자나 작업마다 전용 MicroVM) | suspend/resume으로 상태 보존 | 격리 샌드박스 |

각 유형의 수명주기와 격리 경계는 [[AWS-Lambda-Execution-Model|Lambda 실행 모델]]과 [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]에 있다.

## 리소스 구조

- **Web Function**: 최상위 리소스다.
- **Revision**: 코드와 설정(타임아웃, 환경 변수, 동시성 상한 등)의 변경 불가능한 스냅샷이다. 코드나 설정을 바꾸면 새 revision을 만든다. Web Function당 50개는 자동 정리의 목표치로 조정할 수 없지만, 개수가 잠시 50을 넘을 수 있다. 모든 가중치에서 뺀 revision은 롤백 대상으로 남겨 두려던 것이라도 자동 정리로 지워질 수 있으므로, 테스트 endpoint에 가중치를 남겨 두거나 같은 S3 객체 버전으로 다시 만들 수 있게 보관한다.
- **Endpoint**: HTTP 트래픽을 revision으로 보내는 진입점이다. 고유 도메인, 인증 방식과 확장 설정을 가진다. Web Function당 최대 10개이고, 한 endpoint는 동시에 최대 2개 revision에 1~100의 가중치로 트래픽을 나눈다. prod와 dev endpoint를 따로 두거나 90대 10으로 새 revision을 점진 배포하는 데 쓴다.
- endpoint는 HTTPS 443 포트만 받는다. 사용자 도메인을 endpoint에 직접 붙일 수 없어 CloudFront의 origin으로 Lambda가 할당한 도메인을 지정한다.

## Endpoint의 리전 유형

| 유형 | 도메인 | 라우팅 |
|---|---|---|
| HomeRegion | 홈 리전 도메인 하나 | 홈 리전에서만 처리 |
| MultiRegion | 전역 도메인 하나 | 네트워크 지연 기준 best-effort 라우팅, 상태 기반 failover 없음 |
| PerRegion | 리전마다 별도 도메인 | 자동 라우팅 없음, Route 53이나 CloudFront로 직접 제어 |

- endpoint 유형과 리전 집합은 생성 때 고정된다. 바꾸려면 새 endpoint를 만들고 클라이언트를 새 도메인으로 옮긴다.
- 복제된 리소스는 복제 리전에서 콘솔과 API로 보거나 바꿀 수 없고 제어는 홈 리전에서만 한다. quota와 `rateLimit`은 리전마다 따로 적용된다.
- 인증 방식이 IamAuth인 endpoint는 Lambda가 요청마다 서명을 검증하며, MultiRegion 전역 도메인은 SigV4a, HomeRegion과 PerRegion 도메인은 SigV4로 서명한다. ApplicationManaged는 Lambda가 인증하지 않고 모든 요청을 애플리케이션에 넘기므로 인증을 애플리케이션이 맡는다.
- 데이터를 특정 리전 안에서만 처리해야 하는 요구가 있으면 지연 기준으로 다른 리전에 보낼 수 있는 MultiRegion보다 PerRegion이나 HomeRegion이 맞다. 다만 VPC의 사설 리소스에 닿는 egress network connector는 HomeRegion endpoint만 지원한다. 코드 복제는 데이터베이스의 다중 리전 복제가 아니다.
- 서울 리전을 홈 리전이나 대상 리전으로 쓸 수 있는지는 이번 대조에서 확인하지 못했다. 계정의 지원 리전 목록으로 확인한다.

## 실행 환경과 설정

| 항목 | 값 (2026-11-24 문서 기준) |
|---|---|
| 실행 환경 사양 | Arm64 vCPU 2개, 메모리 2GB |
| 런타임 | `nodejs24.x`, `nodejs26.x` 지원, `python3.15` preview. 패치 버전은 AWS가 자동 적용하며 고정하거나 끌 수 없음 |
| 환경당 동시 요청 | 기본 64, 1~128. 설정값은 상한이며 Lambda가 동적으로 더 낮출 수 있음 |
| 타임아웃 | 기본 30초, 3~900초 |
| 요청 헤더 크기 | 128KiB |
| 배포 패키지 | 압축 해제 512MB. 코드는 versioning을 켠 S3 버킷의 .zip으로만 제공 |

- 서버는 시작 후 10초 안에 포트에서 대기해야 한다.
- revision과 endpoint의 Active는 서버가 정상 기동했다는 뜻이 아니다. Lambda는 endpoint를 revision에 연결할 때 서버가 실제로 대기하는지 확인하지 않으므로, 배포 뒤 직접 요청해 확인한다.
- 참조한 S3 객체 버전이 지워지거나 접근 권한을 잃으면 revision이 Failed가 되고 트래픽을 받지 못한다. Failed는 영구 상태라 객체나 권한을 되살려도 Active로 돌아오지 않는다. Lambda가 트래픽을 자동으로 옮기지 않으므로 그 revision으로 가는 몫의 요청은 409(`Platform.RevisionNotActive`)로 거절된다. 새 revision을 만들고 가중치를 바꿔 복구한다.
- 요청과 응답 본문의 크기 한도는 quota 표에서 찾지 못했다. Event Functions의 호출 payload 한도가 그대로 적용된다고도, 한도가 없다고도 단정하지 않고 실제 크기로 시험한다.

## 확장과 throttle

- 트래픽이 늘면 실행 환경을 늘리고, 없으면 0까지 줄인다. 최소 또는 예약 환경 수를 정하는 설정은 없다.
- Lambda는 수요보다 앞서 여유 용량(headroom)을 두고 확장해 완만한 증가에서는 cold start를 줄인다. headroom을 넘는 급증 구간의 요청은 cold start를 겪는다.
- 새 실행 환경이 초기화되는 동안에는 여유가 있는 기존 환경으로 요청을 보내고, 여유 있는 환경이 없을 때만 요청이 기다린다. 기다린다고 성공이 보장되지는 않으며, 애플리케이션이 시작하지 못하거나 요청률, 실행 환경, 계정 한도에 걸리면 실패한다.
- 모든 환경이 가득 찼는데 더 확장할 수 없거나 `rateLimit`을 넘으면 HTTP 429를 반환하며, throttle된 요청은 대기열에 두지 않는다. 너무 많은 환경을 동시에 초기화해도 `Platform.EndpointConcurrentInitThrottle` 429가 날 수 있다. `rateLimit`을 0으로 두면 503(`Platform.EndpointDisabled`)을 반환하고, Lambda가 부하를 덜어 낼 때도 503이 날 수 있다.
- endpoint의 `maxEnvironments`(선택, 2~10,000)와 `rateLimit`으로 상한을 둔다. `rateLimit`을 정하지 않으면 endpoint당 초당 10,000 요청 quota가 적용된다. 계정은 리전당 초당 100,000 요청과 Arm64 vCPU 2,000개가 기본이다. 개발자 가이드의 quota 표는 둘 다 조정할 수 있다고 적지만 General Reference의 표는 조정 불가로 적어 서로 다르므로 Service Quotas나 `GetWebAccountSettings`로 확인한다. 새 계정은 vCPU와 요청률 quota가 더 낮게 시작한다. 환경당 vCPU가 2개이므로 기본 vCPU quota로는 리전당 최대 약 1,000개 환경이다(계산값).

## 동시 처리 코드의 주의점

- 한 실행 환경이 여러 요청을 동시에 처리하므로 요청별 상태를 전역 변수에 두지 않는다. Express의 `req`, `res`처럼 요청 범위 context를 쓴다.
- Node.js는 한 이벤트 루프에서 요청을 처리한다. CPU를 오래 쓰는 동기 작업은 같은 환경의 다른 모든 요청을 막으므로 `worker_threads`로 넘기거나 `maxConcurrencyPerEnvironment`를 낮춘다.
- 기본 V8 heap은 1,024MB이고 `NODE_OPTIONS`로 2GB 환경 메모리 안에서 조정한다.
- DB 연결 풀은 실행 환경마다 따로 생긴다. 환경 하나의 풀은 `maxConcurrencyPerEnvironment` 이하로 두고, `maxEnvironments`와 풀 크기를 곱한 값을 같은 DB를 쓰는 모든 endpoint와 리전에 걸쳐 더한 전체 연결 수가 DB의 연결 한도 안에 들어오게 한다. endpoint는 같은 Web Function 안에서도 따로 확장하고, revision 가중치 변경 같은 배포 중에는 가용성을 위해 `maxEnvironments`를 잠시 넘을 수 있으므로 여유를 두거나 RDS Proxy나 `rateLimit`을 앞에 둔다. `maxEnvironments`를 정하지 않으면 계정 vCPU quota만 상한이다(적용 제안).

## 비용 판단

요금은 요청 수, 실제로 CPU를 쓴 시간(active CPU), 환경이 살아 있는 동안의 메모리와 데이터 전송으로 부과된다. LLM 응답이나 외부 API를 기다리는 시간이 긴 I/O 중심 API는 기다리는 동안 CPU 사용이 적어 CPU 요금이 작아질 수 있다. 반대로 요청 대부분이 CPU를 계속 쓰는 짧은 작업이면 Event Functions보다 비쌀 수 있다(추론, AWS 문서는 두 모델의 비용을 직접 비교하지 않는다). 단가는 리전별 요금 페이지에서 확인하고, 실제 요청의 CPU 사용 비율로 두 모델을 비교한다.

## 체크포인트

- Event Functions와 Web Functions에서 동시 요청 100개가 cold start에 미치는 차이를 실행 환경 수로 설명할 수 있는가
- 확장 중 대기열에 들어가는 요청과 429로 거절되는 요청을 구분할 수 있는가
- 데이터 리전 제약이 있을 때 MultiRegion 대신 PerRegion을 고르는 이유를 말할 수 있는가
- Active 상태만 보고 배포 완료로 판단하면 안 되는 이유를 말할 수 있는가

## 출처

- [AWS, Core concepts (Lambda Web Functions)](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-how-it-works.html)
- [AWS, Lambda Web Function endpoints](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-endpoints.html)
- [AWS, Configuring Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-configuration.html)
- [AWS, Managing Web Function revisions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-revisions.html)
- [AWS, Scaling behavior for Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-scaling.html)
- [AWS, Lambda Web Function runtimes](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-runtimes.html)
- [AWS, Building Lambda Web Functions with Node.js](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-nodejs.html)
- [AWS, Multi-Region deployment (Lambda Web Functions)](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-endpoint-replication.html)
- [AWS, Deploying Web Function code from Amazon S3](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-code-s3.html)
- [AWS, Execution environment lifecycle (Lambda Web Functions)](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-env-lifecycle.html)
- [AWS, What is AWS Lambda?](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [AWS, Best practices for Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-best-practices.html)
- [AWS, AWS Lambda endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/lambda-service.html)
- [AWS, Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [AWS, AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [Announcing AWS Lambda Web Functions — AWS](https://aws.amazon.com/blogs/aws/announcing-aws-lambda-web-functions-for-fast-consistent-web-app-performance-anywhere/)

## 관련 문서

- [[AWS-Lambda|AWS Lambda]]
- [[AWS-Lambda-Execution-Model|Lambda 실행 모델]]
- [[AWS-Lambda-Invocation-Concurrency|Lambda 호출 모델과 동시성]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
