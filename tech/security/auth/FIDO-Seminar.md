---
tags: [security, fido, passkey, authentication]
status: seminar
category: "보안(Security)"
aliases: ["FIDO 세미나"]
---

# FIDO&패스키(Passkey)

> 기록 범위: 아래 본문은 당시 세미나 메모다. 현재 설계와 면접 답변에는 마지막 `현재 정정`과 [[FIDO-WebAuthn|FIDO2, WebAuthn]] 정본을 우선한다.

## 기존인증의한계

### 패스워드
- 지식기반 인증 중 가장 많이 사용되지만, 길이만으로 안전성을 보장할 수 없음
- Password 매니저도 결국 서버에 패스워드를 저장하므로 유출 위험이 존재함

### OTP/SMS
- OTP는 피싱 과정에서 유출될 수 있음
- SMS 인증은 안전하지 않음 (SIM 스와핑, 중간자 공격 등)

## FIDO란?
- 서버에 저장된 회원정보가 유출되어도 안전한 인증 구조
- 생체정보는 디바이스 밖으로 절대 나가지 않음
- 생체인증은 본인 확인 수단일 뿐, 실제 인증은 공개키 기반 키페어로 수행함
- IAM(Identity & Access Management)까지 포괄하는 것을 목표로 함
- 제로트러스트 아키텍처가 FIDO 방식을 채택함

### 관련표준
- **U2F**: Universal 2nd Factor
- **CTAP**: Client to Authenticator Protocol
- **WebAuthn**: 웹 브라우저에서의 FIDO 인증 표준
- Apple, Google, Microsoft가 패스키 표준을 공동으로 추진 중
- 지속적으로 버전업 및 표준 재정립 진행 중

## 패스키(Passkey)
- FIDO가 추구하는 사용자 경험의 핵심
- 기기 분실 시 다른 기기로 백업 및 복원 가능
- 각 플랫폼 계정에 키를 동기화하여 사용
- 현재는 플랫폼(Apple/Google/MS)마다 따로 등록해야 하는 제약이 있음

### 구현시고려사항
- **UV**(User Verification): 기본값으로 설정
- **RK**(Resident Key): 필수
- **Attestation**: 일반 소비자 서비스는 `none`도 가능. 특정 보안 요구나 규제 때문에 인증기 출처를 검증해야 할 때 direct 또는 enterprise attestation을 검토
- **BS/BE flag**: WebAuthn에서 백업 상태 트래킹을 위해 필요
- **DPK**(Device Public Key): 동기화된 디바이스인지 확인하는 요소
- **UVPA**: 크로스 디바이스 인증 시 사용
- 복잡성이 추가되므로 표준 변화를 지속적으로 팔로업해야 함

## 핵심정리
- 보안을 위해서는 반드시 **다중인증(MFA)**을 사용할 것
- FIDO/패스키는 서버 유출에도 안전한 공개키 기반 인증
- 생체정보는 로컬 디바이스에서만 처리되고, 서버로 전송되지 않음
- FCP(FIDO Certified Professional) 자격증 취득 권고

## 현재 정정 (2026-08-26)

위 내용은 당시 세미나 메모다. 현재 설계와 면접 답변에는 [[FIDO-WebAuthn|FIDO2, WebAuthn]] 정본을 우선한다.

- **범위와 패스워드 매니저**: FIDO는 사용자 인증 표준이며 IAM 전체, 예를 들어 계정 수명주기, 권한 부여와 프로비저닝을 포괄하지 않는다. 패스워드 매니저의 동기화와 암호화 구조는 제품마다 다르므로, 서버가 사용자의 패스워드를 항상 저장한다고 일반화할 수 없다.
- **플랫폼별 재등록**: 패스키는 RP별로 등록되지만, synced passkey는 같은 passkey provider 계정의 다른 기기에 동기화될 수 있고, 없을 때는 cross-device authentication으로 다른 기기의 패스키를 사용할 수 있다. 따라서 플랫폼마다 항상 따로 등록해야 한다고 일반화할 수 없다.
- **UVPAA와 DPK**: UVPAA는 `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`로 user-verifying platform authenticator의 가용성을 확인하는 API이며, cross-device authentication 자체가 아니다. DPK는 현재 WebAuthn Level 3에 정의된 표준 확장이 아니므로, 동기화 기기 판별 요소로 일반화하지 말고 제품 지원과 별도 명세를 확인해야 한다.
- **MFA 여부**: FIDO나 WebAuthn 자체가 모든 인증을 자동으로 MFA로 만들지는 않는다. RP가 user verification을 요구하면 개인키 보유와 PIN 또는 생체 확인을 조합한 MFA가 가능하지만, 인증기 종류, UV 정책과 계정 복구 정책을 함께 정해야 한다.

## 현재 정정 출처

- [W3C, Web Authentication: An API for accessing Public Key Credentials Level 3](https://www.w3.org/TR/webauthn-3/)
- [FIDO Alliance, Passkeys](https://fidoalliance.org/passkeys/)
- [FIDO Alliance, User Authentication Specifications](https://fidoalliance.org/specifications/)
