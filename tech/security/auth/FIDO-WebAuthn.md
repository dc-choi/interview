---
tags: [security, auth, fido, webauthn, passkey]
status: done
verified_at: 2026-10-03
category: "Security - 인증"
aliases: ["FIDO2", "WebAuthn", "웹 인증 API"]
---

# FIDO2, WebAuthn

인증용 개인키 대신 공개키를 RP 서버에 등록하는 인증 구조다. 로그인은 서버가 준 challenge에 개인키로 서명해 증명한다. 개인키의 보관과 동기화 방식은 인증기와 패스키 유형에 따라 다르다.

FIDO2는 W3C의 Web Authentication(WebAuthn) 스펙과 FIDO Alliance의 Client to Authenticator Protocol(CTAP)로 구성된다. CTAP2는 보안키나 휴대폰 같은 외부 인증기용이고, 기존 U2F 프로토콜은 CTAP1로 재명명됐다. 본문의 절차와 검증 단계는 WebAuthn Level 3(2026-08-25 Recommendation) 기준이다.

## 구성 요소

| 주체 | 역할 |
|---|---|
| Relying Party (RP) | 인증을 요구하는 서비스. 등록 시 공개키를 저장하고 인증 시 assertion을 검증한다 |
| Authenticator | 키쌍을 생성, 보관하고 서명을 만드는 주체. 플랫폼 내장(지문, 얼굴)과 외부 보안키로 나뉜다 |
| WebAuthn Client | 브라우저나 OS. RP의 요청을 인증기 호출로 옮기고 결과를 돌려주며, 자격증명 접근을 중개해 프라이버시를 보호한다 |

RP는 `navigator.credentials.create()`와 `.get()`으로 두 플로우를 시작하고 클라이언트가 돌려준 응답을 서버로 보내 검증한다.

## 등록 플로우 (attestation)

1. 서버가 랜덤 challenge를 만들어 `PublicKeyCredentialCreationOptions`에 담아 내려준다.
2. 클라이언트가 `create()`를 호출하면 인증기가 요청 조건에 따라 키쌍을 생성한다. 사용자 존재(UP)와 사용자 검증(UV)의 요구는 아래처럼 구분한다.
3. 인증기는 공개키와 credential ID가 들어 있는 `authenticatorData`, 그리고 attestation statement를 담은 attestation object를 반환한다.
4. 클라이언트는 challenge, origin, type(`webauthn.create`)을 담은 `clientDataJSON`을 함께 반환한다.
5. 서버가 검증에 성공하면 공개키, credential ID, sign counter, 백업 플래그를 credential record로 저장한다.

attestation은 인증기의 속성과 출처를 확인하는 데 쓰인다. 포맷(`fmt`)과 유형에 따라 검증 절차가 다르며, 인증서 기반이면 신뢰 앵커와 체인도 확인한다. self attestation이나 `none`을 인증기 제조사 인증서 체인과 동일시하지 않는다. `none`을 받는 정책에서는 특정 인증기 모델이 만든 키라는 암호학적 증명이 없다는 것을 RP가 감수한다.

## 인증 플로우 (assertion)

1. 서버가 새 challenge와 `allowCredentials`(discoverable credential을 쓰면 생략)를 담아 내려준다.
2. 클라이언트가 `get()`을 호출하고 인증기는 RP ID에 맞는 자격증명을 고른다. 사용자 존재와 요청된 사용자 검증을 수행한다.
3. 인증기가 `authenticatorData`와 서명을 반환하고 클라이언트는 type이 `webauthn.get`인 `clientDataJSON`을 함께 반환한다.
4. 서버는 저장해 둔 공개키로 서명을 검증하고 sign counter와 백업 상태를 갱신한다.

## assertion의 서명 대상

인증(assertion)에서는 credential private key로 아래 바이트열에 서명한다.

```
sig = Sign(privateKey, authenticatorData || SHA-256(clientDataJSON))
```

`clientDataJSON`에는 challenge, origin, type이 들어가고, `authenticatorData`에는 RP ID의 SHA-256 해시(rpIdHash), 플래그(UP, UV, BE, BS), sign counter가 들어간다. assertion 서명은 이 바이트열의 변조를 검출한다. 그러나 유효한 서명만으로 기대한 계정, origin과 요구한 UV까지 만족한 것은 아니므로 서버가 각 값을 별도로 대조한다.

