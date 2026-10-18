---
tags: [palantir, organization, scoped-session, ingress, oauth]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 조직과 세션 통제"]
---

# Foundry 조직, 접속과 외부 인증의 통제

Enrollment는 하나 이상의 Organization을 포함하는 플랫폼 단위다. 사용자는 primary Organization 하나와 여러 guest membership을 가질 수 있다. 관리 권한은 enrollment와 organization에서 독립이므로 enrollment 관리자가 모든 organization 관리 권한까지 가진다고 가정하지 않는다.

## Role보다 실제 workflow를 확인한다

Role은 관리 capability인 workflows를 묶는다. 각 level의 administrator는 다른 role을 부여할 수 있으므로 좁게 배정한다. Custom role은 개별 workflow로 책임을 나누지만 organization 사이에 공유되지 않는다. Legacy application-specific role은 Organization administrator에 자동 포함되지 않고 custom role에 넣을 수도 없다.

Primary Organization은 profile, 다른 조직 사용자에게 보이는 범위와 신규 project/group의 기본 organization marking을 정한다. Guest access와 resource별 접근 통제는 함께 확인한다. Guest는 해당 조직 primary user를 볼 수 있지만 다른 guest를 같은 방식으로 발견할 수 있는 것은 아니다. Member discovery 설정도 결과를 바꾼다.

Technical Compliance Officer는 Upgrade Assistant Operator로 필요한 플랫폼 전환을 추적한다. 미지정이면 Organization administrator가 이 역할을 맡는다. Control Panel tab이 안 보이는 이유는 권한 부재 또는 beta/limited release일 수 있어 search의 설명으로 구분한다.

## Scoped session은 올바른 marking 배치를 전제로 한다

Custom space role은 workflow 묶음을 생성 시점 기준으로 고정한다. 2026년 1월 관리 UI는 default role에 새 workflow가 추가돼도 custom role에는 자동 반영하지 않는다고 명시했다. 최소 권한을 보존하는 장점과 새 기능을 사용하려면 수동 갱신해야 하는 운영 책임을 함께 고려한다.

Scoped session은 세션에서 사용할 marking 부분집합을 고르게 한다. 사용자의 marking membership과 실제 project/file/object의 marking이 맞아야 의도한 데이터 범위가 된다. Unmarked 자료까지 숨기는 기능으로 해석하지 않는다. 해당 preset의 모든 marking에 접근할 수 있는 사용자만 선택할 수 있다.

로그인 selector는 Off/선택지 하나면 생략/항상 표시를 고른다. Off는 unscoped login이다. Unscoped marking 우회는 전체/특정 group/특정 group 제외로 정하고, group scoping은 별도로 제한할 수 있다. 기본 scoped session은 비활성이다. 이 기능 때문에 scoped token에 빠진 group을 `NOT` membership 검사로 허용하는 설계를 피한다([[Palantir-Actions-and-Functions]]).

Security preset은 자주 쓰는 marking/CBAC 조합을 session/resource/artifact 선택지로 제공한다. 첫 visible preset이 default이며 사용자가 바꿀 수 있다. File preset은 Foundry와 Gotham을 함께 쓰는 enrollment의 기능이고, 조직 preset은 모든 marking Apply 권한이 있어야 볼 수 있으며 guest는 guest 조직 preset 대신 primary 조직 preset을 본다.

Member discovery를 끄면 사용자/group 검색을 줄이지만 기존 permission/access right를 철회하지 않는다. User/group detail 조회에 의존한 custom logic은 실패할 수 있다. Restricted View와 실제 데이터 인가를 대체하는 기능이 아니다.

## Network ingress의 허용 조건은 합쳐진다

별도 file access preset 문서의 확인 가능한 일본어판은 AIP 기계번역이며 정확성 미검증 경고가 있다. 해당 판은 Foundry/Gotham 병용, enterprise auth-selection preset 관리 workflow와 File preset 용도 선택, 모든 marking Apply 권한, primary-org preset 조건을 명시한다. 적용 대상 예시는 envelope-protected Notepad와 Gaia map이며 preset이 없으면 custom security를 설정하고 새 preset 저장/기존 overwrite를 선택한다. 영어판 최신 계약이나 모든 파일 지원으로 확대하지 않는다.

Ingress는 외부에서 Foundry로 시작하는 연결이다. IP CIDR(최대 500개) 또는 country 조건을 만족하면 허용하고, Palantir access toggle도 별도로 더해진다. Country/IP를 동시에 설정해 둘 다 만족해야 한다고 해석하지 않는다. VPN 사용자는 VPN egress IP로 평가한다. Country geotag에는 false positive/negative가 있을 수 있다.

