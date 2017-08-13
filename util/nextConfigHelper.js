var postSummaries = require('./../.posts/summary.json');
module.exports = function(config) {
	const configWithPosts = {};
	postSummaries.forEach(summary => {
		configWithPosts[summary.data.url] = { page: '/post', query: {postUrl: summary.data.url}}
	})
	return Object.assign({}, configWithPosts, config);
}