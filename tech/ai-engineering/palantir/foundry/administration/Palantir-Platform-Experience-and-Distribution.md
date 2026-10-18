---
tags: [palantir, administration, experience, marketplace, support]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 운영 경험과 제품 배포"]
---

# Foundry의 사용자 경험, 지원과 제품 배포

Control Panel은 enrollment/organization별 관리 workflow를 모으지만 설정마다 권한과 적용 범위가 다르다. Sidebar search로 찾을 수 있고 일부 민감 변경은 Approvals inbox에 이력을 남긴다. 요청 이력과 독립된 승인자를 요구하는 정책은 구분한다.

## Application access는 데이터 보안 기능이 아니다

Application access는 필요 없는 도구를 sidebar/portal에서 숨기고 UI 진입을 제한하는 경험 구성이다. Object/data/API 접근은 별도 보안 정책으로 통제한다. Platform access를 제한한 사용자는 명시적으로 공유받은 Slate/Workshop 소비 앱만 사용한다. 읽기와 쓰기 수준을 구분하는 설정은 아니다.

기본 변경은 self-approve/apply되며 다른 승인 정책으로 바꿀 수 있다. Approval policy 자체를 바꾸는 요청은 작성자 외의 해당 관리 workflow 보유자가 승인해야 한다. Control Panel 관리자의 접근 group은 하나 이상 남겨야 한다.

실험/beta에서 명시적으로 disabled한 앱은 GA가 돼도 제한을 유지하고, 그렇지 않은 앱은 GA 때 전원 허용될 수 있다. Sunset은 기존 접근을 유지하면서 사용 중단을 준비하는 단계이며 deprecated는 제거될 수 있다. Lifecycle별 동작을 같은 지원 종료로 표현하지 않는다. 구형 Foundry Suite 설정은 deprecated 기능으로, Application access UI가 보이면 새 절차를 쓴다.

## Homepage, 언어와 버전은 사용자별 우선순위가 있다

Homepage는 organization default와 group override를 두며 group 목록의 첫 matching entry를 쓴다. Language는 허용 locale와 browser preference 설정에 따라 초기값이 달라지고 일부 widget은 browser 언어를 직접 따른다. Logo는 favicon 별도, small/medium/large fallback을 지원한다. Enrollment logo/title 변경과 organization 변경 권한도 구별한다.

Stable/beta/prior 중 beta는 미래 stable의 UI이고 prior는 직전 stable을 임시로 보는 경로다. Prior를 일상 운영 버전 고정으로 쓰지 않는다. Group별 beta default와 사용자 switcher 접근은 별도 설정이며 switcher가 열려 있으면 사용자가 다른 버전으로 바꿀 수 있다. 변경은 기본 self-approved request 이력을 남긴다. Static banner는 조직별 Markdown 안내이며 기본 disabled다.

문서 provider는 public site 또는 in-platform mirror를 선택한다. Public이 일반 권장이고 업데이트가 먼저 나올 수 있으며 offline 사용자에게 mirror가 유용하지만 모든 고객에게 제공되는 것은 아니다. Provider 변경은 최대 10분 전파될 수 있다.

## Kiosk와 embedding도 사용자의 권한을 확인한다

Kiosk mode는 조직별 module allowlist와 실행 user group으로 관리하고 Session Launch History를 남긴다. 여러 조직이 공유한 module도 실행자의 primary organization 설정으로 검사한다.

외부 사이트에 Foundry를 iframe으로 넣으려면 CSP를 허용하고 양쪽 로그인이 필요하다. Foundry 로그인은 iframe 안에서 하지 않으며 별도 tab/popup의 `/workspace/auth-redirect`를 사용할 수 있다. Embed된 자원에도 원래 Foundry 권한이 적용된다. 사용자에게 Foundry URL이 보이는 점도 확인한다. 외부 사이트를 Foundry에 넣을 때는 외부 서버의 `frame-ancestors`도 허용해야 한다.

CORS는 별도로 외부 origin의 API 접근을 허용한다. Non-localhost는 HTTPS full domain, localhost만 HTTP/port를 지원하며 wildcard subdomain을 구성할 수 있다. Save 후 적용까지 최대 5분이다. CSP embedding과 CORS를 같은 설정으로 취급하지 않는다.

## Support를 개설하고 통신 책임자를 둔다

Support type을 하나도 구성하지 않으면 Issues 앱 접근이 있어도 issue를 등록할 수 없다. Create route의 `supportTypeRid`로 특정 type을 미리 채운 문의 링크를 만들 수 있다. Support team status automation은 reporter comment 때 Waiting on support, Waiting on reporter에서 7일 무갱신이면 Pending closure, 추가 7일 무갱신이면 Closed로 전환한다.

Platform administration 연락처는 최소 하나 필요하다. Security/service disruption/legal/privacy는 별도 수신함을 정할 수 있고 비어 있을 때만 administration으로 fallback한다. 개인 계정보다 지속되는 mailing list가 권장된다. 일반 제품 공지와 책임자의 수동 대응이 필요한 Upgrade Assistant 전환도 구분한다.

## Marketplace와 Apollo의 공유 경계를 확인한다

Remote store는 enrollment 외부에서 제공되며 organization별로 전체 허용/group 제한/비활성화한다. 새 remote store는 기본 enabled다. 여러 organization에 걸친 group을 골라도 설정 조직의 구성원만 store를 본다. Local store는 저장 위치 권한을 따르므로 remote 설정과 다르다.

