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
      return (<div className='w-100 sans-serif bg-white'>
				<Head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<link rel="stylesheet" href="https://unpkg.com/tachyons@4.8.0/css/tachyons.min.css"/>
				</Head>
				<Wrapped {...this.props} />
				<style jsx global>{`

		    `}</style>
			</div>)
    }
  }
}