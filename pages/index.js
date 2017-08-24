import React, { Component } from 'react'
import PostCard from './../components/PostCard';
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
				<Container className="pv6 pv6-ns justify-center flex flex-column bg-white">
					<div>
						<h1 className="f1 fw3 black mb0">Hi. I'm Jeffrey.</h1>
						<h2 className="measure f3 fw3 black-90 mt0 mb2 lh-copy">I do freelance web and mobile development. During the day I'm a Software Engineer at Adobe.</h2>
						<a className="center f5-ns fw6 dib ba b--black-20 bg-orange white ph4 pv3 br2 dim no-underline" href="#0">Message Me</a>
					</div>
				</Container>
				<Container className='bg-near-white bg-white-ns'>
					<div className='flex-ns w-100'>
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
					<div className='flex-ns w-100'>
						<div className='flex-auto'>
							<h1 className='f1 fw3 black mb0'>Mobile</h1>
							<h2 className='measure f3 fw3 black-90 mt0 mb2 lh-copy'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
						</div>
						<div className='mw6 center flex-auto'>
							<img src='static/images/iosHand.png' alt='Hand holding an iPhone showing an App developed by Jeffrey' />
						</div>
					</div>
				</Container>
				<style jsx>{`
					.flex-1
				
				`}</style>
			</Layout>
			)
}}));