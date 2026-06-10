---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: index
category: "OS & Runtime"
aliases: ["Spring Batch", "Spring Batch Essentials", "배치 성능 최적화", "JdbcBatchItemWriter"]
---

# Spring Batch — 구조, 처리 모델, 성능 최적화

Spring Batch는 **대용량 데이터 일괄 처리**를 위한 프레임워크. 정산, 리포트, ETL, 데이터 마이그레이션 같은 배치 잡을 공통 템플릿(Job, Step, Chunk)과 **재시작, 스킵, 트랜잭션 경계** 기능으로 표준화한다.

- [[Spring-Batch-Essentials-Structure|구조와 처리 모델 — Job/Step/Chunk 계층, Tasklet vs Chunk, 메타데이터 테이블, 주요 Reader와 Writer]]
- [[Spring-Batch-Essentials-Performance|성능 최적화 — OFFSET 함정과 ZeroOffset, JDBC 배치, Chunk Size, 병렬화, 증분 배치, 흔한 실수, 면접 체크포인트]]
- [[Spring-Batch-Essentials-Scheduler|Spring Scheduler vs Quartz — 클러스터 환경 스케줄러 선택 기준]]

## 관련 문서
- [[Pagination-Optimization|페이징 성능 최적화 (OFFSET 문제)]]
- [[CDC-Debezium|CDC, Debezium (증분 실시간화)]]
- [[Connection-Pool|Connection Pool]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Index|DB Index]]
