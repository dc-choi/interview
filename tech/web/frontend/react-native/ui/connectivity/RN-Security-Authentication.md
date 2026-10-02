---
tags: [react-native, mobile, networking, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native deep link와 OAuth 인증

React Native 0.87 Security 가이드와 RFC 7636 기준. custom URL scheme은 외부에서 앱에 데이터를 전달하는 통로이며 앱을 유일하게 식별하는 보안 채널로 간주하지 않는다.

## custom scheme의 경쟁

`app://products/1`처럼 scheme 뒤의 값을 앱에서 해석해 화면을 열 수 있다. 다른 앱도 같은 scheme을 등록할 수 있으므로 토큰이나 secret을 custom scheme URL에 넣지 않는다.

같은 scheme을 여러 앱이 처리할 때 Android는 선택 대화상자를 제공할 수 있고 iOS는 OS가 앱을 선택하는 동작을 가이드에서 설명한다. iOS 버전별 우선순위의 역사적 설명을 모든 현재 OS의 유일한 보호로 삼지 않는다.

가이드는 iOS universal links를 앱 콘텐츠 연결의 보호 방법으로 안내한다. custom scheme과 universal link는 같은 등록 체계가 아니다. 실제 association과 도메인 설정은 현재 플랫폼 문서에서 확인한다.

## OAuth2 redirect와 authorization code

OAuth 흐름은 사용자가 인증 제공자에서 인증한 뒤 요청 앱으로 authorization code를 돌려주고, 앱이 이를 token으로 교환하는 단계를 포함한다. code 자체도 유출되면 문제가 될 수 있으므로 반환 채널과 교환 조건을 함께 보호한다.

access token이 반드시 JWT라는 것은 아니다. RN 가이드의 JWT 설명을 모든 OAuth2 제공자의 token 형식 계약으로 확대하지 않는다.

## PKCE가 묶는 두 요청

PKCE는 **Proof Key for Code Exchange**다. 최초 authorization 요청과 code 교환 요청을 같은 verifier를 가진 클라이언트에 묶어 authorization code 탈취 공격을 줄인다.

S256 방식의 흐름은 다음과 같다.

1. 클라이언트가 각 요청의 임의 `code_verifier`를 생성하고 유지한다.
2. verifier에서 `code_challenge`를 만든다.
3. authorization 요청에 challenge와 `code_challenge_method=S256`을 보낸다.
4. 인증 뒤 받은 code를 token endpoint에서 교환할 때 원래 verifier를 보낸다.
5. 서버가 저장한 challenge와 verifier의 변환값을 비교하고 다른 교환 조건도 확인한다.

```text
code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
```

단순히 SHA-256 hex 문자열을 전달하는 것이 아니다. Base64url encoding은 URL-safe alphabet을 사용하고 padding `=`와 줄바꿈을 넣지 않는다. RFC 7636의 verifier는 충분한 난수성을 가진 43~128자 문자열 조건을 둔다. 규격의 Appendix B 예제 값으로 구현을 대조할 수 있다.

challenge만 알고 code를 탈취한 공격자는 원래 verifier 없이 유효한 token 교환을 완료하기 어렵게 된다. 이 보호는 verifier가 함께 유출되지 않는 조건과 제공자의 올바른 검증에 의존하며 다른 인증 공격 전부를 방지하는 보장은 아니다.

## 제공자와 라이브러리 조건

RN 가이드는 native AppAuth-iOS와 AppAuth-Android를 감싼 `react-native-app-auth`를 후보로 소개한다. PKCE는 identity provider가 지원해야 한다. 라이브러리 이름만으로 제공자의 PKCE 검증이 활성화됐다고 판단하지 않는다.

공식 가이드의 SHA-256 설명에서 같은 입력은 같은 hash, 고정 길이, 원래 입력 복원의 어려움이라는 성질을 이해할 수 있다. 이를 충돌이 불가능한 유일한 서명이나 token 자체의 암호화라고 해석하지 않는다.

## 추가 점검 제안

프로젝트 적용 시 redirect URI 등록, 실제 반환 경로, verifier 생성과 보관, 제공자의 S256 지원, code 재사용 거절을 end-to-end로 확인한다. 외부 deep link에서 받은 route와 params도 신뢰 입력으로 처리하지 않는다. 이 항목은 구체적인 앱과 제공자 설정을 확인해야 하는 적용 점검이며 문서만으로 검증 완료된 상태가 아니다.

## 확인할 점

정상 인증만 테스트하지 않고 경쟁 scheme, 잘못된 verifier, 만료 code, 앱 재시작 중 인증, token 교환 실패도 조건을 나눠 확인한다. 이 문서는 실제 로그인 구현을 실행 검증한 결과가 아니다.

## 출처

- [React Native 0.87, Security](https://reactnative.dev/docs/security)
- [RFC Editor, RFC 7636 Proof Key for Code Exchange by OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636)

## 관련 문서

- [[RN-Navigation|navigator와 화면 params]]
- [[RN-Security-Storage|token과 verifier의 저장 경계]]
- [[RN-Networking|cookie와 redirect 제약]]
