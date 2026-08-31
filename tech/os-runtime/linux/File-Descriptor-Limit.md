---
tags: [linux, os, filesystem, troubleshooting, fd]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["File Descriptor Limit", "파일 디스크립터 한도", "ulimit -n", "EMFILE", "too many open files"]
verified_at: 2026-08-31
---

# 파일 디스크립터 한도 — ulimit, EMFILE, 고갈 진단

`too many open files`는 대개 코드 한 줄의 버그가 아니라 한도와 누수가 만나는 지점에서 터진다. 한도는 프로세스 soft, 프로세스 hard, 시스템 전역의 세 겹으로 걸려 있고, 어느 층에 걸렸느냐에 따라 조치할 위치가 달라진다. 한도만 올리면 증상이 며칠에서 몇 주 뒤로 밀릴 뿐이므로, 실측으로 층을 좁히고 소비 주체를 분해하는 것이 먼저다.

fd 자체의 커널 자료구조(프로세스별 fd 테이블의 정수 인덱스, open file description을 거쳐 inode로 이어지는 경로)는 [[Storage-and-FileSystem-Files#파일 메타데이터와 파일 디스크립터|파일 메타데이터와 파일 디스크립터]]가 정본이다. 이 문서는 한도와 고갈만 다룬다.

## 한도는 세 겹이다 — soft, hard, 전역

| 층 | 위치 | 의미 | 초과 시 |
|---|---|---|---|
| 프로세스 soft | `RLIMIT_NOFILE` soft, `ulimit -n` | 커널이 지금 강제하는 값. 프로세스가 hard 이하로 스스로 올릴 수 있다 | `EMFILE` |
| 프로세스 hard | `RLIMIT_NOFILE` hard, `ulimit -Hn` | soft의 천장. 올리려면 `CAP_SYS_RESOURCE`가 필요하다 | `EPERM`(상향 시도 실패) |
| 시스템 전역 | `/proc/sys/fs/file-max` | 모든 프로세스를 합친 열린 파일 수 상한 | `ENFILE` |
| hard의 천장 | `/proc/sys/fs/nr_open` | `RLIMIT_NOFILE`을 올릴 수 있는 상한. Linux 2.6.25부터 존재하고 기본값 1,048,576 | `EPERM` |

- `RLIMIT_NOFILE`은 열 수 있는 최대 fd 번호보다 1 큰 값으로 정의된다. `open(2)`, `pipe(2)`, `dup(2)` 등이 이를 넘으면 `EMFILE`을 반환한다.
- hard를 `nr_open` 위로 올리려는 시도는 특권 프로세스라도 `EPERM`이다. 아주 큰 한도가 필요하면 `nr_open`을 먼저 올려야 한다.
- 전역 `file-max`는 `CAP_SYS_ADMIN`을 가진 프로세스가 넘어설 수 있다고 man page가 명시한다. 따라서 전역 한도만으로 격리를 기대하지 않는다.

## 무엇이 fd를 차지하는가

- 일반 파일과 디렉토리 핸들
- TCP, UDP, Unix 도메인 **소켓**. 서버에서는 보통 이쪽이 압도적이다
- **파이프**와 FIFO, `eventfd`, `timerfd`, `signalfd`
- **epoll 인스턴스**와 `inotify` 인스턴스. `inotify` watch 자체는 fd가 아니라 하나의 `inotify` fd 아래에 붙는 watch descriptor다
- 프로세스 시작 시 이미 잡힌 stdin, stdout, stderr (fd 0, 1, 2)

즉 파일을 거의 열지 않는 API 서버도 커넥션 수만큼 fd를 쓴다. fd 고갈 조사에서 파일부터 뒤지면 대개 헛짚는다.

## EMFILE vs ENFILE — 조치 위치가 다르다

| | EMFILE | ENFILE |
|---|---|---|
| 뜻 | 프로세스별 열린 fd 한도 도달 | 시스템 전역 열린 파일 수 한도 도달 |
| 원인 층 | 해당 프로세스의 `RLIMIT_NOFILE` soft | `/proc/sys/fs/file-max` |
| 조치 | 그 서비스의 soft 한도, 그리고 그 프로세스의 누수 | 호스트 전역 한도와 다른 프로세스까지 포함한 총사용량 |
| 오해 | 호스트 전체가 고갈됐다고 착각 | 애플리케이션 하나만 손보면 된다고 착각 |

- 애플리케이션 표면에서는 둘 다 `too many open files` 문자열로 보이므로 **에러 코드로 구분**한다.
- 서버의 accept 루프가 `EMFILE`을 만나면 기존 연결은 그대로 도는데 신규 연결만 안 붙는 형태로 나타난다. 헬스체크가 이미 열린 연결로 도는 구조면 정상으로 보고되기도 한다.
- Node.js 문서의 `EMFILE` 설명문은 시스템 전체 한도처럼 읽히지만, per-process는 `EMFILE`, 시스템 전역은 `ENFILE`이라는 `open(2)` man page의 구분이 기준이다.

## 진단 절차 — 실측으로 층을 좁힌다

한 인스턴스에 붙어 아래를 순서대로 읽는다 (Linux 기준).

- `/proc/<pid>/limits` — 그 프로세스에 **실제 적용된** soft, hard. 셸에서 친 `ulimit -n`이 아니라 이 값이 진실이다. Linux 2.6.36부터 모든 사용자가 읽을 수 있다
- `ls /proc/<pid>/fd | wc -l` — 현재 사용 중인 fd 개수
- `lsof -p <pid>` — 종류별 분해. TYPE 열의 `IPv4`, `unix`, `REG`, `a_inode` 비중을 본다
- `ss -s` 와 `ss -tanp` — 소켓 상태 분포. `CLOSE_WAIT`가 몰려 있으면 close 누락, `TIME_WAIT`가 몰려 있으면 능동 종료 측 패턴
- `/proc/sys/fs/file-nr` — 전역 사용량. 세 값은 할당된 file handle 수, 사용하지 않는 file handle 수, 최대치이며 Linux 2.6부터 가운데 값은 항상 0이다
- 추세 확인 — 단발 스냅샷으로 누수를 판정하지 않는다. 같은 지표를 시간축에 놓고 재시작 이후 우상향인지 부하에 비례하는지를 본다

## 한도 조정 — 어디에 걸어야 실제로 먹히는가

- **셸 `ulimit -n`** — 그 셸과 이후 자식 프로세스에만 적용된다. 이미 떠 있는 데몬에는 영향이 없다
- **systemd 서비스** — 유닛 파일의 `LimitNOFILE=`. 값 하나면 soft와 hard 동일, `soft:hard` 콜론 표기로 따로 지정한다. 미지정 유닛은 `systemd-system.conf`의 `DefaultLimitNOFILE=`을 따르고, systemd 문서 기준 hard 기본값은 524288이다
- **PAM 로그인 경로** — `/etc/security/limits.conf`. 로그인 세션에서 출발한 프로세스에만 걸리므로 systemd 서비스에는 적용되지 않는다
- **Docker** — `--ulimit nofile=<soft>[:<hard>]`. hard를 생략하면 soft 값이 양쪽에 쓰이고, 아무것도 주지 않으면 데몬의 기본 ulimit을 상속한다
- **Kubernetes** — Pod spec에 nofile 필드가 없다. OCI runtime spec은 `RLIMIT_NOFILE` 설정을 표현할 수 있지만, 실제 컨테이너 프로세스 한도는 사용하는 CRI runtime과 노드 서비스 설정에 따라 달라진다. 대상 PID의 `/proc/<pid>/limits`로 확인한 뒤 노드 프로비저닝과 런타임 설정을 조정한다
- **hard 상향** — `CAP_SYS_RESOURCE`가 필요하고 `nr_open`을 넘을 수 없다

systemd는 soft를 1024 위로 올릴 때 `select(2)`가 1023을 넘는 fd를 다루지 못한다고 경고한다. `select` 기반 레거시 코드가 섞여 있으면 soft를 크게 잡는 것 자체가 위험할 수 있다.

## 한도 상향은 증상 완화다 — 근본 원인 목록

- **커넥션 누수** — `close()`, `shutdown()` 누락으로 `CLOSE_WAIT`이 쌓인다. 메커니즘은 [[TCP-Handshake#CLOSE_WAIT 누적과 종료 타임아웃|CLOSE_WAIT 누적]] 참고
- **keep-alive Agent 미재사용** — 요청마다 새 클라이언트나 새 Agent를 만들면 소켓이 계속 새로 열린다. 서버리스나 핸들러 안 초기화 패턴에서 흔하다
- **스트림, 파일 핸들 미종료** — 에러 경로에서 `close`가 빠진 케이스. `finally`나 `using` 계열로 보장한다
- **동시성 미제한** — 대량 순회, 팬아웃 호출을 무제한 병렬로 던진다. 상한 산정은 [[Async-Internals-Patterns#제한적 동시성 (Limited Concurrency)|제한적 동시성]] 참고
- **커넥션 풀 합계 미계산** — 인스턴스 수 곱하기 풀 크기가 fd와 DB 한도를 동시에 밀어 올린다
- **부하 테스트 환경의 포트, fd 소진** — 대상이 아니라 부하 생성기가 먼저 터지는 경우. [[performance|성능 테스트]] 참고

## Node.js 관점

- `fs` 계열 작업은 libuv 스레드풀에 위임되지만, fd를 소비하는 주체는 스레드가 아니라 프로세스다. `UV_THREADPOOL_SIZE`를 줄여도 이미 열려 있는 fd 수는 줄지 않는다
- `EMFILE`은 예외로 던져지지 않고 콜백이나 Promise rejection의 `SystemError`로 올라온다. `error.code`는 문자열, `error.errno`는 libuv 에러 코드에 대응하는 음수이며 `util.getSystemErrorName(error.errno)`로 문자열을 얻는다. libuv 에러 코드 표는 [[libuv-Threading#에러 처리|libuv 에러 처리]]가 정본이다
- 디렉토리 대량 순회나 요청 폭주에서는 한도를 올리기 전에 **동시 실행 상한**을 두는 것이 정석이다. 상한이 없으면 한도를 얼마로 올려도 트래픽이 그만큼 더 열어 버린다
- macOS 개발 환경은 기본 한도가 낮아 로컬에서만 `EMFILE`이 재현되는 일이 잦다. 로컬 재현만으로 프로덕션 한도를 추정하지 않는다

## 흔한 실수

- 셸에서 `ulimit -n`을 올림 → 이미 떠 있는 systemd 서비스는 그대로 → `/proc/<pid>/limits`로 실제 적용값을 확인하고 `LimitNOFILE`로 건다
- 전역 `file-max`만 상향 → 프로세스 soft가 그대로라 `EMFILE`이 계속 발생 → 층을 에러 코드로 먼저 구분한다
- 컨테이너 셸에서 본 `ulimit -n`을 서비스 프로세스의 값으로 간주 → 엔트리포인트와 런타임 설정에 따라 다를 수 있다 → 대상 pid의 `limits`를 읽는다
- `lsof` 출력 줄 수를 그대로 fd 수로 계산 → 스레드별 중복과 헤더가 섞인다 → `ls /proc/<pid>/fd | wc -l`을 기준으로 삼는다
- 한도만 1M으로 올리고 종료 → 누수가 있으면 같은 장애가 더 늦게, 더 큰 규모로 재발한다 → 추세가 평평해지는지 확인하고 닫는다

## 면접 체크포인트

- soft, hard, 전역 한도의 역할 구분과 각각을 조정하는 위치
- `EMFILE`과 `ENFILE`이 가리키는 층이 다르고, 그래서 조치 대상이 갈리는 이유
- 한도 상향이 해결인 경우와 증상 완화인 경우를 무엇으로 판별하는가 (추세, 부하 대비 비례성, 소켓 상태 분포)
- 소켓 누수를 fd 관점에서 추적하는 절차 (`/proc/<pid>/fd` 카운트 → `lsof` 종류 분해 → `ss`로 상태 분포)
- 컨테이너와 Kubernetes에서 Pod spec만으로 nofile을 설정할 수 없고, 대상 PID로 런타임 적용값을 확인해야 하는 이유

## 출처

- [Linux man-pages, getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux man-pages, open(2)](https://man7.org/linux/man-pages/man2/open.2.html)
- [Linux man-pages, proc_sys_fs(5)](https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html)
- [Linux man-pages, proc_pid_limits(5)](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html)
- [systemd, systemd.exec(5)](https://manpages.debian.org/unstable/systemd/systemd.exec.5.en.html)
- [Docker Docs, docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
- [Open Container Initiative, Runtime Specification configuration](https://github.com/opencontainers/runtime-spec/blob/main/config.md)
- [Node.js Docs, Errors](https://nodejs.org/docs/latest-v22.x/api/errors.html#common-system-errors)
- [containerd / kubernetes / open file limits — OSSO B.V.](https://www.osso.nl/blog/2026/containerd-kubernetes-open-file-limits/)

## 관련 문서

- [[Storage-and-FileSystem-Files|파일 디스크립터의 커널 자료구조 (fd 테이블, open file description, inode)]]
- [[libuv-Threading|libuv 스레드 풀과 에러 코드 (UV_EMFILE)]]
- [[File-System|Node.js fs 모듈과 FileHandle]]
- [[TCP-Handshake|TCP Handshake (CLOSE_WAIT 누적, TIME_WAIT)]]
- [[Async-Internals-Patterns|비동기 패턴과 제한적 동시성]]
- [[Sync-Async-Blocking|동기, 비동기와 블로킹 (fd readiness)]]
- [[Linux-File-System|Linux 파일 시스템과 디렉토리 구조]]
- [[Container-Memory-Metrics|컨테이너 메모리 지표 (cgroup 실측 진단)]]
- [[performance|성능 테스트 (부하 중 fd, 포트 소진)]]
