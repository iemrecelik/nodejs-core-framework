// var socket = io.connect('http://localhost:3000');
const socket = io('/chats')
    , peer = {};

var camStream;

$(document).ready(function() {

    socket.on('disconnect', (reason) => {
        $('html').html('Bağlantınız koptu lütfen sayfayı yenileyiniz.');
    });

    /*Convert unicode emoticons to twitter emoji start*/
    let el = document.querySelector("div.tab-content");

    twemoji.parse(el, {
        size: 16,
        folder:"/public/plugins/twemoji/72x72",
        ext:".png",
        base:""
    });
    /*Convert unicode emoticons to twitter emoji end*/

    /* Send message start */
    var msgVal;
    let test = $("#send-msg-text").emojioneArea({
        pickerPosition: "top",
        filtersPosition: "top",
        tonesStyle: "bullet",
        events: {
            /**
             * @param {jQuery} editor EmojioneArea input
             * @param {Event} event jQuery Event object
             */
            keydown: function (editor, event) {
                msgVal = test[0].emojioneArea.getText();
            },
            /**
             * @param {jQuery} editor EmojioneArea input
             * @param {Event} event jQuery Event object
             */
            keyup: function (editor, event) {
                
                if (test[0].emojioneArea.getText() === msgVal) {

                    let userName = $('#send-msg-text').attr('data-user');
                    let avatarSrc = $('#send-msg-text').attr('data-avatar');

                    sendMessage(userName, avatarSrc, editor, event, msgVal);
                }
            }
        },
    });
    /* Send message end */

    socket.on('offUser', function(data){
        
        let userName = data.replace(/\s/g, '_');

        $('div.online-users ul li div.list-group-item-heading[data-user="'+userName+'"]').closest('li').remove();
    });

    socket.on('onUser', function(data){

        let roomName = data.roomName.replace(/\s/g, '_');
        let userName = data.user.name.replace(/\s/g, '_');
        let onlUsrEl =  `div.online-users ul[data-room="${roomName}"]
                        li div.list-group-item-heading[data-user="${userName}"]`;

        if( $(onlUsrEl).length < 1 ) {
            let html = 
            `<li class="list-group-item media">
                <div class="pull-left">
                    <img src="${data.user.avatar}" alt="" class="img-avatar">
                </div>
                <div class="media-body">
                        <div class="list-group-item-heading"
                        data-user="${userName}" ondblclick="privateMsg(this)">
                            ${data.user.name}
                        </div>
                    <small class="list-group-item-text c-gray">${data.user.loginTime}</small>
                </div>
            </li>`

            let roomUlHtml = `div.online-users ul[data-room="${roomName}"]`;
            
            if($(roomUlHtml).length > 0){
                $(roomUlHtml).append(html);
            }else{
                html = `<ul class="list-group hidden" data-room="{roomName}">${html}</ul>`;
                $('div.online-users').append(html);
                showUsers(roomName);
            } 
        }// if onlUsrEl length end

        
    });

    /* Room and User info popover start*/

    $('div.active-rooms > a, div.online-users > a').popover({
        // trigger: 'hover',
        trigger: 'manual',
        html: true,
    }).popover('show');
    /* Room and User info popover end*/

    /*Enter room start*/
    $('div.active-rooms span.room').dblclick(function(event) {

        socket.emit('enterRoom', {
            roomName: $(this).html()
        });

        socket.off('roomIndex');
        enterRoom(socket);

    });
    /*Enter room end*/

    /*Levae room start*/
    socket.on('leftRoom', function (data) {

        let jointName = data.replace(/\s/g, '_');
        $('#'+jointName).remove();
        $('.online-users ul[data-room="'+jointName+'"]').remove();
        $('ul[role="tablist"] li a[aria-controls="'+jointName+'"]').closest('li').remove();
    });
    /*Levae room end*/

    /*update users count in room start*/
    socket.on('roomCount', function (data) {
        console.log('roomCount: ', data);
        let roomName;

        data.forEach(function(rmCountVal, index){
            console.log(rmCountVal);
            roomName = rmCountVal._id.replace(/\s/g, '_');
            $('.active-rooms ul li[data-room="'+roomName+'"] span.badge').html(rmCountVal.count);
            console.log($('.active-rooms ul li[data-room="'+roomName+'"] span.badge').html());
        });

    });

    /* take message start */
    socket.on('takeMsg', function(data){

        let roomName = data.roomName.replace(/\s/g, '_');

        var html = `<div class="message-feed right">
                        <div class="pull-right">
                            <img src="${data.user.avatar}" alt="" class="img-avatar">
                            <p>${data.user.name}</p>
                        </div>
                        <div class="media-body">
                            <div class="mf-content">
                                ${twemoji.parse(data.msg)}
                            </div>
                            <small class="mf-date"><i class="fa fa-clock-o"></i> ${data.msgSendTime}</small>
                        </div>
                    </div>`

        $('#'+roomName).append(html);
    });
    /* take message end */

    /* auto scroll to bottom start */
    $('div.tab-content').bind("DOMSubtreeModified",function(){
        $('div.tab-content').animate({scrollTop: $('div.tab-content').prop("scrollHeight")}, 500);        
    });
    /* auto scroll to bottom end */

    /* update user login time start */
    socket.on('updateOnlUsrTime', function(data){

        data.forEach(function(item, index){

            $('.online-users .media-body div.list-group-item-heading[data-user="'+item.userName+'"]')
                .closest('div.media-body')
                .find('small')
                .html(item.loginTime);
            
        });
        
    });
    /* update user login time end */

    /*Take private message start*/
    takePrivateMsg();
    /*Take private message end*/

    /*Take request camera start*/
    takeReqCamera();
    /*Take request camera end*/

    /*answer request camera start*/
    answerReqCamera();
    /*answer request camera end*/

    /*socket error message start*/
    socketErrorMsg();
    /*socket error message end*/

});//document ready end

