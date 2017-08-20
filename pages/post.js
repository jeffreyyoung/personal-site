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
		<Container>
			<main className='pt5'>
				<article className='measure center'>
								<Link href='/'><a>Projects</a></Link>
								<PostContent post={post} />
								<NextPost post={post} posts={posts} />
				</article>
			</main>
		</Container>
	</Layout>
))));