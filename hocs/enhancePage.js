import withAnalytics from './withAnalytics';
import NProgress from 'nprogress';
import Router from 'next/router';
import withLayout from './withLayout';


export default (Component) => {
	return withLayout(withAnalytics(Component));
}