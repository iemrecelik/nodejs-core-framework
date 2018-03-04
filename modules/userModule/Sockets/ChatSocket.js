const Users = require(__defined.moduleUrl + 'Document/Users.js');
const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');

const SocketChats = __ctrl.getClass('SocketChats');
const ChatsFuncSnippets = __ctrl.getClass('ChatsFuncSnippets');

module.exports = class ChatSocket{
	
	constructor(io, getSessionStore){
		
		this.getSessionStore = getSessionStore;

		this.socketConnect(io);
	}

	socketConnect(io){

		let nspChats = io.of('/chats')

	    // console.log(session);
	    console.log('CHATS PAGE')

	    nspChats.on('connection', async (socket) => {

	    	let session = await this.getSessionStore(socket);

	    	let findUserRooms = UsersInRoom.find({ userName: session.user.name }, { roomName: 1 });

	        console.log( 'CHATS PAGE: ' +session.user.name + ' - socket.id: ');
	        console.log(socket.id);
	        console.log(Object.keys(io.sockets.sockets));

	        var updateOnlUsrTime = setInterval(function(){
	            ChatsFuncSnippets.updateOnlUsrTime(findUserRooms, session, socket);
	        }, 60000);

	        ChatsFuncSnippets.emitAddUser(session.user, 'lejyon', socket);
	        
	        findUserRooms.then(function(userRoomsData){

	            if(userRoomsData.length > 0){
	                userRoomsData.forEach(function(item, index){
	                    socket.join(item.roomName);
	                });
	            }
	        });

	        Users.update(
	            { 
	                'userName': session.user.name 
	            }, 
	            { 
	                $set: { 
	                    'online': 1, 
	                    'connectTime': new Date().getTime(),
	                },
	                $addToSet: {
	                    nps: '/chats#'
	                }
	            }, 
	            function(err) {
	                if (err) console.log(err);
	            }
	        );

	        /*enter room start*/
	        SocketChats.enterRoom(io, socket, session);

	        /*leave room start*/
	        SocketChats.leaveRoom(io, socket, session);
	        
	        /*run when disconnect start*/
	        SocketChats.disconnect(io, socket, updateOnlUsrTime);

	        /* take message and send */
	        SocketChats.broadcastMsg(io, socket, session);

	        /*take private message and send*/
	        SocketChats.privateMsg(io, socket, session, '/chats#');

	        /*take camera request*/
	        SocketChats.sendReqCamera(socket, session);

	        /*take camera request*/
	        SocketChats.answerReqCamera(socket, session.user.name);
	        
	        /*send receive camera signal*/
	        SocketChats.sendReceiveSignalCamera(socket, session.user.name);

	        /*delete peer signal list*/
	        SocketChats.delPeerSignal(socket);
	        
	    }); //io connection end
	}
}