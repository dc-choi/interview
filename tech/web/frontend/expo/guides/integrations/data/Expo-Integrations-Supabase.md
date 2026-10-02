---
tags: [expo, expo-integrations, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Supabase client, RLS와 environment"]
---

# Expo Supabase client, RLS와 environment

Supabase는 Postgres REST와 RLS로 mobile client가 DB API를 직접 요청하게 한다. public URL/publishable key는 앱에 들어가므로 모든 table의 row policy와 SQL privilege가 실제 권한 경계다. database password나 RLS를 우회하는 secret key는 client에 넣지 않는다.

## 연결과 session persistence

integrations:supabase:connect는 browser authorization 후 organization/region을 선택해 project를 생성하거나 --link reference ID/dashboard URL/API URL로 기존 project를 연결한다. project name은 reference가 아니다. region은 생성 뒤 바꾸지 못한다. @supabase/supabase-js/expo-sqlite와 plugin을 구성하고 public URL/key를 .env.local/EAS 세 environment에 저장한다. dynamic config는 plugin을 직접 넣는다.

```ts
import 'expo-sqlite/localStorage/install';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: {
    storage:localStorage, autoRefreshToken:true,
    persistSession:true, detectSessionInUrl:false,
  }});
```

Expo는 URL global을 제공해 별 react-native-url-polyfill이 필요하지 않는다. SQLite localStorage persistence는 SecureStore 암호화와 같은 계약이 아니다. native에는 URL session detect를 끄고 OAuth/magic link는 app deep link로 받는다. 기본 email confirmation이 켜져 있으면 signUp의 user는 생겨도 session은 확인 전 null이다. AppState active에서 startAutoRefresh, background에서 stopAutoRefresh로 refresh loop를 제한하고 listener lifetime도 관리한다.

## Table privilege와 row policy

```sql
create table public.todos (id bigint generated always as identity primary key, title text not null);
alter table public.todos enable row level security;
create policy "Public read" on public.todos for select using (true);
grant select on public.todos to anon, authenticated;
```

이 sample은 public read이며 개인 todo라면 user 조건 policy를 사용한다. signed-out anon/signed-in authenticated role이 policy를 통과해야 row를 읽는다. 정책이 없으면 select는 error 없이 empty list, SQL grant가 없으면 permission denied code42501이다. write에는 별 insert/update/delete policy와 privilege가 필요하다. table 직후 schema cache 오류는 refresh 뒤 재시도한다.

## Environment를 project에 대응하기

하나의 Supabase project가 한 dataset이므로 prod/preview 분리는 project를 나눈다. connect 기본은 세 environment가 같은 project다. --environment preview는 새 hosted project를 만들고 named environment만 변경하며 package/.env.local은 건드리지 않는다. --link/--reauth/--organization과 함께 쓸 수 없다. 실패 후 project는 생겼지만 env 쓰기가 실패했다면 출력 URL/key를 env:set으로 저장한다. 다시 --environment를 실행하면 또 project가 생긴다.

local CLI(init/start/status)는 Docker stack을 만들며 처음 DB는 empty다. .env.local을 local URL/key로 바꾸고 SQL도 실행한다. shell exported 변수는 파일보다 우선하며 env:pull은 파일 전체를 다시 써서 local 값을 지운다. physical device/Android emulator에서는 computer localhost 대신 LAN 주소를 사용한다.

EAS env:set은 같은 name의 overlapping environment variable을 재사용한다. shared variable에 development만 새 URL을 set하면 prod/preview까지 움직일 수 있어 shared record를 분리해 hosted(prod/preview)와 local(dev)을 따로 둔다. cloud build profile이 environment=development라면 localhost를 embed하면 안 된다. noninteractive create는 region 필수이며 최초 provider authorization은 interactive browser가 필요하다.

## 연결 관리와 실패

disconnect는 Expo link만 지워 provider data와 env는 유지한다. 다시 connect하면 새 project가 생길 수 있어 같은 project는 --link로 연결한다. --reauth는 저장 connection/project link를 지우고 browser를 열며 existing project는 남는다. public env 변경은 reload/dev server restart로 반영한다. active project quota는 provider current plan에서 확인하고 생성 실패를 반복해서 project를 늘리지 않는다. Expo Go에서 sample은 가능하나 SQLite plugin custom option이나 추가 native module은 development build가 필요하다.

## 출처

- [Expo Documentation, Using Supabase](https://docs.expo.dev/guides/using-supabase)

## 관련 문서

- [[Expo-Integrations-Authentication]]
- [[Expo-Integrations-Local-First]]
- [[Expo-Integrations-Privacy]]
