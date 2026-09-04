---
tags: [airflow, python, multiprocessing, fork, spawn, forkserver, copy-on-write]
status: done
verified_at: 2026-09-04
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Airflow Task Process Model", "Airflow 태스크 프로세스 모델"]
---

# Airflow 태스크 프로세스 모델과 Python 멀티프로세싱

Airflow의 일반적인 production worker 경로는 태스크를 별도 프로세스 경계에서 실행해 병렬성, 수명 주기 관리와 상태 격리를 얻는다. 이때 프로세스 생성 방식은 시작 비용, 메모리 공유, 부모 자원 상속과 안전성 사이의 선택이다. `fork`가 빠르다는 이유만으로 기본 선택이라고 단정하거나, 프로세스가 분리됐다는 이유만으로 보안 격리까지 보장된다고 보면 안 된다.

## Airflow 3의 실행 구조

Python Task SDK 실행 경로의 핵심 구조는 다음과 같다.

```text
LocalExecutor의 scheduler
└─ 장기 worker 프로세스, mp_start_method 적용
   └─ supervisor 역할의 supervise_task
      ├─ 태스크 수명 주기, 로그와 시그널 관리
      ├─ Execution API 통신 중계
      └─ 단기 Task Runner 프로세스
         └─ 사용자 태스크 코드
```

- `LocalExecutor`는 scheduler 노드에서 장기 실행 worker 프로세스를 만들고 큐로 작업을 배분한다.
- `CeleryExecutor`는 Celery worker가 작업을 받고, 실제 동시성과 프로세스 경계는 prefork, eventlet, gevent와 solo 같은 pool 설정에 따라 달라진다.
- `KubernetesExecutor`는 태스크마다 Pod 경계가 생기므로 같은 로컬 프로세스 트리를 그대로 적용할 수 없다.
- `dag.test()` 같은 로컬 실행은 별도 Task Runner fork와 표준 IPC 경로를 우회해 in-process로 동작할 수 있다.
- Airflow 3의 Python supervisor는 별도 task runner를 감독하고 로그, 종료 상태와 시그널을 처리한다. 태스크의 상태 요청은 Execution API로 중계된다.

Airflow 3.3.1에서 worker의 태스크 코드는 메타데이터 DB 자격 증명을 직접 받지 않는다. 하지만 사용자 코드를 샌드박싱하는 구조는 아니다. 같은 노드의 CPU와 메모리 고갈, 외부 시스템 오염, executor별 권한 경계는 별도로 통제해야 한다.

## 프로세스가 필요한 이유

### 병렬성

기본 GIL 빌드의 CPython에서는 한 인터프리터 안에서 한 번에 한 스레드만 Python 바이트코드를 실행한다. 프로세스를 나누면 각 인터프리터가 독립적인 GIL을 가지므로 CPU 집약적인 Python 코드도 여러 코어에서 실행할 수 있다.

이 설명은 Python 전체가 한 코어만 쓴다는 뜻이 아니다. I/O 대기, GIL을 해제하는 네이티브 확장과 선택형 free-threaded 빌드는 별도로 봐야 한다. Airflow가 프로세스를 사용하는 이유도 GIL 회피뿐 아니라 태스크 종료, 로그 수집과 상태 격리를 포함한다.

### 수명 주기와 상태 격리

단기 task runner를 종료하면 그 프로세스가 적재한 모듈과 메모리 상태도 함께 폐기된다. 태스크 실패를 상위 제어 루프와 분리하고 타임아웃, 시그널과 좀비 회수를 한곳에서 관리하기도 쉽다.

다만 프로세스 경계만으로 외부 부수효과까지 되돌릴 수는 없다. 상속한 소켓과 DB 연결, 공유 파일, 원격 API 호출과 메시지 발행은 별도 정리와 멱등성 계약이 필요하다.

## Python의 start method

| 방식 | 생성 모델 | 장점 | 주요 비용과 위험 |
|---|---|---|---|
| `fork` | 현재 인터프리터를 `os.fork()`로 복제 | 시작이 빠르고 이미 적재한 페이지를 COW로 공유 | 부모의 파일 디스크립터, 연결과 잠금 상태를 상속한다. 멀티스레드 부모에서 안전하게 쓰기 어렵다 |
| `spawn` | 새 인터프리터를 시작하고 진입 모듈을 다시 import | 부모 런타임 상태의 의도치 않은 상속이 적고 Windows에서도 동작 | 시작과 import 비용이 크다. 대상과 인자가 picklable해야 하고 진입점 보호가 필요하다 |
| `forkserver` | 보통 단일 스레드로 유지되는 서버가 요청마다 fork | `fork`의 공유 이점과 멀티스레드 부모의 위험을 절충 | import 부작용으로 서버에 스레드가 생길 수 있다. 별도 서버와 resource tracker가 필요하다 |

