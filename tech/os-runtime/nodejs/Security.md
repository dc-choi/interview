---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-20
category: "OS & Runtime"
aliases: ["보안 모범 사례"]
---

# 보안 모범 사례

Node 코어의 취약점 분류와 애플리케이션의 위협 모델은 다르다. 의존성 코드와 실행 파일 시스템을 Node가 신뢰한다고 해서 서비스가 그 입력을 무조건 신뢰해도 된다는 뜻은 아니다.

## 주요 보안 위협과 완화

**1. HTTP DoS (CWE-400)**
- 요청 본문 크기와 처리 비용을 제한하고 `headersTimeout`, `requestTimeout`, `timeout`, `keepAliveTimeout`을 목적에 맞게 설정한다. 요청과 소켓의 `error`를 처리한다.
- 클라이언트 Agent의 `maxSockets`는 아웃바운드 연결 제한이다. 인바운드 공격 방어는 서버, 프록시와 애플리케이션의 연결 및 요청 제한으로 설계한다.
- 프록시와 Node가 모호한 HTTP 메시지를 다르게 해석하면 request smuggling이 생길 수 있다. `insecureHTTPParser`에 의존하지 않고 양쪽을 패치하며 프로토콜 변환 경계를 검증한다.

**2. DNS 리바인딩 (CWE-346)**
- Inspector는 런타임 코드를 실행할 권한을 제공한다. 공개 인터페이스에 노출하지 않는다. 운영 진단이 필요하면 loopback 바인딩과 인증된 터널을 사용하고 종료 후 닫는다. DNS rebinding을 포함한 브라우저 경유 접근도 고려한다.

**3. 민감 정보 노출 (CWE-552)**
```bash
npm publish --dry-run    # 발행 전 포함 파일 확인
```
```json
{ "files": ["lib/", "index.js", "README.md"] }
```

게시 전에 실제 tarball의 내용을 검사한다. 노출 뒤에는 패키지 삭제 가능 여부와 별개로 유출된 자격 증명을 폐기하고 교체한다. 이미 다운로드된 사본은 unpublish로 회수되지 않는다.

**4. 타이밍 공격 (CWE-208)**

아래 코드는 Node.js 내장 API가 아니라 별도 `argon2` 패키지의 예시다. 사용 전에 프로젝트에 `npm install argon2`로 의존성을 추가해야 한다.

```js
// 비밀번호는 원문과 해시를 직접 비교하지 않고 비밀번호 해싱 라이브러리로 검증한다.
import * as argon2 from 'argon2';

const valid = await argon2.verify(storedHash, candidatePassword);
```

`crypto.timingSafeEqual()`은 길이가 같은 HMAC이나 비밀 바이트열 비교에 적합하다. 입력 길이가 다르면 예외가 발생하고, 주변 코드까지 상수 시간으로 만들어 주지는 않는다. 비밀번호 저장과 검증은 [[Password-Hashing|비밀번호 해싱]]처럼 Argon2id, scrypt 또는 기존 시스템의 bcrypt 검증 함수를 사용한다.

**5. 프로토타입 오염 (CWE-1321)**
```js
const data = JSON.parse('{"__proto__": { "polluted": true}}');
const unsafe = Object.assign({}, data);
unsafe.polluted;  // true: Object.prototype의 setter가 대상 객체의 프로토타입을 바꿈

const safe = Object.assign(Object.create(null), data);
safe.polluted;                         // undefined
Object.hasOwn(safe, '__proto__');      // true: 일반 데이터 키로만 저장됨
```

입력 스키마에서 `__proto__`, `constructor`, `prototype` 키를 거부하는 것이 우선이고, 프로토타입이 필요 없는 사전은 `Object.create(null)`이나 `Map`으로 만든다. 런타임 방어를 추가할 수 있다.

```bash
node --disable-proto=throw app.js
```

**6. 악의적 제3자 모듈 (CWE-1357)**
```bash
npm ci --ignore-scripts   # lockfile 그대로 설치하고 lifecycle script를 실행하지 않음
npm audit                 # 공개된 취약점 확인
```

`npm audit`은 알려진 취약점을 찾는 도구이지 악성 패키지 탐지 보장은 아니다. 직접 의존성 버전만 고정하면 전이 의존성은 바뀔 수 있으므로 lockfile 변경과 설치 스크립트를 함께 검토한다. GitHub 소스와 실제 게시 tarball도 같다고 가정하지 않는다. `--ignore-scripts`는 네이티브 빌드처럼 필요한 설치 작업도 막을 수 있다.

지원 npm의 `min-release-age`는 새 버전 채택을 일 단위로 지연한다. 탐지 시간을 확보하는 보조책이며 안전성 보장은 아니다. 이 제한이 긴급 보안 수정도 막을 수 있으므로 예외와 재검토 절차를 함께 정한다. OpenSSF Scorecard와 자체 평가 badge는 검토 신호이며 무결점 인증이 아니다.

