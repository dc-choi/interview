---
tags: [expo, expo-sdk, sqlite]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK SQLite Database와 Provider"]
---

# Expo SDK SQLite Database와 Provider

expo-sqlite는 Android/iOS/macOS/tvOS/web에 SQLite 데이터베이스를 제공한다. `npx expo install expo-sqlite` 후 namespace 또는 SQLiteProvider/useSQLiteContext를 import한다. 앱을 재시작해도 데이터가 유지되지만 tvOS는 cache directory에 저장된다. web 지원은 alpha다.

## Open, provider와 native configuration

`openDatabaseAsync(name, options?, directory?):Promise<SQLiteDatabase>`와 `openDatabaseSync`로 연다. directory 기본값은 defaultDatabaseDirectory이며 web에서는 지원하지 않는다. options.useNewConnection=false는 연결을 재사용하고, enableChangeListener=false는 변경 이벤트를 비활성화한다. libSQLOptions에는 url/authToken/remoteOnly를 지정한다. databasePath/options/nativeDatabase는 readonly다. 소유한 연결은 closeAsync/closeSync로 닫는다.

SQLiteProvider props는 databaseName, directory/options, onInit(db), onError(기본: 오류 재발생), useSuspense=false, assetSource{assetId, forceOverwrite=false}, children이다. onInit은 children 렌더링 전에 초기화와 migration을 수행한다. useSQLiteContext는 Provider 내부에서만 사용한다. Suspense fallback은 준비 상태를, Error Boundary는 초기화 실패를 다룬다. forceOverwrite=true는 기존 사용자 데이터를 덮어쓸 수 있다.

```tsx
<SQLiteProvider databaseName="app.db" onInit={migrate}>
  <AppContent />
</SQLiteProvider>
```

config plugin은 enableFTS=true(FTS3/4/5), useSQLCipher=false, useLibSQL=false, withSQLiteVecExtension=false, customBuildFlags와 플랫폼별 override를 받는다. 변경하면 binary를 다시 빌드한다. SQLCipher는 Android/iOS/macOS에서 지원하며 Expo Go에서는 사용할 수 없다. DB를 연 직후 `PRAGMA key`로 암호화 키를 설정한다. 예제의 평문 password를 실제 키 관리 전략으로 사용하지 않는다. 암호화와 SQL parameter binding은 목적이 다르다.

web에는 Metro의 .wasm 지원과 SharedArrayBuffer용 COEP/COOP headers가 필요하다. EAS Hosting 예제는 credentialless/same-origin을 Router headers plugin에 설정한다. 타사 리소스의 embedding과 cross-origin 조건도 함께 검토한다.

## CRUD와 binding

`execAsync(source):Promise<void>`는 여러 SQL을 실행하지만 parameter escaping을 하지 않는다. 정적인 DDL/PRAGMA에 사용하고 사용자 입력을 문자열에 삽입하지 않는다. `runAsync(query, array|record|variadic)`는 write 결과 `{lastInsertRowId, changes}`를 반환한다. getFirstAsync<T>는 T|null, getAllAsync<T>는 T[], getEachAsync<T>는 AsyncIterableIterator<T>를 반환한다. getEach는 for-await-of로 읽어 전체 배열을 만들지 않는다. Sync API는 JS thread를 막을 수 있다.

```ts
await db.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
await db.runAsync('INSERT INTO items(value) VALUES (?)', input);
const row = await db.getFirstAsync<{value:string}>('SELECT value FROM items WHERE id=?', id);
```

binding 값은 string/number/null/boolean/Uint8Array다. `?`는 array 또는 variadic, `:name`/`@name`/`$name`은 record로 bind한다. 테이블명 등 식별자는 값 binding으로 처리할 수 없으므로 별도 allowlist를 사용한다. generic<T>는 런타임 검증을 하지 않는다. 원문 count 예제의 result.rows[0]은 getFirst 계약과 맞지 않으며 반환된 row에서 `row['COUNT(*)']`를 읽는다.

## Transactions와 migration

withTransactionAsync의 callback이 resolve하면 commit, reject하면 rollback한다. 활성 시간 동안 같은 connection에서 실행한 callback 밖의 비동기 query도 transaction에 포함될 수 있다. withExclusiveTransactionAsync는 제공된 txn 객체로 실행한 query만 포함한다. write가 시작된 동안 다른 async write는 database is locked로 실패할 수 있으며 web에서는 지원하지 않는다. withTransactionSync에는 동기 callback을 전달한다. isInTransactionAsync/Sync는 boolean을 반환한다.

migration은 PRAGMA user_version을 읽고 단계별 DDL, 데이터 변경과 version 설정을 일관되게 완료한다. WAL/foreign_keys 등 연결별 설정을 명시한다. 원문의 transaction 없는 단계 예제를 그대로 사용하면 중간 실패로 일부 변경만 적용될 수 있다. OTA rollback 후 구버전 코드가 새 schema를 읽을 수 있는지도 판단한다.

prepared cursor/tagged query는 [[Expo-SDK-SQLite-Statements]], backup/session/extension/KV는 [[Expo-SDK-SQLite-Storage]]에 있다.

## 출처

- [Expo Documentation, SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite)

## 관련 문서

- [[Expo-SDK-SQLite-Statements]]
- [[Expo-SDK-SQLite-Storage]]
- [[Expo-Integrations-Local-First]]
