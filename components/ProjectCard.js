import Link from 'next/link'
import Truncate from 'react-truncate'

export default ({title, description, image, imageDescription, url}) => (
	<Link href={`/post?postUrl=${encodeURI(url)}`} as={url}>
		<div className='grow pointer'>
			<div className='bg-near-white br2 w-100 img-wrapper'>
				<img src={image} className='br2' alt={imageDescription}/>
			</div>
			<h2 className='fw5 mv3 black-80'>{title}</h2>
			<Truncate className='fw3 mt0 black-80 gray' lines={3}><p>{description}</p></Truncate>
			<style jsx>{`
				.img-wrapper {
					height: 10rem;
				}
			`}</style>
		</div>
	</Link>
)