function showUsers(roomName){
    $(`div.online-users ul[data-room="${roomName}"]`).removeClass('hidden').addClass('show');
    $(`div.online-users ul:not(ul[data-room="${roomName}"])`).removeClass('show').addClass('hidden');
}

function hidePopover(el){
    $(el).closest('div.popover').closest('div').popover('hide');
}

function enterRoom(socket){

    socket.once('roomIndex', function(data) {
        console.log(data);
        let roomName = data.roomName.replace(/\s/g, '_');
        let userName;
        let userItem;

        if (data.usrInRmData.length > 0) {
            var html = '';
            data.usrInRmData.forEach(function(userRmItem, index) {
                userName = userRmItem.userName.replace(/\s/g, '_');
                userItem = userRmItem.userJoin[0];

                html += `<li class="list-group-item media">
                            <div class="pull-left">
                                <img src="${ userItem.avatar }" alt="" class="img-avatar">
                            </div>
                            <div class="media-body">
                                <div class="list-group-item-heading"
                                data-user="${userName}" ondblclick="privateMsg(this)">
                                    ${userRmItem.userName}
                                </div>
                                <small class="list-group-item-text c-gray">${userItem.loginTime}</small>
                            </div>
                        </li>`;
            });

            html = '<ul class="list-group hidden" data-room="'+roomName+'">'+html+'</ul>';

            $('div.online-users').append(html);
        }else{
            $('div.online-users').append('<ul class="list-group hidden" data-room="'+roomName+'"></ul>');
        } //if end

        html =  `<li role="presentation">
                    <a href="#${roomName}" onclick="showUsers(\'${roomName}\')"
                    aria-controls="${roomName}" role="tab" data-toggle="tab">
                        ${data.roomName}
                    </a>
                    <span class="close-tab-icon" aria-hidden="true" 
                    data-roomName="${data.roomName}" onclick="leaveRoom(this)">&times;</span>
                </li>`;

        $('ul.nav-tabs[role = "tablist"]').append(html);


        html =  `<div role="tabpanel" class="tab-pane" 
                id="${roomName}" data-index="${data.roomId}">
                </div>`;

        $('div.tab-content').append(html);

        $('ul.nav-tabs[role = "tablist"] li:last a').tab('show');
        showUsers(roomName);

    }); //socket.on roomIndex end
}


