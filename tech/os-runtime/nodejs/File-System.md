---
tags: [runtime, nodejs]
status: note
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["파일 시스템"]
---

# 파일 시스템

아래 코드 블록은 각각 Node.js ESM `.mjs` 파일 하나로 저장해 실행한다. `/path/to/...` 경로는 실제 존재하는 파일이나 폴더로 바꾼다.

## 파일 상태 (Stats)
```js
import { stat } from 'node:fs/promises';

const stats = await stat('/path/to/file.txt');
stats.isFile();          // true
stats.isDirectory();     // false
stats.isSymbolicLink();  // false
stats.size;              // 바이트 단위 파일 크기
```

`stat()`는 심볼릭 링크가 가리키는 대상을 조사한다. 링크 자체를 판별하려면 `lstat()` 후 `isSymbolicLink()`를 사용한다. 메타데이터를 얻은 뒤에도 파일 상태는 바뀔 수 있으므로 읽기나 쓰기 단계의 오류를 별도로 처리한다.

## 파일 경로

`path` 모듈의 경로 계산, 상대 경로가 `process.cwd()` 기준이라 생기는 `ENOENT`와 모듈 기준 경로 만들기, 파일 시스템별 대소문자와 Unicode 처리는 [[File-System-Paths|파일 경로와 이름]]으로 분리했다.

## 파일 읽기
```js
import { createReadStream, readFile, readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';

// 비동기 (콜백)
readFile('/path/to/file.txt', 'utf8', (err, data) => {
  if (err) { console.error(err); return; }
  console.log(data);
});

// 동기
const data = readFileSync('/path/to/file.txt', 'utf8');

// Promise 기반
const data2 = await readFileAsync('/path/to/file.txt', { encoding: 'utf8' });

// 스트림 (큰 파일 - 메모리 효율)
const readStream = createReadStream('/path/to/file.txt', { encoding: 'utf8' });
for await (const chunk of readStream) {
  console.log(chunk);
}
```
- `encoding`을 생략하면 `readFile`, `readFileSync`, `fsPromises.readFile` 모두 문자열이 아니라 Buffer를 반환한다. 텍스트는 encoding을 명시하고, 이미지 같은 바이너리는 Buffer로 받아 필요할 때 `buf.toString('base64')`로 바꾼다([[Buffer-Memory|Buffer]]).
- 동기 API는 작업이 끝날 때까지 이벤트 루프와 이후 JavaScript 실행을 막는다. 시작 시 설정 읽기나 CLI 스크립트에 한정하고 요청 처리 경로에서는 비동기 API를 쓴다.

세 readFile 계열은 전체 내용을 메모리에 올린다. Promise를 사용해도 메모리 사용량이 작아지는 것은 아니다. 큰 파일은 스트림과 배압을 적용하고, 네트워크 다운로드는 상태 코드를 확인한 뒤 body를 소비하거나 취소한다.

## 파일 쓰기
```js
import { appendFile, writeFile } from 'node:fs/promises';

// 기본 (파일이 존재하면 덮어씀)
await writeFile('/path/to/file.txt', 'content');

// 파일에 내용 추가 (append)
await appendFile('/path/to/file.log', 'new content');

// 플래그 옵션으로 쓰기 모드 제어
await writeFile('/path/to/file.txt', 'content', { flag: 'a+' });
```

| 플래그 | 설명 | 파일 생성 |
|--------|------|---------|
| `r+` | 읽기+쓰기 | No |
| `w+` | 읽기+쓰기, 기존 파일은 길이 0으로 잘라냄 | Yes |
| `a` | 쓰기, 스트림을 파일 끝에 위치 | Yes |
| `a+` | 읽기+쓰기, 스트림을 파일 끝에 위치 | Yes |
| `wx` | 쓰기, 경로가 이미 있으면 `EEXIST`로 실패 | Yes |

## 존재 확인, 삭제, 이동, 복사

존재를 먼저 확인하고 그 결과로 열거나 읽고 쓰면 두 호출 사이에 다른 프로세스가 파일 상태를 바꿀 수 있는 경합이 생긴다. 파일을 직접 열거나 읽고 쓰면서 오류 code로 분기하고, 존재 확인은 다른 프로세스가 남긴 파일의 존재 자체가 신호일 때처럼 파일을 직접 쓰지 않을 때만 한다. `wx`처럼 `x`(open(2)의 `O_EXCL`)가 붙은 플래그는 확인과 생성을 한 번의 open으로 처리하지만 네트워크 파일 시스템에서는 동작하지 않을 수 있다.

