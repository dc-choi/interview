---
tags: [palantir, foundry]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
---

# Passkey 등록과 계정 복구

## 인증 경로

Enrollment는 기존 identity provider의 SSO를 사용하거나 일부 Developer Tier/Bootcamp에서 Palantir self-service directory를 사용한다. 후자는 FIDO2 passkey 기반이다. 서버는 공개키를 보관하고 authenticator가 challenge를 개인키로 서명한다. 개인키 자체를 서버에 보내 인증하는 방식이 아니다.

초대 메일의 one-time password로 시작해 전화번호를 SMS/통화로 검증하고 passkey를 등록한다. 기존 enrollment 초대와 새 enrollment 생성의 약관/복구 경로는 다를 수 있다. Passkey를 허용하지 않는 조직 환경에서는 self-service 계정 생성 자체가 불가능할 수 있다.

## Credential store와 기기

어떤 authenticator를 쓸 수 있는지는 directory의 보안 정책이 정한다. Recommended나 Government profile을 쓰는 directory는 자격을 갖춘 hardware passkey만 받으므로, 기기나 비밀번호 관리자를 고르기 전에 enrollment 관리자에게 허용 유형을 확인한다. 정책이 허용하는 범위 안에서 현재 기기의 Windows Hello/Chrome/iCloud 등, 별도 mobile 또는 hardware security key를 선택할 수 있다. QR 기반 다른 기기 인증에는 Bluetooth와 지원 OS/browser가 필요하다. 기본 제안 store를 반드시 선택할 필요는 없다.

검증일 기준 계정당 최대 4개, credential store당 하나의 passkey를 등록할 수 있다. 정책이 백업 credential을 허용하면 허용된 passkey를 최소 두 개 준비하고, hardware passkey만 받는 directory에서는 승인된 예비 hardware key를 백업으로 둔다. 관리자가 복구 과정에서 보는 이름에는 개인 정보를 넣지 않는다. 여러 기기에서 쓸 수 있는지는 device-specific 여부, sync와 autofill provider 설정에 달려 있다.

Passkey를 삭제할 때는 platform 등록과 원래 credential store 양쪽에서 지운다. Store에 이전 항목을 남기면 같은 store의 새 등록이 실패할 수 있다. 서버의 등록 해제만으로 기기 항목이 사라지는 것은 아니다.

## 실패 분류와 복구

전체 passkey를 잃었으면 enrollment 생성자는 login 화면의 Reset passkey를 쓰며 enrollment에 따라 즉시 처리되거나 검토로 넘어간다. 기존 enrollment 초대 사용자는 관리자 복구를 따른다. 복구를 위해 enrollment administrator를 둘 이상 두는 것이 권장된다. OTP가 만료된 경우도 생성자/초대 사용자에 따라 지원 요청 경로가 다르다.

등록 실패는 인증 timeout, Bluetooth, 기존 store 항목, 화면 잠금과 credential store 활성화 여부를 확인한다. 최신 iOS와 한 이전 버전, Android 13 이상이라는 문서 기준과 실제 사용하는 browser 지원을 함께 확인한다. 기기 문제인지 플랫폼 문제인지 가르려면 webauthn.io에서 등록과 로그인을 시험한다. 실패하면 기기나 browser 쪽 문제일 가능성이 크지만, 성공해도 directory가 그 authenticator를 허용한다는 뜻은 아니다.

예전에는 되던 로그인이 실패하면 이메일 도메인 제한과 authenticator 정책 변경도 확인한다. 도메인 제한은 상세 설명 없는 일반 로그인 실패로만 보일 수 있다. 정책이 hardware key만 허용하면 device passkey는 등록 후에도 부적합해질 수 있으며, 이때는 passkey가 보안 요건을 충족하지 않는다는 오류가 나타난다. 등록, 기기 지원 조건과 백업 권장은 2026-11-08 login 문서 전체와 다시 대조했다. 전화번호는 enrollment당 한 번만 사용할 수 있다.

## Passkey profile 변경과 관리자 잠금 방지

2026-10-30 기준, self-service directory의 commercial enrollment 중 활성화된 곳에서 profile을 관리한다. 변경에는 Enrollment administrator 또는 Authentication administrator 역할과 인증 설정 편집 권한이 필요하다. 정책은 신규/기존 credential에 적용하며, 이전 전까지는 기존 allowlist가 유효하다.