/*send to message users in room start*/
function sendMessage(userName, avatarSrc, el, event, msg){
    
    if (event.which == 13) {

        var roomName = $('li.active[role="presentation"] span.close-tab-icon').attr('data-roomName');

        if(msg !== '') {
            
            socket.emit('msgReply', {
                'roomName': roomName,
                'msg': msg,
            });
            let jointRoomName = roomName.replace(/\s/g, '_');
            
            var html = `<div class="message-feed media">
                            <div class="pull-left">
                                <img src="${avatarSrc}" alt="" class="img-avatar">
                                <p>${userName}</p>
                            </div>
                            <div class="media-body">
                                <div class="mf-content">
                                    ${twemoji.parse(msg)}
                                </div>
                                <small class="mf-date">
                                    <i class="fa fa-clock-o"></i> ${getNowTimeFormat()}
                                </small>
                            </div>
                        </div>`;

            $('#'+jointRoomName).append(html);

            $(el).text('');    
        }//if end
        
    }
}
/*send to message users in room end*/

function leaveRoom(el){

    var roomName = $(el).attr('data-roomName');

    socket.emit('leaveRoom', roomName );
}

/*Private Message start*/
function privateMsg(el){
    
    let userName = $(el).attr('data-user');

    if ( $('#fr'+userName).length < 1 ) {
        openPrivateDialog(userName);
    }// if end
    
}
/*Private Message end*/

/*Send private message start*/
function sendPrivateMsg(userName, el, event){

    if (event.which == 13 && $(el).val() !== '') {

        socket.emit('sendPrivateMsg', {
            'userName': userName.replace(/_/g, ' '),
            'msg': $(el).val(),
        });

        $(el).val('');
    }
}
/*Send private message end*/

/*Take private message start*/
function takePrivateMsg (){

    socket.on('takePrivateMsg', async function(data){

        // let userName = data.userName.replace(/\s/g, '_');
        let id = data.id.replace(/\s/g, '_');

        if ( $('#fr'+id).length < 1 && typeof data.selfMsg !== 'undefined' ) {
            await openPrivateDialog(id);
        }

        let html;

        if(data.selfMsg === true){
            html = `<li class="right clearfix">
                        <span class="chat-img pull-right">
                            <img src="${data.avatar}" alt="User Avatar" class="img-circle" />
                        </span>
                        <div class="chat-body clearfix">
                            <div class="header">
                                <small class=" text-muted"><span class="glyphicon glyphicon-time"></span>${data.time}</small>
                                <strong class="pull-right primary-font">${data.userName}</strong>
                            </div>
                            <div class="pull-right">
                                <p>${data.msg}</p>
                            </div>
                        </div>
                    </li>`
        }else{
            html = `<li class="left clearfix">
                        <span class="chat-img pull-left">
                            <img src="${data.avatar}" alt="User Avatar" class="img-circle" />
                        </span>
                        <div class="chat-body clearfix">
                            <div class="header">
                                <strong class="primary-font">${data.userName}</strong> 
                                <small class="pull-right text-muted">
                                    <span class="glyphicon glyphicon-time"></span>${data.time}</small>
                            </div>
                            <p>${data.msg}</p>
                        </div>
                    </li>`
        }

        $('#fr'+id).find('ul.chat').append(html);
    
    });
}
/*Take private message end*/

/*Open private message dialog start*/
async function openPrivateDialog(userName){

    await new Promise((resolve, reject) => {
        $.post('chats/private-dialog-snippet', {userName: userName}, function(data, textStatus, xhr) {
            $('#messages-main').append(data);
            resolve()
        });
    });

    $( '#fr'+userName ).dialog({
        minWidth: 415,
        minHeight: 302,
        dialogClass: 'auto-height chat-style',
        resize: function( event, ui ) {

            let hg = $(this).height();

            $(this).find('.panel-body').css('max-height', (hg-58)+'px');
           
        },
        create: function( event, ui ) {

            $(this).parent('.chat-style').prepend(`
                <div class="camera-preview" style="display:none">
                    <div class="camera-title-btns">
                        <button type="button" onclick="sendReqCamera('${userName}')"
                        class="btn btn-primary btn-xs">
                            Send request camera
                        </button>
                        <button type="button" onclick="closeCamera(this)"
                        class="btn btn-primary btn-xs pull-right">
                            <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
                        </button>
                    </div>
                    <div class="myself-camera">
                        <video autoplay></video>
                    </div> 
                    <div class="itself-camera">
                        <video autoplay></video>
                    </div> 
                </div>
            `);

            $(this).find('div.panel-body').bind("DOMSubtreeModified",function(){

                $(this).animate({scrollTop: $(this).prop("scrollHeight")}, 500);        
            });

            $(this).parent('.chat-style')
                .find('.ui-dialog-titlebar')
                .prepend('<span class="glyphicon glyphicon-comment pull-left"></span> ');

            $(this).parent('.chat-style').find('.ui-dialog-titlebar .ui-dialog-title').addClass('pull-left');

            let dropdownHtml = `
                <div class="btn-group chat-minimal-menu pull-right">
                    <button type="button" class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown">
                        <span class="glyphicon glyphicon-chevron-down"></span>
                    </button>
                    <ul class="dropdown-menu slidedown">
                        <li onclick="showCamera(this)">
                            <a href="javascript:void(0)"><span class="glyphicon glyphicon-facetime-video">
                            </span> Camera</a>
                        </li>
                        <li onclick="refreshConn()">
                            <a href="javascript:void(0)"><span class="glyphicon glyphicon-refresh">
                            </span> Refresh</a>
                        </li>
                        <li class="divider"></li>
                        <li onclick="">
                            <a href="javascript:void(0)"><span class="glyphicon glyphicon-off">
                            </span> Sign Out</a>
                        </li>
                    </ul>
                </div>`

            $(this).parent('.chat-style').find('.ui-dialog-titlebar .ui-dialog-titlebar-close').before(dropdownHtml);
        },
        close: function( event, ui ) {
            $(this).dialog( "destroy" );
            $(this).remove();
            
            if(peer[userName] !== undefined)
                peer[userName].peer.destroy();
        }
    });
}
/*Open private message dialog end*/

