import enhancePage from './../hocs/enhancePage';
import Layout from './../components/Layout';
import withPost from './../hocs/withPost';
import Container from 'semantic-ui-react/dist/commonjs/elements/Container'
export default enhancePage(withPost((props) => {
	return (
		<Layout {...props}>
			<Container>
				<h1>Resume</h1>
				<div dangerouslySetInnerHTML={{__html:props.post.html}} />
			</Container>
		</Layout>
	)
}));