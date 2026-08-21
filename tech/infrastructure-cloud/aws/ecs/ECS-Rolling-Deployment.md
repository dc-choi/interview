---
tags: [infrastructure, aws, ecs, deployment, load-balancer, fargate]
status: done
verified_at: 2026-08-21
category: "Infrastructure - AWS"
aliases: ["ECS Rolling Deployment", "ECS 롤링 배포", "ECS Deployment Circuit Breaker"]
---

# ECS 롤링 배포 메커니즘

> 상위 문서: [[ECS|Amazon ECS]]

무중단이라는 말은 배포 방식 이름이 아니라 **용량 산술, 헬스 판정, 실패 감지, 드레이닝** 네 개가 동시에 맞아떨어질 때 나오는 결과다. ECS 롤링 배포(`ECS` 컨트롤러, `ROLLING` 전략)에서 이 사슬이 어디서 이어지고 어디서 끊기는지 정리한다.

## 용량 산술 — minimumHealthyPercent와 maximumPercent

두 값이 배포 중 태스크 수의 하한과 상한을 정한다. 두 값 모두 `desiredCount` 대비 퍼센트로 계산한다.

| 파라미터 | 의미 | 반올림 | REPLICA 기본값 |
|---|---|---|---|
| `minimumHealthyPercent` | RUNNING 상태를 유지해야 하는 하한 | 올림 | 100% |
| `maximumPercent` | RUNNING과 PENDING을 합친 상한 | 내림 | 200% |

DAEMON 스케줄링 전략의 `minimumHealthyPercent` 기본값은 CLI, SDK, API에서 0%, 콘솔에서 50%로 다르다.

산술 예시가 그대로 배포 동작이 된다.

- min 50%, desired 4 → 하한이 2라 기존 2개를 먼저 내리고 새 2개를 띄운다.
- min 75%, desired 2 → 올림해서 하한이 2. 내릴 수 있는 태스크가 없다.
- max 200%, desired 4 → 상한이 8이라 새 4개를 먼저 띄운 뒤 기존 4개를 내린다.
- max 125%, desired 3 → 내림해서 상한이 3. 새 태스크를 시작할 자리가 없다.

시작도 정지도 못 하는 조합이면 배포가 그대로 멈추고 서비스 이벤트 메시지가 발생한다. 100/200 조합은 순간적으로 용량 2배를 요구하므로 Fargate 비용과 EC2 노드 여유를 함께 봐야 하고, 50/100 조합은 추가 용량 없이 배포하는 대신 배포 구간의 처리 능력이 절반으로 떨어진다.

## 새 태스크가 healthy로 세어지는 시점

하한 계산에 포함되려면 태스크가 healthy로 인정받아야 한다. 기준은 로드밸런서 유무로 갈린다.

- 로드밸런서 없음: essential 컨테이너에 헬스 체크가 없으면 RUNNING 도달 후 40초를 기다린 뒤 집계한다. 헬스 체크가 있으면 통과할 때까지 기다린다.
- 로드밸런서 있음: 타깃 그룹 헬스 체크가 healthy를 반환해야 집계한다. 컨테이너 헬스 체크까지 있으면 둘 다 통과해야 한다.

컨테이너 헬스 체크 기본값은 `interval` 30초, `timeout` 5초, `retries` 3회이고 `startPeriod`는 기본 비활성이다. 부팅이 느린 런타임은 `startPeriod`와 서비스의 `healthCheckGracePeriodSeconds`(기본 0)를 함께 늘리지 않으면 뜨자마자 unhealthy 판정을 받고 교체가 반복된다.

## 실패 감지와 자동 롤백 — deployment circuit breaker

서킷 브레이커는 롤링 업데이트 컨트롤러에서만 쓸 수 있다. 두 단계로 실패를 센다.

1. 태스크가 RUNNING에 도달하지 못하면 실패 카운트를 1 올린다.
2. RUNNING 태스크가 하나라도 생기면 ELB, Cloud Map, 컨테이너 헬스 체크를 검사하고, 헬스 체크 실패로 교체된 태스크마다 카운트를 1 올린다.

