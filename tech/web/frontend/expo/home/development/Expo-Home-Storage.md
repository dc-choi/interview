---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 데이터 영속성과 저장소 선택"]
---

# Expo 데이터 영속성과 저장소 선택

## 로컬과 서버의 책임

메모리 state는 앱 session이 끝나면 사라진다. 재시작 후 필요한 데이터는 local persistence로, 여러 기기/사용자의 공유 상태는 backend/database로 관리한다. 저장소 선택은 용량, query, 암호화, offline, 동기화와 접근 제어의 요구로 결정한다.

| 로컬 수단 | 적합한 데이터 | 제한과 확인 |
| --- | --- | --- |
| `expo-secure-store` | token, key 같은 작은 secret | 대용량 파일/DB 저장 수단으로 사용하지 않음 |
| `expo-file-system` | 파일, 다운로드/업로드 결과 | 파일 수명, 용량과 공유 권한 별도 |
| `expo-sqlite` | 재시작 후 유지할 구조화 데이터, query | table, prepared statement, migration과 query contract |
| Async Storage | 비민감 preferences와 작은 app state | 비암호화 key-value, secret 저장에 부적합 |

Expo Go의 FileSystem은 프로젝트별로 분리되어 다른 프로젝트 파일에 직접 접근하지 않는다. 공유받은 파일을 저장하거나 local files를 다른 앱/프로젝트와 공유하는 것은 별도의 공유 흐름이다.

SQLite는 기존 DB import, open, table 생성, insert/query와 prepared statement를 지원한다. UI 입문 페이지의 WebSQL-like 설명을 현재 SDK API로 그대로 간주하지 않는다. SDK57 Reference의 실제 async/sync query 계약을 확인한다.

## 클라우드 데이터 플랫폼

- Convex는 TypeScript 중심 backend/database와 WebSocket real-time update를 제공하며 SQL/ORM/cluster 직접 운영을 줄이는 접근이다.
- Supabase는 hosted Postgres, 인증, storage, edge function, real-time와 vector/AI 기능을 묶는다.
- Firebase는 real-time database, storage, auth, crash/analytics 등 hosted 서비스를 제공한다. Firebase JS SDK와 React Native Firebase의 runtime/native 설정이 다르다.

클라이언트가 SDK를 사용한다고 authorization과 backend validation이 사라지지 않는다. offline 캐시와 서버 정본, 사용자 삭제/로그아웃 후 local data 처리, conflict 정책은 별도로 정의한다. platform 선택 시 공식 integration guide와 해당 서비스의 현재 정책/요금을 확인한다.

## 출처

- [Expo Documentation, Databases in Expo and React Native apps](https://docs.expo.dev/develop/database)
- [Expo Documentation, Store data](https://docs.expo.dev/develop/user-interface/store-data)

## 관련 문서

- [[Expo-Home-Authentication]]
- [[Expo-Home-Assets]]
