module.exports = class testConnect{
    constructor(io, getSessionStore){
        
        this.getSessionStore = getSessionStore;

        this.socketConnect(io);
    }

    async socketConnect(io){

        io.on('connection', async (socket) => {

            let session = await this.getSessionStore(socket)

            // console.log('session: ', session);

            console.log('SOOOCKET ID : ', socket.id);
            console.log(' sockets :  - ' + Object.keys(io.sockets.sockets));

        })
    }
}