Connected hubs는 Foundry와 Apollo 사이에 confidential client/client credentials와 organization-level consent로 인증한다. Foundry egress CIDR의 hub ingress 허용, case-sensitive Apollo space ID와 hub 인증 상태를 확인한다. Artifacts Creator/Viewer와 Products Release Creator/Creator/Viewer 역할을 service user team에 부여해야 product를 발행할 수 있다.

Store를 publishing whitelist에 올리면 새 release가 연결 hub들에 자동 발행된다. Maven coordinate 없는 product는 발행되지 않지만 다른 product 발행을 막지는 않는다. 인증 성공이 product release 전체의 전달 성공과 같지는 않다.

Hub product 설치에는 environment ID 연결과 enablement가 필요하다. Denied resource types/space allow-deny list/허용 marking을 위반하면 Apollo plan이 실패한다. 기본 resource type과 space는 넓게 허용하지만 organization/mandatory marking은 기본 허용하지 않는다. Connection에 없는 marking을 참조하는 content는 설치할 수 없다.

## 보존 목적은 수집 전에 정한다

Consumer mode는 별도 consumer organization/space, 인증 provider의 사용자 배치와 platform access 제한을 함께 구성한다. 2025년 8월에는 플랫폼 안의 Workshop/Slate/Carbon 소비 앱, Foundry subdomain의 OAuth 앱, 별도 privileged organization의 client credentials를 사용하는 외부 앱을 구분했다. 마지막 패턴은 사용자 격리와 최소 API scope를 앱에서 설계해야 한다. Navigation을 소비 화면으로 제한한 것만으로 API/data 인가가 완성되지는 않는다.

Custom widget의 code-defined 격리 실행과 Developer Console iframe 앱은 다른 배포 단위다. 전자는 Workshop 입력/출력과 widget 개발 workflow를 따르고 후자는 독립 domain, CSP와 app hosting을 따른다. 2025년 8월 공지의 Marketplace packaging/ObjectSet parameter 예정 기능을 당시 GA 기능으로 소급하지 않는다.

Retention은 데이터가 필요한 목적, 의무 보존과 삭제 승인자를 함께 정한다. Platform 삭제는 결국 irreversible이므로 data ingestion 전에 필요한 기간을 검토한다. Data Lifetime의 lineage-aware 정책이 있다는 사실만으로 모든 복제본과 외부 export의 삭제가 완료됐다고 추정하지 않는다.

Applications Portal promotion은 Workshop/Slate/Carbon/외부 link의 curated entry다. Organization/User Experience Administrator와 app Editor/Owner가 필요하고 user는 resource/space Discoverer부터 발견해 접근을 요청할 수 있다. Collection은 promoted app이 연결되고 사용자가 발견할 수 있어야 보이며 tag도 같은 가시성 조건을 따른다. Promotion이 가리키는 resource 교체와 unpromote는 배포/노출 경로의 관리이며 source 데이터 권한을 자동 부여하지 않는다.

## 출처

- [Palantir, Management and enablement](https://www.palantir.com/docs/foundry/administration/overview)
- [Palantir, Control Panel](https://www.palantir.com/docs/foundry/administration/control-panel)
- [Palantir, Approvals in Control Panel](https://www.palantir.com/docs/foundry/administration/control-panel-approvals)
- [Palantir, Configure application access](https://www.palantir.com/docs/foundry/administration/configure-application-access)
- [Palantir, Configure workspaces](https://www.palantir.com/docs/foundry/administration/configure-workspaces)
- [Palantir, Configure the platform experience](https://www.palantir.com/docs/foundry/administration/configure-platform-experience)
- [Palantir, Configure documentation provider](https://www.palantir.com/docs/foundry/administration/configure-documentation-provider)
- [Palantir, Configure Workshop settings](https://www.palantir.com/docs/foundry/administration/configure-workshop)
- [Palantir, Configure CSP for embedding](https://www.palantir.com/docs/foundry/administration/embed-foundry-externally)
- [Palantir, Configure CORS](https://www.palantir.com/docs/foundry/administration/configure-cors)
- [Palantir, Configure support teams](https://www.palantir.com/docs/foundry/administration/configure-support-teams)
- [Palantir, Configure support types](https://www.palantir.com/docs/foundry/administration/configure-support-types)
- [Palantir, Configure contact information](https://www.palantir.com/docs/foundry/administration/platform-communications)
- [Palantir, Configure remote Marketplace stores](https://www.palantir.com/docs/foundry/administration/configure-remote-marketplace-stores)
- [Palantir, Connected hubs](https://www.palantir.com/docs/foundry/administration/connected-hubs)
- [Palantir, Retention policies](https://www.palantir.com/docs/foundry/administration/enrollments-and-organizations-retention)
- [Palantir, August 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-08)
- [Palantir, Curating apps in Applications Portal](https://www.palantir.com/docs/foundry/app-building/curating-apps)

## 관련 문서

- [[Palantir-Organization-and-Session-Controls|접근과 세션 경계]]
- [[Palantir-Workshop-Applications|업무 앱과 발행 버전]]
- [[Palantir-Network-Egress-and-Private-Connectivity|네트워크와 인증]]
