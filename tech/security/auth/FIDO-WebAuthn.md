---
tags: [security, auth, fido, webauthn, passkey]
status: done
verified_at: 2026-08-05
category: "Security - 인증"
aliases: ["FIDO2", "WebAuthn", "웹 인증 API"]
---

# FIDO2, WebAuthn

서버가 비밀값을 보관하지 않는 인증 구조. 서버에는 공개키만 남고, 개인키는 인증기 밖으로 나오지 않는다. 로그인은 서버가 준 challenge에 개인키로 서명해 증명한다.

FIDO2는 W3C의 Web Authentication(WebAuthn) 스펙과 FIDO Alliance의 Client to Authenticator Protocol(CTAP)로 구성된다. CTAP2는 보안키나 휴대폰 같은 외부 인증기용이고, 기존 U2F 프로토콜은 CTAP1로 재명명됐다. 본문의 절차와 검증 단계는 WebAuthn Level 3(2026-05-26 Candidate Recommendation Snapshot) 기준이다.

## 구성 요소

| 주체 | 역할 |
|---|---|
| Relying Party (RP) | 인증을 요구하는 서비스. 등록 시 공개키를 저장하고 인증 시 assertion을 검증한다 |
| Authenticator | 키쌍을 생성, 보관하고 서명을 만드는 주체. 플랫폼 내장(지문, 얼굴)과 외부 보안키로 나뉜다 |
| WebAuthn Client | 브라우저나 OS. RP의 요청을 인증기 호출로 옮기고 결과를 돌려주며, 자격증명 접근을 중개해 프라이버시를 보호한다 |

RP는 `navigator.credentials.create()`와 `.get()`으로 두 플로우를 시작하고, 클라이언트가 돌려준 응답을 서버로 보내 검증한다.

## 등록 플로우 (attestation)

1. 서버가 랜덤 challenge를 만들어 `PublicKeyCredentialCreationOptions`에 담아 내려준다.
2. 클라이언트가 `create()`를 호출하면 인증기가 사용자 확인 후 키쌍을 생성한다.
3. 인증기는 공개키와 credential ID가 들어 있는 `authenticatorData`, 그리고 attestation statement를 담은 attestation object를 반환한다.
4. 클라이언트는 challenge, origin, type(`webauthn.create`)을 담은 `clientDataJSON`을 함께 반환한다.
5. 서버가 검증에 성공하면 공개키, credential ID, sign counter, 백업 플래그를 credential record로 저장한다.

attestation은 인증기 모델의 출처를 증명하는 선택 절차다. 포맷(`fmt`)마다 검증 절차가 다르고, 서버는 `attStmt`, `authData`, `clientDataJSON`의 SHA-256 해시를 입력으로 해당 포맷의 절차를 수행한 뒤 신뢰 앵커까지 체인을 확인한다. attestation을 `none`으로 받는 정책도 가능하며, 이때는 특정 인증기가 만든 키라는 암호학적 증명이 없다는 것을 RP가 감수하는 것이다.

## 인증 플로우 (assertion)

1. 서버가 새 challenge와 `allowCredentials`(discoverable credential을 쓰면 생략)를 담아 내려준다.
2. 클라이언트가 `get()`을 호출하고, 인증기는 RP ID에 맞는 자격증명을 골라 사용자 확인을 거친다.
3. 인증기가 `authenticatorData`와 서명을 반환하고, 클라이언트는 type이 `webauthn.get`인 `clientDataJSON`을 함께 반환한다.
4. 서버는 저장해 둔 공개키로 서명을 검증하고 sign counter와 백업 상태를 갱신한다.

## 서명 대상

두 플로우 모두 서명은 아래 바이트열을 대상으로 한다.

```
sig = Sign(privateKey, authenticatorData || SHA-256(clientDataJSON))
```

