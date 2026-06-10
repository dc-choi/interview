---
tags: [ci-cd, workflow, process]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["Development Workflow", "개발 프로세스"]
---

# 개발 프로세스 (Issue → Branch → PR → Merge)

혼자 개발할 때도, 팀으로 개발할 때도 **어떤 작업이 왜 들어갔는지 추적 가능하게** 하는 기본 프로세스. 한 이슈가 한 브랜치를 만들고, 한 PR로 머지되고, 닫힌다. 이 루프가 지켜지면 **git log·이슈 트래커만 보고 히스토리 재구성** 가능.

## 표준 루프

```
1. Issue 생성 (설명·레이블·프로젝트 보드)
     ↓
2. Issue 할당 (본인 또는 담당자)
     ↓
3. 브랜치 체크아웃 (issue/<번호>-<설명> from main)
     ↓
4. 커밋 (한 목적 = 한 커밋, 메시지에 이슈 번호 연결)
     ↓
5. PR 열기 (본문에 "Closes #<번호>" + 리뷰 요청)
     ↓
6. CI 통과 + 리뷰 + 머지 (Squash·Rebase·Merge 중 팀 컨벤션)
     ↓
7. 이슈 자동 닫힘 + 브랜치 삭제
```

각 단계가 **git log + 이슈**로 자동 연결되면 3개월 뒤에도 "이 커밋 왜 들어갔지" 추적 가능.

## Issue 트래커 도구

| 도구 | 적합 상황 |
|---|---|
| **GitHub Issues + Projects** | 코드와 같은 곳, 무료, 자동화 내장 |
| **Jira** | 엔터프라이즈·복잡한 워크플로·커스텀 필드 많음 |
| **Linear** | 모던 SaaS, 빠른 UX, 작은~중간 팀 |
| **Notion DB** | 문서 기능과 합치고 싶을 때 |

**GitHub Issues**는 코드와 같은 자리에 있어 **PR과 자동 연결**, 무료, 충분한 기능이라 대부분 조직에 적합. 커스텀 워크플로가 필요하면 Jira·Linear.

## Issue 작성 원칙

- **제목**: "무엇을/왜" 한 줄 (예: `댓글 삭제 API 추가 (기획 #12)`)
- **본문**: 배경 → 구현 요구사항 → 수용 기준(Acceptance Criteria)
- **레이블**: `feature`·`bug`·`refactor`·`docs` 등 분류 + `minor`·`major`·`urgent` 중요도
- **할당**: 한 이슈 = 한 담당자 원칙 (책임 분명)
- **프로젝트 보드**: 칸반 컬럼(To do·In progress·Review·Done) 자동 이동

## 브랜치 네이밍

```
<type>/<issue-number>-<short-description>

예:
  feature/12-add-comment-delete
  fix/34-null-pointer-in-login
  refactor/56-extract-payment-service
```

- **type**: `feature`·`fix`·`refactor`·`docs`·`chore`
- **issue-number**: 연결된 이슈 번호 (git 로그에서 이슈 추적 가능)
- **short-description**: kebab-case, 한 줄

## 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

Closes #<issue-number>
```

예:
```
feat(comment): add comment delete API

- DELETE /comments/:id endpoint
- Permission check for author or admin
- Soft delete with deleted_at

Closes #12
```

`Closes #12` 문법이 머지 시 **이슈 자동 닫힘** 트리거.

## PR (Pull Request) 원칙

- **작게** — 400줄 이하 권장. 리뷰어 집중력 한계
- **이슈 연결** — 제목·본문에 `#<number>` 명시
- **Self-review 먼저** — 코드 보며 PR 본문에 설명 작성
- **체크리스트**:
  - [ ] 테스트 추가/갱신
  - [ ] 문서 업데이트
  - [ ] 수동 테스트 완료
  - [ ] Breaking change 여부

리뷰 원칙은 [[Code-Review-Culture]]·[[Code-Review-Pn-Priority]] 참고.

## 머지 전략

| 방식 | 결과 | 적합 상황 |
|---|---|---|
| **Merge Commit** | 병합 커밋 추가, 히스토리 보존 | 큰 기능 브랜치, 히스토리 필요 |
| **Squash Merge** | 여러 커밋을 **하나로 합쳐** main에 | 작은 PR, 깔끔한 main 선호 |
| **Rebase Merge** | 리베이스 후 fast-forward | 선형 히스토리 선호 |

**Squash Merge**가 단일 기능 단위 PR에 가장 많이 쓰임. main 히스토리가 "기능 단위 커밋 리스트"가 되어 추적·롤백 쉬움.

## master/main 안정성

원칙: **main의 코드는 항상 배포 가능한 상태**.

보호 수단 (GitHub Branch Protection):
- ✅ PR 머지만 허용 (직접 push 금지)
- ✅ **CI 통과** 의무 (빌드·테스트·린트)
- ✅ **최소 N명 리뷰** 의무
- ✅ 머지 전 **브랜치 최신화** 강제
- ✅ Force push·삭제 금지

깨진 상태로 main 들어가면 "지금 배포해도 되는 건가"를 매번 확인해야 함 → 의사소통 비용 폭증.

## 예외 처리

### Hotfix
main이 프로덕션과 다를 때. `hotfix/<issue>` 브랜치에서 main 수정 + 배포 + develop 동기화.

### Long-lived Feature
큰 기능이라 며칠~몇 주 걸릴 때:
- **Feature Flag**로 main에 계속 머지하되 기능은 OFF
- 또는 `feature/<name>` 브랜치를 길게 유지하되 **정기 rebase**로 main 동기화

## 혼자 할 때도 지켜야 하는가

네. 오히려 **더 중요**. 사수가 없으므로 "왜 이렇게 짰지"를 미래의 자신에게 설명할 수단이 이슈·PR뿐.

혼자 프로젝트에서도:
- 이슈 먼저 쓰기 (생각 정리)
- 브랜치 분리 (실패 시 롤백)
- 작은 PR (한 번에 한 목적)
- `Closes #N` (자동 연결)

이 루프가 습관이 되면 팀 합류 시 빠르게 녹아듦.

## 면접 체크포인트

- Issue → Branch → PR → Merge 루프의 이점
- Conventional Commits 포맷과 `Closes #N` 자동 연결
- Squash/Merge/Rebase 전략 선택 기준
- main 안정성 원칙과 브랜치 보호 규칙
- 혼자 개발할 때도 이 프로세스를 지키는 이유

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 3. 개발 프로세스 정립](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-3.-%EA%B0%9C%EB%B0%9C-%ED%94%84%EB%A1%9C%EC%84%B8%EC%8A%A4-%EC%A0%95%EB%A6%BD)

## 관련 문서
- [[Version-Control-Tooling|버전 관리 도구]]
- [[Code-Review-Culture|코드 리뷰 문화]]
- [[Code-Review-Pn-Priority|코드 리뷰 Pn룰]]
