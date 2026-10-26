---
tags: [security, auth, password-manager, bitwarden, 1password, credential]
status: done
verified_at: 2026-10-26
category: "Security - 인증"
aliases: ["Password Manager Selection", "비밀번호 관리자 선택", "패스워드 매니저 선택"]
---

# 비밀번호 관리자 선택

비밀번호 관리자는 서비스마다 다른 긴 비밀번호를 만들고 보관해 한 곳의 유출이 다른 계정의 credential stuffing으로 번지는 위험을 줄이는 도구다. 재사용을 피해야 하는 이유는 [[Auth-Method-Selection#비밀번호 재사용과 복구 경로|비밀번호 재사용과 복구 경로]]에서 다룬다. 이 문서는 어떤 도구를 고를지 판단하는 기준을 정리한다.

가격표부터 비교하면 금고가 어떻게 잠기는지, 잠금 수단을 잃었을 때 무엇이 남는지를 놓치기 쉽다. 잠금과 복구, 쓰는 기기, 공유 방식, 이전 가능성을 먼저 보고 비용은 마지막에 맞춘다.

## 금고가 잠기는 방식

두 제품 모두 데이터를 종단간 암호화해 서버에는 암호화된 사본을 둔다. 차이는 서버 사본을 여는 데 무엇이 필요한가다.

| 구분 | Bitwarden | 1Password |
|---|---|---|
| 암호화 위치 | 키 생성과 암호화를 기기에서 한다. 서버는 암호화된 금고의 저장과 동기화에 쓴다 | 계정의 모든 데이터를 종단간 암호화하고, 계정 비밀번호와 Secret Key를 합쳐 암호화 키를 만든다 |
| 서버에 가는 것 | 마스터 비밀번호와 늘린 마스터 키는 서버에 저장되거나 전송되지 않는다. 인증에는 마스터 비밀번호 해시를 보내고, 금고 키는 늘린 마스터 키로 암호화한 상태로 서버에 저장된다 | Secret Key는 1Password로 전송되지 않고 회사에 기록도 없다 |
| 키 유도 | 기본 PBKDF2 SHA-256 600,000회(설정 변경 가능), 계정 생성 뒤 Argon2id로 바꿀 수 있다 | PBKDF2-HMAC-SHA256을 쓰고, 기기에서 만든 34자, 128비트 엔트로피의 Secret Key를 함께 쓴다 |
| 잊었을 때 | 회사가 마스터 비밀번호를 복구할 수 없다. 비상 접근이나 기업용 계정 복구를 미리 설정하지 않았다면 잠긴다 | 누구도 비밀번호를 재설정할 수 없다. 가족 관리자나 팀 관리자의 계정 복구, 또는 미리 만든 복구 코드로 새 비밀번호를 정하며 이때 새 Secret Key가 발급된다. Secret Key 자체는 회사도 복구할 수 없어 Emergency Kit에 보관하며, 비밀번호를 잊었을 때 로그인하게 해 주는 백업 코드도 아니다 |

다음은 위 설계에서 도출한 해석이다. 마스터 비밀번호만으로 서버 사본을 여는 구조에서는 서버 사본이 유출됐을 때 비밀번호 강도와 키 유도 설정이 방어선이 된다. Secret Key를 더하는 구조는 서버 사본만으로는 추측 공격이 사실상 불가능해지는 대신 Secret Key의 보관과 새 기기 등록 절차를 관리해야 한다. 어느 쪽이든 금고 계정에 2단계 인증을 걸고 복구 수단을 금고 밖에 따로 둔다.

## 선택 기준

| 기준 | 확인할 질문 |
|---|---|
| 잠금과 복구 | 마스터 비밀번호나 기기를 잃으면 무엇으로 복구하는가? 비상 접근과 복구 키가 있는가? |
| 기기와 자동완성 | 쓰는 브라우저, 데스크톱 OS와 모바일을 모두 지원하는가? 패스키를 저장하고 쓸 수 있는가? |
| 공유 | 가족, 동료, 고객과 무엇을 어떤 단위로 공유하고 어떻게 회수하는가? |
| 계정 보호 | 금고 계정 자체에 쓸 수 있는 2단계 인증 수단은 무엇인가? |
| 이전 | 어떤 형식으로 내보내고, 어떤 항목이 빠지는가? |
| 검증 근거 | 소스 공개, 외부 감사와 인증 보고서가 있는가? |
| 비용 | 무료 범위와 유료로 넘어가는 조건은 무엇이고, 가격의 기준일은 언제인가? |

## 2026-10-26 기준 요금과 무료 범위

공식 요금 페이지 기준이며 달러, 연간 결제 가격이다. Bitwarden은 세금을 제외한 가격으로 표시한다. 가격과 포함 기능은 공지로 바뀌므로 결정 시점에 다시 확인한다.

| 상품 | 가격 | 포함 범위 |
|---|---|---|
| Bitwarden Free | 무료 | 기기와 비밀번호 수 제한 없음, 패스키 관리, 다른 사용자 한 명과 공유, 텍스트 Send, 개인 금고의 데이터 유출 보고서 |
| Bitwarden Premium | 월 1.65달러(연 19.80달러) | Password Manager 통합 인증기의 TOTP 코드 생성, 파일 첨부, 비상 접근, 나머지 금고 점검 보고서, 파일 Send |
| Bitwarden Families | 월 3.99달러(연 47.88달러), 최대 6명 | 구성원 전원 Premium, 공유와 컬렉션 제한 없음 |
| 1Password Individual | 할인가 월 2.99달러, 정가 월 3.99달러 | 사용자당 1GB 저장 공간, Watchtower |
| 1Password Families | 할인가 월 4.49달러, 정가 월 5.99달러 | 5명 포함, 가족 구성원 초대 |

1Password 요금 페이지에는 무료 플랜이 없고 두 플랜 모두 14일 무료 체험을 제공한다. 할인가는 1Password.com에서 직접 구독하는 신규 고객의 첫해 연간 결제에만 적용되며 앱 스토어 구매는 제외된다.

Bitwarden 무료 계정은 비밀번호와 패스키의 보관, 동기화와 한 명 공유를 다룬다. Password Manager 통합 인증기의 TOTP 코드 생성은 Premium이나 유료 조직에서 된다. 키 보관은 통합 인증기 도움말이 모든 계정에 허용한다고 적지만 Bitwarden Authenticator 도움말의 비교 표는 유료로 적어 페이지 사이 표기가 다르다. 별도 앱인 Bitwarden Authenticator는 Password Manager 계정 없이 누구나 쓸 수 있고 iOS와 Android 전용이다. 비상 접근, 파일 첨부와 대부분의 금고 점검 보고서는 Premium 범위다.

적용 제안: 무료로 시작한다면 복구와 상속에 해당하는 비상 접근과 2단계 인증 코드를 어디서 만들지 함께 정한다.

## 놓치기 쉬운 기능 차이

- **일회성 전달:** Bitwarden Send는 생성 시 암호화하고 수신자가 링크를 열 때 복호화한다. 최대 31일 뒤 삭제되며 만료일, 최대 열람 횟수와 비밀번호를 걸 수 있다. 텍스트 Send는 모든 사용자가 만들 수 있고 암호화 기준 1,000자까지다. 파일 Send는 Premium이나 유료 조직 구성원만 만들 수 있고 500MB(모바일 100MB)까지다. 1Password는 1Password를 쓰지 않는 상대에게도 항목을 공유하고 만료를 걸 수 있다고 안내한다.
- **비상 접근:** Bitwarden에서 신뢰할 연락처를 추가하려면 Premium이 필요하고 연락처는 무료 계정이어도 된다. 보기 권한과 인수 권한이 있고, 요청은 소유자가 정한 대기 시간이 지나거나 승인하면 열린다. 인수하면 새 마스터 비밀번호로 바뀌고 기존 2단계 인증 수단은 제거된다.
- **내보내기:** Bitwarden은 평문 `.json`, `.csv`, 암호화 `.json`, 첨부 포함 `.zip`(개인 금고만)을 지원한다. 암호화 `.json`은 같은 계정에서만 여는 방식과 내보낼 때 정한 비밀번호로 다른 계정에 가져오는 방식이 있고, 계정 암호화 키를 바꾸면 앞의 방식은 열 수 없다. 휴지통 항목과 Send는 어떤 형식에도 빠지고 `.csv`에는 카드, 신원, 패스키와 SSH 키가 빠진다. 개인 금고 내보내기에는 조직이 소유한 항목이 들어가지 않으므로 가족이나 팀 공유 항목은 따로 옮긴다. 평문 파일은 메일 같은 안전하지 않은 경로로 보내지 말고 사용 뒤 바로 지운다.
- **지원 기기:** Bitwarden은 Chrome, Edge, Safari, Firefox 등 브라우저 확장, Windows, macOS, Linux 데스크톱, iOS와 Android 앱, 웹 금고와 CLI를 제공한다. 1Password는 macOS, iOS, watchOS, Windows, Android, Linux 앱과 Chrome, Safari, Edge, Firefox, Brave 확장을 안내한다.
- **검증 근거:** Bitwarden은 코드베이스 전체를 GitHub에 공개한다고 밝힌다. 저장소 기본 라이선스는 서버가 AGPL v3.0, 클라이언트가 GPL v3.0이고 각 저장소의 `/bitwarden_license` 디렉터리만 Bitwarden License를 쓴다. 매년 소스 코드 평가와 침투 테스트를 포함한 외부 보안 감사를 받고 SOC Type 2와 SOC 3 준수를 완료했다고 밝힌다. 앱 스토어 배포본의 라이선스 변경 공지는 [[Open-Source-License-Review|오픈소스 라이선스 검토]]에서 다룬다.
- **자체 호스팅:** Bitwarden은 클라우드 대신 자체 환경에 배포하는 경로로 Linux, Windows, 단일 Docker 컨테이너인 Bitwarden Lite, Kubernetes와 Helm 배포를 안내한다. 호환 서버 Vaultwarden을 포함한 운영 책임은 [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]]에서 다룬다.

## 1인 사업자 운영에 적용하기

아래는 위 기능을 외주와 고객 계정 관리에 적용한 제안이다.

1. 고객 계정은 개인 항목과 분리한 공유 단위에 두고, 계약이 끝나면 공유 회수와 비밀번호 교체를 함께 기록한다. 계정 명의와 이전 절차는 [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]의 통제권 항목을 따른다.
2. 한 번만 전달할 비밀번호는 만료와 열람 횟수 제한을 건 링크로 보낸다. 메신저와 위키로 자격증명을 공유하면 유출 표면이 계정, 백업과 검색 인덱스로 늘어난다([[Hardcoded-Credentials|하드코딩된 자격증명]]).
3. 금고 계정의 2단계 인증과 복구 수단(Emergency Kit, 복구 코드)은 금고 밖에 오프라인으로 보관한다. 금고 안에만 두면 잠겼을 때 꺼낼 수 없다.
4. TOTP 키를 같은 금고에 두면 편하지만 금고가 뚫리면 두 요소가 함께 노출된다. 운영 콘솔, 도메인 등록처처럼 영향이 큰 계정은 별도 인증기나 하드웨어 키를 쓰는 편을 검토한다.

## 트레이드오프와 한계

- 모든 자격증명을 한 금고에 모으면 마스터 비밀번호나 잠금이 풀린 기기가 침해될 때 영향 범위가 커진다. 그래도 같은 비밀번호를 여러 곳에 쓰는 상태와 비교해 판단한다.
- 무료 범위는 기능 단위로 바뀌므로 결정 시점의 요금표와 도움말로 다시 확인한다.
- 이 문서는 공식 문서와 요금표를 대조한 것이며 두 제품의 보안을 직접 시험하거나 사고 이력을 평가하지 않았다.

## 이해 확인

- 무료 플랜의 비밀번호 수만 비교해 고르면 무엇을 놓치는가? 복구 경로, 비상 접근, 내보내기에서 빠지는 항목을 확인했는지 본다.
- 마스터 비밀번호를 잊었을 때 Bitwarden과 1Password에서 각각 무엇이 남는지 설명할 수 있는가?

## 출처

- [Bitwarden, Pricing](https://bitwarden.com/pricing/) — 2026-10-26 Free, Premium, Families 가격과 포함 기능 대조
- [Bitwarden, Bitwarden Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/) — 기기 암호화, 서버 전송 범위, PBKDF2 기본값과 Argon2id, 마스터 비밀번호 복구 불가 대조
- [Bitwarden, About Send](https://bitwarden.com/help/about-send/) — 암호화, 삭제와 만료, 열람 횟수, 크기 제한 대조
- [Bitwarden, Emergency Access](https://bitwarden.com/help/emergency-access/) — Premium 조건, 보기와 인수, 대기 시간, 인수 시 비밀번호 교체 대조
- [Bitwarden, Integrated Authenticator](https://bitwarden.com/help/integrated-authenticator/) — 키 보관은 모든 계정, TOTP 코드 생성은 Premium과 유료 조직 대조
- [Bitwarden, Bitwarden Authenticator](https://bitwarden.com/help/bitwarden-authenticator/) — 계정 없이 쓰는 모바일 앱, 비교 표의 통합 인증기 표기 대조
- [Bitwarden, Create & Edit a Send](https://bitwarden.com/help/create-send/) — 텍스트 Send는 모든 사용자, 파일 Send는 Premium과 유료 조직 대조
- [Bitwarden, Self-host Bitwarden](https://bitwarden.com/help/self-host-bitwarden/) — 자체 배포 경로 대조
- [Bitwarden, Vault Health Reports](https://bitwarden.com/help/reports/) — 대부분 Premium, 데이터 유출 보고서만 모든 사용자 대조
- [Bitwarden, Export Vault Data](https://bitwarden.com/help/export-your-data/) — 형식, 암호화 내보내기 두 방식, 제외 항목, 조직 소유 항목 제외, 평문 파일 주의 대조
- [Bitwarden, Is Bitwarden audited?](https://bitwarden.com/help/is-bitwarden-audited/) — 외부 감사, SOC 보고서, 코드 공개 대조
- [bitwarden/server LICENSE.txt — GitHub](https://github.com/bitwarden/server/blob/main/LICENSE.txt), [bitwarden/clients LICENSE.txt — GitHub](https://github.com/bitwarden/clients/blob/main/LICENSE.txt) — 저장소별 기본 라이선스와 Bitwarden License 디렉터리 대조
- [Bitwarden, Download](https://bitwarden.com/download/) — 브라우저 확장, 데스크톱, 모바일, 웹 금고, CLI 대조
- [1Password, Password manager pricing](https://1password.com/pricing/password-manager) — 2026-10-26 무료 플랜 부재, 두 플랜의 14일 체험, 할인가와 정가, 할인 조건, 지원 앱과 공유 대조
- [1Password Support, About the 1Password security model](https://support.1password.com/1password-security/) — 종단간 암호화와 PBKDF2-HMAC-SHA256 대조
- [1Password Support, About your Secret Key](https://support.1password.com/secret-key-security/) — Secret Key의 생성 위치, 엔트로피, 전송과 복구 불가, Emergency Kit 대조
- [1Password Support, If you forgot your 1Password account password or you can't unlock the app](https://support.1password.com/forgot-account-password/) — 재설정 불가, 관리자 복구와 복구 코드, 새 Secret Key 발급 대조

## 관련 문서

- [[Auth-Method-Selection|인증 방식 선택]]
- [[FIDO-WebAuthn|FIDO2, WebAuthn]]
- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]
- [[Hardcoded-Credentials|하드코딩된 자격증명]]
- [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]]
- [[Open-Source-License-Review|오픈소스 라이선스 검토]]
