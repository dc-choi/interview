---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 메일과 SMS 작성 화면"]
---

# Expo SDK 메일과 SMS 작성 화면

expo-mail-composer와 expo-sms는 사용자가 최종 편집/전송하는 OS 작성 화면을 연다. 서버 발송은 [[Expo-Integrations-Resend]]처럼 별도 경로다. npx expo install expo-mail-composer expo-sms 후 namespace import한다. 메일은 Android/iOS/web, SMS는 Android/iOS이며 Expo Go에 포함된다.

## MailComposer

isAvailableAsync():Promise<boolean>은 기본 메일 앱/계정과 iOS MDM 제한을 확인한다. iOS simulator에서는 Mail 계정 작성이 불가능하고 web true가 실제 설치 client를 보장하지는 않는다. composeAsync(options):Promise<MailComposerResult>의 options는 recipients/ccRecipients/bccRecipients 배열, subject/body, isHtml, attachments(앱 내부 file URI 배열)다. Android HTML rendering은 제한적이다. 결과 status는 cancelled/saved/sent/undetermined이며 Android sent는 작성 activity 종료에 대한 placeholder로 실제 발송 증거가 아니다.

```ts
import * as MailComposer from 'expo-mail-composer';
if (await MailComposer.isAvailableAsync()) {
  const result = await MailComposer.composeAsync({subject:'문의', body:'내용', recipients:[]});
}
```

getClients()는 client 목록을 반환한다. 공통 label, Android packageName, iOS url로 client를 구별한다. Android icon/실행은 IntentLauncher, iOS url은 Linking을 연결할 수 있다. prefill된 수신자/본문은 사용자가 바꿀 수 있다.

## SMS

isAvailableAsync():Promise<boolean>은 simulator/web에서 false다. sendSMSAsync(addresses:string|string[], message:string, options?):Promise<SMSResponse>는 작성 UI를 연다. attachments는 한 개 또는 배열이며 filename, mimeType, contentUri가 필요하다. Android 외부 앱에 읽기 가능한 content URI와 iOS 파일 접근 조건을 맞춘다.

```ts
import * as SMS from 'expo-sms';
if (await SMS.isAvailableAsync()) await SMS.sendSMSAsync([], '공유할 메시지');
```

result는 sent/cancelled/unknown이다. sent도 사용자가 전송 또는 예약한 결과이며 recipient/body나 최종 배송을 검사하지 않는다. Android는 항상 unknown을 반환한다. 민감한 실제 전화번호/메일주소를 예제나 저장된 로그에 넣지 않는다.

## 출처

- [Expo Documentation, MailComposer](https://docs.expo.dev/versions/latest/sdk/mail-composer)
- [Expo Documentation, SMS](https://docs.expo.dev/versions/latest/sdk/sms)

## 관련 문서

- [[Expo-SDK-Linking-Intent]]
- [[Expo-Integrations-Resend]]
