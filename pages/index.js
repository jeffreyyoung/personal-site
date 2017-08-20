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
				<Hero />
				<Container className='bg-near-white'>
						<h1 className='f3 tc tl-ns f2-m f1-l fw3 black-90 mv3'>Previous Projects</h1>
						<h2 className='center tc tl-ns f5 black-50 f4-m f3-l fw3 balck-50 mt0'>A collection of freelance projects, personal projects for fun, and work projects.</h2>
						<br />
						<ul className='pa0 flex-wrap flex'>
								{posts.map(post => <li key={post.data.url} className='list mb5 mr5'><PostCard post={post} /></li>)}
						</ul>
				</Container>
			</Layout>
			)
}}));