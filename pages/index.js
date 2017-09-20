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
export default enhancePage(withPosts(class LandingPage extends Component {
	constructor(props, context) {
		super(props, context)
	}
	
	
	render(){
		const props = this.props;
		const posts = this.props.posts;
		return (
			<Layout {...this.props} showHero={true}>
				<div className='pv5 black-80'>
					<Container className="justify-center flex flex-column">
							<h1 className="f-subheadline-l f2  f1-m fw6 mb3 black-80 tc">Freelance Developer</h1>
							<h2 className="black-80 mt0 f1-l f2-m fw5 tc">I build web and mobile apps.</h2>
							<div className='flex justify-center items-center'>
								<a className="f5-ns fw6 dib ba b--black-20 bg-green white ph4 pv3 br2 grow no-underline" href="#0">Email Me</a>
								<a className="f5-ns fw6 dib ba b--black-20 bg-green white ml3 ph4 pv3 br2 grow no-underline" href="#0">
								<svg xmlns="http://www.w3.org/2000/svg" className='h1 w1' viewBox="96 93 322 324"><path d="M257 93c-88.918 0-161 67.157-161 150 0 47.205 23.412 89.311 60 116.807V417l54.819-30.273C225.449 390.801 240.948 393 257 393c88.918 0 161-67.157 161-150S345.918 93 257 93zm16 202l-41-44-80 44 88-94 42 44 79-44-88 94z" fill="#ffffff"/></svg>  
								<span>  Message Me</span></a>
							</div>
					</Container>
				</div>
				<Container className='flex flex-wrap'>
					<div className='pr0 pr2-ns pb3 flex-auto flex w-50-ns'>
						<div className='bg-near-white pa4 br2 tc flex-auto'>
							<div className='h5 relative'>
								<img className='img-centered'src='static/images/macbook.png' />
							</div>
							<h2 className='f2 fw5 mb0 black-90'>Web</h2>
							<p className='f4 fw3 mt3 black-90'>I build modern, responsive web sites and web apps.</p>
						</div>
					</div>
					<div className='pr0 pl2-ns pb3 flex-auto flex w-50-ns'>
						<div className='bg-near-white pa4 br2 tc flex-auto'>
							<div className='h5 relative'>
								<img className='img-centered'src='static/images/iphone7.png' />
							</div>
							<h2 className='f2 fw5 mb0 black-90'>Mobile</h2>
							<p className='f4 fw3 mt3 black-90'>I build both Android and iOS apps. I develop with swift or react native for iOS or react native for Android.</p>
						</div>
					</div>
				</Container>
				<Container className=''>
					<h2 className='f2 fw5 mb0 tc black-80'>Recent Projects</h2>
				</Container>	
					<div className='flex flex-wrap mw-1024 center pa2'>
						{posts.filter((post,i) => i < 6).map(post => (<div className='w-third-ns w-50-m pa2 pb4	'><ProjectCard {...post.data}
							title={post.data.title}
							image={post.data.image}
							imageDescription={post.data.imageDescription}
							description={post.data.description}
						/></div>))}
					</div>
				<Container className='bg-white bg-white-ns'>
					<div className='flex-ns w-100 pt5-ns pb5-ns'>
						<div className='mw6 center flex-auto'>
							<img src='static/images/mac.png' alt='Macbook displaying website developed by Jeffrey' />
						</div>
						<div className='flex-auto'>
							<h1 className='f1 fw3 black mb0'>Web</h1>
							<h2 className='f3 fw3 black-90 mt0 mb2 lh-copy measure'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
						</div>
					</div>
				</Container>
				<Container pb={false}>
					<div className='flex-ns w-100 pt5-ns'>
						<div className='flex-auto'>
							<h1 className='f1 fw3 black mb0'>Mobile</h1>
							<h2 className='measure f3 fw3 black-90 mt0 mb2 lh-copy'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
						</div>
						<div className='mw6 center flex-auto'>
							<img src='static/images/iosHand.png' alt='Hand holding an iPhone showing an App developed by Jeffrey' />
						</div>
					</div>
				</Container>
				<style jsx global>{`
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
			</Layout>
			)
}}));