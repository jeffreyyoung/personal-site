export default ({post}) => (
	<div>
		<div className='PostContent-markdown-wrapper' dangerouslySetInnerHTML={{__html: post.html}}/>
		<style jsx global>{`
			.PostContent-markdown-wrapper img {
				display: block;
				margin: 0 auto;
				max-width: 100%;
			}
		`}</style>
	</div>
)