UP는 터치 같은 사용자 존재 확인이며 PIN이나 생체 정보를 통한 UV와 다르다. UP만 설정됐다고 사용자 검증이나 MFA가 완료됐다고 판단하지 않는다.

등록(attestation)은 하나의 고정된 서명 공식으로 일반화할 수 없다. `attestationObject` 안의 `fmt`, `attStmt`, `authData`를 꺼내고, 해당 포맷이 정의한 절차로 `authData`와 `SHA-256(clientDataJSON)`을 검증한다. 포맷과 attestation 유형에 따라 attestation key나 credential key를 쓸 수 있고, `none` 포맷에는 검증할 attestation 서명이 없다.

## 피싱과 재사용 공격에 강한 이유

- **자격증명이 RP ID에 묶인다** — 기본적으로 RP ID는 호출 origin의 effective domain 또는 허용되는 registrable domain suffix여야 한다. Level 3의 related origins는 RP가 명시한 관련 origin들에 공통 RP ID를 쓰도록 허용하는 별도 절차다. 임의의 피싱 사이트가 다른 RP의 자격증명을 쓸 수 있게 하는 것은 아니며, RP의 origin 검증은 여전히 필요하다.
- **origin을 RP가 검증하고 assertion 서명이 묶는다** — 스펙은 RP가 등록과 인증 양쪽에서 client data의 origin을 반드시 검증하도록 요구한다. 인증에서는 origin이 든 `clientDataJSON`의 해시가 assertion 서명에 포함된다. 등록은 attestation 포맷별 검증을 따르며 `none`에는 attestation 서명이 없지만, RP의 origin 검증과 자격증명의 RP ID 범위 제한은 그대로 적용된다.
- **challenge가 매번 다르다** — RP가 신뢰하는 환경에서 무작위로 생성하고 응답의 challenge와 발급값의 일치를 검증해야 한다(MUST). 스펙은 최소 16바이트 길이와 유효기간 제한을 권고한다(SHOULD). 길이를 곧 엔트로피로 표현하지 않는다.
- **공개키 유출만으로 서명을 만들 수 없다** — RP에 등록된 공개키를 알아도 인증 서명을 만들 수 없다. 서버 실행 권한이나 로그인 세션까지 탈취된 상황의 안전을 뜻하지는 않는다.
- **RP 간 같은 비밀번호 재사용을 피한다** — 자격증명은 RP ID에 묶이므로 서로 다른 RP에 같은 비밀번호를 쓰는 위험을 줄인다. 기기나 동기화 계정 자체의 침해는 별도 위협이다.

## 패스키와의 관계

패스키는 FIDO 표준 기반 인증 자격증명을 사용자 관점에서 부르는 이름이다. FIDO Alliance는 기기를 잠금 해제하는 것과 같은 방식(생체, PIN, 패턴)으로 앱과 웹사이트에 로그인하게 해주는 자격증명으로 정의하고, 클라우드로 동기화되는 synced passkey와 한 기기를 벗어나지 않는 device-bound passkey로 구분한다. WebAuthn 스펙은 전자를 multi-device credential이라 부르며 흔히 synced passkey로 통칭된다고 적는다.

기술적으로는 discoverable credential(예전 명칭 resident key)이 핵심이다. 아이디를 먼저 입력하지 않아도 인증기가 자격증명을 찾아 `userHandle`을 반환하는 흐름이 가능하다. 서버는 이 값과 등록된 계정 및 자격증명의 연결을 검증한다. 패스키는 별도 프로토콜이 아니며, 모든 패스키가 동기화되는 것도 아니다.

## 서버 구현 시 검증 포인트

`clientDataJSON`을 파싱한 결과를 C, `authenticatorData`를 authData라 할 때의 주요 검증 항목이다. 실제 구현은 §7.1/7.2 전체 절차와 사용하는 확장의 조건을 따른다.

