---
tags: [runtime, nodejs]
status: note
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["커맨드라인"]
---

# 커맨드라인

## 스크립트 실행
```bash
node app.js                    # 기본 실행
node -e "console.log(123)"    # 문자열을 JS로 실행
node --watch app.js            # 파일 변경 시 자동 재시작
node --run test                # package.json scripts 실행 (내장 작업 러너)
```

**Shebang 사용 (#!/usr/bin/env node)**
```js
#!/usr/bin/env node
// JavaScript 코드
```
```bash
chmod u+x app.js   # 실행 권한 설정 후 직접 실행 가능
```

**내장 작업 러너 (`--run`)의 의도적 제한**: `npm run`보다 제한적. 성능과 단순성을 중시하여 `pre`/`post` 스크립트 실행을 생략함.

## 개발 중 자동 재시작

`node --watch app.js`는 진입점과 그 파일이 `require`나 `import`한 모듈을 감시해 바뀌면 프로세스를 다시 시작한다(v22.0.0, v20.13.0부터 stable). v22.7.0부터는 `--env-file`로 넘긴 파일이 바뀌어도 다시 시작하며 새 값을 읽는다(Node.js 26.7 확인).

| 필요 | `node --watch` | nodemon (`nodemon.json`) |
|---|---|---|
| import 그래프 밖의 파일이나 폴더 감시 | `--watch-path=./src`, macOS와 Windows만 지원하고 다른 플랫폼은 `ERR_FEATURE_UNAVAILABLE_ON_PLATFORM` | `watch` 배열 |
| 확장자, 제외 경로 | 없음 | `ext`, `ignore`(기본으로 `.git`, `node_modules` 등 제외) |
| 실행 명령, 환경 변수 | 명령줄 플래그 | `exec`, `env` |

- `--watch`는 파일 경로가 필요하고 `--run`과 함께 쓰면 `--run`이 우선해 watch가 무시된다. `--watch-path`를 주면 import 그래프 감시는 꺼진다. 재시작 때 콘솔을 지우지 않으려면 `--watch-preserve-output`을 쓴다.
- 앱이 감시 대상 폴더에 로그, 업로드, 빌드 산출물을 쓰면 쓸 때마다 재시작하는 루프가 생긴다. 감시 범위를 좁히거나 `ignore`로 뺀다.
- 컨테이너에 마운트한 경로처럼 OS 파일 알림이 오지 않는 환경에서는 nodemon의 `legacyWatch: true`(chokidar 폴링)를 쓴다([[File-System-Watch|파일 변경 감시]]).
- 두 도구 모두 개발용이다. 운영의 재시작은 프로세스 매니저나 오케스트레이터가 맡는다([[Single-Host-SPA-API-Deployment]]).

## REPL (Read-Eval-Print Loop)
```bash
node   # REPL 시작, > 프롬프트 표시
```
```
> 5 === '5'
false
> _          # 마지막 연산 결과 참조
false
```

| 점 명령어 | 설명 |
|-----------|------|
| `.help` | 도움말 표시 |
| `.editor` | 에디터 모드 (여러 줄 코드 작성) |
| `.break` | 다중 라인 입력 중단 |
| `.clear` | REPL 컨텍스트 초기화 |
| `.load` | JS 파일 로드 |
| `.save` | 현재 세션을 파일에 저장 |
| `.exit` | REPL 종료 |

## 콘솔 출력
```js
console.log('My %s has %d ears', 'cat', 2);  // 포맷 지정자: %s(문자열), %d(숫자), %i(정수), %f(실수), %j(JSON), %o와 %O(객체)
console.error('에러 메시지');                   // stderr 스트림으로 출력
console.count('label');                        // 호출 횟수 카운트
console.countReset('label');                   // 카운터 초기화
console.trace();                               // 호출 스택 트레이스 출력 (stderr)
console.time('label'); /* ... */ console.timeEnd('label');  // 실행 시간 측정
console.assert(user.id, 'id 없음');            // 거짓일 때만 'Assertion failed: id 없음'을 stderr에 출력
```

- `console.log`, `info`, `debug`는 stdout, `console.error`, `warn`, `trace`, `assert`는 stderr로 쓴다(`info`와 `debug`는 `log`, `warn`은 `error`의 별칭). `node app.js > out.log 2> err.log`처럼 셸 리디렉션으로 일반 출력과 오류, 경고를 나눌 수 있다는 것이 메서드를 구분해 쓰는 이유다. 로그 수집기가 두 스트림을 심각도로 구분하는지는 플랫폼마다 다르다.
- `console.assert`는 예외를 던지지 않고 메시지만 남기므로 테스트의 `assert`를 대신하지 않는다.
- Node.js의 `%o`는 `util.inspect()`에 `{ showHidden: true, showProxy: true }`를 준 것처럼 열거 불가 속성과 Proxy까지 깊이 4로 보여 주고, `%O`는 옵션 없는 `util.inspect()`처럼 이들을 뺀다. 브라우저 console의 설명을 그대로 옮기지 않는다. `%j`는 순환 참조가 있으면 `'[Circular]'`가 되고 `%c`(CSS)는 무시된다.
- `console.log`는 `util.inspect()` 기본값(`depth` 2, `maxArrayLength` 100, `maxStringLength` 10000, `breakLength` 80)으로 객체를 그리므로 더 깊은 중첩은 `[Object]`로 접힌다. 전체는 `console.dir(obj, { depth: null })`이나 `util.inspect(obj, { depth: null })`로 본다. 이 출력은 디버깅용이라 형식이 바뀔 수 있어 프로그램이 파싱하지 않고, 비밀값을 담은 객체는 `[util.inspect.custom]()` 메서드로 가린 표현을 정의할 수 있다.
- `util.types.isDate()`, `isMap()`, `isPromise()` 같은 검사는 prototype이 아니라 엔진 내부 타입을 보므로 다른 realm(`vm` 컨텍스트 등)에서 만든 객체도 판별하고 prototype만 흉내 낸 객체는 거른다(Node.js 26.7 확인). 공식 문서는 주 용도를 addon 개발로 두고 C++ 호출 비용을 언급한다.
- `util.deprecate(fn, msg, code)`로 감싼 함수는 처음 호출될 때 한 번만 `DeprecationWarning`을 stderr에 출력하고, 같은 `code`를 준 래퍼들은 그 code 기준으로 한 번만 경고한다. `--no-deprecation`은 경고를 끄고, `--trace-deprecation`은 스택을 함께 출력하며, `--throw-deprecation`은 예외로 바꾸며 `--trace-deprecation`보다 우선한다.

**styleText (v22.13+에서 stable)**
```js
import { styleText } from 'node:util';
console.log(styleText(['red'], '빨간 텍스트 ') + styleText(['green', 'bold'], '초록 볼드'));
```

## 입력 받기
```js
const readline = require('node:readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question(`이름이 무엇인가요? `, name => {
  console.log(`안녕하세요 ${name}!`);
  rl.close();
});
```

Promise API는 `node:readline/promises`의 `await rl.question()`이다. 어느 방식이든 stdin을 입력으로 만든 인터페이스는 EOF를 받을 때까지 프로세스를 끝내지 않으므로 입력이 끝나면 `rl.close()`를 호출한다([[Event-Loop-Microtask#루프를 붙잡는 리소스와 해제|루프를 붙잡는 리소스]]).

## 환경 변수
```bash
USER_ID=239482 USER_KEY=foobar node app.js   # 명령줄에서 설정
node --env-file=.env app.js                   # .env 파일 로드 (v20.6+, v24.10.0과 v22.21.0부터 stable)
node --env-file=.env --env-file=.dev.env app.js  # 여러 파일 (후속 파일이 덮어씀)
node --env-file-if-exists=.env app.js         # 파일 없어도 오류 없음 (v22.9+)
```
```js
process.env.USER_ID       // "239482" (process는 전역 객체, import 불필요)
process.loadEnvFile();    // 코드에서 직접 .env 로드 (v20.12+)
```

- 같은 변수가 이미 환경에 있으면 `--env-file`의 값보다 환경의 값이 우선한다. 셸에 export한 예전 값, CI 변수, 컨테이너 환경 변수가 있으면 `.env`를 고쳐도 반영되지 않는다. `process.loadEnvFile()`도 이미 설정된 값을 덮어쓰지 않았다(Node.js 26.7 확인, 문서에는 명시 없음).
- dotenv도 기본으로 기존 환경 변수를 덮어쓰지 않고 `override: true`로 뒤집는다. 여러 파일을 주면 dotenv는 먼저 읽은 값이, `--env-file`은 뒤 파일의 값이 이기므로 옮길 때 파일 순서를 확인한다. 운영에서는 런타임에 주입한 값이 이기는 기본 우선순위를 유지하고 시작 시 필수 값을 검증한다([[NestJS-Configuration|NestJS 설정의 시작 시 검증]]).
- 비밀값을 담은 `.env`는 `.gitignore`에 넣고 별도 경로로 전달한다. 이미 커밋된 비밀은 ignore 추가만으로 이력에서 사라지지 않는다([[Git-Working-Tree-and-Commits|Git 작업 트리와 커밋]]).

## 재현 가능한 의존성 설치

`package.json`은 직접 의존성과 허용 버전 범위를 선언하고, `package-lock.json`은 실제로 해석된 전체 의존성 트리를 고정한다. 애플리케이션 저장소에서는 lockfile도 커밋해야 개발, CI와 배포가 같은 트리를 재현할 수 있다.

```bash
npm install                 # 의존성을 해석하고 필요하면 lockfile 갱신
npm ci                      # 기존 lockfile 그대로 전체 프로젝트를 깨끗하게 설치
npx eslint .                # 로컬 패키지 실행, 없으면 확인 후 임시 다운로드 가능
```

`npm ci`는 lockfile이 없거나 `package.json`과 맞지 않으면 실패하고, 기존 `node_modules`를 지운 뒤 설치하며 manifest와 lockfile을 수정하지 않는다. lockfile 생성 때 `--legacy-peer-deps`처럼 트리 모양을 바꾸는 옵션을 썼다면 프로젝트 `.npmrc`에도 고정해 CI와 같은 설정을 사용한다.

`npx`는 현재 npm에서 `npm exec`의 프런트엔드다. 로컬 실행 파일을 우선 사용하지만 의존성에 없는 패키지는 npm 캐시에 내려받아 실행할 수 있으므로, 자동화에서는 패키지와 버전을 명시하고 설치 프롬프트 정책을 고정한다.

`npm run`은 `node_modules/.bin`을 셸의 기존 PATH 앞에 붙여 스크립트를 실행한다(npm 11.19 확인). 그래서 `"test": "mocha"`처럼 devDependencies로 설치한 CLI를 경로 없이 적어도 전역 설치 버전이 아니라 lockfile에 고정한 로컬 버전이 실행된다. `npm test`와 `npm start`는 `test`, `start` 스크립트를 실행하는 단축 명령이고, `start` 스크립트가 없으면 `main`이 아니라 `node server.js`를 실행한다. 스크립트는 호출 위치와 무관하게 패키지 루트에서 실행된다.

### 전역 설치와 EACCES

`npm install -g`는 전역 prefix에 설치하므로 prefix가 시스템 디렉터리면 `EACCES`가 난다. `sudo`로 우회하면 root 소유 전역 경로에서 패키지 설치 스크립트(`postinstall` 등)가 root 권한으로 실행될 수 있어 공급망 공격의 피해 범위가 커진다([[Supply-Chain-Security|공급망 보안]]). npm 문서는 Node.js 버전 매니저로 npm을 다시 설치하는 방법을 먼저 권하고, 수동 방법으로 전역 prefix를 홈 아래로 옮기는 절차를 안내한다(Windows에는 해당하지 않음).

```bash
npm config set prefix ~/.local                 # npm 문서 예시. ~/.npm-global 같은 다른 디렉터리도 된다
echo 'PATH=~/.local/bin:$PATH' >> ~/.profile   # zsh는 ~/.zprofile에서 source ~/.profile
source ~/.profile
npm list -g --depth=0                          # 전역 설치 목록
```

프로젝트 도구는 전역 설치하지 않고 devDependencies와 npm scripts 또는 `npx`로 실행하며, 전역 설치는 프로젝트와 무관한 CLI에 한정한다([[Dependency-Management|의존성 관리]]).

## 출처

- [Node.js Command-line API](https://nodejs.org/api/cli.html)
- [Node.js process.loadEnvFile](https://nodejs.org/api/process.html#processloadenvfilepath)
- [Node.js util.styleText](https://nodejs.org/api/util.html#utilstyletextformat-text-options)
- [Node.js Console](https://nodejs.org/api/console.html)
- [Node.js util.format](https://nodejs.org/api/util.html#utilformatformat-args)
- [Node.js util.inspect](https://nodejs.org/api/util.html#utilinspectobject-options)
- [Node.js util.deprecate](https://nodejs.org/api/util.html#utildeprecatefn-msg-code-options)
- [Node.js util.types](https://nodejs.org/api/util.html#utiltypes)
- [Node.js Readline](https://nodejs.org/api/readline.html)
- [npm Docs — package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
- [npm Docs — npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm Docs — npx](https://docs.npmjs.com/cli/v11/commands/npx/)
- [npm Docs — npm run](https://docs.npmjs.com/cli/v11/commands/npm-run/)
- [npm Docs — npm start](https://docs.npmjs.com/cli/v11/commands/npm-start/)
- [npm Docs — Resolving EACCES permissions errors when installing packages globally](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)
- [npm Docs v10 — Scripts, User](https://docs.npmjs.com/cli/v10/using-npm/scripts#user)
- [dotenv README — GitHub](https://github.com/motdotla/dotenv)
- [nodemon README — GitHub](https://github.com/remy/nodemon)
- [얄팍한 코딩사전 강사 — package.json](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=276704)
- [얄팍한 코딩사전 강사 — npm](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=277123)
- [얄팍한 코딩사전 강사 — Nodemon (+ Mac 전역 패키지 설정)](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=269799)
- [얄팍한 코딩사전 강사 — 강의에서의 nodemon 활용에 대해...](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=279346)
- [얄팍한 코딩사전 강사 — global, this, console](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=274405)
- [얄팍한 코딩사전 강사 — url, dns, util, os 모듈](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=273476)
- [얄팍한 코딩사전 강사 — process와 환경변수](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=273702)
- [김정환 강사 — npm 2](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6188)
- [김정환 강사 — 모카(macha) 3](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6197)
- [김정환 강사 — 슈퍼테스트(superTest) 2](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6200)
- [김정환 강사 — NPM 테스트 스크립트](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6203)
