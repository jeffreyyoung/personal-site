import withPost from './../hocs/withPost';
import withPosts from './../hocs/withPosts';
import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'

export default enhancePage(withPosts(withPost(({post,posts, url}) => (
	<Layout url={url}>
		<section>
		<main>
			<article>
							<Link href='/'><a>Projects</a></Link>
							<PostContent post={post} />
							<NextPost post={post} posts={posts} />
			</article>
		</main>
		</section>
	</Layout>
))));