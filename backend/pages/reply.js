module.exports.GET = async function(req, serve, vars, evars) {
    var db = vars.db;
    var swig = vars.swig;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var userinfo = evars.userinfo;

    if(!userinfo.logged_in) return serve("Not logged in");

    var thread;
    
    var id = urlSegmentIndex(req.url, 1);
	
	var post = await db.get("select * from threads where id=? and deleted=0", id)
	if(post){
		thread = post
	} else {
		return serve("Cannot reply to non-existant thread")
	}
	

	var tmp = swig.compileFile("./frontend/templates/reply.html")
    
    var b = await db.get("select * from forums where id=?", thread.forum)
    if(typeof a === "object" && a !== null || b === undefined) {
        return serve("Forum not found")
    } else {
        var f_g = await db.get("select * from forum_groups where id=?", b.forum_group)
        var data = {
            forum_name: b.name,
            logged_in: userinfo.logged_in,
            thread_title: thread.title,
            reply_title: "",
            cancel_url: "/thread/" + thread.thread,
            f_g: f_g
        }
        data.reply_title = thread.title
        if(!(data.reply_title.startsWith("RE: "))) {
            data.reply_title = "RE: " + data.reply_title
        }
        var output = tmp(Object.assign(data, userinfo));
        serve(output)
    }
}

module.exports.POST = async function(req, serve, vars, evars) {
    var data = evars.pdata;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var querystring = vars.querystring;
    var res = evars.res;

    var id = urlSegmentIndex(req.url, 1);

    if(!userinfo.logged_in) return serve("Not logged in");

    var post = await db.get("select * from threads where id=? and deleted=0", id);
	if(post) {
		thread = post
	} else {
		return serve("Cannot reply to non-existant thread")
    }
    
    if(data.command == "post_reply") {
        var args = querystring.parse(decodeURIComponent(data.arguments))
        var consolas = args.consolas;
        if(consolas == "false") {
            consolas = 0;
        } else if(consolas == "true") {
            consolas = 1
        } else {
            consolas = 0;
        }
        var ins = await db.run("insert into threads values(null, ?, ?, ?, ?, ?, 1, ?, ?, ?, null, 0, null)", [thread.forum, args.title, args.body, Date.now(), userinfo.user_id, id, thread.thread, consolas])
        var reply_id = ins.lastID
        
        await db.run("update users set posts = posts + 1 where id=?", userinfo.user_id)
        
        await db.run("update threads set _order = (select _order+1 as ord from threads where forum=(select forum from threads where id=?) and type = 0 order by _order desc limit 1) where id=? and type=0", [id, id])
        
        await db.run("update forums set post_count=post_count+1 where id=?", thread.forum)
        res.writeHead(302, {
            "Location": "/thread/" + thread.thread + "#" + reply_id
        })
        return serve();
    }
    return serve("Invalid command")
}