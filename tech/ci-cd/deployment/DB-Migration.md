---
tags: [cicd, deployment, database, migration]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["DB Migration 전략", "DB 마이그레이션 배포"]
---

# 배포 파이프라인의 DB Migration 전략

앱 아티팩트는 이전 이미지로 되돌릴 수 있지만 스키마는 대체로 앞으로만 간다. 이 비대칭 때문에 마이그레이션은 앱 배포에 묻어가는 부수 작업이 아니라 파이프라인의 별도 단계로 떼어내야 한다. 이 문서는 마이그레이션을 파이프라인의 어디서, 어떤 순서와 게이트로 실행할지를 다루고, 스키마 변경 자체의 설계와 실행 기법은 각 정본에 위임한다.

- Expand-Contract 3단계의 개념과 트래픽 전환 시 주의는 [[Blue-Green|Blue-Green 배포]]가 소유한다.
- 마이그레이션 히스토리가 정본인 이유, 드리프트 방지, roll-forward 원칙은 [[Schema-Versioning|스키마 버전 관리]]가 소유한다.
- 롤백과 롤포워드를 가르는 일반 판단 축, 롤백 창(window)의 정의와 그 창을 정하는 요소는 [[Rollback|롤백 전략]]이 소유한다.
- 큰 테이블의 ALTER 알고리즘과 OSC 도구 선택은 [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]이 소유한다.
- TypeORM CLI, DataSource 옵션, backfill의 구체 절차는 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.
- DB 인스턴스, 엔진, 리전 자체의 전환은 스키마 변경과 다른 주제이며 [[RDS-Zero-Downtime-Migration|RDS near-zero 마이그레이션]]이 소유한다.

## 실행 위치: 기동 결합 vs 배포 전 단계

기동 훅(ORM의 `migrationsRun` 류, 앱 부트스트랩 코드)에 마이그레이션을 두면 replica 수만큼 실행 주체가 생긴다.

- **동시 실행**: 롤링 배포로 replica가 함께 뜨면 여러 프로세스가 같은 pending 목록을 동시에 집는다. 도구가 락을 제공해도 대기하는 쪽은 그동안 readiness를 통과하지 못한다.
- **부분 적용**: 마이그레이션이 중간에 실패해도 실패한 것은 앱 컨테이너다. 오케스트레이터는 이를 앱 기동 실패로 재시작하고, DDL이 어디까지 적용됐는지는 배포 로그가 아니라 히스토리 테이블을 봐야 알 수 있다.
- **차단 지점 상실**: 실패가 트래픽 전환 전에 파이프라인을 멈추는 게 아니라 배포가 진행되는 중간에 드러난다.

배포 전 단계로 떼면 실행 주체가 하나가 되고, 실패가 트래픽 전환 이전에 파이프라인을 멈춘다. 승인, 리허설, 관측을 붙일 지점도 이 단계에 생긴다.

## 실행 수단 비교

| 축 | 파이프라인 job | Kubernetes Job | Helm pre-upgrade hook | Argo CD PreSync hook | init container |
| --- | --- | --- | --- | --- | --- |
| 실행 주체 수 | 1 (러너) | Job 1개 (Pod는 재시도로 늘 수 있음) | Job 1개 | Job 1개 | replica 수만큼 |
| 실패 시 배포 중단 | job 실패로 중단 | 후속 단계에서 판정 필요 | 훅 실패 시 릴리스 실패 | sync 전체 중단 | Pod 재시작 반복 |
| 클러스터 네트워크 접근 | 러너에서 DB 도달 경로 필요 | 클러스터 안에서 실행 | 클러스터 안에서 실행 | 클러스터 안에서 실행 | 클러스터 안에서 실행 |
| 수동 승인 삽입 | environment 보호 규칙으로 가능 | 파이프라인이 감싸야 가능 | 릴리스 단위라 어려움 | sync 승인 단위 | 불가 |
| 관측 용이성 | job 로그가 배포 기록에 남음 | Job 로그 수집 필요 | 훅 삭제 정책에 따라 로그 유실 | 훅 삭제 정책에 따라 로그 유실 | 앱 로그에 섞임 |

