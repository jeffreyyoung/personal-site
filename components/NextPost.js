import PostCard from './PostCard';
import Link from 'next/link'
export default ({post, posts}) => {
	const currentPostIndex = posts.findIndex(p => p.data.url == post.data.url);
	let nextPostIndex = currentPostIndex + 1;
	if (nextPostIndex >= posts.length) {
		nextPostIndex = 0;
	}
	
	const nextPost = posts[nextPostIndex];
	return (<div>
		<br />
		<br />
		<br />
		<br />
		<h3><i>See another project...</i></h3>
		  <Link href={`/post?postUrl=${encodeURI(nextPost.data.url)}`} as={nextPost.data.url}><a>{nextPost.data.title}</a></Link>
	</div>)
}