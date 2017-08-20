import Link from 'next/link'
//<Link href={`/post?postUrl=${encodeURI(post.data.url)}`} as={post.data.url}>
export default ({post}) => (
  <Link href={`/post?postUrl=${encodeURI(post.data.url)}`} as={post.data.url}>
			<article className="shadow-raise pointer make-it-fast box-shadow raise no-underline bg-white dark-gray center">
				<div className='img-wrapper cover db' style={{backgroundImage: `url(${post.data.image})`}}/>
				<div className="pa3">
					<div className="dt w-100">
						<div className="dtc">
							<h1 className="f4 black-90 fw4 mv0 no-underline">{post.data.title}</h1>
						</div>
						<div className="dtc tr">
							<h2 className="f6 fw3 black-50 mv0 ttu no-underline"></h2>
						</div>
					</div>
					<p className="f6 fw3 black-50 no-underline lh-copy measure mt1">
						{post.data.description}
					</p>
				</div>
				<style jsx>{`				
					.shadow-raise {
					  position: relative;
					  box-shadow: 0 20px 20px rgba(0,0,0,.08);
					  transition: all 250ms cubic-bezier(.02, .01, .47, 1)
					}

					/* Create the hidden pseudo-element */
					/* include the shadow for the end state */
					.shadow-raise::before {
					  content: '';
					  position: absolute;
					  z-index: -1;
					  width: 100%;
					  height: 100%;
					  opacity: 0;
					  border-radius: 5px;
					  box-shadow: 0 40px 40px rgba(0,0,0,.16);
						transition: opacity 250ms cubic-bezier(.02, .01, .47, 1)
					}
					
					/* Scale up the box */
					.shadow-raise:hover {
					  transform: translate(0,-20px);
					}

					/* Fade in the pseudo-element with the bigger shadow */
					.shadow-raise:hover::before {
					  opacity: 1;
					}
				`}</style>
			</article>
	</Link>
)