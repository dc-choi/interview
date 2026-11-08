---
tags: [airflow, mwaa, aws, data-pipeline, troubleshooting]
status: done
verified_at: 2026-11-08
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["MWAA Stuck Running Tasks", "MWAA running 고착 태스크", "Airflow 태스크 running 고착"]
---

# MWAA에서 running에 멈춘 태스크

## 정의와 mental model

Amazon MWAA(Managed Workflows for Apache Airflow)에서 일이 끝난 태스크가 running으로 남는 현상의 원인은 하나가 아니다. 워커 자원 부족, 메타데이터 DB 연결 문제, 스케줄러 부하와 잘못된 Airflow 설정이 모두 태스크 상태 갱신을 막을 수 있다. 진단은 워커 자원, DB 연결, 스케줄러와 DAG 직렬화, DAG 코드, 환경 클래스 순서로 좁힌다.

2026-11-08에 AWS Knowledge Center 글, MWAA 사용 설명서와 Apache Airflow 설정 문서를 대조했다. 설정 이름과 DB 연결 설명은 Airflow 2 기준이고, Airflow 3에서 바뀐 것 중 확인한 설정은 아래 Airflow 3 절에 모았다. Knowledge Center 글은 직접 접근이 막혀 게시일 2025-10-27이 표시된 중계본으로 읽었으므로 현재 개정본과 다를 수 있다.

## 1. 워커 자원

- **지표:** CloudWatch `AWS/MWAA` 네임스페이스의 `Cluster` 차원에서 BaseWorker와 AdditionalWorker의 CPU와 메모리 사용률을 본다. 평균은 짧은 급증을 가릴 수 있으므로 Knowledge Center 글은 통계를 Maximum, 기간을 1분이나 5분으로 두고 80%를 넘는 정점이 계속되는지 보라고 한다. MWAA 대시보드 문서의 권장 경보(5분 주기 BaseWorker 평균 95% 초과가 6개 중 6개)와 기준이 다르므로 경보와 진단 기준을 구분한다.
- **워커당 동시 실행:** `celery.worker_autoscale`은 `최대,최소` 동시 태스크 수이며 MWAA 기본값은 mw1.small `5,0`, mw1.medium `10,0`이다. 워커는 자원이 충분한지와 관계없이 설정한 최대 수까지 태스크를 받고, 자원 없이 배정된 태스크는 바로 실패한다. 무거운 태스크가 많으면 최대값을 낮춰 태스크당 CPU와 메모리를 늘린다. MWAA는 `celery.worker_concurrency` 값을 무시한다.
- **전체와 DAG별 상한:** MWAA는 전체 상한 `core.parallelism`을 `(maxWorkerCount * maxCeleryWorkerSlots) / schedulers * 1.5`로 정한다. DAG별 상한 `core.dag_concurrency`는 기본 16이며 2.2.0부터 사용 중단 예정이고, 업스트림 후속 설정은 `core.max_active_tasks_per_dag`(기본 16)다. 누군가 값을 낮춰 실행을 막고 있지 않은지 확인한다.
- **로그 양:** 워커, 스케줄러와 웹 서버의 로그 수준을 INFO 대신 WARNING으로 두어 로깅에 드는 자원을 줄인다.

## 2. 메타데이터 DB 연결

