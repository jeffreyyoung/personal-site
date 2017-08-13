//https://github.com/Semantic-Org/Semantic-UI-React/blob/master/docs/app/Layouts/HomepageLayout.js
const gradients = ['gradient-stellar', 'gradient-moonrise', 'gradient-peach', 'gradient-dracula', 'gradient-mantle', 'gradient-titanium', 'gradient-opa', 'gradient-sea-blizz', 'gradient-midnight-city', 'gradient-shroom-haze'];
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
import Link from 'next/link'
let gradient = gradients[getRandomInt(0, gradients.length)];
import {Component} from 'react'
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

export default class Hero extends Component { 
	
	constructor(props, context) {
		super(props, context);
	}
	
	render(){
		const props = this.props;
	let gridStyles = {};
	if (props.showHero) {
		gridStyles.minHeight = 500;
	}
	return (
		<Segment
			inverted
			textAlign='center'
			vertical
			className={gradient}
		>
		<Grid style={gridStyles} columns={1}>
				<Container>
					<Menu inverted pointing secondary size='large' style={{backgroundColor: 'transparent', borderColor: 'transparent'}}>
							<Menu.Item header><span className='yar' onClick={() => {gradient = gradients[getRandomInt(0, gradients.length)]; this.forceUpdate()}}>🌮</span></Menu.Item>
							<Link href='/'><Menu.Item as='a' active active={props.path === '/'}>Projects</Menu.Item></Link>
							<Link href='/resume'><Menu.Item as='a' active={props.path === '/resume'}>Resume</Menu.Item></Link>
							<Link href='/about'><Menu.Item as='a' active={props.path === '/about'}>About Me</Menu.Item></Link>
					</Menu>
				</Container>
			{props.showHero ? <Grid.Column>
				<Container text>
							<Header
								as='h1'
								content='Jeffrey Young'
								inverted
								style={{ fontSize: '4em', fontWeight: 'normal', marginTop: '0' }}
							/>
							<Header
								as='h2'
								content='Blah blah blah blah blah blah'
								inverted
								style={{ fontSize: '1.7em', fontWeight: 'normal', marginBottom: 0 }}
							/>
				</Container>
			</Grid.Column> : null}
</Grid>
	<style global jsx>{`
		.yar:hover {
			cursor: pointer;
		}
		.gradient-stellar {
			background: #7474BF !important;
			background: -webkit-linear-gradient(to right, #348AC7, #7474BF) !important;
			background: linear-gradient(to right, #348AC7, #7474BF) !important;
		}
		.gradient-moonrise {
			background: #DAE2F8 !important;
			background: -webkit-linear-gradient(to right, #D6A4A4, #DAE2F8) !important;
			background: linear-gradient(to right, #D6A4A4, #DAE2F8) !important;
		}
		.gradient-peach {
			background: #ED4264 !important;
			background: -webkit-linear-gradient(to right, #FFEDBC, #ED4264) !important;
			background: linear-gradient(to right, #FFEDBC, #ED4264) !important;
		}
		.gradient-dracula {
			background: #DC2424 !important;
			background: -webkit-linear-gradient(to right, #4A569D, #DC2424) !important;
			background: linear-gradient(to right, #4A569D, #DC2424) !important;
		}
		.gradient-mantle {
			background: #24C6DC !important;
			background: -webkit-linear-gradient(to right, #514A9D, #24C6DC) !important;
			background: linear-gradient(to right, #514A9D, #24C6DC) !important;
		}
		.gradient-titanium {
			background: #283048 !important;
			background: -webkit-linear-gradient(to right, #859398, #283048) !important;
			background: linear-gradient(to right, #859398, #283048) !important;
		}
		.gradient-opa {
			background: #3D7EAA !important;
			background: -webkit-linear-gradient(to right, #FFE47A, #3D7EAA) !important;
			background: linear-gradient(to right, #FFE47A, #3D7EAA) !important;
		}
		.gradient-sea-blizz {
			background: #1CD8D2 !important;
			background: -webkit-linear-gradient(to right, #93EDC7, #1CD8D2) !important;
			background: linear-gradient(to right, #93EDC7, #1CD8D2) !important;
		}
		.gradient-midnight-city {
			background: #232526 !important;
			background: -webkit-linear-gradient(to right, #414345, #232526) !important;
			background: linear-gradient(to right, #414345, #232526) !important;
		}
		.gradient-shroom-haze {
			background: #5C258D !important;
			background: -webkit-linear-gradient(to right, #4389A2, #5C258D) !important;
			background: linear-gradient(to right, #4389A2, #5C258D) !important;

		}
		
		`}</style>
</Segment>
	)
}}