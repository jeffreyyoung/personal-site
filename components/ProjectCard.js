import Link from 'next/link'
import Truncate from 'react-truncate'

export default ({title, tags, description, image, imageDescription, url}) => (
	<Link href={`/post?postUrl=${encodeURI(url)}`} as={url}>
		<a className='no-underline'>
		<div className='pointer grow bg-white' >
			<div className='bg-near-white br2 w-100 img-wrapper'>
				<img src={image} className='br2 br--top w-100 img-wrapper' alt={imageDescription}/>
			</div>
			<div className='pt3 text-wrapper'>
				<h2 className='fw5 ma0 black-80'>{title}</h2>
				<p className='fw3 black-80 mt0 f6 gray mb3 flex-auto'>{tags.join(', ')}</p>
				<p className='fw3 black-80 gray flex-auto'>{description}</p>
			</div>
			<style jsx>{`
				.img-wrapper {
					height: 15rem;
				}
				.text-wrapper {
					height: 10rem;
					overflow: hidden;
				}
				img {
					object-fit: cover;
				}
			`}</style>
		</div>
		</a>
	</Link>
)