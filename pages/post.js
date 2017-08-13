import withPost from './../hocs/withPost';
import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import Container from 'semantic-ui-react/dist/commonjs/elements/Container'
export default enhancePage(withPost(({post, url}) => (
	<Layout url={url}>
		<Container>
		<main>
			<article>
				<h1>{post.data.title}</h1>
				<div dangerouslySetInnerHTML={{__html: post.html}}/>
				{/*<Content {...post} />*/}
			</article>
		</main>
		</Container>
	</Layout>
)));