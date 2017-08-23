
import Link from 'next/link'
import React, { Component } from 'react';
import classnames from 'classnames';
export default class NavBar extends Component {
	constructor(props, context) {
		super(props,context);
		//TODO look at url
		this.state = {
			isInHero: props.url.pathname === '/'
		}
	}
	
	// componentDidMount() {
	// 	if (window) {
	// 		window.addEventListener('scroll', this.handleScroll.bind(this));
	// 	}
	// }
	// 
	// componentWillUnmount() {
	// 	window.removeEventListener('scroll', this.handleScroll.bind(this));
	// }
	// 
	// handleScroll(e) {
	// 	if (window.scrollY > 300 && this.props.url.pathname === '/') {
	// 		this.setState({isInHero:false});
	// 	} else if (window.scrollY < 300 && this.props.url.pathname === '/') {
	// 		this.setState({isInHero:true})
	// 	}
	// }
	
	render() {
		const props = this.props;
		const url = props.url;
		
		const bg = 'bg-white-90';
		const color = 'black';
		const activeColor = 'black';
		console.log(props.url);
		return (
				<nav className={"fixed bg-white-90 flex flex-row justify-end tc pt4 pl3 pr3 w-100 border-box"}>
					<Link href='/' ><a className={classnames("link dim f5 dib fw3 black pl2 pr2 bw2 pb3", {'bb b--orange': props.url.pathname === '/'})} title="Home">Home</a></Link>
					<Link href='/projects' ><a className={classnames("link dim f5 dib fw3 black pl2 pr2 bw2 pb3", {'bb b--orange': props.url.pathname === '/projects'})} title="Projects">Projects</a></Link>
					<Link href='/resume' ><a className={classnames("link dim f5 dib fw3 black pl2 pr2 bw2 pb3", {'bb b--orange': props.url.pathname === '/resume'})} title="Resume">Resume</a></Link>
					<Link href='/about' ><a className={classnames("link dim f5 dib fw3 black pl2 pr2 bw2 pb3", {'bb b--orange': props.url.pathname === '/about'})} title="About Me">About Me</a></Link>
					<style jsx>{`
						nav {
							z-index: 1;
							//box-shadow: 0px 2px 40px 0px rgba(0,0,0,0.04);
							transition: background-color 1s;
						}
					`}</style>
				</nav>
		)
	}
	
}