| Profile | 허용 범위 |
|---|---|
| Permissive | FIDO MDS 인증기와 별도로 유지하는 소프트웨어 인증기/비밀번호 관리자 집합 |
| Standard | MDS 인증기와 더 좁은 Google, Apple, Microsoft 소프트웨어 인증기 집합 |
| Recommended | MDS의 FIDO 인증 하드웨어 기반 인증기, 소프트웨어/동기화 인증기 제외 |
| Government | Recommended보다 제한적인 하드웨어 인증기 집합 |
| Custom | 기본 profile에 AAGUID를 추가/제외. 기본 집합의 변경도 반영 |

**Check impact는 저장이나 결과 예약이 아니다.** 일부/전체 passkey를 잃는 사용자를 구분하고, 관리자 자신의 대체 passkey를 등록/시험한 뒤 다시 확인한다. 저장 때 재평가하며 변경 사유가 감사에 남는다. `Enforce anyway`도 실행 관리자의 마지막 허용 passkey를 없애는 변경을 허용하지 않는다. 미리보기는 passkey 등록 사용자를 집계하며 조회 권한에 따라 표시 표본은 더 작을 수 있다.

AAGUID만으로 하드웨어 진위를 증명하지 못한다. Custom 추가로 보안 차단이나 필요한 attestation 부재를 우회할 수 없으며, 신뢰할 metadata를 불러오지 못하면 평가는 실패한다.

이 절은 2026-10-30에 수집 본문과 공식 페이지의 검색 색인 본문으로 확인했고(당시 직접 URL 열기는 실패), 2026-11-08 공식 페이지를 직접 열어 내용이 유지됨을 다시 확인했다. 실제 정책 변경은 시험하지 않았다.

## Government profile과 FIPS, AAL3 요건

Government는 FIPS나 AAL3 요건이 있는 directory에서 쓰는 authenticator 선택 정책이다. Government 구성 안내는 이 profile이 제공되는 commercial과 government enrollment에 적용된다고 적는다(위 profile 관리 안내는 commercial enrollment 기준으로 설명한다). 이 Government 절 전체는 2026-11-09 공식 페이지와 Yubico 문서를 대조해 썼고 실제 기기 등록과 정책 변경은 시험하지 않았다. FIDO MDS 인증과 hardware metadata를 평가할 뿐이며, 이 profile을 고른다고 기기 구성이나 배포가 인증되지는 않는다. 인증서의 적용 범위와 나머지 인증, session, 복구 통제는 보안 관리자가 따로 확인한다.

2026-11-09 기준 Government 파생 조건은 Recommended의 요건에 더해, 같은 FIPS 개정판에 대한 MDS 근거로 FIPS overall level 1 이상과 physical-security level 3 이상을 요구한다. MDS 항목은 보조 근거일 뿐 인증서의 범위와 구성 요건 확인을 대신하지 않는다. MDS가 갱신되면 profile 소속도 바뀔 수 있으므로 기기 교체, firmware 갱신, 새 등록 실패 때 현재 적용 정책을 다시 본다.

구매나 등록 전 확인 순서는 다음과 같다.

1. 정확한 모델, hardware revision, firmware 버전과 운영 구성을 특정한다. 같은 제품군도 검증 범위가 다를 수 있다.
2. NIST CMVP validated modules 목록에서 해당 항목을 찾아 인증서 상태와 module security policy를 검토한다.
3. 인증서가 그 구성을 포함하는지, 요구되는 approved mode로 운용할 수 있는지 확인하고 vendor의 초기화와 구성 절차를 따른다.
4. 개인키가 hardware에 묶여 export되지 않는지, 배포가 요구하는 user verification을 지원하는지 확인한다. 터치로 확인하는 user presence만으로는 user verification이 아니다.
5. 현재 Government profile이 그 authenticator를 받는지 확인한다. CMVP 인증서만으로 profile 소속이 보장되지 않는다. Profile은 FIDO 인증, hardware 키 보호와 software, synced, compromised authenticator 제외도 함께 요구한다.

부적합한 기기를 Custom에 추가해도 FIPS나 AAL3 충족의 근거가 되지 않는다. Software 또는 self-attested credential은 표시 이름을 바꾸거나 AAGUID를 Custom에 넣어도 검증된 hardware가 되지 않는다. MDS에 있는 등록은 신뢰할 수 있는 attestation을 성립시켜야 하며 AAGUID 일치나 기기 이름으로는 부족하다. 쓸 수 있는 metadata snapshot을 불러오지 못하면 서비스 복구 뒤 재시도하거나 Palantir Support에 문의하고, 검증 실패를 피하려고 profile을 낮추지 않는다.

### 적용 순서와 복구 준비

