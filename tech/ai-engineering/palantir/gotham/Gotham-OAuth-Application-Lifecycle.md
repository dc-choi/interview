---
tags: [palantir, gotham, oauth, security, application]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham 외부 앱 인가 수명주기"]
---

# Gotham 외부 앱 인가 수명주기

외부 앱을 등록한 것과 조직이 사용을 허용한 것, 개별 사용자가 접근을 승인한 것은 서로 다른 상태다. 2026-10-16 공개 문서 기준이며 실제 앱 등록, 토큰 발급과 철회는 수행하지 않았다.

## 등록, 조직 활성화와 사용자 인가

관리 조직의 권한 있는 사용자가 앱을 등록하고 client type, redirect URI와 grant를 설정한다. 다른 조직에서 앱을 발견하고 활성화할 수 있는 범위도 별도로 정한다. 등록만으로 조직의 사용이 활성화되지는 않는다.

조직 활성화 뒤에도 사용자 대신 실행하는 앱은 사용자의 동의가 필요하다. 사용자 설정의 Authorized Applications에서 승인한 앱과 접근 대상을 보고 철회할 수 있다. 이 단계들은 앱 코드의 신뢰성 검사나 업무 데이터 접근의 자동 승인을 뜻하지 않는다.

## Public client와 서버 client

| 클라이언트 | 지원 흐름과 조건 |
|---|---|
| 서버 앱 | 비밀값을 보호할 수 있는 confidential client. Authorization code와 client credentials 지원 |
| 네이티브/SPA | 비밀값을 보호할 수 없는 public client. PKCE를 사용하는 authorization code 지원, client credentials 미지원 |

PKCE의 verifier는 43~128자의 암호학적 난수이며 challenge는 SHA-256 후 padding 없는 Base64url 값이다. 공개 문서는 public client에 PKCE를 요구하고 confidential client에는 권장한다. `state`의 원래 값과 반환 값을 비교하는 CSRF 방어도 별도로 유지한다.

Client credentials로 생성한 서비스 사용자는 기본적으로 자원 접근 권한이 없다. 관리자가 필요한 권한을 부여해야 한다. 이 주체는 로그인한 일반 사용자를 대신하지 않는다.

## 만료와 refresh token 교체

Authorization code의 수명은 문서 기준 10분이다. Access token 수명은 발급 응답의 `expires_in`으로 확인한다. 사용자 부재 중 갱신이 필요하면 `offline_access` scope로 refresh token을 받아 저장한다.

갱신할 때마다 refresh token이 교체되므로 새 access token과 refresh token을 함께 저장해야 한다. 공개 설명의 갱신 절차 한 줄은 refresh_token 필드에 이전 access token을 넣는다고 쓰지만, 같은 페이지의 API 표는 이전 **refresh token**을 지정한다. 앞뒤 계약을 따라 refresh token을 사용하며 그 문장을 그대로 코드화하지 않는다.

갱신 예시의 client_secret도 public client까지 강제로 추가하지 않는다. API 표는 client credentials에서 이를 필수로 명시하며, public client는 비밀값을 안전하게 보관할 수 없다는 별도 계약이 있다. 실제 client type별 토큰 교환은 환경에서 검증해야 한다.

## 비활성화와 삭제는 되돌림 의미가 다르다

- 조직에서 앱을 비활성화한 뒤 다시 활성화해도 기존 사용자 인가가 되살아나지 않는다. 사용자가 다시 승인해야 한다.
- 앱 등록을 삭제하면 되돌릴 수 없다. 같은 이름으로 등록해도 새 등록으로 취급하고 다시 인가해야 한다.
- Confidential client의 secret 교체는 기존 설정을 무효화한다. 새 비밀값은 한 번만 표시되므로 안전하게 보관하고 소비자 설정을 교체한다.
- 사용자 생성 token의 disable은 일시 비활성화, revoke는 영구 무효화다. 앱 등록 삭제와 구별한다.

사용자 생성 토큰 안내는 기본적으로 90일간 로그인하지 않은 사용자를 비활성화하고 그 사용자의 API/OAuth 토큰을 무효화한다고 설명한다. 반면 해당 사용자가 소유한 일정 작업은 계속 실행될 수 있다. 토큰 만료를 배치 작업 전체의 중단 신호로 해석하지 않는다. 예외 사용자는 별도 설정될 수 있다.

## 보안 설명의 적용 범위

Gotham의 보안 개요는 mandatory control의 계보 기반 전파, 자원별 discretionary role과 세부 접근 통제를 구분한다. 관리형 SaaS의 인프라 통제는 자체 운영 환경까지 자동 적용되는 보장이 아니다. 규제 프레임워크를 지원한다는 제품 설명과 고객의 특정 앱이 규제를 충족한다는 검증도 구별한다.

## 출처

- [Palantir, Third-party applications overview](https://www.palantir.com/docs/gotham/platform-security-third-party/third-party-apps-overview)
- [Palantir, Registering third-party applications](https://www.palantir.com/docs/gotham/platform-security-third-party/register-3pa)
- [Palantir, Manage third-party application configuration](https://www.palantir.com/docs/gotham/platform-security-third-party/manage-3pa)
- [Palantir, Enabling third-party applications](https://www.palantir.com/docs/gotham/platform-security-third-party/enabling-3pa-access)
- [Palantir, Authorizing third-party application access](https://www.palantir.com/docs/gotham/platform-security-third-party/authorizing-3pa-access)
- [Palantir, Writing OAuth2 clients](https://www.palantir.com/docs/gotham/platform-security-third-party/writing-oauth2-clients)
- [Palantir, Danger zone actions](https://www.palantir.com/docs/gotham/platform-security-third-party/danger-zone-actions)
- [Palantir, User-generated tokens](https://www.palantir.com/docs/gotham/platform-security-third-party/user-generated-tokens)
- [Palantir, Security](https://www.palantir.com/docs/gotham/security/overview)

## 관련 문서

- [[Gotham-API-Client-Contracts|API 인증과 오류 계약]]
- [[Palantir-Security-and-Governance|보안 통제와 고객 책임]]
