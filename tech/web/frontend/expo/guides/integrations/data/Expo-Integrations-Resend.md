---
tags: [expo, expo-integrations, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router server에서 Resend 사용"]
---

# Expo Router server에서 Resend 사용

Resend SDK는 server-only email/contact/domain/webhook API다. RESEND_API_KEY를 .env.local과 hosting server secret으로 보관하며 EXPO_PUBLIC prefix를 붙이거나 client module에서 import하지 않는다. .env.local을 version control에서 제외한다.

SDK57 Router는 web.output=server와 +api.ts로 route를 export한다. src/app/api/audience+api.ts의 POST(Request)에서 body를 validate한 뒤 server SDK를 호출하고 Response를 반환한다. Expo guide 예제는 resend.contacts.create로 contact를 추가하며 실제 email send가 아니다. 화면의 Email sent success 문구는 이 동작과 맞지 않아 contact 등록 성공으로 표현한다.

```ts
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.email !== 'string' || !body.email.trim()) {
    return Response.json({ success:false }, { status:400 });
  }
  const result = await resend.contacts.create({ email:body.email, unsubscribed:false });
  // SDK result의 error도 검사하고 적절한 server error/status로 변환한다.
  return Response.json({ success:true });
}
```

예제는 구조 설명이며 production에서는 JSON parsing 실패, provider result/error, rate limit/abuse, 권한과 contact 동의 상태를 처리한다. 원문의 await만 하는 contact 호출은 provider 실패 result를 success로 오인할 수 있다. email send는 provider의 emails API와 verified sender/domain이 별도로 필요하다.

client는 EXPO_PUBLIC_BASE_URL(배포 domain) 또는 local server URL에 POST하고 Content-Type, response.ok와 응답 JSON을 검사한다. physical native에서 localhost는 컴퓨터가 아니므로 reachable 주소를 쓴다. input blur는 keyboard를 닫지만 요청 성공을 보장하지 않는다. export --platform web 결과 dist를 EAS Hosting에 deploy하고 public base URL을 그 domain과 맞춘다. env 파일에 secret이 있다고 client가 절대 import할 수 없다는 보장은 없으며 server-only module 경계를 지킨다. 이 문서 작업에서는 contact 생성이나 email을 발송하지 않았다.

## 출처

- [Expo Documentation, Using Resend](https://docs.expo.dev/guides/using-resend)

## 관련 문서

- [[Expo-Router-API-Routes]]
- [[Expo-Router-Server-Deployment]]
- [[Expo-Integrations-Privacy]]
