import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import withPost from './../hocs/withPost';
import PostContent from './../components/PostContent';
import Container from './../components/Container';
export default enhancePage(withPost(({post,url}) => {
	return (
		<Layout url={url}>
			<Container>
				<section className='pt5'>
					<div dangerouslySetInnerHTML={{__html:post.html}} />
				</section>
			</Container>
		</Layout>
	)
}));