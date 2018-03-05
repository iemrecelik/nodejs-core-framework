module.exports = class testConnect{

    constructor(io, sessStoreProcesses){

        this.sessStoreProcesses = sessStoreProcesses;

        this.socketConnect(io);
    }

    async socketConnect(io){

        let chatNsp = io.of('/chats');

        chatNsp.on('connection', async (socket) => {

            // let session = await this.sessStoreProcesses.getSessionStore(socket)

            socket.on('takeMsg', (msg) => {
                console.log(msg);
                socket.broadcast.emit('sendMsg', msg);
            })

            console.log('SOOOCKET ID : ', socket.id);
            console.log(' sockets :  - ' + Object.keys(io.sockets.sockets));

        })
    }
}

