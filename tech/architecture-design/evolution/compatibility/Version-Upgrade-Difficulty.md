---
tags: [architecture, evolution, compatibility, upgrade, database, nodejs, npm, dependency]
status: done
verified_at: 2026-09-02
category: "Architecture - 진화"
aliases: ["Version Upgrade Difficulty", "버전 업그레이드 난이도", "업그레이드 난이도 구조", "DB 런타임 패키지 업그레이드"]
---

# 버전 업그레이드의 난이도 구조

DB 엔진, 런타임, 패키지 버전을 올리는 작업 자체는 명령 몇 줄이다. 어려운 것은 그 변경이 무엇을 건드리는지 전부 찾아내는 일, 되돌릴 수 있게 만드는 일, 서비스를 세우지 않고 전환하는 일이다. 난이도는 세 요소의 곱으로 보면 예측이 맞는다.

- **되돌림 비용**: 실패했을 때 이전 상태로 가는 데 무엇을 잃는가
- **발견 비용**: 깨지는 지점을 배포 전에 얼마나 찾아낼 수 있는가
- **누적 격차**: 미룬 기간만큼 한 번에 넘어야 할 breaking change가 쌓인다

## 세 축 비교

| 축 | 되돌리기 | 영향 범위 | 배포 전 검출 수단 | 격차의 비용 |
|---|---|---|---|---|
| DB 엔진 메이저 | 백업 복원, 그 사이 쓰기 유실 | DB를 쓰는 모든 서비스 | 복제본 리허설, 업그레이드 체커 | 메이저 여러 단계를 한 번에 넘게 됨 |
| 런타임 메이저 | 이미지 태그 되돌리기 | 서비스 하나와 그 빌드 체인 | CI 매트릭스, 네이티브 모듈 빌드 | EOL 뒤 보안 패치 중단, 플랫폼이 배포를 막음 |
| 패키지 | lockfile revert | 서비스 하나 | 타입 체크, 테스트 | 하나도 혼자 못 올리는 잠금 상태 |

DB가 가장 무겁고 패키지가 가장 가볍다. 차이는 작업량이 아니라 상태를 가지고 있는가, 그리고 컴파일러와 CI가 먼저 잡아 주는가에서 온다.

## DB 엔진 메이저 업그레이드

**되돌리기가 안 된다.** MySQL 8.0은 데이터 딕셔너리가 InnoDB 기반 트랜잭셔널 딕셔너리로 바뀌었고, 8.0에서 5.7로의 다운그레이드는 지원되지 않는다. PostgreSQL은 메이저 버전마다 내부 저장 형식이 바뀔 수 있어 `pg_upgrade`나 dump and restore, 논리 복제를 거쳐야 하고, 마이너 버전만 데이터 파일을 그대로 쓴다. 어느 쪽이든 롤백은 백업 복원이라 전환 뒤 들어온 쓰기를 잃는다.

**에러 없이 동작만 바뀐다.** 시작은 되는데 쿼리 결과나 성능이 달라지는 변경이 가장 늦게 발견된다. MySQL 5.7에서 8.0으로 갈 때의 대표 항목:

- 기본 문자 집합이 `latin1`에서 `utf8mb4`로, 기본 collation이 `utf8mb4_0900_ai_ci`로 바뀐다. 새로 만드는 테이블과 기존 테이블의 collation이 갈려 조인에서 collation 혼합 오류가 난다 ([[MySQL-Collation|MySQL Collation]])
- `GROUP BY`가 암묵적으로 정렬하지 않는다. 정렬에 기대던 쿼리는 `ORDER BY`를 붙여야 한다
- `RANK`, `GROUPS` 같은 단어가 예약어가 되어 컬럼명이나 별칭으로 쓰던 쿼리가 문법 오류가 된다
- 쿼리 캐시가 제거되어 그 캐시에 기대던 읽기 부하가 드러난다
- 기본 인증 플러그인이 `caching_sha2_password`로 바뀌어 이를 모르는 구 드라이버가 접속하지 못한다

옵티마이저 변경은 목록으로 만들 수 없다. 잘 돌던 쿼리 하나의 실행 계획이 바뀌어 느려지는 일은 어느 메이저에서든 생기므로, 대표 쿼리의 실행 계획을 전후로 비교하는 것이 실질적인 검출 수단이다. PostgreSQL 17 이하의 `pg_upgrade`는 옵티마이저 통계를 옮기지 않아 전환 직후 통계를 다시 모으기 전까지 계획이 흔들린다 (18부터 통계 보존).

