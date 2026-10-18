---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 메일 전달과 데이터 노출 경계

## 전달 성공과 권한 통제

메일은 주로 기존 사용자 알림에 쓰며 사용자와 연결되지 않은 주소로 보내는 기능은 onboarding 같은 제한된 용도에 한정된다. 허용 목록은 주소, 도메인 또는 wildcard 도메인 규칙으로 구성하며 여러 수신자는 각각 검사한다. 그룹 하나가 허용됐다고 모든 구성원에게 전달되는 것은 아니다.

Palantir relay까지는 TLS를 요구하지만 이후 메일 서버는 opportunistic TLS 때문에 평문 전달로 바뀔 수 있다. TLS가 적용돼도 각 중계 서버 운영자는 메시지 평문을 처리한다. 전달 이후의 전달/다운로드/재공유에는 Foundry markings와 mandatory access control이 적용되지 않는다.

중요한 작업은 메일만의 전달 성공에 의존하지 않는다. 사용자 이메일 누락, allowlist, suppression, provider 장애와 수신 서버 거절을 구분한다. 기본 provider는 검증일 기준 AWS SES다.

## Redaction과 예외

기본 알림은 민감한 내용을 지우고 플랫폼 이벤트 링크를 담는다. Selected users only 모드에서 미설정 상태는 전체 redaction이다. 완전한 내용을 받는 도메인/하위 도메인과 사용자 그룹 조건은 조건 종류 안팎 모두 OR로 작동한다. 하나라도 충족하면 unredacted 메일을 받을 수 있다.

Everyone 모드는 전 수신자의 redaction을 끈다. 사용자 편의보다 유출 범위를 함께 평가해야 한다. Action type별 override는 조직 설정을 먼저 허용하고 ontology:override-notification-redaction 권한을 가진 사용자가 설정한다. 이 권한은 ontology:manage-ontology에 기본 포함된다.

## Suppression의 의미

반복 실패 뒤 platform/provider가 전송을 멈추는 suppression이 생길 수 있다. BOUNCE는 14일 뒤 자동 삭제되고 COMPLAINT는 수동 조치가 필요하다. 수신자 동의 없이 complaint suppression을 지우면 발신 평판과 전달성이 악화될 수 있다. Allowlist, redaction과 suppression은 별개의 검사다.

## 출처

- [Palantir Foundry, email](https://www.palantir.com/docs/foundry/email/)
- [Palantir Foundry, email-allowlisting](https://www.palantir.com/docs/foundry/email/email-allowlisting/)
- [Palantir Foundry, email-content-redaction](https://www.palantir.com/docs/foundry/email/email-content-redaction/)
- [Palantir Foundry, email-suppression-management](https://www.palantir.com/docs/foundry/email/email-suppression-management/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/email/overview/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
