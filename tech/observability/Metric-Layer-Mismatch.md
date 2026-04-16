---
tags: [observability, metrics, cloudwatch, grafana, prometheus, ec2, troubleshooting]
status: done
category: "관측가능성(Observability)"
aliases: ["Metric Layer Mismatch", "메트릭 측정 레이어", "CloudWatch vs Grafana CPU", "iowait CPU"]
---

# 메트릭 측정 레이어의 함정 — CloudWatch는 0%, Grafana는 100%

같은 자원의 같은 메트릭이 도구마다 다른 값으로 보이는 이유와 그 함정 정리. CPU·메모리·디스크·네트워크·컨테이너 모두에서 같은 패턴이 나타나며, 원인은 **측정 레이어가 다르기 때문**이다.

## 핵심 명제

같은 EC2 인스턴스의 CPU가 **CloudWatch에서 0%, Grafana(node_exporter)에서 100%** 로 보이는 일이 실제로 발생한다. 둘 다 거짓이 아니다 — **측정 위치(하이퍼바이저 외부 vs 게스트 OS 커널)가 다르기 때문**이다. 한쪽만 보면 진짜 병목(예: 디스크 I/O)을 영원히 못 잡는다.

## 왜 이런 차이가 났는가 — 측정 레이어가 다르다

| 항목 | CloudWatch (`CPUUtilization`) | Grafana + node_exporter |
|---|---|---|
| 측정 위치 | **하이퍼바이저(Nitro) 외부** | 게스트 OS 커널 `/proc/stat` |
| 보는 것 | vCPU가 **실제 실행된 시간** | idle이 아닌 모든 시간 |
| iowait 포함? | **아니오** (CPU 실행 아님) | **예** (non-idle로 분류) |
| user / system / irq | 포함 | 포함 |
| 기본 수집 주기 | 1분 | 5~15초 (설정값) |

핵심: **iowait를 CPU로 보느냐 마느냐.** CPU 코어는 실제로 일을 안 하고 디스크 응답만 기다리고 있는 상태가 iowait인데, 정의가 갈린다.

## iowait의 정체 — CPU는 놀고 있다, 그런데 일도 못 한다

리눅스 `/proc/stat`의 CPU 시간 분류:
- `user` / `nice`: 유저 모드 실행
- `system` / `irq` / `softirq`: 커널 모드 실행
- `idle`: 진짜로 노는 시간
- **`iowait`**: idle인데, 그 사이에 적어도 한 프로세스가 디스크 I/O 완료를 기다리고 있는 상태
- `steal`: 하이퍼바이저가 다른 VM에 CPU를 뺏김 (가상화 환경)

iowait는 사실상 **idle의 한 종류**. 그래서 하이퍼바이저 관점(CloudWatch)에서는 "CPU가 안 돌아간 시간"이고, 게스트 OS 관점(node_exporter)에서는 "유의미한 일을 못한 시간"으로 본다.

`top`이나 `vmstat`에서 `wa` 컬럼이 높고, 프로세스 상태가 `D`(uninterruptible sleep)로 다수 보이면 iowait 병목 확정 — 디스크가 범인.

## 검증 — stress-ng로 인위 재현

```bash
stress-ng --io 4 --hdd 2 --timeout 300s
```

- CloudWatch: CPU 최대 ~15%
- Grafana: CPU ~100%
- vmstat: `id ~92, wa ~13, r 0` → 실행 가능 프로세스 0, CPU 여유, 디스크 대기

**같은 시간, 같은 머신, 다른 결론.** 어느 쪽도 거짓이 아니다.

## 어느 쪽을 봐야 하는가 — 둘 다

용도가 다르므로 **둘 다 봐야 한다.**

| 질문 | 어느 메트릭? |
|---|---|
| "CPU 코어 자체가 모자란가?" (스케일업/아웃 판단) | CloudWatch |
| "워크로드가 무엇을 기다리고 있는가?" (병목 식별) | node_exporter (iowait, runqueue) |
| 오토스케일링 트리거 | CloudWatch + iowait 알람 병행 |
| 비용 분석 | CloudWatch (하이퍼바이저 관점이 청구 기준에 가깝음) |
| 애플리케이션 튜닝 | OS 메트릭 |

