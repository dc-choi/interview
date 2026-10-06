---
tags: [security, supply-chain, openssf, scorecard, dependency]
status: done
verified_at: 2026-10-06
category: "보안(Security)"
aliases: ["OpenSSF Scorecard", "저장소 보안 관행 평가"]
---

# OpenSSF Scorecard

OpenSSF Scorecard는 오픈소스 저장소의 보안 관행을 자동 점검하는 도구다. 휴리스틱 검사별로 0~10점과 근거를 제공하며, 의존성 도입 검토와 유지보수 개선의 출발점으로 쓴다. 높은 점수가 악성 코드나 취약점의 부재를 인증하지는 않는다.

## 무엇을 확인하는가

| 검사 예 | 확인할 관행 |
|---|---|
| `Branch-Protection` | 주요 브랜치의 변경 보호 |
| `Code-Review` | 변경 전 코드 리뷰 |
| `Pinned-Dependencies` | 의존성 참조 고정 |
| `Token-Permissions` | 워크플로 토큰의 권한 제한 |
| `Signed-Releases` | 릴리스 서명 |
| `Vulnerabilities` | OSV를 이용한 알려진 미수정 취약점 확인 |

저장소 설정만 확인한다고 단정하지 않는다. 알려진 취약점 검사도 포함하지만, 전체 소스의 정확성과 모든 공격 경로를 검증하는 도구는 아니다. 검사 종류와 계산 방식은 버전에 따라 바뀔 수 있다.

## 총점보다 개별 근거

같은 총점이라도 위험한 항목의 구성은 다를 수 있다. 자동 검사는 오탐과 미탐이 있으며, 특정 프로젝트에 적용되지 않거나 조회할 수 없는 항목도 있다. 낮은 점수의 이유가 실제 설정 결함인지, 정보 부족인지 원문 결과에서 확인한다.

의존성 검토에서는 다음 순서를 사용할 수 있다.

1. 평가 시점, 저장소와 검사 버전을 기록한다.
2. 사용하는 배포 경로에 중요한 검사와 세부 근거를 읽는다.
3. 저장소 설정, 워크플로와 실제 배포 아티팩트를 대조한다.
4. 수정, 위험 수용 또는 대체 의존성 검토를 결정한다.

Scorecard v5의 Structured Results는 총점 대신 개별 probe 결과를 정책 판단에 사용할 수 있게 한다. 점수 임계값 하나만으로 채택을 결정하지 않고 [[Dependency-Selection|의존성 선택 기준]], [[Dependency-Vulnerability-Scanning|취약점 검사]]와 실제 실행 권한을 함께 검토한다.

## 출처

- [OpenSSF Scorecard — OpenSSF](https://github.com/ossf/scorecard)

## 관련 문서

- [[Supply-Chain-Security|공급망 공격과 방어]]
- [[Dependency-Selection|의존성 선택]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 검사]]