function showCamera(elem){

    $(elem).closest('.chat-style').find('.camera-preview').show();

    console.log('showCamera');
    
}

function sendReqCamera(userName){

    console.log('sendReqCamera');

    socket.emit('sendReqCamera', {userName: userName})
    
}

function takeReqCamera(){
    
    socket.on('reqCamera', async (data) => {

        console.log('reqCamera');

        let reqUserName = data.reqUserName.replace(/\s/g, '_');
        let dialogClassName = '#fr'+reqUserName;

        if ( $(dialogClassName).length < 1 )
            await openPrivateDialog(reqUserName);

        html = `<li class="left clearfix">
                    <div class="clearfix">
                        <div class="header">
                            <strong class="primary-font">${data.reqUserName}</strong> 
                            <small class="pull-right text-muted">
                                <span class="glyphicon glyphicon-time"></span>12 mins ago</small>
                        </div>
                        <p>
                            ${data.reqUserName} adlı kullanıcı kamera açma isteği gönderdi.<br/>
                            
                            <button class="btn btn-primary btn-sm" 
                            onclick="sendAnswerReqCamera(true, '${data.reqUserName}', this)">Accept</button>
                            
                            <button class="btn btn-primary btn-sm" 
                            onclick="sendAnswerReqCamera(false, '${data.reqUserName}', this)">Reject</button>
                        </p>
                    </div>
                </li>`;

        $(dialogClassName).find('ul.chat').append(html);

        $(dialogClassName).closest('.chat-style').find('.camera-preview').show();

    });
}

function answerReqCamera(){
    
    acceptAnswer();

    rejectAnswer();
}
//sender
function acceptAnswer(){

    socket.on('accReqCamera', async (data) => {
        console.log('accept camera :', data)

        if (!SimplePeer.WEBRTC_SUPPORT)
            alert('webrtc no support!')

        
        let receiveUserName = data.receiveUserName.replace(/\s/g, '_');

        await createPeerAndControl(receiveUserName, false);

        peer[receiveUserName].peer.on('signal', (data) => {

            peer[receiveUserName].signal = JSON.stringify(data);

            socket.emit('sendReceiveSignal', {
                receiveUserName: receiveUserName,
                peerConnSignal: peer[receiveUserName].signal
            });

        });

        console.log(peer)
        console.log(data)

        peer[receiveUserName].peer.signal(JSON.parse(data.peerConnSignal));
    })

    socket.on('takeReceiveSignal', (data) => {
        
        let reqUserName = data.reqUserName.replace(/\s/g, '_');

        peer[reqUserName].peer.signal(JSON.parse(data.peerConnSignal));
    })
}

