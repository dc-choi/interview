---
tags: [runtime, nodejs]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["파일 변경 감시", "fs.watch", "fs.watchFile"]
---

# 파일 변경 감시

[[File-System|파일 시스템]]에서 감시 주제를 분리한 문서다. 아래 코드 블록은 각각 Node.js ESM `.mjs` 파일로 실행한다.

## fs.watch와 fs.watchFile

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

## fs.watch 이벤트 해석

- 대부분의 플랫폼에서 디렉터리 안에 파일 이름이 나타나거나 사라지면 `rename`이 온다. 추가, 삭제, 이동은 `rename`, 내용 수정은 `change`로 오는 경우가 많지만 OS의 알림 방식과 에디터의 저장 방식에 따라 달라진다.
- Linux와 macOS는 경로를 inode로 해석해 그 inode를 감시한다. 파일을 지웠다 다시 만들면 삭제 이벤트는 오지만 새 inode의 이벤트는 오지 않는다. 임시 파일에 쓰고 rename으로 교체하는 에디터 저장 방식도 같은 문제를 만들므로, 단일 파일 대신 상위 디렉터리를 감시해 `filename`으로 거르고 연속 이벤트는 debounce로 묶는다.
- 옵션은 `persistent`(기본 `true`), `recursive`(기본 `false`, Linux 지원은 v19.1.0부터), `encoding`, `signal`(AbortSignal로 닫기), `throwIfNoEntry`(v26.1.0, v24.16.0), `ignore`(glob, RegExp, 함수, v25.5.0, v24.14.0)가 있다. `recursive`는 지원 플랫폼에서만 하위 디렉터리까지 적용된다.

## fs.watchFile 세부

```js
import { unwatchFile, watchFile } from 'node:fs';

const onChange = (curr, prev) => {
  // 파일에 접근만 해도 호출되므로 수정 여부는 mtime으로 비교한다.
  if (curr.mtimeMs === prev.mtimeMs) return;
  console.log('modified', curr.size);
};

watchFile('./config.json', { interval: 1000 }, onChange);
process.once('SIGTERM', () => unwatchFile('./config.json', onChange));
```

- 옵션 기본값은 `persistent: true`, `interval: 5007`(ms), `bigint: false`다. 리스너는 현재와 이전의 `fs.Stats`를 받는다.
- 대상이 없어 `ENOENT`가 나면 모든 필드가 0(날짜는 Unix epoch)인 stat으로 한 번 호출되고, 나중에 파일이 생기면 다시 호출된다.
- `unwatchFile(filename, listener)`는 그 리스너만, 리스너를 생략하면 해당 파일의 모든 리스너를 제거한다.

## 운영 기준

- `persistent` 기본값 때문에 감시 중에는 프로세스가 끝나지 않는다. 종료 경로에서 `watcher.close()`나 `unwatchFile()`을 호출하고, 프로세스 종료를 막지 않아야 하는 보조 감시라면 `watcher.unref()`를 검토한다([[Event-Loop-Microtask#루프를 붙잡는 리소스와 해제|루프를 붙잡는 리소스]]).
- 여러 플랫폼과 대량 파일을 지원하는 빌드 도구와 개발 서버는 중복 이벤트 제거, `rename`을 추가와 삭제로 해석, atomic write와 청크 쓰기 완료 대기 같은 보정 로직을 직접 만들지 않고 chokidar 같은 검증된 라이브러리를 쓴다. chokidar v4는 glob 지원을 제거했고, v5는 ESM 전용이며 Node.js 20.19.0 이상을 요구한다(2026-09-30 README와 npm 메타데이터 기준).
- 개발 중 자동 재시작 도구의 감시 범위와 재시작 루프는 [[Command-Line#개발 중 자동 재시작|커맨드라인]]을 참조한다.

## 출처

- [Node.js, fs.watch](https://nodejs.org/api/fs.html#fswatchfilename-options-listener)
- [Node.js, fs.watchFile](https://nodejs.org/api/fs.html#fswatchfilefilename-options-listener)
- [Node.js, Class: fs.FSWatcher](https://nodejs.org/api/fs.html#class-fsfswatcher)
- [Node.js v25.5.0 changelog, fs: add ignore option to fs.watch — GitHub](https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V25.md#25.5.0)
- [Chokidar README — GitHub](https://github.com/paulmillr/chokidar)
- [얄팍한 코딩사전 강사 — 파일 시스템 이벤트 (+ 사용자 입력 받기)](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270913)

## 관련 문서

- [[File-System|파일 시스템]]
- [[Event-Loop-Microtask|이벤트 루프 — 루프를 붙잡는 리소스]]
- [[libuv-IO|libuv 파일 시스템 I/O]]
- [[Command-Line|커맨드라인]]
