---
tags: [database, postgresql, sqlite, serverless, branching, agent, provisioning]
status: done
verified_at: 2026-11-25
category: "데이터&저장소(Data&Storage)"
aliases: ["Agent Database Provisioning", "에이전트가 만드는 데이터베이스", "Database per Agent", "에이전트별 데이터베이스", "서버리스 Postgres와 에이전트"]
---

# 에이전트가 만드는 데이터베이스: 짧은 수명, 브랜치와 운영 데이터의 경계

AI 코딩 에이전트와 앱 생성 도구는 작업마다 데이터베이스를 새로 만들고 잠깐 쓴 뒤 버리거나 방치한다. 사람이 프로젝트 초기에 DB를 하나 만들어 오래 쓰던 방식과 달리 생성 속도, 쉬는 동안의 비용, 작업 사이 격리와 버려진 DB의 정리가 설계 조건이 된다. 사람이 만드는 DB의 자동화는 [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]]에서 다룬다.

## 사용 방식이 바뀌었다는 근거

- **Neon:** Databricks는 2025-05-14 Neon 인수 발표에서 Neon이 정식 출시 무렵 DB의 30%를 사람이 아닌 AI 에이전트가 만들었고, 최근 다시 보니 그 비율이 80%를 넘었으며 에이전트가 사람보다 4배 많은 DB를 만들고 있었다고 밝혔다. 이유로는 기계 속도로 움직이는 에이전트에 매우 빠른 프로비저닝이 필요하다는 점, 저장과 연산을 분리한 서버리스 구조가 아주 싼 Postgres 인스턴스를 가능하게 한다는 점, 비결정적인 에이전트의 결과를 확인하려면 브랜치가 필요하다는 점을 든다.
- **Supabase:** Supabase는 2026-10-02 Turso 인수 발표에서 이미 주당 100만 개가 넘는 DB를 띄우고 있으며, 에이전트가 프로토타입, 탐색, 대시보드와 앱을 만들면서 수백만 개의 DB를 띄운다고 설명했다. 에이전트마다 필요할 때 DB를 하나씩 프로비저닝하는 구조를 위해 SQLite 기반 Turso를 인수하며, SQLite가 작은 요청형 작업에 잘 맞는다고 본다. 같은 시기 자금 조달 보도는 매달 400만 개의 DB가 새로 생기고 그중 70%를 에이전트나 AI 도구가 만든다는 회사 주장을 전했다. 두 수치는 이 보도와 인수 대상인 Turso 블로그의 재인용으로만 확인했고 Supabase 발표문에는 없다.

모두 각 회사의 자체 발표다. 생성한 DB 수는 실제 사용량이나 수명을 말해 주지 않으므로 비용과 용량 계획에는 활성 시간, 저장량과 수명 분포를 따로 잰다(이 문서의 판단).

## 에이전트용 DB가 갖출 조건

| 조건 | 이유 | 서버리스 Postgres의 구현 예(Neon 문서, 2026-11-25 확인) |
|---|---|---|
| 빠른 생성 | 작업을 시작할 때마다 만든다 | 저장과 연산을 분리한 구조(Databricks 설명)이며 브랜치는 즉시 만든다고 문서가 설명한다 |
| 쉬는 동안의 비용 | 짧게 몰아 쓰고 오래 쉰다 | 5분 동안 활동이 없으면 연산을 0으로 줄이고 다음 쿼리에서 수백 ms 안에 다시 켠다. Free 플랜은 이 설정을 바꿀 수 없고 16 CU보다 큰 연산은 대상에서 빠진다 |
| 버리기 쉬운 사본 | 변경을 시험하고 버린다 | 브랜치는 현재나 과거 상태에서 만든 copy-on-write 복제이며, 만들어도 부모 브랜치의 부하에 영향이 없다고 설명한다 |
| 정리 | 버려진 DB와 브랜치가 쌓인다 | 브랜치에 TTL을 걸어 자동 삭제할 수 있고, 문서는 이를 임시 개발과 시험, AI 기반 개발 흐름에 권한다 |

SQLite 계열은 다른 답을 낸다. Supabase는 작은 요청형 작업에는 SQLite가 맞는다고 보고, Turso는 데이터베이스 하나를 파일 하나로 다룬다고 설명한다. 다만 Postgres의 확장, 권한 모델과 SQL 방언에 의존하는 앱이라면 SQLite DB를 에이전트마다 나눠 주는 방식이 맞지 않으므로 엔진은 앱의 운영 DB와 같은 쪽에서 고르는 것을 기본으로 둔다(이 문서의 판단, [[Distributed-SQLite|분산 SQLite]]).

