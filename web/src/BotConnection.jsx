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
    }

    update(msg) {
        if (msg.message.WinchStatus) {
            this.winches[msg.message.WinchStatus[0]] = msg;
        }
        if (msg.message.FlyerSensors) {
            this.flyer = msg;
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
        this.socket = null;
        this.frame_request = null;
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

    onSocketMessage = (evt) => {
        const json = JSON.parse(evt.data);
        const model = new BotModel();
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
                model.update(msg);
            }

            // Event for access to a raw message burst
            this.events.emit('messages', msglist);

            // Batch messages into UI frames
            if (!this.frame_request) {
                this.frame_request = window.requestAnimationFrame(() => {
                    this.frame_request = null;
                    this.events.emit('frame', model);
                });
            }

        } else if (json.Error !== undefined) {
            // The server can generate errors which we'll pass on as exceptions
            throw json.Error;

        } else if (json.Auth !== undefined) {
            // Authentication challenge
            this.authenticate(json.Auth);

        } else if (json.AuthStatus !== undefined) {
            // True or false, set logged-in state
            this.setState({ authenticated: json.AuthStatus === true });

        } else {
            console.log("Unrecognized message ", json);
        }
    }

    onSocketOpen = () => {
        this.setState({
            authenticated: false,
            connected: true,
        });
    }

    onSocketClose = () => {
        this.setState({
            authenticated: false,
            connected: false,
        });
    }

    authenticate(msg) {
        const key = this.state.key;
        if (key) {
            const digest = Base64.stringify(hmacSHA512(msg.challenge, key))
            const json = { Auth: { digest }};
            this.socket.send(JSON.stringify(json));
        }
    }

    componentDidMount() {
        // If we got a key in the hash query parameters, store it. These URLs are generated by the Bot-Controller server.
        // The key will be kept persistently in local storage, so we don't need to maintain it in the URL.
        const args = (window.location.hash+"?").split("?", 2)[1];
        const key = queryString.parse(args).k;
        if (key) {
            this.setState({ key });
        }

        // Look up the websocket URI then keep connected
        this.getWebsocketInfo().then((ws) => {
            this.socket = new ReconnectingWebSocket(ws.uri, undefined, {connectionTimeout: 1000});
            this.socket.addEventListener('message', this.onSocketMessage);
            this.socket.addEventListener('open', this.onSocketOpen);
            this.socket.addEventListener('close', this.onSocketClose);
        });
    }

    componentWillUnmount() {
        if (this.socket) {
            this.socket.removeEventListener('message', this.onSocketMessage);
            this.socket.removeEventListener('open', this.onSocketOpen);
            this.socket.removeEventListener('close', this.onSocketClose);
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
