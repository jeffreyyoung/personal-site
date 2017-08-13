import React, { Component } from 'react'
import Link from 'next/link'
import Hero from './Hero'
import {
  Button,
  Container,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  List,
  Menu,
  Segment,
  Visibility,
} from 'semantic-ui-react'

const FixedMenu = (props) => (
  <Menu size='large'>
    <Container>
			<Link href='/'><Menu.Item as='a' active active={props.path === '/'}>Projects</Menu.Item></Link>
			<Link href='/resume'><Menu.Item as='a' active={props.path === '/resume'}>Resume</Menu.Item></Link>
			<Link href='/about'><Menu.Item as='a' active={props.path === '/about'}>About Me</Menu.Item></Link>
    </Container>
  </Menu>
)

export default class Layout extends Component {
	static get defaultProps() {
		return {
			showHero: false
		}
	}
	
	render() {
		return (
			<div>
				<Hero showHero={this.props.showHero} path={this.props.url.pathname}/>
				{this.props.children}
			</div>
		)
	}
}