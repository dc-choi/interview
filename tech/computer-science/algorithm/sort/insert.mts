const insert = (arr: number[]) => {
    for (let i = 1; i < arr.length; i++) {
        let current = arr[i];
        let j;

        for (j = i -1; j >= 0; j--) {
            if (arr[j] > current) {
                arr[j + 1] = arr[j];
            } else {
                break;
            }
        }
        arr[j + 1] = current;
    }
};

const arr = [5, 3, 8, 4, 2];
console.log(arr);
insert(arr);
console.log(arr);
