import { Card, Icon, Image } from 'semantic-ui-react'
import Link from 'next/link'

export default ({post}) => (
  <Link href={`/post?postUrl=${encodeURI(post.data.url)}`} as={post.data.url}><Card fluid link>
    <Image src={post.data.image} />
    <Card.Content>
      <Card.Header>
        {post.data.title}
      </Card.Header>
      <Card.Meta>
        <span className='date'>
					Aug 2018
        </span>
      </Card.Meta>
      <Card.Description>
        {post.data.description}
      </Card.Description>
    </Card.Content>
  </Card></Link>
)