**DB를 쓰는 모든 서비스가 대상이다.** 드라이버와 ORM 버전을 서비스마다 맞춰야 하므로 한 팀의 일이 아니다.

**메이저는 재시작을 수반한다.** 무중단으로 하려면 논리 복제로 새 버전 클러스터를 따라가게 한 뒤 전환하는 Blue/Green이 필요하고, 그 준비가 업그레이드 본체보다 크다. 관리형 DB는 표준 지원이 끝난 버전에 Extended Support 요금을 붙이고, 그 기간이 끝나면 강제로 올린다. 세부는 [[RDS-Operational-Pitfalls|RDS 운영 함정]]에 둔다.

**사전 점검 도구를 먼저 돌린다.** MySQL Shell의 upgrade checker(`util.checkForServerUpgrade()`)는 예약어 충돌, 제거된 기능, 문자 집합 문제를 목록으로 뽑아 주고, `pg_upgrade --check`는 실제 전환 없이 호환성만 확인한다. 이 결과가 비어 있어도 동작 변화까지 보장하지는 않으므로 복제본 리허설을 대신하지 못한다.

## Node.js 런타임 메이저 업그레이드

**네이티브 애드온 ABI가 메이저마다 바뀐다.** V8 API에 직접 의존하는 애드온은 재빌드해야 하고, 업데이트가 끊긴 패키지는 빌드 자체가 실패한다. Node-API 애드온만 재빌드 없이 넘어간다 ([[Nodejs-Native-Addons|Node.js 네이티브 애드온]]).

**같이 딸려오는 것이 바뀐다.** 런타임에는 V8, OpenSSL, npm이 번들되어 있어 이들의 메이저 변경이 함께 온다. Node.js 17에서 OpenSSL 3으로 올라가며 오래된 해시와 암호 방식이 기본에서 막혀 webpack 4의 md4 해시가 `ERR_OSSL_EVP_UNSUPPORTED`로 실패한 것, npm 7부터 peer dependency를 자동 설치하고 충돌을 `ERESOLVE` 오류로 바꾼 것이 대표다.

**지원 플랫폼 하한이 올라간다.** Node.js 18부터 Linux 공식 바이너리는 glibc 2.28 이상을 요구해 CentOS 7, Amazon Linux 2, Ubuntu 18.04 같은 환경에서 실행되지 않는다. 베이스 이미지와 빌드 서버의 OS까지 같이 움직인다.

**경고였던 것이 에러가 된다.** 폐기(deprecation)는 문서 표기, 런타임 경고, 제거 순으로 여러 메이저에 걸쳐 진행된다. 경고를 무시한 채 메이저를 건너뛰면 제거 단계를 한 번에 맞는다.

**배포 환경을 한꺼번에 맞춘다.** Dockerfile의 베이스 이미지, CI의 Node 버전, `package.json`의 `engines`, Lambda 런타임이 전부 같은 버전을 가리켜야 한다. Lambda는 런타임 지원 종료 뒤 단계적으로 함수 생성, 그다음 함수 갱신을 막으므로 업그레이드가 선택이 아니게 된다.

Node.js 26까지는 짝수 메이저만 LTS로 승격됐고, 공식 릴리스 페이지 기준으로 27부터는 연 1회 릴리스로 바뀌어 모든 메이저가 Current 6개월 뒤 LTS로 넘어간다. 어느 쪽이든 지원 기간이 정해져 있으므로 공식 릴리스 일정으로 EOL을 추적하고 그 전에 다음 LTS로 옮기는 것이 운영 기본이다 ([[Nodejs-Production-Readiness|Node.js 프로덕션 운영 체크리스트]]).

## 패키지 업그레이드

셋 중 가장 가볍다. `package.json`과 lockfile을 되돌리면 끝나고, 서비스 단위로 격리되며, 타입 체커와 테스트가 사람보다 먼저 깨진 곳을 잡는다. 대신 개수가 많고 서로 얽혀 있다.

**semver는 약속이지 보증이 아니다.** 0.y.z는 규격상 언제든 무엇이든 바뀔 수 있는 초기 개발 버전이라 minor를 major로 취급해야 한다. TypeORM이 0.3 계열에 수년간 머물다 1.x로 올라간 것이 그 예다. TypeScript는 minor 릴리스에도 타입 검사를 깨는 변경을 넣고 공식 Breaking Changes 위키에 버전별로 기록하므로, minor 하나에도 컴파일이 깨질 수 있다.

