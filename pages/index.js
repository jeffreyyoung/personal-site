import React, { Component } from 'react'
import PostCard from './../components/PostCard';
import Layout from './../components/Layout';
import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';

import Container from 'semantic-ui-react/dist/commonjs/elements/Container'
import Grid from 'semantic-ui-react/dist/commonjs/collections/Grid'

export default enhancePage(withPosts(class LandingPage extends Component {
	constructor(props, context) {
		super(props, context)
	}
	
	
	render(){
		const props = this.props;
		const posts = this.props.posts;
		return (
			<Layout showHero={true} {...this.props}>
				
				<Container>
						<h3 style={{textAlign:'center'}}>Previous Projects</h3>
						<br />
						<Grid relaxed doubling className='masonry ui three column doubling stackable masonry'>
								{posts.map(post => <Grid.Column key={post.data.url}><PostCard post={post} /></Grid.Column>)}
						</Grid>
				</Container>
				<style jsx global>{`
					.masonry.grid {
					  display: block;
						min-height: 500px;
					}

					@media only screen and (min-width: 768px) {
					  .masonry.grid {
					    -webkit-column-count: 2;
					       -moz-column-count: 2;
					            column-count: 2;
					    -webkit-column-gap: 0;
					       -moz-column-gap: 0;
					            column-gap: 0;
					  }
					  
					  .ui.doubling.masonry.grid[class*="three column"] > .column {
					    width: 100% !important;
					  }
					}

					@media only screen and (min-width: 992px) {
					  .masonry.grid {
					    -webkit-column-count: 3;
					       -moz-column-count: 3;
					            column-count: 3;
					  }
					}
				`}</style>
			</Layout>
			)
}}));