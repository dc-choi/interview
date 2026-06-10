---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["커맨드라인"]
---

# 커맨드라인

## 스크립트 실행
```bash
node app.js                    # 기본 실행
node -e "console.log(123)"    # 문자열을 JS로 실행
node --watch app.js            # 파일 변경 시 자동 재시작 (v16+)
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

**styleText (v22.11+)**
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
node --env-file=.env app.js                   # .env 파일 로드 (v20+)
node --env-file=.env --env-file=.dev.env app.js  # 여러 파일 (후속 파일이 덮어씀)
node --env-file-if-exists=.env app.js         # 파일 없어도 오류 없음
```
```js
process.env.USER_ID       // "239482" (process는 전역 객체, import 불필요)
process.loadEnvFile();    // 코드에서 직접 .env 로드 (v20+)
```