## 운영 데이터를 브랜치로 가져올 때

Neon 문서는 브랜치가 기본적으로 부모 브랜치의 모든 데이터를 그대로 담는다고 적고, 데이터 없이 스키마만 가져오는 schema-only 브랜치도 지원한다. 같은 문서는 스키마 변경, 새 쿼리와 파괴적일 수 있는 쿼리를 운영 반영 전에 브랜치에서 시험하는 용도를 권한다. 운영 DB에서 만든 브랜치를 에이전트에게 주면 개인정보와 업무 데이터가 그대로 에이전트의 작업 공간과 로그로 들어갈 수 있다. 빠른 생성과 사용량 과금이 이 문제까지 풀어 주지는 않는다.

다음은 이 문서의 제안이다.

- 에이전트 작업의 기본값은 schema-only 브랜치나 합성 데이터로 둔다. 운영과 같은 데이터 분포가 꼭 필요하면 마스킹하거나 익명화한 사본을 만드는 단계를 브랜치 생성 앞에 둔다.
- 브랜치의 접속 계정은 작업에 필요한 권한만 갖게 하고, 운영 브랜치의 자격 증명은 에이전트 환경에 두지 않는다. 새 preview DB에 운영 데이터를 복사하지 않는 플랫폼 기본값의 예는 [[Prisma-Preview-Deployments#브랜치와 데이터의 수명주기|Prisma 프리뷰 배포]]에 있다.
- 브랜치를 언제 누가 만들었고 어떤 데이터를 담았는지 기록하고, TTL로 수명을 끝낸다.
- 운영 DB에 반영할 스키마 변경은 브랜치에서 시험했더라도 [[Schema-Versioning|스키마 버전 관리]]의 마이그레이션 이력으로 다시 적용한다.

## 원문 확인 범위

이 문서의 계기가 된 글(에이전트 시대의 Postgres 데이터베이스)의 원문은 찾지 못했다. 그 글을 요약한 GeekNews 알림의 사실 주장 가운데 Databricks의 80%는 Databricks 원문으로, Supabase의 규모는 Supabase 원문(주당 100만 개 이상)으로 대조했고, 월 400만 개와 약 70%는 보도와 Turso 블로그의 재인용으로만 확인했다. 개발 과정에서 운영 데이터를 다루는 문제가 남는다는 요지는 위 Neon 문서의 브랜치 동작으로 다시 설명했다.

## 출처

- [Databricks + Neon — Databricks](https://www.databricks.com/blog/databricks-neon) — 2025-05-14 게시. 에이전트 생성 비율 30%에서 80% 이상, 사람 대비 4배와 그 이유
- [Supabase is acquiring Turso — Supabase, Paul Copplestone](https://supabase.com/blog/supabase-is-acquiring-turso) — 2026-10-02 게시. 주당 100만 개 이상의 DB, 에이전트별 DB와 SQLite를 고른 이유
- [Supabase secures $150m in funding, acquires Turso — Verdict, BV Swagath](https://www.verdict.co.uk/supabase-150m-funding-turso-acquisition/) — 2026-10-05 보도. 월 100만 명 넘는 사용자와 400만 개 DB, 신규 DB의 70%를 에이전트나 AI 도구가 만든다는 회사 주장을 전한다
- [A database per agent: how Turso and Neon give different answers — Turso, Jeff Olson](https://turso.tech/blog/a-database-per-agent-how-turso-and-neon-give-different-answers) — 2026-11-12 게시. 파일 하나인 DB와 프로젝트 단위 구조의 비교
- [Neon, Branching](https://neon.com/docs/introduction/branching) — copy-on-write 복제, 부모 데이터 포함 기본값, schema-only 브랜치, TTL
- [Neon, Scale to zero](https://neon.com/docs/introduction/scale-to-zero) — 5분 비활성 뒤 축소, 재활성 시간과 플랜 조건
- 사용자 제공 GeekNews 알림(2026-11-23): 에이전트 시대의 Postgres 데이터베이스. 학습 계기이며 게시물 번호와 원문은 확인하지 못했다

## 관련 문서

- [[DB-Provisioning-Pipeline|DB 프로비저닝 자동화 파이프라인]]
- [[Database-Operations-Automation|DB 운영 자동화]]
- [[Prisma-Preview-Deployments|Prisma 프리뷰 배포와 운영 환경의 경계]]
- [[Fullstack-BaaS-Boundaries|풀스택 프레임워크와 BaaS의 경계]]
- [[Distributed-SQLite|분산 SQLite]]
- [[Schema-Versioning|스키마 버전 관리]]
