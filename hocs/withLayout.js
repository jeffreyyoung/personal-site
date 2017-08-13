import React, { Component } from 'react'
import Head from 'next/head'
export default (Wrapped) => {
  return class extends Component {
		static async getInitialProps(...args) {
			const wrappedInitial = Wrapped.getInitialProps
			const wrapped = wrappedInitial ? await wrappedInitial(...args) : {}

			return wrapped;
		}
		
    render() {
      return (<div>
				<Head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<link rel="stylesheet" href="/static/vendor/semantic.min.css"></link>
				</Head>
				<Wrapped {...this.props} />
				<style jsx global>{`

		    `}</style>
			</div>)
    }
  }
}