- Helm은 `helm.sh/hook: pre-upgrade`로 훅을 선언하고 `helm.sh/hook-weight`로 순서를 정한다. 훅 Job이 실패하면 릴리스가 실패한다. `helm.sh/hook-delete-policy`를 `hook-succeeded`로 두면 성공한 훅 리소스가 지워지므로 로그 수집은 별도로 붙인다.
- Argo CD의 `argocd.argoproj.io/hook: PreSync`는 매니페스트 적용 전에 실행되고, 실패하면 sync 전체가 실패로 표시된다.
- Kubernetes Job은 완료를 재시도로 보장한다. 기본값은 `completions: 1`, `parallelism: 1`, `backoffLimit: 6`이며 노드 장애나 Pod 삭제 시 새 Pod를 만들므로 Pod 실행 횟수 자체는 1회로 보장되지 않는다.
- init container는 Pod마다 실행되므로 replica를 늘리면 실행 횟수도 함께 늘어난다. 기동 결합의 문제를 그대로 갖는다.

## 동시 실행과 멱등성

파이프라인 재실행(rerun)과 Job 재시도가 있는 이상 마이그레이션 실행은 여러 번 시도될 수 있다고 보고 설계한다.

- **히스토리 테이블**이 이미 적용된 마이그레이션을 건너뛰게 한다. 두 번째 실행이 안전한 1차 근거는 이것이다.
- **락**이 동시 진입을 막는다. Flyway는 DB의 락 기능으로 여러 노드를 조율해 여러 인스턴스가 동시에 마이그레이션을 시도해도 동작한다고 문서에 명시한다. PostgreSQL의 advisory lock은 시스템이 강제하지 않고 애플리케이션이 의미를 정하는 락이며, 트랜잭션 수준 락은 트랜잭션 종료 시 자동 해제되고 세션 수준 락은 명시 해제나 세션 종료까지 유지된다.
- **위험 구간은 마이그레이션 하나의 내부**다. 히스토리 기록 이전에 DDL이 부분 적용되고 프로세스가 죽으면 재실행이 같은 DDL을 다시 만난다. 트랜잭션 DDL이 되지 않는 엔진에서 특히 그렇다.
- 재실행이 안전하려면 마이그레이션 하나가 트랜잭션으로 감싸지거나, 감쌀 수 없는 SQL이면 파일을 잘게 쪼개고 존재 여부를 확인하는 형태로 쓴다. 실패한 마이그레이션을 히스토리만 조작해 덮지 않는다.

## 배포 전략별 실행 순서

| 전략 | expand와 준비 마이그레이션 시점 | 신구 버전 공존 구간 | N-1 호환 요구 |
| --- | --- | --- | --- |
| Rolling | 롤링 시작 전 | 롤링이 도는 수 분 | 필요 |
| Blue-Green | Green 배포 전 | Blue를 유지하는 기간 전체 | 필요, Blue 유지 기간만큼 길다 |
| Canary | 카나리 승격 전 | 카나리 관찰 기간 전체 | 관찰 기간에 비례해 커질 수 있음 |

- 세 전략 모두 새 코드에 필요한 컬럼과 테이블을 추가하는 expand, 그리고 선행 backfill 같은 준비 마이그레이션이 앱 배포보다 앞선다. 반대로 옛 구조를 제거하는 contract는 모든 구버전 종료와 롤백 창 폐쇄를 확인한 뒤 별도 릴리스로 실행한다.
- **Canary는 관찰 기간을 길게 잡으면 공존 구간이 길어질 수 있다.** 소수 비중 관찰이 길어지면 구버전과 신버전이 같은 스키마 위에서 오래 함께 돌고, 그만큼 호환 요구가 커진다. 기간은 트래픽 단계, 승인과 rollback window에 따라 정한다.
- **Blue-Green에서는 Blue 유지 기간이 곧 contract 가능 시점의 하한**이다. Blue를 살려 두는 동안 구버전 코드가 언제든 다시 트래픽을 받을 수 있으므로 옛 컬럼을 지울 수 없다.

## 스키마가 걸린 되돌리기

일반 판단 축은 [[Rollback|롤백 전략]]에 있고, 여기서는 스키마 변경이 이미 나간 뒤에만 갈라지는 경로를 본다.

- **앱만 되돌리는 경로의 전제**: 직전 버전이 현재 스키마 위에서 그대로 동작해야 한다. expand까지만 나간 상태에서 전후방 호환을 지켰다면 이 전제가 성립한다.
- **forward fix 마이그레이션**: 스키마 자체가 잘못됐을 때(잘못된 기본값, 빠진 인덱스, 잘못된 타입) 되돌리는 대신 수정 마이그레이션을 새로 추가한다. 개발 환경에서 쓰는 down 스크립트를 프로덕션 복구 수단으로 신뢰하지 않는다.
- **백업 복원**: 데이터가 이미 손상되거나 삭제됐을 때만 내려간다. 절차는 [[Backup-Restore|백업과 복원]]이 소유한다.
- **contract 실행일이 롤백 창에 종속된다**는 점이 마이그레이션 쪽 특수성이다. 며칠 안에 앱을 되돌릴 수 있어야 한다면 그 기간 동안 옛 컬럼과 테이블은 살아 있어야 하고, contract를 expand와 같은 릴리스에 넣으면 되돌릴 구간이 남지 않는다.