Python 3.14에서는 `fork`가 어느 플랫폼에서도 기본값이 아니다. Windows와 macOS는 `spawn`, 파일 디스크립터 전달을 지원하는 Linux 같은 POSIX 환경은 `forkserver`가 기본이다. 플랫폼, Python 버전과 설정에 따라 달라지므로 실행 중인 환경에서 확인한다.

```python
import multiprocessing as mp

print(mp.get_all_start_methods())
print(mp.get_start_method())
```

라이브러리는 전역 start method를 임의로 고정하기보다 호출자가 `multiprocessing` context를 전달할 수 있게 하는 편이 안전하다. `spawn`과 `forkserver`에서는 `if __name__ == "__main__":` 진입점 보호와 직렬화 가능성도 확인한다.

## `fork`와 Copy-on-Write

`fork` 직후 부모와 자식은 물리 메모리 페이지를 공유하고, 어느 쪽이 페이지를 수정하면 해당 페이지가 복사된다. 그래서 부모가 무거운 모듈을 미리 import했다면 자식의 시작과 초기 메모리 비용을 줄일 수 있다.

COW는 무상 복제가 아니다.

- 커널의 프로세스 자료구조, 페이지 테이블, 스택과 일부 private page 비용은 처음부터 생긴다.
- 애플리케이션이 읽기만 한다고 생각해도 CPython의 참조 횟수, GC와 allocator 메타데이터 갱신이 페이지를 dirty하게 만들 수 있다.
- 태스크가 데이터를 수정할수록 private page가 늘어 시작 직후의 공유 이점이 줄어든다.
- fork 이전에 적재하지 않은 모듈은 자식이 직접 import해야 한다.

또한 자식은 부모의 DB 연결, 소켓, 파일 디스크립터와 잠금 상태를 물려받을 수 있다. 다른 부모 스레드가 잡고 있던 잠금은 자식에서 해제할 스레드가 사라져 교착 상태를 만들 수 있다. Python 3.12부터 멀티스레드 프로세스의 `fork`를 감지하면 `DeprecationWarning`이 발생할 수 있는 이유다.

## Airflow 3.3의 설정 경계

| 설정 | 적용 의미 |
|---|---|
| `[core] mp_start_method` | `LocalExecutor`와 triggerer 등이 표준 라이브러리 `multiprocessing` 자식을 만드는 기본 방식. Celery의 billiard pool에는 적용되지 않음 |
| `[scheduler]`, `[triggerer]`, `[dag_processor]`의 `mp_start_method` | 컴포넌트별 override |
| `[core] mp_forkserver_preload` | `forkserver`가 미리 import해 자식과 COW로 공유할 모듈. Airflow 3.3.1에서는 `mp_start_method = forkserver`를 명시해야 적용됨 |
| `[core] parallelism` | scheduler당 동시에 실행할 수 있는 태스크 인스턴스 상한. `LocalExecutor`의 worker 수와 자원 사용에 직접 영향 |

`mp_start_method`와 `mp_forkserver_preload`는 Airflow 3.3.0에 추가됐다. `mp_start_method`를 비우면 플랫폼의 Python 기본값을 따르므로 Airflow 버전만 보고 `fork` 또는 `spawn`을 단정할 수 없다. 다만 Airflow 3.3.1은 `mp_start_method`가 비어 있으면 preload 처리 전에 반환하므로, 플랫폼 기본값이 `forkserver`여도 `mp_forkserver_preload`는 적용되지 않는다. preload가 필요하면 `mp_start_method = forkserver`도 명시한다. 이 설정은 지원하는 컴포넌트의 `multiprocessing` 자식 생성 방식을 정하며 단기 Task Runner에는 그대로 적용되지 않는다. Airflow 3.3.1 소스에서 Task Runner는 Linux에서는 `os.fork()`, macOS에서는 fork 안전성 문제를 줄이기 위한 `fork + exec` 경로로 생성된다. 이 부분은 구현 세부사항이므로 업그레이드할 때 다시 확인한다.

## 조건부 측정 사례

Python 3.11, Debian 12, Airflow 2.10.2 이미지, 자식 10개와 CPU limit 4인 환경에서 부모가 `airflow`를 미리 import한 뒤 측정한 값이다.

| 방식 | 자식 준비 시간 평균 | 자식의 `airflow` import 평균 | 부모 포함 PSS 합 |
|---|---:|---:|---:|
| `fork` | 4.3 ms | 약 0 ms | 120.8 MB |
| `spawn` | 206.6 ms | 2,694.8 ms | 918.2 MB |

