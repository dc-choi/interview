---
tags: [java, exception, record, first-class-collection, data-class]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["1급 컬렉션", "First-Class Collection"]
---

# 1급 컬렉션 (First-Class Collection)

**`List<Order>`처럼 컬렉션을 필드로 가지는 클래스**를 만들고, 그 안에 관련 로직을 모으는 패턴.

## 나쁜 예

```java
class OrderService {
    int totalAmount(List<Order> orders) {
        return orders.stream().mapToInt(Order::amount).sum();
    }
    boolean hasPremium(List<Order> orders) {
        return orders.stream().anyMatch(Order::isPremium);
    }
}
```

컬렉션 처리 로직이 서비스에 흩어지고, 어디서든 `List<Order>`를 자유롭게 만들 수 있어 **규칙을 강제하지 못함**.

## 좋은 예 — 1급 컬렉션

```java
class Orders {
    private final List<Order> orders;

    public Orders(List<Order> orders) {
        validate(orders);                          // 생성 시 규칙 강제
        this.orders = List.copyOf(orders);         // 불변 복사
    }

    public int totalAmount() {
        return orders.stream().mapToInt(Order::amount).sum();
    }
    public boolean hasPremium() {
        return orders.stream().anyMatch(Order::isPremium);
    }
    public Orders filterPaid() {
        return new Orders(orders.stream().filter(Order::isPaid).toList());
    }

    private void validate(List<Order> orders) {
        if (orders.size() > 100) throw new IllegalArgumentException("최대 100건");
    }
}
```

## 이점

- **불변성 보장**: 생성자에서 `List.copyOf`, `Collections.unmodifiableList`로 래핑
- **도메인 규칙 캡슐화**: 컬렉션 조작 규칙이 한 곳에 모임
- **의미 있는 이름**: `Orders.filterPaid()` vs `orders.stream().filter(Order::isPaid).toList()` — 의도가 드러남
- **API 제어**: 컬렉션의 모든 메서드(`add`, `remove` 등)를 노출하지 않음

## 주의

- **모든 `List<T>`를 1급 컬렉션으로 감쌀 필요 없음** — 도메인 규칙이 있거나 재사용되는 처리가 있을 때만
- 너무 많이 만들면 **미들맨 패턴**으로 퇴보. 단순 전달만 하는 클래스는 가치 없음

## 면접 체크포인트

- **1급 컬렉션**이 주는 불변성, 캡슐화, 도메인 규칙 강제
