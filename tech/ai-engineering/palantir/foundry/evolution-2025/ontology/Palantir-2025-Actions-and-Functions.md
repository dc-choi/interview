---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Actions와 Functions의 실행, 버전과 로그 계약

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 실행의 단위와 부작용

- 1월 Action wizard에서 object-backed link 생성/삭제 규칙을 구성하게 됐다.
- 2월 batched Function-backed Action은 많은 요청을 한 Function 실행으로 묶고 edit conflict를 조정할 수 있게 했다. 한 번의 실행과 각 요청의 검증/결과를 구분한다.
- 2월 Python `async def` Function은 event loop 생성을 runtime이 관리했다. 2월 Ontology Manager의 runtime config는 초기 TypeScript timeout만, 최대 280초로 제한됐다.
- 3월 GTSR Action parameter는 cURL/code로만 설정하고 form component를 제공하지 않았다. schema에 parameter가 보이는 것과 UI 입력 가능 여부가 다르다.
- 5월 serverless Python GA 공지는 기본 migration과 무중단/기능 동등성을 강조했지만 7월 전체 Python Function GA의 개별 matrix와 남은 제약을 별도로 확인해야 한다.
- 7월 Python Function GA는 OSDK 선택 입력, sources/external clients, serverless/deployed, state cache, UDF와 Marketplace를 확대했다. TypeScript 2 GA는 Node fs/child_process/crypto, npm와 source network 경로를 제공했다. 당시 TS2의 5GB/8CPU와 TS1의 128MB/1CPU 비교를 현재 quota로 고정하지 않는다.
- 7월 Python execution configuration의 CPU/memory/GPU, request limit, replicas/environment/timeout은 Function version별로 관리했다. TS2 deployed 실행 확대는 당시 향후 범위였다.

## 버전과 배포를 통제하기

- 3월 semver 추천은 backward compatibility를 검사해 breaking change에 major 증가를 권했다. 이름/API/docs/security 설정과 version publish 설정도 분리됐다.
- 6월 version range는 Workshop/Action/Automate runtime 자동 upgrade와 Python deployment 전환을 지원했다. tag 시 compatibility 검사와 실제 consumer 설정을 같이 확인한다.
- 8월 stable Function tag를 protected branch로 제한하는 옵션이 소개됐다. prerelease 시험을 허용하면서 검토되지 않은 stable 자동 upgrade를 막는 용도다.
- 9월 Python request body memory leak은 Platform SDK `>=1.46`, OSDK generator `>=2.110` 수정으로 발표됐다. 영향을 받는 생성/런타임 library를 함께 올린다.
- 10월 branch의 external-call FoO는 기본 Action 전체 실패, webhook/notification은 기본 skip이었다. 선택적 opt-in이 외부 시스템 rollback을 제공하지 않는다.
- 11월 Function 성공/실패 stack, 7일 history, 7일 rolling P95와 failure monitor가 추가됐다. 12월 Action의 usage compute 구분도 소개됐다.

## 로그와 redaction

6월 Org Control Panel 설정과 Ontology Owner의 Action별 override로 redaction을 조정할 수 있게 됐다. 11월 TS1 console/IO/Ontology loading span, TS2 OTEL custom/outbound span, Action edit calculation/OSv2 Funnel/webhook, LLM prompt/response/token 로그가 확대됐다. 민감한 입력이 로그에 남는 범위와 로그 열람/streaming export 권한은 실행 권한과 따로 관리한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [July 28, 2025, TypeScript v2 functions are now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#8112cf0a-c918-4b65-b79b-2f3e17a6de09)
- [July 28, 2025, Python functions are now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#434e768c-8d51-4ee6-a1ba-1b438c58626b)
- [August 21, 2025, Enforce stable version restrictions in function repositories — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#ebc06068eae8cc15c4d79656a64f798c384c3c9304090fd668c1b9a7b3ec63ab)
- [July 31, 2025, Python and TypeScript v2 Functions with OSDKs are now compatible with Marketplace — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#42f5c6cc-2ed1-4a84-8248-9f5180456121)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
