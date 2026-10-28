---
tags: [linux, page-cache, folio, contention, rcu]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux Page Cache Contention", "페이지 캐시 참조 카운팅 경합"]
---

# Linux 페이지 캐시와 참조 카운팅 경합

페이지 캐시는 파일 내용을 메모리에 보관해 반복 읽기의 물리 I/O를 줄인다. 캐시에 적중해도 여러 CPU가 같은 메타데이터를 수정하면 처리량이 제한될 수 있다.

## 공유 카운터가 만드는 비용

여러 스레드가 같은 파일의 작은 구간을 읽는 상황에서는 실제 복사량보다 캐시 데이터의 수명을 보호하는 참조 획득과 해제 비용이 커질 수 있다. 원자적 연산도 공유 캐시 라인의 소유권을 이동시키므로, 디스크 접근이 없다는 사실만으로 읽기 경로의 확장성을 보장하지 않는다.

참조 증가를 생략하려면 메모리를 언제 해제하고 재사용할 수 있는지 다른 방법으로 보장해야 한다. RCU 같은 수명 보호 설계에서는 읽는 도중의 해제뿐 아니라 truncate, 페이지 제거와 다른 소유자로의 이동을 함께 검토한다.

## 변경 사례와 확인 수준

2026-10-13 GeekNews 입력은 Linus Torvalds가 Claude Code의 도움을 받아 folio 참조 없이 페이지 캐시를 읽는 커널 패치를 만들고 자신의 장비에서 측정했다고 소개한다. 코드, 테스트, 검토와 소개문 초안 작성에 도구를 사용했다는 맥락도 보존한다.

2026-10-16 공식 커널 문서의 페이지 캐시 개념은 확인했다. 개발 브랜치 `noref-filemap-read-with-llm`의 공식 저장소 페이지는 접근 실패로 패치와 측정 원문을 대조하지 못했다. 도구 사용 범위, 개선 수치와 메인라인 반영은 이번 확인에서 검증 완료로 표시하지 않는다.

2026-10-27 GitHub의 torvalds/linux에서 커밋 `65401f4102b9`(제목 `mm/filemap: read from the page cache without folio references`)를 확인했다. author date는 2026-10-12이고, GitHub 미러의 `rcu-free-v3` 브랜치의 조상이다. 커밋 메시지 끝에 `Assisted-by: LLM`이 붙어 있다. 도구 이름은 적혀 있지 않아 GeekNews가 말한 Claude Code와 같은 도구인지는 이 표기로 확인되지 않는다.

커밋 메시지는 Threadripper 3970X(32코어, 64스레드, 소켓 1개)에서 잰 값을 싣는다. 부하는 btrfs의 한 페이지짜리 파일을 스레드마다 자기 파일 디스크립터로 열어 오프셋 0에서 16바이트씩 `pread()`하는 것이고, 조건마다 5초 실행을 세 번 했다. 변경 전은 7.3-rc6, 변경 후는 그 위에 시리즈 전체를 얹은 커널이며, 두 커널을 같은 장비에서 같은 `.config`로 부팅했다. 다만 변경 후 커널은 이 커밋보다 이른 형태(루프 안에서 folio를 바로 검사)다. 작성자는 이 커밋의 형태가 그 이른 형태보다 8 CPU 게스트에서 읽기가 fast path에 남을 때 약 2% 빠르고, 읽을 때마다 fault가 나서 slow path로 가면 1-2% 느리다고 적는다. 아래 표는 커널 안에서 센 읽기당 사이클과 명령어이며 각 칸은 변경 전 → 변경 후다.

| 구성 | 초당 읽기 | 읽기당 사이클 | 읽기당 명령어 |
|---|---|---|---|
| 1 스레드 | 7.4-7.6M → 7.7-7.8M | 503-505 → 479-492 | 1056 → 969-970 |
| 8 스레드, 8 코어 | 16.7M → 60.5M | 1973-1981 → 477 | 1060 → 959 |
| 32 스레드, 32 코어 | 13.4-13.7M → 236-237M | 9805-9950 → 478 | 1078-1079 → 959 |
| 64 스레드 | 13.3M → 304M | 19857-19939 → 735-736 | 1094-1101 → 959 |

비용도 같은 메시지에 적혀 있다. present 상태가 아닌 사용자 페이지로 읽으면 page fault를 끈 채 시도해 실패하고 slow path에서 다시 fault를 받으므로 `read()`마다 예외가 한 번 늘어난다. 이런 16바이트 읽기는 변경 전 4397-4428 사이클이 6022-6296 사이클로 늘었다. `PG_rcu_free` 플래그가 없는 folio는 이제 slow path 전에 조회와 플래그 검사를 먼저 거치는데, 표의 모든 행이 플래그가 있는 folio를 읽으므로 이 비용을 잰 행은 없다.

이 수치는 작성자가 커밋 메시지에 보고한 값이며 이 문서에서 재현하지 않았다. 메인라인 반영 여부와 cover letter는 확인하지 못했다(2026-10-27 기준 이 커밋은 GitHub 미러 master의 조상이 아니다. 다른 커밋으로 반영됐는지는 보지 않았다).

## 후속 검증

- 패치의 정확한 commit과 cover letter를 확보한다. commit(`65401f4102b9`)은 2026-10-27에 확인했고, cover letter와 메인라인 반영 여부는 남았다.
- thread 수, 읽기 크기와 CPU별 결과를 확인한다. 커밋 메시지의 결과는 Threadripper 3970X 한 기종의 값이다.
- 수명 보호 규칙과 truncate, splice, reclaim의 상호작용을 검토한다.
- CPU cycle과 처리량 외에 메모리 회수 지연 및 쓰기 경로 퇴행을 측정한다.

## 출처

- [Linux Kernel Documentation, Page Cache](https://www.kernel.org/doc/html/latest/mm/page_cache.html)
- [개발 브랜치 로그 — kernel.org, Linus Torvalds](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/log/?h=noref-filemap-read-with-llm) — 2026-10-16 접근 실패, 패치 본문 미대조
- [mm/filemap: read from the page cache without folio references — GitHub torvalds/linux, Linus Torvalds](https://github.com/torvalds/linux/commit/65401f4102b974df3907267e9cac2e991a0a6680) — 2026-10-27 커밋 메시지의 측정 조건, 비용과 trailer 확인. cover letter와 메인라인 반영은 미대조
- GeekNews, 2026-10-13 제공 발췌: Linus Torvalds, Claude Code로 Linux 커널의 대폭 개선 작업 진행 중

## 관련 문서

- [[Linux-File-System|Linux 파일시스템]]
- [[Storage-and-FileSystem-Performance|스토리지와 파일시스템 성능]]
- [[Context-Switching|동시성과 CPU 스케줄링]]
