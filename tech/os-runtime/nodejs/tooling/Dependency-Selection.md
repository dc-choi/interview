---
tags: [runtime, nodejs, tooling, dependency]
status: done
verified_at: 2026-10-06
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

### 기존 의존성을 내장 API로 바꿀 때

내장 API가 생겼다는 이유만으로 바로 제거하지 않는다. 최소 지원 Node 버전과 실제 호출부의 기능 차이를 확인한 뒤 복구 가능한 상태에서 codemod를 실행하고 diff, 타입 검사와 동작 테스트를 확인한다. 변환이 건너뛴 호출과 남은 import까지 확인해야 의존성을 제거할 수 있다.

`chalk`, `kleur`, `ansi-colors`의 단순 색상과 스타일은 `util.styleText()`로 옮길 수 있다. 체이닝은 스타일 배열로 표현하지만 RGB/hex, 사용자 theme/alias, 런타임 색상 토글과 특수 API는 도구별 지원이 다르다. TTY와 색상 환경 변수에 따른 출력도 확인한다. codemod 예제와 지원 목록이 다르면 설치한 도구의 실제 diff를 기준으로 판단한다.

HTTP 클라이언트는 [[HTTP-Networking#Axios에서 Fetch로 이전]], 테스트 러너는 [[Test-Runner-Basics#Mocha에서 이전할 때]], TypeScript import 경로는 [[TypeScript-Node]]의 계약 차이를 검토한다. 자동 변환 성공을 동등한 동작의 증거로 쓰지 않는다.

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
| 유지보수 자금 | 급여를 받는 유지보수 인력, 주 후원사와 수입원 | 채택도와 별개로 보고, 후원사가 떠날 때의 계획을 확인 (6절) |

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

## 5. 거버넌스 리스크 — 누가 배포 채널을 쥐고 있나

라이선스가 자유롭고 상표가 재단에 있어도, 레지스트리와 업데이트 서버를 통제하는 주체가 생태계 참여 자격을 사실상 결정한다. 포크할 자유가 있어도 배포 경로가 없으면 실효성이 낮다. 위 평가 기준의 버스 팩터를 조직 수준으로 넓힌 항목이다.

- 상표 보유 주체와 상업 라이선스 조건
- 레지스트리와 업데이트 서버의 소유자
- 커밋과 릴리스 권한의 분산 정도, 단일 기업의 기여 비중
- 분쟁 시 결정을 되돌리는 절차가 있는가 (법원 명령 밖의 경로)
- 포크 가능성의 실효성: 라이선스만이 아니라 배포 경로를 확보할 수 있는가
- 사용자 계정과 접근권이 누구의 재량에 걸려 있는가

한 기업이 인프라, 최대 기여자, 상업 라이선스 독점을 동시에 쥐면 그 기업의 내부 분쟁이 생태계 전체의 가용성 사건이 되고, 기여 시간 자체가 협상 지렛대로 쓰일 수 있다. WordPress에서는 GPL 소프트웨어, 상표를 가진 재단, 플러그인과 업데이트 인프라를 개인적으로 통제하는 한 기업의 CEO가 분리돼 있었다. 2024년 한 호스팅 업체와의 분쟁에서 인프라 접근 차단, 로그인 확인 절차, 플러그인 포크와 업데이트 경로 전환이 잇따랐고 되돌림은 법원의 예비적 금지명령으로만 작동했다. 2026년 9월에는 그 기업 이사회가 CEO를 유급 휴직 조치했다가 48시간 안에 복귀하는 일이 있었다.

## 6. 자금 리스크 — 누가 유지보수 비용을 내나

채택도와 유지보수 자금은 별개다. 다운로드와 dependents가 늘어도 유지보수 인력의 급여를 내는 수입원은 줄어들 수 있고, 주 후원사가 떠나면 널리 쓰이던 프로젝트도 새 유지보수 주체를 찾아야 한다. 라이선스가 포크를 허용해도 포크를 계속 유지할 사람과 비용은 따로 마련해야 하므로, 포크할 권리와 유지할 여력을 구분한다. 버스 팩터와 위 거버넌스 리스크를 자금 관점으로 넓힌 항목이다.

- 누가 급여를 받으며 유지보수하는가: 개인 자원봉사, 한 기업의 직원, 재단이나 여러 후원사
- 유지보수 비용의 수입원은 무엇이며, 사용량이 늘 때 그 수입원도 함께 느는 구조인가
- 주 후원사가 떠날 때 후원 종료 시점, 유지보수 주체 이양, 저장소 보관(archive) 중 무엇을 공지하는가
- 깊이 의존한다면 후원, 기여나 포크 유지 비용을 조직이 나눠 맡을 수 있는가

다음은 2026-10-06에 확인한 당사자 발표 기준의 사례다. Tailwind CSS를 처음 만든 메인테이너는 2026년 1월 문서 저장소의 공개 PR 댓글에서, Tailwind가 그 어느 때보다 많이 쓰이는데도 문서 트래픽은 2023년 초보다 약 40%, 매출은 80% 가까이 줄었고 AI가 사업에 준 타격으로 엔지니어링 팀의 75%가 일자리를 잃었다고 밝혔다. 문서가 상용 제품을 알리는 유일한 경로여서, LLM이 문서를 읽기 쉬워질수록 문서 방문과 유료 제품을 알게 되는 사람이 줄어든다고 설명했다. 2026-09-09 Tailwind Labs는 Shopify 합류를 발표하며 오픈소스 프로젝트는 MIT 라이선스로 남고 기존 팀이 Shopify의 지원으로 계속 유지보수한다고 밝혔고, 상용 제품인 Tailwind Plus와 ui.sh는 기존 고객의 이용을 유지하되 신규 가입을 닫았다.

후원사가 떠나는 쪽의 사례도 있다. 2026-09-10 Shopify는 모바일 앱의 네이티브 전환을 발표하며 자사가 만들거나 후원한 React Native 라이브러리별 계획을 공지했다. React Native Skia는 2026년 말까지 후원하고 이후 기존 메인테이너가 포크해 새 이름으로 배포하며, 이전이 끝나면 원 저장소를 보관 처리한다. Shopify가 주간 약 200만 다운로드라고 밝힌 FlashList는 호환성을 깨는 치명적 문제를 계속 고치면서 장기 유지보수를 맡을 기업들과 논의 중이다. 사용자 기반이 작은 Restyle은 2026년 말까지 동작을 유지한 뒤 유지보수를 중단하고 저장소를 보관 처리하며, 포크는 누구나 할 수 있다고 밝혔다.

## 면접 포인트

- 라이브러리를 어떻게 고르나 → 먼저 빌트인이나 몇 줄로 되는지 확인해 도입 자체를 줄이고, npm trends와 Moiva로 후보를 좁힌 뒤 유지보수, 의존성 트리, 타입, 라이선스로 검증하고, 도입 직전 Socket으로 공급망을 본다.
- 스타 수가 많으면 좋은 라이브러리인가 → 스타는 관심의 대리 지표일 뿐이다. 주간 다운로드, dependents, 이슈 응답, 릴리스 주기가 실제 건강도를 더 잘 보여준다.
- 의존성이 적은 게 왜 중요한가 → transitive 트리가 커질수록 공급망 공격 표면과 유지보수 부담이 함께 늘어난다. left-pad 사건처럼 작은 패키지 하나가 전체를 흔들 수 있다.
- 유명 기업이 쓰거나 후원하는 라이브러리면 안심해도 되나 → 채택도와 유지보수 자금은 별개다. 누가 급여를 받으며 유지보수하는지, 후원사가 떠날 때 이양이나 보관 계획을 공지하는지 보고, 깊이 의존한다면 포크를 유지할 여력까지 함께 판단한다.

## 출처
- [Node.js, Userland migrations](https://nodejs.org/learn/getting-started/userland-migrations)
- [Node.js, Chalk to util.styleText](https://nodejs.org/learn/userland-migrations/chalk-to-util-styletext)
- [Node.js, Kleur to util.styleText](https://nodejs.org/learn/userland-migrations/kleur-to-util-styletext)
- [Node.js, ansi-colors to util.styleText](https://nodejs.org/learn/userland-migrations/ansi-colors-to-styletext)
- [Node.js, Correct TypeScript specifiers](https://nodejs.org/learn/userland-migrations/correct-ts-specifiers)
- [Node.js, Global objects](https://nodejs.org/api/globals.html)
- [Node.js, Test runner](https://nodejs.org/api/test.html)
- [Node.js, util.parseArgs](https://nodejs.org/api/util.html)
- [Snyk Advisor](https://security.snyk.io/package/npm/express)
- [Socket](https://socket.dev)
- [deps.dev](https://deps.dev)
- [Bundlephobia](https://bundlephobia.com)
- [npm trends](https://npmtrends.com)
- [WordPress는 누구의 것인가 — GeekNews](https://news.hada.io/article/who-owns-wordpress)
- [Tailwind Labs is joining Shopify — Tailwind CSS Blog](https://tailwindcss.com/blog/tailwind-is-joining-shopify)
- [feat: add llms.txt endpoint for LLM-optimized documentation (PR #2388) — GitHub tailwindlabs/tailwindcss.com](https://github.com/tailwindlabs/tailwindcss.com/pull/2388)
- [Native is now the future of mobile at Shopify — Shopify Engineering](https://shopify.engineering/back-to-native)

## 관련 문서
- [[Dependency-Management|의존성 관리]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Package-Publishing|패키지 배포]]
- [[Nodejs-Native-Addons|네이티브 애드온과 prebuild]]
- [[Version-Upgrade-Difficulty|버전 업그레이드 난이도]]
- [[ADR|라이브러리 선택 결정 기록]]
- [[Open-Source-License-Review|오픈소스 라이선스 검토]]
- [[Mobile-App-Architectures|모바일 서비스 아키텍처]]
- [[Node.js]]
