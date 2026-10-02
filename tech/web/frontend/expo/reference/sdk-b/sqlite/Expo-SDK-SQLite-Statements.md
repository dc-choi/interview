---
tags: [expo, expo-sdk, sqlite]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK SQLite Statement와 Tagged Query"]
---

# Expo SDK SQLite Statement와 Tagged Query

prepareAsync(sql)와 prepareSync(sql)는 SQL을 한 번 compile한 SQLiteStatement를 반환한다. executeAsync<T>(params)는 SQLiteExecuteAsyncResult<T>, executeSync는 SyncResult를 반환한다. getColumnNamesAsync/Sync로 column 이름을 읽는다. 사용 후 finalizeAsync/Sync로 해제하고 해제한 statement를 다시 사용하지 않는다. DB close 시 orphan statement를 정리하는 기능은 조기 cleanup을 대체하지 않는다.

```ts
const stmt = await db.prepareAsync('SELECT value FROM items WHERE id=$id');
try {
  const result = await stmt.executeAsync<{value:string}>({$id:id});
  const row = await result.getFirstAsync();
  await result.resetAsync();
  const rows = await result.getAllAsync();
} finally { await stmt.finalizeAsync(); }
```

execute 결과는 lastInsertRowId/changes와 row cursor를 함께 제공하므로 INSERT...RETURNING도 읽을 수 있다. AsyncResult는 async iterator, SyncResult는 iterator다. getFirst/getAll은 cursor의 초기 상태를 요구한다. 이미 row를 읽었다면 resetAsync/Sync 후 다시 읽는다. 같은 cursor를 다시 읽는 작업과 새 execute를 구분한다. DB의 convenience API는 prepare/execute/finalize를 관리한다. 원문 cheatsheet의 getAll 설명에 execute+getFirst가 나온 부분은 API 계약과 맞지 않는다.

## Tagged literals

db.sql은 Bun 방식의 tagged template로 삽입 값을 prepared parameter에 bind한다. SELECT query를 await하면 객체 배열, 변경 query를 await하면 SQLiteRunResult를 반환한다. .first()는 T|null, .each()는 AsyncIterableIterator<T>, .values()는 column 순서에 따른 any[][]를 반환한다. .allSync()/.firstSync()/.eachSync()/.valuesSync()는 동기 API다.

```ts
const sql = db.sql;
const rows = await sql<{value:string}>`SELECT value FROM items WHERE id=${id}`;
const first = await sql<{value:string}>`SELECT value FROM items WHERE id=${id}`.first();
```

generic<T>는 반환 형태를 TypeScript에 알려주며 런타임 검증은 별도다. 원문 for-await 예제의 db<User>는 DB 객체를 callable로 취급한 오기이므로 sql<User>를 사용한다. 일반 template 문자열을 execAsync에 넘기는 작업에는 tagged binding 보호가 없다. 데이터가 많으면 전체 배열 대신 iteration을 선택한다.

## 출처

- [Expo Documentation, SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite)

## 관련 문서

- [[Expo-SDK-SQLite]]
- [[Expo-SDK-SQLite-Storage]]
