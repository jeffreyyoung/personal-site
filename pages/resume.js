import withPost from './../hocs/withPost';
import enhancePage from './../hocs/enhancePage';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'
import Container from './../components/Container';
import NavBar from './../components/NavBar';
import PostCard from './../components/PostCard';
import ProjectCard from './../components/ProjectCard';
export default enhancePage(withPost(({post, url}) => (
		<div>
			<NavBar url={url} />
				<main className='black-90'>
				<br />
				<br />
				<br />
				<div className='mw-1024 center pa2'>
					<div dangerouslySetInnerHTML={{__html:post.html}} />
				</div>
				</main>
		</div>
)));