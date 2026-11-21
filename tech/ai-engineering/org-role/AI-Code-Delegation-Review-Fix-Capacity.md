---
tags: [ai, code-review, engineering, postgresql, linux]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Review Fix Capacity", "AI 리뷰의 발견량과 수정 용량", "AI 리뷰와 수정 용량"]
---

# AI 리뷰의 발견량과 수정 용량

LLM 보조 리뷰와 퍼징이 결함을 더 빨리 찾을 때 병목이 수정 용량으로 옮겨 가는 문제를 PostgreSQL 19와 Linux 7.2 사례로 다룬다. 리뷰의 목적, 위임 앞뒤의 사고 구간과 도구 사용 표기는 상위 문서 [[AI-Code-Delegation-Review|AI 구현 위임과 코드 리뷰]]에 있다.

## AI 리뷰가 결함을 더 빨리 찾으면 수정 용량이 병목이 된다

LLM 보조 리뷰와 퍼징은 결함을 더 일찍 찾게 하지만 고칠 사람의 시간은 그만큼 늘지 않는다. 수정이 작아도 재현, 수정, 재검토와 병합에 결함마다 고정 비용이 붙으므로, 발견이 늘면 정해진 일정 안에 고칠 수 있는 양이 먼저 바닥난다.

**PostgreSQL 19 (2026-10-09 커미터 회고와 Beta, RC 공지를 2026-10-27 대조):** 베타가 시작된 뒤 주요 기능 약 8~10개가 되돌려졌고 일부는 베타 후반이었다. 되돌림 몇 건은 드물지 않고 주기당 하나 정도는 예상할 수 있다는 점에 비하면 이례적인 규모다. 일부 기능의 개발자나 커미터였던 Peter Eisentraut는 기능마다 다른 요인의 조합으로 보며, 개인 의견임을 밝히고 다음을 든다.

- 코드가 충분히 좋지 않았거나 시간 안에 끝내기 어려운 기능을 여럿 시도했을 수 있다. 일부는 베타 중에 빨리 고치기 어려운 구조적 결함이 있었다.
- 예전이면 이후 5년 동안 조금씩 고쳤을 경계 조건 결함이 LLM 보조 코드 리뷰로 빨리 드러나 40건 남짓한 결함 보고가 쌓였다. 평균 세 줄짜리 수정이어도 건마다 고정 비용이 있어 시간이 모자랐다.
- 되돌린 기능은 대부분 LLM 보조 리뷰가 지금만큼 쓸모 있기 전에 작성되고 커밋됐다. 작성 뒤에 실질적인 품질 기준이 올라간 것이며 바이브 코딩에서 나온 문제는 아니라고 본다.
- 보안 취약점 수정 물량에 시니어 개발자가 몰린 4월부터 8월까지 베타 기간의 추가 검토와 테스트가 줄었다가 8월에 재개돼, 문제가 베타 후반에 몰려 드러났다.
- 도메인, 복합 타입 위의 도메인, 삭제 뒤 다시 추가한 열, 열 순서를 바꿔 다시 붙인 파티션, 트리거에서 부른 SECURITY DEFINER 함수 안의 뷰가 겹치는 조합은 사람이 열거해 시험할 수 없지만 LLM 보조 퍼징은 빨리 찾는다. 이를 기능 개발에 포함하고, 문맥 조합마다 상호작용이 늘지 않도록 내부 인터페이스를 견고하게 만들자고 제안한다. 기능을 실험 상태로 커밋해 본 트리에서 성숙시키는 방식은 풀지 못한 과제로 남긴다.
- 두 달쯤 더 있었다면 이런 결함도 고칠 수 있었겠지만, 커뮤니티는 수정을 더 넣으려고 출시를 미루기보다 일정을 지키려 했다고 본다.

출시일은 그래도 예고보다 늦어졌다. 2026-06-04 Beta 1 공지는 정식 출시를 9~10월 무렵으로, 2026-09-24 Beta 4 공지는 RC를 10월 초로 잡고 GA도 10월일 수 있다고 예고했다. RC 1은 2026-10-15에 나왔고, 그 공지는 11월 12일 정기 업데이트에 들어갈 많은 수정을 19에도 넣으려고 같은 날 RC 2를 내며 문제가 없으면 11월 19일 정식 출시한다고 밝혔다. 기능을 되돌린 선택은 수정 시간을 벌려는 더 긴 연기를 피한 것이지 처음 일정을 그대로 지켰다는 뜻은 아니다(해석).

**PostgreSQL 19 (Robert Haas 글, 2026-10-30 블로그 재게시본을 2026-11-08 대조):** 다른 커미터인 Robert Haas는 지연의 원인을 LLM으로 버그를 찾기가 훨씬 쉬워진 데서 찾는다. 고치기도 쉬워졌지만 같은 정도는 아니고, LLM이 수정 초안을 만들어도 늘 맞거나 프로젝트 기준에 맞지는 않으며 결국 사람이 검토하고 커밋해야 한다고 적는다. 그가 센 수치는 기능 동결일(4월 8일)부터 9월 25일까지다.

- 릴리스 branch 커밋: 2025년 `REL_18_STABLE` 724건에서 2026년 `REL_19_STABLE` 1,169건으로 60% 넘게 늘었다.
- master 커밋: 1,037건에서 1,443건으로 늘었지만 master에만 들어간 커밋은 조금 줄었다.
- 이전 릴리스 하나 이상으로 백패치한 커밋: 248건(`REL_17_STABLE`)에서 433건(`REL_18_STABLE`)으로 74% 넘게 늘었다.

