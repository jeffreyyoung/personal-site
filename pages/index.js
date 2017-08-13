import withPosts from './../hocs/withPosts';
import Link from 'next/link'
import Router from 'next/router'
import enhancePage from './../hocs/enhancePage';
import Hero from './../components/Hero';
import { Container, Grid, Image, Header, Menu, Divider } from 'semantic-ui-react'
import { Card } from 'semantic-ui-react'
import classNames from 'classnames'
import PostCard from './../components/PostCard';
export default enhancePage(withPosts((props) => {
	const { posts } = props;
	return (
	<div>
		<Hero />
		<Container>
				<br />
				<br />
				<Grid column={3} relaxed doubling className='masonry ui three column doubling stackable masonry'>
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
	</div>
	)
}));