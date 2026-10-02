---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 2FA와 API token"]
---

# Expo 2FA와 API token

## 2FA와 복구

현재 새 2FA 등록은 TOTP authenticator를 사용한다. SMS는 신규 등록을 지원하지 않으며 기존 설정만 유지된다. Recovery code는 일회용이고 새로 생성하면 기존 code가 무효화된다. 별도 physical device의 보조 인증과 안전한 recovery 보관을 준비한다.

2FA 설정 변경에는 one-time password가 필요하다. 인증 수단과 recovery code를 모두 잃으면 support 수동 복구도 보장되지 않는다. QR secret과 recovery code를 공개 노트에 저장하지 않는다.

## Personal token과 robot

Personal access token은 사용자 대신 행동하며 그 user가 접근하는 여러 Personal/Organization 자원에 영향을 준다. 계정 하나에 한정한 자동화는 role을 지정한 robot user를 고려한다. Robot은 웹/앱에 로그인하거나 프로젝트를 직접 소유하지 못하고 token으로만 인증한다.

EXPO_TOKEN이 있으면 EAS CLI의 기존 username/password session보다 우선한다. eas login을 추가로 할 필요는 없다. CI secret store에서 주입하고 command history나 log에 실제 값을 출력하지 않는다. 유출 시 해당 token을 삭제해 revoke한다.

## 프로젝트 연결과 실패

Token으로 실행하기 전 app config의 extra.eas.projectId가 연결되어 있어야 한다. 없으면 EAS project not configured로 실패할 수 있다. init은 remote project/config를 바꾸는 명령이므로 실제 소유 계정을 확인한 뒤 수행한다. 인증 성공과 원하는 프로젝트에 대한 권한은 별도 확인한다.

## 출처

- [Expo Documentation, Two-factor authentication](https://docs.expo.dev/accounts/two-factor)
- [Expo Documentation, Programmatic access](https://docs.expo.dev/accounts/programmatic-access)

## 관련 문서

- [[Expo-Accounts]]

- [[Expo]]
