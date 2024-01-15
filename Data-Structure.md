# Data Structure

### Array vs ArrayList vs LinkedList
Array는 index로 빠르게 값을 찾는 것이 가능함

LinkedList는 데이터의 삽입 및 삭제가 빠르며 ArrayList는 데이터를 찾는데 빠르지만, 삽입 및 삭제가 느림

Array나 ArrayList에서 index를 갖고 있기 때문에 검색이 빠르지만, LinkedList는 처음부터 살펴봐야하므로 검색에 있어서는 시간이 더 걸린다는 단점이 존재한다.

### Array란?
선언할 때 크기와 데이터 타입을 지정해야하는 메모리 공간에 할당할 사이즈를 미리 정해놓고 사용하는 자료구조이다.

따라서 계속 데이터가 늘어날 때, 최대 사이즈를 알 수 없을 때는 사용하기에 부적합하다.

또한 중간에 데이터를 삽입하거나 삭제할 때도 매우 비효율적이다.

4번째 index 값에 새로운 값을 넣어야 한다면? 원래값을 뒤로 밀어내고 해당 index에 덮어씌워야 한다. 기본적으로 사이즈를 정해놓은 배열에서는 해결하기엔 부적합한 점이 많다.

대신, 배열을 사용하면 index가 존재하기 때문에 위치를 바로 알 수 있어 검색에 편한 장점이 있다.

### ArrayList란?
ArrayList는 Array처럼 크기를 정해주지 않아도 된다. 크기가 동적으로 변경되기 때문에, 중간에 데이터를 추가하거나 삭제하더라도 상관없다. index를 가지고 있으므로 검색도 빠르다.

하지만, 데이터를 추가 및 삭제할 때 자료구조를 Shift하는 연산이 추가되므로 시간이 오래걸리고 자원이 많이 소모된다는 단점이 존재한다.

### LinkedList란?
LinkedList에서도 단일, 다중 등 여러가지가 존재한다. 단일은 앞 노드에 연결될 뒷 노드의 포인터 위치를 가리키는 방식으로 되어있고 다중은 앞뒤 노드를 모두 가리키는 차이가 있다.

데이터의 중간에 삽입 및 삭제를 하더라도 전체를 돌지 않아도 이전 값과 다음값이 가르켰던 주소값만 수정하여 연결시켜주면 되기 때문에 빠르게 진행할 수 있다.

### Stack이란?
입력과 출력이 한 곳(방향)으로 제한하는 자료구조이며 LIFO(Last In First Out, 후입선출)의 구조를 가짐.

함수의 콜스택, 문자열 역순 출력, 연산자 후위표기법에서 사용한다.

Stack을 연결리스트로 구현한 예제
```java
public class Node {

    public int data;
    public Node next;

    public Node() {}

    public Node(int data) {
        this.data = data;
        this.next = null;
    }
}
```
```java
public class Stack {
    private Node head;
    private Node top;

    public Stack() {
        head = top = null;
    }

    private Node createNode(int data) {
        return new Node(data);
    }

    private boolean isEmpty() {
        return top == null ? true : false;
    }

    public void push(int data) {
        // 스택이 비어있다면
        if (isEmpty()) {
            head = createNode(data);
            top = head;
        // 스택이 비어있지 않다면 마지막 위치를 찾아 새 노드를 연결시킨다.
        } else {
            Node pointer = head;

            while (pointer.next != null) pointer = pointer.next;

            pointer.next = createNode(data);
            top = pointer.next;
        }
    }

    public int pop() {
        int popData;

        // 스택이 비어있지 않다면!! => 데이터가 있다면!!
        if (!isEmpty()) {
            // pop될 데이터를 미리 받아놓는다.
            popData = top.data;
            // 현재 위치를 확인할 임시 노드 포인터
            Node pointer = head;

            // 데이터가 하나라면
            if (head == top)
                head = top = null;
            // 데이터가 2개 이상이라면
            else {
                // top을 가리키는 노드를 찾는다.
                while (pointer.next != top)  pointer = pointer.next;

                // 마지막 노드의 연결을 끊는다.
                pointer.next = null;
                // top을 이동시킨다.
                top = pointer;
            }

            return popData;
        }

        // -1은 데이터가 없다는 의미로 지정해둠.
        return -1;
    }
}
```

### Quque란?
입력과 출력을 한 쪽 끝(front, rear)으로 제한하는 자료구조이며 FIFO (First In First Out, 선입선출)의 구조를 가짐.

버퍼, 마구 입력된 것을 처리하지 못하고 있는 상황, BFS에서 사용된다.

