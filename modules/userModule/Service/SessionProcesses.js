const UsersInRoom = require(__defined.moduleUrl + 'Document/UsersInRoom.js');
const Users = require(__defined.moduleUrl + 'Document/Users.js');

module.exports = class SessionProcesses{
	
	logoutProcess(sess, io){		

	    UsersInRoom.deleteMany({ 'userName': sess.user.name }, function(err){
	    	if (err) console.log(err);
	    });
	    
	    Users.updateOne({ 'userName': sess.user.name }, { $set: { 'online': 0 } }, function(err) {
	        if (err) console.log(err);
	    });

	    // io.emit('offUser', { 'userName': sess.user.name });

	    sess.destroy();

	}
}

/*module.exports.logoutProcess = function(sess, io) {

    UsersInRoom.deleteMany({ 'userName': sess.user.name }, function(err){
    	if (err) console.log(err);
    });
    
    Users.updateOne({ 'userName': sess.user.name }, { $set: { 'online': 0 } }, function(err) {
        if (err) console.log(err);
    });

    // io.emit('offUser', { 'userName': sess.user.name });

    sess.destroy();
}*/