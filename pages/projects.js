import React, { Component } from 'react'
import PostCard from './../components/PostCard';
import Layout from './../components/Layout';
import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';
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
				<Container className='bg-near-white'>
						<br />
						<br />
						<h1 className='f1 fw3 black mb0'>Previous Projects</h1>
						<h2 className='f3 fw3 black-90 mt0 mb2 lh-copy measure'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
						<br />
						<ul className='pa0 flex-wrap flex'>
								{posts.map(post => <li key={post.data.url} className='list mb5 mr5'><PostCard post={post} /></li>)}
						</ul>
				</Container>
			</Layout>
			)
}}));