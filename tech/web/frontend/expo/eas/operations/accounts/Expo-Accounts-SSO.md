---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SSO 설정과 사용자 수명"]
---

# Expo SSO 설정과 사용자 수명

## 조직 구성

Production/Enterprise에서 SSO를 지원한다. OIDC Discovery 1.0 기반이며 Okta/OneLogin/Microsoft Entra ID/Google Workspace 구성 guide를 제공한다. 다른 IdP는 호환성을 별도로 확인한다.

Owner가 IdP client ID/secret과 issuer/tenant 정보를 설정한다. **최소 한 명의 non-SSO Owner를 유지해야 한다.** IdP 장애, 설정 변경과 SSO 종료 때 접근을 복구할 계정이다.

## 로그인과 전환

웹의 SSO login에서 organization을 선택하고 IdP 인증 뒤 Expo username을 만든다. Expo CLI는 npx expo login --sso, EAS CLI는 eas login --sso, Expo Go는 Continue with SSO를 사용한다.

기존 일반 user를 SSO user로 직접 변환하지 않는다. 새 SSO user를 만들고 기본 View Only 권한을 필요한 역할로 바꾼 뒤 기존 membership을 제거한다. 같은 이메일을 쓸 수 있지만 username은 unique다. 기존 personal account 삭제는 그 안의 프로젝트도 삭제하므로 membership 제거와 혼동하지 않는다.

## 제한과 퇴사 처리

SSO user는 해당 organization에만 속하고 추가 organization을 만들거나 personal EAS 구독을 할 수 없다. 조직에서 나가는 것은 SSO user 삭제와 연결된다. 외부 기여자는 non-SSO로 별도 초대할 수 있다.

IdP에서 비활성화해도 token refresh 기간까지 Expo 접근이 남을 수 있다. 즉시 차단이 필요하면 Members에서 SSO user를 삭제한다. 이 user의 personal data는 삭제되지만 Organization 자원은 남는다. SSO 중단/plan 변경과 SSO organization 삭제는 Expo support 절차를 확인한다.

## 출처

- [Expo Documentation, Single Sign-On (SSO)](https://docs.expo.dev/accounts/sso)

## 관련 문서

- [[Expo-Accounts]]

- [[Expo]]
