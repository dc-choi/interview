---
tags: [reliability]
status: index
category: "안정성엔지니어링(Reliability)"
aliases: ["안정성엔지니어링(Reliability)", "Reliability Engineering"]
---

# 안정성엔지니어링(Reliability)

## 현장사례
- [x] [[Incident-Recovery-Prevention|장애 복구와 재발 방지 (P1~P4 등급, 포스트모템, 사전 예방)]]
- [[Large-Scale-Traffic-Experience#저자가 겪은 3개의 대형 장애|레거시 인프라 3종 장애]] — Fleet 오케스트레이션 붕괴, MongoDB 2.6 포화, Redis Codis BGSAVE 유실

## Checklist
- [x] [[External-Service-Resilience|외부 서비스 장애 대응 (Timeout·Bulkhead·Circuit Breaker 통합)]]
- [x] [[External-API-Integration-Patterns|외부 API 연동 실전 패턴 (조회형·거래형·상태머신·Saga·대사)]]
- [x] [[Payment-System-Principles|결제 시스템 5원칙 (PG 스펙·숙련자·DB 제약·해킹 대비·신뢰 보호)]]
- [x] [[Graceful-Shutdown|Graceful shutdown]]
- [ ] [[Idempotent-Consumer|Idempotent consumer]]
- [ ] [[Data-Recovery|Data recovery]]
- [ ] [[Backup-Restore|Backup / Restore]]
- [ ] [[DR-Strategy|DR strategy (multi-region)]]
- [ ] [[RCA-Postmortem|RCA / Postmortem 문화]]
