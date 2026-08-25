---
tags: [cicd, deployment, zero-downtime, reliability]
status: done
verified_at: 2026-08-24
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Zero-Downtime Deployment", "무중단 배포"]
---

# 무중단 배포 (Zero-Downtime Deployment)

무중단은 특정 배포 도구의 이름이 아니라 배포 전 과정이 만족해야 하는 성질이다. 트래픽 전환, 종료, 시작, 데이터, 클라이언트 다섯 계층이 전부 성립해야 하고, 하나만 깨져도 사용자는 5xx나 끊긴 연결을 본다. Blue-Green을 도입했는데 배포 때마다 에러가 튀는 시스템은 대개 전환 계층만 갖추고 나머지를 빠뜨린 경우다.

## 계층 1: 트래픽 전환

새 버전으로 트래픽을 옮기는 방식이다. Blue-Green, Canary, Rolling의 비교와 구현 패턴은 [[Blue-Green|Blue-Green 배포]]가 소유한다. 어떤 방식이든 공통 요건은 같다.

- 교체 대상 인스턴스를 먼저 LB에서 제외해 신규 유입을 끊고 나서 교체한다.
- 전환 지점은 LB 타겟 그룹이나 Service selector처럼 DNS보다 전파가 빠른 계층에 둔다. DNS 전환은 TTL과 클라이언트 캐시 때문에 무중단 수단으로 신뢰할 수 없다. 단, EndpointSlice나 타겟 그룹 갱신에도 전파 지연이 있으므로 종료 측이 이를 기다려야 한다 ([[Graceful-Shutdown|Graceful Shutdown]]의 Kubernetes 종료 순서 절 소유).

## 계층 2: 종료

빠지는 인스턴스가 받아 둔 요청을 끝까지 처리하고 죽어야 한다. SIGTERM 처리, 신규 수신 중단, in-flight 완료 대기와 타임아웃은 [[Graceful-Shutdown|Graceful Shutdown]]이 소유한다. 실패 모드는 둘로 갈린다. LB 라우팅 제거가 전파되기 전에 소켓을 닫으면 옛 라우팅이 보낸 신규 요청이 커넥션 거부로 떨어지고, in-flight 대기 없이 종료하면 처리 중이던 요청이 절단된다.

## 계층 3: 시작

들어오는 인스턴스가 준비되기 전에 트래픽을 받으면 안 된다.

- readiness 신호가 실제 준비 상태를 반영해야 한다. 프로세스 기동과 요청 처리 가능은 다르다 (DB 커넥션 풀, 캐시 예열, 의존 서비스 연결). Node.js에서의 readiness/liveness 구현과 종료 상태 연동은 [[Nodejs-Production-Readiness|Node.js 프로덕션 준비]]가 소유한다.
- health check는 얕은 것(프로세스 생존)과 깊은 것(의존성 포함)을 구분해 목적에 맞게 쓴다. 깊은 체크를 생존 판정에 쓰면 의존 서비스 장애가 재시작 폭풍으로 번진다.

## 계층 4: 데이터

배포 중에는 구버전과 신버전이 같은 DB, 캐시, 메시지를 동시에 쓴다.

- 스키마는 직전 버전과 전후방 호환이어야 하고, 파괴적 변경은 Expand-Contract로 쪼갠다 ([[Blue-Green|Blue-Green 배포]]의 DB 스키마 절 소유). 마이그레이션의 버전 관리와 실행 시점은 [[Schema-Versioning|스키마 버전 관리]]에 둔다.
- 같은 원리가 캐시 직렬화 포맷과 메시지 스키마에도 적용된다. 신버전이 쓴 것을 구버전이 읽는 구간이 반드시 생긴다.
- DB 자체의 전환(엔진 교체, 리전 이동)은 [[RDS-Zero-Downtime-Migration|RDS near-zero 마이그레이션]]에 둔다.

## 계층 5: 클라이언트

- sticky session에 상태를 두면 인스턴스 교체가 곧 세션 유실이다. 상태를 외부 저장소로 빼는 것이 전제 조건이다.
- WebSocket, SSE 같은 장수 연결은 전환 시점에 끊길 수밖에 없으므로 클라이언트 재연결과 재개 규약을 설계에 포함한다. 두 항목의 전환 시점 세부는 [[Blue-Green|Blue-Green 배포]]의 트래픽 전환 시 주의 절이 소유한다.
- 전환 순간의 일시 오류를 클라이언트 재시도로 흡수하려면 해당 요청이 멱등해야 한다 ([[Idempotency|HTTP 멱등성]]).

## 검증

무중단은 선언이 아니라 측정이다. 배포를 부하가 있는 상태에서 리허설하고, 배포 시간대의 5xx 비율과 지연 백분위를 평시와 비교한다. 배포마다 이 지표를 남기면 어느 계층이 깨졌는지 역추적할 수 있다.

## 흔한 실수

- readiness 게이트 없이 rolling → 기동 직후 인스턴스가 트래픽을 받아 5xx.
- SIGTERM 즉시 소켓 close → 라우팅 제거가 전파되기 전이라 옛 라우팅이 보낸 요청이 커넥션 거부. preStop 대기가 이걸 막는다 ([[Graceful-Shutdown|Graceful Shutdown]]).
- in-flight 대기 없이 종료 → 처리 중 요청 절단.
- 마이그레이션과 앱 배포를 원자적으로 묶음 → 롤백 불가능한 배포. 스키마와 앱은 각자 호환 범위를 갖고 따로 움직여야 한다.
- 배포 성공을 프로세스 기동으로 판정 → 트래픽 기준(에러율, 지연)으로 판정해야 한다.

## 면접 체크포인트

- Blue-Green을 쓰는데도 배포 때 에러가 나는 시스템에서 무엇을 순서대로 점검할지 계층으로 답할 수 있는가.
- 스키마 전후방 호환이 왜 배포 방식과 무관하게 필요한지(신구 버전 동시 구동 구간) 설명할 수 있는가.
- 깊은 health check를 생존 판정에 썼을 때의 장애 전파 시나리오를 말할 수 있는가.

## 관련 문서

- [[Blue-Green|Blue-Green 배포]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[Schema-Versioning|스키마 버전 관리]]
- [[RDS-Zero-Downtime-Migration|RDS near-zero 마이그레이션]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 준비]]
- [[ECS-Rolling-Deployment|ECS Rolling 배포 (무중단 조건의 ECS 구체형)]]
- [[Deploy-Observability|배포 가시성]]
- [[Load-Balancer|Load Balancer]]
- [[Idempotency|HTTP 멱등성]]

## 출처

- [BlueGreenDeployment — Martin Fowler](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Kubernetes 공식 문서, Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes 공식 문서, Pod Lifecycle (Container probes)](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
