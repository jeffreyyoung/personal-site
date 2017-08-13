import React, { Component } from 'react'
import Head from 'next/head'
import posts from './../.posts/posts.json'
export default (Wrapped) => {
  return class extends Component {
		static async getInitialProps(...args) {
			const wrappedInitial = Wrapped.getInitialProps
			const wrapped = wrappedInitial ? await wrappedInitial(...args) : {}

			return wrapped;
		}
		
		render() {
			return (<Wrapped {...this.props} post={posts[this.props.url.query.postUrl]}/>)
		}
	}
}