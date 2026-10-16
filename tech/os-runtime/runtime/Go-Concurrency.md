---
tags: [go, concurrency, goroutine, channel, context, interview]
status: done
verified_at: 2026-10-12
category: "OS&런타임(OS&Runtime)"
aliases: ["Go Concurrency", "Golang Concurrency", "Go 동시성", "고루틴과 채널"]
---

# Go 동시성 (goroutine, channel, select, context)

Go 동시성은 goroutine으로 실행 흐름을 만들고, channel로 값과 완료 신호를 넘기고, `sync`와 `context`로 대기, 상호 배제와 취소를 처리하는 구성이다. 도구를 고르기 전에 누가 기다리는지, 누가 channel을 닫는지, 누가 취소를 확인하는지를 먼저 정한다. 본문의 동작은 Go 1.27 언어 명세와 표준 라이브러리 문서를 기준으로 한다.

goroutine을 OS 스레드에 배치하는 M:N 구조와 `GOMAXPROCS`는 [[Thread-Models|스레딩 모델]]과 [[Concurrency-vs-Parallelism|동시성과 병렬성]]에서, 공유 상태 보호, 동시 실행 수 제한과 데드락은 [[Go-Concurrency-Patterns-and-Pitfalls|Go 동시성 패턴과 함정]]에서 다룬다.

## goroutine

