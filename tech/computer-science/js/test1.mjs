/**
 * Modifies the given array in place by filtering out non-numeric values.
 * This function does not return any value.
 * @param {Array} arr The array to be modified.
 */
function filterNumbersFromArray(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (typeof arr[i] !== 'number' || isNaN(arr[i])) {
            arr.splice(i, 1);
        }
    }
}

var arr = [1, 'a', 'b', 2];
filterNumbersFromArray(arr);
// At this point, arr should have been modified in place
// and contain only 1 and 2.
for (var i = 0; i < arr.length; i++)
    console.log(arr[i]);
