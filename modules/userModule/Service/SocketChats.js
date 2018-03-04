const Users = require(__defined.moduleUrl + 'Document/Users.js');
const Rooms = require(__defined.moduleUrl + 'Document/Rooms.js');
const MsgRegisters = require(__defined.moduleUrl + 'Document/MsgRegisters.js');
const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');

const ChatsFuncSnippets = __ctrl.getClass('ChatsFuncSnippets');

module.exports = class SocketChats{

    constructor(){
        this.userPeerSignals = [];
        this.waitSocketNames = {};
    }

    enterRoom(io, socket, session) {

        socket.on('enterRoom', function(data) {
            
            // var existRooms = Object.keys(io.sockets.adapter.rooms); // All clients room list
            var existRooms = Object.keys(socket.rooms);

            if (existRooms.indexOf(data.roomName) === -1) {

                Rooms.find(null, function(err, roomsData) {

                    roomsData.some(function(roomVal, index) {

                        if (roomVal.roomName === data.roomName) {

                            socket.join(data.roomName);

                            UsersInRoom.find({
                                'userName': session.user.name,
                                'roomName': roomVal.roomName,
                            }, function(err, data) {
                                
                                if (data.length < 1) {
                                
                                    UsersInRoom.create({
                                        userName: session.user.name,
                                        roomName: roomVal.roomName
                                    }, function(err) {
                                        if (err) console.log(err);
                                        ChatsFuncSnippets.emitRoomCount(roomVal.roomName, io);
                                    });
                                }else
                                    ChatsFuncSnippets.emitRoomCount(roomVal.roomName, io);
                            });

                            ChatsFuncSnippets.emitAddUser(session.user, roomVal.roomName, socket);

                            ChatsFuncSnippets.listUsersInRoom(
                                {
                                    'roomName': roomVal.roomName,
                                    'userName': {$ne: session.user.name},
                                }
                            ).then(function(usrInRmData) {

                                usrInRmData = usrInRmData.map(function(item, index) {
                                    item.userJoin[0].loginTime = ChatsFuncSnippets.getOnlineTime(item.userJoin[0].loginTime);
                                    return item;
                                });

                                socket.emit('roomIndex', {
                                    'roomId': roomVal._id,
                                    'roomName': roomVal.roomName,
                                    'usrInRmData': usrInRmData
                                });

                            }).error(function(err){
                                if (err) console.log(err);
                            });//enterRoom then end

                            return true;

                        }//if end
                        
                    });
                }); //Room find data end
            } //if end

        }); //socket on room end
    }

    leaveRoom(io, socket, session){
        
        socket.on('leaveRoom', function(data) {

            socket.leave(data);
            
            UsersInRoom.deleteMany({ 'userName': session.user.name, 'roomName': data }, function(err) {
                if (err) console.log(err);
                socket.emit('leftRoom', data);
                ChatsFuncSnippets.emitRoomCount(data, io);
                socket.broadcast.emit('offUser',session.user.name);
            });
            
        });
    }

    broadcastMsg(io, socket, session){
        socket.on('msgReply', function(data) {
            
            let date = new Date();

            MsgRegisters.create({
                msgRegContent: data.msg,
                roomName: data.roomName,
                userName: session.user.name,
                msgSend: date.getTime(),
            });

            socket.to(data.roomName).emit('takeMsg', {
                'user': session.user,
                'msgSendTime': ChatsFuncSnippets.getNowTimeFormat(),
                'roomName': data.roomName,
                'msg': data.msg,
            });
        });
    }

    privateMsg(io, socket, session, namespace){

        socket.on('sendPrivateMsg', (data) => {
            
            this.getUserSocketIDAndAvatar(data.userName).then((userData) => {

                if (userData !== null) {

                    let receiveSocketID = namespace + userData.socketId.toString();
                    
                    let time = ChatsFuncSnippets.getNowTimeFormat();

                    socket.emit('takePrivateMsg', {
                        'id': data.userName,
                        'userName': session.user.name,
                        'msg': data.msg,
                        'avatar': session.user.avatar,
                        'time': time
                    });

                    socket.to(receiveSocketID).emit('takePrivateMsg', {
                        'id': session.user.name,
                        'userName': session.user.name,
                        'msg': data.msg,
                        'avatar': session.user.avatar,
                        'selfMsg': true,
                        'time': time
                    });
                }

            }).catch((err) => {
                console.log(err);                
            })
                
        });//socket on end
    }

    socketWait(socketName){

        this.waitSocketNames[socketName] = this.waitSocketNames[socketName] || 0;

        let wait =  Date.now() - this.waitSocketNames[socketName] > 5000?true:false;
        
        if(wait)
            this.waitSocketNames[socketName] = Date.now();

        return wait;
    }

    sendReqCamera(socket, session){

        socket.on('sendReqCamera', (data) => {

            if(this.socketWait('sendReqCamera')){

                this.getUserSocketIDAndAvatar(data.userName).then((reqUserInfo) => {
                
                    let receiveSocketID = '/chats#' + reqUserInfo.socketId.toString();

                    socket.to(receiveSocketID).emit('reqCamera', {
                        reqUserName: session.user.name,
                    });
                });
            }//end if sendreqwait
        })
    }
    //receive
    answerReqCamera(socket, userName){
        
        socket.on('answerToReq', (data) => {

            if(this.socketWait('answerToReq')){
            
                this.getUserSocketIDAndAvatar(data.reqUserName).then((reqUserInfo) => {

                    let receiveSocketID = '/chats#' + reqUserInfo.socketId.toString();

                    if(data.answer){
                        
                        if(this.duplicatePeerSignalControl(data.peerConnSignal, socket, data.reqUserName)){

                            socket.to(receiveSocketID).emit('accReqCamera', {
                                receiveUserName: userName,
                                peerConnSignal: data.peerConnSignal
                            });

                        }// end if duplicate peer signal

                    }else{

                        socket.to(receiveSocketID).emit('rejReqCamera', {
                            answer: 'false',
                            userName: userName
                        });
                    }//end if answer
                });
            }//end if socket wait
        })
    }
    //sender
    sendReceiveSignalCamera(socket, userName){
        
        socket.on('sendReceiveSignal', (data) => {
            
            if(this.duplicatePeerSignalControl(data.peerConnSignal, socket, data.receiveUserName)){

                this.getUserSocketIDAndAvatar(data.receiveUserName).then((reqUserInfo) => {

                    let receiveSocketID = '/chats#' + reqUserInfo.socketId.toString();                    

                    socket.to(receiveSocketID).emit('takeReceiveSignal', {
                        reqUserName: userName,
                        peerConnSignal: data.peerConnSignal
                    });
                });
            }// end if duplicate peer signal
        });
    }

    duplicatePeerSignalControl(signal, socket, userName = null){
        
        let control = false;
        
        if( this.userPeerSignals.indexOf(signal) > -1){

            let msg = `${userName} kullanıcısıyla bağlantınız vardır.
            Lütfen tarayıcınızı yenileyiniz. Ve tekrar istek göderin.`;

            control = false;
            socket.emit('socketErrorMsg', {msg: msg, userName: userName})
            
        }else if( this.userPeerSignals.length > 10 ){

            let msg = `10 taneden fazla video görüntü açamazsınız.`;

            control = false;
            socket.emit('socketErrorMsg', {msg: msg, userName: userName})

        }else{
            this.userPeerSignals.push(signal);
            control = true;
        }

        return control;
    }

    delPeerSignal(socket){
        socket.on('delPeerSignal', (data) => {
            this.userPeerSignals.splice(this.userPeerSignals.indexOf(data.signal), 1);
        })
    }

    getUserSocketIDAndAvatar(userName){
        
        return Users.findOne(
            { 
                'userName': userName, 
                $or: [
                    {'online': 1 },
                    {'online': 2 },
                ]
            },
            { 
                'socketId': 1,
                'avatar': 1
            }
        );
    }

    disconnect(io, socket, updateOnlUsrTime){

        socket.on('disconnect', () => {
            
            clearInterval(updateOnlUsrTime);
        });
    }
}