```js
import { unlink, writeFile } from 'node:fs/promises';

// 없을 때만 만들기: 확인 후 생성 대신 wx 플래그로 쓰고 EEXIST를 처리한다.
await writeFile('/path/to/app.lock', String(process.pid), { flag: 'wx' })
  .catch((err) => { if (err.code !== 'EEXIST') throw err; });

// 있으면 지우기: 확인 없이 지우고 ENOENT만 무시한다. rm(path, { force: true })도 같은 의도다.
await unlink('/path/to/file.txt').catch((err) => { if (err.code !== 'ENOENT') throw err; });
```

- `fs.exists()`는 deprecated다. 콜백에 `err` 인자가 없어 Node.js 콜백 규약과 맞지 않는 것이 `fs.access()`를 권하는 이유 중 하나이며, `fs.existsSync()`는 deprecated가 아니다. `access()`는 `mode`를 생략하면 `F_OK`로 존재만 확인하지만 확인 뒤 사용하는 경합은 똑같이 남는다.
- `rename(old, new)`은 이름 변경이 아니라 경로 이동이다. `new`에 파일이 있으면 덮어쓰고 디렉터리가 있으면 오류가 난다. rename(2)는 다른 파일 시스템(마운트) 사이에서 `EXDEV`로 실패하므로 그때는 복사한 뒤 원본을 지운다.
- `copyFile(src, dest)`는 원본을 남기고 기본으로 `dest`를 덮어쓴다. `fs.constants.COPYFILE_EXCL`을 주면 `dest`가 있을 때 실패하며, 복사의 원자성은 보장되지 않는다.
- 오류 code 분기 기준은 [[Error-Handling-Paths|에러 처리 경로]]를 따른다.

## 파일 디스크립터
파일 디스크립터(fd)는 프로세스 안에서 열린 파일을 식별하는 숫자다. callback `fs.open()`은 fd를 넘기고, `fs/promises`의 `open()`은 `FileHandle`을 반환한다. 실패 경로에서도 닫아야 하며, 닫은 fd의 숫자가 다른 파일에 재사용될 수 있으므로 보관한 숫자의 영구적 동일성을 가정하지 않는다.
```js
import { open } from 'node:fs/promises';

let filehandle;
try {
  filehandle = await open('/path/to/file.txt', 'r');
  console.log(filehandle.fd);
  console.log(await filehandle.readFile({ encoding: 'utf8' }));
} finally {
  if (filehandle) await filehandle.close();
}
```

## 폴더 작업
```js
import { lstat, mkdir, readdir, rename, rm } from 'node:fs/promises';
import * as path from 'node:path';

// 폴더 생성. recursive로 존재 여부 확인과 생성 사이의 race를 피한다.
await mkdir('/path/to/folder', { recursive: true });

// 디렉토리 읽기 + 파일만 필터링
const paths = (await readdir('/path/to/folder'))
  .map(name => path.join('/path/to/folder', name));
const files = [];
for (const file of paths) {
  if ((await lstat(file)).isFile()) files.push(file);
}

// 폴더 이름 변경
await rename('/old/path', '/new/path');

// 폴더 제거 (내용 포함, 재귀적). fs.rmdir의 recursive 옵션은 v25.0.0에서 제거됐다(DEP0147).
await rm('/path/to/folder', { recursive: true, force: true });
```

## 파일 변경 감시

`fs.watch()`와 `fs.watchFile()`의 선택 기준, 이벤트 해석, 폴링 옵션과 감시 라이브러리 선택은 [[File-System-Watch|파일 변경 감시]]로 분리했다.

## 관련 문서

- [[Stream-Types|스트림 타입과 배압]]
- [[Command-Line|커맨드라인과 readline]]
- [[libuv-IO|libuv 파일 시스템 I/O]]
- [[File-System-Paths|파일 경로와 이름]]
- [[File-System-Watch|파일 변경 감시]]

## 출처

- [Node.js File system API](https://nodejs.org/api/fs.html)
- [Node.js Deprecated APIs, DEP0147](https://nodejs.org/api/deprecations.html#DEP0147)
- [얄팍한 코딩사전 강사 — 파일 시스템 1](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270051)
- [얄팍한 코딩사전 강사 — 파일 시스템 2](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270416)
- [김정환 강사 — 비동기 세계 1 - readFileSync](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6170)
- [김정환 강사 — 비동기 세계 2 - readFile](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6171)

- [Node.js, File stats](https://nodejs.org/learn/manipulating-files/nodejs-file-stats)
- [Node.js, Reading files](https://nodejs.org/learn/manipulating-files/reading-files-with-nodejs)
- [Node.js, Writing files](https://nodejs.org/learn/manipulating-files/writing-files-with-nodejs)
- [Node.js, File descriptors](https://nodejs.org/learn/manipulating-files/working-with-file-descriptors-in-nodejs)
- [Node.js, Working with folders](https://nodejs.org/learn/manipulating-files/working-with-folders-in-nodejs)
