import React, { Component } from 'react'
import PostCard from './../components/PostCard';
import Layout from './../components/Layout';
import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';
import Hero from './../components/Hero';
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
				<div>
						<h3 style={{textAlign:'center'}}>Previous Projects</h3>
						<br />
						<div>
								{posts.map(post => <div key={post.data.url}><PostCard post={post} /></div>)}
						</div>
				</div>
			</Layout>
			)
}}));