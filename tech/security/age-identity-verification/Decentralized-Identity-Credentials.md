---
tags: [security, identity, did, verifiable-credentials, privacy, selective-disclosure]
status: done
verified_at: 2026-11-01
category: "보안(Security)"
aliases: ["Decentralized Identifier", "DID", "Verifiable Credentials", "검증 가능한 자격증명", "SSI", "자기주권 신원", "탈중앙 신원"]
---

# 탈중앙 신원과 검증 가능한 자격증명 (DID, VC)

DID(Decentralized Identifier)는 중앙 레지스트리, 신원 제공자와 인증기관에서 분리될 수 있게 설계한 식별자다. 설계상 DID의 controller는 다른 누구의 허락 없이 그 식별자의 통제를 증명할 수 있다. VC(Verifiable Credential)는 발급자가 주체에 관한 주장에 서명한 자격증명이고, 보유자가 보관했다가 검증자에게 제시한다. 두 명세는 독립적이어서 VC는 DID 없이도 쓸 수 있다. 연령 확인처럼 필요한 속성만 보이는 선택적 공개는 SD-JWT, ISO/IEC 18013-5, BBS 같은 보안 형식이 맡고, 같은 자격증명을 여러 번 제시했을 때 이어 붙일 수 있는 정도는 형식마다 다르다.

자기주권 신원(SSI)은 신원정보의 소유와 이용 권한을 신원 주체인 개인이 갖는다는 개념으로, 중앙집중식 신원증명과 대조된다(행정안전부, 경찰청 2021-05 발표). 구현은 아래의 W3C, IETF, ISO 규격과 지갑, 발급자 신뢰 체계를 조합해 만든다.

## 표준 상태

2026-11-01에 각 기구의 공식 페이지에서 확인한 상태다.

| 명세 | 기구 | 상태 |
|---|---|---|
| Decentralized Identifiers (DIDs) v1.0 | W3C | Recommendation, 2022-07-19 |
| DIDs v1.1 | W3C | Candidate Recommendation Snapshot, 2026-03-05 |
| DID Resolution | W3C | Candidate Recommendation Draft, 2026-10-30 |
| Verifiable Credentials Data Model (VC DM) v2.0 | W3C | Recommendation, 2025-05-15. v2.1은 Working Draft(2026-10-22) |
| VC Data Integrity 1.0, ECDSA와 EdDSA Cryptosuites v1.0, Controlled Identifiers v1.0, Bitstring Status List v1.0 | W3C | VC DM 2.0과 함께 2025-05-15 Recommendation |
| Securing Verifiable Credentials using JOSE and COSE | W3C | Recommendation, 2025-05-15(2026-10-13 재발행) |
| Data Integrity BBS Cryptosuites v1.0 | W3C | Candidate Recommendation Draft, 2026-09-10 |
| The BBS Signature Scheme | IRTF CFRG | Internet-Draft -14, RFC 아님 |
| Selective Disclosure for JWTs (SD-JWT) | IETF | RFC 9901, Proposed Standard, 2025-11 |
| SD-JWT-based Verifiable Digital Credentials (SD-JWT VC) | IETF OAuth WG | Internet-Draft -23, IESG Evaluation |
| ISO/IEC 18013-5 (모바일 운전면허, mDL) | ISO/IEC | 2021년판 발행, 개정판 DIS 진행 |
| OpenID for Verifiable Presentations (OpenID4VP) 1.0 | OpenID Foundation | Final, 2025-07-09 |

DID v1.1은 특정 DID method의 해석(resolution)을 DID Resolution 명세에 맡기고, 그 명세가 졸업 조건을 충족해야 v1.1도 Candidate Recommendation 단계를 벗어날 수 있다.

## DID와 DID document

DID는 `did:<method 이름>:<method별 식별자>`의 세 부분으로 된 문자열이다(명세 예시 `did:example:123456789abcdefghi`). DID가 식별하는 DID subject는 사람, 조직, 물리적이거나 디지털인 사물 등 거의 무엇이든 될 수 있다.

