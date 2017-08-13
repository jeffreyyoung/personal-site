var postSummaries = require('./../.posts/summary.json');
console.log(postSummaries);
module.exports = function(config) {
	const configWithPosts = {};
	postSummaries.forEach(summary => {
		configWithPosts[summary.data.url] = { page: '/post', query: {postUrl: summary.data.url}}
	})
	console.log(configWithPosts)
	return Object.assign({}, configWithPosts, posts);
}