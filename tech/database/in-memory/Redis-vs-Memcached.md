# redis와 memcached의 차이점

1. 키-값 + 다양한 자료구조 VS 단순 키-값
2. RDB, AOF를 통한 영구 저장 가능 VS 영속성 없음
3. redis cluster로 사딩 가능 VS 클라이언트에서 분산 처리
4. Pub/Sub, 트랜잭션, Lua 스크립트, 분산 락, 메시지 큐 VS 단순 캐시
