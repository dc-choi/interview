---
tags: [runtime, nodejs, tooling, dependency]
status: done
verified_at: 2026-09-09
category: "OS & Runtime"
aliases: ["의존성 선택", "라이브러리 평가", "라이브러리 선별", "Dependency Selection"]
---

# 의존성 선택과 라이브러리 평가 (Dependency Selection)

npm 생태계는 패키지 수가 많고 품질 편차가 커서, 라이브러리 도입은 찾기와 검증을 나눠서 판단한다. 이 문서는 도입 전 선별에 집중한다. 도입 이후의 버전 범위, lockfile과 업데이트 전략은 [[Dependency-Management]], 취약점 스캔의 파이프라인 통합과 트리아지는 [[Dependency-Vulnerability-Scanning]]에서 다룬다.

## 0. 라이브러리가 필요한가

npm 생태계의 가장 큰 함정은 과의존이다. 후보를 찾기 전에 한 단계 위를 먼저 확인한다.

- **Node 빌트인으로 되는가.** 표준이 흡수한 기능이 많아, 예전에 라이브러리를 쓰던 일이 지금은 내장으로 해결된다.
- **몇 줄로 되는가.** `left-pad`, `is-odd` 같은 마이크로 패키지는 의존성이 아니라 부채다. transitive 트리와 공급망 표면만 키운다.

주요 내장 대체 (도입 열은 unflagged 또는 stable 기준):

| 필요 | 내장 | 도입 |
|---|---|---|
| HTTP 요청 | 전역 `fetch` | v21 stable (v18~v20 unflagged, experimental) |
| 테스트 러너 | `node:test` | v20 stable (v18 experimental) |
| 깊은 복사 | 전역 `structuredClone` | v17+ |
| CLI 인자 파싱 | `node:util`의 `parseArgs` | v20 stable (v18.3+, v16.17+) |
| 취소 신호 | 전역 `AbortController` | v15.4 stable |

## 1. 후보 찾기 (Discovery)

- **awesome-nodejs**, GitHub Topics와 Trending으로 목적별 후보 목록을 훑는다.
- **npm trends**로 같은 목적의 여러 패키지 다운로드 추이를 나란히 비교한다.
- **Moiva**로 다운로드, 스타, 번들 크기, 이슈를 한 화면에서 비교한다.
- 뉴스레터와 커뮤니티(Node Weekly, JavaScript Weekly, r/node)로 최신 후보를 얻는다.
- **역참조 신뢰**: 이미 신뢰하는 프레임워크(Next, Fastify 등)가 의존하는 패키지를 보면 검증된 후보가 나온다.

## 2. 평가 기준

찾기보다 검증이 핵심이다.

| 기준 | 확인 방법 | 판단 |
|---|---|---|
| 유지보수 활성도 | 최근 커밋과 릴리스 주기, 이슈 응답 속도, open/closed 비율 | 완성되어 조용한 소형 라이브러리는 예외로 본다 |
| 채택도 | npm 주간 다운로드, dependents 수 | 스타 수는 참고만 |
| 의존성 트리 | `npm ls`, Bundlephobia로 transitive 확인 | 얕고 적을수록 좋다 |
| 번들 크기 | Bundlephobia | tree-shaking과 ESM 지원 여부 |
| 타입 지원 | 내장 `.d.ts`인지, `@types` 별도 의존인지 | 1급 타입이 유리 |
| 문서와 예제 | README, 실사용 예제, CHANGELOG | semver 준수도까지 본다 |
| 라이선스 | 패키지 라이선스 | copyleft(GPL) 여부와 프로젝트 호환성 |
| 버스 팩터 | 메인테이너 구성 | 1인 대 조직이나 재단 백업 |

## 3. 도구

| 도구 | 용도 |
|---|---|
| Snyk Advisor | 인기, 보안, 유지보수, 커뮤니티를 종합한 패키지 헬스 스코어 |
| Socket | 공급망 관점. postinstall 스크립트, 네트워크나 파일 접근, 난독화, 최근 소유권 이전 등 악성 신호 |
| deps.dev | 의존성 그래프, 라이선스, 보안을 한눈에 (Google) |
| Bundlephobia | 번들 크기와 의존성 |
| npm trends, Moiva | 다운로드 추이와 다차원 비교 |
| Libraries.io | dependents와 릴리스 이력 |

요즘 npm 위협은 알려진 취약점보다 악성 패키지 쪽이 커져서, 도입 직전 Socket으로 공급망 신호를 확인하는 절차가 특히 중요해졌다. 공급망 공격 벡터의 상세는 [[Supply-Chain-Security]], CVE 중심의 스캔 파이프라인과 트리아지는 [[Dependency-Vulnerability-Scanning]]을 따른다.

## 4. 위험 신호 (Red flags)

- deprecated 표기, 수년째 방치에 미해결 크리티컬 이슈 다수
- 작은 기능인데 의존성 트리가 거대함
- postinstall 등 install 스크립트 존재 (공급망 공격 벡터, 단 sharp, bcrypt 같은 네이티브 애드온은 정당한 예외)
- 최근 소유권 이전 (계정 탈취나 하이재킹 위험)
- 이름 오탈자를 노린 타이포스쿼팅, 정확한 패키지명 확인
- 1인 메인테이너 무응답

## 면접 포인트

- 라이브러리를 어떻게 고르나 → 먼저 빌트인이나 몇 줄로 되는지 확인해 도입 자체를 줄이고, npm trends와 Moiva로 후보를 좁힌 뒤 유지보수, 의존성 트리, 타입, 라이선스로 검증하고, 도입 직전 Socket으로 공급망을 본다.
- 스타 수가 많으면 좋은 라이브러리인가 → 스타는 관심의 대리 지표일 뿐이다. 주간 다운로드, dependents, 이슈 응답, 릴리스 주기가 실제 건강도를 더 잘 보여준다.
- 의존성이 적은 게 왜 중요한가 → transitive 트리가 커질수록 공급망 공격 표면과 유지보수 부담이 함께 늘어난다. left-pad 사건처럼 작은 패키지 하나가 전체를 흔들 수 있다.

## 출처
- [Node.js, Global objects](https://nodejs.org/api/globals.html)
- [Node.js, Test runner](https://nodejs.org/api/test.html)
- [Node.js, util.parseArgs](https://nodejs.org/api/util.html)
- [Snyk Advisor](https://security.snyk.io/package/npm/express)
- [Socket](https://socket.dev)
- [deps.dev](https://deps.dev)
- [Bundlephobia](https://bundlephobia.com)
- [npm trends](https://npmtrends.com)

## 관련 문서
- [[Dependency-Management|의존성 관리]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Package-Publishing|패키지 배포]]
- [[Nodejs-Native-Addons|네이티브 애드온과 prebuild]]
- [[Version-Upgrade-Difficulty|버전 업그레이드 난이도]]
- [[ADR|라이브러리 선택 결정 기록]]
- [[Node.js]]
