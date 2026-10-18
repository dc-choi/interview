---
tags: [security, browser, dlp, governance]
status: done
verified_at: 2026-10-16
category: "보안(Security)"
aliases: ["Enterprise Browser Control", "기업용 브라우저 통제", "Firefox Enterprise"]
---

# 기업용 브라우저 통제

기업용 브라우저는 웹 앱 접근, 데이터 이동과 정책 적용을 단말의 브라우저 계층에서 관리한다. 관리 서버를 직접 운영하는 것과 서비스 전체의 규제 준수는 별개다.

## 정책과 데이터의 위치

| 경계 | 검토할 내용 |
| --- | --- |
| 관리 | 정책 변경 권한, 배포 지연과 예외, 관리 콘솔 장애 시 동작 |
| 신원 | 기존 IdP, 직원/계약직 구분과 앱별 접근 권한 |
| 데이터 | 복사, 업로드와 다운로드 정책, 감사 로그의 민감 정보 |
| 단말 | 개인 기기와 관리 기기 구분, 확장 기능과 상태 점검 |
| 운영 | 업데이트, 로그, 충돌 보고와 동기화 데이터가 저장되는 곳 |

## Firefox Enterprise 사례

2026-10-16 Mozilla 관리자 문서 기준 **Firefox Enterprise 158부터 early access**다. 2026-10-14 제공 발췌의 공개 소식을 모든 조직에 일반 제공된 상태로 해석하지 않는다.

조직 자체 인프라의 Admin Console을 통해 중앙 정책, 신원 기반 접근과 DLP를 관리한다. telemetry, crash collection, Sync, Remote Settings와 업데이트의 지원 서비스도 조직 인프라에 둔다. 온프레미스 운영은 위치와 정책의 통제권을 주는 대신 해당 시스템을 운영할 책임도 가져온다.

평가 시 실제 필요한 DLP 경로와 기존 IdP/MDM/SIEM 연동, 우회 경로, 사용자 지원 비용을 확인한다. 브라우저 밖의 앱이나 이미 내려받은 사본까지 모두 통제된다고 확대하지 않는다. 이 문서는 공식 안내 대조이며 배포와 차단 시험은 하지 않았다.

## 출처

- [Mozilla, Firefox Enterprise administrator reference](https://firefox-admin-docs.mozilla.org/guides/firefox-enterprise/)
- [Mozilla introduces Firefox Enterprise — Mozilla](https://blog.mozilla.org/en/firefox/introducing-firefox-enterprise/)

## 관련 문서

- [[Access-Control-Models|접근 제어 모델]]
- [[Network-Separation|망분리와 데이터 경계]]