- `go f(x)`는 함수 호출을 새 goroutine에서 시작한다. 함수 값과 인자는 호출한 goroutine에서 평가되고, 호출자는 완료를 기다리지 않으며 반환값은 버려진다.
- goroutine은 같은 주소 공간에서 실행된다. 별도 프로세스처럼 격리되지 않으므로 같은 변수를 여러 goroutine이 다루면 동기화가 필요하다.
- 몇 KB 스택으로 시작해 필요할 때 늘리고 줄인다. 런타임이 여러 OS 스레드에 다중화하므로 한 goroutine이 시스템 콜이나 I/O에서 막혀도 다른 goroutine은 계속 실행된다.
- `main` 함수가 반환하면 프로그램이 끝나며 다른 goroutine을 기다리지 않는다. goroutine만 시작하고 `main`이 끝나면 작업 결과 없이 종료될 수 있다.
- `time.Sleep`이나 입력 대기로 `main`을 붙잡는 것은 동기화가 아니다. goroutine의 종료는 다른 goroutine의 어떤 동작보다 먼저 일어난다고 보장되지 않으므로, 결과를 관찰하려면 channel이나 `sync`로 순서를 만든다 ([[Thread-vs-Event-Loop#동시성 정확성의 세 축|동시성 정확성의 세 축]]).
- Go 1.22 언어 버전부터 `for` 루프 변수는 반복마다 새로 선언된다. 그 이전에는 루프 안에서 시작한 클로저 goroutine들이 같은 변수를 공유했다.

## WaitGroup으로 완료 기다리기

`sync.WaitGroup`은 작업 카운터다. Go 1.25에 추가된 `wg.Go(f)`는 goroutine 시작, 등록과 완료 처리를 함께 한다. 그 이전 코드는 `Add`와 `Done`을 직접 쓴다.

```go
results := make([]string, len(orders)) // 각 goroutine은 자기 인덱스에만 쓴다

var wg sync.WaitGroup
for i, order := range orders {
	wg.Add(1) // goroutine을 만들기 전에 등록한다
	go func() {
		defer wg.Done() // 조기 반환과 panic 경로에서도 카운트를 줄인다
		results[i] = processOrder(order)
	}()
}
wg.Wait() // 등록한 작업이 모두 Done을 호출할 때까지 막힌다
```

- 카운터가 0일 때의 `Add`는 `Wait`보다 먼저 일어나야 한다. goroutine 안에서 `Add`를 부르면 `Wait`가 카운터 0을 보고 먼저 통과할 수 있다. Go 1.25부터 `go vet`의 `waitgroup` 분석기가 이 위치를 보고한다.
- `processOrder`는 동기화 도구를 모르게 두고 감싸는 익명 함수가 `Done`을 맡는다. 작업 함수는 동기 코드 그대로 재사용된다.
- `defer`는 둘러싼 함수가 `return`, 본문 끝, panic 중 어느 경로로 끝나든 반환 직전에 실행된다. 백그라운드 실행이 아니다.
- `Done`은 그 호출이 풀어 준 `Wait`의 반환보다 먼저 일어난다. 그래서 `Wait` 이후에는 각 goroutine이 서로 다른 인덱스에 쓴 결과를 읽을 수 있다. 여러 goroutine이 같은 슬라이스에 `append`하면 data race다.
- WaitGroup은 처음 사용한 뒤 복사하면 안 된다. 함수에는 포인터로 넘기고, `go vet`의 `copylocks`가 값 복사를 잡는다. `wg.Go`에 넘기는 함수는 panic하면 안 된다.
- WaitGroup은 완료만 센다. 오류 수집과 첫 오류에서의 취소는 [[Go-Concurrency-Patterns-and-Pitfalls#워커 풀과 동시 실행 수 제한|errgroup]]이 맡는다.

## channel

- `make(chan T)`의 unbuffered channel은 송신자와 수신자가 모두 준비돼야 통신이 성립한다. 값 전달과 두 goroutine의 동기화가 한 번에 일어난다.
- `make(chan T, n)`의 buffered channel은 버퍼가 차 있지 않으면 송신이, 비어 있지 않으면 수신이 막히지 않는다. 버퍼는 속도 차이를 흡수할 뿐 소비가 계속 느리면 결국 송신이 막힌다.
- `<-ch` 수신은 값이 올 때까지 막힌다. channel은 FIFO 큐로 동작해 한 goroutine이 보낸 값은 보낸 순서대로 받으며, 한 channel을 여러 goroutine이 추가 동기화 없이 송수신해도 된다.
- 매개변수를 `chan<- T`(송신 전용), `<-chan T`(수신 전용)로 선언하면 역할을 컴파일러가 강제한다.
- `close(ch)`는 더 보낼 값이 없다는 기록이다. 닫힌 뒤에도 남은 값은 받을 수 있고, 다 받은 뒤의 수신은 막히지 않고 제로 값과 `ok == false`를 돌려준다. `for v := range ch`는 channel이 닫히고 비면 끝난다.
- channel은 송신자가 닫는다. 닫힌 channel에 보내거나 다시 닫으면 panic이고 nil channel을 닫아도 panic이다. 송신자가 여럿이면 모두 끝난 뒤 한 곳에서 닫는다.
- 닫기는 수신자에게 더 올 값이 없다고 알려야 할 때만 필요하다. 파일처럼 매번 닫아야 하는 자원이 아니다.
- 닫힌 channel의 수신은 모든 수신자에게 즉시 성립하므로 `close`는 여러 goroutine에 한 번에 알리는 방송 신호가 된다. `context`의 `Done`이 이 방식이다.

참조 카운트 증가나 작은 범위의 상호 배제는 `sync`와 `sync/atomic`으로 충분하다. 여러 goroutine의 작업 흐름은 데이터마다 책임 goroutine을 하나로 두고 channel로 넘기면 단순해지며, 큰 프로그램은 둘을 함께 쓴다. 메시지 전달 모델의 비교는 [[Async-vs-Threads#채널 (Channel) 기반 메시지 전달|채널 기반 메시지 전달]]에서 다룬다.

## select

- `select`는 여러 송수신 중 진행할 수 있는 하나를 고른다. 여럿이 준비되면 균등한 의사 난수로 고르므로 case 순서가 우선순위가 되지 않는다.
- 준비된 case가 없으면 `default`를 실행하고, `default`가 없으면 하나가 진행될 때까지 막힌다. `select {}`는 영원히 막힌다.
- `<-fast`, `<-slow`를 차례로 받으면 빠른 channel의 값도 느린 channel을 기다린다. `select`는 먼저 준비된 쪽부터 처리할 뿐 프로그램 전체를 논블로킹으로 만들지 않는다.
- 시간 초과와 취소는 `time.After`나 `ctx.Done()` case를 함께 두어 표현한다.

## context로 취소와 기한 전파

```go
func fetch(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel() // 일찍 끝나도 타이머와 자식 context를 정리한다

	result := make(chan string, 1) // 아무도 받지 않아도 송신하고 끝날 수 있게 버퍼 1
	go func() {
		time.Sleep(200 * time.Millisecond) // 느린 외부 호출 자리
		result <- "ok"
	}()

	select {
	case r := <-result:
		return r, nil
	case <-ctx.Done():
		return "", ctx.Err() // context.DeadlineExceeded
	}
}
```

- `Done()`은 취소되거나 기한이 지나면 닫히는 channel이다. `Err()`는 기한 초과면 `context.DeadlineExceeded`(메시지 `context deadline exceeded`), 그 밖의 취소면 `context.Canceled`를 돌려준다.
- 부모가 취소되면 파생 context도 모두 취소된다. 같은 context를 여러 goroutine에 넘겨도 안전하다.
- `WithCancel`, `WithDeadline`, `WithTimeout`이 돌려준 `cancel`을 호출하지 않으면 부모가 취소될 때까지 자식 context가 남는다. `defer cancel()`을 기본으로 두며 `go vet`의 `lostcancel`이 누락을 검사한다.
- 취소는 협력적이다. 위 예시는 시간 초과로 반환해도 느린 goroutine이 `ctx`를 보지 않아 끝까지 실행된다. 실제 호출에는 `ctx`를 받는 API를 쓰고, 오래 도는 루프는 `ctx.Done()`을 확인한다.
- 결과 channel에 버퍼가 없으면 시간 초과 뒤 송신 goroutine이 받는 쪽 없는 송신에서 영원히 막혀 누수된다.
- context는 구조체 필드에 저장하지 않고 첫 매개변수 `ctx`로 넘긴다. `WithValue`는 프로세스와 API 경계를 넘는 요청 범위 데이터에만 쓰고 선택적 인자 대용으로 쓰지 않는다.

## Node.js 이벤트 루프와 비교

| 관점 | Node.js | Go |
|---|---|---|
| 실행 | JS 스레드 하나의 이벤트 루프가 callback을 실행하고, JS 병렬 실행은 Worker Threads가 맡는다 | 런타임이 goroutine을 `GOMAXPROCS`개까지의 OS 스레드에서 병렬로 실행한다 |
| 대기 표현 | Promise와 `await`. 호출 경로가 async로 물든다 | 블로킹처럼 보이는 호출. 함수 색깔이 없다 |
| 공유 상태 위험 | 일반 JS 객체에는 data race가 없고 `await` 사이의 논리적 경쟁이 남는다 | 동기화 없는 접근이 data race다. Mutex, channel과 `-race`로 다룬다 |
| 모두 기다리기 | `Promise.all`은 첫 거부로 끝나지만 나머지를 취소하지 않는다 | WaitGroup은 완료만 센다. errgroup `WithContext`는 첫 오류에서 context를 취소한다 |
| 취소와 기한 | `AbortSignal`, 타이머 | `context.Context`, `select` |
| 동시 실행 제한 | `p-limit`, 스트림 `highWaterMark` | 워커 풀, buffered channel 세마포어, `errgroup.SetLimit` |

두 런타임 모두 취소는 협력적이고, 대기열 상한과 시간 초과는 애플리케이션이 정한다. 함수 색깔과 가상 스레드 계열 비교는 [[Async-vs-Threads|async/await vs 스레드]], 이벤트 루프의 병목과 관측은 [[Thread-vs-Event-Loop|Thread vs Event Loop]], Go 쪽의 Mutex, race detector와 동시 실행 제한은 [[Go-Concurrency-Patterns-and-Pitfalls|Go 동시성 패턴과 함정]]에서 다룬다.

## 면접 체크포인트

- goroutine과 OS 스레드의 차이, `main`이 반환할 때 실행 중인 goroutine은 어떻게 되는가
- unbuffered와 buffered channel이 각각 언제 막히는가
- channel은 누가 언제 닫는가, 닫힌 channel에 송신하거나 수신하면 어떻게 되는가
- `select`에서 여러 case가 동시에 준비되면 무엇이 실행되는가
- `wg.Add`를 goroutine 안에서 호출하면 왜 위험한가
- context 취소가 협력적이라는 뜻과 `defer cancel()`을 두는 이유

## 출처

- [YouTube, Tiago, Golang Concurrency Explained (Crash Course)](https://www.youtube.com/watch?v=eqSgTJ6HTsw)
- [Go, The Go Programming Language Specification](https://go.dev/ref/spec)
- [Go, The Go Memory Model](https://go.dev/ref/mem)
- [Go, Effective Go, Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go, Frequently Asked Questions, Why goroutines instead of threads?](https://go.dev/doc/faq#goroutines)
- [Go, A Tour of Go, Range and Close](https://go.dev/tour/concurrency/4)
- [Go, Go 1.25 Release Notes](https://go.dev/doc/go1.25)
- [Go 표준 라이브러리, sync](https://pkg.go.dev/sync)
- [Go 표준 라이브러리, context](https://pkg.go.dev/context)
- [Go, Data Race Detector](https://go.dev/doc/articles/race_detector)
- [Go Packages, golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go Concurrency Patterns: Pipelines and cancellation — The Go Blog, Sameer Ajmani](https://go.dev/blog/pipelines)
- [Go Concurrency Patterns: Timing out, moving on — The Go Blog, Andrew Gerrand](https://go.dev/blog/concurrency-timeouts)

## 관련 문서

- [[Go-Concurrency-Patterns-and-Pitfalls|Go 동시성 패턴과 함정 (Mutex, race detector, 워커 풀, 데드락)]]
- [[Thread-Models|스레드 종류와 스레딩 모델 (M:N, GOMAXPROCS)]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]
