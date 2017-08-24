import classnames from 'classnames'

export default ({pr = true, pl = true, pt = true, pb = true, className = '', wrapperClassName = '', children}) => (
	<div className={wrapperClassName}>
		<div className={classnames(`mw-1024 w-100 center`, className, {
			'pr3 pr3-ns': pr,
			'pl3 pl3-ns': pl,
			'pt3 pt3-ns': pt,
			'pb3 pb3-ns': pb,
		})}>
			{children}
			<style global jsx>{`
				.mw-1024 {
					max-width: 1024px;
				}
			`}</style>
		</div>
	</div>
)