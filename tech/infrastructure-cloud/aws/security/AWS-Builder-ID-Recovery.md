---
tags: [infrastructure, aws, builder-id, identity, account-recovery]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Builder ID Recovery", "AWS Builder ID 복구 이메일"]
---

# AWS Builder ID 복구 이메일

AWS Builder ID는 개발 도구와 교육 서비스 등에 사용하는 개인 프로필이다. AWS 계정의 리소스와 자격 증명과는 구분된다. 복구 이메일은 기본 로그인 수단을 잃었을 때 본인 확인에 사용하는 대체 주소다.

## 복구 이메일 등록

1. [AWS Builder ID 프로필](https://profile.aws.amazon.com)에 로그인한다.
2. `Security`의 `Authentication`에서 `Add recovery email` 또는 `Edit recovery email`을 선택한다.
3. 복구용 이메일 주소를 입력하고 `Continue`를 선택한다.
4. 해당 메일함에 도착한 일회용 코드(OTP)를 입력하고 `Continue`를 선택한다.
5. `Authentication`에 복구 이메일이 표시되는지 확인한다.

복구 이메일은 선택 사항이지만, 등록하지 않은 상태에서 MFA 장치를 추가하려 하면 먼저 복구 이메일을 등록하도록 요구한다. 계정 접근을 잃기 전에 준비해야 한다.

## 복구 상황마다 필요한 수단이 다르다

| 상황 | 셀프서비스 복구 조건과 경계 |
|---|---|
| 이메일과 비밀번호로 로그인하며 비밀번호를 잊음 | 기본 이메일로 재설정 링크를 받는다. 기본 메일함에 접근할 수 없으면 미리 등록한 복구 이메일로 받을 수 있다. |
| MFA 장치를 잃음 | 기본 이메일과 복구 이메일 **두 메일함 모두**의 OTP로 확인한다. 복구 이메일 하나만 확보했다고 MFA 복구가 보장되지는 않는다. |
| 소셜 로그인 계정에 접근할 수 없음 | 기본 이메일 또는 등록된 복구 이메일로 확인한 뒤 이메일과 비밀번호 로그인으로 전환할 수 있다. 이 전환은 영구적이며 소셜 로그인으로 되돌릴 수 없다. |

로그인 화면의 `Trouble Signing In?`에서 상황에 맞는 복구 경로를 찾는다. 기본 메일함에 접근할 수 없고 복구 이메일도 없으면 비밀번호 재설정과 소셜 로그인 전환은 지원팀을 통해서도 할 수 없다고 공식 안내가 명시한다. 지원 요청 자체가 복구 성공을 보장하지 않는다.

## 적용 범위

- 이 절차는 Builder ID 프로필 복구용이다. AWS 루트 사용자나 IAM의 복구 절차로 그대로 적용하지 않는다.
- 2026-10-07 공식 안내에는 일부 고객에게 제공하는 새 AWS 경험에서 Builder ID로 여러 AWS 계정을 관리하는 경로도 있다. 따라서 Builder ID가 AWS 계정 관리와 언제나 무관하다고 일반화하지 않는다.
- 복구 준비 상태는 문서 보유가 아니라 실제 등록과 두 메일함의 접근 가능 여부로 확인한다. 개인 주소와 OTP는 지식 문서에 기록하지 않는다.

## 출처

- [AWS Sign-In, Edit your AWS Builder ID profile](https://docs.aws.amazon.com/signin/latest/userguide/edit-details-builder-id.html)
- [AWS Sign-In, Recover your AWS Builder ID](https://docs.aws.amazon.com/signin/latest/userguide/recover-builder-id.html)
- [AWS Sign-In, Sign in with AWS Builder ID](https://docs.aws.amazon.com/signin/latest/userguide/sign-in-builder-id.html)

## 관련 문서

- [[IAM|AWS 리소스 인증과 인가]]
- [[aws-security|AWS 보안 문서 인덱스]]
