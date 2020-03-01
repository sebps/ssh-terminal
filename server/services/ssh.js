const Client = require('ssh2').Client;
const readline = require('readline')

module.exports = {
    openShell: function (host, username, password, sshKey, stream) {
        return new Promise((resolve, reject) => {
            try {
                const conn = new Client();
                
                conn.on('ready', function () {
                    conn.shell(function (err, sshStream) {
                        if (err) {
                            return reject(err);
                        }

                        // create readline interface
                        const rl = readline.createInterface(stream);
    
                        sshStream.on('close', function () {
                            stream.end();
                            conn.end();
                        }).on('data', function (data) {
                            // pause to prevent more data from coming in
                            stream.pause();
                            stream.write(data.toString('utf8'));
                            stream.resume();
                        }).stderr.on('data', function (data) {
                            stream.pause();
                            stream.write(data.toString('utf8'));
                            stream.resume();
                        });
    
                        // initial command to avoid input echoing by shell
                        sshStream.write('stty -echo\n');

                        rl.on('line', function (d) {
                            if(d.trim() === '\x03') {
                                // Ctrl+C signal, not necessary to add linebreak character
                                sshStream.write('\x03');
                            } else {
                                // send data to through the client to the host
                                sshStream.write(d.trim() + '\n')
                            }
                        })
    
                        return resolve();
                    })
                })
                .on('error', function (error) {
                    console.error('sshClient.on: error', JSON.stringify(error));
                    return reject(error);
                })
                .connect({
                    host: host,
                    port: 22,
                    username: username,
                    password: password,
                    privateKey: sshKey
                })
            } catch(err) {
                console.log(err);
                return reject(err);
            }
        })
    }
}