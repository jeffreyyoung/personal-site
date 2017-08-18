import React, { Component } from 'react'
import Head from 'next/head'
import posts from './../.posts/summary.json'

const sortedPosts = posts.filter(p => p.data.category === 'projects').sort((a,b) => {
	const order1 = parseInt(a.data.order),
		order2 = parseInt(b.data.order)
	return order1 - order2;
});

export default (Wrapped) => {
  return class extends Component {
		static async getInitialProps(...args) {
			const wrappedInitial = Wrapped.getInitialProps
			const wrapped = wrappedInitial ? await wrappedInitial(...args) : {}

			return wrapped;
		}
		
    render() {
      return (<Wrapped {...this.props} posts={sortedPosts}/>)
    }
  }
}