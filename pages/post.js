import withPost from './../hocs/withPost';
import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import PostContent from './../components/PostContent';
import Container from 'semantic-ui-react/dist/commonjs/elements/Container'
import Segment from 'semantic-ui-react/dist/commonjs/elements/Segment'
import Grid from 'semantic-ui-react/dist/commonjs/collections/Grid'
import Menu from 'semantic-ui-react/dist/commonjs/collections/Menu'
import Breadcrumb from 'semantic-ui-react/dist/commonjs/collections/Breadcrumb'
import Icon from 'semantic-ui-react/dist/commonjs/elements/Icon'
import Link from 'next/link'
export default enhancePage(withPost(({post, url}) => (
	<Layout url={url}>
		<Container>
		<main>
			<article>
				<Grid>
					<Grid.Row>
						<Grid.Column mobile={16} tablet={14} computer={12}>
						<Breadcrumb>
							<Link href='/'><Breadcrumb.Section link>Projects</Breadcrumb.Section></Link>
							<Breadcrumb.Divider />
							<Breadcrumb.Section active>{post.data.title}</Breadcrumb.Section>
						</Breadcrumb>
							<h1>{post.data.title}</h1>
							<PostContent post={post} />
						</Grid.Column>
					</Grid.Row>
				</Grid>
			</article>
		</main>
		</Container>
	</Layout>
)));