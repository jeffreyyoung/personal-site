import withPost, { Content } from 'nextein/post'
import enhancePage from './../hocs/enhancePage';
export default enhancePage(withPost(({post}) => (
	<main>
		<article>
			<h1>{post.data.title}</h1>
			<Content {...post} />
		</article>
	</main>
)));