function getNowTimeFormat(date = null){

    let time = date || new Date();
                
    var options = {  
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    };

    return time.toLocaleDateString('tr-TR', options);
}