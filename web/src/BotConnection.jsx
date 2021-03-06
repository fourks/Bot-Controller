import React, { Component } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'events';
import hmacSHA512 from 'crypto-js/hmac-sha512';
import Base64 from 'crypto-js/enc-base64';
import ReconnectingWebSocket from 'reconnecting-websocket';
import LocalStorageMixin from 'react-localstorage'
import reactMixin from 'react-mixin';
import queryString from 'query-string';

export class BotModel {
    constructor() {
        this.flyer = {};
        this.winches = [];
        this.gimbal_values = [];
        this.gimbal_status = {};
        this.camera = {};
    }

    update(msg) {
        if (msg.message.WinchStatus) {
            this.winches[msg.message.WinchStatus[0]] = msg;
        }
        if (msg.message.FlyerSensors) {
            this.flyer = msg;
        }
        if (msg.message.ConfigIsCurrent) {
            this.config = msg;
        }
        if (msg.message.GimbalValue) {
            let addr = msg.message.GimbalValue[0].addr;
            let index_list = this.gimbal_values[addr.index] || (this.gimbal_values[addr.index] = []);
            index_list[addr.target] = msg;
        }
        if (msg.message.GimbalControlStatus) {
            this.gimbal_status = msg;
        }
        if (msg.message.Command) {
            let cmd = msg.message.Command;
            if (cmd.CameraObjectDetection) {
                this.camera.object_detection = msg;
            }
            if (cmd.CameraRegionTracking) {
                this.camera.region_tracking = msg;
            }
        }
    }
}

export class BotConnection extends Component {

    static childContextTypes = {
        botConnection: PropTypes.instanceOf(BotConnection)
    }

    constructor() {
        super();
        this.events = new EventEmitter();
        this.events.setMaxListeners(100);
        this.socket = null;
        this.frame_request = null;
        this.model = new BotModel();
        this.auth_challenge = null;
        this.state = {
            key: null,
            authenticated: false,
            connected: false
        };
    }

    getChildContext() {
        return { botConnection: this };
    }

    getWebsocketInfo() {
        // The real server has an HTTP API for getting the WebSocket URI.
        // But if that fails, make a guess that will work for development with "npm start" or whatever.

        return fetch('/ws').then((response) => {
            return response.json();
        }).catch((err) => {
            console.log(`Guessing WebSocket config, failed to use HTTP API (${err})`);
            return { uri: `ws://${window.location.hostname}:8081` };
        });
    }

    handleSocketMessage = (evt) => {
        const json = JSON.parse(evt.data);
        let time_offset = null;
        let last_timestamp = null;

        if (json.Stream) {
            const msglist = json.Stream;
            const last_msg = msglist[msglist.length - 1];

            // Update time offset from last message, restart if timestamps go backward.
            if (last_msg.timestamp < last_timestamp) {
                time_offset = null;
            }
            last_timestamp = last_msg.timestamp;
            if (time_offset === null) {
                time_offset = new Date().getTime() - last_msg.timestamp;
            }

            // Annotate all messages with local timestamp, and update the model
            for (let msg of msglist) {
                msg.local_timestamp = time_offset + msg.timestamp;
                this.model.update(msg);
                if (msg.message.ConfigIsCurrent) {
                    this.events.emit('config', msg);
                }
                if (msg.message.UnhandledGimbalPacket) {
                    this.events.emit('gimbal', msg);
                }
            }

            // Event for access to a raw message burst
            this.events.emit('messages', msglist);

            // Batch messages into UI frames
            if (!this.frame_request) {
                this.frame_request = window.requestAnimationFrame(() => {
                    this.frame_request = null;
                    this.events.emit('frame', this.model);
                });
            }

        } else if (json.Error !== undefined) {
            // The server can generate errors which we'll pass on as exceptions
            this.events.emit('log', json);
            throw json.Error;

        } else if (json.Auth !== undefined) {
            // Authentication challenge
            this.events.emit('log', json);
            this.auth_challenge = json.Auth.challenge;
            this.authenticate(json.Auth);

        } else if (json.AuthStatus !== undefined) {
            // True or false, set logged-in state
            this.events.emit('log', json);
            this.setState({ authenticated: json.AuthStatus === true });

        } else {
            this.events.emit('log', json);
            console.log("Unrecognized message ", json);
        }
    }

    handleSocketOpen = () => {
        this.setState({
            authenticated: false,
            connected: true,
        });
    }

    handleSocketClose = () => {
        this.setState({
            authenticated: false,
            connected: false,
        });
    }

    authenticate() {
        const challenge = this.auth_challenge;
        const key = this.state.key;
        if (key && challenge && this.socket) {
            const digest = Base64.stringify(hmacSHA512(this.auth_challenge, key))
            this.send({ Auth: { digest }});
        }
    }

    send(json) {
        this.socket.send(JSON.stringify(json));
    }

    componentDidMount() {
        // If we got a key in the hash query parameters, store it. These URLs are generated by the Bot-Controller server.
        // The key will be kept persistently in local storage, so we don't need to maintain it in the URL.
        const args = (window.location.hash+"?").split("?", 2)[1];
        const key = queryString.parse(args).k;
        if (key && key !== this.state.key) {
            this.setState({ key });
            this.authenticate();
        }

        // Look up the websocket URI then keep connected
        this.getWebsocketInfo().then((ws) => {
            this.socket = new ReconnectingWebSocket(ws.uri, undefined, {connectionTimeout: 1000});
            this.socket.addEventListener('message', this.handleSocketMessage);
            this.socket.addEventListener('open', this.handleSocketOpen);
            this.socket.addEventListener('close', this.handleSocketClose);
        });
    }

    componentWillUnmount() {
        if (this.socket) {
            this.socket.removeEventListener('message', this.handleSocketMessage);
            this.socket.removeEventListener('open', this.handleSocketOpen);
            this.socket.removeEventListener('close', this.handleSocketClose);
            this.socket.close();
        }
        if (this.frame_request) {
            window.cancelAnimationFrame(this.frame_request);
        }
    }

    render() {
        return <div> {this.props.children} </div>;
    }
}

reactMixin(BotConnection.prototype, LocalStorageMixin);

export class IfAuthenticated extends Component {
    static contextTypes = {
        botConnection: PropTypes.instanceOf(BotConnection),
    }

    render() {
        if (this.context.botConnection.state.authenticated) {
            return this.props.children;
        } else {
            return null;
        }
    }
}
