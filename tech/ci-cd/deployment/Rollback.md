---
tags: [cicd, deployment, rollback, reliability]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Rollback", "롤백 전략", "배포 롤백"]
---

# 롤백 전략 (Rollback)

롤백은 배포 도구가 끼워 주는 부속 기능이 아니라 배포의 되돌림 가능성(reversibility)을 설계하는 축이다. 전략의 실질은 무엇이 되돌아가고 무엇이 안 돌아가는지의 경계를 미리 그어 두는 데 있다. 무중단 배포의 다섯 계층은 [[Zero-Downtime-Deployment|무중단 배포]]가 소유하고, 트래픽 전환 수단 자체는 [[Blue-Green|Blue-Green 배포]]가 소유한다. 이 문서는 그 위에서 되돌리기를 어떻게 설계하고 언제 쓰는가만 다룬다.

## 롤백, 롤포워드, 핫픽스

| 축 | 롤백 (revert) | 롤포워드 (roll-forward) | 핫픽스 |
|---|---|---|---|
| 하는 일 | 호환성이 검증된 이전 아티팩트로 되돌림 | 새 버전을 앞으로 내보내 고침 | 최소 수정만 담은 긴급 배포 |
| 걸리는 시간 | 수단에 따라 초에서 분 | 진단, 빌드, 검증 시간 필요 | 롤포워드와 비슷하되 범위가 좁음 |
| 원인 규명 | 완화에 필요한 진단 후 근본 원인 조사 가능 | 수정에 필요한 원인 진단이 선행 | 최소 수정 범위에 대한 진단이 선행 |
| 되돌림 자체의 위험 | 이전 코드가 신규 데이터를 못 읽으면 2차 장애 | 새 결함이 얹힐 수 있음 | 검증 생략 압박이 큼 |
| 쓰는 상황 | 배포 변경이 원인 후보이고 이전 상태가 현재 데이터와 호환될 때 | 이전 코드가 현재 상태를 처리할 수 없고 새 수정 경로가 안전할 때 | 피해가 계속되고 원인과 최소 수정 범위가 명확하며 다른 완화가 부족할 때 |

- 배포 변경이 의심되고 호환성이 검증된 이전 상태로 돌아갈 수 있다면 롤백을 우선 검토한다. 원인이 미상이라는 이유만으로 언제나 가장 빠르거나 안전한 수단은 아니다. 대상 버전, 현재 데이터와 프로토콜, 설정과 의존 서비스의 호환성을 확인해야 한다.
- 다만 스키마가 이미 앞으로 간 상태에서는 롤포워드가 유일한 경로가 되기도 한다. 스키마 축에서 실무 기본값이 roll-forward인 이유는 [[Schema-Versioning|스키마 버전 관리]]가 소유한다.
- 장애 상황에서 무엇을 먼저 시도할지의 대응 절차 자체는 [[Incident-Runbook|Incident Runbook]]과 [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]에 있다. 여기서는 판단 축만 정리한다.

## 되돌아가는 축과 되돌아가지 않는 축

배포 롤백이 실제로 되돌리는 범위는 생각보다 좁다.

- **배포 이력에 포함되어 함께 복원되는 범위**: 애플리케이션 코드, 컨테이너 이미지, 정적 자산과 버전 관리된 설정. 실제 복원 대상은 배포 도구와 이력에 무엇을 포함했는지에 따라 다르다.
- **안 돌아간다**: 이미 적용된 DB 스키마 변경, 신버전 포맷으로 갱신된 캐시, 큐에 실려 나간 메시지, 외부로 나간 부수효과(메일 발송, 결제 승인, 웹훅 호출), 서드파티에 반영된 상태.

Kubernetes Deployment를 이전 revision으로 되돌리면 Pod template만 복원된다. 템플릿 안에 직접 기록한 환경변수와, 이름으로 참조하는 외부 ConfigMap/Secret의 데이터는 다르다. 같은 이름의 외부 설정 값을 별도로 바꿨다면 Deployment 롤백만으로 그 값이 복원되지 않는다. 설정도 별도 버전 관리와 복원 절차를 정하고 이전 코드와 함께 검증한다.

그래서 롤백 가능성은 배포 시점이 아니라 설계 시점에 결정된다. 신구 버전이 같은 데이터를 동시에 보는 구간을 전후방 호환으로 메워 두어야 코드만 되돌려도 시스템이 버틴다. Expand-Contract 패턴은 [[Blue-Green|Blue-Green 배포]]의 DB 스키마 절이, 마이그레이션의 배포 결합은 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.

## 롤백 대상의 식별 — immutable artifact

되돌릴 대상을 정확히 가리키지 못하면 롤백은 그 자체가 새 배포다.

