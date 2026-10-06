---
tags: [aws, elb, alb, troubleshooting, http, timeout, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["ALB 5XX 진단", "ALB 502 504", "ELB 504 Gateway Timeout"]
verified_at: 2026-09-30
---

# ALB 5XX 진단 — 502와 504의 원인 분리

> 상위 문서: [[ELB|ELB, Elastic Load Balancer]]

ALB가 5XX를 돌려줄 때 원인은 대개 로드밸런서 자체가 아니라 대상(웹 서버, 애플리케이션 런타임)이나 그 뒤 데이터베이스 계층에 있다. 먼저 오류를 누가 만들었는지 가르고, 시간 초과인 504와 연결이나 응답 형식 문제인 502를 구분해 계층을 좁힌다. 상태 코드 자체의 의미는 [[HTTP-Status-Code|HTTP 상태 코드]].

## 누가 만든 오류인가

| 지표 | 의미 |
|---|---|
| `HTTPCode_ELB_5XX_Count` (세부 `HTTPCode_ELB_502_Count`, `HTTPCode_ELB_504_Count` 등) | ALB가 직접 만든 오류 |
| `HTTPCode_Target_5XX_Count` | 대상이 반환한 5XX를 ALB가 그대로 전달한 것 |
| `TargetResponseTime` | 요청이 ALB를 떠난 뒤 대상이 응답 헤더를 보내기 시작할 때까지의 시간 |

대상이 만든 5XX는 애플리케이션 로그에서 원인을 찾는다. ALB가 만든 5XX는 access log의 `target_processing_time`과 대상 로그, DB slow query log를 함께 본다. 클라이언트가 ALB idle timeout 전에 연결을 끊으면 460으로 남으므로 클라이언트 timeout과 ALB idle timeout의 관계도 확인한다.

## 504 Gateway Timeout — 정해진 시간 안에 응답이 없음

- 연결 timeout(10초) 안에 대상과 연결을 맺지 못함
- 연결은 됐지만 대상이 idle timeout(기본 60초) 안에 응답하지 않음. 느린 쿼리처럼 웹 서버나 DB 계층의 지연이 대표 원인이다
- 대상 subnet의 network ACL이 대상에서 ALB 노드로 가는 ephemeral port(1024-65535) 응답을 막음
- 대상이 실제 본문보다 큰 `Content-Length`를 보내 ALB가 남은 바이트를 기다림
- Lambda 대상이 연결 timeout 안에 응답하지 않음, 대상과의 TLS handshake timeout(10초)

## 502 Bad Gateway — 연결이 끊기거나 응답이 잘못됨

- 연결 시도에 대상이 TCP RST를 보내거나 ICMP host unreachable 같은 응답이 옴
- 처리 중인 요청이 있는데 대상이 RST나 FIN으로 연결을 닫음. 대상의 keep-alive 시간이 ALB idle timeout보다 짧을 때 흔하다
- 응답 형식이 잘못됐거나 응답 헤더 전체가 32K를 넘음
- 등록 해제된 대상에서 deregistration delay가 끝날 때까지 요청이 끝나지 않음
- Lambda 응답 본문 1MB 초과, Lambda timeout, 함수 오류나 throttling
- 대상과의 TLS handshake 오류

## 운영 규칙

- 대상(웹 서버, 애플리케이션 런타임)의 연결 유휴 timeout을 ALB idle timeout보다 길게 둔다. 대상이 연결을 닫는 순간 ALB가 요청을 보내면 502가 날 수 있다. 짧은 설정만으로 모든 요청이 실패하거나 반드시 새벽에만 발생하는 것은 아니다. Node.js HTTP 서버의 `server.keepAliveTimeout` 기본값은 5초(Node.js v26 문서 기준)라 ALB 기본값 60초보다 짧으므로, NestJS(Express 어댑터)에서는 `app.getHttpServer()`로 받은 서버의 값을 ALB idle timeout보다 크게 늘린다
- ALB idle timeout은 1-4000초로 늘릴 수 있지만, 오래 걸리는 작업은 timeout을 늘리기보다 요청을 접수만 하고 큐와 상태 조회로 바꾼다. 긴 업로드처럼 연결을 유지해야 하면 idle timeout이 지나기 전에 데이터를 조금씩 보낸다
- 클라이언트, ALB, 서버, DB 순으로 바깥 timeout이 안쪽보다 길도록 timeout 예산을 맞춘다. timeout 분리 원칙은 [[External-Service-Resilience|외부 서비스 장애 대응]]
- 배포 중 502가 튀면 deregistration delay와 애플리케이션 graceful shutdown 순서를 먼저 본다([[ELB]]의 Connection Draining 절)

### NLB로 바꾸면 연결 경계부터 다시 확인한다

2026-10-06 AWS 문서 기준, NLB의 TCP flow idle timeout은 기본 350초이며 TCP Listener에서 60~6000초로 조정할 수 있다. TLS Listener는 350초 고정이다. 모든 NLB 연결의 timeout이 변경 불가능한 350초라고 일반화하지 않는다.

- NLB는 유휴 제한이 지난 TCP 연결의 추적 상태를 지우고, 이후 데이터가 오면 TCP RST를 돌려준다. TCP keepalive packet은 유휴 시간을 다시 세게 할 수 있다.
- ALB의 HTTP 502와 NLB의 TCP reset은 다른 계층의 현상이다. NLB를 거친 요청에서 502를 봤다면 HTTP 응답을 만든 프록시나 대상부터 식별한다. ALB가 백엔드 HTTP 연결을 재사용하는 설명을 NLB에 그대로 적용하지 않는다.
- ALB용 서버 keep-alive 값 하나를 NLB에 복사하기보다 Client와 Target, 중간 Proxy의 연결 재사용 및 종료 정책을 확인한다. 특히 TCP Listener의 idle timeout을 350초보다 늘리면 Target ENI의 `TcpEstablishedTimeout`이 NLB 값 이상인지 확인한다. ENI가 먼저 추적 상태를 버리면 Packet Drop이 생길 수 있다.

## 출처

- [Application Load Balancer 문제 해결](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html)
- [Application Load Balancer 속성 편집, connection idle timeout](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html)
- [Application Load Balancer CloudWatch 지표](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html)
- [Node.js HTTP server.keepAliveTimeout](https://nodejs.org/api/http.html#serverkeepalivetimeout)
- [Network Load Balancer TCP idle timeout 변경](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/update-idle-timeout.html)
- [Network Load Balancers, Connection idle timeout](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#connection-idle-timeout)
- [인프런, Sungmin Kim, ELB](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43732)

## 관련 문서

- [[ELB|ELB, Elastic Load Balancer]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