변경은 domain별 approvals request로 남으며 기본 self-approval이 가능하다. 승인 이력이 있다는 사실이 독립된 다른 사람의 검토를 뜻하지 않는다. 접속 원천 허용과 로그인 인증은 별도 검사다.

VPN ingress는 beta, AWS Site-to-Site VPN 경로이며 enrollment당 기본 최대 3개다. 겹치지 않는 Foundry CIDR, static private CIDR 또는 BGP ASN과 두 IPsec tunnel을 구성한다. Ready 뒤에도 gateway 설정, private CIDR ingress와 DNS routing이 필요하다. 고정 Frontdoor IP는 바뀔 수 있어 CNAME이 권장되고, Code Workspaces 등 별도 domain도 route해야 한다.

VPN config는 immutable이어서 변경 시 재생성한다. Delete 뒤 24시간 복원 grace period가 있으며 Ready VPN을 disable/enable할 수도 있다. Tunnel logs는 최대 10,000개를 볼 수 있고 기본 최근 일주일로 검색한다.

## Outbound OAuth는 사용자를 대신한 승인이다

Organization의 outbound application은 Foundry가 OAuth client가 되는 설정이며 **authorization code grant만 지원한다**. Client credentials는 별도 webhook handshake 경로를 사용한다. Token endpoint용 direct/agent policy를 붙이고 브라우저도 authorization page에 접근할 수 있어야 한다. Agent routing만으로 사용자의 브라우저에서 사설 인증 서버에 도달하는 것은 아니다.

Client ID/secret, authorization/token endpoints, scopes와 승인 안내를 설정하며 PKCE를 선택할 수 있다. Token expiry는 서버 반환값이 있으면 그 값이 우선한다. 서로 다른 organization 사용자는 별도 outbound app과 REST source를 구성한다.

사용자가 interactive UI에서 먼저 승인하고 유효한 token이 있으면 automated workflow도 사용할 수 있다. Refresh가 없거나 만료되면 다시 interactive 승인이 필요하다. Python/TSv2 function은 source token을 직접 사용할 수 있고 TSv1은 webhook 경로를 사용한다. Workshop의 직접 function-backed variable은 승인창을 열 수 없어 Function-backed Action으로 감싼다.

| 관리 동작 | Token과 설정에 미치는 영향 |
|---|---|
| Disable | 사용/새 승인 중단, token은 보존 |
| Enable | 보존 token 재사용 가능 |
| Reset | 전체 사용자 token/refresh 영구 제거, 설정 유지 |
| Delete | Token과 client secret 포함 설정 영구 제거, 복구 불가 |

비표준 handshake용 custom webhook 방식은 legacy다. Token webhook은 client_id/redirect_uri/authorization_code와 필요 시 code_verifier를 받아 access_token/scope, 선택 refresh_token/expires_in을 반환한다. Refresh webhook은 client_id/refresh_token을 받는다. Function으로 publish한 webhook은 이 legacy handshake에 사용할 수 없다.

Inherited space role grant는 regular project와 locked Marketplace project의 서로 다른 role set별로 지정한다. 2026년 5월 기능은 project template의 초기값과 달리 각 project에서 제거할 수 없는 기준 grant를 유지하는 경로였다. Role 상속은 marking 조건을 우회하지 않으며 owner 이탈에 대비한 운영권과 데이터 범위를 함께 검토한다.

## 출처

- [Palantir, Enrollments and Organizations](https://www.palantir.com/docs/foundry/administration/enrollments-and-organizations)
- [Palantir, Managing access](https://www.palantir.com/docs/foundry/administration/enrollments-and-organizations-access)
- [Palantir, Permissions](https://www.palantir.com/docs/foundry/administration/enrollments-and-organizations-permissions)
- [Palantir, Configure scoped sessions](https://www.palantir.com/docs/foundry/administration/configure-scoped-sessions)
- [Palantir, Configure security presets](https://www.palantir.com/docs/foundry/administration/configure-security-presets)
- [Palantir, Configure user and group visibility](https://www.palantir.com/docs/foundry/administration/configure-user-and-group-visibility)
- [Palantir, Configure network ingress](https://www.palantir.com/docs/foundry/administration/configure-ingress)
- [Palantir, Configure VPN ingress](https://www.palantir.com/docs/foundry/administration/configure-vpn-ingress)
- [Palantir, Configure outbound applications](https://www.palantir.com/docs/foundry/administration/configure-outbound-applications)
- [Palantir, January 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-01)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, Configure file access presets (일본어 기계번역판)](https://palantir.com/docs/jp/foundry/administration/configure-file-access-presets/)

## 관련 문서

- [[Palantir-Security-and-Governance|보안과 권한]]
- [[Palantir-Network-Egress-and-Private-Connectivity|사설망 경로와 원천 인증]]
- [[Palantir-SDK-and-Agent-Tools|OAuth 소비자와 앱 제한]]
