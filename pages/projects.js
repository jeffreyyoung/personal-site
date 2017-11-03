import withPosts from './../hocs/withPosts';
import enhancePage from './../hocs/enhancePage';
import PostContent from './../components/PostContent';
import NextPost from './../components/NextPost';
import Link from 'next/link'
import Container from './../components/Container';
import NavBar from './../components/NavBar';
import PostCard from './../components/PostCard';
import ProjectCard from './../components/ProjectCard';
export default enhancePage(withPosts(({posts, url}) => (
		<div>
			<NavBar url={url} />
				<main className='black-90'>
				<br />
				<br />
				<h1 className='mw-1024 center f1 fw5 black mb0'>Previous Projects</h1>
				<h2 className='mw-1024 center f3 fw3 black-90 mt0 mb2 lh-copy measure'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
				<br />
				<div className='flex flex-wrap mw-1024 center pa2'>
					{posts.map(post => (<div className='w-50-ns w-50-m pa3 pb4 reveal'><ProjectCard {...post.data}
						title={post.data.title}
						image={'/'+post.data.image}
						imageDescription={post.data.imageDescription}
						description={post.data.description}
					/></div>))}
				</div>
				</main>
		</div>
)));