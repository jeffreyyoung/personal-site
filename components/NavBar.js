
import Link from 'next/link'
import React, { Component } from 'react';
import classnames from 'classnames';
import Container from './Container';
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
				<nav className={"pt4 bg-white-70 tc w-100 border-box bb b--black-10"}>
					<div className='mw-1024 center mw-1024 w-100 flex flex-row justify-between center pr3 pl3'>
						<div>
							<Link href='/' ><a className={classnames("link dim f5 dib fw3 black bw2 pb4 fw5")} title="Home">Jeffrey Young</a></Link>
						</div>
						<div>
							<Link href='/' ><a className={classnames("link dim f5 dib fw3 black bw2 pb4 fw5", {'bb b--green': props.url.pathname === '/'})} title="Home">Home</a></Link>
							<Link href='/projects' ><a className={classnames("link dim f5 dib fw3 black ml3 ml4-ns bw2 pb4 fw5", {'bb b--green': props.url.pathname === '/projects'})} title="Projects">Projects</a></Link>
							<Link href='/resume' ><a className={classnames("link dim f5 dib fw3 black ml3 ml4-ns bw2 pb4 fw5", {'bb b--green': props.url.pathname === '/resume'})} title="Resume">Resume</a></Link>
							<Link href='/about' ><a className={classnames("link dim f5 dib fw3 black ml3 ml4-ns bw2 pb4 fw5", {'bb b--green': props.url.pathname === '/about'})} title="About Me">About Me</a></Link>
						</div>
						<style jsx>{`
							nav {
								z-index: 1;
								//box-shadow: 0px 2px 40px 0px rgba(0,0,0,0.04);
								transition: background-color 1s;
							}
						`}</style>
					</div>
				</nav>
		)
	}
	
}