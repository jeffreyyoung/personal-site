import withAnalytics from './withAnalytics';
import NProgress from 'nprogress';
import Router from 'next/router';
import withGlobalStyles from './withGlobalStyles';


export default (Component) => {
	return withGlobalStyles(withAnalytics(Component));
}