function rejectAnswer(){

    socket.on('rejReqCamera', (data) => {

        let userName = data.userName.replace(/\s/g, '_');
        let dialogClassName = '#fr'+userName;
        
        console.log('reject camera', data)

        html = `<li class="left clearfix">
                    <div class="clearfix">
                        <div class="header">
                            <strong class="primary-font">${data.userName}</strong> 
                            <small class="pull-right text-muted">
                                <span class="glyphicon glyphicon-time"></span>12 mins ago</small>
                        </div>
                        <p>
                            ${data.userName} adlı kullanıcı kamera açma isteğinizi kabul etmedi.<br/>
                        </p>
                    </div>
                </li>`;

        $(dialogClassName).find('ul.chat').append(html);
    })
}
//receive
async function sendAnswerReqCamera(answer, reqUserName = null, elem){
    
    $(elem).parent('p').append('<span class="text-success">İstek gönderildi.</span>').find('button').remove();

    let answerData = {answer: answer, reqUserName: reqUserName};

    if(answer){

        if (!SimplePeer.WEBRTC_SUPPORT)
            alert('webrtc no support!')

        await createPeerAndControl(reqUserName, true);

        let rgUsNm = reqUserName.replace(/\s/g, '_')

        answerData.peerConnSignal = peer[rgUsNm].signal;
    }
    
    socket.emit('answerToReq', answerData);
}

async function createPeerAndControl(userName, initiator = false, constraints = null){

    if(peer[userName] === undefined){

        peer[userName] = {};

        if(camStream)
            await gotMedia(camStream, userName, initiator);
        else
            await createMedia(userName, initiator, constraints);
    }
}

function createMedia(userName, initiator = false, constraints = null){

    return new Promise((resolve, reject) => {

        if(constraints === null)
            constraints = { audio: true, video: { width: 180, height: 135}};

        navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {

            camStream = stream;

            await gotMedia(camStream, userName, initiator);

            resolve();
        })
        .catch(async (err) => {

            console.log(err.name + ": " + err.message);
            await createPeerConn(userName, initiator);
            resolve()
        });    
    });
}

async function gotMedia (stream, userName, initiator = false) {

    userName = userName.replace(/\s/g, '_');

    await createPeerConn(userName, initiator, stream)

    let videoMySelf = $('#fr'+userName)
        .parent()
        .find('div.camera-preview div.myself-camera video')
        .attr('controls', true)[0];

    videoPlay(videoMySelf, stream);
}

async function createPeerConn(userName, initiator = false, stream = null){
    
    peer[userName] = {};

    if(stream)
        peer[userName].peer = new SimplePeer({ initiator: initiator, trickle: false, stream: stream })
    else
        peer[userName].peer = new SimplePeer({ initiator: initiator, trickle: false })

    if(initiator)
        await cameraOnSignal(userName);

    // if(!stream){
        peer[userName].peer.on('stream', (stream) => {
        
            let videoItSelf = $('#fr'+userName)
                .parent()
                .find('div.camera-preview div.itself-camera video')
                .attr('controls', true)[0];

            videoPlay(videoItSelf, stream);
        })
    // }

    peer[userName].peer.on('close', function () {
        console.log(peer);
        socket.emit('delPeerSignal', {signal: peer[userName].signal});
        delete peer[userName];
        console.log('PEER CLOSED');
        console.log(peer);
    })
}

function cameraOnSignal(userName){

    return new Promise((resolve, reject) => {

        peer[userName].peer.on('signal', (data) => {
            
            peer[userName].signal = JSON.stringify(data);

            resolve()
        })
    });
}

function videoPlay(video, stream){

    // Older browsers may not have srcObject
    if ("srcObject" in video) {
        video.srcObject = stream;
    } else {
        // Avoid using this in new browsers, as it is going away.
        video.src = window.URL.createObjectURL(stream);
    }
    video.onloadedmetadata = function(e) {
        video.play();
    };
}

function socketErrorMsg(){
    
    socket.on('socketErrorMsg', (data) => {

        let userName = data.userName.replace(/\s/g, '_');
        let dialogClassName = '#fr'+userName;

        html = `<li class="left clearfix">
                    <div class="clearfix">
                        <div class="header">
                            <strong class="primary-font">${data.userName}</strong> 
                            <small class="pull-right text-muted">
                                <span class="glyphicon glyphicon-time"></span>12 mins ago</small>
                        </div>
                        <p>
                            ${data.msg}<br/>
                        </p>
                    </div>
                </li>`;

        $(dialogClassName).find('ul.chat').append(html);
    })
}

function closeCamera(elem){
    
    $(elem).closest('.chat-style').find('.camera-preview').hide();

    console.log('closeCamera');
}

function refreshConn(){
    console.log('refrshConn');
}