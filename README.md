# SSH Terminal
A basic html-based ssh terminal connected over websocket to an express backend.

![screenshot](https://github.com/sebpsdev/SshTerminal/blob/master/screenshot.png)

## Usage 
To run the solution locally using docker and docker-compose, run the following command from the project directory
```bash
docker-compose up
```

- The terminal web interface will be available at http://localhost:8080

## Server
* Express websocket routes are served using the ```express-ws``` npm package 
* Incoming websocket are converted into stream using the ```websocket-stream``` npm package 
* SSH session are managed using  ```ssh2``` npm package 

## Interface
* Shell terminal interface is rendered and managed using the ```xtermjs``` javascript library
* Websocket communication is made using native browser ```WebSocket``` library 
* ```Bootstrap``` framework is used for form rendering