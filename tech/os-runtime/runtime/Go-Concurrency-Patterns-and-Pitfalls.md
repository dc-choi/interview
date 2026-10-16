---
tags: [go, concurrency, data-race, mutex, worker-pool, deadlock, interview]
status: done
verified_at: 2026-10-12
category: "OS&런타임(OS&Runtime)"
aliases: ["Go Concurrency Patterns and Pitfalls", "Go 동시성 패턴과 함정", "Go Worker Pool", "Go 워커 풀", "Go Data Race"]
---

# Go 동시성 패턴과 함정 (Mutex, race detector, 워커 풀, 데드락)

goroutine, channel, WaitGroup과 context의 동작은 [[Go-Concurrency|Go 동시성]]에서 다룬다. 이 문서는 그 도구로 공유 상태를 보호하고, 동시 실행 수를 제한하고, 데드락과 goroutine 누수를 찾는 방법을 Go 1.27 기준으로 정리한다.

## 공유 상태: data race와 Mutex

data race는 같은 메모리 위치에 대한 쓰기가 다른 읽기나 쓰기와 동시에 일어나는 것이다(모든 접근이 `sync/atomic`이면 제외). 이런 접근은 channel, `sync`, `sync/atomic`으로 직렬화한다. 대부분의 구현에서 슬라이스, map, 인터페이스, 문자열처럼 여러 워드로 된 값의 race는 임의의 메모리 손상으로 이어질 수 있다.

- map은 동시 쓰기에 안전하지 않다. 모든 goroutine이 읽기만 하면 동기화 없이 읽어도 되지만 쓰기가 섞이면 보호한다. 런타임이 이를 감지하면 `fatal error: concurrent map writes`로 프로그램을 끝낸다. 감지는 보장되지 않고 `recover`로 막을 수도 없다.
- Mutex 하나로 map 전체를 보호하면 키와 무관하게 모든 쓰기가 한 줄로 선다. 키별 잠금이 아니다. 읽기도 같은 잠금을 거치고, 읽기가 많으면 `RWMutex`의 `RLock`으로 여러 읽기를 함께 허용한다.

```go
type userStore struct {
	mu    sync.RWMutex
	users map[int]string
}

func (s *userStore) add(id int, name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[id] = name
}

func (s *userStore) get(id int) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	name, ok := s.users[id]
	return name, ok
}
```

- 메서드를 포인터 리시버로 두어 Mutex가 복사되지 않게 한다. 값으로 복사하면 `go vet`의 `copylocks`가 보고한다.
- `RWMutex`는 쓰기 잠금을 기다리는 goroutine이 있으면 새 `RLock`도 막는다. 그래서 재귀적인 읽기 잠금은 금지되고, 읽기 잠금과 쓰기 잠금 사이의 승격과 강등도 없다.
- `sync.Map`은 한 번 쓰고 많이 읽는 캐시나 goroutine마다 다른 키 집합을 다루는 경우에 맞춘 특수 타입이다. 일반 map과 잠금의 대체재가 아니다.
- `go test -race`나 `go run -race`의 race detector는 실행된 경로에서 일어난 data race만 찾는다. 일반적인 프로그램에서 메모리가 5~10배, 실행 시간이 2~20배 늘 수 있고 cgo가 켜져 있어야 하므로, 동시성 경로를 실제로 실행하는 테스트에서 켠다.
- race detector가 찾는 것은 data race다. `main`이 결과를 출력하는 goroutine보다 먼저 끝나는 식의 순서 문제는 data race 없이도 생기므로 누가 마지막에 기다리는지를 설계해 막는다.

## 워커 풀과 동시 실행 수 제한

goroutine은 싸지만 메모리, DB 연결과 외부 API 한도는 그렇지 않다. 요청마다 goroutine을 만들고 제한하지 않으면 유입이 빠를 때 자원을 제한 없이 쓸 수 있다 ([[Backpressure|백프레셔]], [[Thread-Pool-Sizing|스레드 풀 사이징]]).

```go
func main() {
	jobs := make(chan int)
	results := make(chan int)

	var workers sync.WaitGroup
	for range 3 { // 워커 수가 동시 실행 상한
		workers.Go(func() {
			for n := range jobs { // jobs가 닫히고 비면 끝난다
				results <- n * n
			}
		})
	}

	go func() { // 송신자가 다 보낸 뒤 닫는다
		for n := range 10 {
			jobs <- n
		}
		close(jobs)
	}()

	go func() { // 모든 워커가 끝난 뒤 results를 닫는다
		workers.Wait()
		close(results)
	}()

	sum := 0
	for r := range results { // main이 마지막 수신자라 결과를 다 받고 끝난다
		sum += r
	}
	fmt.Println(sum) // 285
}
```

