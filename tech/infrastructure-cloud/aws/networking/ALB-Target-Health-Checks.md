---
tags: [aws, elb, alb, health-check, target-group, infrastructure]
status: done
verified_at: 2026-11-18
category: "Infrastructure - AWS"
aliases: ["ALB Target Health Checks", "ALB 헬스 체크", "ALB 성공 코드", "Health check success codes"]
---

# ALB 대상 그룹 헬스 체크 — 경로, 성공 코드와 reason code

> 상위 문서: [[ELB|ELB, Elastic Load Balancer]]

ALB의 헬스 체크는 대상 그룹에 등록된 대상마다 설정한 경로로 요청을 보내고, 응답 코드가 성공 코드(`Matcher`)에 들어가는지로 성공과 실패를 판정한다. 간격, 시간 제한과 연속 성공, 실패 임계치의 의미와 기본값, 장애 대상이 빠지기까지의 시간 계산은 [[Load-Balancer|로드밸런서]]의 헬스 체크 절에 있다. 이 문서는 무엇을 성공으로 볼지 정하는 경로와 성공 코드, 실패 원인을 가르는 reason code를 다룬다. 아래 값은 2026-11-18 ALB User Guide 대조 기준이다.

## 판정 흐름

1. 로드밸런서가 HTTP 또는 HTTPS(기본 HTTP)로 `HealthCheckPath`에 GET 요청을 보낸다.
2. 응답 코드가 성공 코드에 들어가면 성공, 들어가지 않거나 제한 시간 안에 응답이 없으면 실패다.
3. 연속 성공, 실패 횟수가 임계치에 닿으면 상태가 바뀐다. 처음 등록된 대상은 헬스 체크 한 번을 통과해야 healthy로 본다.

Lambda 대상 그룹은 헬스 체크가 기본으로 꺼져 있다. 켜면 네트워크 요청이 아니라 함수 호출로 검사한다.

## 경로와 성공 코드

| 설정 | HTTP/1.1, HTTP/2 | gRPC |
|---|---|---|
| `HealthCheckPath` | 유효한 URI, 기본 `/` | `/package.service/method` 형식, 기본 `/AWS.ALB/healthcheck` |
| `Matcher`(콘솔의 Success codes) | 200~499, 기본 200 | 0~99, 기본 12 |

성공 코드는 `200,202`처럼 여러 값이나 `200-299`처럼 범위로 지정한다. 기본값이 200 하나이므로 경로가 301 리다이렉트나 204를 돌려주면 대상이 정상이어도 실패로 판정된다. 이런 응답이 정상이라면 경로를 200을 돌려주는 곳으로 바꾸거나 `Matcher`에 그 코드를 넣는다. 헬스 체크는 WebSocket을 지원하지 않는다.

## Reason code로 실패 원인을 가른다

대상 상태가 healthy가 아니면 API와 콘솔이 reason code와 설명을 돌려준다. unhealthy의 reason code는 `Target.ResponseCodeMismatch`(성공 코드 밖의 응답), `Target.Timeout`, `Target.FailedHealthChecks`, `Elb.InternalError`다. `Target`으로 시작하는 코드는 대상 쪽, `Elb`로 시작하는 코드는 로드밸런서 쪽에서 나온다. 응답 코드 불일치는 경로나 성공 코드 설정을, 시간 초과는 응답 지연이나 네트워크 경로를 먼저 의심한다.

## 무엇을 확인하는 체크인가

경로가 정적 파일(예: `index.html`)을 직접 가리키면 웹 서버가 그 파일을 내줄 수 있는지를 확인하는 셈이다. 파일이 없을 때 서버가 보통 404를 돌려주면 기본 설정에서 실패하므로 파일 존재 여부가 판정을 좌우한다. 경로가 디렉터리이고 서버가 디렉터리 목록 기능을 켰다면 파일이 없어도 목록 페이지가 200으로 나갈 수 있다. 애플리케이션 프로세스나 데이터베이스 연결이 망가져도 정적 파일은 계속 200을 돌려줄 수 있다(이 문단은 구조에서 나온 해석이다).

반대로 헬스 체크 엔드포인트가 데이터베이스 같은 공유 의존성까지 확인하면, 그 의존성 하나의 장애로 모든 대상이 동시에 unhealthy가 될 수 있다. ALB는 등록 대상이 모두 unhealthy이면 상태와 관계없이 모든 대상으로 요청을 보내는 fail-open으로 동작하므로, 헬스 체크 실패가 트래픽 차단으로 이어진다고 가정하지 않는다. 경로가 확인할 범위(프로세스 생존인지 의존성까지인지)는 서비스 특성에 따라 정한다(설계 제안).

## 운영 체크포인트

- 경로가 인증, 리다이렉트, 정적 파일 존재 같은 부수 조건에 묶여 있지 않은지 확인한다.
- 콘솔 수동 변경으로 헬스 체크 경로 같은 대상 그룹 설정이 환경마다 달라지는 문제와 같은 템플릿으로 그 차이를 드러내는 방법은 [[Safe-Deployment-Pipeline|안전한 배포 파이프라인]]에서 다룬다.
- API나 IaC로 만든 대상 그룹은 기본값을 가정하지 말고 `describe-target-groups`로 실제 설정을 확인한다. CreateTargetGroup API Reference는 시간 제한 기본값을 HTTP 6초, HTTPS 10초로(User Guide는 instance, ip 5초), lambda의 비정상 임계치 기본값을 5로(User Guide는 2) 적고, 같은 페이지의 예시 응답은 시간 제한 5초를 보여 준다.

## 출처

- [AWS, Health checks for Application Load Balancer target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [AWS, Use Lambda functions as targets of an Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html)
- [AWS, Troubleshoot your Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html)
- [AWS, CreateTargetGroup](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html)
- [YouTube, 데브아트 DevArt, 헬스 체크의 200 정상 응답의 기준](https://www.youtube.com/watch?v=LMjw5idqcnY)

## 관련 문서

- [[ELB|ELB, Elastic Load Balancer]]
- [[Load-Balancer|로드밸런서]]
- [[ELB-5XX-Troubleshooting|ALB 5XX 진단]]
- [[ECS-Rolling-Deployment|ECS 롤링 배포]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[Distributed-System-Basics|분산 시스템 기초]]
