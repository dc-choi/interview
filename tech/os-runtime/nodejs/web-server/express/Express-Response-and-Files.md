---
tags: [nodejs, express, http, static, cache]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Response and Files", "Express 응답과 정적 파일"]
---

# Express 응답과 파일 제공

응답 설정과 응답 완료는 구분한다. `status`, `set`, `type`, `location`, `attachment`는 설정을 바꾸지만 자체로 body를 보내거나 요청을 끝내지 않는다. 실제 응답이 끝나는 지점을 handler 흐름에서 명시한다.

## 본문과 상태

| API | 동작 |
|---|---|
| `res.send(body)` | 문자열은 HTML, 객체/배열은 JSON, Buffer는 지정하지 않으면 application/octet-stream |
| `res.json(value)` | JSON.stringify 기반 JSON 응답. null, 숫자와 Boolean도 JSON 의도를 명시 |
| `res.jsonp(value)` | JSONP callback 응답, 기본 query 이름 callback |
| `res.end(data?)` | Node의 응답 종료, body 없는 응답에도 사용 |
| `res.status(code)` | 상태만 설정, Express 5는 정수 100~999 |
| `res.sendStatus(code)` | 상태를 설정하고 등록된 상태 메시지를 text body로 전송 |

`res.status(201).json(result)`처럼 상태와 본문을 연결한다. Express 4의 `send(body, status)`, `json(obj, status)`와 `send(number)` 상태 전달 서명은 Express 5에서 지원하지 않는다. `send`는 Content-Length, HEAD와 freshness 처리를 포함하지만 stream의 backpressure나 장시간 전송 완료 정책까지 대신하지는 않는다.

API의 오류 응답은 JSON schema를 일정하게 유지하고 stack/내부 상세는 보내지 않는다. app의 `json replacer`, `json spaces`, `json escape`는 serialization 설정이다. `json escape`가 escaping한다고 모든 HTML 삽입 맥락에서 XSS가 사라지는 것은 아니다.

## header와 표현 협상

- `res.set(field, value)`/`header`는 값을 설정하거나 객체로 여러 header를 설정한다.
- `res.append(field, value)`는 기존 값에 덧붙인다. 이후 `set`을 호출하면 앞에서 append한 값을 덮어쓴다.
- `res.get(field)`는 설정한 header를 읽고 `type`/`contentType`은 MIME type 또는 확장자로 Content-Type을 설정한다. `/`가 있는 값은 MIME type 자체로 취급한다.
- `res.vary(field)`는 Vary에 중복 없이 추가한다. Express 5는 field 생략을 오류로 처리한다.
- `res.links({ next, last })`는 Link header의 relation과 URL을 구성한다. relation 값은 URL 문자열 또는 URL 배열이다.
- `res.format({ json, html, text, default })`는 Accept의 quality를 반영해 handler를 선택하고 Content-Type을 설정한다. Accept가 없으면 첫 callback, 일치가 없으면 default 또는 406이다.
- `res.headersSent`는 header가 이미 전송됐는지 나타낸다. 모든 body byte가 client에 도착했다는 뜻은 아니다.

`res.app`, `res.req`는 app과 요청 참조이고 `res.locals`는 이번 요청의 template 변수다. response stream과 lifecycle 자체는 Node HTTP 계약을 따른다.

## redirect와 template 응답

`res.location(path)`는 Location만 설정한다. `res.redirect(status?, path)`는 기본 302로 redirect 응답을 만든다. POST 이후의 303, method를 유지할 307/308 등은 [[HTTP-Status-Code]]의 의미에 맞춰 선택한다.

relative redirect는 현재 URL과 끝 slash에 영향을 받는다. `/blog/admin/`에서 `post/new`는 `/blog/admin/post/new`, `/blog/admin`에서는 `/blog/post/new`로 해석된다. 호스트 root 기준은 `/`로 시작하는 경로를 사용한다.

Express는 location 목적지의 허용 여부를 검증하지 않는다. 사용자 입력 URL/Referer를 직접 전달하지 말고 허용한 origin, scheme과 path 정책을 검사한다. Express 5에서는 `back` magic value가 제거됐다. 이전 페이지로 돌아간다는 의도도 실제 허용 목적지를 정해 구현한다.

