import React, { Component } from 'react'
import Head from 'next/head'
import NProgress from 'nprogress';
import Router from 'next/router';
export function configureLoadingProgressBar() {
  Router.onRouteChangeStart = () => NProgress.start();
  Router.onRouteChangeComplete = () => NProgress.done();
  Router.onRouteChangeError = () => NProgress.done();
}

export default (Wrapped) => {
  return class extends Component {
		componentDidMount() {
			configureLoadingProgressBar();
		}
		
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
					/* Make clicks pass-through */
					#nprogress {
					  pointer-events: none;
					}

					#nprogress .bar {
					  background: #19a974;

					  position: fixed;
					  z-index: 1031;
					  top: 0;
					  left: 0;

					  width: 100%;
					  height: 2px;
					}

					/* Fancy blur effect */
					#nprogress .peg {
					  display: block;
					  position: absolute;
					  right: 0px;
					  width: 100px;
					  height: 100%;
					  box-shadow: 0 0 10px #29d, 0 0 5px #29d;
					  opacity: 1.0;

					  -webkit-transform: rotate(3deg) translate(0px, -4px);
					      -ms-transform: rotate(3deg) translate(0px, -4px);
					          transform: rotate(3deg) translate(0px, -4px);
					}

					/* Remove these to get rid of the spinner */
					#nprogress .spinner {
					  display: block;
					  position: fixed;
					  z-index: 1031;
					  top: 15px;
					  right: 15px;
					}

					#nprogress .spinner-icon {
					  width: 18px;
					  height: 18px;
					  box-sizing: border-box;

					  border: solid 2px transparent;
					  border-top-color: #19a974;
					  border-left-color: #19a974;
					  border-radius: 50%;

					  -webkit-animation: nprogress-spinner 400ms linear infinite;
					          animation: nprogress-spinner 400ms linear infinite;
					}

					.nprogress-custom-parent {
					  overflow: hidden;
					  position: relative;
					}

					.nprogress-custom-parent #nprogress .spinner,
					.nprogress-custom-parent #nprogress .bar {
					  position: absolute;
					}

					@-webkit-keyframes nprogress-spinner {
					  0%   { -webkit-transform: rotate(0deg); }
					  100% { -webkit-transform: rotate(360deg); }
					}
					@keyframes nprogress-spinner {
					  0%   { transform: rotate(0deg); }
					  100% { transform: rotate(360deg); }
					}
				`}</style>
				
				
				<style jsx global>{`
					.mw-1024 {
						max-width: 1024px;
					}
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