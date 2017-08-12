import withAnalytics from './withAnalytics';
import NProgress from 'nprogress';
import Router from 'next/router';

const setUpProgressBar = () => {
	Router.onRouteChangeStart = () => NProgress.start();
	Router.onRouteChangeComplete = () => NProgress.done();
	Router.onRouteChangeError = () => NProgress.done();
}


export default (Component) => {
	setUpProgressBar();
	return withAnalytics(Component);
}