---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, database]
status: done
category: "Infrastructure - AWS"
aliases: ["데이터베이스 함정", "SAA-C03 Pitfalls Database"]
---

# AWS SAA-C03 빈출 함정 — 데이터베이스

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### RDS, Aurora

- **Multi-AZ**(동기, 자동 페일오버) vs **Read Replica**(비동기, 읽기 확장)
  - Multi-AZ 대기본은 **읽기 트래픽 받지 않음**(MySQL/Postgres). Aurora는 다름
  - Read Replica는 동일 리전, 다른 리전, 다른 AZ 모두 가능
- **Multi-AZ 변경은 다운타임 없이 적용** — 시험에서 자주 묻는 항목
- **Storage Auto Scaling**(RDS): 가능. 단 5분 쿨다운, 최대 64TB까지
- **RDS 암호화**: 생성 시에만 활성화. 기존 미암호 → 스냅샷 → 복사 시 암호화 → 복원
- **RDS Proxy**: 연결 풀링, 페일오버 시간 단축. **Lambda 다수 연결 시나리오** 정답
- **IAM DB Authentication**: 토큰 15분 유효. MySQL/Postgres만
- **Enhanced Monitoring**: OS 수준 지표(1초 단위, CloudWatch Agent 우회로 직접 수집). 일반 CW 지표는 60초
- **RDS Custom**: Oracle/MSSQL 일부 OS 액세스 허용 (운영 SSH 가능)
- **자동 백업** 0~35일, **수동 스냅샷**은 무기한 (Aurora도 동일)
- **Aurora 엔드포인트 4종**
  | 엔드포인트 | 용도 |
  |---|---|
  | Cluster (Writer) | 단일 writer 자동 라우팅 |
  | Reader | 모든 reader 로드밸런싱 |
  | Custom | 특정 reader 그룹 |
  | Instance | 특정 인스턴스 |
- **Aurora Global Database**: 최대 5개 보조 리전, **<1초 복제 지연**. RPO 1초/RTO 1분 — DR 시나리오 정답
- **Aurora Serverless v2**: 즉시 스케일링(v1과 다름). 가변 워크로드
- **Aurora Backtrack**(MySQL만): 시간 되돌리기 — 새 클러스터 안 만들고

### DynamoDB

- **온디맨드** vs **프로비저닝**: 예측 불가 트래픽 → 온디맨드, 예측 가능, 꾸준 → 프로비저닝(저렴)
- **DAX**: 키-값 캐시(마이크로초). **집계, 복잡 쿼리 결과 캐싱은 ElastiCache** — 시험에 둘이 함께 나오면 구분
- **Streams**: 24시간 보존. KCL, Lambda 소비. **Kinesis Data Streams로도 전송 가능**(긴 보존)
- **Global Table**: 멀티 리전, 멀티 마스터. Streams 활성화 필수
- **TTL**: 만료 항목 자동 삭제(48시간 내). Streams로 후처리 가능
- **DynamoDB는 Gateway VPC Endpoint** (S3와 함께 둘뿐)
- **파티션 키 설계**: 핫 파티션 회피 — 무작위, 세분화 키
- **트랜잭션**: 최대 100항목, 4MB. 비용 2배
- **NoSQL vs RDB** 시나리오: 정형/조인 → RDS, 무스키마, 확장 → DynamoDB

### ElastiCache, 기타 DB

- **Redis** vs **Memcached**
  | 항목 | Redis | Memcached |
  |---|---|---|
  | 영속성 | RDB/AOF 스냅샷 | 없음 |
  | 복제, HA | Multi-AZ, 자동 페일오버 | 없음 |
  | 데이터 구조 | List, Set, SortedSet, Hash, Stream | 문자열만 |
  | 트랜잭션 | MULTI/EXEC | 없음 |
  | 시나리오 | 세션, 리더보드, Pub/Sub | 단순 캐시, 샤딩 |
- **Redis AUTH**: 토큰 인증. **TLS in-transit 암호화**와 별개
- **Memcached Auto Discovery**: 클라이언트가 노드 목록 자동 발견
- **DocumentDB**: MongoDB 호환. **Aurora 동일 스토리지 엔진**
- **Keyspaces**: Cassandra 호환. 서버리스
- **QLDB**: 불변 원장 — **금융 거래, 감사 로그**. 중앙 신뢰 기관 있음
- **Neptune**: 그래프 DB — SNS 친구 관계, 추천. 중앙 신뢰 없음
- **Timestream**: 시계열 DB — IoT 시나리오

### Redshift

- **Redshift Spectrum**: S3 데이터 직접 쿼리. **Redshift 클러스터 필요** (Athena와 차이)
- **AQUA**(Advanced Query Accelerator): 캐싱 가속 — RA3 노드에서 무료
- **Redshift Serverless**: 클러스터 관리 없음
- **Cross-AZ 단일 노드**(Multi-AZ는 RA3에서만 지원, 시험 시점 신규)
- **Concurrency Scaling**: 워크로드 폭증 시 자동 임시 클러스터
- **데이터 로드**: COPY (S3, EMR, DynamoDB, SSH). 단일 INSERT는 매우 느림

## 관련 문서

[[RDS-Aurora]], [[RDS-Security-Group]], [[RDS-Monitoring]], [[DynamoDB]], [[ElastiCache]], [[Redshift]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
