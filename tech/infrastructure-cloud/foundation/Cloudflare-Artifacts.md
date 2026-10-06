---
tags: [cloudflare, git, storage, agents, workers]
status: done
verified_at: 2026-10-06
category: "Infrastructure - 클라우드 기초"
aliases: ["Cloudflare Artifacts", "Git 호환 버전 저장소"]
---

# Cloudflare Artifacts

Cloudflare Artifacts는 파일 트리, 코드와 프로젝트를 Git 호환 인터페이스로 저장하고 버전 관리하는 서비스다. Workers binding, REST API와 일반 Git 클라이언트로 접근한다. 2026-10-06 공식 문서 기준 open beta이며 Workers Paid 플랜에서 제공한다.

## 저장 단위와 접근 범위

namespace는 저장소를 묶는 컨테이너다. 프로젝트, 사용자나 작업별 저장소를 만들고 같은 기준 저장소에서 fork해 결과를 비교하거나 병합할 수 있다.

| 수단 | 맡는 역할 |
|---|---|
| Workers binding | 저장소 생성과 fork, 파일과 commit 조회, 저장소 범위 Git 토큰 발급 |
| Git 클라이언트 | clone, fetch, pull, push 같은 Git 작업 |
| 이벤트 구독 | 저장소 생성, fork, push 등 변화에 후속 자동화 연결 |
| Workers Builds 연결 | production branch의 push를 배포로, 다른 branch의 push를 Preview로 연결 |

저장소별 단기 토큰으로 필요한 read 또는 write 권한만 전달한다. 애플리케이션은 호출자가 해당 저장소를 사용할 권한이 있는지 먼저 확인해야 한다. 저장소를 나누는 것만으로 애플리케이션의 사용자 인가가 구현되지는 않는다.

## 에이전트 작업에 적용하는 예

다음은 기능을 조합한 설계 예이며 자동으로 제공되는 승인 정책이 아니다.

1. 공통 기준에서 작업용 저장소를 fork한다.
2. 필요한 저장소에만 접근하는 토큰을 작업자에게 전달한다.
3. push 이벤트로 변경 검토와 테스트를 시작한다.
4. 결과를 확인한 뒤 병합이나 배포 여부를 정한다.

파일 이력은 실행 중 프로세스나 외부 데이터베이스까지 복원하는 스냅샷이 아니다. 또한 Workers Builds를 연결했다면 production branch에 대한 push 권한을 배포 권한과 함께 검토해야 한다.

## 비용과 용량 경계

2026-10-06 공식 가격표는 저장소 작업 횟수와 저장량(`GB-mo`)을 과금 축으로 둔다. 저장소는 명시적으로 삭제할 때까지 남으므로 작업별 저장소를 만드는 서비스에는 보존과 정리 정책이 필요하다.

같은 날 Limits 문서의 상한은 저장소당 1 GB, 개별 파일 또는 blob당 32 MB다. 큰 바이너리나 데이터셋을 담는 용도로 선택하기 전에 이 경계를 확인한다.

과금 시작일은 공식 가격표에 2026-10-14, 출시 블로그에 2026-10-15로 달리 적혀 있다. 이 문서에서는 시작일을 확정하지 않는다. 비용 계획에는 최신 가격표와 계정 안내의 재확인이 필요하다.

## 선택 질문

- 작업별 파일 이력과 fork가 필요한가, 기존 Git 호스팅이나 객체 저장소로 충분한가?
- 저장소별 접근 권한과 수명주기를 애플리케이션이 관리할 수 있는가?
- 빌드 연결이 검토 전 변경을 배포하지 않도록 권한과 branch 경계를 정했는가?

내용은 공식 문서 대조에 한정하며 실제 저장소 생성과 배포를 검증한 기록은 아니다.

## 출처

- [Cloudflare, Artifacts](https://developers.cloudflare.com/artifacts/)
- [Cloudflare, Artifacts Workers binding](https://developers.cloudflare.com/artifacts/api/workers-binding/)
- [Cloudflare, Best practices for Artifacts](https://developers.cloudflare.com/artifacts/concepts/best-practices/)
- [Cloudflare, Artifacts Pricing](https://developers.cloudflare.com/artifacts/platform/pricing/)
- [Cloudflare, Artifacts Limits](https://developers.cloudflare.com/artifacts/platform/limits/)
- [We want you to build the next Git platform on Cloudflare — Cloudflare Blog](https://blog.cloudflare.com/next-git-platform-on-cloudflare/)

## 관련 문서

- [[Cloudflare-CF-CLI|Cloudflare API 운영 CLI]]
- [[Cloudflare-vs-Vercel-Hosting|Cloudflare와 Vercel 호스팅 선택]]
- [[git|Git 실무 학습]]
