import Container from './Container';

export default () => (
	<Container className="pv6 pv6-ns justify-center flex flex-column bg-white">
		<div>
			<h1 className="f1 fw3 black mb0">Hi. I'm Jeffrey.</h1>
			<h2 className="measure f3 fw3 black-90 mt0 mb2 lh-copy">I do freelance web and mobile development. During the day I'm a Software Engineer at Adobe.</h2>
			<a className="f5-ns fw6 dib ba b--black-20 bg-light-blue white ph4 pv3 br2 dim no-underline" href="#0">Message Me</a>
		</div>
		<style jsx global>{`
			.bg-gradient-messenger {
				background: #00c6ff;  /* fallback for old browsers */
				background: -webkit-linear-gradient(to left, #0072ff, #00c6ff);  /* Chrome 10-25, Safari 5.1-6 */
				background: linear-gradient(to left, #0072ff, #00c6ff); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
			}
		`}</style>
	</Container>
)