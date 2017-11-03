import withPost from './../hocs/withPost';
import withPosts from './../hocs/withPosts';
import enhancePage from './../hocs/enhancePage';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'
import Container from './../components/Container';
import NavBar from './../components/NavBar';
export default enhancePage(withPosts(withPost(({post,posts, url}) => (
		<div>
			<NavBar url={url} />
			<Container className='asdfsadf'>
				<main className='black-90'>
					<article className='measure-wide center'>
									<h1 className='f1 fw5'>{post.data.title}</h1>
									<PostContent post={post} />
									<NextPost post={post} posts={posts} />
					</article>
				</main>
			</Container>
		</div>
))));