그는 커미터의 실수가 늘었을 가능성을 배제하지 않지만 주된 원인으로 보지 않는다. 릴리스에 들어갈 기능을 검토할 시간이 보안 문제 대응으로 빠졌다는 설명은 Eisentraut의 네 번째 항목과 겹친다. 8월 27일부터 9월 15일 사이에 되돌린 기능으로 UPDATE/DELETE FOR PORTION OF, SQL/PGQ, ALTER TABLE의 MERGE PARTITION과 SPLIT PARTITION을 든다. 반영된 커밋을 센 수치라 고치지 못한 보고의 규모는 여기에 없고, 이 증가를 버그를 찾기 쉬워진 결과로 읽는 것은 그의 해석이다. 앞으로 PostgreSQL에서 쓰는 모든 기능이 AI의 검토를 받으므로 PostgreSQL 개발자 모두, 어느 정도는 모든 소프트웨어 개발자가 수준을 높여야 한다는 전망도 그의 의견이다.

**Linux 7.2 (LWN 2026-08-17 개발 통계):** 이전 커밋의 버그를 고친다고 표시하는 `Fixes` 태그가 붙은 커밋이 4,830건이다. 여러 릴리스 동안 거의 평탄하던 Fixes 커밋이 최근 릴리스에서 크게 늘었고, LWN은 기존 소프트웨어의 버그 찾기에 LLM을 쓰는 사람이 많아진 영향으로 해석한다. 리뷰 시스템 Sashiko를 Reported-by로 밝힌 패치는 252건, 변경 설명에서 Sashiko를 언급한 커밋은 568건이다. 모두 반영된 커밋을 센 수치라 발견과 수정량이 늘었다는 신호이며, 고치지 못한 보고나 대기열의 크기는 이 통계에 없다. 발견이 수정 용량을 넘었는지는 미처리 보고 같은 별도 지표로 확인한다.

적용할 때는 다음을 나눈다(운영 제안).

- AI 리뷰를 들이기 전에 발견을 처리할 용량, 곧 분류, 재현, 수정과 재검토를 함께 잡는다. 발견 수만 늘면 대기열이 길어진다.
- 이번 변경이 만든 결함과 원래 있던 결함을 나눠 센다. AI 리뷰 지적에 Pre-existing 같은 분류를 붙여 변경이 만들지 않은 결함을 작성자 책임과 구분하고, 기존 코드의 오래된 결함은 리뷰 에이전트의 야간 검토처럼 별도 흐름에서 찾는다([[Code-Review-AI-Agent-Operations#지적 처리와 도입 점검|지적 처리와 도입 점검]]).
- 품질이 나빠진 것인지 판정 기준이 올라간 것인지 구분한다. 새 검사 도구가 쓰이기 전에 작성된 코드에서 드러난 결함은 새 변경의 회귀와 다른 선택지(되돌림, 다음 주기로 이월, 실험 기능 표시)를 가진다.
- 조합이 폭발하는 기능은 퍼징과 [[Property-Based-Testing|속성 기반 테스트]]를 개발 단계에 넣는다.

## 출처

- [Development statistics for the 7.2 kernel — LWN.net, Jonathan Corbet](https://lwn.net/Articles/1088776/) — 2026-08-17, Assisted-by, Fixes와 Sashiko 수치를 2026-10-27 대조
- [The reverts will continue until morale improves — Peter Eisentraut](https://peter.eisentraut.org/blog/2026/10/09/the-reverts-will-continue-until-morale-improves) — 2026-10-09 개인 회고, 2026-10-27 원문 대조
- [Postgres 19 is late, and it's AI's fault — Robert Haas](https://rhaas.blogspot.com/2026/10/postgres-19-is-late-and-its-ais-fault.html) — 2026-10-30 블로그 게시(neon.com 2026-10-21 원게시), 커밋 수치, 되돌린 기능과 원인 해석을 2026-11-08 원문 대조
- [PostgreSQL 19 RC 1 Released! — PostgreSQL](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/) — 2026-10-15, RC 2와 정식 출시 예정일 대조
- [PostgreSQL 19 Beta 1 Released! — PostgreSQL](https://www.postgresql.org/about/news/postgresql-19-beta-1-released-3313/) — 2026-06-04, 정식 출시 예고(9~10월 무렵)를 2026-10-27 대조
- [PostgreSQL 19 Beta 4 Released! — PostgreSQL](https://www.postgresql.org/about/news/postgresql-19-beta-4-released-3386/) — 2026-09-24, RC와 GA 예고(10월)와 되돌린 기능 목록을 2026-10-27 대조
- [Postgres 19 delayed after AI reviewers find more bugs than humans can fix — The Register, Lindsay Clark](https://www.theregister.com/databases/2026/10/16/postgres-19-delayed-after-ai-reviewers-find-more-bugs-than-humans-can-fix/5303471) — 2026-10-16 보도, 아래 GeekNews 연기 요약의 원문. 일정은 위 공식 공지로 대조
- 사용자 제공 GeekNews 알림 요약(2026-10-16~27): [Postgres 19 출시 지연](https://news.hada.io/topic?id=35488), Linux 7.2 통계. 위 원문으로 대조했다

## 관련 문서

- [[AI-Code-Delegation-Review|AI 구현 위임과 코드 리뷰]] — 리뷰의 목적, 위임 앞뒤의 사고 구간, 도구 사용 표기와 제출 품질
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]] — 지적 처리와 도입 점검, 기존 결함의 별도 검토 흐름
- [[Property-Based-Testing|속성 기반 테스트]] — 조합이 폭발하는 기능을 개발 단계에서 검사하는 방법
- [[Agentic-Verification|에이전트 기반 검증]] — 사람이 열거할 수 없는 조합의 결함과 발견, 수정 용량의 계획
- [[AI-Work-Output-and-Employment|AI 코드 생산과 제품 성과 및 고용]] — 산출 증가 뒤 병목이 옮겨 가는 단계
