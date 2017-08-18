import PostCard from './PostCard';
import Link from 'next/link'
import Image from 'semantic-ui-react/dist/commonjs/elements/Image'
import List from 'semantic-ui-react/dist/commonjs/elements/List'
import Segment from 'semantic-ui-react/dist/commonjs/elements/Segment'
import Card from 'semantic-ui-react/dist/commonjs/views/Card'
export default ({post, posts}) => {
	const currentPostIndex = posts.findIndex(p => p.data.url == post.data.url);
	let nextPostIndex = currentPostIndex + 1;
	if (nextPostIndex >= posts.length) {
		nextPostIndex = 0;
	}
	
	const nextPost = posts[nextPostIndex];
	return (<div>
		<br />
		<br />
		<br />
		<br />
		<h3><i>See another project...</i></h3>
		  <Link href={`/post?postUrl=${encodeURI(nextPost.data.url)}`} as={nextPost.data.url}><Card compact link>
		    <Image src={nextPost.data.image} />
		    <Card.Content>
		      <Card.Header>
		        {nextPost.data.title}
		      </Card.Header>
		      <Card.Meta>
		        <span className='date'>
							Aug 2018
		        </span>
		      </Card.Meta>
		      <Card.Description>
		        {nextPost.data.description}
		      </Card.Description>
		    </Card.Content>
		  </Card></Link>
	</div>)
}