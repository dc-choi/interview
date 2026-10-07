---
tags: [aws, gamelift, streaming, webrtc, capacity]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Amazon GameLift Streams", "게임 클라이언트 스트리밍"]
---

# Amazon GameLift Streams

게임 클라이언트를 클라우드에서 실행하고 화면, 오디오와 사용자 입력을 스트리밍한다. 멀티플레이 세션 서버를 배치하는 [[GameLift-Servers|GameLift Servers]]와 역할이 다르다.

## 구성과 연결

- **Application:** 실행할 빌드와 런타임 설정.
- **Stream group:** 실행 자원, 연결한 application과 위치별 용량.
- **Stream session:** 한 사용자의 실행과 스트리밍 연결.

직접 웹 클라이언트를 구현하는 경우 프런트엔드가 WebRTC 연결 요청을 만들고 백엔드가 GameLift Streams에 세션 생성을 요청한다. 백엔드가 돌려준 세션 정보와 응답으로 WebRTC 연결을 이어 간다. 로그인과 플레이 권한은 서비스의 인증 체계와 연동한다.

## 용량과 비용

2026-10-07 공식 문서 기준이다. 과거의 `OnDemandCapacity` 입력은 deprecated이며 `MaximumCapacity`를 사용한다.

| 설정 | 의미 | 비용과 지연 |
|---|---|---|
| Always-on | 유지할 최소 용량 | 유휴 상태에도 비용 발생 |
| Maximum | 할당 가능한 최대 용량 | 추가 자원 준비에 수분이 걸릴 수 있음 |
| Target-idle | 다음 요청에 대비할 유휴 용량 | 대기 자원에도 비용 발생 |

먼저 이미 할당한 유휴 용량을 사용하고 부족하면 최대치까지 추가 할당한다. 최대치에 도달하면 기존 세션이 끝나 용량이 생길 때까지 요청이 대기할 수 있다.

동시 세션 용량과 GPU quota는 단위가 다르다. 멀티테넌트 클래스는 GPU 하나에서 여러 세션을 실행하므로 위치, 클래스와 tenancy에 맞게 계산한다. 위치를 추가했어도 application 복제가 완료되어야 그 위치에서 실행할 수 있다.

## 공유 URL은 접속 권한으로 취급한다

Stream URL은 별도 클라이언트 연동이나 수신자의 AWS 계정 없이 데모와 테스트를 공유하는 경로다. 전체 URL을 가진 사람이 세션을 시작할 수 있으므로 공개 문서나 로그에 남기지 않고, 필요한 만료 시간과 사용 횟수만 허용한다. 유출되면 revoke한다.

2026-10-07 공식 문서 기준으로 각 사용은 독립된 새 세션이며 사용 횟수 한 번을 소비한다. Stream URL로 시작한 세션은 재접속을 지원하지 않는다. 새로고침이나 연결 단절 뒤 URL을 다시 열면 새 세션과 추가 사용 횟수가 필요하다. 세션 설정은 URL 생성 시 고정된다.

용량이 없으면 공유 페이지는 일시적인 용량 부족을 알리고 재시도를 안내한다. `UsageLimit`은 URL의 누적 사용 횟수 제한이며 stream group의 동시 실행 용량을 대신하지 않는다. 따라서 초대 인원, 예상 재시도와 실제 동시 용량을 나눠 점검한다.

## 도입 판단

다음은 용량 모델을 이용한 검토 기준이다. 짧은 데모와 내부 테스트는 시작 대기 시간을 허용할 수 있는지부터 정한다. 공개 이벤트는 피크 동시 접속뿐 아니라 새 세션 유입 속도와 자원 준비 시간을 함께 측정한다.

게임 빌드의 호환성, 실제 사용자 네트워크에서의 입력 지연과 시작 성공률을 시험한다. 브라우저 지원이나 저지연이라는 제품 설명을 모든 단말의 동일한 품질 보장으로 해석하지 않는다.

## 출처

- [Amazon GameLift Streams, Share stream sessions with stream URLs](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/stream-urls.html)
- [Amazon GameLift Streams, What is Amazon GameLift Streams?](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/what-is-service.html)
- [Amazon GameLift Streams, Manage streaming with a stream group](https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/stream-groups.html)
- [Deploy your first web application with Amazon GameLift Streams — AWS](https://aws.amazon.com/blogs/gametech/deploy-your-first-web-application-with-amazon-gamelift-streams/)

## 관련 문서

- [[GameLift-Servers|GameLift Servers]]
- [[compute|AWS 컴퓨팅 서비스]]
