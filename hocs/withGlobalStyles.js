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
				</Head>
				<style jsx global>{`
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
				<Wrapped {...this.props} />
			</div>)
    }
  }
}