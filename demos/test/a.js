const incrementClosure = (() => {
	let count = 0;

	return () => {
		return ++count;
	};
})();

function increment() {
	return incrementClosure();
}

console.log(increment());
console.log(increment());
