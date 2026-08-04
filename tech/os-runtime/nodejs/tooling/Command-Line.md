---
tags: [runtime, nodejs]
status: note
verified_at: 2026-08-04
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
console.log('My %s has %d ears', 'cat', 2);  // 포맷 지정자: %s(문자열), %d(숫자), %i(정수), %o(객체)
console.error('에러 메시지');                   // stderr 스트림으로 출력
console.count('label');                        // 호출 횟수 카운트
console.countReset('label');                   // 카운터 초기화
console.trace();                               // 호출 스택 트레이스 출력
console.time('label'); /* ... */ console.timeEnd('label');  // 실행 시간 측정
```

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

## 환경 변수
```bash
USER_ID=239482 USER_KEY=foobar node app.js   # 명령줄에서 설정
node --env-file=.env app.js                   # .env 파일 로드 (v20.6+)
node --env-file=.env --env-file=.dev.env app.js  # 여러 파일 (후속 파일이 덮어씀)
node --env-file-if-exists=.env app.js         # 파일 없어도 오류 없음 (v22.9+)
```
```js
process.env.USER_ID       // "239482" (process는 전역 객체, import 불필요)
process.loadEnvFile();    // 코드에서 직접 .env 로드 (v20.12+)
```

## 재현 가능한 의존성 설치

`package.json`은 직접 의존성과 허용 버전 범위를 선언하고, `package-lock.json`은 실제로 해석된 전체 의존성 트리를 고정한다. 애플리케이션 저장소에서는 lockfile도 커밋해야 개발, CI와 배포가 같은 트리를 재현할 수 있다.

```bash
npm install                 # 의존성을 해석하고 필요하면 lockfile 갱신
npm ci                      # 기존 lockfile 그대로 전체 프로젝트를 깨끗하게 설치
npx eslint .                # 로컬 패키지 실행, 없으면 확인 후 임시 다운로드 가능
```

`npm ci`는 lockfile이 없거나 `package.json`과 맞지 않으면 실패하고, 기존 `node_modules`를 지운 뒤 설치하며 manifest와 lockfile을 수정하지 않는다. lockfile 생성 때 `--legacy-peer-deps`처럼 트리 모양을 바꾸는 옵션을 썼다면 프로젝트 `.npmrc`에도 고정해 CI와 같은 설정을 사용한다.

`npx`는 현재 npm에서 `npm exec`의 프런트엔드다. 로컬 실행 파일을 우선 사용하지만 의존성에 없는 패키지는 npm 캐시에 내려받아 실행할 수 있으므로, 자동화에서는 패키지와 버전을 명시하고 설치 프롬프트 정책을 고정한다.

## 출처

- [Node.js Command-line API](https://nodejs.org/api/cli.html)
- [Node.js process.loadEnvFile](https://nodejs.org/api/process.html#processloadenvfilepath)
- [Node.js util.styleText](https://nodejs.org/api/util.html#utilstyletextformat-text-options)
- [npm Docs — package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
- [npm Docs — npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm Docs — npx](https://docs.npmjs.com/cli/v11/commands/npx/)
- [얄팍한 코딩사전 강사 — package.json](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=276704)
- [얄팍한 코딩사전 강사 — npm](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=277123)
