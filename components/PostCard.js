import Link from 'next/link'

export default ({post}) => (
  <Link href={`/post?postUrl=${encodeURI(post.data.url)}`} as={post.data.url}><div>
    <img src={post.data.image} />
        {post.data.title}
        <span className='date'>
					Aug 2018
        </span>
        {post.data.description}
  </div></Link>
)