## CI 게이트

- **생성 SQL 리뷰**: 마이그레이션 PR에는 실행될 SQL 자체를 붙인다. ORM이 생성한 파일은 리뷰 시작점이지 결론이 아니다.
- **위험 DDL 탐지**: 컬럼 삭제, 테이블 삭제, `NOT NULL` 추가, 타입 변경, unique 제약 추가를 자동 탐지해 라벨이나 추가 승인으로 보낸다.
- **드리프트 검사**: 배포 전 히스토리 테이블과 스키마 덤프를 환경 간 대조한다.
- **리허설**: 프로덕션과 같은 엔진, 메이저 버전, 데이터 규모의 스냅샷에서 실행 시간과 락 대기를 잰다. 행 수가 다르면 리허설 결과의 실행 시간은 근거가 되지 않는다.
- **승인 경로 분리**: 마이그레이션이 없는 배포는 자동 통과시키고, 있는 배포만 수동 승인을 태운다. GitHub Actions라면 environment의 required reviewers로 해당 job을 승인 전까지 멈춘다.

## 실패 처리와 관측

- 마이그레이션 단계가 실패하면 파이프라인은 실패로 끝나고 **트래픽 전환 단계는 시작되지 않아야** 한다. 훅 방식은 이 성질을 도구가 주고, 파이프라인 job 방식은 단계 의존성으로 직접 만든다.
- 배포 기록에 남길 값: 적용된 마이그레이션 목록과 히스토리 테이블 상태, 각 DDL의 실행 시간, 락 대기 시간, replica lag, DB CPU와 커넥션 수. 이 값이 없으면 다음 배포의 중단 기준을 세울 수 없다.
- 중단 기준은 배포 전에 정한다. 실행 시간이 예상의 몇 배를 넘으면 멈출지, replica lag이 얼마를 넘으면 중단할지를 숫자로 둔다. 배포 지표 수집의 일반론은 [[Deploy-Observability|배포 가시성]]이 소유한다.

## 흔한 실수

- 마이그레이션과 앱 배포를 원자적 단위로 묶어 하나라도 실패하면 전부 되돌리려는 설계. 스키마는 되돌아오지 않으므로 이 원자성은 성립하지 않는다.
- expand와 contract를 같은 릴리스에 넣어 롤백 창을 없앰.
- 롤백 창이 끝나기 전에 contract를 실행해 앱 롤백 경로를 스스로 막음.
- 기동 훅에 마이그레이션을 둔 채 replica 수를 늘려 동시 실행과 readiness 지연을 키움.
- 스테이징에서만 리허설하고 데이터 규모를 맞추지 않아 실행 시간을 과소평가.
- 실패한 마이그레이션을 히스토리 조작으로 성공 처리해 다음 환경 재생을 깨뜨림.

## 면접 체크포인트

- 마이그레이션 실행을 앱 기동에서 분리하는 이유를 replica 동시 기동 관점으로 설명할 수 있는가.
- 배포 롤백은 쉬운데 스키마 롤백을 기본 경로로 두지 않는 이유를 말할 수 있는가.
- Canary에서 전후방 호환 요구가 커지는 이유를 공존 구간 길이로 설명할 수 있는가.
- contract를 언제 실행할지 무엇이 결정하는가.
- 파이프라인 재실행이 안전하려면 마이그레이션 도구와 파일에 무엇이 필요한가.

## 출처

- [Helm 공식 문서, Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
- [Argo CD 공식 문서, Sync Phases and Waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Kubernetes 공식 문서, Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes 공식 문서, Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [PostgreSQL Documentation, Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Redgate Flyway Documentation, Frequently Asked Questions](https://documentation.red-gate.com/fd/frequently-asked-questions-277579363.html)
- [GitHub Docs, Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

## 관련 문서

- [[Blue-Green|Blue-Green 배포 (Expand-Contract)]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Rollback|롤백 전략]]
- [[Schema-Versioning|스키마 버전 관리]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]
- [[RDS-Zero-Downtime-Migration|RDS near-zero 마이그레이션]]
- [[Backup-Restore|백업과 복원]]
- [[Deploy-Observability|배포 가시성]]
- [[GitHub-Actions|GitHub Actions]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]
