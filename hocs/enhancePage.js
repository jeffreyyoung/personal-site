import withAnalytics from './withAnalytics';
import NProgress from 'nprogress';
import Router from 'next/router';
import withLayout from './withLayout';
const setUpProgressBar = () => {
	Router.onRouteChangeStart = () => NProgress.start();
	Router.onRouteChangeComplete = () => NProgress.done();
	Router.onRouteChangeError = () => NProgress.done();
}


export default (Component) => {
	setUpProgressBar();
	return withLayout(withAnalytics(Component));
}