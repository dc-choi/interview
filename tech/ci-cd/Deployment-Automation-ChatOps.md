---
tags: [cicd, chatops, slack, deployment, automation, sre]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["배포 자동화", "ChatOps", "Slack Bot 배포", "Deployment Automation"]
---

# 배포 자동화와 ChatOps

배포·운영 명령을 **Slack·Teams 같은 채팅 도구에서 실행**하는 패턴. 배포 승인·상태 확인·롤백을 사람이 콘솔을 열지 않고 채팅 하나로 수행해 속도·투명성을 모두 잡는다. CI/CD 파이프라인은 "자동화가 가능한 일을 자동화"하고, ChatOps는 "사람의 개입이 필요한 부분을 투명하게 만든다."

## 왜 ChatOps인가

- **컨텍스트 한 곳에**: 배포 이력·장애 대응·토론이 같은 채널에 남아 **감사 로그** 역할
- **낮은 진입 장벽**: 신규 팀원도 채널만 찾으면 누구나 실행 가능 (권한은 별도 RBAC)
- **승인·실행 분리**: 요청→승인→실행을 같은 UI에서 처리
- **Human-in-the-Loop 유지**: 중요한 순간의 인간 판단이 자연스럽게 들어감

## 대표 기능 패턴

| 기능 | 명령 예 | 효과 |
|---|---|---|
| **배포 요청** | `/deploy service-x v1.2.3` | 빌드 버전 선택·환경 선택(dev/stage/prod) |
| **승인 흐름** | 배포 메시지에 ✅ 버튼 | 권한자가 누르면 실행, 아니면 대기 |
| **상태 조회** | `/status service-x` | 현재 배포된 버전·헬스·트래픽 |
| **롤백** | 배포 메시지의 "이전 버전" 버튼 | 직전 커밋으로 즉시 복귀 |
| **온콜 알림** | 알람→채널 스레드→담당자 멘션 | 장애 감지 후 분당 단위 대응 |

### 인터랙티브 UI

단순 `/command` 외에도 Slack의 **Modal·Button·Dropdown**을 활용해 복잡한 입력도 자연스럽게.

- 배포 커밋 선택 드롭다운
- 환경·리전 체크박스
- 승인자 다중 선택

## 구성 아키텍처

```
사용자 입력 (Slack)
    ↓
Slash Command / Interactive Endpoint
    ↓
Bot Backend (Lambda·자체 서버)
    ├─ 권한 검증 (사용자·채널 RBAC)
    ├─ CI/CD 트리거 (GitHub Actions·Jenkins·ArgoCD API)
    ├─ 상태 업데이트 (Slack 메시지 update)
    └─ 감사 로그 (S3·DB)
```

## 배포 승인 플로우 예

1. 개발자: `/deploy api v2.5.0 prod`
2. 봇: 메시지에 "승인자 2명 필요" + ✅/❌ 버튼
3. SRE·팀 리드가 ✅ 클릭 → 봇이 GitHub Actions 호출
4. 파이프라인 진행 상태를 메시지 편집으로 실시간 업데이트
5. 완료 시 헬스체크 결과·Grafana 링크 첨부

## 효과와 주의

### 성과로 이어지는 지점
- 배포 대기·진행 상태가 **투명하게 공유** → 문의 감소
- **온콜 인원 축소** — 동일 업무를 자동화 + 소수가 관리 가능한 수준으로
- **장애 대응 속도 개선** — 알림이 관련 채널에 즉시 도달

### 자동화의 함정

자동화가 늘면 **사람이 수동으로 하던 감각을 잃는다.** 대비책:

- **정기 회고** — 2주 단위로 자동화 봇 사용 패턴·실패 사례 검토
- **Ground Rule** 명문화 — 누가 언제 어떤 명령을 쓸 수 있는지
- **사전 데이터**로 개선 전후 비교 — 자동화 전 수치를 기록하지 않으면 효과 측정 불가 (배포 시간·실패율·롤백 빈도)
- **드릴**(재해 복구 연습) — 자동화가 망가졌을 때 수동 복구 능력 유지

### 보안

- Slack App Signing Secret 검증 — 누구나 요청 위조 불가
- IAM 역할 최소 권한
- 배포 명령은 **특정 채널·그룹 사용자**만 허용
- 감사 로그 불변 스토리지(예: S3 Object Lock)에 보관

## 구현 선택지

| 방식 | 특징 |
|---|---|
| **GitHub Actions + workflow_dispatch** | 슬랙 봇 → GitHub REST API로 트리거. 가장 간단 |
| **Jenkins + Slack Bot Plugin** | 레거시·on-prem 환경에 자연스러움 |
| **ArgoCD + argocd-notifications** | K8s 환경에서 선언적 동기화 + 알림 |
| **Opsgenie·PagerDuty 연동** | 장애 알림·온콜 배정에 특화 |
| **자체 봇(Bolt·Slack SDK)** | 완전한 커스터마이징, 개발 부담 큼 |

## 면접 체크포인트

- ChatOps가 해결하는 **투명성·감사 로그·진입 장벽** 문제
- 배포 봇의 **승인·실행 분리** 구조
- 자동화 확대 시 빠지기 쉬운 **감각 상실·측정 공백** 함정
- **자동화 이전 기준선 측정**의 중요성 (없으면 효과 주장 불가)
- Slack App의 **서명 검증·RBAC**로 봇을 안전하게 운영하는 방법

## 출처
- [카카오페이 — 배포 효율화 1년 회고: 자동화 도입과 팀 생산성 향상](https://tech.kakaopay.com/post/slack-bot-improving-operational-efficiency-2/)

## 관련 문서
- [[GitHub-Actions|GitHub Actions]]
- [[CICD-Basics|CI/CD 기초]]
- [[Blue-Green|Blue-Green 배포]]
- [[Incident-Detection-Logging|장애 감지·로깅]]