`clientDataJSON`에는 challenge, origin, type이 들어가고, `authenticatorData`에는 RP ID의 SHA-256 해시(rpIdHash), 플래그(UP, UV, BE, BS), sign counter가 들어간다. 즉 서명 한 번으로 어떤 사이트에(rpIdHash, origin) 어떤 요청에 대해(challenge) 사용자가 실제로 있었는지(UP, UV)가 한꺼번에 묶인다. 이 값 중 하나만 바뀌어도 서명 검증이 깨진다.

## 피싱과 재사용 공격에 강한 이유

- **자격증명이 RP ID에 묶인다** — 인증기가 만든 자격증명은 등록된 RP ID 범위 밖 도메인에서는 쓰이지 않는다. 피싱 사이트가 `get()`을 호출해도 클라이언트와 인증기가 정품 도메인의 키를 넘겨주지 않는다.
- **origin이 서명에 포함된다** — 스펙은 RP가 등록과 인증 양쪽에서 client data의 origin을 반드시 검증하도록 요구한다. 자격증명 범위 제한이 1차 방어이고, 서버의 origin 검증은 인증기 구현이 범위 강제에 실패했을 때를 대비한 추가 계층이다.
- **challenge가 매번 다르다** — WebAuthn은 재전송 공격을 막기 위해 랜덤 challenge에 의존한다. 스펙은 challenge를 RP가 신뢰하는 환경에서 생성하고, 최소 16바이트 이상의 엔트로피를 가지며, 응답의 challenge가 발급값과 일치해야 한다고 규정한다. 불일치를 눈감으면 프로토콜의 보안이 무너진다.
- **서버 유출로 로그인할 수 없다** — 서버가 가진 것은 공개키뿐이라 유출돼도 서명을 만들 수 없다. 비밀번호 해시 유출과 근본적으로 다른 지점이다.
- **비밀번호 재사용 문제가 사라진다** — 사이트마다 별도 키쌍이 생성되므로 한 서비스의 자격증명이 다른 서비스로 번지지 않는다.

## 패스키와의 관계

패스키는 FIDO 표준 기반 인증 자격증명을 사용자 관점에서 부르는 이름이다. FIDO Alliance는 기기를 잠금 해제하는 것과 같은 방식(생체, PIN, 패턴)으로 앱과 웹사이트에 로그인하게 해주는 자격증명으로 정의하고, 클라우드로 동기화되는 synced passkey와 한 기기를 벗어나지 않는 device-bound passkey로 구분한다. WebAuthn 스펙은 전자를 multi-device credential이라 부르며 흔히 synced passkey로 통칭된다고 적는다.

기술적으로는 discoverable credential(예전 명칭 resident key)이 핵심이다. 자격증명이 사용자 식별자를 자체적으로 담고 있어서, 아이디 입력 없이 인증기 선택만으로 로그인하는 흐름이 가능해진다. 즉 패스키는 새 프로토콜이 아니라 discoverable credential과 동기화, 그리고 그 위에 얹은 UX를 묶은 이름이다.

## 서버 구현 시 검증 포인트

`clientDataJSON`을 파싱한 결과를 C, `authenticatorData`를 authData라 할 때 서버가 반드시 확인할 항목이다.

| 항목 | 확인 내용 |
|---|---|
| type | 등록이면 `webauthn.create`, 인증이면 `webauthn.get` |
| challenge | `C.challenge`가 서버가 발급한 challenge의 base64url 인코딩과 일치. 서버 세션에 임시 저장해 두고 대조하며 클라이언트가 보낸 값을 신뢰하지 않는다 |
| origin | `C.origin`이 RP가 기대하는 origin인지. 정확 문자열 비교가 가장 단순하다. crossOrigin, topOrigin이 있으면 iframe 사용을 실제로 기대하는지까지 확인 |
| rpIdHash | authData의 rpIdHash가 기대 RP ID의 SHA-256 해시와 일치 |
| 플래그 | UP 비트 확인. `userVerification: required`로 요청했으면 UV 비트도 확인. BE가 꺼져 있는데 BS가 켜져 있으면 거부 |
| 서명 | 등록은 포맷별 attestation 검증 절차, 인증은 저장된 공개키로 `authData || SHA-256(clientDataJSON)` 검증. 등록 시 `alg`가 요청한 `pubKeyCredParams` 중 하나와 일치하는지도 확인 |
| sign counter | 응답과 저장값 중 하나라도 0이 아니면 비교. 응답값이 저장값보다 크면 정상, 작거나 같으면 복제 가능성 신호로 본다 |
| credential ID | 등록 시 1023바이트 이하이고 다른 사용자에게 이미 등록되지 않았는지 |

