---
tags: [security, auth, fido, webauthn, passkey]
status: done
verified_at: 2026-10-11
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
- **패스키의 피싱 저항은 패스키를 거치는 경로에만 적용된다** — 계정 생성, 로그인과 복구에 피싱 가능한 수단이 남으면 그 경로는 여전히 피싱에 노출되므로, 전면 방지는 비밀번호 로그인과 약한 복구 수단까지 없애는 단계다. 그 단계에서도 피싱 저항이 아닌 대체 인증(이메일 매직 링크, 사용자 코드를 쓰는 device flow나 CIBA), 인증이 약한 외부 IdP와 세션 탈취가 남는다. 탈취된 세션 토큰은 패스키가 막지 못하므로 세션을 기기 키에 묶는 DBSC나 토큰을 클라이언트 키 쌍에 묶는 [[OAuth2#DPoP: access token을 클라이언트 키에 묶기|DPoP]] 같은 sender-constrained 방식과 [[Session|세션 하이재킹]] 방어를 함께 둔다. DPoP 키를 내보낼 수 없게 보관하면 공격자가 키를 빼내 임의의 proof를 만드는 것은 막는다. 그러나 공격자가 클라이언트 실행 맥락에서 코드를 실행하면(XSS 등) 온라인 동안 새 proof를 만들어 공격자 기기에서 쓸 수 있고, 미래 시각의 proof를 미리 만들어 빼내거나 사용자 상호작용 없는 인가 요청으로 토큰을 자기 키에 묶으면 클라이언트가 오프라인이어도 쓸 수 있다(RFC 9449 11.4절).

## 패스키와의 관계

패스키는 FIDO 표준 기반 인증 자격증명을 사용자 관점에서 부르는 이름이다. FIDO Alliance는 기기를 잠금 해제하는 것과 같은 방식(생체, PIN, 패턴)으로 앱과 웹사이트에 로그인하게 해주는 자격증명으로 정의하고, 클라우드로 동기화되는 synced passkey와 한 기기를 벗어나지 않는 device-bound passkey로 구분한다. WebAuthn 스펙은 전자를 multi-device credential이라 부르며 흔히 synced passkey로 통칭된다고 적는다. FIDO Alliance는 2012년 결성된 업계 단체이며, Apple, Google, Microsoft는 창립 회원이 아니고 2022-05-05 패스키 지원 확대(여러 기기에서 재등록 없이 패스키 사용, 휴대폰의 FIDO 인증으로 가까운 기기에 로그인)를 공동 발표했다.

기술적으로는 discoverable credential(예전 명칭 resident key)이 핵심이다. 아이디를 먼저 입력하지 않아도 인증기가 자격증명을 찾아 `userHandle`을 반환하는 흐름이 가능하다. 서버는 이 값과 등록된 계정 및 자격증명의 연결을 검증한다. 패스키는 별도 프로토콜이 아니며, 모든 패스키가 동기화되는 것도 아니다.

## 보안성과 사용자 통제권을 따로 평가한다

2026-10-12의 패스키 비판과 10-15의 반론을 함께 연결한다. 2026-10-16에 두 논쟁 글과 WebAuthn의 attestation 개념을 대조했다. 아래는 판단 축이며 모든 제공자의 동작을 시험한 결과가 아니다.

| 축 | 확인할 질문 |
| --- | --- |
| 피싱 저항 | RP ID와 origin 검증을 지키는가? 비밀번호와 TOTP 복구 경로는 어떤 위험을 남기는가? |
| 인증기 증명 | RP가 어떤 attestation을 요구하고 어떤 인증기를 수락하는가? `none`도 수락하는가? |
| 이동과 복구 | 동기화 제공자 변경, 기기 분실, 복수 패스키 등록과 계정 복구가 가능한가? |

WebAuthn attestation은 인증기의 속성과 출처를 증명하는 장치다. 이를 브라우저 확장 목록이나 OS 변조 여부 전부를 검사하는 기능과 동일시하지 않는다. 일반적인 동기화 패스키가 `none`을 반환한다는 구현 설명과, 기업이 승인 인증기를 요구할 수 있다는 정책 가능성도 서로 다른 층위다.

하드웨어 보안키에도 attestation이 있을 수 있으므로 보안키 선택만으로 증명을 피한다고 단정할 수 없다. 반대로 피싱 저항이 있다는 이유로 이전과 복구의 마찰을 무시해서도 안 된다. TOTP의 이전 편의와 실시간 피싱 위험을 함께 비교한다. 실제 도입에서는 대상 서비스와 기기 조합을 시험한다.

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

## 표준과 규정의 층위

| 구분 | 성격 | 다루는 것 | 인증과의 관계 |
|---|---|---|---|
| FIDO2 (WebAuthn, CTAP) | 기술 표준. WebAuthn은 W3C, CTAP는 FIDO Alliance가 정한다 | 공개키 기반 사용자 인증 프로토콜 | 피싱 저항 인증을 구현하는 수단이며 표준 자체가 법적 의무를 만들지 않는다 |
| eIDAS (Regulation (EU) No 910/2014, 2024/1183 개정) | 회원국에 직접 적용되는 EU 규정 | 전자 식별(eID) 수단의 회원국 간 인정 조건, 전자서명 같은 신뢰 서비스의 법적 틀, 2024/1183 개정 뒤의 European Digital Identity Wallet(EUDI Wallet) | 국내법이나 행정 관행상 eID가 필요한 공공 부문 기관의 온라인 서비스에서, 의무적 상호 인정은 eID 수단이 집행위원회가 제9조에 따라 공표한 목록의 eID 체계로 발급됐고, 그 보증 수준이 substantial 또는 high이면서 해당 공공 기관이 요구하는 수준 이상이며, 그 기관이 해당 서비스에 substantial 또는 high를 쓸 것을 조건으로 한다(제6조 제1항) |
| HIPAA (45 CFR Part 160, 164) | 미국 연방법과 HHS 규정 | covered entity와 business associate의 PHI 보호(Privacy Rule, Part 164 Subpart E)와 전자 PHI(ePHI) 보안(Security Rule, Subpart C) | 접근 주체가 주장한 당사자인지 확인하는 절차를 요구하고 기술은 지정하지 않는다(164.312(d)) |

FIDO는 기술 표준이고 eIDAS와 HIPAA는 법규라서, 규정이 요구하는 조건을 FIDO 도입만으로 충족했다고 보지 않는다. 아래는 인증 설계와 직접 맞닿는 조항만 다룬다.

eIDAS의 회원국 간 eID 상호 인정 의무(제6조 제1항)는 국내법이나 행정 관행상 eID를 요구하는 공공 부문 기관의 온라인 서비스에 적용되므로, 민간 서비스가 다른 회원국의 eID를 받아야 할 의무는 이 조항에서 나오지 않는다(공공 서비스를 위임받은 민간 주체는 그 위임으로 활동할 때 공공 부문 기관으로 본다, 제3조 제7호). 민간 쪽 의무는 2024/1183이 도입한 EUDI Wallet에 걸린다. 법이나 계약으로 온라인 식별에 강한 사용자 인증(strong user authentication)이 요구되는 민간 의존 당사자는 은행, 금융 서비스, 보건, 교통, 에너지, 통신 등의 분야를 포함해 제5a조 제23항과 제5c조 제6항의 시행규칙이 발효한 날부터 36개월 안에, 이용자가 자발적으로 요청하면 지갑을 받아야 하며 영세기업과 소기업은 제외된다(제5f조 제2항). 초대형 온라인 플랫폼 제공자는 이용자 인증을 요구하면, 이용자가 자발적으로 요청할 때 인증을 요청한 해당 서비스에 필요한 최소 데이터에 한해 지갑을 인증 수단으로 받고 그 사용을 지원해야 한다(제5f조 제3항). 지갑의 연령 확인 활용은 [[Age-Verification-Regulation|연령 검증 규제 지형]]에서 다룬다.

HIPAA Security Rule은 covered entity와 business associate가 다루는 ePHI에 적용되므로(164.302, 두 주체의 정의는 160.103), 이 정의 밖의 소비자 헬스 앱에는 Security Rule이 적용되지 않을 수 있다. 인증 표준(164.312(d))은 ePHI에 접근하려는 사람이나 주체가 주장한 당사자인지 확인하는 절차를 구현하라고 정하고, 164.306(b)는 규모와 복잡성, 기술 기반과 보안 역량, 비용, 위험의 발생 가능성과 중대성을 고려해 합리적이고 적절한 보안 조치를 고르게 한다. 현행 문언은 MFA나 FIDO 같은 특정 기술을 지정하지 않으므로 FIDO는 이 표준을 구현하는 선택지의 하나다. 2025-01-06 공고된 개정안(NPRM, 90 FR 898)은 예외를 둔 MFA 배치 의무를 제안했지만, 2026-10-06 eCFR 기준 164.312는 2013년 개정 문언 그대로다.

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
- 개인키가 기기를 떠나지 않는다는 설명이 device-bound passkey에만 맞는 이유(synced passkey는 패스키 제공자를 거쳐 종단 간 암호화로 동기화)를 말할 수 있는가
- 피싱 저항이 남은 비밀번호, 복구 경로와 세션 탈취까지 막지 않는 이유, 그리고 FIDO 도입과 eIDAS, HIPAA 준수를 구분해 각 규정이 인증에 요구하는 것

## 출처

- [Passkeys are a trap. Do not use them. — Nonfunctional](https://nonfunctional.substack.com/p/passkeys-are-a-trap-do-not-use-them) (사용자 통제권에 관한 논쟁)
- [Passkeys Are Not a Trap — Scott Helme](https://scotthelme.co.uk/passkeys-are-not-a-trap/) (인증기 증명과 피싱 저항에 관한 반론)

2026-10-03 부분 검증: W3C Level 3의 UP/UV, attestation 유형, related origins, §7.1/7.2의 자격증명과 계정 연결 및 백업 플래그 조건, FIDO Alliance의 패스키 구분을 대조했다. 인증 획득 경험의 재검증이나 특정 브라우저와 라이브러리의 지원 검증은 포함하지 않았다.

2026-10-11 부분 검증: FIDO Alliance의 2013 출범 보도자료와 2022 공동 발표, 패스키 페이지의 동기화 구분, 2025 백서의 잔여 위험, RFC 9449의 DPoP 보안 한계, eIDAS 원문(제1조, 제6조)과 2024-10-18 통합본(제3조, 제5f조), eCFR 2026-10-06 판 45 CFR 160.103, Part 164 Subpart C와 E 제목, 164.302, 164.306, 164.312와 Security Rule 개정안(NPRM)을 대조했다. HHS 안내 페이지는 접근이 막혀 규정 원문으로 확인했고, EUDI Wallet의 기술 사양은 확인하지 못했다.

- [Web Authentication: An API for accessing Public Key Credentials Level 3 — W3C Recommendation, 2026-08-25](https://www.w3.org/TR/webauthn-3/)
- [WebAuthn L3 §7.1 Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)
- [WebAuthn L3 §7.2 Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
- [WebAuthn L3 §5.11 Using Web Authentication across related origins](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)
- [WebAuthn L3 §13.4.3 Cryptographic Challenges](https://www.w3.org/TR/webauthn-3/#sctn-cryptographic-challenges)
- [WebAuthn L3 §13.4.9 Validating the origin of a credential](https://www.w3.org/TR/webauthn-3/#sctn-validating-origin)
- [FIDO Alliance — Specifications Overview (FIDO2, WebAuthn, CTAP)](https://fidoalliance.org/specifications/)
- [FIDO Alliance — Passkeys](https://fidoalliance.org/passkeys/)
- [Lenovo, Nok Nok Labs, PayPal, and Validity Lead an Open Industry Alliance to Revolutionize Online Authentication — FIDO Alliance, 2013-02-12](https://fidoalliance.org/assets/downloads/FIDO_Alliance_launch__FINAL__02_12_13docx.pdf)
- [Apple, Google and Microsoft Commit to Expanded Support for FIDO Standard to Accelerate Availability of Passwordless Sign-Ins — FIDO Alliance, 2022-05-05](https://fidoalliance.org/apple-google-and-microsoft-commit-to-expanded-support-for-fido-standard-to-accelerate-availability-of-passwordless-sign-ins/)
- [Passkeys: The Journey to Prevent Phishing Attacks, Part 3. Full Prevention — FIDO Alliance, 2025-03](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt3.pdf)
- [RFC 9449 OAuth 2.0 Demonstrating Proof of Possession (DPoP) (§11.4 Untrusted Code in the Client Context)](https://www.rfc-editor.org/rfc/rfc9449.html)
- [Regulation (EU) No 910/2014 원문 (EUR-Lex, 제1조, 제6조)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0910)
- [Regulation (EU) No 910/2014 통합본 2024-10-18 (EUR-Lex, 2024/1183 개정 반영, 제3조, 제5a조 제23항, 제5c조 제6항, 제5f조)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02014R0910-20241018)
- [45 CFR Part 160 (eCFR, 2026-10-06 판 대조, 160.103 정의)](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-160)
- [45 CFR Part 164 (eCFR, 2026-10-06 판 대조, Subpart C와 E 제목, 164.302, 164.306, 164.312)](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164)
- [HIPAA Security Rule To Strengthen the Cybersecurity of Electronic Protected Health Information (Federal Register, 90 FR 898, 2025-01-06, NPRM)](https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information)
- [생각보다 쉬웠던 오픈소스 기여하기 — 본인 블로그 (FIDO 규격 미준수 이슈 제기와 반영)](https://dc-choi.tistory.com/69)

## 관련 문서

- [[FIDO-Seminar|FIDO, 패스키 세미나]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[Password-Hashing|패스워드 해싱]]
- [[Age-Verification-Regulation|연령 검증 규제 지형 (eIDAS 2.0 연계 연령 확인과 EUDI Wallet)]]
