---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 계정과 Organization 권한"]
---

# Expo 계정과 Organization 권한

## 소유 단위

Personal은 개인 프로젝트, Organization은 팀의 프로젝트/credential/구독을 공유하는 단위다. 팀원이 personal password를 공유하지 않고 각 user를 초대해 역할을 준다. 프로젝트 app config의 owner로 Organization을 연결한다.

Personal을 Organization으로 전환하면 기존 앱, update/push, 저장한 credential과 구독이 이어지도록 지원한다. 원문은 token/webhook integration도 지정한 owner로 이전한다고 설명한다. 전환 후 실제 CI identity와 권한을 다시 확인한다.

## 역할 계층

| 역할 | 권한 |
| --- | --- |
| Owner | 계정/프로젝트 삭제를 포함한 모든 작업 |
| Admin | 대부분 설정, 유료 서비스, 다른 user 권한과 programmatic access 관리 |
| Release Manager | protected channel 관리와 연결 branch publish |
| Developer | 프로젝트 생성, build, update와 credential 관리 |
| Viewer | 조회, 수정 불가 |

상위 역할은 하위 역할을 포함한다. Owner는 모든 역할을 부여할 수 있지만 Admin은 Owner를 부여하지 못한다. Protected channel은 private beta/Enterprise 예정 기능이며 활성화되지 않은 계정에서는 Release Manager와 Developer 접근이 같다. 역할 이름만으로 배포 보호가 작동한다고 가정하지 않는다.

## 관리와 이전

Owner/Admin이 초대, 역할 변경과 제거를 수행한다. 계정 rename은 Owner만 가능하며 횟수가 제한된다. 프로젝트 transfer도 횟수가 제한되고 양쪽 계정 관리 권한이 필요하다. Account security activity에서 password/email/2FA 변경을 조사하고 EAS resource 변경은 Audit logs와 구분한다.

## 출처

- [Expo Documentation, Account types](https://docs.expo.dev/accounts/account-types)

## 관련 문서

- [[Expo-Accounts]]

- [[Expo]]
