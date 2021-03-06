import React, { Component } from 'react';
import { Button } from 'reactstrap';
import PropTypes from 'prop-types';
import { BotConnection } from '../BotConnection';
import { Chart, Series } from '../BotChart';

export default (props) => {
    const gimbal_status_timestamp = (model) => model.gimbal_status.local_timestamp;

    return <div>

        <h4>Motor Control</h4>

        <GimbalMotorButton block color="warning" enable={true}>
            Stabilization motors ON
        </GimbalMotorButton>

        <GimbalMotorButton block color="secondary" enable={false}>
            Stabilization motors OFF
        </GimbalMotorButton>

        <h4>Control Outputs</h4>

        <h6>Yaw/Pitch rate control</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.rates[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.rates[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h4>Sensors</h4>

        <h6>Yaw angle</h6>
        <Chart>
            <Series
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.angles[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h6>Pitch angle</h6>
        <Chart>
            <Series
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.angles[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h4>Hold status</h4>

        <h6>Hold active flags</h6>
        <Chart height="20" minValue="0" maxValue="1">
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_active[0] | 0}
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>
        <Chart height="20" minValue="0" maxValue="1">
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_active[1] | 0}
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h6>Hold output, proportional (P) control rate</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_p_rates[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_p_rates[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h6>Hold output, integrated (I) control rate</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_i_rates[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_i_rates[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>


        <h6>Current hold angles</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_angles[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.hold_angles[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h4>Tracker status</h4>

        <h6>Tracker output, proportional (P) control rate</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.tracking_p_rates[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.tracking_p_rates[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

        <h6>Tracker output, integrated (I) control rate</h6>
        <Chart>
            <Series
                strokeStyle='#a22'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.tracking_i_rates[0] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
            <Series
                strokeStyle='#22a'
                value={ (model) => model.gimbal_status.message.GimbalControlStatus.tracking_i_rates[1] }
                trigger={gimbal_status_timestamp} timestamp={gimbal_status_timestamp} />
        </Chart>

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
