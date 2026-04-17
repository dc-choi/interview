---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["Replication"]
---

# Replication

데이터베이스 구조의 복제본을 가진다는 것.

## 특징

1. 데이터가 여러 곳에 복제되므로 한 DB에 문제가 생겨도 다른 DB에 같은 데이터가 저장되어 있어 데이터를 잃지 않을 수 있다.
2. 여러 곳에 데이터베이스를 두면 지연을 줄일 수 있다.
3. **Replication Lag**: 다른 복제본으로 복사되는 시간. 복사 시간이 길어지면 데이터 일관성이 달라질 수 있다.

## 동기 vs 비동기 복제

- **Synchronous replication**: 클라이언트가 쓰기를 요청하면 모든 복제본에 변경된 데이터를 적용한 후에 쓰기 성공 메시지를 보낸다. 데이터 일관성은 지킬 수 있으나 모든 복제본에 쓰기를 해야 해 시간이 오래 걸리고, 복제본 하나라도 쓰기에 실패하면 쓰기 자체가 실패한다.
- **Asynchronous replication**: 클라이언트가 쓰기를 요청하면 원본에 적용한 후 바로 쓰기 성공 메시지를 보내고, 그 뒤에 변경 메시지를 다른 복제본으로 보내 적용한다. 쓰기는 빨라지지만 일부 복제본이 실패하면 데이터 일관성이 깨질 수 있다.

## MySQL 복제 과정

Source가 변경 내용을 **Binary Log**에 기록하고, Replica가 이를 읽어 재적용하는 비동기 스트리밍 구조.

```
Source                                    Replica
┌────────┐                              ┌─────────┐
│ 쓰기   │ → Binary Log 기록            │ IO Thread│ ← Binary Log 스트리밍 수신
└────────┘                              └────┬────┘
                                             ↓
                                        Relay Log 저장
                                             ↓
                                        ┌─────────┐
                                        │SQL Thread│ → 실제 적용
                                        └─────────┘
```

1. Source가 변경 쿼리를 **Binary Log**에 기록
2. Replica의 **IO Thread**가 Binary Log를 네트워크로 받아옴
3. Replica의 **Relay Log**에 일단 저장
4. Replica의 **SQL Thread**가 Relay Log를 읽어 실제 DB에 적용

일반적 동기화 지연은 ~100ms 수준이지만, 대량 쓰기·롱 트랜잭션·네트워크 지연에서는 크게 벌어짐 → **Replication Lag** 모니터링 필수.

### Binary Log 기록 방식

MySQL은 Binary Log 포맷을 3가지 중 선택할 수 있다.

| 방식 | 기록 내용 | 장점 | 단점 |
|---|---|---|---|
| **Row** | 변경된 각 행의 전/후 이미지 | 데이터 일관성 높음, 비결정적 함수 안전 | 로그 크기 큼, 대량 UPDATE에 부담 |
| **Statement** | 실행된 SQL 문 자체 | 로그 크기 작음, 직관적 | `NOW()`·`RAND()`·`AUTO_INCREMENT` 같은 비결정적 값에서 Source와 Replica 데이터 불일치 위험 |
| **Mixed** | 결정적 SQL은 Statement, 비결정적은 Row로 자동 전환 | 공간 효율 + 일관성 절충 | 내부 판단 로직 복잡 |

MySQL 5.7.7+ 기본값은 **Row**. 안정성을 중시하는 현대 운영 환경은 Row를 주로 사용한다.

## 관리형 DB의 Replica 한계

| 서비스 | 최대 Read Replica |
|---|---|
| AWS RDS (MySQL·MariaDB·PostgreSQL·SQL Server) | 15개 |
| AWS RDS (Oracle) | 5개 |
| AWS Aurora | 15개 (공유 스토리지 기반, Lag ~ms) |
| NCP Cloud DB for MySQL | Read Slave 구성 지원 |

관리형 DB 특유의 아키텍처(Aurora 공유 스토리지·NCP Standby Master)는 [[RDS-Aurora|RDS/Aurora]] 참고.

## 참고
- [AWS RDS Read Replicas](https://aws.amazon.com/ko/rds/features/read-replicas/)
- [매일메일 — DB 이중화](https://www.maeil-mail.kr/question/109)

## 관련 문서
- [[Clustering|Cluster]]
- [[Sharding]]
