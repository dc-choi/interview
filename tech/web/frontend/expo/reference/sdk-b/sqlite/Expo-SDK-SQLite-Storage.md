---
tags: [expo, expo-sdk, sqlite]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK SQLite Backup, Session과 KV Storage"]
---

# Expo SDK SQLite Backup, Session과 KV Storage

SQLite export/backup/session은 데이터를 관리하는 API다. 동기화 엔진과 충돌 정책 전체를 제공하지는 않는다. 인증 token은 [[Expo-SDK-SecureStore]], local-first 설계는 [[Expo-Integrations-Local-First]]를 연결한다.

## Backup, serialization와 shared database

serializeAsync(dbName='main')/serializeSync는 attached DB를 Uint8Array로 직렬화한다. deserializeDatabaseAsync(bytes, options?)/Sync는 메모리 DB를 만든다. backupDatabaseAsync({sourceDatabase, sourceDatabaseName, destDatabase, destDatabaseName})/Sync는 DB 사이에 복사한다. deleteDatabaseAsync(name, directory?)/Sync는 파일을 삭제하므로 먼저 활성 연결과 resource를 정리한다. 큰 동기 작업은 JS thread를 막을 수 있다.

iOS app group entitlement와 Paths.appleSharedContainers['group.example']?.uri를 directory로 설정하면 extension과 DB를 공유할 수 있다. 명시한 group을 선택하며 다른 process의 동시 migration/write와 locking을 설계한다. enableChangeListener=true로 연 DB의 변경은 addDatabaseChangeListener로 받고 subscription.remove()로 해제한다. 이벤트에는 databaseName, databaseFilePath, tableName, rowId가 있다. 이벤트만으로 전체 row diff나 동기화 순서를 알 수는 없다.

## Session extension과 libSQL

createSessionAsync(dbName='main')/Sync는 SQLiteSession을 만든다. attachAsync(table|null)은 하나 또는 모든 테이블을 등록하고 enableAsync(boolean)은 변경 기록을 켜거나 끈다. createChangesetAsync는 Uint8Array, createInvertedChangesetAsync 또는 invertChangesetAsync(bytes)는 역방향 changeset을 반환한다. applyChangesetAsync(bytes)는 적용하고 Promise<void>를 반환한다. 각 method의 Sync API와 closeAsync/Sync도 있다. finally에서 session을 해제한다. 충돌 해결, network transport와 schema 호환성은 별도로 설계한다.

plugin의 useLibSQL과 open options.libSQLOptions{url, authToken, remoteOnly}를 설정한 환경은 db.syncLibSQL():Promise<void>로 remote와 동기화한다. 일반 SQLite에서도 같은 기능을 사용할 수 있다고 가정하지 않는다. authToken을 공개 코드에 넣지 않는다.

## Loadable extension와 inspector

loadExtensionAsync(libPath, entryPoint?)/Sync는 extension을 로드한다. bundledExtensions[name]은 {libPath, entryPoint}|undefined다. sqlite-vec는 plugin의 withSQLiteVecExtension=true가 필요하다. 존재 여부를 확인하고 사용하며 임의 native extension을 JS만으로 설치할 수 있다고 해석하지 않는다. deepEqual export의 undefined 타입 표시는 문서 생성 결손이므로 이를 근거로 storage 계약을 추정하지 않는다.

개발 중 built-in SQLite inspector(Expo CLI Shift+M)로 table 조회, row 수정, query와 export를 수행할 수 있다. drizzle-studio-expo도 선택할 수 있다. production 사용자 데이터의 접근 권한과 backup 정책은 별도다.

## KV와 localStorage

`import Storage from 'expo-sqlite/kv-store'`는 AsyncStorage와 호환하는 기본 instance다. new SQLiteStorage(databaseName)는 별도 store, SQLite.Storage/AsyncStorage는 aliases다. getItem/Async는 string|null, setItem/Async는 void를 반환한다. removeItem/Async, clear/Async, getAllKeys/Async, close/Async와 Sync API도 있다. getKeyByIndexAsync/Sync는 string|null, getLengthAsync/Sync는 number다. 원문은 suffix 없는 clear/remove는 Promise<void>, Async suffix는 boolean으로 표시하므로 설치된 타입을 확인한다.

setItem은 string 또는 (prev:string|null)=>string을 받는다. mergeItem/multiMerge는 JSON 객체를 깊게 merge한다. multiGet/multiSet/multiRemove는 batch API지만 일부 return/pair 타입이 undefined로 생성된 원문은 설치된 타입을 확인한다. getItem의 null과 잘못된 JSON을 처리하고 JSON.parse를 호출한다. import 변경만으로 기존 AsyncStorage 데이터가 자동 이동하지 않으므로 별도 migration 절차가 필요하다.

`import 'expo-sqlite/localStorage/install'`은 native globalThis.localStorage를 설치한다. web에서는 no-op이며 production bundle에서 제외된다. 익숙한 localStorage 인터페이스가 암호화나 durable backup을 보장하지는 않는다.

## 출처

- [Expo Documentation, SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite)

## 관련 문서

- [[Expo-SDK-SQLite]]
- [[Expo-SDK-SQLite-Statements]]
- [[Expo-SDK-SecureStore]]
- [[Expo-Integrations-Local-First]]
