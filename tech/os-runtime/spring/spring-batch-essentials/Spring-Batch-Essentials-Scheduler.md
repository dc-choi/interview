---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Scheduler vs Quartz", "Quartz 클러스터 스케줄링"]
---

# Spring Scheduler vs Quartz

Spring Batch와 함께 자주 언급되는 **스케줄링** 문제. 배치를 언제 돌릴지를 결정.

**Quartz는 Spring Batch의 대체재가 아니다.** Quartz는 실행 시점(스케줄링)을, Spring Batch는 실행 내용(읽기, 처리, 쓰기와 청크, 재시작, 메타데이터)을 담당한다. Quartz가 알람시계라면 Spring Batch는 실제 작업자 — 조합해서 쓰는 관계이며, Quartz만으로는 대량 데이터 페이징, 청크 트랜잭션, 재시작을 얻을 수 없다.

| 축 | Spring `@Scheduled` | Quartz |
|---|---|---|
| 의존성 | Spring Boot 기본 내장 | `spring-boot-starter-quartz` 추가 |
| 구성 | `@EnableScheduling` + `@Scheduled` | JobDetail + Trigger + Scheduler |
| 저장소 | 메모리 (인스턴스별 독립) | **DB 저장** (공유 JobStore) |
| 클러스터 | 미지원 (각 인스턴스가 중복 실행) | **지원** (DB 락으로 한 인스턴스만 실행) |
| Misfire 대응 | 없음 | **Misfire Instruction** 옵션 |
| 동적 스케줄링 | 제한적 | 런타임 변경 가능 |
| 트리거 종류 | Cron, fixedDelay, fixedRate | SimpleTrigger, CronTrigger, 기타 |

## 선택 기준

- **단일 서버, 단순 주기 작업** → `@Scheduled`
- **Multi-instance 환경 (K8s 레플리카)** → **Quartz 필수** (안 그러면 모든 레플리카가 중복 실행)
- **런타임 스케줄 변경, Admin UI 필요** → Quartz
- **ShedLock**: `@Scheduled`에 DB 락을 씌워 간단히 분산 제어하는 경량 대안

## 출처
- [sabarada — Spring Scheduler와 Spring Quartz](https://sabarada.tistory.com/113)
- [clearing01 — Spring Scheduler와 Quartz 비교](https://clearing01.tistory.com/122)
- [Spring Batch 운영과 설계 — YouTube 강의](https://www.youtube.com/watch?v=_nkJkWVH-mo&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=41)
