---
tags: [aws, elb, alb, troubleshooting, http, timeout, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["ALB 5XX 진단", "ALB 502 504", "ELB 504 Gateway Timeout", "ALB 502 진단 지표"]
verified_at: 2026-10-14
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

2026-10-14 AWS 문서 기준으로 원인마다 먼저 볼 신호를 짝지었다. access log의 `target_status_code`는 대상과 연결해 응답을 받았을 때만 기록되고 아니면 `-`다. 이 값이 502면 대상이 만든 오류이므로 대상 애플리케이션부터 본다.

| 원인 | 먼저 볼 신호 | 조치 |
|---|---|---|
| 연결 시도에 대상이 TCP RST를 보냄 | `TargetConnectionErrorCount`가 `HTTPCode_ELB_502_Count`와 같은 시점에 오름 | 대상이 등록 포트에서 listen하고 애플리케이션이 실행 중인지 확인 |
| 연결 시도에 ICMP host unreachable 같은 응답이 옴 | 위와 같음 | ALB subnet에서 대상 포트로 가는 트래픽을 보안 그룹과 network ACL이 허용하는지 확인 |
| 처리 중인 요청이 있는데 대상이 RST나 FIN으로 연결을 닫음 | 처리 시간 필드 -1 (아래 설명) | 대상 keep-alive 시간을 ALB idle timeout보다 길게 둔다(아래 운영 규칙) |
| 응답 형식 오류, 유효하지 않은 HTTP 헤더, 응답 헤더 전체 32K 초과 | 장애 시간대에 대상에서 패킷 캡처 | 응답을 만드는 애플리케이션이나 앞단 프록시 수정 |
| 대상과의 TLS handshake 오류 | `TargetTLSNegotiationErrorCount` | 대상이 ALB 백엔드 보안 정책의 protocol과 cipher를 하나 이상 지원하는지 확인 |
| 등록 해제된 대상이 처리하던 요청이 deregistration delay 안에 끝나지 않음 | CloudTrail의 `DeregisterTargets` 호출 시각과 호출 주체 | deregistration delay를 긴 요청이 끝날 만큼 늘린다 |
| Lambda 대상의 응답 본문 1MB 초과, 함수 timeout, 함수 오류나 throttling | `LambdaUserError`, `LambdaInternalError`와 access log `error_reason` | `LambdaUserError` 쪽 코드는 함수 코드나 설정에서 고친다. `LambdaInternalError` 쪽은 ALB나 Lambda 내부 원인이라 함수 코드로 고칠 대상이 아니다 |

- **처리 시간 필드 -1**: `request_processing_time`, `target_processing_time`, `response_processing_time`이 -1이면 ALB가 요청을 대상에 보내지 못했거나 대상 응답을 받지 못한 것이다. 대상이 idle timeout 전에 연결을 닫거나 클라이언트가 잘못된 요청을 보낼 때도 -1이 되므로, 연결 수립 실패인지는 `TargetConnectionErrorCount`와 함께 판단한다. 10초 TCP 연결 timeout 안에 연결하지 못한 요청도 `request_processing_time`이 -1이지만 이때 응답은 504다.
- **백엔드 TLS 정책**: 대상 연결의 보안 정책은 직접 고를 수 없고 listener 정책에 따라 정해진다. listener 중 하나라도 FIPS, post-quantum, RFC 9151 계열 정책을 쓰면 각각 대응하는 백엔드 정책이, 그 밖의 TLS 1.3 정책을 쓰면 `ELBSecurityPolicy-TLS13-1-0-2021-06`이, 그 외에는 `ELBSecurityPolicy-2016-08`이 쓰인다. ALB는 대상 인증서를 검증하지 않아 self-signed 인증서도 쓸 수 있지만, 대상의 protocol과 cipher가 이 정책과 겹쳐야 handshake가 성공한다.
- **등록 해제 추적**: ELB의 control plane 호출은 CloudTrail management event로 남고, Event history에서 최근 90일을 조회할 수 있다. 이벤트의 호출 주체로 사람이 해제했는지 Auto Scaling 같은 AWS 서비스가 해제했는지 가른다. deregistration delay는 0~3600초(기본 300초)다. 해제된 대상은 delay가 끝날 때까지 draining으로 표시되고, delay가 끝난 시점에 아직 처리 중이던 요청은 502가 된다. 처리 중인 요청과 활성 연결이 없으면 해제는 바로 끝나지만 상태는 delay가 끝날 때까지 draining으로 보인다.
- **Lambda 대상**: `TargetConnectionErrorCount`와 `TargetTLSNegotiationErrorCount`는 Lambda 대상에 적용되지 않고 access log의 `target:port`도 `-`다. 실패한 요청은 `error_reason`에 코드가 남는다. `LambdaInvalidResponse`(응답이 잘못됐거나 필수 필드 누락), `LambdaResponseTooLarge`(응답 1MB 초과), `LambdaUnhandled`(함수의 처리되지 않은 예외), `LambdaThrottling`, `LambdaAccessDenied`(ALB에 호출 권한 없음)처럼 함수 쪽 원인은 `LambdaUserError`에, `LambdaServiceException`, `LambdaConnectionError` 같은 ALB나 Lambda 내부 원인은 `LambdaInternalError`에 더해진다. API Gateway가 Lambda를 호출할 때의 오류 구분은 [[AWS-Lambda-API-Gateway-Proxy-Errors|API Gateway Lambda 프록시 통합 오류]].

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
- [Application Load Balancer access log 항목과 error reason code](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [Application Load Balancer 보안 정책, 백엔드 연결](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)
- [Application Load Balancer target group, 대상 TLS와 deregistration delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)
- [Application Load Balancer target group 속성 편집, deregistration delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- [Elastic Load Balancing API 호출의 CloudTrail 기록](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/cloudtrail-logs.html)
- [How do I troubleshoot Application Load Balancer HTTP 502 errors? — YouTube, Amazon Web Services](https://www.youtube.com/watch?v=I5Tk8JpjwvU)
- [Node.js HTTP server.keepAliveTimeout](https://nodejs.org/api/http.html#serverkeepalivetimeout)
- [Network Load Balancer TCP idle timeout 변경](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/update-idle-timeout.html)
- [Network Load Balancers, Connection idle timeout](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#connection-idle-timeout)
- [인프런, Sungmin Kim, ELB](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43732)

## 관련 문서

- [[ELB|ELB, Elastic Load Balancer]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[AWS-Lambda-API-Gateway-Proxy-Errors|API Gateway Lambda 프록시 통합 오류]]
