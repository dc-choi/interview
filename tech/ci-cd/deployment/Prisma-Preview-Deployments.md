---
tags: [prisma, preview, deployment, github-actions, database]
status: done
verified_at: 2026-10-23
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Prisma 프리뷰 배포", "Prisma Preview Deployments"]
---

# Prisma 프리뷰 배포와 운영 환경의 경계

프리뷰 배포는 변경한 애플리케이션을 별도 환경에서 확인하는 방법이다. URL 분리, 데이터 분리와 운영 배포 권한은 각각 확인한다. 아래 내용은 Prisma Compute의 GitHub deploy-on-push 구성 기준이다. Prisma Composer는 Early Access이므로 도입 시 CLI와 배포 action의 호환성을 다시 확인한다.

## 저장소 연결과 실제 배포는 별개다

GitHub 저장소 연결은 workflow 인증과 브랜치 수명주기 연동을 준비한다. 실제 push 배포에는 `prisma/cloud-deploy-action`을 실행하는 GitHub Actions workflow도 필요하다. 작업은 GitHub OIDC 토큰을 30분 유효한 Prisma workspace 토큰으로 교환한다.

연결이 없으면 action은 `outcome: skipped-no-credential`을 남기고 성공 종료할 수 있다. 따라서 CI의 초록색 상태에 더해 배포 report, 대상 브랜치와 실제 서비스 응답을 확인한다. workflow에 필요한 `id-token: write` 권한과 runner의 Bun도 점검한다.

## 브랜치와 데이터의 수명주기

| 대상 | deploy-on-push 동작 | 확인할 점 |
|---|---|---|
| 기본 Git 브랜치 | production 배포 | 이름이 `main`인지보다 저장소의 기본 브랜치 설정이 기준이다 |
| 다른 브랜치 | 해당 브랜치의 preview 생성 또는 갱신 | 독립 서비스와 URL, 환경 변수를 확인한다 |
| 오래 유지하는 `staging` 브랜치 | 같은 preview를 계속 갱신 | 일회성 환경과 정리 정책을 구분한다 |
| 삭제한 기능 브랜치 | 대응 preview의 서비스, DB와 bucket 제거 | 보존할 테스트 데이터가 있으면 삭제 전에 따로 처리한다 |

Composer module에 선언한 Prisma Postgres DB는 preview에 새로 만들어지며 production 데이터를 복사하지 않는다. 테스트 데이터는 별도로 준비한다. 외부 DB를 `DATABASE_URL`로 참조하면 실제 격리 여부는 그 값에 달려 있다. preview 범위의 변수가 운영 DB를 가리키지 않는지 확인한다.

환경 변수 변경은 배포 때 반영된다. staging 전용 override를 바꾼 뒤에는 다음 배포에서 사용됐는지 확인한다. preview 생성만으로 운영 데이터와 같은 조건의 테스트가 됐다고 판단하지 않는다.

## 에이전트 권한과 GitHub 권한은 다르다

등록된 에이전트는 자체 Prisma credential과 정책으로 REST API를 호출한다. 기본 정책은 preview 작업을 허용하고 운영 변경이나 파괴적 작업에 승인을 요구한다. 그러나 GitHub workflow는 별도로 인증하므로 에이전트 정책이 기본 브랜치 push 배포를 막지는 않는다.

운영 배포를 검토한 뒤 허용하려면 GitHub 브랜치 보호와 우회 권한까지 별도로 설정한다. 작업 지침에 PR 검토 절차를 적는 것과 서버에서 권한을 제한하는 것은 다른 통제다.

같은 장비의 사용자 CLI 로그인, 사용자 계정으로 연결한 Prisma MCP, 에이전트가 읽을 수 있는 운영 DB 연결 문자열도 별도 접근 경로다. 등록된 credential만 제한해 놓고 모든 경로가 통제됐다고 판단하지 않는다.

## 승급과 롤백의 확인 범위

서비스 version의 production 승급은 production 환경 변수로 다시 빌드한다. rollback은 기존 build를 재사용하며 rebuild하지 않는다. 이는 서비스 version에 대한 동작이므로 DB 변경까지 복원됐다고 해석하지 않는다. 스키마와 데이터의 호환성은 [[DB-Migration|DB migration 전략]]으로 별도 확인한다.

운영 점검 예시: preview에서 합성 데이터로 기능을 검증하고, 운영 DB 연결 부재를 확인한 뒤 배포한다. 배포 후 서비스 응답과 데이터 호환성을 확인하고, 브랜치를 정리하기 전에 보존할 자료가 있는지 확인한다.

## 출처

- [Prisma, Preview and staging environments per Git branch](https://www.prisma.io/docs/compute/deploy-on-push)
- [Prisma, Environments: production, staging and preview branches](https://www.prisma.io/docs/compute/branching)
- [Prisma, Enroll your coding agent](https://www.prisma.io/docs/prisma-compute/agent-enrollment)
- [Prisma, Deployments](https://www.prisma.io/docs/compute/deployments)
- [Prisma, Environment variables](https://www.prisma.io/docs/compute/environment-variables)

## 관련 문서

- [[GitHub-Actions|GitHub Actions 파이프라인]]
- [[DB-Migration|DB migration 전략]]
- [[Rollback|롤백 전략]]
