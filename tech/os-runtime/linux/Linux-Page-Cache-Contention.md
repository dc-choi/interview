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

## 후속 검증

- 패치의 정확한 commit과 cover letter를 확보한다.
- thread 수, 읽기 크기와 CPU별 결과를 확인한다.
- 수명 보호 규칙과 truncate, splice, reclaim의 상호작용을 검토한다.
- CPU cycle과 처리량 외에 메모리 회수 지연 및 쓰기 경로 퇴행을 측정한다.

## 출처

- [Linux Kernel Documentation, Page Cache](https://www.kernel.org/doc/html/latest/mm/page_cache.html)
- [개발 브랜치 로그 — kernel.org, Linus Torvalds](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/log/?h=noref-filemap-read-with-llm) — 2026-10-16 접근 실패, 패치 본문 미대조
- GeekNews, 2026-10-13 제공 발췌: Linus Torvalds, Claude Code로 Linux 커널의 대폭 개선 작업 진행 중

## 관련 문서

- [[Linux-File-System|Linux 파일시스템]]
- [[Storage-and-FileSystem-Performance|스토리지와 파일시스템 성능]]
- [[Context-Switching|동시성과 CPU 스케줄링]]