| 요소 | 의미 |
|---|---|
| DID document | DID subject를 설명하는 데이터. 공개키 같은 검증 방법(verification method)과 서비스를 담는다 |
| 검증 방법 | `id`, `type`, `controller`와 `publicKeyJwk`나 `publicKeyMultibase` 같은 검증 재료 |
| 검증 관계 | `authentication`은 주체가 인증받는 방법, `assertionMethod`는 VC 발급처럼 주장을 표현하는 방법이다. 검증자는 VC 증명에 쓰인 검증 방법이 발급자 DID document의 `assertionMethod`에 들어 있는지 본다 |
| 서비스 | 주체와 통신하거나 상호작용하는 엔드포인트. 명세는 개인정보 보호를 위해 이메일 주소나 개인 웹사이트 같은 공개 정보를 올리지 말라고 권한다 |
| controller | DID document를 바꿀 수 있는 주체 |
| DID method | 생성, 해석, 갱신, 비활성화 방법을 명세에 반드시 정한다. 갱신이나 비활성화가 불가능하면 그렇다고 밝힌다 |
| DID resolution | DID와 해석 옵션을 받아 DID document와 메타데이터를 돌려주는 과정이며 method의 Read 연산에 의존한다 |
| verifiable data registry | DID를 기록하고 DID document 생성에 필요한 데이터를 돌려주는 시스템. 명세는 분산 원장, 탈중앙 파일 시스템, 모든 종류의 데이터베이스, P2P 네트워크와 그 밖의 신뢰할 수 있는 저장소를 예로 든다 |

블록체인은 레지스트리 형태의 하나다. 명세의 개인정보 고려사항은 공개 레지스트리의 DID document에 개인정보를 넣지 말고, 변경할 수 없는 분산 원장에는 개인정보를 쓰지 말라고 권한다. 같은 DID나 같은 검증 방법을 여러 상대에게 쓰면 상관(correlation)에 쓰일 수 있어, 관계마다 다른 pairwise DID와 검증 방법을 쓰는 것이 완화책이다. 모든 서비스에 하나의 DID를 쓰면 그 DID가 서비스 사이를 잇는 공통 식별자가 된다.

## VC 2.0의 역할과 구조

| 역할 | 하는 일 |
|---|---|
| 발급자(issuer) | 주체에 관한 주장(claim)으로 VC를 만든다 |
| 보유자(holder) | VC를 보관하고 그로부터 VP(verifiable presentation)를 만든다. 명세의 비규범 절(8.2)은 보유자의 사용자 에이전트인 디지털 지갑이 보유자가 동의할 때만 검증자에게 정보를 내줄 것으로 기대한다 |
| 검증자(verifier) | VC를 그대로 또는 VP에 담긴 채로 받아 처리한다 |
| verifiable data registry | 식별자, 검증 재료와 스키마, 폐기 레지스트리 같은 관련 데이터의 생성과 검증을 중개한다. 신뢰할 수 있는 DB, 탈중앙 DB, 정부 신분 DB, 분산 원장이 예다 |

- VC는 변조를 검출할 수 있고 작성자를 암호학적으로 확인할 수 있는 자격증명이다. 적합한 문서는 하나 이상의 보안 방식으로 보호해야 한다. 증명을 문서 안에 넣는 embedded 방식은 VC Data Integrity 1.0을, 문서를 감싸는 enveloping 방식은 JOSE and COSE 명세를 따른다. 후자는 `application/vc+jwt`, `application/vc+sd-jwt`, `application/vc+cose` 같은 미디어 타입을 정의한다.
- `validFrom`과 `validUntil`로 유효 기간을, `credentialStatus`로 정지(suspension)나 폐기(revocation)를 알린다. Bitstring Status List는 여러 자격증명의 상태를 압축 전 16KB 이상(기본 131,072개 항목)인 비트열 하나에 묶어 군집 프라이버시를 노린다. 폐기는 되돌릴 수 없고 정지는 되돌릴 수 있다.
- 검증할 수 있다는 것이 주장이 참이라는 뜻은 아니다. 어느 발급자를 어떤 주장에 대해 믿을지는 검증자가 정한다. 명세는 그 결정 방법을 범위 밖으로 두고 ETSI Trusted Lists 같은 신뢰 목록을 예로 든다.

