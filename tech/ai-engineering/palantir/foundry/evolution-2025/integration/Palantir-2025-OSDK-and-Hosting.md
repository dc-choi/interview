---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 OSDK 버전, template와 website 배포의 호환성

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## SDK 생성과 접근 범위

- 1월 React OSDK PR preview 베타는 플랫폼 repo와 Developer Console website hosting이 필요했다. checks 완료 후 PR/commit preview를 열며 PR 생성 후 7일이 지나면 만료됐다. Owner/Editor는 수정/PR을, hosted website Viewer는 code edit 없이 preview 보기를 할 수 있었다.
- 1월 Developer Tier hosting은 자동 DNS/TLS provisioning, CSP/rollback와 usage를 제공했다. Enterprise와 Developer Tier의 subdomain 패턴을 다르게 설명했다.
- 2월 OSDK Template 실험 기능은 hostname/client ID/package/application/repo RID를 handlebars로 치환했다. package name은 `@`와 `/sdk`를 제외하고 package version은 latest/0.1.0을 사용했다. template 치환 후 CI 실패는 예상된 중간 상태였다.
- Ontology resource를 함께 복제하면 다른 API name의 duplicate가 생겨 코드가 깨질 수 있어 shared resource 입력을 권했다. Marketplace Bootstrap은 새 repo와 linked Developer Console app을 만들었다.
- 4월 OSDK Marketplace는 scope/OAuth grant/redirect/assets/CSP와 domain/client ID/Foundry URL 치환을 확대했다. 새 create-app `>=2.1.3` 또는 기존 앱 migration이 필요했고 hosting domain 설치 승인을 따로 받았다.
- source/target API name이 달라지면 code가 깨질 수 있었다. Ontology 자동 remapping은 당시 향후 기능으로 설명됐다.
- 6월 Developer Console의 Platform SDK Resource 접근은 새 API namespace/operation scope를 명시하게 했다. 의존 endpoint를 암묵 허용하지 않으며 allowed operation 변경은 SDK를 재생성하지 않아도 모든 version에 영향을 줬다. legacy app은 migration 경로가 달랐다.

## Python OSDK 2와 package 소비

7월 Python OSDK 2 GA는 새 generator 기본값이며 legacy migration은 선택적이었다. 발표의 최소 1년 legacy 지원은 당시 시작한 약속이며 영구/현재 지원 보장이 아니다. derived/media 등 새 기능의 2.x 한정 범위를 확인한다. 7월 Python/TS2 Marketplace는 SDK와 Ontology input의 설치 remapping을 확대했다.

9월 SDK request body memory leak 수정은 Platform SDK `>=1.46`, generator `>=2.110`을 요구했다. 12월 interface의 page/all/order/filter/cast 예제는 OSDK 2 기능 범위에 속한다. 생성 package, client/runtime와 실제 API permission을 각각 확인한다.

## 운영 판단

Template의 build 성공, SDK 생성 성공, OAuth login와 실제 endpoint 호출 성공은 별도다. hosting Viewer, Developer Console role와 Ontology/data permission을 분리하고 preview의 만료와 branch 데이터를 시험한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [February 20, 2025, Media is now supported in TypeScript OSDK and Platform APIs [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#d488cda2-feb4-4894-adc8-a732a6d1229f)
- [April 29, 2025, Deploy OSDK Applications with Marketplace — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#3b1cd338-4997-496c-bdc4-66365021bfea)
- [February 6, 2025, Bootstrap development with TypeScript OSDK Templates [Experimental] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#e63f47e6-7385-4d0e-bcad-dcdb7da06314)
- [October 23, 2025, Vibe coding with Ontology SDK using Palantir MCP — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#ae03152a-cf64-4733-b38f-f6e6d4839c87)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-OSDK]]