`res.render(view, locals?, callback?)`는 template를 렌더링하며 callback이 없으면 응답을 보낸다. callback을 제공했으면 오류와 HTML을 받아 응답 완료도 직접 맡는다. view path와 locals key를 사용자 입력에 맡기지 않는다. [[Express-Application#템플릿 엔진과 locals]]의 template cache와 응답 cache 차이를 적용한다.

## 정적 파일의 URL과 root

`express.static(root, options)`는 serve-static에 기반한다. root 폴더 이름은 URL에 자동으로 포함되지 않으며 `app.use('/static', express.static(absoluteRoot))`처럼 virtual prefix를 장착한다. 상대 root는 프로세스를 실행한 cwd 기준이므로 시작 위치가 바뀔 수 있으면 절대 경로를 사용한다.

여러 root를 장착하면 먼저 등록한 directory의 파일이 우선한다. missing file은 기본 `next()`로 넘어가 뒤 directory나 route에서 처리할 수 있다. static 전에 auth를 두면 file 요청도 통과하며 logger 위치로 static 접근을 기록할지 결정한다.

| 옵션 | 기본값과 주의점 |
|---|---|
| `dotfiles` | ignore. allow/deny 선택, 숨김 directory도 검사 |
| `fallthrough` | true. false이면 missing/bad request도 next(err) |
| `index` | index.html, false이면 directory index file 자동 제공 중단 |
| `extensions` | false, 배열이면 순서대로 확장자 fallback |
| `redirect` | true, directory URL에 끝 slash redirect |
| `etag` | true, express.static은 weak ETag |
| `lastModified` | true, filesystem mtime 기반 |
| `maxAge` | 0, number는 ms 또는 기간 문자열 |
| `immutable` | false, true이면 maxAge도 함께 설정 |
| `cacheControl` | true, false이면 maxAge/immutable 무시 |
| `acceptRanges` | true, false이면 Range 무시하고 Accept-Ranges 미전송 |
| `setHeaders(res, path, stat)` | custom header를 동기적으로 설정 |

`app.set('etag', ...)`는 동적 응답 설정이고 static middleware의 ETag 설정을 바꾸지 않는다. `immutable`은 파일이 TTL 동안 변하지 않는다는 계약이므로 version/hash가 붙은 asset에 적용하고, HTML이나 사용자별 데이터는 별도 cache 정책을 둔다.

dotfiles의 ignore는 숨김 파일/디렉터리를 없는 것처럼 처리한다. deny는 403 오류 쪽으로 처리하지만 실제 최종 응답은 fallthrough와 뒤 handler에 따라 달라질 수 있다. 숨김 경로 검사는 root 자체를 포함한 전체 filesystem 접근 권한의 대체가 아니다.

Express 5에서는 `.well-known` 같은 directory도 기본 제공하지 않는다. 필요한 경우 `app.use('/.well-known', express.static(absoluteWellKnownRoot, { dotfiles: 'allow' }))`처럼 해당 directory만 명시적으로 허용하고 나머지는 기본을 유지한다. 모든 public dotfiles를 통째로 노출하지 않는다.

## 파일 전송과 download

`res.sendFile(path, options?, callback?)`는 파일을 body로 전송하고 확장자로 Content-Type을 설정한다. path는 absolute이거나 absolute root 옵션과 함께 relative로 제공해야 한다. `res.download(path, filename?, options?, callback?)`는 attachment로 보내며 filename은 browser 표시 이름을 재정의한다. `res.attachment(filename?)`는 disposition/type만 설정하고 파일 전송은 하지 않는다.

파일 API는 filesystem 접근을 제공하므로 사용자 입력을 path와 직접 합치지 않는다. absolute root와 그 안의 relative path로 범위를 제한하고 파일별 사용자 권한도 확인한다. root containment는 해당 파일을 읽을 권한이나 업로드 검증을 대신하지 않는다.

```js
app.get('/reports/:name', requireReportAccess, (req, res, next) => {
  res.download(req.params.name, undefined, {
    root: absoluteReportDirectory,
    dotfiles: 'deny',
  }, (err) => {
    if (err) next(err);
  });
});
```

`requireReportAccess`와 `absoluteReportDirectory`는 애플리케이션의 권한 검사와 root 설정 자리다. file callback이 있으면 실패 시 응답을 끝내거나 next(err)에 전달할 책임도 app에 있다. 전송 일부가 이미 나갔을 수 있으므로 `headersSent`를 확인하는 오류 handler와 함께 사용한다. 성공 callback을 호출했다는 사실을 비즈니스 작업의 결제/소비 확정으로 쓰려면 중단과 재시도 정책도 정한다.

sendFile/download의 `maxAge`, `root`, `lastModified`, `headers`, `dotfiles`, `acceptRanges`, `cacheControl`, `immutable`은 정적 제공과 연결된 옵션이다. API마다 서명을 확인하고 download의 relative path는 cwd 또는 root를 기준으로 해석한다.

Express 5에서는 `.js` 파일이 `text/javascript`로 제공된다. MIME database 변경으로 minor/patch에서도 MIME이 달라질 수 있으므로 header 고정에 의존하는 client, 보안 정책과 test를 확인한다. 캐시, 압축과 정적 전송은 트래픽이 커지면 앞단 proxy/CDN에서 맡길 수 있다.

## 출처

- [Express, Response](https://expressjs.com/en/5x/api/response/)
- [Express, Express Object](https://expressjs.com/en/5x/api/express/)
- [Express, Serving static files](https://expressjs.com/ko/5x/starter/static-files/)
- [Express, serve-static](https://expressjs.com/ko/resources/middleware/serve-static/)
- [Express, Upgrade to Express v5](https://expressjs.com/en/guide/migrating-5/)

## 관련 문서

- [[HTTP-Status-Code|상태 코드와 redirect]]
- [[HTTP-Caching|HTTP cache]]
- [[Content-Negotiation|표현 협상]]
- [[File-Upload-Security|파일 접근과 공개 범위]]
- [[Express-Routing-and-Middleware|오류 전달과 header 전송 이후 처리]]
