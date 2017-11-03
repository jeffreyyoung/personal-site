import withPosts from './../hocs/withPosts';
import enhancePage from './../hocs/enhancePage';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'
import Container from './../components/Container';
import NavBar from './../components/NavBar';
import PostCard from './../components/PostCard';
import ProjectCard from './../components/ProjectCard';
import Image from './../components/Image';
const me = require('./../static/images/me.jpg?placeholder=true&sizes[]=400')
export default enhancePage(withPosts(({posts, url}) => (
		<div>
			<NavBar url={url} />
				<main className='black-90'>
					<Image srcSet={me} />
				</main>
		</div>
)));