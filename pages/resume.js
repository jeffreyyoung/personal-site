import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import withPost from './../hocs/withPost';
import Container from 'semantic-ui-react/dist/commonjs/elements/Container'
import PostContent from './../components/PostContent';
export default enhancePage(withPost(({post,url}) => {
	return (
		<Layout url={url}>
			<Container>
				<div dangerouslySetInnerHTML={{__html:post.html}} />
			</Container>
		</Layout>
	)
}));