## 선택적 공개와 연결 가능성

선택적 공개는 보유자가 검증자에게 필요한 정보만 주는 성질이다. 연결 불가능성(unlinkability)은 같은 자격증명을 여러 번 제시해도 받는 쪽이 그 제시들을 이을 수 없는 성질이다. 앞의 것을 갖췄다고 뒤의 것이 따라오지는 않는다.

- **SD-JWT(RFC 9901)와 SD-JWT VC**: 발급자는 클레임 값 대신 Disclosure(salt, 클레임 이름, 값)의 digest를 서명하고, 보유자는 드러낼 클레임의 Disclosure만 보낸다. 발급자 서명이 든 자격증명, salt, Key Binding 키와 `iat` 같은 시각 클레임이 제시마다 같아서, 공모한 상대는 공개된 클레임이 없어도 같은 자격증명임을 알아본다. 같은 클레임의 자격증명을 묶음 발급(batch issuance)해 검증자나 세션마다 다른 것을 쓰면 검증자 사이의 연결을 줄일 수 있고, 이때 자격증명마다 새 Key Binding 키와 salt를 쓰고, `iat`, `exp`, `nbf` 같은 시각 클레임도 적절한 기간 안에서 무작위화하거나 그날 시작 시각으로 내리는 식으로 어림해야 한다(MUST). 그러나 검증자가 부주의하거나 공모, 침해, 강요로 제시 데이터를 발급자에게 넘기는 경우의 발급자와 검증자 사이 연결 불가능성은 salted hash 방식으로 달성할 수 없다(RFC 9901 10.1절).
- **ISO/IEC 18013-5의 모바일 문서(mdoc)**: CBOR 형식이고 발급자가 서명하는 데이터에 속성별 salted hash를 넣는다. EUDI ARF의 형식 비교 표(5.4.1)는 mdoc과 SD-JWT VC의 증명 유형을 함께 Embedded (Salted Hashes)로 분류하는데, 이는 위의 VC DM 2.0 구분과 다른 기준이다. VC DM 2.0과 JOSE and COSE 명세는 SD-JWT를 문서를 감싸는 enveloping 방식으로 본다. EUDI ARF는 salted hash 방식에서 발급자 연결 가능성을 완전히 없앨 수 없다고 본다.
- **BBS cryptosuite**: 발급자는 base proof를 보유자에게만 주고, 보유자가 공개할 문장을 골라 derived proof를 만든다. 같은 정보를 공개해도 서로 연결되지 않는 증명을 매번 새로 만들 수 있다. 그래도 서명된 메시지 수와 공개한 문장의 위치, 소수 보유자에게만 쓴 발급자 키, 개인별 고유 식별자와 `created` 같은 선택 필드, IP 주소 같은 네트워크 정보는 연결 단서로 남는다. 선택 기능인 Anonymous Holder Binding, Credential-Bound Pseudonyms와 그 조합은 at-risk 항목이어서, 의존하는 CFRG 초안이 같은 일정에 RFC가 되지 않거나 기능마다 독립 구현이 둘 이상 없으면 최종화 전에 빠진다. 가명은 `nym_domain`이 다르면 서로 연결되지 않고, 그 값은 사용 시나리오에 따라 검증자나 보유자가 정한다.

