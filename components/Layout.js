import React, { Component } from 'react'
import Hero from './Hero'
import NavBar from './NavBar';
import NProgress from 'nprogress';
import Router from 'next/router';
import Container from './Container';
import Footer from './Footer';
export function configureLoadingProgressBar() {
  Router.onRouteChangeStart = () => NProgress.start();
  Router.onRouteChangeComplete = () => NProgress.done();
  Router.onRouteChangeError = () => NProgress.done();
}

export default class Layout extends Component {
	static get defaultProps() {
		return {
			showHero: false
		}
	}
	componentDidMount() {
		configureLoadingProgressBar();
	}
	render() {
		return (
			<div>
				<NavBar url={this.props.url} />
				{this.props.children}
				<Footer />
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
			</div>
		)
	}
}