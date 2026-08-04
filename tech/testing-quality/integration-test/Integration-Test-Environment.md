---
tags: [testing, integration-test]
status: index
category: "테스트&품질(Testing&Quality)"
aliases: ["Integration Test Environment", "통합 테스트 환경"]
---

# 통합 테스트 환경(Integration Test Environment)

Testcontainers, LocalStack, 테스트 데이터 롤백 — 실제 인프라를 띄워 검증하는 통합 테스트 환경과 멱등성 전략.

## 목차
- [x] [[TestContainers-Integration|Testcontainers 통합 테스트 (멱등성, Random 포트, 병렬 테스트)]]
- [x] [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 데이터베이스 (빌드 입력으로 선언한 DB variant, cold/warm path, 결정적 dump cache)]]
- [x] [[LocalStack-Integration-Test|LocalStack AWS 통합 테스트 (단일 4566 엔드포인트, Docker Compose vs Testcontainers, init hooks)]]
- [x] [[Transactional-Test-Antipattern|Spring database 통합 테스트 (test-managed transaction, rollback, embedded DB, cleanup)]]