정책을 조이기 전에 영향받는 관리자와 사용자를 파악하고 허용되는 교체 hardware, 해당 보증 수준에 맞는 복구 방법, 정책이 허용하면 보호된 예비 credential을 준비한다. 복구 이메일이나 one-time code만으로는 AAL3의 근거가 되지 않는다. 실행 관리자는 profile을 바꾸기 전에 허용되는 hardware passkey를 먼저 등록한다.

Control Panel의 Manage user directories에서 directory의 passkey policy 설정을 열고 Government 선택, Check impact로 영향 사용자 검토, Enforce로 확인 dialog 열기, 필수인 Reason for change 입력, Enforce 또는 Enforce anyway 순서로 진행한다. 변경은 profile-change audit event에 남는다.

사용자별로 approved 구성으로 authenticator를 초기화하고 PIN 같은 user verification을 설정한 뒤, add-passkey workflow로 초대를 보내고 제조사 attestation을 허용해 등록한다. 등록이 Government에서 성공했는지, 로그아웃 뒤 새 credential과 user verification으로 다시 로그인되는지 확인한다. 조직 평가에 필요한 인증서, 기기 구성과 등록 증거를 보관하고, 대체 접근을 확인한 뒤 이전 credential을 지운다.

Authenticator 선택은 보증 요건의 일부다. Verifier 구성, 보호된 통신, session 수명, 재인증, 계정 복구와 authenticator 교체 절차는 NIST SP 800-63B의 AAL 요건과 FedRAMP IA-05 같은 해당 인증 기준으로 따로 검토한다.

### YubiKey 5 FIPS 예시

Yubico 문서는 YubiKey 5 FIPS Series firmware 5.7.4를 FIPS 140-3 Level 2 인증 authenticator로, 5.4.2와 5.4.3을 FIPS 140-2 인증으로 구분한다. 두 계열은 검증과 초기화 절차가 달라 서로 바꿔 쓸 수 있는 범위로 보지 않는다. 5.7 계열은 FIPS approved mode가 꺼진 채 출고되고, FIDO2는 approved mode가 되기 전에는 credential을 만들지 않는다. 5.7.x FIPS 140-3 firmware는 FIDO2 PIN 8자 이상을 요구하고 user verification(alwaysUV)을 항상 강제한다. 2026-11-09 열람한 Yubico 문서는 5.4 계열의 FIPS 140-2 인증이 2026년 5월 Sunset List로 옮겨졌고 2026-09-22 Historical List로 옮겨질 예정이라고 적는다. NIST CMVP도 FIPS 140-2 인증서를 Historical List로 옮긴다고 안내하므로 실제 상태는 해당 CMVP 인증서 항목에서 확인하고, 기존 배포의 계속 사용은 보안 관리자와 검토한다.

### FedRAMP 예외

FedRAMP 관리자는 Recommended나 Government를 profile 예외 승인 없이 고를 수 있다. Standard, Permissive, Custom은 Palantir Support를 통한 FedRAMP change-review와 Security Compliance 승인이 필요하다. 승인은 MDS, Standard, Recommended를 합친 집합 안의 profile 예외와, 그 밖의 authenticator에 대한 별도 예외(첫 승인도 필요)로 나뉜다. 검사는 Custom 기본 profile에서 물려받은 것까지 유효 profile의 모든 authenticator에 적용되므로 넓은 기본 profile은 두 승인이 모두 필요할 수 있다.

승인은 enrollment별이며 승인만으로 directory에 저장된 profile이 바뀌지 않는다. 어느 승인도 attestation, 보안 제외, 관리자 권한과 관리자 잠금 방지를 면제하지 않는다. Standard 소속만으로 AAL2가 성립하지도 않는다.

## 출처

- [Palantir Foundry, Configure passkey profiles](https://www.palantir.com/docs/foundry/authentication/user-directory-passkey-profiles) — 2026-10-30 profile 범위, 영향 미리보기, 관리자 잠금 방지와 attestation 조건 대조.

- [Palantir Foundry, authentication](https://www.palantir.com/docs/foundry/getting-started/authentication/)
- [Palantir Foundry, login](https://www.palantir.com/docs/foundry/getting-started/login/)
- [Palantir Foundry, Configure hardware passkeys for FIPS and AAL3 requirements](https://www.palantir.com/docs/foundry/authentication/user-directory-passkey-government)
- [Yubico, YubiKey 5 FIPS Series Features](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-fips-specifics.html)
- [Yubico, YubiKey Firmware 5.7.x Changes for FIPS 140-3](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-fips-140-3.html)
- [NIST, SP 800-63B Authentication Assurance Levels](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
- [NIST, Cryptographic Module Validation Program](https://csrc.nist.gov/projects/cryptographic-module-validation-program)

## 관련 문서

- [[Palantir-Foundry-Operations]]
