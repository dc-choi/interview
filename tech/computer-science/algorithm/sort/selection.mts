const selection = (arr: number[]) => {
    for (let i = 0; i < arr.length - 1; i++) {
        let index = i;

        for (let j = i + 1; j < arr.length; j++) {
            if (arr[index] > arr[j]) {
                index = j;
            }
        }

        if (index !== i) {
            const temp = arr[i];
            arr[i] = arr[index];
            arr[index] = temp;
        }
    }
};

const arr = [5, 3, 8, 4, 2];
console.log(arr);
selection(arr);
console.log(arr);