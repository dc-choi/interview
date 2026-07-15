---
tags: [observability, prometheus, exporter, service-discovery, metrics, monitoring]
status: done
category: "관측가능성(Observability)"
aliases: ["Multi-Target Exporter", "멀티타겟 Exporter", "Service Discovery", "file_sd", "RDS SD"]
---

# 멀티타겟 Exporter와 서비스 디스커버리

대상 수가 많고 자주 늘고 주는 환경(DB fleet, 외부 엔드포인트 등)에서 [[Prometheus|Prometheus]] 수집을 운영하려면 두 가지가 자동화돼야 한다: **(1) 대상 하나마다 Exporter를 띄우지 않기**, **(2) 새 대상을 수집 설정에 자동으로 넣기**. 멀티타겟 Exporter가 (1)을, 서비스 디스커버리가 (2)를 푼다.

## 1:1 Exporter의 운영 부담

일반적인 구조는 **대상 하나당 Exporter 하나**다(예: DB마다 db-exporter 한 개). 대상이 늘 때마다 Exporter 프로세스와 Prometheus 타겟 설정을 함께 추가해야 한다.

- 배포할 프로세스 수 = 대상 수 → 운영 부담이 대상 수에 비례
- Exporter 자체의 헬스, 버전, 리소스를 대상 수만큼 관리

## 멀티타겟 Exporter 패턴

**하나의 Exporter가 여러 대상을 바라보는** 구조. 어느 대상을 긁을지는 scrape 시점에 **파라미터로 전달**한다.

```
Prometheus ──scrape──▶ http://exporter:9100/probe?target=db-a.rds.amazonaws.com
                                     └▶ Exporter가 db-a에 접속해 메트릭 수집 후 응답
```

- Prometheus가 `relabel_configs`로 대상 주소를 `__param_target`에 실어 보내면, Exporter가 그 대상에 접속해 메트릭을 수집해 돌려준다.
- 대상이 늘어도 **Exporter 프로세스는 그대로** — 타겟 목록만 늘면 된다.
- `blackbox_exporter`, `snmp_exporter`가 이 멀티타겟(probe) 모델의 대표. DB용도 같은 방식으로 구성 가능.

## 서비스 디스커버리 — 타겟 목록 자동 갱신

멀티타겟 Exporter를 써도 "새 대상 주소를 Prometheus에 넣는" 문제는 남는다. 이를 **서비스 디스커버리(SD)**가 푼다. Prometheus는 정적 설정 대신 SD로 타겟을 동적으로 발견한다([[Prometheus#동작 모델 — Pull 기반|Pull 모델의 SD]]).

- 빌트인 SD: Kubernetes, EC2, Consul 등.
- **`file_sd`**: 외부 도구가 타겟 목록을 **JSON 파일로 기록**하면 Prometheus가 그 파일을 감시(watch)하다가 변경을 자동 반영. 빌트인 SD로 못 잡는 대상에 쓰는 범용 확장점.

### 커스텀 SD 예: RDS SD

빌트인에 없는 RDS/Aurora 같은 대상은 커스텀 SD 도구로 채운다.

```
RDS SD (cron) ──▶ AWS RDS API 호출 → 현재 DB 목록 조회
              ──▶ targets.json 기록
Prometheus ──watch──▶ targets.json (file_sd) → 새 타겟 자동 scrape (멀티타겟 exporter 경유)
```

- 주기적으로 RDS API를 호출해 현재 DB 목록을 가져와 JSON으로 떨군다.
- Prometheus가 `file_sd`로 그 파일을 감시 → **DB가 생성/삭제돼도 수집 설정을 수동으로 고칠 필요가 없다**.
- [[DB-Provisioning-Pipeline|프로비저닝 파이프라인]]으로 만든 DB가 모니터링에 **자동 편입**되는 마지막 연결 고리.

## 멀티타겟 + SD가 함께 풀어주는 것

| 문제 | 단독 해법 | 한계 | 조합 효과 |
|------|-----------|------|-----------|
| Exporter 프로세스 증가 | 멀티타겟 Exporter | 타겟 목록은 여전히 수동 | — |
| 타겟 설정 수동 추가 | 서비스 디스커버리 | Exporter는 여전히 1:1 | — |
| 둘 다 | 멀티타겟 + SD | — | **대상이 늘어도 프로세스/설정 변경 0** |

## 주의점

- 멀티타겟 Exporter는 **단일 장애점**이 될 수 있다 → 수집 대상이 많으면 Exporter를 수평 확장하고 샤딩.
- probe 방식은 scrape 타임아웃, 동시성 한계에 주의(한 Exporter가 수백 대상을 직렬로 긁으면 느려짐).
- 대상별 라벨을 잘 붙이지 않으면 [[Cardinality|카디널리티]] 또는 식별 혼선이 생긴다.

## 면접 체크포인트

- 1:1 Exporter 모델의 한계와 멀티타겟(probe) 모델이 푸는 문제
- `__param_target` + `relabel_configs`로 대상을 파라미터화하는 흐름
- `file_sd` 기반 커스텀 SD(예: RDS SD)로 동적 타겟을 자동 발견하는 메커니즘
- 멀티타겟과 SD를 **함께** 써야 "대상 증가 시 변경 0"이 되는 이유
- 멀티타겟 Exporter의 SPOF, 동시성 함정과 대응

## 출처
- [Aurora DB 생성 자동화와 표준 운영 — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=4)
- [Prometheus — Multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)

## 관련 문서
- [[Prometheus|Prometheus (pull 모델, exporter, service discovery)]]
- [[Container-Monitoring|컨테이너 모니터링 (node_exporter, cAdvisor)]]
- [[Cardinality|카디널리티 관리]]
- [[RDS-Monitoring|RDS 모니터링]] — Aurora/RDS 메트릭 수집 맥락
- [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] — 생성된 DB의 모니터링 자동 편입
