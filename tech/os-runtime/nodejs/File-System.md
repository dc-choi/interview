---
tags: [runtime, nodejs]
status: note
verified_at: 2026-08-26
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

## 파일 경로 (Path)
```js
import * as path from 'node:path';

const notes = '/users/joe/notes.txt';

path.dirname(notes);    // /users/joe
path.basename(notes);   // notes.txt
path.extname(notes);    // .txt
path.basename(notes, path.extname(notes));  // notes (확장자 제외)

path.join('/', 'users', 'joe', 'notes.txt');  // /users/joe/notes.txt
path.resolve('joe.txt');                        // /현재경로/joe.txt (절대 경로 계산)
path.normalize('/users/joe/..//test.txt');      // /users/test.txt
```
- `resolve`와 `normalize`는 경로의 존재 여부를 확인하지 않는다. 받은 정보를 바탕으로 경로를 계산할 뿐이다.

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

## 파일 디스크립터
```
파일 디스크립터(fd)는 열려있는 파일에 대한 숫자 참조다. callback `fs.open()`은 callback으로 fd를 넘기고, `fs/promises`의 `open()`은 fd를 관리하는 `FileHandle`을 반환한다.
```
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

// 폴더 제거 (내용 포함, 재귀적)
await rm('/path/to/folder', { recursive: true, force: true });
```

## 파일 변경 감시

`fs.watch()`는 운영체제의 파일 변경 알림을 사용해 파일이나 디렉터리를 감시한다. 콜백의 `eventType`은 `rename` 또는 `change`이고, 반환된 `FSWatcher`를 닫아야 감시 자원이 해제된다.

```js
import { watch } from 'node:fs';

const watcher = watch('./config', (eventType, filename) => {
  console.log(eventType, filename ?? '(filename unavailable)');
});

process.once('SIGTERM', () => watcher.close());
```

| API | 방식 | 선택 기준 |
|---|---|---|
| `fs.watch()` | OS 이벤트 알림 | 더 효율적이므로 기본 선택 |
| `fs.watchFile()` | stat 폴링 | OS 알림을 쓸 수 없는 환경의 제한적 대안 |

`fs.watch()`의 세부 동작은 플랫폼마다 다르고 NFS, SMB, 가상화된 호스트 파일 시스템에서는 불안정하거나 사용할 수 없을 수 있다. `filename`도 모든 플랫폼에서 항상 제공된다고 가정하지 않는다. 폴링인 `fs.watchFile()` 역시 더 강한 정확성을 보장하지 않으므로, 빌드 도구처럼 여러 플랫폼과 대량 파일을 지원해야 하면 검증된 감시 라이브러리의 보정 로직을 사용한다.

## 다양한 파일 시스템 호환성
```
모든 파일 시스템이 동일하게 작동하지는 않는다. 대소문자 구분, 유니코드 형식, 타임스탬프 해상도 등이 다르다.
process.platform으로 파일 시스템 동작을 추론하지 말 것.
```
- **핵심 원칙**: 파일명과 타임스탬프를 있는 그대로 보존하고, 정규화는 비교 함수에서만 사용한다
- **상위 집합 접근법**: 모든 기능의 상위 집합을 구현 (대소문자 보존, Unicode 형식 보존, 나노초 타임스탬프)

```js
// 잘못된 방법
const filename = 'Report.txt';
const normalized = filename.toUpperCase(); // 사용자 데이터 손상!

// 보존할 값은 원문 그대로 둔다.
const storedFilename = filename;
```

`toLowerCase()` 비교만으로 두 path가 같은 file을 가리키는지 판정할 수는 없다. case folding, Unicode normalization, mount option과 file system 규칙이 다르기 때문이다. application이 논리적 이름 중복을 막아야 한다면 canonicalization과 collision 정책을 별도 contract로 정하고, 실제 target 확인에는 file system operation 결과를 사용한다.

## 관련 문서

- [[Stream-Types|스트림 타입과 배압]]
- [[Command-Line|커맨드라인과 readline]]
- [[libuv-IO|libuv 파일 시스템 I/O]]

## 출처

- [Node.js File system API](https://nodejs.org/api/fs.html)
- [얄팍한 코딩사전 강사 — 파일 시스템 이벤트 (+ 사용자 입력 받기)](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270913)
