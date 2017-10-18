let sr;
if (typeof window !== 'undefined'){
	sr = require('scrollreveal').default;
	console.log('have scroll reveal', sr)
} else {
	sr = function(){};
}
export default sr();