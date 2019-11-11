module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var urlSegmentIndex = vars.urlSegmentIndex;
    
    if(!userinfo.logged_in) return serve("Not logged in")

    var tmp = swig.compileFile("./frontend/templates/compose_message.html")
    
    var to_user;

    var id = urlSegmentIndex(req.url, 1);
    
    var user = await db.get("select * from users where id=?", id)
    if(user) {
        to_user = user
        
        var output = tmp(Object.assign({
            username: userinfo.username,
            to_user: to_user
        }, userinfo));
        serve(output)
    } else {
        serve();
    }
}

module.exports.POST = async function(req, serve, vars, evars) {
    var data = evars.pdata;
    var userinfo = evars.userinfo;
    var db = vars.db;
    var res = evars.res;
    var querystring = vars.querystring;
    var urlSegmentIndex = vars.urlSegmentIndex;
    // logged in
    if(!userinfo.logged_in) return serve("Not logged in")

    var id = urlSegmentIndex(req.url, 1);

    if(data.command == "send_message") {
        var args = querystring.parse(decodeURIComponent(data.arguments))
        var id = args.id
        var subject = args.subject
        var body = args.body
        
        var user = await db.get("select * from users where id=?", id)
        if(user) {
            await db.run("insert into messages values(null, ?, ?, ?, ?, ?)", [Date.now(), userinfo.user_id, id, subject, body])
            res.writeHead(302, {
                "Location": "/profile/" + id
            })
        }
        return serve();
    }
    return serve("Invalid command")
}