- `results`를 닫는 goroutine을 따로 둔다. `main`에서 `workers.Wait()`를 먼저 부르면 아무도 `results`를 받지 않아 워커가 송신에서 막히고, 모든 goroutine이 멈춰 데드락으로 끝난다. 반대로 `Wait`와 `close`를 `main`에 두고 수신을 다른 goroutine에 맡기면 `main`이 수신 goroutine의 마지막 처리보다 먼저 끝날 수 있다.
- 전체 시간은 가장 긴 작업 하나보다, 그리고 총 작업 시간을 워커 수로 나눈 값보다 짧아질 수 없다.
- 워커 풀이 goroutine 수 자체를 고정한다면, 세마포어는 작업마다 goroutine을 만들되 동시에 실행되는 수만 제한한다. 용량 N인 buffered channel에 보내면 획득, 받으면 반납이다. `go` 문 앞에서 획득해야 만들어지는 goroutine 수까지 제한된다.

```go
sem := make(chan struct{}, 3)
for _, job := range jobs {
	sem <- struct{}{} // 3개가 실행 중이면 여기서 기다린다
	wg.Go(func() {
		defer func() { <-sem }()
		process(job)
	})
}
wg.Wait()
```

- `golang.org/x/sync/errgroup`의 `Group`은 `SetLimit(n)`으로 동시 실행 수를 제한하고 `Wait`가 첫 오류를 돌려준다. `WithContext`로 만들면 첫 오류에서 파생 context가 취소되며, 나머지 작업은 그 context를 확인할 때만 멈춘다. 표준 라이브러리가 아니라 Go 프로젝트의 x 모듈이다.

## 데드락과 goroutine 누수

- 실행 중이거나 깨어날 수 있는 goroutine이 하나도 없으면 런타임이 `fatal error: all goroutines are asleep - deadlock!`으로 끝낸다. 받는 쪽 없는 unbuffered 송신, 아무도 닫지 않는 channel의 `range`, `make` 없이 선언한 nil channel의 송수신이 흔한 원인이다.
- 다른 goroutine이 타이머나 I/O로 깨어날 수 있으면 데드락으로 보고되지 않고, 막힌 goroutine은 조용히 누수된다. goroutine은 가비지 컬렉션 대상이 아니므로 스스로 끝나야 한다.
- Go 1.27부터 `runtime/pprof`의 `goroutineleak` 프로파일(`net/http/pprof`의 `/debug/pprof/goroutineleak`)이 더 이상 풀릴 수 없는 동기화 도구에서 막힌 goroutine을 GC 도달성으로 찾는다. 전역 변수나 실행 가능한 goroutine의 지역 변수로 닿는 동기화 도구에서 막힌 경우는 놓칠 수 있다.
- 시간 초과 뒤 아무도 받지 않는 결과 channel이 대표적인 누수 경로다. 결과 channel에 버퍼 1을 두면 송신 goroutine이 값을 넣고 끝난다 ([[Go-Concurrency#context로 취소와 기한 전파|context 예시]]).
- 여러 Mutex를 잡을 때는 획득 순서를 고정한다 ([[Concurrency-and-Process-Deadlock|교착상태]]).

## 면접 체크포인트

- map 동시 쓰기를 어떻게 막는가, Mutex 하나로 보호하면 무엇이 직렬화되는가
- race detector가 찾는 것과 놓치는 것, 테스트에서만 켜는 이유
- 워커 풀과 세마포어로 동시 실행 수를 제한하는 방식의 차이, errgroup이 더하는 것
- 결과 channel을 닫는 goroutine을 따로 두는 이유
- 데드락 오류가 나는 조건과 나지 않는 누수를 찾는 방법

## 출처

- [YouTube, Tiago, Golang Concurrency Explained (Crash Course)](https://www.youtube.com/watch?v=eqSgTJ6HTsw)
- [Go, The Go Memory Model](https://go.dev/ref/mem)
- [Go, Frequently Asked Questions, Why are map operations not defined to be atomic?](https://go.dev/doc/faq#atomic_maps)
- [Go, Data Race Detector](https://go.dev/doc/articles/race_detector)
- [Go, Effective Go, Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go, Go 1.27 Release Notes](https://go.dev/doc/go1.27)
- [Go 표준 라이브러리, sync](https://pkg.go.dev/sync)
- [Go Packages, golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go Concurrency Patterns: Pipelines and cancellation — The Go Blog, Sameer Ajmani](https://go.dev/blog/pipelines)

## 관련 문서

- [[Go-Concurrency|Go 동시성 (goroutine, channel, select, context)]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Race-Condition-Patterns|경쟁 조건 패턴]]
- [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]]
- [[Backpressure|Backpressure]]
- [[Thread-Pool-Sizing|스레드 풀 사이징]]
