var threadsPerPage = 30;

module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var postsPerPage = vars.postsPerPage;

    var id = urlSegmentIndex(req.url, 1);

	var page = 1;
	
	id = id.split("/")
	if(typeof id == "object" && id.length == 1){
		id = id[0]
	}
	if(typeof id == "object" && id.length > 1){
		page = id[1];
		id = id[0];
	}
    
    var tmp = swig.compileFile("./frontend/templates/sf.html")
		
    var b = await db.get("select * from forums where id=?", id)
    if(!b) {
        return serve("Forum not found")
    }

    var f_g = await db.get("select * from forum_groups where id=?", b.forum_group)
    var sfName = b.name;
    var cnt = await db.get("select count(*) as cnt from threads where forum=? and type=0 and deleted=0 order by _order desc", id)
    var pageCount = Math.ceil(cnt.cnt / threadsPerPage)
    var pg = page - 5
    if(pg < 0) {
        pg = 0
    }
    if(!pageCount) pageCount = 1
    var pagebar = {
        dddA: false,
        pages: [],
        dddB: false,
        a: pageCount-2,
        b: pageCount-1,
        c: pageCount,
        path: "/sf/" + id,
        page: page,
        threadcount: cnt.cnt,
        pagebarVisible: true,
        pageCount: pageCount,
        nextPage: (parseInt(page)+1).toString(),
        prevPage: (parseInt(page)-1).toString()
    }
    if(pageCount <= 1) {
        pagebar.pagebarVisible = false
    }
    
    var min = 1 + pg
    var max = 10 + pg
    if(max > pageCount){
        max = pageCount
        min = pageCount-9
        if(min < 1) {
            min = 1
        }
    }
    
    if(min >= 4) {
        pagebar.dddA = true
    }
    for(var i = min; i <= max; i++){
        pagebar.pages.push(i)
    }
    if(pageCount - max >= 4){
        pagebar.dddB = true
    }
    
    var b = await db.all("select * from threads where forum=? and type=0 and deleted=0 order by _order desc limit ?,?", [id, (page-1)*threadsPerPage, threadsPerPage])
    var threads = [];
    for(i in b) {
        threads.push({
            id: b[i].id,
            title: b[i].title,
            postedby: "",
            userid: b[i].user,
            views: b[i].views,
            read: false,
            mini_page_bar: false,
            mini_page_bar_pages: [],
            total_pages: 1,
            replies: 0
        })
    }

    for(var i = 0; i < threads.length; i++) {
        if(userinfo.logged_in){
            var v = await db.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, threads[i].id])
            var totalPosts = await db.get("select count(*) as cnt from threads where thread=?", threads[i].id)
            var totalPages = Math.ceil(totalPosts.cnt/postsPerPage)
            threads[i].total_pages = totalPages
            threads[i].replies = (totalPosts.cnt-1)
            if(v) {
                threads[i].read = true;
            }
            threads[i].postedby = (await db.get("SELECT username FROM users WHERE id=?", [threads[i].userid])).username;
            if(totalPages > 1) {
                threads[i].mini_page_bar = true
                
                var pages = []

                if(totalPages <= 5) {
                    for(var i = 1; i <= totalPages; i++){
                        pages.push(i)
                    }
                } else {
                    pages.push(1,2,3)
                    var total = totalPages - 5;
                    if(total > 3) total = 3
                    pages.push("...")
                    for(var i = 0; i < total; i++){
                        pages.push((totalPages-total+1)+i)
                    }
                }

                threads[i].mini_page_bar_pages = pages;
            }
        }
    }

    var max_readAll_id = null;
    if(userinfo.logged_in) {
        var range = await db.get("select max_readAll_id as id from views where user=? and type=2 and forum_id=?", [userinfo.user_id, id])
        if(range) {
            max_readAll_id = range.id
        }
    }
    
    if(max_readAll_id) {
        for(i in threads){
            var tid = threads[i].id
            if(tid <= max_readAll_id) {
                threads[i].read = true
            }
        }
    }
    if(userinfo.logged_in) {
        var cont = await db.get("select * from views where user=? and type=1 and forum_id=?", [userinfo.user_id, id])
        if(!cont) {
            await db.run("insert into views values(?, ?, 1, null, null, ?, null)", [userinfo.user_id, Date.now(), id])
        }
    }
    var output = tmp(Object.assign({
        forum_id: id,
        forum_name: sfName,
        threads: threads,
        pagebar: pagebar,
        f_g: f_g
    }, userinfo));
    
    serve(output)
}

module.exports.POST = async function(req, serve, vars, evars) {
    var data = evars.pdata;
    var db = vars.db;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var userinfo = evars.userinfo;
    var res = evars.res;

    var id = urlSegmentIndex(req.url, 1);
    /*
        views types:
        0: Post views
        1: Forum views
        2: Range of threads marked as read in forums
        3: Inbox messages viewed
    */
    if(data.command == "mark_all_as_read" && userinfo.logged_in) {
        var b = await db.get("select name from forums where id=?", id)
        if(!b) {
            return serve();
        } else {
            var b = await db.get("select * from views where user=? and type=2 and forum_id=?", [userinfo.user_id, id])
            if(!b) {
                await db.run("insert into views values(?, ?, 2, (select id from threads where forum = ? order by id desc limit 1), null, ?, null)", [userinfo.user_id, Date.now(), id, id])
                
                await db.run("delete from views where user=? and type=0 and forum_id=?", [userinfo.user_id, id])
                res.writeHead(302, {
                    "Location": req.url
                })
                return serve();
            } else {
                await db.run("update views set date=?, max_readAll_id=(select id from threads where forum = ? order by id desc limit 1) where user=? and type=2 and forum_id=?", [Date.now(), id, userinfo.user_id, id])
                
                await db.run("delete from views where user=? and type=0 and forum_id=?", [userinfo.user_id, id])
                res.writeHead(302, {
                    "Location": req.url
                })
                return serve();
            }
        }
    }
    return serve();
}