module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var date_created = vars.date_created;
    var userinfo = evars.userinfo;
	
    var tmp = swig.compileFile("./frontend/templates/admin.html")
    
    var b = await db.all("select * from forums")
    var forums = []
    for(var i in b){
        forums.push({
            id: b[i].id,
            name: b[i].name,
            desc: b[i].desc,
            date_created: date_created(b[i].date_created),
            thread_count: b[i].thread_count,
            post_count: b[i].post_count,
            _order: b[i]._order
        })
    }
    var output = tmp(Object.assign({
        forums: forums,
        forum_count: forums.length
    }, userinfo));
    serve(output)
}

module.exports.POST = async function(req, serve, vars, evars) {
    var data = evars.pdata;
    var db = vars.db;
    var querystring = vars.querystring;
    var res = evars.res;

    if(data.newforums){
        var sfs = JSON.parse(data.newforums)

        for(var i = 0; i < sfs.length; i++) {
            var b = await db.get("SELECT COUNT(*) AS cnt FROM forums")
            await db.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", [sfs[i][0], sfs[i][1], Date.now(), parseInt(b.cnt)+1])
        }
        return serve();
    } else if(data.editedsfs) {
        var edits = JSON.parse(data.editedsfs)

        for(var i = 0; i < edits.length; i++) {
            await db.run("UPDATE forums SET name=?, desc=?,_order=? WHERE id=?", [edits[i][1], edits[i][2], edits[i][3], edits[i][0]])
        }
        return serve();
    } else if(data.command) {
        var args = querystring.parse(decodeURIComponent(data.arguments))
        if(data.command == "update_announcement") {
            var chg = args.changes
            cache_data.announcement = chg
            await db.run("UPDATE info SET data=? WHERE name='announcement'", chg)
            res.writeHead(302, {
                "Location": "/admin/editannouncement"
            })
            return serve();
        } else if(data.command == "create_forum") {
            var name = args.name
            var desc = args.desc
            var forum_group = args.forum_group
            
            await db.run("insert into forums values(null, ?, ?, ?, ?, ?, (SELECT (CASE WHEN EXISTS(SELECT id from forums where forum_group=? limit 1) THEN (select _order from forums where forum_group=? order by _order desc limit 1) ELSE 0 END)+1 as ord), ?)", [name, desc, Date.now(), 0, 0, forum_group, forum_group, forum_group])
            res.writeHead(302, {
                "Location": "/"
            })
            return serve();
            
        } else if(data.command == "update_forum_group") {
            var name = args.name
            var id = args.id
            var f_g = await db.get("select * from forum_groups where id=?", id)
            if(f_g){
                await db.run("update forum_groups set name=? where id=?", [name, id])
                res.writeHead(302, {
                    "Location": req.headers.referer
                })
            }
            return serve()
            
        } else if(data.command == "create_forum_group") {
            var name = args.name
            await db.run("insert into forum_groups values(null, ?, ?, (select _order+1 from forum_groups order by _order desc limit 1))", [name, Date.now()])
            res.writeHead(302, {
                "Location": "/"
            })
            return serve();
            
        } else if(data.command == "update_forum") {
            var name = args.name
            var desc = args.desc
            var id = args.id
            var forum_group = args.forum_group
            await db.run("update forums set name=?, desc=?, forum_group=?, _order=(SELECT (CASE WHEN EXISTS(SELECT id from forums where forum_group=? limit 1) THEN (select _order from forums where forum_group=? order by _order desc limit 1) ELSE 0 END)+1 as ord) where id=?", [name, desc, forum_group, forum_group, forum_group, id])
            res.writeHead(302, {
                "Location": "/admin/editforums"
            })
            return serve()
            
        } else if(data.command == "delete_forum") {
            var id = args.id
            await db.run("delete from forums where id=?", id)
            res.writeHead(302, {
                "Location": "/admin/editforums"
            })
            return serve();
        
        }
    }
    return serve();
}