카운트가 임계값에 도달하면 배포가 `FAILED`가 되고 새 태스크를 더 띄우지 않는다. 임계값은 `thresholdConfiguration`으로 정한다.

| 타입 | 계산 | 비고 |
|---|---|---|
| `BOUNDED_PERCENT` (기본, value 기본 50) | value/100 × desiredCount, 올림 | 하한 3, 상한 200으로 잘린다 |
| `UNBOUNDED_PERCENT` | 같은 계산, 상하한 없음 | desiredCount가 아주 큰 서비스용 |
| `COUNT` | value를 그대로 임계값으로 | desiredCount와 무관하게 고정 |

기본값 기준으로 desired 1이면 임계값 3, desired 25면 13, desired 400이면 200이다. `resetOnHealthyTask`는 기본 `true`라 healthy 태스크가 뜨면 카운트가 0으로 돌아가고 연속 실패만 누적된다. `false`로 두면 간헐적 실패까지 모두 쌓여 감지가 빨라진다.

`rollback`을 켜면 `COMPLETED` 상태의 가장 최근 배포로 되돌린다. 여기서 두 가지가 중요하다.

- 롤백이 시작되면 그 배포는 `COMPLETED`에서 `IN_PROGRESS`로 바뀌므로, 다시 실패해도 같은 배포로 또 롤백할 수는 없다.
- `COMPLETED` 배포가 하나도 없으면(서비스의 첫 배포가 실패한 경우) 롤백 대상이 없어 새 태스크를 띄우지 못한 채 배포가 멈춘다.

`DescribeServices`의 `rolloutState`, `rolloutStateReason`으로 상태를 읽고, EventBridge의 `SERVICE_DEPLOYMENT_FAILED` 이벤트에 알림을 걸어 두는 것이 권장 구성이다. 태스크가 못 뜨는 실패는 서킷 브레이커, 애플리케이션 지표 악화는 CloudWatch 알람으로 잡고 둘을 함께 걸면 먼저 걸린 쪽 기준으로 실패 처리된다.

## 구 태스크를 내리는 구간 — 드레이닝과 stopTimeout

태스크 수명 주기에서 종료는 세 상태로 나뉜다.

| 상태 | 하는 일 |
|---|---|
| `DEACTIVATING` | 타깃 그룹 등록 해제가 이 구간에서 일어난다 |
| `STOPPING` | `STOPSIGNAL`(기본 SIGTERM) 전달 후 `stopTimeout`만큼 기다렸다가 SIGKILL |
| `DEPROVISIONING` | `awsvpc` ENI 분리와 삭제 |

등록 해제 직후 타깃은 `draining`이 되고, Application Load Balancer 대상 그룹 기준 `deregistration_delay.timeout_seconds`(기본 300초)가 지나야 `unused`로 넘어간다. 진행 중 요청도 활성 커넥션도 없으면 등록 해제 자체는 즉시 끝나지만 표시 상태는 지연 시간이 다 흐를 때까지 `draining`으로 남는다. ECS는 로드밸런서가 keep-alive 커넥션이 닫혔다고 보고할 때까지 기다리므로, 이 값이 배포 소요 시간을 직접 좌우한다. 응답 시간이 1초 미만인 서비스는 5초까지 줄이라는 것이 공식 가이드이고, 대용량 업로드나 스트리밍처럼 장기 요청이 있으면 줄이면 안 된다.

`stopTimeout`은 Fargate에서 미지정 시 30초, 유효 범위는 2~120초다. EC2에서는 미지정 시 에이전트 설정 `ECS_CONTAINER_STOP_TIMEOUT`(둘 다 미설정이면 30초)이 적용되고, 별도의 120초 상한은 문서화돼 있지 않다. 앱이 SIGTERM을 받아 리스닝을 멈추고 진행 중 요청만 마친 뒤 종료하면 타임아웃을 다 쓰지 않고 조기에 끝난다. 신호 처리 패턴은 [[Graceful-Shutdown|우아한 종료]] 참고.

