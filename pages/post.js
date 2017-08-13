import withPost from './../hocs/withPost';
import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
export default enhancePage(withPost(({post, url}) => (
	<Layout url={url}>
		<main>
			<article>
				<h1>{post.data.title}</h1>
				<div dangerouslySetInnerHTML={{__html: post.html}}/>
				{/*<Content {...post} />*/}
			</article>
		</main>
	</Layout>
)));