- **태그는 mutable reference다.** Kubernetes 공식 문서는 태그가 다른 이미지를 가리키도록 옮겨질 수 있는 반면 digest는 이미지 내용의 해시라 고정된다고 명시한다. 같은 태그로 롤백하면 그 사이 태그가 옮겨졌을 때 다른 코드가 뜬다.
- **digest를 배포 기록에 남긴다.** 배포마다 승인, 검증된 image digest와 커밋 SHA를 이력으로 남기고 롤백은 그 digest를 다시 지정하는 일이 된다. digest를 지정하면 imagePullPolicy 기본값이 `IfNotPresent`가 되는 점도 문서 기준 동작이다.
- **플랫폼이 이력을 대신 들고 있기도 하다.** Kubernetes Deployment는 revision을 보관해 `kubectl rollout undo`로 직전 revision, `--to-revision`으로 특정 revision까지 되돌린다. 보관 개수는 `revisionHistoryLimit`으로 제한되므로 이 값이 곧 되돌릴 수 있는 범위다.
- **롤백 창(window)은 이전 아티팩트가 살아 있는 기간이다.** Blue 인스턴스 유지 기간, 레지스트리 이미지 보존 정책, revision 보관 개수가 그 창을 함께 정한다. 비용 절감으로 이 창을 먼저 깎으면 롤백 수단부터 사라진다. ECR 보존 정책과 롤백 여유의 트레이드오프는 [[ECR-Cost-Reduction|ECR 비용 절감]]이 소유한다.
- 파이프라인에서 digest를 기록하고 재지정하는 구현은 [[GitHub-Actions|GitHub Actions]]에 있다.

## 롤백 수단의 비용 계층

같은 되돌리기라도 수단마다 소요 시간과 부작용이 다르다. 사건 대응에서는 적용 조건과 실제 피해 감소를 확인한 수단을 고른다. 설계 단계에서는 이번 변경이 어느 계층에서 꺼질 수 있는지를 미리 정해 둔다. 표의 시간은 수단을 비교하는 예시이며 개별 시스템의 복구 시간 보장이 아니다.

| 계층 | 수단 | 대략적 소요 | 전제 조건 |
|---|---|---|---|
| 1 | feature flag off | 초 단위, 배포 없음 | 변경이 플래그 뒤에 들어가 있어야 함 |
| 2 | 트래픽 스위치, 가중치 되돌림 | 초 단위 | 이전 버전 인스턴스가 살아 있어야 함 |
| 3 | 이전 아티팩트 재배포 | 분 단위 | digest 이력과 레지스트리 보존 |
| 4 | 인프라, 데이터 복구 | 시간 이상 | 백업, PITR, 보정 배치 |

- 1계층은 배포 파이프라인을 생략할 수 있지만, 실제 완화 시간은 플래그의 전파와 적용 방식에 달려 있다. 플래그 설계는 [[Feature-Flag|Feature Flag]]에, 가역성 기준의 의사결정 프레임은 [[One-Way-vs-Two-Way-Door|One-Way vs Two-Way Door]]에 있다.
- 2계층은 Blue를 얼마나 오래 유지하느냐에 종속되고, [[Canary|Canary]] 구성에서는 가중치를 0으로 되돌리는 것이 같은 계층에 해당한다.
- 4계층은 코드 롤백과 구분되는 데이터와 인프라 복구다. 예상한 실패에 필요한 복구 수단인지, 원래 가역적으로 설계할 수 있었던 변경을 놓친 것인지 회고에서 구분한다.

## 자동 롤백 — 판정 신호와 오작동

- **판정은 프로세스 기동이 아니라 트래픽 기준으로 한다.** 컨테이너가 떴다는 사실은 요청을 제대로 처리한다는 뜻이 아니다. 에러율, 지연 백분위, 핵심 비즈니스 지표를 이전 버전 대비로 본다. Google SRE Workbook도 카나리 지표의 출발점으로 SLI를 권한다.
- **관측 창 길이가 트레이드오프다.** 짧으면 저빈도 경로의 회귀를 놓치고, 길면 그만큼 피해가 누적된다. SRE Workbook은 릴리스 주기가 카나리 지속 시간의 상한을 정한다고 지적한다.
- **자동 실행에도 적용 조건이 필요하다.** 되돌릴 버전의 데이터 호환성, 판정 신호, 실패 시 중단과 에스컬레이션 경로를 검증한다. 임계값을 넘었다는 사실만으로 코드 롤백이 모든 장애를 복구하지는 않는다.
- **오작동 모드를 미리 알아 둔다.**
  - 되돌릴 정상 배포가 없는 첫 배포. ECS deployment circuit breaker는 `COMPLETED` 상태 배포를 찾지 못하면 롤백하지 못하고 새 태스크도 띄우지 않은 채 배포가 멈춘다.
  - 롤백과 재배포가 오가는 플래핑. 임계값이 너무 민감하거나 실패 카운팅 방식이 상황에 안 맞을 때 생긴다.
  - 자동 롤백이 원인 조사에 필요한 상태(로그, 코어 덤프, 문제 인스턴스)를 지워 버리는 경우.
  - 자동 롤백이 조용히 성공해 아무도 모른 채 구버전으로 운영되는 경우. 알림을 반드시 함께 건다.
