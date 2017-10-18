import withPost from './../hocs/withPost';
import withPosts from './../hocs/withPosts';
import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'
import Container from './../components/Container';
export default enhancePage(withPosts(withPost(({post,posts, url}) => (
	<Layout url={url}>
		<Container className=''>
			<main className='black-90'>
				<article className='measure-wide center'>
								<h1 className='f1 fw5 mb2'>{post.data.title}</h1>
								<h6 className='f3 fw3 mt0 gray'>{post.data.tags.join(', ')}</h6>
								<PostContent post={post} />
								<NextPost post={post} posts={posts} />
				</article>
			</main>
		</Container>
	</Layout>
))));