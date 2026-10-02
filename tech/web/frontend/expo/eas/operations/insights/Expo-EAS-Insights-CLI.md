---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Insights CLI 조회 계약"]
---

# Insights CLI 조회 계약

## 공통 입력

```sh
eas workflow:insights --workflow ci.yml --git-ref main --days 30 --json
eas workflow:insights:maestro --sort flake-rate --days 7 --json
```

기본은 최근7일이다. --days와 --start/--end는 배타적이며 --start만 주면 현재까지, --end만 주면 실패한다. --workflow는 extension을 포함한 파일명이며 최초 실행 이후 알려진 이름만 받는다. main은 refs/heads/main으로 확장하고 tag는 full ref를 준다. Commit 조회는 run에 기록한 40자 SHA를 사용한다.

--limit은 기본50, 1~100 밖이면 오류다. --project-id로 디렉터리 외부에서 조회할 수 있다. --json은 non-interactive이며 일반 메시지는 stderr, 실패 시 stdout은 비어 있고 exit code는 nonzero다. Shell pipeline에서는 앞 명령 실패가 뒤 parser의 성공으로 가려지지 않게 pipefail 등으로 확인한다.

## Workflow 결과

--status는 SUCCESS/FAILURE/CANCELED, --trigger는 MANUAL/SCHEDULE/GITHUB_PUSH 등의 값이다. JSON의 overview는 current/previous, runsOverTime은 granularity/buckets, workflows는 fileName/name과 지표다. hasMoreWorkflows가 true면 limit으로 잘린 목록이다.

기간을 UTC 전체 구간으로 집계하여 요청한 timestamp보다 범위가 약간 넓을 수 있다. Table이 빈 bucket을 생략해도 JSON은 모두 유지한다.

## Maestro 결과

--status는 PASSED/FLAKY/FAILED다. --search는 flow 목록만 좁히고 overview는 다른 필터가 맞는 전체 flow를 유지한다. sort는 fails/runs/flakes/pass-rate/flake-rate/p90/last-run, 기본 fails 내림차순이다.

--flow에 정확한 repository path를 주면 한 flow history로 전환한다. 이때 --status/--tag/--search/--sort/--sort-direction을 함께 못 쓴다. --limit은 recent runs에 적용하며 errorPatterns는 대표5개다.

JSON duration은 milliseconds이며 null 값의 key는 생략한다. 누락을 0ms로 해석하지 않는다. totals/flows 또는 totals/errorPatterns/recentRuns 구조와 hasMoreFlows/hasMoreRecentRuns를 확인한다.

## 출처

- [Expo Documentation, Query EAS Insights with EAS CLI](https://docs.expo.dev/eas-insights/eas-cli)

## 관련 문서

- [[Expo-EAS-Insights]]

- [[Expo]]
