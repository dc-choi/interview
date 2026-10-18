---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Source 기반 외부 호출과 연결 진단

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Secret와 egress를 source에 모으기

- 2월 Python source Function live preview는 release tag 없이 외부 호출을 시험하게 했다. 2월 14일 serverless Python의 외부 API 호출은 제공 source library만 지원하고 third-party client는 아직 미지원이었다.
- 4월 8일 source-based external transforms/functions GA는 source의 secret와 egress, `@ExternalSystems`, code import와 export 설정을 연결했다. credential rotation을 코드 변경과 분리하고 agent proxy도 재사용했다.
- 4월 Slack/Jira/Asana/Twilio connector에 REST webhook builder가 확대됐다. source의 URL/auth 설정과 외부 transform/function client를 재사용하며 TypeScript webhook 호출도 별도 경로다.
- 4월 Databricks WIF/OIDC 베타는 service principal의 정책을 사용하는 credential-less 구성으로 소개됐다. 정적 secret 제거와 외부 identity 권한 검증은 별개다.
- **5월 30일 source secret가 자동 unescape되도록 바뀌었다.** 기존에 수동 unescape하던 client는 이중 해석이 생기지 않도록 변경해야 하는 호환성 경계다.

## Worker와 agent 운영

- 3월 agent change history 베타는 기본 활성화됐고 configuration 변경, restart 요청과 성공, 수행 사용자를 기록했다. maintenance window와 restart hygiene를 위한 진단 수단이다. 직접 연결이 가능하면 direct connection을 우선하는 당시 가이드도 함께 제시됐다.
- 9월 runtime 용어가 workers로 정리되고 Foundry worker/Agent worker를 구분했다.
- 9월 agent proxy egress GA는 Foundry worker와 agent 사이 연결을 구성했다. agent worker 및 REST-only agent proxy runtime의 sunset/migration 문맥을 구분하고, domain/port와 agent 도달성을 설정한다.
- 11월 Rubix network egress log 베타는 Control Panel의 policy별 관찰을 제공했다. DNS discovery, 모든 proxy log, alerting와 request size/duration은 당시 향후 작업이었다.
- 12월 Source Terminal은 같은 egress 환경에서 DNS/TLS/firewall 문제를 재현하게 했다. 로컬 terminal에서 성공한 요청이 source worker의 경로를 증명하지는 않는다.

## SAP 버전과 원문 품질

3월 SAP add-on 2.33.0/SP33은 housekeeping 성능, remote decompression와 empty schema fix를 알렸다. 장문에 draft/template 지시가 남아 있으므로 placeholder를 runtime 계약으로 읽지 않는다. 10월 2.35/SP35 제목과 장문의 SP32 표기는 상충한다. cockpit v2, HANA HINT CFG05, STXL와 package download 내용은 해당 실제 add-on release의 문서와 대조해야 한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [April 8, 2025, Source-based Python transforms and functions in Code Repositories; transforms also in VS Code Workspaces [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#e4700822-7e9a-4b60-abba-ff7b4678634a)
- [March 11, 2025, Foundry Connector 2.0 for SAP Applications v2.33.0 (SP33) — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#2545522e-30ed-496a-9f54-5c3cc995fea6)
- [September 30, 2025, Agent proxy egress policies are now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#26a0afeb-aa7f-4f1a-81ed-d8daa053ace2)
- [October 21, 2025, Foundry Connector 2.0 for SAP Applications v2.35.0 (SP35) is now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#46a0db42-77f4-4272-b110-23cce8549bcd)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Connectors]]
- [[Palantir-Connection-Operations]]