연령 확인에 적용하면, salted hash 방식은 발급 때 나눠 둔 클레임 단위로만 숨기거나 드러낸다. 생년월일만 담긴 자격증명으로는 생년월일을 드러내지 않고 성인 여부만 증명할 수 없어, 발급자가 성인 여부 같은 속성을 따로 담아 발급해야 한다. VC DM 2.0도 연령 확인에는 가능하면 생년월일 대신 ageOver 형태의 자격증명을 발급하도록 권하고, 최소 공개도 개인을 고유하게 식별하는 결과로 이어질 수 있다고 경고한다. 발급기관과 서비스가 서로를 모르는 double-blind 구조와 영지식증명은 [[Age-Assurance-Methods#프라이버시 보존 검증 (PET)|검증 방법론과 PET]]에서 다룬다. EUDI ARF는 salted hash 방식에서 발급자 연결 가능성을 줄일 유일한 실효 수단으로 영지식증명을 들지만, 아직 특정 방식을 고르지 않았고 현재 보안 하드웨어(WSCD)의 지원 부족을 장애로 든다.

## 검증 흐름

검증자가 제시를 받으면 대략 다음을 확인한다. 세부 절차는 형식과 생태계 규칙을 따른다.

1. 발급자 공개키를 얻는다. DID를 쓰면 DID resolution으로 DID document를 얻는다. SD-JWT VC 초안은 웹 기반 발급자 메타데이터 조회와 헤더의 X.509 인증서 체인(`x5c`)을 정의하고, 다른 생태계 규칙이 방법을 더할 수 있게 둔다. EUDI 생태계에서 PID(개인 식별 데이터)와 적격, 공공기관 속성 증명(QEAA, PuB-EAA)은 신뢰 목록(Trusted List, LoTE)에 든 신뢰 앵커와 X.509 PKI로 확인하고, 비적격 속성 증명은 검증자가 신뢰 앵커를 얻는 방법을 스스로 알아야 한다.
2. 서명과 무결성을 확인한다. SD-JWT는 받은 Disclosure의 digest가 서명 안에 있는지도 대조한다.
3. 발급자를 신뢰할지 정한다. 서명이 맞아도 그 발급자가 해당 주장을 보증할 주체인지는 검증자의 정책이다.
4. 유효 기간과 상태를 확인한다. 상태 확인 요청은 발급자에게 사용 사실과 시점을 흘릴 수 있다. Bitstring Status List는 프록시나 Oblivious HTTP 같은 조회 은닉과 캐시를 권하고, 자격증명마다 고유한 목록을 만드는 발급자를 추적 위험으로 든다. EUDI ARF에서는 24시간보다 오래 유효한 PID나 속성 증명에 발급자가 폐기 정보를 넣고, 유효 기간이 24시간 미만이면 넣지 않아도 된다.
5. 제시자가 정당한 보유자인지 확인한다(holder binding). VC 데이터 모델 자체에는 제시된 자격증명을 쓸 권한을 확인하는 장치가 없어 키 결합이나 강한 인증을 따로 둔다. SD-JWT의 Key Binding JWT는 자격증명의 `cnf`에 든 공개키에 대응하는 개인키로 `nonce`, `aud`, `sd_hash`를 서명해 신선도, 대상 검증자와 제시 내용을 묶는다. VC DM 2.0은 제시를 짧게 유지하고 검증자가 준 challenge에 묶도록 권하고(SHOULD), EUDI ARF는 검증자가 준 임의 데이터에 지갑이 서명하는 기기 결합(device binding)을 PID에는 필수로 구현하게 하고, 검증자가 그 서명을 확인하는 것은 권장 사항으로 둔다.
6. 주장을 업무 규칙으로 판단한다. 서명과 상태가 유효해도 모든 자격증명을 모든 맥락에 바꿔 쓸 수 있다는 뜻은 아니다.

블록체인 조회는 이 흐름의 필수 단계가 아니다. 1단계의 키 조회나 4단계의 상태 조회를 원장 기반 레지스트리로 하는 DID method나 시스템에서 블록체인이 개입한다.

## 단순화한 설명 바로잡기

- 검증이 블록체인에서 이뤄진다는 설명: 검증은 검증자가 발급자 키로 서명을 확인하고 발급자 신뢰, 상태, 보유자 결합을 판단하는 일이다. 블록체인은 키와 상태를 얻는 여러 경로 중 하나다.
- 개인키가 스마트폰 안에만 있어 누구도 강제로 가져갈 수 없다는 설명: EUDI ARF는 지갑 제공자가 키 보관 장치(WSCD)로 자신이 운영하는 HSM 같은 원격형, 스마트카드 같은 외부 로컬형, UICC, eSIM, 내장 보안 요소 같은 내부 로컬형, OS API로 쓰는 기기 고유형 가운데 어느 것이든 쓸 수 있게 한다. 이와 별개인 하드웨어 기반 키스토어는 비핵심 자산용이어서 보증 수준 High가 필요한 PID 개인키에는 쓸 수 없다. DID Core는 암호만으로는 비밀 키가 유출됐는지 알 수 없고, 비밀 키를 넘기면 통제 증명 수단도 함께 넘어간다고 적는다.
- 주민등록번호 유출을 끝낸다는 설명: 제시하는 속성을 줄일 수는 있다. 그러나 검증자가 받은 값을 저장하거나 필요 이상 요청하거나 서로 연결하는 위험은 형식 선택, 검증자 등록과 감독 같은 정책으로 따로 줄여야 한다.

## 남는 위험

| 위험 | 남는 이유 | 완화 수단 |
|---|---|---|
| 기기 분실과 도난 | 기기에 저장된 자격증명과 키를 공격자가 쓸 수 있다 | 화면 잠금, 지갑과 키 접근 인증, 별도 하드웨어 서명 장치(VC DM 2.0). EUDI ARF에서는 분실이나 도난이 지갑 제공자의 지갑 유닛 폐기 사유가 된다 |
| 키 저장소 | 보관 장치마다 추출 저항과 신뢰 경계가 다르다 | EUDI ARF는 지갑 제공자가 key attestation으로 개인키가 어느 장치에 있는지 발급자에게 증명하게 한다 |
| 악성 앱과 강요 | 위조되거나 변조된 지갑, 필요 이상 공개를 강요받는 보유자 | 지갑 인스턴스의 최근 무결성 점검을 반영하고 폐기 상태 조회용 참조를 담아 발급자가 확인하는 WIA(유효 기간 24시간 미만), 제시 전 사용자 승인(EUDI ARF), 보유자의 공유 기록 열람(VC DM 2.0 권고) |
| 발급자 신뢰와 폐기 | 서명 검증은 주장의 참을 보증하지 않고, 상태 조회가 사용 사실을 흘릴 수 있다 | 신뢰 목록, 군집 크기를 지킨 상태 목록과 조회 은닉. EUDI ARF는 폐기 확인을 권장하되 필수로 두지 않고, 신뢰할 상태 정보가 없으면 검증자가 위험을 분석하게 한다 |
| 검증자의 과다 요청과 연결 | 검증자가 필요 이상 요청하거나 받은 고정값을 모아 프로필을 만든다 | 꼭 필요한 정보만 요청(VC DM 2.0), EUDI의 검증자 등록과 등록 범위를 넘는 요청에 대한 지갑 경고, 지갑 솔루션이 필수로 지원하는 1회용(once-only)과 기간 한정(limited-time) 자격증명, 선택 지원인 순환 묶음(rotating-batch)과 검증자별(per-Relying Party) 자격증명, 위반 검증자의 접근 인증서 폐기 |

## 적용 사례

### EU 디지털 신원 지갑 (EUDI Wallet)

- Regulation (EU) 2024/1183이 eIDAS(Regulation (EU) No 910/2014)를 개정해 지갑을 도입했고 2024-05-20 발효했다. 회원국은 지갑의 핵심 기능과 인증에 관한 시행규칙을 기준으로 24개월 안에 시민에게 최소 하나의 지갑을 제공해야 하며, 집행위원회는 그 시점을 2026년 말로 안내한다. 민간 의존 당사자의 수용 의무는 [[FIDO-WebAuthn#표준과 규정의 층위|FIDO2, WebAuthn의 표준과 규정 층위]]에서, 연령 확인 블루프린트는 [[Age-Verification-Regulation|규제 지형]]에서 다룬다.
- Architecture and Reference Framework(ARF)는 ISO/IEC 18013-5, SD-JWT VC, W3C VCDM 2.0을 속성 증명 형식으로 들고, 지갑 유닛은 앞의 두 형식을 지원한다. VCDM 2.0 지원은 선택이며 비적격 속성 증명(EAA) 전용이다. 발급은 OpenID4VCI(HAIP 프로필), 근접 제시는 ISO/IEC 18013-5를 쓴다. 원격 제시는 OpenID4VP(HAIP 프로필)나 ISO/IEC 18013-7로 하며, OpenID4VP는 SD-JWT VC와 ISO/IEC 18013-5 형식을 모두 제시할 수 있고 ISO/IEC 18013-7은 ISO/IEC 18013-5 형식에만 쓴다. 지갑은 속성을 제시하기 전에 사용자 승인을 받는다.
- ARF는 구현을 돕는 참고 문서로 법적 구속력이 없고, 의무 요건은 규정과 채택된 시행, 위임 법령뿐이다.

### 한국 모바일 신분증

- 행정안전부 연혁 기준으로 모바일 공무원증(2021-01), 모바일 운전면허증(2022-01 시범, 2022-07 정식), 모바일 국가보훈등록증(2023-06 시범, 2023-08 정식), 모바일 재외국민신원확인증(2024-07), 모바일 주민등록증(2024-12 시범, 2025-03 정식), 모바일 외국인등록증(2025-01), 모바일 장애인등록증(2026-01)이 도입됐다.
- 모바일 운전면허증과 모바일 주민등록증은 실물 신분증과 같은 효력을 갖는다. 2022-07-28과 2025-03-13 발표 기준으로는 각각 본인 명의 단말기 1대에만 발급되고 분실 신고 때 잠긴다. 모바일 주민등록증은 2025-03-28부터 주소지와 관계없이 모든 주민센터와 정부24에서 신청할 수 있게 됐다(2025-03-13 발표 기준).
- 행정안전부는 블록체인 기반 분산 ID로 신원정보를 스마트폰 안에 보관하고 블록체인으로 진위를 확인하며, 서비스 제공자에게 성인 여부처럼 필요한 정보만 골라 제공할 수 있다고 안내한다. 모바일 신분증 이용약관(2022-01-23 적용)은 DID를 이용자 단말기 안에서 개인키로 생성, 저장되며 지갑을 식별하는 정보로, 공개키를 블록체인으로 신분증 유효성을 검증하는 정보로 정의한다. 서비스는 이용자의 개인키를 따로 보관하거나 관리하지 않는다(제18조). 이 안내와 약관만으로는 W3C DID, VC 형식을 따르는지 판단할 수 없다.

## 인증과 자격증명 제시의 차이

[[FIDO-WebAuthn|WebAuthn]] 인증은 RP가 등록 때 받아 둔 공개키로 그 RP가 낸 challenge의 서명을 확인해, 등록한 사용자가 돌아왔음을 증명한다. 자격증명은 RP ID에 묶이고, attestation은 인증기의 속성을 증명할 뿐 사용자의 나이 같은 속성을 보증하지 않는다. VC 제시는 제3자 발급자가 서명한 속성을 검증자가 발급자 키로 확인하고 holder binding으로 제시자를 확인한다. 같은 자격증명이 여러 검증자에게 가므로 위의 연결 가능성 문제가 생긴다. 서비스가 직접 알 수 없는 속성(성인 여부, 자격 보유)에는 제시를, 재방문 로그인에는 인증을 쓰고, 가입 때 속성을 확인한 뒤 패스키를 등록하는 식으로 조합할 수 있다.

## 설계 체크포인트

- 연령 확인을 설계할 때 발급 형식이 성인 여부 같은 속성을 따로 담는지, 생년월일을 드러내야 하는지 먼저 확인한다.
- SD-JWT VC와 ISO/IEC 18013-5는 묶음 발급과 1회용 사용으로 검증자 사이의 연결을 줄일 수 있으나, 발급자와 정보를 공유하는 검증자에게는 연결 가능성이 남는다. BBS는 서명값으로 이어지는 연결을 줄이지만 2026-11-01 기준 W3C 권고안이 아니다.
- 상태 조회가 발급자에게 사용 사실을 흘리지 않는지, 검증자가 받은 고정값을 언제 버리는지 정한다.
- 서명 검증, 발급자 신뢰, 상태, 보유자 결합을 각각 다른 검사로 다룬다. 하나가 통과했다고 나머지를 생략하지 않는다.

## 출처

- [W3C, Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C, Decentralized Identifiers (DIDs) v1.1](https://www.w3.org/TR/did-1.1/)
- [W3C, Decentralized Identifiers (DIDs) v1.1 발행 이력](https://www.w3.org/standards/history/did-1.1/)
- [W3C, DID Resolution 발행 이력](https://www.w3.org/standards/history/did-resolution/)
- [W3C, Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C, Verifiable Credentials Data Model v2.1 발행 이력](https://www.w3.org/standards/history/vc-data-model-2.1/)
- [The Verifiable Credentials 2.0 family of specifications is now a W3C Recommendation — W3C](https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/)
- [W3C, Securing Verifiable Credentials using JOSE and COSE](https://www.w3.org/TR/vc-jose-cose/)
- [W3C, Securing Verifiable Credentials using JOSE and COSE 발행 이력](https://www.w3.org/standards/history/vc-jose-cose/)
- [W3C, Bitstring Status List v1.0](https://www.w3.org/TR/vc-bitstring-status-list/)
- [W3C, Data Integrity BBS Cryptosuites v1.0](https://www.w3.org/TR/vc-di-bbs/)
- [W3C, Data Integrity BBS Cryptosuites v1.0 발행 이력](https://www.w3.org/standards/history/vc-di-bbs/)
- [IRTF CFRG, The BBS Signature Scheme (draft-irtf-cfrg-bbs-signatures)](https://datatracker.ietf.org/doc/draft-irtf-cfrg-bbs-signatures/)
- [IETF, RFC 9901 Selective Disclosure for JSON Web Tokens (SD-JWT)](https://www.rfc-editor.org/rfc/rfc9901.html)
- [IETF, SD-JWT-based Verifiable Digital Credentials (draft-ietf-oauth-sd-jwt-vc)](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/)
- [ISO, ISO/IEC 18013-5:2021 Mobile driving licence (mDL) application](https://www.iso.org/standard/69084.html)
- [ISO, ISO/IEC DIS 18013-5 Mobile driving licence (mDL) application](https://www.iso.org/standard/91081.html)
- [OpenID Foundation, OpenID for Verifiable Presentations 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [European Commission, EUDI Wallet Architecture and Reference Framework v3.0.0 (1장, 4장, 5장, 6장, 7장)](https://eudi.dev/3.0.0/main/)
- [The legal and technical road to EU Digital Identity Wallets — European Commission](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/915931903/The+legal+and+technical+road+to+EU+Digital+Identity+Wallets)
- [European Digital Identity (EUDI) Regulation — European Commission](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation)
- [모바일 신분증 업무안내 — 행정안전부](https://www.mois.go.kr/frt/sub/a06/b04/mobileId/screen.do)
- [모바일 신분증 홈페이지 이용약관 — 행정안전부](https://www.mobileid.go.kr/mip/hps/accter/selectAccterDetail.do)
- [연말부터 모바일 운전면허증 시범 시행…내년 전국 확대 — 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148886928)
- [최초의 모바일 운전면허증 전국 발급 개시 — 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148904697)
- [모바일 주민등록증 전국 발급 개시…관공서, 은행 등 사용 가능 — 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148940495)

## 관련 문서

- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (개요)]]
- [[Age-Assurance-Methods|검증 방법론과 PET (double-blind와 영지식증명)]]
- [[Age-Verification-Regulation|규제 지형 (EU 연령 확인 블루프린트와 EUDI Wallet)]]
- [[FIDO-WebAuthn|FIDO2, WebAuthn (인증 프로토콜, eIDAS의 지갑 수용 의무)]]
- [[Identity-Verification-Processor-Risk|제3자 위탁 리스크 (검증자가 받은 데이터의 보관)]]
- [[JWT|JWT (SD-JWT의 바탕인 서명 토큰)]]
- [[Public-Key-Cryptography|공개키 암호 (디지털 서명과 PKI)]]
- [[HSM-Key-Custody|HSM과 서명 키 관리 (발급자 서명 키 보관)]]
- [[Blockchain-Replication-and-Consensus-Cost|블록체인의 복제와 합의 비용 (원장을 레지스트리로 쓸 때의 비용)]]
