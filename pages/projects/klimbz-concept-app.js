
	import enhancePage from './../../hocs/enhancePage';
	import Layout from './../../components/Layout';
	import PostContent from './../../components/PostContent';
	import NextPost from './../../components/NextPost';
	import Link from 'next/link'
	import Container from './../../components/Container';
	
	
	
	export default enhancePage(({url}) => (
		<Layout url={url}>
		<div className='autogenerated-post'>
			<p>Every few weeks I participate in a climbing league where we are required to record climbs with a clunky not so mobile friendly web page.  As a little side project I wanted to write an App that would make the process of recording climbs easier.</p>
<p><img src="/static/images/klimbz-img1.png" alt="Landing Page" /></p>
<p>I thought it would be cool to have an app where you could authenticate with Facebook, and then view all your own climbs and the climbs of your friends in a social media sort of way.</p>
<p><img src="/static/images/klimbz-img2.png" alt="Feed Screen Shot" /><br />
<img src="/static/images/klimbz-img3.png" alt="Profile screen" /></p>
<p>To make recording climbs easier I thought it would be more user friendly if users could simply record climbs by scanning a QR code next to the route which they had just completed.</p>
<p><img src="/static/images/klimbz-img4.png" alt="Profile screen" /></p>
<p>After scanning a QR code the route info would be auto entered.</p>
<p><img src="/static/images/klimbz-img5.png" alt="Profile screen" /></p>
		</div>
		</Layout>
	))