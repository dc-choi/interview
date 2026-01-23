# 운영 팁

## STOP-WRITES-ON-BGSAVE-ERROR
```
기본값은 yes, 이 옵션은 RDB 파일을 저장할 경우 장애가 발생하면 모든 쓰기 작업을 차단한다.

적절하게 모니터링을 하고 있다면 이 옵션은 끄는게 좋다.
```

## MaxMemory 값 설정
```
RDB 설정 & AOF rewrite시 fork()

Copy-on-Write로 인해 메모리를 두배로 사용하는 경우 발생 가능.

Persistence / 복제 사용 시 MaxMemory는 실제 메모리의 절반으로 설정.
```

## Memory 관리
```
물리적으로 사용하고 있는 메모리를 모니터링 해야 함

used_memory가 아닌 used_memory_rss값을 모니터링 해야 함.

실제 저장된 데이터는 적은데 rss값은 큰 상황이 발생할 수 있음. 이 차이가 클 때 fragmention이 크다고 말함.

주로 삭제되는 키가 많을 때 fragmention이 증가함.

fragmention이 크게 증가한 경우 activefrag라는 옵션을 키면 도움이 됨.

이 옵션은 단편화가 많이 발생한 경우 키는 것을 권장함.
```