## 무중단이 깨지는 지점

- **앱이 SIGTERM을 무시한다.** `stopTimeout`을 다 쓰고 SIGKILL을 맞으면 진행 중 요청이 그대로 끊긴다.
- **요청 수명이 드레이닝보다 길다.** 등록 해제 대상이 지연 시간이 끝나기 전에 커넥션을 끊으면 클라이언트는 500번대 응답을 받는다. 장기 업로드, SSE, 웹소켓이 여기 걸린다.
- **용량 파라미터가 배포를 막거나 가용 태스크를 0으로 만든다.** desired 1에서 `maximumPercent`를 100으로 낮추면 새 태스크를 먼저 띄울 자리가 없어, 하한까지 낮춰 배포를 성립시키는 순간 유일한 태스크가 내려간다.
- **헬스 체크 유예가 짧다.** grace period가 0인데 부팅이 30초 걸리면 서비스가 계속 태스크를 죽이고 다시 띄운다.
- **롤백은 태스크 정의만 되돌린다.** DB 스키마, 캐시 포맷, 큐 메시지 스키마는 원래대로 돌아가지 않는다. 신구 리비전이 같은 데이터에 동시에 붙는 구간이 있으므로 스키마 변경은 확장 후 정리하는 순서로 나눠야 한다.
- **첫 배포에는 롤백이 없다.** 되돌릴 `COMPLETED` 배포가 없으면 서킷 브레이커는 배포를 멈추기만 한다.

트래픽 전환 시점을 배포와 분리해야 하는 요건(사전 검증, 즉시 회귀)이라면 롤링이 아니라 blue/green이나 canary 전략이 답이다. 전략별 비교는 [[ECS|ECS 인덱스]]와 [[Blue-Green|Blue-Green 배포]]에 있다.

## 면접 체크포인트

- `minimumHealthyPercent`, `maximumPercent`가 각각 하한과 상한이고 올림과 내림이 반대라는 점, 100/200이 용량 2배를 전제한다는 점
- 로드밸런서가 붙은 서비스에서 healthy 판정의 주체가 타깃 그룹 헬스 체크라는 점
- 서킷 브레이커의 2단계 감지와 임계값 계산(기본 50%, 하한 3, 상한 200), `resetOnHealthyTask`의 의미
- 롤백 대상이 마지막 `COMPLETED` 배포이고 첫 배포에는 롤백이 없다는 점
- `DEACTIVATING`에서 등록 해제, `STOPPING`에서 SIGTERM과 `stopTimeout`이라는 순서
- 배포 소요 시간을 줄이려면 드레이닝 지연과 정지 타임아웃을 요청 특성에 맞춰 함께 조정해야 한다는 점

## 출처

- [Deploy Amazon ECS services by replacing tasks — 롤링 업데이트 용량 계산](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html)
- [DeploymentConfiguration API — 기본 퍼센트, healthy 판정 조건, strategy](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html)
- [How the Amazon ECS deployment circuit breaker detects failures — 2단계 감지와 임계값](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
- [DeploymentCircuitBreaker API — enable, rollback, resetOnHealthyTask](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentCircuitBreaker.html)
- [Amazon ECS task lifecycle — DEACTIVATING, STOPPING](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html)
- [How CloudWatch alarms detect Amazon ECS deployment failures — 알람 기반 실패 판정과 서킷 브레이커 병행](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-alarm-failure.html)
- [Optimize load balancer connection draining parameters for Amazon ECS — 드레이닝 파라미터 권장값](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html)
- [Edit target group attributes — deregistration delay 기본 300초](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- [Amazon ECS task definition parameters — stopTimeout, healthCheck 기본값](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)

## 관련 문서

- [[ECS|Amazon ECS]]
- [[ECS-Secrets-Injection|ECS 런타임 시크릿 주입]]
- [[ECS-Service-AutoScaling|ECS Service Auto Scaling]]
- [[ELB|ELB, 타깃 그룹]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[Blue-Green|Blue-Green 배포]]
