const Users = require(__defined.moduleUrl + 'Document/Users.js');
const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');
const ClientsLog = require(__defined.moduleUrl + 'Document/ClientsLog.js');

const ChatsFuncSnippets = __ctrl.getClass('ChatsFuncSnippets');

module.exports = class SocketCheckInAndOut{

    constructor(io, sessStoreProcesses){

        this.sessStoreProcesses = sessStoreProcesses;

        this.allConnectProcesses(io);
        this.socketPermission(io);
    }

    async allConnectProcesses(io){

        io.on('connection', async (socket) => {

            let session = await this.sessStoreProcesses.getSessionStore(socket);

            console.log('(allConnectProcesses)' + session.user.name + ' - ' + socket.id);

            await this.otherSocketsDisconn(io, socket, session.user._id);
            
            /*run when connection start*/
            this.firstConnect(io, socket, session);

            /*run when disconnect start*/
            this.disconnect(io, socket, session);
            
        });
    }

    async otherSocketsDisconn(io, currentSocket, id){

        Users.findOne({_id: id}, {socketId: 1}, (err, data) => {
            
            if(err) console.log(err);

            let socketID = data.socketId;

            if(io.sockets.sockets[socketID])
                io.sockets.sockets[socketID].disconnect(true);

        })
    }

    firstConnect(io, socket, session){

        Users.update(
            { 
                'userName': session.user.name 
            }, 
            { 
                $set: { 
                    'online': 1, 
                    'connectTime': new Date().getTime(),
                    'socketId': socket.id
                }
            }, 
            function(err) {
                if (err) console.log(err);
            }
        );
    }

    disconnect(io, socket, session){

        socket.on('disconnect', () => {

            /*Update  disconnect time in client log schema start*/
            ClientsLog.update(
                { 
                    'uniqueID': session.uniqueID 
                }, 
                { 
                    $set: { 
                        'disconnectTime': new Date(), 
                    } ,
                }, 
                function(err) {
                    if (err) console.log(err);
                }
            );
            /*Update  disconnect time in client log schema end*/

            Users.update(
                { 
                    'userName': session.user.name,
                    'online': {
                        $ne: 0
                    }
                },
                { 
                    $set: { 
                        'online': 2, 
                        'disconnectTime': new Date().getTime(), 
                    } ,
                }

            ).then((userData) => {
                
                if (userData.nModified > 0) {
                    CO++
                    console.log(CO);
                    console.log('global.__stopRun: ', global.__stopRun);
                    if (global.__stopRun[session.user.name] === true) 
                        this.disconnectSetTimeout(session, io, socket);
                    else
                        console.log('turn on');

                }// if userData nModified end

            }).error(function(err) {
                console.log(err);
            });
        }); //io disconnect end
    }

    disconnectSetTimeout(session, io, socket){

        setTimeout(() => {

            let UserTime = Users.findOne(
                {
                    'userName': session.user.name 
                }, 
                {
                    'connectTime': 1, 
                    'disconnectTime': 1,
                }
            );
            UserTime.then((userTimeData) => {
                if( (userTimeData.disconnectTime - userTimeData.connectTime) > 1500 ){

                    Users.update(
                        { 'userName': session.user.name }, 
                        { $set: { 'online': 0, 'logOutTime': new Date().getTime() }}, (err) => {

                        if (err) console.log(err);
                        
                        UsersInRoom.deleteMany(
                            { 
                                'userName': session.user.name, 
                            }, 
                            (err) => {
                                if (err) console.log(err);
                                io.emit('offUser',session.user.name);
                                ChatsFuncSnippets.emitRoomCount(null, io);
                                this.sessStoreProcesses.sessionStoreDestroy(socket);
                                console.log('Done exit');
                            }
                        );// UsersInRoom deleteMany end
                    });// Update end
                }//if end
                else{
                    console.log('it is not exit');
                }

            });//findOne end

            global.__stopRun[session.user.name] = true;

        }, 2000);

        global.__stopRun[session.user.name] = false;
    }

    socketPermission(io){

        // io.origins(['localhost:3000/chats', 'localhost:3000/profilea']);

        io.origins((origin, callback) => {
            
            if (['http://localhost:3000/chats', 'http://localhost:3000/profile'].indexOf(origin) < 0) {
                return callback('origin not allowed', false);
            }
            callback(null, true);
        });
    }
}