**전이 의존성과 peer가 트리를 만든다.** 직접 의존이 수십 개면 실제 트리는 수백에서 수천 개다. 같은 패키지가 두 버전으로 중복 설치되면 `graphql`처럼 인스턴스 동일성을 검사하는 라이브러리는 다른 모듈이나 realm의 객체라는 런타임 오류를 낸다. `npm ls <패키지>`로 중복을, `npm explain <패키지>`로 누가 끌어왔는지 본다.

**ESM 전용 전환이 CJS 프로젝트를 막는다.** chalk, node-fetch, got 같은 패키지가 어느 메이저에서 ESM 전용이 되면서 CommonJS로 빌드하는 NestJS 프로젝트의 `require`가 실패한다. 현재 Node.js는 top-level await가 없는 ESM을 `require()`로 불러올 수 있지만, 있는 모듈은 여전히 안 되므로 구 메이저에 오래 머무는 프로젝트가 많다 ([[Module-System-ESM|ESM 모듈 시스템]]).

**프레임워크 메이저는 딸린 것을 끌고 온다.** NestJS 11이 Express 5를 기본으로 잡으면서 path-to-regexp 문법이 바뀌어 와일드카드 라우트를 고쳐야 했고, TypeORM 0.2에서 0.3으로 갈 때는 `Connection`이 `DataSource`로 바뀌고 `findOne(id)` 형태와 ormconfig 파일 지원이 제거됐다. 프레임워크 자체보다 그 밑의 변경이 더 큰 경우가 흔하다 ([[TypeORM-Version-Guide|TypeORM 버전 가이드]]).

**보안 패치가 메이저를 강제한다.** 취약점 수정이 새 메이저에만 있으면 준비 없이 올려야 한다. 전이 의존이면 `overrides`로 특정 버전을 강제할 수 있지만, 상위 패키지가 검증하지 않은 조합을 만드는 것이므로 임시 봉합으로만 쓴다.

**방치된 패키지가 허브가 된다.** 옛 peer 범위를 고정한 채 업데이트가 끊긴 패키지 하나가 나머지 전부를 막는다. 이것은 업그레이드가 아니라 교체 문제라서 가장 오래 걸린다.

## 난이도를 실제로 가르는 조건

기술 축보다 다음 세 조건이 난이도를 더 크게 바꾼다.

1. **테스트 커버리지**: 동작 변화를 배포 전에 잡을 수단이 없으면 모든 업그레이드가 운에 맡기는 일이 된다
2. **프로덕션과 같은 스테이징**: 같은 DB 엔진, 같은 이미지, 같은 lockfile로 리허설할 곳이 있어야 한다
3. **버전 격차**: 매 LTS마다 따라가는 팀에게는 반나절 작업이고, 수년 미룬 팀에게는 분기 단위 프로젝트다

여기에 조직의 비대칭이 얹힌다. 성공하면 아무것도 보이지 않고 실패하면 장애이므로 아무도 맡으려 하지 않고, 그래서 실제보다 큰일로 취급된다. 이 비대칭을 깨는 방법은 업그레이드를 이벤트가 아니라 정기 작업으로 만들어 한 번의 크기를 줄이는 것이다.

## 격차를 작게 유지하는 운영

- **lockfile을 커밋하고 `npm ci`로 설치한다.** lockfile과 `package.json`이 어긋나면 설치가 실패하므로 어제와 오늘의 트리가 같다.
- **patch와 minor는 자동화한다.** Renovate나 Dependabot이 올린 PR을 CI가 통과하면 자동 머지하고, major만 하나씩 changelog와 migration guide를 읽고 올린다.
- **한 번에 한 축만 올린다.** ORM, 드라이버, 런타임, DB 엔진을 한 배포에 섞으면 무엇이 깨뜨렸는지 좁힐 수 없다 ([[ORM-Upgrade-Verification|ORM 업그레이드 검증]]).
- **런타임은 LTS 일정에 맞춘다.** 다음 LTS가 Active가 되면 CI 매트릭스에 먼저 추가하고, 현재 버전이 Maintenance로 내려가기 전에 기본값을 옮긴다.
- **DB 마이너는 관리형 자동 적용을 검토하고, 메이저는 복제본 리허설과 Blue/Green으로 간다** ([[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]]).
- **게이트 순서는 타입 체크, 테스트, 스테이징, 제한 배포다.** 앞 단계가 싸고 빠르므로 거기서 대부분을 걸러낸다.

## 면접 체크포인트

