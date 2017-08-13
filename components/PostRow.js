{
	posts.map((post,index) => {
		return (
		<Grid.Row key={`post-${index}`}>
			<Grid.Column width={6}>
				<Image centered src={post.data.image} alt={post.data.imageDescription}/>
			</Grid.Column>
			<Grid.Column width={10}>
				<Header>{post.data.title}</Header>
				<Content data={post.data} content={post.content} excerpt/>
				<a href={post.data.url}>Read more</a>
			</Grid.Column>
			{index !== (posts.length -1) && false ? <Grid.Column width={16}>
				<Divider />
			</Grid.Column> : null}
		</Grid.Row>
		
	)})
}