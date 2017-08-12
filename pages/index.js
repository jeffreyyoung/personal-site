import withPosts from 'nextein/posts'
import Link from 'next/link'
import enhancePage from './../hocs/enhancePage';
export default enhancePage(withPosts(({posts}) => (
	<div>
		<h1>rawrrrr</h1>
		{
			posts.map((post,index) => (
				<div key={`post-${index}`}>
					<h1><a href={post.data.url}>{post.data.title} {post.data.image}</a></h1>
					<img src={post.data.image} alt={post.data.imageDescription}/>
				</div>
				
			))
		}
	</div>
)));