Quque의 가장 첫 원소를 front(deQueue 할 위치), 끝 원소를 rear(enQueue 할 위치)라고 부르고 Quque는 들어올 때 rear로 들어오지만, 나올 때는 front부터 빠지는 특성을 가짐.

가장 첫 원소와 끝 원소로만 접근 가능하며 데이터를 넣고 뺄 때 해당 값의 위치를 기억해야 함. (스택에서 스택 포인터와 같은 역할)

Quque를 연결리스트로 구현한 예제
```java
public class Node<T> {

    public T data;
    public Node<T> next;

    public Node() {}

    public Node(T data) {
        this.data = data;
        this.next = null;
    }
}
```
```java
public class Queue<T> {
    private Node<T> head;

    public Stack() {
        head = null;
    }

    private Node createNode(T data) {
        return new Node(data);
    }

    private boolean isEmpty() {
        return head == null ? true : false;
    }

    public void enQueue(T data) {
        if (isEmpty()) {
            head = createNode(data);
        } else {
            Node pointer = head;

            while (pointer.next != null) pointer = pointer.next;

            pointer.next = createNode(data);
        }
    }

    public T deQueue(T data) {
        T queueData = null;

        if (!isEmpty()) {
            Node pointer = head;

            queueData = pointer.data;

            head = pointer.next;
        }

        return queueData;
    }
}
```

### Heap이란?
우선순위 Queue를 위해서 만들어진 자료구조이다.

우선순위 큐 : 우선순위의 개념을 큐에 도입한 자료구조

시뮬레이션 시스템, 작업 스케줄링, 수치해석 계산에서 사용

우선순위 큐는 힙으로 구현하는 것이 가장 효율적

삽입 : O(logn) , 삭제 : O(logn)

Heap은 완전 이진 트리의 일종이며 반 정렬 상태이다.

Heap은 데이터의 중복이 가능하다. (이진 탐색 트리는 중복 허용X)

최대 힙(max heap): 부모 노드의 키 값이 자식 노드의 키 값보다 크거나 같은 완전 이진 트리
최소 힙(min heap): 부모 노드의 키 값이 자식 노드의 키 값보다 작거나 같은 완전 이진 트리

### Tree란?
값을 가진 노드(Node)와 이 노드들을 연결해주는 간선(Edge)으로 이루진 자료구조

최상단에 위치한 노드가 루트(Root) 노드다.

모든 노드들은 0개 이상의 자식(Child) 노드를 갖고 있으며 보통 부모-자식 관계로 부른다.

가족 관계도를 그릴 때 트리 형식으로 나타내는 경우도 많이 봤을 것이다. 자료구조의 트리도 이 방식을 그대로 구현한 것이다.

트리의 특징
1. 트리에는 사이클이 존재할 수 없다. (만약 사이클이 만들어진다면, 그것은 트리가 아니고 그래프다)
2. 모든 노드는 자료형으로 표현이 가능하다.
3. 루트에서 한 노드로 가는 경로는 유일한 경로 뿐이다.
4. 노드의 개수가 N개면, 간선은 N-1개를 가진다.

가장 중요한 것은, 그래프와 트리의 차이가 무엇인가인데, 이는 사이클의 유무로 설명할 수 있다.

사이클이 존재하지 않는 그래프라 하여 무조건 트리인 것은 아니다 사이클이 존재하지 않는 그래프는 Forest라 지칭하며 트리의 경우 싸이클이 존재하지 않고 모든 노드가 간선으로 이어져 있어야 한다.

트리순회방식에는 4가지가 있다.
```
1. 전위 순회(pre-order)
각 부모 노드를 순차적으로 먼저 방문하는 방식이다.
(부모 → 왼쪽 자식 → 오른쪽 자식)

2. 중위 순회(in-order)
왼쪽 하위 트리를 방문 후 부모 노드를 방문하는 방식이다.
(왼쪽 자식 → 부모 → 오른쪽 자식)

3. 후위 순회(post-order)
왼쪽 하위 트리부터 하위를 모두 방문 후 부모 노드를 방문하는 방식이다.
(왼쪽 자식 → 오른쪽 자식 → 부모)

4. 레벨 순회(level-order)
부모 노드부터 계층 별로 방문하는 방식이다.
```

Tree의 코드 예제
```java
public class Tree<T> {
    private Node<T> root;

    public Tree(T rootData) {
        root = new Node<T>();
        root.data = rootData;
        root.children = new ArrayList<Node<T>>();
    }

    public static class Node<T> {
        private T data;
        private Node<T> parent;
        private List<Node<T>> children;
    }
}
```