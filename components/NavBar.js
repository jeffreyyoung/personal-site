
import Link from 'next/link'

export default ({url}) => (
	<header>
		<nav className="bg-white-90 fixed w-100 pa3 pa4-ns">
			<Link href='/' ><a className="link dim black f6 dib mr3 fw3" title="Projects">Projects</a></Link>
			<Link href='/resume' ><a className="link dim gray f6 dib mr3 fw3" title="Resume">Resume</a></Link>
			<Link href='/about' ><a className="link dim gray f6 dib mr3 fw3" title="About Me">About Me</a></Link>
		</nav>
		<style jsx>{`
			nav {
				z-index: 1;
				box-shadow: 0px 2px 40px 0px rgba(0,0,0,0.08);
			}
		`}</style>
	</header>
)