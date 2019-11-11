module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var userinfo = evars.userinfo;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var db = vars.db;
    var userinfo = evars.userinfo;

    if(!userinfo.logged_in) return serve("Not logged in")
	
    var tmp = swig.compileFile("./frontend/templates/post.html")
    
    var id = urlSegmentIndex(req.url, 1);
    
    var b = await db.get("select * from forums where id=?", id)
    if(typeof a === "object" && a !== null || b === undefined) {
        return serve("Forum not found")
    } else {
        var f_g = await db.get("select * from forum_groups where id=?", b.forum_group)
        var output = tmp(Object.assign({
            forum_name: b.name,
            cancel_url: "/sf/" + id,
            f_g: f_g
        }, userinfo));
        serve(output)
    }
}

module.exports.POST = async function(req, serve, vars, evars) {
    var data = evars.pdata;
    var userinfo = evars.userinfo;
    var db = vars.db;
    var res = evars.res;
    var querystring = vars.querystring;
    var urlSegmentIndex = vars.urlSegmentIndex;

    if(!userinfo.logged_in) return serve("Not logged in")

    var id = urlSegmentIndex(req.url, 1);

    if(data.command == "post_thread") {
        var args = querystring.parse(decodeURIComponent(data.arguments))
        var consolas = args.consolas;
        if(consolas == "false") {
            consolas = 0;
        } else if(consolas == "true") {
            consolas = 1
        } else {
            consolas = 0;
        }
        var cnt = await db.get("select count(*) as cnt from threads where forum=?", id)
        
        var ins_thread = await db.run("insert into threads values(null, ?, ?, ?, ?, ?, 0, null, (select count(*)+1 from threads), ?, ?, 0, 0)", [id, args.title, args.body, Date.now(), userinfo.user_id, consolas, parseInt(cnt.cnt)+1])
        
        var b = await db.get("select thread_count from forums where id=?", id)
        
        await db.run("update forums set thread_count=? where id=?", [parseInt(b.thread_count)+1, id])
        
        await db.run("update users set posts = posts + 1 where id=?", userinfo.user_id)
        
        await db.run("update forums set post_count=post_count+1 where id=?", id)
        res.writeHead(302, {
            "Location": "/thread/" + ins_thread.lastID
        })
        return serve();
    }
    return serve("Invalid command")
}