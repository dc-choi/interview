---
tags: [infrastructure, aws, aurora, replication, monitoring]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Aurora Replica Lag", "Aurora Reader 지연과 재시작"]
---

# Aurora Reader 지연과 재시작 진단

공유 스토리지를 사용해도 Writer 변경의 Reader 전파는 비동기다. Reader가 메모리 캐시의 변경을 따라가지 못하면 복제 지연이 커지고 재시작할 수 있다. 읽기 쿼리가 적다는 이유만으로 Reader의 처리 여력이 충분하다고 판단하지 않는다.

여기서는 단일 리전 클러스터와 Global Database의 primary 클러스터를 다룬다. secondary 클러스터의 리전 간 지연 진단과는 구분한다.

## 지표와 단위를 먼저 구분한다

`AWS/RDS`의 Reader별 `AuroraReplicaLag` 단위는 **밀리초**다. 예를 들어 허용 지연을 10초로 정했다면 지표 임계값은 10,000ms다. 10초는 계산 예시이며 서비스 공통 권장값이 아니다.

`AuroraReplicaLagMaximum`은 클러스터 내 최대 지연을 보여주지만 Reader 삭제나 이름 변경 때 일시적으로 튈 수 있다. 해당 시간대에는 각 Reader의 `AuroraReplicaLag`와 이벤트를 대조한다. 클러스터 간 binlog 복제의 `AuroraBinlogReplicaLag`와도 구분한다.

## 원인별 확인 순서

| 확인 대상 | 대조할 근거 | 판단과 다음 확인 |
| --- | --- | --- |
| Reader 용량 | Writer와 Reader의 인스턴스 클래스, CPU와 네트워크 사용량 | 작은 Reader가 Writer의 변경량을 감당하는지 확인한다. AWS는 같은 사양을 권장한다 |
| Reader 경합 | `CPUUtilization`, `DatabaseConnections`, `NetworkReceiveThroughput` | 조회 부하와 변경 반영이 자원을 다투는지 같은 시간대로 비교한다 |
| Writer 쓰기 급증 | MySQL의 `DMLThroughput`, `DDLThroughput`, PostgreSQL의 `WriteThroughput` | Reader의 조회량뿐 아니라 Writer가 만든 변경량을 함께 본다 |
| MySQL purge 부담 | `RollbackSegmentHistoryListLength`, 장기 트랜잭션과 조회 | 오래 유지된 read view와 뒤늦은 purge 작업을 확인한다 |
| 통신 이상 | RDS 이벤트와 로그, 지연 발생 시각 | 일시적 통신 중단과 대역폭 부담을 구분한다 |

HLL은 미정리 이력의 길이이므로 높은 값만으로 purge 처리량이 급증했다고 단정하지 않는다. 장기 트랜잭션이 끝난 뒤 누적 이력을 정리하는 부담도 지연에 영향을 줄 수 있다. 세부 원리는 [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]에서 확인한다.

## 대응과 확인

리사이징, 과도한 조회 조정, 쓰기 배치 분할 등은 확인한 병목에 맞춰 고른다. 재시작만 반복하면 변경량과 처리 용량의 불균형이 남을 수 있다. 변경 전후의 같은 부하 구간에서 지연, 재시작 이벤트와 애플리케이션 오류를 비교한다.

알람의 평가 기간과 임계값은 허용 가능한 데이터 지연에 맞춘다. 최신 데이터가 필요한 요청은 [[RDS-Aurora-Endpoints#Writer Endpoint와 Replica Lag|Writer 라우팅]]을 검토한다. 지연 알람과 읽기 일관성 정책은 별도로 설계한다.

## 출처

- [How do I troubleshoot issues that cause my Aurora read replica to lag and restart? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/aurora-read-replica-restart)
- [AWS Aurora User Guide, Amazon CloudWatch metrics for Amazon Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html)
- [Resolve issues when using read replicas in Aurora — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/aurora-mysql-read-replicas)

## 관련 문서

- [[RDS-Aurora|RDS와 Aurora]]
- [[RDS-Monitoring-Deep-Metrics|Aurora 심화 지표]]
- [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]
- [[RDS-Aurora-Endpoints|Aurora Endpoint 운영]]
