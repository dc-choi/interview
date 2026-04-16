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
- [ ] [[Timeout]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Circuit-Breaker|Circuit breaker]]
- [ ] [[Bulkhead]]
- [x] [[Graceful-Shutdown|Graceful shutdown]]
- [ ] [[Idempotent-Consumer|Idempotent consumer]]
- [ ] [[Data-Recovery|Data recovery]]
- [ ] [[Backup-Restore|Backup / Restore]]
- [ ] [[DR-Strategy|DR strategy (multi-region)]]
- [ ] [[RCA-Postmortem|RCA / Postmortem 문화]]