이 값은 start method의 고정 성능표가 아니다. `fork`의 import 시간이 짧은 이유는 부모가 같은 모듈을 먼저 적재했기 때문이고, 동시 `spawn` import는 CPU limit 아래에서 서로 경합했다. Python과 Airflow 버전, preloading, 프로세스 수, 컨테이너 CPU quota와 태스크가 dirty하게 만드는 페이지 비율이 바뀌면 결과도 달라진다.

메모리를 볼 때는 지표의 의미를 분리한다.

| 지표 | 해석 |
|---|---|
| RSS | 프로세스에 매핑된 resident page 총량. 공유 페이지를 각 프로세스에 중복 계산 |
| PSS | 공유 페이지를 공유자 수로 나눠 안분. 여러 프로세스의 물리 메모리 기여도를 비교할 때 유용 |
| USS | 해당 프로세스만 점유하는 private resident page |

시작 직후 수치만 보면 COW 이득을 과대평가할 수 있다. 실제 태스크를 반복한 정상 상태에서도 PSS와 USS를 다시 측정하고 처리량, 시작 지연, page fault와 OOM 여부를 함께 본다.

## 운영 체크리스트

1. Python, Airflow, executor와 OS 버전을 기록하고 effective start method를 확인한다.
2. 부모 프로세스가 멀티스레드인지, fork 전에 어떤 모듈과 연결을 만들었는지 확인한다.
3. 상속된 DB pool, 소켓, 파일 디스크립터와 lock을 자식에서 재사용해도 되는지 검토한다.
4. `forkserver`를 쓴다면 안전하게 preload할 모듈과 실제 메모리 절감량을 측정한다.
5. 짧은 태스크가 많으면 프로세스 생성과 import가 처리량 병목인지 분리 측정한다.
6. `LocalExecutor`에서는 `parallelism`과 scheduler Pod의 CPU, 메모리 한도를 함께 조정한다.
7. task runner 종료, 좀비 회수, 타임아웃과 로그 업로드 실패가 상위 worker를 멈추지 않는지 검증한다.
8. 프로세스 경계를 보안 샌드박스로 간주하지 않고 executor와 배포 경계에 맞는 권한 격리를 둔다.

## 면접 체크포인트

- `fork`, `spawn`, `forkserver`의 생성 방식과 안전성 차이
- 부모가 preloading했을 때만 `fork`의 import 이점이 커지는 이유
- RSS 합이 멀티프로세스 메모리를 과대평가할 수 있는 이유
- COW가 실행 중 약해지는 원인과 PSS, USS로 확인하는 방법
- Airflow가 프로세스를 쓰는 이유를 GIL, 수명 주기, 상태 격리로 나눠 설명하기
- Airflow 설정의 start method와 단기 task runner 구현을 구분하기
- 프로세스 격리와 보안 샌드박스가 다른 이유

## 출처

- [Python의 멀티프로세싱과 Airflow, 그리고 관련된 문제 해결기 1편 — NAVER D2, 도정우](https://d2.naver.com/helloworld/4452165)
- [Python 3.14 Documentation, multiprocessing — Process-based parallelism](https://docs.python.org/3/library/multiprocessing.html)
- [Python 3.14 Documentation, threading — GIL and performance considerations](https://docs.python.org/3/library/threading.html#gil-and-performance-considerations)
- [Python 3.14 Documentation, Python support for free threading](https://docs.python.org/3/howto/free-threading-python.html)
- [Python 3.14 Documentation, gc.freeze](https://docs.python.org/3/library/gc.html#gc.freeze)
- [Linux man-pages, fork(2)](https://man7.org/linux/man-pages/man2/fork.2.html)
- [Linux Kernel Documentation, The /proc Filesystem](https://docs.kernel.org/filesystems/proc.html)
- [Apache Airflow 3.3.1, Architecture Overview](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html)
- [Apache Airflow 3.3.1, Local Executor](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/executor/local.html)
- [Apache Airflow 3.3.1, Configuration Reference](https://airflow.apache.org/docs/apache-airflow/stable/configurations-ref.html#mp-start-method)
- [Apache Airflow 3.3.1, Airflow Security Model](https://airflow.apache.org/docs/apache-airflow/stable/security/security_model.html)
- [supervisor.py — Apache Airflow 3.3.1 source](https://github.com/apache/airflow/blob/3.3.1/task-sdk/src/airflow/sdk/execution_time/supervisor.py)

## 관련 문서

- [[Airflow-DAG-Parsing|Airflow DAG 파싱 최적화]]
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[Virtual-Memory-Paging|가상 메모리 페이징]]
