import React, { Component } from 'react'
import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';
import Hero from './../components/Hero';
import { Container, Grid, Image, Header, Menu, Divider, Visibility } from 'semantic-ui-react'
import { Card } from 'semantic-ui-react'
import classNames from 'classnames'
import PostCard from './../components/PostCard';
import Layout from './../components/Layout';
export default enhancePage(withPosts(class LandingPage extends Component {
	constructor(props, context) {
		super(props, context)
	}
	
	
	render(){
		const props = this.props;
		const { posts } = props;
		return (
			<Layout showHero={true} {...this.props}>
				<Container>
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