---
tags: [architecture, distributed-systems, sharding, replication, failover, timeout]
status: done
verified_at: 2026-11-15
category: "Architecture - 원칙"
aliases: ["Distributed System Basics", "분산 시스템", "분산 시스템 기초"]
---

# 분산 시스템 기초 (Distributed System Basics)

분산 시스템은 독립적으로 동작하는 여러 컴퓨터가 네트워크로 메시지를 주고받으며 하나의 서비스를 제공하는 구조다. 서버를 나누면 처리량을 늘리고 일부 서버가 멈춰도 서비스를 이어갈 수 있다. 대신 서버 사이의 통신이 끊기거나 늦으면 서버마다 요청 결과와 데이터 상태를 다르게 알 수 있다. 그래서 무엇을 나눌지와 함께 장애와 불일치를 어떻게 다룰지를 정해야 한다.

## 무엇을 나누는가

| 나누는 것 | 방식 | 얻는 것 | 새로 생기는 문제 |
|---|---|---|---|
| 요청 | 앱 서버 여러 대가 서로 다른 요청을 나눠 처리한다. 요청 분배 지점(로드 밸런서)이 요청마다 한 대를 고르며, 한 요청이 두 서버로 함께 가지는 않는다 | 처리량, 한 대가 멈춘 뒤에도 계속 처리 | 서버들이 함께 쓰는 DB 같은 공통 의존 대상으로 병목과 단일 장애 지점이 옮겨 간다 |
| 데이터 분할(샤딩) | 데이터마다 맡을 서버를 정해 서로 다른 몫을 저장한다 | 저장 용량과 쓰기 분산 | 키를 맡은 서버를 찾아가야 하고, 여러 샤드에 걸친 조회와 트랜잭션이 어려워진다 |
| 데이터 복제 | 같은 데이터의 사본을 여러 서버에 둔다 | 읽기 분산, 장애 때 데이터 보존 | 변경 전파가 늦거나 끊기면 사본마다 값이 달라진다 |

분할 방식의 선택은 [[Sharding]], 복제의 쓰기 확인과 리더 장애는 [[Replication-Write-Acknowledgment|복제 쓰기 확인과 리더 장애]]에서 다룬다.

## 한 대가 멈춰도 계속 처리하려면

앱 서버 A와 B 중 A가 멈췄을 때, B가 있다는 사실만으로 서비스가 이어지지는 않는다. 적어도 세 조건이 맞아야 한다.

1. **우회 경로**: 요청 분배 지점이 A를 대상에서 빼야 새 요청이 B로만 간다. 예를 들어 AWS Application Load Balancer는 health check가 연속으로 정해진 횟수(`UnhealthyThresholdCount`)만큼 실패한 대상을 서비스에서 빼고, 정해진 횟수만큼 연속 성공하면 다시 넣는다. 기본 설정에서 대상 그룹의 등록 대상이 모두 unhealthy이면 상태와 관계없이 모든 대상에 요청을 보내는 fail-open으로 동작한다. 대상 그룹의 최소 healthy 대상 기준을 올리면 healthy 대상이 그보다 적을 때도 unhealthy 대상까지 요청을 보낸다.
2. **남은 용량**: B가 원래 몫에 A의 몫까지 처리할 CPU, 메모리와 연결 여유가 있어야 한다. 용량 계획은 [[N-1-Capacity-Headroom|N-1 용량 여유]]를 따른다.
3. **의존 대상의 생존**: B가 기록을 남길 공통 DB가 살아 있고 B와 DB 사이 통신이 이어져야 한다. DB가 한 대뿐이면 앱 서버를 늘려도 그 DB가 단일 장애 지점으로 남는다.

## 통신이 끊기면 생기는 두 가지 불확실성

- **데이터 불일치**: DB1의 변경이 DB2의 사본에 도착하지 못하면, 같은 키를 어느 사본에서 읽느냐에 따라 값이 다르다. 분할 중 일관성과 가용성의 선택은 [[CAP-Theorem|CAP 정리]]에서 다룬다.
- **결과 불명**: 요청을 받은 서버는 처리를 마쳤는데 보낸 서버는 응답을 받지 못해 그 사실을 모를 수 있다.

타임아웃은 보낸 쪽이 정한 시간 안에 응답을 받지 못해 기다리기를 멈췄다는 사실일 뿐, 상대 작업이 실패했다는 뜻이 아니다. 결제 요청이 타임아웃되었을 때 결제 서버의 실제 상태는 셋 중 하나일 수 있다.

| 경우 | 결제 서버의 상태 | 새 결제를 만들면 |
|---|---|---|
| 요청이 가는 도중 유실 | 결제가 시작되지 않음 | 정상 처리 |
| 처리 중 | 이후 성공하거나 실패할 수 있음. 보낸 쪽이 기다리기를 멈췄다고 상대 작업이 취소됐다고 볼 수 없다(취소가 전파되지 않으면 계속 실행된다) | 중복 결제 가능 |
| 처리 완료 뒤 응답 유실 | 이미 결제됨 | 중복 결제 |

보낸 쪽에서는 세 경우 모두 응답 없음으로만 보이므로 타임아웃만으로 어느 경우인지 고를 수 없다. 같은 결제 시도의 결과를 조회하거나 기록으로 대사하기 전에는 성공도 실패도 단정하지 않는다. 조회 결과가 처리 중이면 주문을 결제 확인 중으로 보류하고 다시 확인한다. 결과가 미정인 채로 재시도해야 하면 같은 시도를 식별하는 멱등성 키로 중복 실행을 막는다([[Idempotency|HTTP 멱등성]], [[Idempotency-Key|멱등성 키]]). 재시도 간격과 전체 시간 제한은 [[Retry-Backoff-Jitter|지수 백오프와 지터]]를 따른다.

## 면접 체크포인트

- 요청 분산, 데이터 분할과 복제를 구분하고 각각이 만드는 새 문제를 말한다.
- 앱 서버 한 대가 멈췄을 때 서비스가 이어지는 조건(우회 경로, 남은 용량, 의존 대상의 생존)을 든다.
- 통신 장애가 데이터 불일치와 결과 불명을 만든다는 점을 설명한다.
- 타임아웃이 실패를 뜻하지 않는 이유를 세 경우로 설명하고, 결과 조회와 멱등한 재시도로 대응한다.

## 출처

- [AWS Elastic Load Balancing User Guide, Health checks for Application Load Balancer target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [AWS Elastic Load Balancing User Guide, Target groups for your Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)
- [YouTube, JSCODE 박재성, CS 면접 대비 (분산 시스템편) 1.1 분산 시스템은 무엇인가요?](https://www.youtube.com/watch?v=ll9zVw1QBmk)
- [YouTube, JSCODE 박재성, CS 면접 대비 (분산 시스템편) 1.4 (꼬리 질문) 타임아웃이 났다면 결제가 실패했다고 판단해도 될까요?](https://www.youtube.com/watch?v=JwTORo38WgA)

## 관련 문서

- [[Sharding]]
- [[Replication-Write-Acknowledgment|복제 쓰기 확인과 리더 장애]]
- [[CAP-Theorem|CAP 정리]]
- [[N-1-Capacity-Headroom|N-1 용량 여유]]
- [[Idempotency|HTTP 멱등성]]
- [[Retry-Backoff-Jitter|지수 백오프와 지터]]
