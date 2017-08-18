import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import withPost from './../hocs/withPost';
import PostContent from './../components/PostContent';
export default enhancePage(withPost(({post,url}) => {
	return (
		<Layout url={url}>
			<section>
				<div dangerouslySetInnerHTML={{__html:post.html}} />
			</section>
		</Layout>
	)
}));