- **오류 문자열:** 로그에서 `psycopg2.OperationalError: SSL connection has been closed unexpectedly`, `Timed-out waiting to acquire database connection`과 SIGTERM, SIGKILL 오류를 찾는다.
- **태스크마다 새 인터프리터:** `core.execute_tasks_new_python_interpreter`는 MWAA 기본값이 `True`, 업스트림 기본값이 `False`다. AWS 성능 튜닝 문서가 밝힌 이유는 plugin 변경 반영이고, Knowledge Center 글은 태스크 사이의 DB 연결 문제를 막는 효과를 든다. 바뀌어 있으면 `True`로 되돌린다. Airflow 3에서는 task process에만 적용된다. fork로 물려받는 연결 문제는 [[Airflow-Task-Process-Model|Airflow 태스크 프로세스 모델]]을 본다.
- **DB 왕복 줄이기:** Airflow 2에서 메타데이터 DB의 Variable을 읽을 때마다 DB 연결이 열린다. XCom은 작은 메시지용이므로 큰 데이터는 S3 같은 원격 저장소로 넘긴다. Airflow 3의 태스크 코드는 DB에 직접 붙지 않고 Execution API를 거친다([[Airflow-Task-Process-Model|Airflow 태스크 프로세스 모델]]).

## 3. 스케줄러와 DAG 직렬화

- **파싱 프로세스:** `scheduler.parsing_processes`의 MWAA 기본값은 `(2 * vCPU 수) - 1`이고 상한은 mw1.small 1, mw1.medium 3, mw1.large 7이다. 업스트림 기본값은 2다.
- **스케줄러 상태:** `AmazonMWAA` 네임스페이스의 `SchedulerHeartbeat`(`Function: Scheduler` 차원)가 떨어지면 스케줄러가 제때 돌지 못한다는 신호다. 대시보드 문서의 권장 경보는 합계 1 미만이 2개 중 2개다.
- **직렬화와 주기:** `core.min_serialized_dag_update_interval`(기본 30초)을 늘리면 직렬화한 DAG를 DB에 쓰는 빈도가 줄어든다. 더 세밀하게는 `scheduler.dag_dir_list_interval`(300초), `scheduler.min_file_process_interval`(30초), `scheduler.scheduler_idle_sleep_time`(1초)을 조정한다. AWS는 `scheduler_idle_sleep_time`을 늘리면 `parsing_processes`에 쓸 스케줄러 스레드가 줄어든다고 경고한다.
- **그 밖의 방법:** Knowledge Center 글은 Airflow 2 설정인 `scheduler.schedule_after_task_execution`을 `False`로 두기, 메타데이터 DB 정기 정리, `.airflowignore`, 파싱 때 쓰는 Variable 캐싱도 든다. 파싱 비용 자체는 [[Airflow-DAG-Parsing|Airflow DAG 파싱 최적화]]를 본다.

## 4. DAG 코드

- 무거운 데이터 처리는 워커에서 하지 않고 EMR, Glue, EKS 같은 전용 서비스로 넘긴다.
- top-level 코드는 파싱마다 실행되므로 import와 로직을 태스크 함수 안으로 옮긴다.
- 외부 작업을 오래 기다리는 태스크는 deferrable operator로 바꾼다. 기다리는 동안 워커 슬롯을 차지하지 않는다.

## 5. 환경 클래스

| 클래스 | 워커당 자원 | 기본 동시 태스크 |
|---|---|---|
| mw1.small | 1 vCPU, 2 GB | 5 |
| mw1.medium | 2 vCPU, 4 GB | 10 |

small에서 large까지는 단계마다 자원이 두 배씩 늘지만, large에서 xlarge로 갈 때 워커 메모리는 8 GB에서 24 GB로 세 배가 된다. 기본값대로라면 small과 medium의 태스크당 몫은 0.2 vCPU, 0.4 GB로 같으므로, 클래스를 올려 태스크당 자원을 늘리려면 `celery.worker_autoscale` 최대값도 함께 정한다. 반대로 `parsing_processes` 상한은 클래스와 함께 커지므로 스케줄러 쪽 부담은 상향으로 줄 수 있다.

## Airflow 3에서 바뀌는 설정

- `parsing_processes`, `min_file_process_interval`은 `[dag_processor]` 섹션으로 옮겨졌고 `dag_dir_list_interval`은 `dag_processor.refresh_interval`이 됐다.
- `core.dag_concurrency`는 Airflow 3에 없다.

## 흔한 오해