| 항목 | 확인 내용 |
|---|---|
| type | 등록이면 `webauthn.create`, 인증이면 `webauthn.get` |
| challenge | `C.challenge`가 서버가 발급한 challenge의 base64url 인코딩과 일치. 서버 세션에 임시 저장해 두고 대조하며 클라이언트가 보낸 값을 신뢰하지 않는다 |
| origin | `C.origin`이 RP가 기대하는 origin인지. 정확 문자열 비교가 가장 단순하다. crossOrigin, topOrigin이 있으면 iframe 사용을 실제로 기대하는지까지 확인 |
| rpIdHash | authData의 rpIdHash가 기대 RP ID의 SHA-256 해시와 일치 |
| UP와 UV | 인증은 UP 확인. 등록은 `options.mediation`이 `conditional`이 아닌 경우 UP 확인. UV를 요구한 ceremony에서는 UV 비트도 확인 |
| 백업 플래그 | BE=0인데 BS=1이면 거부. 인증에서 백업 상태를 정책에 사용하면 저장된 `backupEligible`과 BE의 일치 및 BS에 대한 정책도 확인 |
| 서명 | 등록은 포맷별 attestation 검증 절차, 인증은 저장된 공개키로 `authData || SHA-256(clientDataJSON)` 검증. 등록 시 `alg`가 요청한 `pubKeyCredParams` 중 하나와 일치하는지도 확인 |
| sign counter | 응답과 저장값 중 하나라도 0이 아니면 비교. 응답값이 저장값보다 크면 정상, 작거나 같으면 복제 가능성 신호로 본다 |
| credential ID | 등록 시 1023바이트 이하인지와 어느 사용자에게도 이미 등록되지 않았는지 확인. 규격은 초과/중복 시 실패를 권고(SHOULD). 인증에서 `allowCredentials`가 비어 있지 않으면 그 목록에 있는 ID인지 확인 |
| 계정 연결 | 사전 식별된 계정에 해당 credential ID가 속하는지 확인하고, `userHandle`이 있으면 계정의 handle과 대조. 사전 식별이 없으면 `userHandle`이 필수이며 그 계정에 해당 credential ID가 속해야 함 |

sign counter가 역행해도 그 자체는 복제의 증거가 아니라 신호다. 스펙은 인증기 오작동이나 응답 처리 순서가 뒤바뀐 경쟁 상태도 원인일 수 있다고 적고, 실패 처리 여부는 RP의 위험 정책에 맡긴다. 카운터를 0으로 고정해 보고하는 인증기도 있어 이 값만으로 차단하면 정상 사용자를 막을 수 있다.

등록 단계의 중복 검사는 계정 연결을 보호한다. 스펙은 self attestation 이외의 유형에는 credential private key의 소유를 명시적으로 증명하는 자체 서명이 없다고 설명한다. 공격자가 피해자의 ID와 공개키로 중복 등록을 시도하고, RP가 기존 등록을 교체해 받아들이면 discoverable credential의 피해자를 공격자 계정으로 로그인시키는 위험이 생길 수 있다. 등록 응답을 받았다는 이유만으로 기존 계정의 자격증명을 다른 계정에 재할당하지 않는다.

### challenge의 수명과 단회 소비

다음은 인증 서버 코드를 검토하며 정리한 설계 경계다. 규격이 특정 DB 구현 방식을 의무화하는 것은 아니다.

- 만료 데이터 정리는 저장 공간 관리다. 요청을 수락하는 시점에도 만료 여부를 검사한다. 클라이언트 `timeout`을 서버의 유효기간 검사로 대신하지 않는다.
- 같은 challenge를 두 요청이 동시에 읽어도 두 번 수락하지 않도록 소비를 원자적으로 처리한다. 서명 등 검증 후 미사용 상태와 만료 조건을 함께 검사하는 조건부 갱신에 성공한 요청만 인증을 완료하게 만들 수 있다.
- 검증 전에 소비하면 실패한 응답도 challenge를 소진한다. 검증 후 소비한다면 경쟁 요청 중 하나만 성공하는지 확인한다. 어느 방식이든 실패 후 재발급 정책을 정한다.
- challenge는 해당 ceremony와 세션 정책에 연결한다. 사용자 식별 없이 시작하는 discoverable credential 인증에 사용자 ID의 사전 결합을 강제하지 않는다.
- 기대 origin과 RP ID는 서버가 신뢰하는 허용 정책에서 선택한다. 응답이나 요청 헤더의 값을 그대로 기대값으로 삼으면 독립적인 대조가 되지 않는다. sign counter도 challenge의 단회 소비를 대신하지 않는다.

