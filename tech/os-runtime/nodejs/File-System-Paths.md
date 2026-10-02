---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["파일 경로", "Node.js path", "상대 경로 기준"]
---

# 파일 경로와 이름

[[File-System|파일 시스템]]에서 경로 계산, 상대 경로의 기준과 파일 시스템별 이름 처리를 분리한 문서다. 아래 코드 블록은 각각 Node.js ESM `.mjs` 파일로 실행한다.

## 파일 경로 (Path)
```js
import * as path from 'node:path';

const notes = '/users/joe/notes.txt';

path.dirname(notes);    // /users/joe
path.basename(notes);   // notes.txt
path.extname(notes);    // .txt
path.basename(notes, path.extname(notes));  // notes (확장자 제외)

path.join('/', 'users', 'joe', 'notes.txt');  // /users/joe/notes.txt
path.resolve('joe.txt');                        // process.cwd() 기준 절대 경로 (/현재경로/joe.txt)
path.normalize('/users/joe/..//test.txt');      // /users/test.txt

path.join('/foo', '/bar');                      // /foo/bar
path.resolve('/foo/bar', '/tmp/file/');         // /tmp/file
path.parse(notes);                              // { root: '/', dir: '/users/joe', base: 'notes.txt', ext: '.txt', name: 'notes' }
path.relative('/data/test/aaa', '/data/impl/bbb');  // ../../impl/bbb
```
- `resolve`와 `normalize`는 경로의 존재 여부를 확인하지 않는다. 받은 정보를 바탕으로 경로를 계산할 뿐이다.
- `join`은 조각을 이어 붙인 뒤 정규화할 뿐 cwd를 붙이지 않는다. `resolve`는 오른쪽 인자부터 앞 조각을 붙여 가다 절대 경로가 되면 멈추고, 끝까지 상대 경로면 `process.cwd()`를 앞에 붙인다.
- `path.format()`은 `parse()` 결과를 다시 문자열로 조합한다. `path.relative(from, to)`는 from에서 to로 가는 상대 경로를 계산하며 상대 경로 입력은 cwd 기준으로 해석한다.

## 상대 경로의 기준

fs API에 넘긴 문자열 상대 경로는 호출한 파일의 위치가 아니라 `process.cwd()`를 기준으로 해석된다. 그래서 `readFile('./data.json')`은 그 폴더에서 실행할 때만 맞고, 저장소 루트에서 `node src/app.js`로 실행하거나 PM2, systemd, Docker `WORKDIR`처럼 작업 디렉터리가 달라지는 실행 경로에서는 `ENOENT`가 난다. npm scripts는 호출 위치와 무관하게 패키지 루트에서 실행되고 원래 위치는 `INIT_CWD` 환경 변수에 남는다.

```js
import * as path from 'node:path';

const dataPath = path.join(import.meta.dirname, 'data.json');  // ESM file: 모듈의 위치 기준
const dataUrl = new URL('./data.json', import.meta.url);        // fs API는 file: URL도 받는다
// CommonJS는 path.join(__dirname, 'data.json')
```

모듈 옆 리소스는 모듈 위치를 기준으로 만들고, 사용자가 CLI 인자로 넘긴 경로처럼 실행 위치 기준이 의도일 때만 cwd 기준을 쓴다. `import.meta.dirname`의 지원 범위와 이식성 있는 대안은 [[Module-System-ESM#상호운용성|ESM 상호운용성]]을 따른다.

## 다양한 파일 시스템 호환성
대소문자 구분과 보존, Unicode 형식의 비교와 보존, 타임스탬프 해상도는 파일 시스템마다 다르다. `process.platform`만으로 판정하지 않고 실제 작업 대상 마운트의 동작을 확인한다. 같은 프로세스에서도 로컬 디스크와 네트워크 드라이브의 성질은 다를 수 있다.
- **핵심 원칙**: 파일명과 타임스탬프를 있는 그대로 보존하고, 정규화는 비교 함수에서만 사용한다
- **보존 우선**: 대상이 제공한 이름, 시간 정밀도와 지원 메타데이터를 보존한다. 낮은 정밀도의 대상과 비교할 때만 그 대상에 맞게 비교하며 원본 값을 일괄 축소하지 않는다.

```js
// 잘못된 방법
const filename = 'Report.txt';
const normalized = filename.toUpperCase(); // 사용자 데이터 손상!

// 보존할 값은 원문 그대로 둔다.
const storedFilename = filename;
```

`toLowerCase()` 비교만으로 두 path가 같은 file을 가리키는지 판정할 수는 없다. case folding, Unicode normalization, mount option과 file system 규칙이 다르기 때문이다. application이 논리적 이름 중복을 막아야 한다면 canonicalization과 collision 정책을 별도 contract로 정하고, 실제 target 확인에는 file system operation 결과를 사용한다.

기본 `path`는 실행 플랫폼의 경로 규칙을 사용한다. 다른 플랫폼 형식의 문자열을 명시적으로 처리하려면 `path.win32` 또는 `path.posix`를 사용한다. 경로 문자열의 정규화는 실제 파일 접근, 심볼릭 링크 해석이나 접근 통제를 대신하지 않는다.

## 출처

- [Node.js, File paths](https://nodejs.org/learn/manipulating-files/nodejs-file-paths)

- [Node.js Path API](https://nodejs.org/api/path.html)
- [Node.js File system API, String paths](https://nodejs.org/api/fs.html#string-paths)
- [Node.js, Working with different file systems](https://nodejs.org/en/learn/manipulating-files/working-with-different-filesystems)
- [npm Docs, npm run](https://docs.npmjs.com/cli/v11/commands/npm-run/)
- [얄팍한 코딩사전 강사 — 파일 시스템 1](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270051)
- [얄팍한 코딩사전 강사 — 파일 시스템 2](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270416)

## 관련 문서

- [[File-System|파일 시스템]]
- [[File-System-Watch|파일 변경 감시]]
- [[Module-System-ESM|ESM 모듈 시스템]]
- [[Linux-File-System|Linux 파일 시스템]]
