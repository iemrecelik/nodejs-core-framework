// var socket = io.connect('http://localhost:3000');
const socket = io('/chats')

function sendMsg(elem, e){
	
	let event  = e.which || e.keyCode;
	let msg = $(elem).val();

	if(event === 13){
		socket.emit('takeMsg', {msg: msg});
		$('div.cheatInput').append(`<p>${msg}</p>`);
		$(elem).val('');
	}
}

$(document).ready(function() {

	socket.on('sendMsg', (data) => {
		console.log(data.msg);
		$('div.cheatInput').append(`<p>${data.msg}</p>`);
	})
})