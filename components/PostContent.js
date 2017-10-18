export default ({post}) => (
	<div>
		<div className='PostContent-markdown-wrapper black-90' dangerouslySetInnerHTML={{__html: post.html}}/>
		<style jsx global>{`
			.PostContent-markdown-wrapper img {
				display: block;
				margin: 0 auto;
				max-width: 100%;
			}

			.PostContent-markdown-wrapper p {
				font-size: 1.25rem;
				line-height: 1.5;
				font-weight: 300;
				
			}
		`}</style>
	</div>
)