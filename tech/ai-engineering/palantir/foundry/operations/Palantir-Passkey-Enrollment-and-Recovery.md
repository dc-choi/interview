---
tags: [palantir, foundry]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Passkey 등록과 계정 복구

## 인증 경로

Enrollment는 기존 identity provider의 SSO를 사용하거나 일부 Developer Tier/Bootcamp에서 Palantir self-service directory를 사용한다. 후자는 FIDO2 passkey 기반이다. 서버는 공개키를 보관하고 authenticator가 challenge를 개인키로 서명한다. 개인키 자체를 서버에 보내 인증하는 방식이 아니다.

초대 메일의 one-time password로 시작해 전화번호를 SMS/통화로 검증하고 passkey를 등록한다. 기존 enrollment 초대와 새 enrollment 생성의 약관/복구 경로는 다를 수 있다. Passkey를 허용하지 않는 조직 환경에서는 self-service 계정 생성 자체가 불가능할 수 있다.

## Credential store와 기기

현재 기기의 Windows Hello/Chrome/iCloud 등, 별도 mobile 또는 hardware security key를 선택할 수 있다. QR 기반 다른 기기 인증에는 Bluetooth와 지원 OS/browser가 필요하다. 기본 제안 store를 반드시 선택할 필요는 없다.

검증일 기준 계정당 최대 4개, credential store당 하나의 passkey를 등록할 수 있다. 최소 두 개의 독립 경로를 준비하고 관리자가 복구 과정에서 보는 이름에는 개인 정보를 넣지 않는다. 여러 기기에서 쓸 수 있는지는 device-specific 여부, sync와 autofill provider 설정에 달려 있다.

Passkey를 삭제할 때는 platform 등록과 원래 credential store 양쪽에서 지운다. Store에 이전 항목을 남기면 같은 store의 새 등록이 실패할 수 있다. 서버의 등록 해제만으로 기기 항목이 사라지는 것은 아니다.

## 실패 분류와 복구

전체 passkey를 잃었으면 enrollment 생성자는 self-service reset 또는 검토 요청을, 기존 enrollment 초대 사용자는 관리자 복구를 따른다. 복구를 위해 enrollment administrator를 둘 이상 두는 것이 권장된다. OTP가 만료된 경우도 생성자/초대 사용자에 따라 지원 요청 경로가 다르다.

등록 실패는 인증 timeout, Bluetooth, 기존 store 항목, 화면 잠금과 credential store 활성화 여부를 확인한다. 최신 iOS와 한 이전 버전, Android 13 이상이라는 문서 기준과 실제 사용하는 browser 지원을 함께 확인한다.

예전에는 되던 로그인이 실패하면 이메일 도메인 제한과 authenticator 정책 변경도 확인한다. 정책이 hardware key만 허용하면 device passkey는 등록 후에도 부적합해질 수 있다. 오류가 일반 로그인 실패로만 보일 수도 있다. 전화번호는 enrollment당 한 번만 사용할 수 있다.

## 출처

- [Palantir Foundry, authentication](https://www.palantir.com/docs/foundry/getting-started/authentication/)
- [Palantir Foundry, login](https://www.palantir.com/docs/foundry/getting-started/login/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
