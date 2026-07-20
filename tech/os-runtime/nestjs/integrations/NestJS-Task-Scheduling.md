---
tags: [nestjs, schedule, cron, batch]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Task Scheduling", "@nestjs/schedule", "NestJS Cron"]
---

# NestJS Task Scheduling — @nestjs/schedule

`ScheduleModule.forRoot()`를 루트 모듈에 등록하면 앱 안의 선언적 크론/인터벌/타임아웃이 스케줄러에 등록된다. 등록 시점은 **onApplicationBootstrap** — 모든 모듈이 로드되고 선언이 끝난 뒤다.

## 선언적 크론 — @Cron

```ts
@Cron('45 * * * * *')          // 매분 45초에
handleCron() {}

@Cron(CronExpression.EVERY_30_SECONDS)   // 자주 쓰는 패턴 enum
```

- 패턴은 **6필드** — 왼쪽부터 초(optional), 분, 시, 일, 월, 요일. 표준 crontab(5필드)과 달리 초 단위가 있다.
- 예: `0 */30 9-17 * * *` = 9시~17시 매 30분, `0 30 11 * * 1-5` = 평일 11:30.

### @Cron 옵션

| 옵션 | 의미 |
|------|------|
| `name` | 동적 API로 접근, 제어하기 위한 식별자 |
| `timeZone` / `utcOffset` | 실행 시각의 기준 타임존 (잘못된 타임존이면 에러) |
| `waitForCompletion: true` | 현재 실행이 끝날 때까지 새 실행을 **skip** — 장시간 작업의 겹침 방지 |
| `disabled` | 아예 실행하지 않음 (환경별 끄기) |

## 선언적 인터벌, 타임아웃

- `@Interval(10000)` — 10초마다. `@Interval('name', ms)`로 이름 부여 가능.
- `@Timeout(5000)` — 앱 시작 5초 후 1회.

## 동적 API — SchedulerRegistry

`SchedulerRegistry`를 주입받아 런타임에 잡을 조회, 제어, 생성한다.

```ts
const job = this.schedulerRegistry.getCronJob('notifications');
job.stop();  job.start();  job.setTime(new CronTime('...'));
job.lastDate();  job.nextDate();  job.nextDates(5);   // DateTime 반환 (toJSDate()로 변환)

this.schedulerRegistry.addCronJob(name, job);   // 런타임 정의 크론 등록
this.schedulerRegistry.deleteCronJob(name);
// addInterval/deleteInterval, addTimeout/deleteTimeout 동일 계열
```

선언적 잡을 동적 API로 다루려면 데코레이터에 `name`을 줘야 한다.

## 운영 주의 — 멀티 인스턴스 중복 실행

스케줄러는 프로세스 내장이라 **인스턴스 N개면 같은 크론이 N번 실행**된다. 중복이 문제인 작업은 [[Distributed-Lock|분산 락]]으로 한 인스턴스만 실행하게 하거나, 스케줄 전용 워커로 분리한다.

## 관련 문서

- [[Distributed-Lock|분산 락 (중복 실행 방지)]]
- [[Spring-Batch-Essentials-Scheduler|Spring Batch 스케줄러 (Spring 쪽 대응)]]
- [[NestJS-Lifecycle|Lifecycle (onApplicationBootstrap 등록 시점)]]

## 출처
- [NestJS — Task scheduling](https://docs.nestjs.com/techniques/task-scheduling)