조건부 소비와 자격증명 상태 갱신, 로그인 세션 발급 사이의 실패도 다룬다. 저장소가 다르면 한 DB 트랜잭션으로 전부 원자적이라고 가정하지 않는다.

## 실무 사례 — 기간 제약 속의 FIDO 서버 인증 획득

재직 중 직접 수행한 인증 솔루션 개발 사례다.

- **상황**: 담당자 퇴사로 인수인계 없이 공백 상태였고, 3개월 안에 FIDO 서버 인증을 받아야 했다. 4인 팀을 리드하며 FIDO와 WebAuthn 스펙을 직접 읽어 인증 요건을 정리하는 것부터 시작했다.
- **판단**: 기간 제약상 프로토콜을 처음부터 구현하는 선택지는 버렸다. 검증된 SimpleWebAuthn 라이브러리를 채택해 공개키 등록과 인증 플로우를 구현하고 남은 시간을 인증 요건 충족과 검증에 썼다.
- **문제**: 인증 테스트 툴에서 원인이 불명확한 오류가 반복되던 중, 팀원이 라이브러리의 규격 준수 여부에 의문을 제기했다. 툴 설정이나 우리 코드 문제로 보고 넘길 수도 있었지만 일정 압박에도 검증을 먼저 하기로 결정했고, 스펙과 대조한 결과 라이브러리의 `residentKey` 처리가 규격과 달라 값이 항상 비어 오는 것이 원인이었다.
- **대응**: 재현 조건과 스펙 근거, 수정 제안 코드를 정리해 GitHub 이슈로 제기했다. 메인테이너가 문제를 확인해 수정본을 배포했고(제안한 방식 그대로는 아니었다), 그 버전으로 인증 요건을 통과했다.
- **결과**: 기한 내 공식 인증을 획득했고, 사내 문제 해결이 그대로 오픈소스 기여로 이어졌다. 라이브러리를 쓰더라도 규격 준수 여부는 결국 우리가 검증해야 한다는 것을 확인한 사례다.

## 면접 체크포인트

- 비밀번호 대비 FIDO가 서버 유출에 강한 이유를 키 보관 위치로 설명할 수 있는가
- assertion 서명 대상이 `authData || hash(clientDataJSON)`이라는 점과, 그래서 origin과 challenge 위조가 왜 불가능한지
- attestation과 assertion의 목적 차이, attestation을 `none`으로 둘 수 있는 경우
- 패스키, discoverable credential, WebAuthn, FIDO2의 관계 정리
- sign counter 역행을 즉시 차단하지 않고 신호로 다루는 이유

## 출처

2026-10-03 부분 검증: W3C Level 3의 UP/UV, attestation 유형, related origins, §7.1/7.2의 자격증명과 계정 연결 및 백업 플래그 조건, FIDO Alliance의 패스키 구분을 대조했다. 인증 획득 경험의 재검증이나 특정 브라우저와 라이브러리의 지원 검증은 포함하지 않았다.

- [Web Authentication: An API for accessing Public Key Credentials Level 3 — W3C Recommendation, 2026-08-25](https://www.w3.org/TR/webauthn-3/)
- [WebAuthn L3 §7.1 Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)
- [WebAuthn L3 §7.2 Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
- [WebAuthn L3 §5.11 Using Web Authentication across related origins](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)
- [WebAuthn L3 §13.4.3 Cryptographic Challenges](https://www.w3.org/TR/webauthn-3/#sctn-cryptographic-challenges)
- [WebAuthn L3 §13.4.9 Validating the origin of a credential](https://www.w3.org/TR/webauthn-3/#sctn-validating-origin)
- [FIDO Alliance — Specifications Overview (FIDO2, WebAuthn, CTAP)](https://fidoalliance.org/specifications/)
- [FIDO Alliance — Passkeys](https://fidoalliance.org/passkeys/)
- [생각보다 쉬웠던 오픈소스 기여하기 — 본인 블로그 (FIDO 규격 미준수 이슈 제기와 반영)](https://dc-choi.tistory.com/69)

## 관련 문서

- [[FIDO-Seminar|FIDO, 패스키 세미나]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[Password-Hashing|패스워드 해싱]]