- DB 메이저 업그레이드가 런타임이나 패키지보다 무거운 구조적 이유 (상태, 비가역, 공유)
- MySQL 5.7에서 8.0으로 갈 때 에러 없이 동작만 바뀌는 항목과 그 검출 방법
- Node.js 메이저 업그레이드에서 애플리케이션 코드 밖에서 깨지는 지점 (ABI, 번들 구성요소, 플랫폼 하한, 배포 환경)
- 패키지 업그레이드가 가벼운 이유와 그럼에도 어려워지는 여섯 지점
- 업그레이드 경험을 말할 때 명령을 쳤다는 사실이 아니라 깨질 지점을 어떻게 찾았고 롤백 경로를 어떻게 확보했는지가 평가 대상인 이유

## 출처

- [MySQL 8.0 Reference Manual, Downgrading MySQL](https://dev.mysql.com/doc/refman/8.0/en/downgrading.html)
- [MySQL 8.0 Reference Manual, What Is New in MySQL 8.0](https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html)
- [MySQL 8.0 Reference Manual, Changes in MySQL 8.0](https://dev.mysql.com/doc/refman/8.0/en/upgrading-from-previous-series.html)
- [MySQL Shell 8.0, Upgrade Checker Utility](https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html)
- [PostgreSQL Documentation, Upgrading a PostgreSQL Cluster](https://www.postgresql.org/docs/current/upgrading.html)
- [PostgreSQL Documentation, pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html)
- [PostgreSQL Documentation, Release 18](https://www.postgresql.org/docs/18/release-18.html)
- [Amazon RDS User Guide, Using Amazon RDS Extended Support](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html)
- [Node.js Documentation, Node-API](https://nodejs.org/api/n-api.html)
- [Node.js, Previous Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js v17.0.0 (Current) — Node.js Blog](https://nodejs.org/en/blog/release/v17.0.0)
- [Node.js Documentation, Modules: CommonJS modules, Loading ECMAScript modules using require()](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)
- [BUILDING.md, Platform list — GitHub, nodejs/node v18.x](https://github.com/nodejs/node/blob/v18.x/BUILDING.md#platform-list)
- [AWS Lambda Developer Guide, Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Breaking Changes — GitHub, microsoft/TypeScript Wiki](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes)
- [npm 7 is now generally available! — The GitHub Blog](https://github.blog/2021-02-02-npm-7-is-now-generally-available/)
- [npm Docs, package.json, overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- [npm Docs, npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [instanceOf.ts — GitHub, graphql/graphql-js v16.11.0](https://github.com/graphql/graphql-js/blob/v16.11.0/src/jsutils/instanceOf.ts)
- [chalk README — GitHub, chalk/chalk](https://github.com/chalk/chalk#readme)
- [Announcing NestJS 11: What's New — Trilon](https://trilon.io/blog/announcing-nestjs-11-whats-new)
- [CHANGELOG 0.3.0 — GitHub, typeorm/typeorm](https://github.com/typeorm/typeorm/blob/master/CHANGELOG.md#030-2022-03-17)
- [Renovate Docs, Automerge configuration](https://docs.renovatebot.com/key-concepts/automerge/)

## 관련 문서

- [[RDS-Operational-Pitfalls|RDS 운영 함정]] — 메이저 업그레이드의 다운타임, 롤백과 Extended Support
- [[OpenSearch-Service-Engine-Upgrade|OpenSearch Service 엔진 업그레이드]] — 관리형 검색 엔진의 메이저 전환 절차
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]] — 호환성 spike와 운영 전환의 분리, 증거가 무효가 되는 변경
- [[TypeORM-Version-Guide|TypeORM 버전 가이드]] — 0.3에서 1.x로 넘어갈 때의 engines와 제거된 API
- [[Nodejs-Production-Readiness|Node.js 프로덕션 운영 체크리스트]] — LTS 추적과 정기 패치
- [[Module-System-ESM|ESM 모듈 시스템]] — CJS에서 ESM을 불러오는 조건
- [[Nodejs-Native-Addons|Node.js 네이티브 애드온]] — V8 API와 Node-API의 ABI 안정성 차이
- [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] — 마이너 자동 업그레이드 정책
- [[MySQL-Collation|MySQL Collation]] — collation 혼합과 coercibility
- [[Backward-Compatibility-Design|하위 호환성 설계]] — 우리가 제공하는 계약의 breaking 판정
- [[Runtime-Stack-Evolution|런타임 스택 진화]] — 언어 업그레이드 방치의 비용
- [[Technical-Debt|기술 부채]] — 미룬 업그레이드는 이자가 붙는 부채
