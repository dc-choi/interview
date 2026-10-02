---
tags: [expo, expo-integrations, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Convex와 CMS 연결"]
---

# Expo Convex와 CMS 연결

Convex는 reactive database와 server function, file storage/search/scheduling을 typed client로 제공한다. CMS는 비개발자가 content를 편집하는 관리 영역이며 두 도구의 목적을 구분한다.

## Convex deployment와 client

EAS-linked project에서 integrations:convex:connect는 region/team/project를 정하고 convex package, team connection, deployment와 environment를 준비한다. CONVEX_DEPLOY_KEY와 EXPO_PUBLIC_CONVEX_URL은 .env.local, public URL은 EAS의 세 environment에 기록된다. deploy key는 client bundle에 넣지 않는다. command는 verified Expo email로 team invitation도 보내므로 단순 read-only setup이 아니다.

convex dev는 convex directory와 typed API를 만들고 실행 중 server function을 deployment에 sync한다. client instance는 root에서 한 번 만들고 provider를 연결한다.

```tsx
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning:false,
});
<ConvexProvider client={convex}><Stack /></ConvexProvider>
```

server의 query({args:{},handler:ctx=>ctx.db.query('tasks').collect()})를 export하고 앱에서 useQuery(api.tasks.get)로 subscription 결과를 읽는다. 초기 undefined와 실제 빈 list를 구분한다. generated api 위치는 tsconfig alias와 실제 convex folder 위치를 맞춘다. authentication과 authorization을 넣지 않은 sample은 private data 권한 정책까지 제공하지 않는다.

project/dashboard/team/team:invite 명령은 linked integration을 관리하고 project:delete/team:delete는 EAS metadata만 삭제해 Convex resource를 파괴하지 않는다. provider login Google/GitHub email이 초대 email과 다르면 Add email과 verification 후 invitation을 다시 열어야 기존 team이 보인다. verify 직후 화면이 자동 갱신되지 않을 수 있다.

## CMS로 content 운영

Strapi는 content backend integration, Sanity는 Visual Editing integration을 소개한다. CMS content는 app binary를 새로 출시하지 않고 수정할 수 있지만 schema/client contract 변화, draft 공개 여부, image URL/caching과 editor 권한은 따로 관리한다. CMS가 app native logic 업데이트나 사용자 데이터 authorization까지 맡는 것은 아니다. Expo overview는 두 provider의 링크를 제공하고 설치/API 계약은 해당 provider 문서 범위다.

## 출처

- [Expo Documentation, Using Convex](https://docs.expo.dev/guides/using-convex)
- [Expo Documentation, Using a Content Management System (CMS)](https://docs.expo.dev/guides/using-a-cms)

## 관련 문서

- [[Expo-Integrations-Supabase]]
- [[Expo-Integrations-Local-First]]
- [[Expo-Router-API-Routes]]
