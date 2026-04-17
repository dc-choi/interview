---
tags: [security, fido, passkey, authentication]
status: seminar
category: "보안(Security)"
aliases: ["FIDO 세미나"]
---

# FIDO&패스키(Passkey)

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
- **ATTR**(Attestation): none이면 안됨
- **BS/BE flag**: WebAuthn에서 백업 상태 트래킹을 위해 필요
- **DPK**(Device Public Key): 동기화된 디바이스인지 확인하는 요소
- **UVPA**: 크로스 디바이스 인증 시 사용
- 복잡성이 추가되므로 표준 변화를 지속적으로 팔로업해야 함

## 핵심정리
- 보안을 위해서는 반드시 **다중인증(MFA)**을 사용할 것
- FIDO/패스키는 서버 유출에도 안전한 공개키 기반 인증
- 생체정보는 로컬 디바이스에서만 처리되고, 서버로 전송되지 않음
- FCP(FIDO Certified Professional) 자격증 취득 권고
