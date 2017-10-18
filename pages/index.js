import React, { Component } from 'react'
import PostCard from './../components/PostCard';
import ProjectCard from './../components/ProjectCard';
import Layout from './../components/Layout';
import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';
import Hero from './../components/Hero';
import Container from './../components/Container'
import sr from './../util/scrollReveal';

export default enhancePage(withPosts(class LandingPage extends Component {
	constructor(props, context) {
		super(props, context)
	}
	
	componentDidMount() {
		if (typeof window !== 'undefined') {
			sr.reveal('.reveal', 50);
		}
	}
	render(){
		const props = this.props;
		const posts = this.props.posts;
		return (
			<div className=''>
				<section className='bg-light-green'>
					<div className='center min-vh-100 pa3 flex flex-column justify-between mw-1024'>
						<div></div>
						<div className='flex-grow'>
							<h1 className='reveal f1 f-subheadline-ns'>Hi.👋 I'm Jeffrey</h1>
							<h3 className='reveal f3 f1-ns'>I work at Adobe as a Software Engineer</h3>
							<h3 className='reveal f3 f1-ns'>I like doing freelance web and mobile development</h3>
						</div>
						<div className='w-100'>
							<h4 onClick={() => this.projectSection.scrollIntoView({behaviour: 'smooth'})} className='reveal grow f4 tc pointer'>View Projects 👇</h4>
						</div>
					</div>
				</section>
				<section ref={r => this.projectSection = r}>
					<h3 className='reveal f4 tc'>Projects</h3>
					<div className='flex flex-wrap mw-1024 center pa2'>
						{posts.filter((post,i) => i < 4).map(post => (<div className='w-50-ns w-50-m pa3 pb4 reveal'><ProjectCard {...post.data}
							title={post.data.title}
							image={post.data.image}
							imageDescription={post.data.imageDescription}
							description={post.data.description}
						/></div>))}
					</div>
				</section>
				<style jsx global>{`
					.mw-1024 {
						max-width: 1024px;
					}
					img {
						max-height: 100%;
					}
					.img-centered {
						position: absolute;
						margin: auto;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
					}
					.flex-basis {
						flex-basis: 0 !important;
					}
				`}</style>
			</div>
			)
}}));