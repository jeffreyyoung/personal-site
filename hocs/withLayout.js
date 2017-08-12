import {Component, PropTypes} from 'react'

export default ComposedComponent => (props) => (
	<div>
		<ComposedComponent {...this.props}/>
	</div>
)