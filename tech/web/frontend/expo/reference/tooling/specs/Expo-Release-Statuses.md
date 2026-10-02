---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 기능의 release status"]
---

# Expo 기능의 release status

## 상태 해석

Release status는 모든 기능이 순서대로 통과하는 단일 단계가 아니다. SDK/Router에는 alpha와 beta, EAS에는 preview와 beta, CLI에는 experimental을 주로 사용한다. 안정 라이브러리 내부의 특정 API만 experimental일 수도 있다.

| 상태 | 변경과 사용 조건 |
| --- | --- |
| Experimental | 방향을 검증하는 초기 기능. 예고 없이 변경/제거 가능하며 production 비권장 |
| Alpha | 이른 테스트 단계. 새 SDK release 없이도 breaking change가 가능하며 production 비권장 |
| Preview | 제한된 기능 범위를 먼저 공개. API 변경 가능하며 충분히 시험한 경우 production 사용 가능 |
| Beta | 주요 기능이 갖춰진 최종 검증 단계. 중요한 문제로 breaking change 가능, production 전 충분한 시험 필요 |
| Stable | 상태 badge 없는 정식 기능. semantic versioning상 breaking change는 새 major에서 적용 |
| Deprecated | 새 사용 비권장. 경고를 제공하고 향후 SDK release에서 제거 가능 |

Preview가 beta보다 모든 면에서 불안정하다거나 모든 기능이 preview를 거친다고 단정하지 않는다. deprecated는 해당 API가 이미 제거되었다는 뜻도 아니다.

## App config의 experiments

app config의 `experiments`는 opt-in 기능을 켜는 설정 필드다. 필드 이름과 제품의 Experimental status는 다른 개념이다. 예를 들어 `experiments.typedRoutes`는 beta 기능을 활성화한다. 옵션 위치만으로 운영 사용 가능성이나 지원 수준을 추정하지 않는다.

기능 선택 때는 SDK 버전, 해당 API badge, 알려진 제한과 되돌릴 방법을 함께 확인한다. production 가능 표시는 앱별 검증을 생략해도 된다는 보장이 아니다.

## 출처

- [Expo Documentation, Release statuses](https://docs.expo.dev/more/release-statuses)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