- AWS의 임계값 계산, `resetOnHealthyTask`, `rolloutState`와 EventBridge 알림 같은 구체 파라미터는 [[ECS-Rolling-Deployment|ECS Rolling 배포]]가 소유한다.

## 롤백 리허설과 완료 조건

- 롤백은 장애 중에 처음 해 보면 안 되는 절차다. 대표적인 부하와 데이터, 신구 버전이 공존하는 조건에서 리허설하고 실제 소요 시간을 재 둔다. 코드만 되돌리는 시험으로 데이터와 프로토콜 호환성까지 입증할 수는 없다.
- **완료 조건은 사용자 기능의 회복이다.** 대상 버전과 트래픽 전환을 확인하고 오류율과 지연, 영향을 받은 핵심 여정이 정한 복구 기준을 만족하는지 본다. 저빈도 경로는 전체 평균이 정상이어도 따로 확인한다. 데이터 정합성, 미처리 메시지와 이미 발생한 외부 부수효과가 남으면 그 복구 작업을 별도로 추적한다.
- 롤백도 배포 이벤트로 기록한다. 배포 이벤트를 관측 도구에 태그로 남겨 장애 스레드에 배포 이력을 붙이는 방식은 [[Deploy-Observability|배포 가시성]]이 소유한다.
- 단일 서버 구성에서는 롤백 창이 디스크에 남긴 이전 이미지와 이전 빌드 산출물에 그대로 종속된다 ([[Single-Host-SPA-API-Deployment|단일 호스트 SPA와 API 배포]]).

## 흔한 실수

- 이미지 보존 정책을 비용 기준으로만 조여 롤백 창을 먼저 없앤다.
- mutable 태그로 롤백 대상을 지정해 다른 코드가 올라온다. digest로 고정한다.
- 마이그레이션과 앱 배포를 원자적으로 묶어 롤백 불가능한 배포를 만든다 ([[Zero-Downtime-Deployment|무중단 배포]]의 데이터 계층).
- 자동 롤백만 걸고 알림을 안 걸어, 되돌아간 사실 자체가 관측되지 않는다.
- 롤백 후 원인 분석 없이 같은 아티팩트를 그대로 재배포해 같은 장애를 반복한다.
- 롤백 성공 판정을 헬스체크 통과로 끝내고 사용자 지표를 확인하지 않는다.

## 면접 체크포인트

- 롤백과 롤포워드를 가르는 기준을 데이터 정합성과 원인 규명 시간으로 설명할 수 있는가.
- 배포 롤백이 스키마를 되돌리지 못하는데도 시스템이 버티는 이유(전후방 호환)를 말할 수 있는가.
- 롤백 대상 식별에 태그 대신 digest를 쓰는 이유를 mutable reference 개념으로 설명할 수 있는가.
- 자동 롤백의 판정 신호를 무엇으로 두고, 어떤 오작동 시나리오를 대비할지 답할 수 있는가.
- 비용 절감이 롤백 창을 어떻게 잠식하는지 구체적인 설정 항목으로 짚을 수 있는가.

## 출처

2026-10-03에 롤백 선택과 데이터 호환성, 복구 검증 조건을 Google SRE와 AWS 공식 자료에 대조했다. Kubernetes Deployment의 Pod template 복원 범위와 외부 ConfigMap 참조도 공식 문서로 확인했다. 그 밖의 Kubernetes와 ECS 세부 동작은 전부 재검증하지 않았으며, 개별 시스템의 복구 시간과 안전성은 별도 검증이 필요하다.

- [Kubernetes 공식 문서, Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes 공식 문서, Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes 공식 문서, ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes 공식 문서, kubectl rollout undo](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/)
- [AWS 공식 문서, How the Amazon ECS deployment circuit breaker detects failures](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
- [Canarying Releases — Google SRE Workbook](https://sre.google/workbook/canarying-releases/)
- [Effective Troubleshooting — Google SRE Book](https://sre.google/sre-book/effective-troubleshooting/)
- [Ensuring rollback safety during deployments — AWS Builders' Library](https://d1.awsstatic.com/builderslibrary/pdfs/ensuring-rollback-safety-during-deployments.pdf)

## 관련 문서

- [[Blue-Green|Blue-Green 배포]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Canary|Canary 배포]]
- [[Feature-Flag|Feature Flag]]
- [[DB-Migration|DB 마이그레이션 전략]]
- [[Schema-Versioning|스키마 버전 관리]]
- [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]
- [[ECS-Rolling-Deployment|ECS Rolling 배포]]
- [[GitHub-Actions|GitHub Actions]]
- [[ECR-Cost-Reduction|ECR 비용 절감]]
- [[Single-Host-SPA-API-Deployment|단일 호스트 SPA와 API 배포]]
- [[Incident-Runbook|Incident Runbook]]
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]
- [[Deploy-Observability|배포 가시성]]
- [[One-Way-vs-Two-Way-Door|One-Way vs Two-Way Door]]
