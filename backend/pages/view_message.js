module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var userinfo = evars.userinfo;
    var db = vars.db;
    var urlSegmentIndex = vars.urlSegmentIndex;

    var id = urlSegmentIndex(req.url, 1);

    if(!userinfo.logged_in) {
        return serve("Not logged in");
    }
    var message = await db.get("select * from messages where id=?", id)
    if(message){
        if(message.to_id == userinfo.user_id) {
            var tmp = swig.compileFile("./frontend/templates/view_message.html")
            
            var from_user;
            
            var u = await db.get("select * from users where id=?", message.from_id)
            var view = await db.get("select * from views where message_id=? and type = 3", message.id)
            if(!view) {
                await db.run("insert into views values(?, ?, 3, null, null, null, ?)", [userinfo.user_id, Date.now(), message.id])
            }
            
            from_user = u;
            
            var output = tmp(Object.assign({
                username: userinfo.username,
                from_user: from_user,
                subject: message.subject,
                body: message.body
            }, userinfo));
            return serve(output)
        } else {
            return serve("You do not have permission")
        }
    }
    serve();
}