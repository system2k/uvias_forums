module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var date_created = vars.date_created
    // logged in
    var tmp = swig.compileFile("./frontend/templates/inbox.html")
    
    var messages = []
    
    /*
        views types:
        0: Post views
        1: Forum views
        2: Range of threads marked as read in forums
        3: Inbox messages viewed
    */
    
    var msgs = await db.all("select * from messages where to_id=? order by id desc", userinfo.user_id)
    for(i in msgs){
        msgs[i].date = date_created(msgs[i].date)
        msgs[i].read = false;
        messages.push(msgs[i])
    }

    for(var i = 0; i < messages.length; i++) {
        var u_id = await db.get("select * from users where id=?", messages[i].from_id)
        messages[i].username = u_id.username
        
        var view = await db.get("select * from views where message_id = ? and type = 3", messages[i].id)
        if(view) {
            messages[i].read = true
        }
    }
    
    var output = tmp(Object.assign({
        username: userinfo.username,
        messages: messages
    }, userinfo));
    serve(output)
}