sign counter가 역행해도 그 자체는 복제의 증거가 아니라 신호다. 스펙은 인증기 오작동이나 응답 처리 순서가 뒤바뀐 경쟁 상태도 원인일 수 있다고 적고, 실패 처리 여부는 RP의 위험 정책에 맡긴다. 카운터를 0으로 고정해 보고하는 인증기도 있어 이 값만으로 차단하면 정상 사용자를 막을 수 있다.

등록 단계에서 credential ID 중복을 거부해야 하는 이유도 여기서 나온다. self attestation이 아닌 경우 등록 시점에 개인키 소유를 증명하는 자체 서명이 없으므로, 남의 credential ID와 공개키를 손에 넣은 공격자가 자기 계정으로 먼저 등록해 피해자를 자기 계정에 로그인시키는 시나리오가 가능하다.

## 실무 사례 — 기간 제약 속의 FIDO 서버 인증 획득

재직 중 직접 수행한 인증 솔루션 개발 사례다.

- **상황**: 담당자 퇴사로 인수인계 없이 공백 상태였고, 3개월 안에 FIDO 서버 인증을 받아야 했다. 4인 팀을 리드하며 FIDO와 WebAuthn 스펙을 직접 읽어 인증 요건을 정리하는 것부터 시작했다.
- **판단**: 기간 제약상 프로토콜을 처음부터 구현하는 선택지는 버렸다. 검증된 SimpleWebAuthn 라이브러리를 채택해 공개키 등록과 인증 플로우를 구현하고, 남은 시간을 인증 요건 충족과 검증에 썼다.
- **문제**: 인증 테스트 툴에서 원인이 불명확한 오류가 반복되던 중, 팀원이 라이브러리의 규격 준수 여부에 의문을 제기했다. 툴 설정이나 우리 코드 문제로 보고 넘길 수도 있었지만 일정 압박에도 검증을 먼저 하기로 결정했고, 스펙과 대조한 결과 라이브러리의 `residentKey` 처리가 규격과 달라 값이 항상 비어 오는 것이 원인이었다.
- **대응**: 재현 조건과 스펙 근거, 수정 제안 코드를 정리해 GitHub 이슈로 제기했다. 메인테이너가 문제를 확인해 수정본을 배포했고(제안한 방식 그대로는 아니었다), 그 버전으로 인증 요건을 통과했다.
- **결과**: 기한 내 공식 인증을 획득했고, 사내 문제 해결이 그대로 오픈소스 기여로 이어졌다. 라이브러리를 쓰더라도 규격 준수 여부는 결국 우리가 검증해야 한다는 것을 확인한 사례다.

## 면접 체크포인트

- 비밀번호 대비 FIDO가 서버 유출에 강한 이유를 키 보관 위치로 설명할 수 있는가
- 서명 대상이 `authData || hash(clientDataJSON)`이라는 점과, 그래서 origin과 challenge 위조가 왜 불가능한지
- attestation과 assertion의 목적 차이, attestation을 `none`으로 둘 수 있는 경우
- 패스키, discoverable credential, WebAuthn, FIDO2의 관계 정리
- sign counter 역행을 즉시 차단하지 않고 신호로 다루는 이유

## 출처

- [Web Authentication: An API for accessing Public Key Credentials Level 3 — W3C Candidate Recommendation Snapshot, 2026-05-26](https://www.w3.org/TR/webauthn-3/)
- [WebAuthn L3 §7.1 Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)
- [WebAuthn L3 §7.2 Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
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
