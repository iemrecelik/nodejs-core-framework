const Users = require(__defined.moduleUrl + 'Document/Users.js');
const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');
const ClientsLog = require(__defined.moduleUrl + 'Document/ClientsLog.js');

const ChatsFuncSnippets = __ctrl.getClass('ChatsFuncSnippets');

module.exports = class SocketCheckInAndOut{

    async allConnectProcesses(req, res, next){

        if(req.session.user !== undefined){
            
            let io = req.app.io;
            let socket = req.app.socket;

            // console.log('socket.id ::::::::', socket.id)

            /*io.engine.generateId = (reqs) => {
                console.log('generateId: '+ req.session.user.name);
                let g = __ctrl.crypto( __ctrl._guid(10), req.session.user.name)
                console.log(g);
                return g;
                // return __ctrl.crypto( __ctrl._guid(10), req.session.user.name);
            }*/

            /*io.engine.generateId = (reqs) => {
                console.log('***********')
                console.log(req.session.user.name + '1222')
                console.log('***********')
                return req.session.user.name + '1222';
            }*/

            console.log(req.session.user.name + ' sockets : ' + Object.keys(io.sockets.sockets));

            io.once('connection', async (socket) => {

            // req.app.ioConnectPromise.then(async (socket) => {

                // let socket2 = req.app.socket;

                // console.log('socket2: ', socket2.id)

                console.log(req.session.user.name + ' - ' + socket.id);

                await this.otherSocketsDisconn(io, socket, req.session.user._id);
                
                /*run when connection start*/
                this.firstConnect(io, socket, req);

                /*run when disconnect start*/
                this.disconnect(io, socket, req);
            // })
                
            });

        }//end if req.session.user

        next();
    }

    async otherSocketsDisconn(io, currentSocket, id){
        /*console.log('****************************')
        console.log('io.sockets.sockets: ', Object.keys(io.sockets.sockets));*/

        Users.findOne({_id: id}, {socketId: 1}, (err, data) => {
            
            if(err) console.log(err);

            let socketID = data.socketId;

            /*console.log('db id: ', id);
            console.log('currentSocket socketID: ', currentSocket.id);
            console.log('db socketID: ', socketID);
            console.log('****************************')*/

            if(io.sockets.sockets[socketID])
                io.sockets.sockets[socketID].disconnect(true);

            /*let socketIDs = Object.keys(io.sockets.sockets);

            if(socketIDs.length > 0){

                for( let socketID of socketIDs ){
                    
                    if( socketID !== currentSocket.id )
                        io.sockets.sockets[socketID].disconnect(true);
                }
            
            }*/
        })
    }

    firstConnect(io, socket, req){

        Users.update(
            { 
                'userName': req.session.user.name 
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
                // console.log('BLALALALLA')
            }
        );
    }

    disconnect(io, socket, req){

        socket.on('disconnect', () => {

            /*Update  disconnect time in client log schema start*/
            ClientsLog.update(
                { 
                    'uniqueID': req.session.uniqueID 
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
                    'userName': req.session.user.name,
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

                    if (req.app.run[req.session.user._id] === true) 
                        this.disconnectSetTimeout(req, io, socket);
                    else
                        console.log('turn on');

                }// if userData nModified end

            }).error(function(err) {
                console.log(err);
            });
        }); //io disconnect end
    }

    disconnectSetTimeout(req, io, socket){

        setTimeout(function() {

            let UserTime = Users.findOne(
                {
                    'userName': req.session.user.name 
                }, 
                {
                    'connectTime': 1, 
                    'disconnectTime': 1,
                }
            );
            UserTime.then(function(userTimeData){
                if( (userTimeData.disconnectTime - userTimeData.connectTime) > 1500 ){

                    Users.update(
                        { 'userName': req.session.user.name }, 
                        { $set: { 'online': 0, 'logOutTime': new Date().getTime() }}, function(err) {

                        if (err) console.log(err);
                        
                        UsersInRoom.deleteMany(
                            { 
                                'userName': req.session.user.name, 
                            }, 
                            function(err) {
                                if (err) console.log(err);
                                req.app.io.emit('offUser',req.session.user.name);
                                ChatsFuncSnippets.emitRoomCount(null, io);
                                req.session.destroy();
                                console.log('Done exit');
                            }
                        );// UsersInRoom deleteMany end
                    });// Update end
                }//if end
                else{
                    console.log('it is not exit');
                }

            });//findOne end

            req.app.run[req.session.user._id] = true;

        }, 2000);

        req.app.run[req.session.user._id] = false;
    }
}