## 권장 모니터링 쿼리 (PromQL)

다음 3개를 함께 본다.

```promql
# 1. CPU 사용률 (idle 제외, iowait 포함) — Grafana 기본
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 2. iowait만 별도 — CloudWatch가 못 보는 병목
avg by (instance) (irate(node_cpu_seconds_total{mode="iowait"}[5m])) * 100

# 3. CPU 모드별 분포 — 어디에 시간을 쓰는지
sum by (mode) (irate(node_cpu_seconds_total[5m])) * 100
```

알람 권장:
- `iowait > 20% for 5m` → 디스크/스토리지 병목 의심
- `idle < 5% for 5m && iowait < 5%` → 진짜 CPU 부족
- `steal > 10%` → 하이퍼바이저 측 경합 (Noisy Neighbor)

## 일반화 — 다른 메트릭에도 같은 함정

CPU만의 문제가 아니다. **모든 메트릭은 측정 레이어를 함께 읽어야 한다.**

| 메트릭 | 흔한 레이어 차이 |
|---|---|
| **메모리** | CloudWatch(외부에서 못 봄, 미공개) vs node_exporter(`MemAvailable` 정확) — CloudWatch는 기본 메모리 메트릭이 없어 CWAgent 별도 필요 |
| **디스크** | CloudWatch(EBS volume 단위) vs OS(파일시스템·마운트 단위) — 볼륨이 100% 차도 마운트는 정상일 수 있음 |
| **네트워크** | ENI 통계 vs OS `/proc/net/dev` — TCP 재전송·드롭은 OS 레벨에서만 보임 |
| **컨테이너 CPU** | ECS/Fargate Service Insights vs cgroup — Throttle 횟수는 cgroup에만 |
| **JVM 메모리** | OS RSS vs JMX heap — heap이 여유 있어도 OS는 OOM kill 가능 |

## 실무 교훈

1. **"메트릭이 0이다" ≠ "문제가 없다"** — 그 레이어에서 안 보일 뿐일 수 있다
2. **알람은 두 레이어 이상 교차**해야 한다 (CloudWatch만 / Grafana만은 둘 다 위험)
3. 사고 후 포스트모템에 **어떤 레이어를 봤더라면 더 빨리 잡았을지**를 기록한다
4. 새로운 모니터링 도구를 도입하면 **수치 정의를 매뉴얼에서 직접 확인** — "CPU 사용률"이라는 같은 라벨이 다른 걸 의미할 수 있다

## 면접 체크포인트

- CloudWatch CPU와 OS CPU가 다른 이유를 **iowait 정의**로 설명할 수 있는가
- **iowait의 정체** (idle의 일종, 디스크 I/O 대기) 설명
- `vmstat`의 `r`, `b`, `wa` 컬럼으로 병목을 진단하는 절차
- 같은 함정이 **메모리·디스크·네트워크·컨테이너·JVM**에서도 발생하는 이유
- 알람을 **두 레이어 교차**로 설계하는 이유
- 클라우드 메트릭만 믿었을 때의 위험과 보완 방법

## 출처
- [딤섬뮨 — 같은 CPU, 다른 값: CloudWatch는 0%, Grafana는 100%였던 이유](https://sienna1022.tistory.com/entry/%EA%B0%99%EC%9D%80-CPU-%EB%8B%A4%EB%A5%B8-%EA%B0%92-CloudWatch%EB%8A%94-0-Grafana%EB%8A%94-100%EC%98%80%EB%8D%98-%EC%9D%B4%EC%9C%A0)

## 관련 문서
- [[Incident-Detection-Logging|장애 감지와 로깅/메트릭 (GPL 스택 비교, SLO 알림)]]
- [[Structured-Logging|Structured logging]]
- [[Latency-Optimization|레이턴시 최적화 개관]]
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]
