const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');
const ClientsLog = require(__defined.moduleUrl + 'Document/ClientsLog.js');

module.exports = class ChatsFuncSnippets{
    
    listUsersInRoom(data){
        var matchObj = {}

        if (typeof data.roomName !== 'undefined')
            matchObj['roomName'] = data.roomName;

        if (typeof data.userName !== 'undefined')
            matchObj['userName'] = data.userName;

        return UsersInRoom.aggregate([
            { $match: matchObj }, 
            {
                $lookup: {
                    from: "users",
                    localField: "userName",
                    foreignField: "userName",
                    as: "userJoin"
                },
            },
            { $sort: {  roomName : 1 } },
        ]); //UsersInRoom aggregate end
    }

    emitRoomCount(roomName, io){

        var roomMatch = {};

        if (Array.isArray(roomName)) {
            
            roomMatch['$or'] = roomName.map(function(elem, index) {
                return {
                    'roomName': elem
                };
            });
        }else if( roomName === null ){
            roomMatch = {};
        }else{
            roomMatch = { 'roomName': roomName };
        }

        UsersInRoom.aggregate([
            {
                "$match": roomMatch
            },
            {
                "$group" : 
                    { _id:"$roomName", count:{ $sum:1 }}
            }
        ]).then(function(roomCountData){
            
            io.of('/chats').emit('roomCount', roomCountData);

        });
    }

    emitAddUser(user, roomName, socket){

        let loginTimeV = this.getOnlineTime(user.loginTime);
        
        socket.to(roomName).emit('onUser', {
            'user': {
                name: user.name,
                avatar: user.avatar,
                loginTime: loginTimeV,
            },
            'roomName': roomName,
        });
    }

    listUsersAndRooms(data) {
        var usrInRmData = this.listUsersInRoom(data);
    }

    sessInfo(sess, userObj, dataUser, res, appRun) {
        sess.user = {
            _id: dataUser._id,
            name: userObj.userName,
            ip: userObj.userIp,
            loginTime: userObj.loginTime,
            avatar: dataUser.avatar,
            role: 'member'
        };

        // appRun[dataUser._id] = true;
        global.__stopRun[dataUser.userName] = true;

        res.redirect('/chats');
        // res.redirect('/profile');
    }

    getOnlineTime(loginTime){

        let nowTime = new Date().getTime();
        let onlineTime = nowTime - loginTime;

        if (onlineTime < 60000) {
    /*      let second = Math.floor( (onlineTime/1000) ) === 0?1:Math.floor( (onlineTime/1000) );

            return 'before '+Math.floor( (onlineTime/1000) )+' second';*/

            return 'NEW';

        } else if(onlineTime < 3600000 ) {

            return 'before '+Math.floor( (onlineTime/60000) )+' minute';

        }else if(onlineTime < 86400000){

            return 'before '+Math.floor( (onlineTime/3600000) )+' hour';
        }else
            return 'before '+Math.floor( (onlineTime/86400000) )+' day';

    }

    getNowTimeFormat(date = null){

        let time = date || new Date();

        var options = {  
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        };

        return time.toLocaleDateString('tr-TR', options);
    }

    getOnlUsrInRmData(session, matchRooms){

        return UsersInRoom.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "userName",
                    foreignField: "userName",
                    as: "userJoin"
                },
            },
            {
                $project: {
                     roomName: '$roomName',
                     userName: '$userName',
                     userJoin: {
                        $filter: {
                           input: "$userJoin",
                           as: "user",
                           cond: { 
                               $ne: [ "$$user.online", 0],
                           }
                        }
                     }
                }
            },
            { 
                $match:  {
                    $or: matchRooms,
                    userName: { $ne: session.user.name },
                    userJoin: { $ne: []}
                }
            },
            { $sort: {  roomName : 1 } },
        ])
    }

    updateOnlUsrTime(findUserRooms, session, socket){

        var matchRooms;

        findUserRooms.then(function(userRoomsData){

            if (userRoomsData.length > 0) {
                matchRooms = userRoomsData.map(function(elem, index) {
                    return {roomName: elem.roomName};
                });
            }else
                matchRooms = [{}];

        }).then(() => {
            
            this.getOnlUsrInRmData(session, matchRooms).then((onlineUsrInRmData) => {

                let onlUsrTimeInRmData = onlineUsrInRmData.map((filtItem, index) => {
                        
                        return {
                            'userName': filtItem.userName,
                            'loginTime': this.getOnlineTime(filtItem.userJoin[0].loginTime),
                        };
                        
                    });

                socket.emit('updateOnlUsrTime', onlUsrTimeInRmData);

            }).error(function(err){
                if (err) console.log(err);
            });//enterRoom then end;

        });//find user rooms
    }

    registerClientsLog(req){
        
        let userName = typeof req.session.user !== 'undefined'?req.session.user.name:null;

        if(req.session.uniqueID == null){

            req.session.uniqueID = this._guid();
        }

        let clientsLogObj = {
            uniqueID: req.session.uniqueID,
            ip: req.ip,
            userName: userName,
            path: req.originalUrl,
            loginTime: new Date(),
        }

        ClientsLog.create(clientsLogObj);
    }

    _guid(){
        
        var currentDateMilliseconds = new Date().getTime();

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(currentChar) {
            var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
            currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
            return (currentChar === 'x' ? randomChar : (randomChar & 0x7 | 0x8)).toString(16);
        });
    }
}