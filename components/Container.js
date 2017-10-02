import classnames from 'classnames'

export default ({pr = true, pl = true, pt = true, pb = true, className = '', wrapperClassName = '', children}) => (
	<div className={wrapperClassName}>
		<div className={classnames(`mw-1024 w-100 center`, className, {
			'pr3 pr4-ns': pr,
			'pl3 pl4-ns': pl,
			'pt3 pt4-ns': pt,
			'pb3 pb4-ns': pb,
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