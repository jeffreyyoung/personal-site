
import Link from 'next/link'
import React, { Component } from 'react';

export default class NavBar extends Component {
	constructor(props, context) {
		super(props,context);
		//TODO look at url
		this.state = {
			isInHero: props.url.pathname === '/'
		}
	}
	
	componentDidMount() {
		if (window) {
			window.addEventListener('scroll', this.handleScroll.bind(this));
		}
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.handleScroll.bind(this));
	}
	
	handleScroll(e) {
		if (window.scrollY > 300 && this.props.url.pathname === '/') {
			this.setState({isInHero:false});
		} else if (window.scrollY < 300 && this.props.url.pathname === '/') {
			this.setState({isInHero:true})
		}
	}
	
	render() {
		const props = this.props;
		const url = props.url;
		
		//const bg = !this.state.isInHero ? 'bg-white-90' : 'bg-white-10';
		//const color = !this.state.isInHero ? 'black' : 'white';
		//const activeColor = !this.state.isInHero ? 'black' : 'white';
		
		const bg = 'bg-white-90';
		const color = 'black';
		const activeColor = 'black';
		
		return (
				<nav className={"fixed flex flex-row justify-end tr pa4 w-100 border-box " + bg}>
					<Link href='/' ><a className={"link dim f5 dib ml3 fw3 " + activeColor} title="Home">Home</a></Link>
					<Link href='/projects' ><a className={"link dim f5 dib ml3 fw3 " + activeColor} title="Projects">Projects</a></Link>
					<Link href='/resume' ><a className={"link dim f5 dib ml3 fw3 " + color} title="Resume">Resume</a></Link>
					<Link href='/about' ><a className={"link dim f5 dib ml3 fw3 " + color} title="About Me">About Me</a></Link>
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