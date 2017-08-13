import withPost from './../hocs/withPost';
import enhancePage from './../hocs/enhancePage';
export default enhancePage(withPost(({post}) => (
	<main>
		<article>
			<h1>{post.data.title}</h1>
			<div dangerouslySetInnerHTML={{__html: post.html}}/>
			{/*<Content {...post} />*/}
		</article>
	</main>
)));