- MWAA에서 `core.parallelism`과 `core.dag_concurrency`가 기본 10,000이라는 설명은 공식 문서와 다르다. 앞의 계산식과 기본값 16을 쓴다.
- mw1.medium의 `celery.worker_autoscale` 기본값은 `10,10`이 아니라 `10,0`이다. `10,10`은 MWAA 문제 해결 문서가 Airflow 3의 WorkerLostError 대응으로 제시한 값이다.
- `scheduler.idle_sleep_time`이라는 옵션은 없다. 옵션 이름은 `scheduler_idle_sleep_time`이다.

## 점검 체크리스트

- [ ] BaseWorker와 AdditionalWorker의 CPU와 메모리를 Maximum 통계, 1분이나 5분 기간으로 봤는가
- [ ] `celery.worker_autoscale` 최대값이 태스크의 자원 요구와 맞는가
- [ ] DB 연결 오류 로그와 `core.execute_tasks_new_python_interpreter` 값을 확인했는가
- [ ] `SchedulerHeartbeat`와 환경 클래스의 `parsing_processes` 상한을 확인했는가
- [ ] 오래 기다리는 태스크를 deferrable operator로 바꿨는가
- [ ] 위 조치 뒤에도 남는 자원 부족만 환경 클래스 상향으로 해결하는가

## 출처

- [How do I resolve tasks that are stuck in the running state in my Amazon MWAA environment? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/mwaa-stuck-running-state) — 2026-11-08 중계본으로 확인, 게시일 2025-10-27 표시
- [Amazon MWAA User Guide, Performance tuning for Apache Airflow on Amazon MWAA](https://docs.aws.amazon.com/mwaa/latest/userguide/best-practices-tuning.html)
- [Amazon MWAA User Guide, Configuring the Amazon MWAA environment class](https://docs.aws.amazon.com/mwaa/latest/userguide/environment-class.html)
- [Amazon MWAA User Guide, Container, queue, and database metrics for Amazon MWAA](https://docs.aws.amazon.com/mwaa/latest/userguide/accessing-metrics-cw-container-queue-db.html)
- [Amazon MWAA User Guide, Apache Airflow environment metrics in CloudWatch](https://docs.aws.amazon.com/mwaa/latest/userguide/access-metrics-cw.html)
- [Amazon MWAA User Guide, Monitoring dashboards and alarms on Amazon MWAA](https://docs.aws.amazon.com/mwaa/latest/userguide/monitoring-dashboard.html)
- [Amazon MWAA User Guide, Using Apache Airflow configuration options on Amazon MWAA](https://docs.aws.amazon.com/mwaa/latest/userguide/configuring-env-variables.html)
- [Amazon MWAA User Guide, Troubleshooting: DAGs, Operators, Connections, and other issues](https://docs.aws.amazon.com/mwaa/latest/userguide/t-apache-airflow-202.html)
- [Amazon MWAA User Guide, Configuring Amazon MWAA worker automatic scaling](https://docs.aws.amazon.com/mwaa/latest/userguide/mwaa-autoscaling.html)
- [Apache Airflow 2.10.5, Configuration Reference](https://airflow.apache.org/docs/apache-airflow/2.10.5/configurations-ref.html)
- [Apache Airflow, Configuration Reference](https://airflow.apache.org/docs/apache-airflow/stable/configurations-ref.html) — 2026-11-08 기준 3.4.0
- [Apache Airflow Celery provider, Configuration Reference](https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/configurations-ref.html)
- [Apache Airflow, Deferrable Operators and Triggers](https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/deferring.html)
- [Apache Airflow, Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)

## 관련 문서

- [[Airflow-DAG-Parsing|Airflow DAG 파싱 최적화]]
- [[Airflow-Task-Process-Model|Airflow 태스크 프로세스 모델과 Python 멀티프로세싱]]
- [[메시징&파이프라인(Messaging&Pipeline)]] — 카테고리 인덱스
