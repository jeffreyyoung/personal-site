import React, { Component } from 'react'
import Hero from './Hero'
import NavBar from './NavBar';
import NProgress from 'nprogress';
import Router from 'next/router';
import Container from './Container';

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
				<Container className='bg-near-white'>
					<a className="mr3 black-80 dim pointer" href="https://github.com/jeffreyyoung" title="Jeffrey's GitHub">
						<svg className="dib h2 w2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414"><path d="M8 0C3.58 0 0 3.582 0 8c0 3.535 2.292 6.533 5.47 7.59.4.075.547-.172.547-.385 0-.19-.007-.693-.01-1.36-2.226.483-2.695-1.073-2.695-1.073-.364-.924-.89-1.17-.89-1.17-.725-.496.056-.486.056-.486.803.056 1.225.824 1.225.824.714 1.223 1.873.87 2.33.665.072-.517.278-.87.507-1.07-1.777-.2-3.644-.888-3.644-3.953 0-.873.31-1.587.823-2.147-.083-.202-.358-1.015.077-2.117 0 0 .672-.215 2.2.82.638-.178 1.323-.266 2.003-.27.68.004 1.364.092 2.003.27 1.527-1.035 2.198-.82 2.198-.82.437 1.102.163 1.915.08 2.117.513.56.823 1.274.823 2.147 0 3.073-1.87 3.75-3.653 3.947.287.246.543.735.543 1.48 0 1.07-.01 1.933-.01 2.195 0 .215.144.463.55.385C13.71 14.53 16 11.534 16 8c0-4.418-3.582-8-8-8"/></svg>
					</a>
					<a className="mr3 black-80 dim pointer" href="https://www.instagram.com/jmoneyswagtime/" title="Jeffrey's Instagram">
						<svg className="dib h2 w2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414"><path d="M8 0C5.827 0 5.555.01 4.702.048 3.85.088 3.27.222 2.76.42c-.526.204-.973.478-1.417.923-.445.444-.72.89-.923 1.417-.198.51-.333 1.09-.372 1.942C.008 5.555 0 5.827 0 8s.01 2.445.048 3.298c.04.852.174 1.433.372 1.942.204.526.478.973.923 1.417.444.445.89.72 1.417.923.51.198 1.09.333 1.942.372.853.04 1.125.048 3.298.048s2.445-.01 3.298-.048c.852-.04 1.433-.174 1.942-.372.526-.204.973-.478 1.417-.923.445-.444.72-.89.923-1.417.198-.51.333-1.09.372-1.942.04-.853.048-1.125.048-3.298s-.01-2.445-.048-3.298c-.04-.852-.174-1.433-.372-1.942-.204-.526-.478-.973-.923-1.417-.444-.445-.89-.72-1.417-.923-.51-.198-1.09-.333-1.942-.372C10.445.008 10.173 0 8 0zm0 1.44c2.136 0 2.39.01 3.233.048.78.036 1.203.166 1.485.276.374.145.64.318.92.598.28.28.453.546.598.92.11.282.24.705.276 1.485.038.844.047 1.097.047 3.233s-.01 2.39-.048 3.233c-.036.78-.166 1.203-.276 1.485-.145.374-.318.64-.598.92-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.844.038-1.097.047-3.233.047s-2.39-.01-3.233-.048c-.78-.036-1.203-.166-1.485-.276-.374-.145-.64-.318-.92-.598-.28-.28-.453-.546-.598-.92-.11-.282-.24-.705-.276-1.485C1.45 10.39 1.44 10.136 1.44 8s.01-2.39.048-3.233c.036-.78.166-1.203.276-1.485.145-.374.318-.64.598-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276C5.61 1.45 5.864 1.44 8 1.44zm0 2.452c-2.27 0-4.108 1.84-4.108 4.108 0 2.27 1.84 4.108 4.108 4.108 2.27 0 4.108-1.84 4.108-4.108 0-2.27-1.84-4.108-4.108-4.108zm0 6.775c-1.473 0-2.667-1.194-2.667-2.667 0-1.473 1.194-2.667 2.667-2.667 1.473 0 2.667 1.194 2.667 2.667 0 1.473-1.194 2.667-2.667 2.667zm5.23-6.937c0 .53-.43.96-.96.96s-.96-.43-.96-.96.43-.96.96-.96.96.43.96.96z"/></svg>
					</a>
					<a className="black-80 dim pointer" href="https://www.linkedin.com/in/jeffreyyoung4/" title="Jeffrey's Linkedin">
						<svg className="dib h2 w2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="1.414"><path d="M13.632 13.635h-2.37V9.922c0-.886-.018-2.025-1.234-2.025-1.235 0-1.424.964-1.424 1.96v3.778h-2.37V6H8.51V7.04h.03c.318-.6 1.092-1.233 2.247-1.233 2.4 0 2.845 1.58 2.845 3.637v4.188zM3.558 4.955c-.762 0-1.376-.617-1.376-1.377 0-.758.614-1.375 1.376-1.375.76 0 1.376.617 1.376 1.375 0 .76-.617 1.377-1.376 1.377zm1.188 8.68H2.37V6h2.376v7.635zM14.816 0H1.18C.528 0 0 .516 0 1.153v13.694C0 15.484.528 16 1.18 16h13.635c.652 0 1.185-.516 1.185-1.153V1.153C16 .516 15.467 0 14.815 0z" fill-rule="nonzero"/></svg>
					</a>
				</Container>
				<style jsx global>{`
					/* Make clicks pass-through */
					#nprogress {
					  pointer-events: none;
					}

					#nprogress .bar {
					  background: #29d;

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
					  border-top-color: #29d;
					  border-left-color: #29d;
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