**의존성 install script의 기본 차단 (2026-10-20 공식 문서와 릴리스 기록 기준)**

| 도구 | 의존성 install script 기본 동작 | 예외 허용 |
|---|---|---|
| npm 12 (2026-07-08 출시) | 실행하지 않음 | root `package.json`의 `allowScripts` |
| pnpm 10.0.0 이상 | 실행하지 않음 | `pnpm-workspace.yaml`의 `allowBuilds`(10.26.0 추가. 그 전 10.x는 `onlyBuiltDependencies`이며 10.5.0 전에는 `package.json`의 `pnpm` 필드에 둔다) |
| Bun | 기본 허용 목록의 패키지만 실행 | `package.json`의 `trustedDependencies` |
| Deno | 실행하지 않음 | `deno install --allow-scripts=npm:<pkg>` |

- **npm 12의 차단 범위:** 의존성의 `preinstall`, `install`, `postinstall`과 암묵적 `node-gyp` 빌드를 막는다. `binding.gyp`만 있고 install script가 없는 패키지도 npm이 `node-gyp rebuild`를 암묵적으로 실행하므로 대상이다. git, file, link 의존성의 `prepare`도 막는다. 허용 목록에 없는 의존성의 스크립트는 건너뛰고 설치가 끝날 때 건너뛴 패키지 목록을 보여 준다. `strict-allow-scripts`를 true로 두면 검토하지 않은 패키지가 있을 때 설치가 실패한다. 기본값에서는 설치가 끝나므로 네이티브 모듈은 실행 시점에 실패할 수 있다(운영 판단).
- **승인 기록:** `npm install-scripts ls`로 검토하지 않은 패키지를 확인하고 `npm install-scripts approve <pkg>`로 허용한 뒤 `npm rebuild`로 실행한다. 승인은 기본으로 `pkg@version` 형태로 버전을 고정해 기록하고(`allow-scripts-pin` 기본 true), `deny`가 남긴 `false` 항목은 다시 승인해도 풀리지 않는다. `npm approve-scripts`와 `npm deny-scripts`는 별칭이며, 기록된 `allowScripts`는 커밋한다. `npx`, `npm exec`와 전역 설치는 `allow-scripts` 설정에 패키지를 쉼표로 나열하고, 패키지가 스스로 적은 이름이 아니라 해석된 의존성 식별자로 대조한다. 프로젝트 정책은 `.npmrc`의 `allow-scripts`로도 둘 수 있지만, 프로젝트 범위의 `npm install`, `ci`, `update`, `rebuild`에 `--allow-scripts`를 CLI로 넘기면 오류다.
- **출처 제한:** npm 12의 `allow-git`과 `allow-remote` 기본값은 `none`이다(`all`, `none`, `root` 중 선택). `allow-git` 기본값 변경은 git 의존성의 `.npmrc`가 git 실행 파일을 바꿔 `--ignore-scripts`로도 막히지 않던 실행 경로를 닫기 위한 것이다. 레지스트리와 같은 호스트의 tarball은 그대로 설치되고 `allow-file`과 `allow-directory`의 기본값은 `all`로 남았다. pnpm 10.0.0 이상 10.26.0 미만도 git 의존성의 `prepare`, `prepublish`, `prepack`이 가져오는 단계에서 실행돼 기본 차단을 우회할 수 있었다(CVE-2025-69264, 10.26.0에서 수정). 스크립트 차단과 의존성 출처 제한은 따로 확인한다.
- **버전 확인:** npm 11은 의존성 스크립트를 실행하고 11.16.0 이상에서 npm 12에서 막힐 동작을 경고한다. Node.js Release WG는 2026-08-13 npm 12를 Node.js 22, 24, 26 계열에 넣지 않기로 했으므로, 번들 npm을 그대로 쓰는 CI와 이미지는 실제 npm 버전을 고정하고 확인한다. npm 12는 알 수 없는 CLI flag와 축약 flag를 경고가 아닌 오류로 처리하고, `.npmrc`의 알 수 없는 설정은 기본값에서 경고만 출력한다(`strict-npmrc`를 true로 두면 오류). Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`을 지원한다.
- **다른 도구:** pnpm의 `allowBuilds`에 없는 패키지는 검토하지 않은 것으로 보고 실행하지 않는다. pnpm 11 이상은 `strictDepBuilds` 기본값이 true라 이때 설치가 0이 아닌 종료 코드로 끝나고, pnpm 10.x는 기본값이 false(10.3.0 추가)라 경고만 출력한다. pnpm 11에서 `onlyBuiltDependencies` 등이 `allowBuilds`로 대체됐다. 현재(2026-10-20, 12 계열) 문서 기준으로 git과 tarball 의존성은 이름만으로 승인되지 않으며, 10.x 문서에는 이 규칙이 없다. Bun은 `trustedDependencies`를 정의하면 기본 허용 목록을 확장하지 않고 대체하며 `file:`, `link:`, `git:`, `github:` 출처 패키지는 직접 적어야 한다. Deno는 node_modules 디렉터리(`--node-modules-dir`)를 쓸 때만 허용한 스크립트를 실행한다.

`ignore-scripts`는 의존성과 프로젝트 자신의 lifecycle script를 모두 막는 전체 차단이고(`npm start`, `npm test`, `npm run`처럼 특정 스크립트를 실행하는 명령은 그 스크립트만 실행하고 pre/post 스크립트는 실행하지 않는다), `allowScripts`는 의존성별 허용 목록이다.

**7. 권한 모델**
```bash
node --permission app.js   # 파일/자식 프로세스 등 접근 제한(네트워크 제한은 Node.js 25 이상)
```

권한 모델은 신뢰한 코드의 우발적 접근을 줄이는 안전장치이며, 악성 코드를 격리하는 보안 경계는 아니다. 신뢰하지 않는 코드는 별도 OS 사용자, 컨테이너나 샌드박스로 격리한다.

**8. 몽키 패칭 방지**
```bash
node --frozen-intrinsics app.js   # 실험 옵션이므로 대상 Node.js 버전에서 지원 상태 확인
```

이 flag는 실험 기능이며 임의의 JavaScript 실행을 격리하는 수단이 아니다. 새 전역 생성과 기존 전역 바인딩 교체도 별개의 문제다.

**9. 모듈 검색 경로와 네이티브 메모리**

쓰기 가능한 디렉터리를 모듈 검색 경로로 신뢰하면 파일 삽입으로 다른 코드가 로드될 수 있다. 배포 코드와 쓰기 데이터 경로를 분리하고 배포 파일의 권한과 무결성을 관리한다.

`--secure-heap`은 일부 OpenSSL 할당을 위한 제한된 보안 힙이며 일반 V8 힙 전체를 보호하거나 메모리 안전 결함을 없애지 않는다. Windows에서는 지원하지 않는다. 네이티브 의존성 패치와 프로세스 격리는 별도로 필요하다.

## 출처

- [npm Docs, min-release-age](https://docs.npmjs.com/cli/v11/using-npm/config/#min-release-age)

- [Node.js, Crypto](https://nodejs.org/api/crypto.html)
- [Node.js, Permissions](https://nodejs.org/api/permissions.html)
- [Node.js, Command-line API](https://nodejs.org/api/cli.html)
- [Node.js, Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [npm Docs, npm-ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [npm Docs, npm-audit](https://docs.npmjs.com/cli/commands/npm-audit)
- [npm Docs, npm-publish](https://docs.npmjs.com/cli/commands/npm-publish)
- [npm Docs, Config (v12)](https://docs.npmjs.com/cli/v12/using-npm/config)
- [npm Docs, npm install-scripts (v12)](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts)
- [npm Docs, npm approve-scripts (v12)](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts)
- [pnpm, Build Settings](https://pnpm.io/settings/build)
- [pnpm, Settings (10.x)](https://pnpm.io/10.x/settings)
- [Bun, Lifecycle scripts](https://bun.com/docs/install/lifecycle)
- [Deno, deno install](https://docs.deno.com/runtime/reference/cli/install/)
- [OWASP, Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP, Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)
- [node-argon2 — GitHub](https://github.com/ranisalt/node-argon2)
- [Upcoming breaking changes for npm v12 — GitHub Changelog](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/)
- [npm install-time security and GAT bypass2fa deprecation — GitHub Changelog](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)
- [npm v12.0.0 릴리스 — npm/cli](https://github.com/npm/cli/releases/tag/v12.0.0)
- [docs: clarify npm 12 unknown-config breaking change in changelogs — npm/cli](https://github.com/npm/cli/pull/9805)
- [feat: namespace install-script approval commands under npm install-scripts — npm/cli](https://github.com/npm/cli/pull/9629)
- [Plans for npm 12 — nodejs/Release, Issue #1161](https://github.com/nodejs/Release/issues/1161)
- [pnpm v10.0.0 릴리스 — pnpm](https://github.com/pnpm/pnpm/releases/tag/v10.0.0)
- [pnpm v10.5.0 릴리스 — pnpm](https://github.com/pnpm/pnpm/releases/tag/v10.5.0)
- [pnpm v11.0.0 릴리스 — pnpm](https://github.com/pnpm/pnpm/releases/tag/v11.0.0)
- [pnpm v10+ Bypass Dependency lifecycle scripts execution disabled by default — GitHub Advisory Database, GHSA-379q-355j-w6rj](https://github.com/advisories/GHSA-379q-355j-w6rj)

## 관련 문서

- [[Password-Hashing|비밀번호 해싱]]
- [[Supply-Chain-Security|공급망 보안]]
