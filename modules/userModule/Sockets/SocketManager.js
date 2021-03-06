const TestConnect = require(__defined.moduleUrl + 'Sockets/TestConnect.js');


module.exports = function({cookie, cookieParser, sessionStore, io}){

	this.getSessionID = function(socket){
		
		let cookies = cookie.parse(socket.request.headers.cookie);

		return cookieParser.signedCookie(cookies['session.sid'], 'ADb-CDE-pODs');		
	}

	this.getSessionStore = (socket) => {
	
		return new Promise((resolve, reject) => {

			let sessionID = this.getSessionID(socket);

		    sessionStore.get(sessionID, (err, session) => {
		        resolve(session)
		    });
		})
	};

	this.sessionStoreDestroy = (socket) => {

		let sessionID = this.getSessionID(socket);

        sessionStore.destroy(sessionID, (err, session) => {
            console.log('DELETE SESSION')
        });
	}

	let sessStoreProcesses = {
		getSessionStore: this.getSessionStore,
		sessionStoreDestroy: this.sessionStoreDestroy,
	}

	new TestConnect(io, sessStoreProcesses);
}