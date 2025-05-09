const swap = (arr: number[], leftIndex: number, rightIndex: number) => {
    let temp = arr[leftIndex];
    arr[leftIndex] = arr[rightIndex];
    arr[rightIndex] = temp;
};

const divide = (arr: number[], left: number, right: number) => {
    let pivot = arr[left];
    let leftIndex = left + 1;
    let rightIndex = right;

    while (leftIndex <= rightIndex) {
        while (leftIndex <= right && pivot >= arr[leftIndex]) leftIndex++;
        while (rightIndex >= (left + 1) && pivot <= arr[rightIndex]) rightIndex--;

        if (leftIndex <= rightIndex) swap(arr, leftIndex, rightIndex);
    }

    swap(arr, left, rightIndex);

    return rightIndex;
};

const quickSort = (arr: number[], left: number, right: number) => {
    if (left < right) {
        let pivot = divide(arr, left, right);
        quickSort(arr, left, pivot - 1);
        quickSort(arr, pivot + 1, right);
    }
};

const arr = [7, 2, 1, 6, 8, 5, 3, 4];
console.log(JSON.stringify(arr));
quickSort(arr, 0, arr.length - 1);
console.log(JSON.stringify(arr));