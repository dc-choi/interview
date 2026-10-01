---
tags: [nextjs, app-router, streaming]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Web Streams와 배포 경로 관찰"]
---

# Web Streams와 배포 경로 관찰

## React stream과 raw endpoint

React/Suspense는 UI를 stream한다. Route Handler는 별도로 Web Streams의 raw Response를 반환할 수 있어 SSE, 큰 파일, 점진적 데이터에 적합하다. text/plain 예는 TextEncoder가 Chunk 1~10의 줄을 encode하고 enqueue 사이에 200ms 기다린 뒤 close한다.

```ts
export async function GET() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(encoder.encode(`Chunk ${i + 1}\n`))
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      controller.close()
    },
  })
  return new Response(stream, {headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  }})
}
```

브라우저 직접 방문이나 `curl -N http://localhost:3000/api/stream`으로 확인한다. raw endpoint는 React fallback 교체 script를 자동 생성하지 않는다. cancel, 인증, 오류와 장시간 연결 자원 해제는 실제 endpoint 요구에 맞게 추가한다.

전체 파일을 memory에 적재하지 않으려면 Node의 open과 FileHandle.readableWebStream으로 CSV를 Response에 넘긴다. Content-Type:text/csv, Content-Disposition:attachment; filename="data.csv"를 설정한다. 파일 핸들은 stream 종료 시 닫히도록 지원 Node에서 autoClose:true를 사용하거나 직접 수명을 관리한다. readableWebStream은 여러 번 호출할 수 없고 stream 소비 전 file.close하면 안 된다. 지원 Node 버전과 byte stream 타입을 확인한다.

## 중간 buffering과 플랫폼 지원

서버가 점진적으로 생성해도 reverse proxy/CDN/client가 전체를 모아 보내면 화면은 늦게 한 번에 나타난다. Nginx buffering에는 응답 X-Accel-Buffering:no 또는 서버 설정이 필요하다. next.config.headers 예는 모든 route matcher에 `{key:'X-Accel-Buffering',value:'no'}`를 추가한다. 실제 앞단이 이 header를 따르는지 확인한다.

CDN마다 chunk 전달 조건, config와 plan이 다를 수 있다. AWS Lambda는 별도 response streaming mode를 활성화해야 하며 Vercel은 streaming을 지원한다. Gzip/Brotli가 효율적인 압축을 위해 내부에서 모으는 경우도 있어 first visible chunk가 늦으면 flush 정책을 확인한다.

| 배포 방식 | 지원 |
| --- | --- |
| Node.js server | 지원 |
| Docker | 지원 |
| static export | runtime stream 없음 |
| adapter | platform별 확인 |

Safari/WebKit은 작은 응답을 약 1024 bytes까지 모으는 조건이 알려져 있어 최소 demo가 한 번에 paint될 수 있다. 실제 layout/styles/scripts를 포함한 응답은 대개 더 크다. 서버가 chunk를 보냈는지와 화면이 paint했는지는 구분한다.

curl의 `-N/--no-buffer`는 stdout buffering을 끈다. 원문은 -N을 써도 newline이 필수라고 설명하지만 curl 공식 계약은 줄바꿈을 요구하지 않는다. 뒤의 pipe, 터미널 출력과 서버 buffering을 각각 확인한다.

## 실제 chunk를 관찰하기

DevTools document Timing에서 이른 TTFB와 긴 Content Download는 단서다. 단독으로 경계별 표시를 증명하지는 않으므로 raw body read 시각과 화면을 함께 관찰한다. 아래 관찰 코드는 저장소의 구현 기능이 아니라 외부에서 실행하는 진단 예다.

```js
// stream-observer.mjs, node stream-observer.mjs로 실행
const started = Date.now()
const res = await fetch('https://streaming-demo.labs.vercel.dev/suspense-demo', {
  headers: {'Accept-Encoding': 'identity'},
})
console.log('headers ms', Date.now() - started)
const reader = res.body.getReader()
const decoder = new TextDecoder()
let index = 0
while (true) {
  const {done, value} = await reader.read()
  if (done) break
  console.log('chunk', index++, 'ms', Date.now() - started)
  console.log(decoder.decode(value, {stream: true}))
}
console.log(decoder.decode())
```

identity는 협상상 압축을 피하는 요청이며 실제 응답 Content-Encoding도 확인한다. 문자열이 chunk 중간에 잘릴 수 있어 TextDecoder의 stream 옵션과 마지막 flush를 사용한다. ReadableStream read의 경계는 TCP packet이나 서버 enqueue와 정확히 일치하는 보장이 없다.

demo 예는 처음 head/CSS/nav/fallback과 B:0/B:1 template, 약 170ms에 self.__next_f.push payload, 약 1초에 Weather, 3초에 Analytics를 받는다. hidden S:0/S:1 HTML과 script가 해당 fallback을 교체한다. ID와 시간은 demo 관찰 예이지 안정된 API나 서비스 latency 보장이 아니다.

User-Agent:Twitterbot/1.0을 추가하면 demo가 fetch부터 약 3초 기다리고 한 burst로 body를 주는 사례를 비교할 수 있다. header 대기와 body read를 따로 재야 한다. HTML-limited bot의 metadata blocking 이후 content streaming도 가능한 공식 조건이 있으므로 모든 bot이 완성 문서 한 chunk를 받는다고 일반화하지 않는다.

## 출처

- [Next.js, streaming](https://nextjs.org/docs/app/guides/streaming)
- [curl, no-buffer](https://curl.se/docs/manpage.html#-N)
- [Node.js, FileHandle.readableWebStream](https://nodejs.org/api/fs.html#filehandlereadablewebstreamoptions)

## 관련 문서

- [[NextJS-Streaming]]
- [[NextJS-Self-Hosting]]
- [[NextJS-App-Route-Handlers]]
