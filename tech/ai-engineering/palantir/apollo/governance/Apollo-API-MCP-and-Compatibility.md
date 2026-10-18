---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo API, MCP와 호환성 확인

## schema를 조회해 사용 가능한 인터페이스를 찾는다

Hub의 GraphQL API Explorer는 해당 Hub가 노출하는 query/mutation/type을 탐색한다. current user, environment pagination 등의 조회는 필요한 필드만 요청한다. 문서의 예시 operation이 모든 Hub와 역할에서 가능하다는 보장은 없으며 실제 schema와 permission을 함께 본다.

Apollo MCP는 CLI 기능을 AI tool로 노출한다. endpoint는 `https://<hub>/apollo-mcp/mcp`, 문서 transport는 HTTP/SSE이며 Authorization Bearer token을 전달한다. 약97개라는 도구 수는 문서 시점의 기대치이지 고정 계약이 아니다. schema search로 operation/type/field/enum을 찾고 apollo_docs_search/read로 근거를 읽은 뒤 실제 도구 목록과 단순 조회로 연결을 확인한다. 읽기 전용 서버에는 mutation이 없을 수 있다.

## 지원 단계와 변경 기록

Standard Support는 별도 표시가 없는 기능의 기본 정책으로, Deprecated는 공지 후 최소6개월을 두고 제거할 수 있다. Experimental은 교체 수단 없이 바뀌거나 없어질 수 있으며 오래 experimental이었다는 이유로 안정성을 추정하지 않는다. 정책 자체의 breaking change는 문서상 최소6개월 공지 대상이다.

What's New 전체(2022-05~2026-10)를 현재 guide와 대조하면 기능의 출시, 개명, 폐기와 보안 동작 변화가 따로 나타난다. 과거 화면 개선/bug fix를 현재 API 계약이나 실행 검증으로 쓰지 않는다. 다음 차이는 실행 전 확인할 가치가 있다.

| 변경 기록의 시점 | 현재 가이드와 대조할 계약 |
|---|---|
| 2026-10-14, CLI0.895.0 | pending CR의 details/metadata/title/description 갱신. 생략은 유지, JSON object는 전체 교체, 최소 하나 필수. read-only MCP는 update tool 없음. |
| 2026-09-25, CLI0.883.0 | 직접 terminal 명령 제거, session create와 terminal-profile 사용. |
| 2026-09-17, CLI0.871.0 | CLI Helm pull은 OCI scheme만 허용. 오래된 HTTPS 예시와 분리. |
| 2026-09-10 | CR label/comment 추가, Module installation rebase. 현 reference와 인자 모양은 설치된 help 대조. |
| 2026-09-01 | SSO callback port0은 임시 port, 고정값은 SSH forwarding 등에서 사용. |
| 2026-07 | values/schema TGZ 처리 도입, space filter/SSO terminal 수정. 구형 binary에는 같은 동작을 가정하지 않음. |
| 2026-06 | Export/Import 공개, local submodule batch/lock과 scan-before-install 제약. |
| 2026-05-21 | Module은 채널을 따라 update하며 recall이 기존 설치 자동 downgrade를 뜻하지 않음. |
| 2026-04-30, CLI0.752.0 | 2025 폐기 예정 명령 제거. add-unmanaged-service 등 구형 가이드의 명령을 현재 대안으로 쓰지 않음. |
| 2026-04-02 | suppression Planned fix category 추가. |
| 2026-02-19 | promotion append 예제의 stage wrapper, ISO duration과 onlyPossibleLabelValues 수정. |
| 2025-12 / 2025-10 | Team CRUD는 CR 대신 RBAC만으로 수행한다고 명시. 구형 team 편집 안내와 차이. |
| 2025-09 | LOCAL/REMOTE 대신 connection settings와 edit source 분리. |
| 2025-07/08 | dependency group과 비호환 group 판정 도입. |
| 2025-01/05 | Module/environment 명령의 Standard 전환 기록과 현재 개별 Experimental 표시를 함께 확인. |
| 2024 이전 | 합성 Module, 외부 registry, 동적 canary, finding/suppression, secret, dependency incompatibility와 Plan/CR UI의 진화 기록. |

구형 안내가 제거 불가라고 적은 Module release도 2025-04 변경 이력은 개별 release 삭제와 설치/부모 참조 보호를 설명한다. 과거 full spec과 신규 제품 기능의 범위를 합쳐 현재 보편 지원이라고 판단하지 않는다.

## 근거를 적용하는 방법

문서에 source/UI/CLI가 상충하면 더 최신 이력과 대상 명령 reference로 변경 시점을 확인하고 현재 binary --help, Hub schema와 실제 권한으로 결정한다. 이 문서는 공식 문서 기반 계약의 학습 결과다. 실제 Hub 연결, API mutation, deployment와 permission 동작은 실행하지 않았다.

## 출처

- [Palantir, apollo-mcp](https://www.palantir.com/docs/apollo/apollo-mcp) — MCP 부모 경로의 bearer/HTTP 도구와 discovery.
- [Palantir, overview](https://www.palantir.com/docs/apollo/apollo-mcp/overview) — 약97도구, GraphQL schema search와 docs search/read.
- [Palantir, apollo-references](https://www.palantir.com/docs/apollo/apollo-references) — 기술 reference 부모 경로의 네 계열.
- [Palantir, apollo-api-documentation](https://www.palantir.com/docs/apollo/apollo-references/apollo-api-documentation) — Hub GraphQL Explorer와 조회 예시.
- [Palantir, apollo-references](https://www.palantir.com/docs/apollo/apollo-references/apollo-references) — 제품 spec/API/CLI/CEL reference의 역할.
- [Palantir, developer-api-limited-support-policies](https://www.palantir.com/docs/apollo/apollo-references/developer-api-limited-support-policies) — Standard, Deprecated6개월과 Experimental 지원 정책.
- [Palantir, whats-new](https://www.palantir.com/docs/apollo/core/whats-new) — 2022-05~2026-10 전체 이력, 명령/권한/배포 호환성 변화.

## 관련 문서

- [[Apollo-CLI-Authentication-and-Profiles]]
- [[Apollo-Helm-Publishing-and-Rollout-Safety]]
- [[Apollo-Access-and-Debugging]]
