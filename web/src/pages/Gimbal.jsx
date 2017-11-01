import React, { Component } from 'react';
import { Button } from 'reactstrap';
import PropTypes from 'prop-types';
import { BotConnection } from '../BotConnection';
import reactCSS from 'reactcss';
import { ConfigSlider } from '../Config';
import './Gimbal.css';

export default (props) => {
	let params = [];
	for (let i = 0; i < 128; i++) {
		let row = [];
		for (let t = 0; t < 3; t++) {
			row.push(<GimbalParam index={i} target={t} key={"gimbal-param-" + i + '-' + t} />);
		}
		params.push(<div className="Gimbal">
			<span className="index">{ ("00" + i.toString(16)).slice(-2) }</span>
			{row}
		</div>);
	}

    return <div>

        <h4>Motor Control</h4>

        <GimbalMotorButton block color="warning" enable={true}>
            Stabilization motors ON
        </GimbalMotorButton>

        <GimbalMotorButton block color="secondary" enable={false}>
            Stabilization motors OFF
        </GimbalMotorButton>

        <h4>Tracking</h4>

        <h6>Tracking gain</h6>
        <ConfigSlider item="gimbal.tracking_gain" min="0" max="5000" step="1e-4" />

        <h6>Yaw limits, min/max</h6>
        <ConfigSlider item="gimbal.yaw_limits.0" min="-2048" max="2048" step="1" />
        <ConfigSlider item="gimbal.yaw_limits.1" min="-2048" max="2048" step="1" />

        <h6>Pitch limits, min/max</h6>
        <ConfigSlider item="gimbal.pitch_limits.0" min="-1024" max="1024" step="1" />
        <ConfigSlider item="gimbal.pitch_limits.1" min="-1024" max="1024" step="1" />

        <h6>Limiter gain</h6>
        <ConfigSlider item="gimbal.limiter_gain" min="0" max="20" step="1e-4" />

        <h6>Max gimbal control rate</h6>
        <ConfigSlider item="gimbal.max_rate" min="0" max="20000" step="1" />

        <h4>Firmware parameters</h4>
        <div> { params } </div>

    </div>;
}

class GimbalMotorButton extends Component {
    static contextTypes = {
        botConnection: PropTypes.instanceOf(BotConnection),
    }

    render() {
        const { enable, children, ...props } = this.props;
        return <Button {...props} onClick={() => {
            this.context.botConnection.socket.send(JSON.stringify({
                Command: { GimbalMotorEnable: enable }
            }));
            }}> { children }
        </Button>;
    }
}

class GimbalParam extends Component {

    static contextTypes = {
        botConnection: PropTypes.instanceOf(BotConnection),
    }

 	constructor() {
        super();
        this.state = {
        	opacity: 0.0,
            current: 0,
        };
 	}

    render() {
        let styles = reactCSS({
	        'default': {
	            current: {
	            	opacity: this.state.opacity
	            }
	        }
	    });
        return <span className="GimbalParam">
        	<span style={styles.current}> {this.state.current} </span>
        </span>;
    }

    componentDidMount() {
        this.context.botConnection.events.on('frame', this.handleFrame);
    }

    componentWillUnmount() {
        this.context.botConnection.events.removeListener('frame', this.handleFrame);
    }

    handleFrame = (model) => {
    	const tsm = (model.gimbal_values[this.props.index] || [])[this.props.target];
    	if (tsm) {
    		const fade_duration = 500;
    		const age = ((new Date()).getTime() - tsm.local_timestamp);
    		const opacity = Math.max(0.4, 1.0 - age / fade_duration);
    		const current = tsm.message.GimbalValue.value;
    		this.setState({ opacity, current });
    	}
    }
}