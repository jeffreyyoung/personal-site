export default ({post}) => (
	<div>
		<div className='PostContent-markdown-wrapper' dangerouslySetInnerHTML={{__html: post.html}}/>
		<style jsx global>{`
			.PostContent-markdown-wrapper img {
				display: block;
				margin: 0 auto;
				max-width: 100%;
			}
			
			h3 {
				font-size: 1.5rem;
				margin-top: 4rem;
			}
			
			.PostContent-markdown-wrapper p {
				font-size: 1.25rem;
				line-height: 1.5;
				font-weight: 200;
				font-family:georgia,times,serif;
			}
		`}</style>
	</div>
)