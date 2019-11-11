module.exports.GET = async function(req, serve, vars, evars, params) {
    var db = vars.db;
    var userinfo = evars.userinfo;
    var swig = vars.swig;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var date_created = vars.date_created;
    var joindate_label = vars.joindate_label;
    var online_users = vars.online_users;
    var postsPerPage = vars.postsPerPage;
    var res = evars.res;

    if(!params) params = {};
    var displayMode = params.displayMode;
    var change = params.change;
    var sortOrder = params.sortOrder;

    var id = urlSegmentIndex(req.url, 1);

    var cookie = userinfo.cookie
	if(cookie.displayMode && !change) {
		displayMode = 1
	}
    id=id.toString()
    
    var page = 1;

    id = id.split("/")
    if(typeof id == "object" && id.length == 1){
        id = id[0]
    }
    if(typeof id == "object" && id.length > 1){
        page = id[1];
        id = id[0];
    }
    if(!page || page == ""){
        page = 1
    }
    
    var tmp = swig.compileFile("./frontend/templates/thread.html")
    
    var b = await db.get("select * from threads where id=? and deleted = 0", id)
    if(!b) {
        serve("Thread not found")
        return
    }
    var tracked = await db.get("select * from tracking where thread=? and user=?", [id, userinfo.user_id])
    
    var f_g = await db.get("select * from forum_groups where id=(select forum_group from forums where id=?)", b.forum)
    
    var next_thread_id;
    var prev_thread_id;
    
    var next = await db.get("select * from threads where forum = ? and type = 0 and deleted = 0 and _order < ? order by _order desc limit 1", [b.forum, b._order])
    
    if(!next) {
        next_thread_id = id
    } else {
        next_thread_id = next.id
    }
    
    var prev = await db.get("select * from threads where forum = ? and type = 0 and deleted = 0 and _order > ? order by _order limit 1", [b.forum, b._order])
    
    if(!prev) {
        prev_thread_id = id
    } else {
        prev_thread_id = prev.id
    }
    /*
        thread type:
        0 = thread,
        1 = reply to thread
    */
    if(b.type == 0){
        await db.run("update threads set views=views+1 where id=?", id)
        if(userinfo.logged_in) {
            var cont = await db.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, id])
            if(cont === void 0) {
                await db.run("insert into views values(?, ?, 0, null, ?, ?, null)", [userinfo.user_id, Date.now(), id, b.forum])
            } else {
                await db.run("update views set date=? where user=? and post_id=? and type=0", [Date.now(), userinfo.user_id, id])
            }
        }
    }
    var alternate = 0;
    if(/*b.type == 0*/true){
        
        var sf = await db.get("select name from forums where id=?", b.forum)
            
        if(!displayMode){
            var posts = []
            
            var threadPost = {
                username: b.user,
                title: b.title,
                post_date: date_created(b.date_created),
                body: escapeBody(b.body),
                replyurl: "/reply/" + id,
                postcount: 0,
                consolas: !!b.font,
                moderator: false,
                id: b.id,
                type: 0,
                redir: JSON.stringify("/sf/" + b.forum),
                joindate: 0,
                userid: b.user,
                alternate: alternate,
                online: !!online_users[b.user]
            }
            
            if(page == 1) {
                posts.push(threadPost)
                alternate++
                if(userinfo.top_rank){
                    posts[0].moderator = true
                }
            }
            
            var post_sort_order_text = ""
            
            if(sortOrder) {
                post_sort_order_text = " order by date_created desc"
            }
            
            
            var tempThreadTotalPosts = postsPerPage
            var postStartingPoint = (page-1)*postsPerPage
            if(page == 1) {
                tempThreadTotalPosts--
            } else {
                postStartingPoint--
            }
            
            var cnt = await db.get("select count(*) as cnt from threads where thread=? and deleted = 0", id)
            
            var replies = await db.all("select * from threads where type=1 and thread=? and deleted = 0" + post_sort_order_text + " limit ?,?", [id, postStartingPoint, tempThreadTotalPosts]) // includes a string (post_sort_order_text)
            
            for(i in replies){
                posts.push({
                    username: replies[i].user,
                    title: replies[i].title,
                    post_date: date_created(replies[i].date_created),
                    body: escapeBody(replies[i].body),
                    replyurl: "/reply/" + replies[i].id,
                    postcount: 0,
                    consolas: !!replies[i].font,
                    moderator: userinfo.top_rank,
                    id: replies[i].id,
                    type: 1,
                    redir: "\"\"",
                    joindate: 0,
                    userid: replies[i].user,
                    alternate: alternate,
                    online: !!online_users[replies[i].user]
                })
                alternate++
                alternate %= 2
            }
            
            var pageCount = Math.ceil(cnt.cnt / postsPerPage)
            
            var pg = page - 5
            if(pg < 0) {
                pg = 0
            }
            
            var pagebar = {
                dddA: false,
                pages: [],
                dddB: false,
                a: pageCount-2,
                b: pageCount-1,
                c: pageCount,
                path: "/thread/" + b.id,
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
            
            var usernames = [];
            var postcounts = [];
            var joindates = []
            
            for(var i = 0; i < posts.length; i++) {
                var usr = await db.get("select * from users where id=?", posts[i].username)
                usernames.push(usr.username)
                postcounts.push(usr.posts)
                joindates.push(usr.date_joined)
            }

            for(i in usernames){
                posts[i].username = usernames[i]
                posts[i].postcount = postcounts[i]
                posts[i].joindate = joindate_label(joindates[i])
            }
            var output = tmp(Object.assign({
                forum_name: sf.name,
                thread_title: b.title,
                posts: posts,
                nextThread: next_thread_id,
                prevThread: prev_thread_id,
                displayMode: displayMode,
                sortOrder: sortOrder,
                pagebar: pagebar,
                f_g: f_g,
                tracked: tracked
            }, userinfo));
            
            ThreadedCookie(res, displayMode, cookie)
            serve(output)
        } else {// threaded mode
            var posts = []
            var paths = [[b.id]]
            var tree = {
                id: b.id,
                path: [b.id],
                title: b.title,
                body: b.body,
                children: [],
                user: b.user,
                post_date: date_created(b.date_created),
                children_count: 0
            }
            var level = 3;
            /*
                levels (threshold):
                
                1: tree (thread)
                2: replies to tree
                3+: replies to replies (done automatically)
            */
            var childs = await db.all("select * from threads where type = 1 and deleted=0 and parent=?", b.id)
            for(var i in childs){
                tree.children_count++
                tree.children.push({
                    id: childs[i].id,
                    children: [],
                    title: childs[i].title,
                    body: childs[i].body,
                    path: tree.path.concat(childs[i].id),
                    user: childs[i].user,
                    post_date: date_created(childs[i].date_created),
                    children_count: 0
                })
                paths.push(tree.path.concat(childs[i].id))
            }
            

            while(true) {
                var latest = []
                var found = false;
                for(var i in paths) {
                    var length = paths[i].length
                    if(length === level-1) {
                        latest.push(paths[i])
                        found = true
                    }
                }
                if(found) {
                    for(var i = 0; i < latest.length; i++) {
                        var chd = await db.all("select * from threads where type=1 and deleted=0 and parent=?", latest[i][latest[i].length-1])
                        if(chd.length > 0) {
                            for(c in chd) {
                                var par = navigate(tree, latest[i])
                                par.children_count++
                                par.children.push({
                                    id: chd[c].id,
                                    path: latest[i].concat(chd[c].id),
                                    title: chd[c].title,
                                    body: chd[c].body,
                                    children: [],
                                    user: chd[c].user,
                                    post_date: date_created(chd[c].date_created)
                                })
                                paths.push(latest[i].concat(chd[c].id))
                            }
                        }
                        if(i + 1 >= latest.length) {
                            level++;
                        }
                    }
                } else {
                    break;
                }
            }
                
            var max_threshold = 0

            var sorted = sort_comment_paths(paths)
            
            var PostIndex = 0;
            
            var lastThreshold = 0
            
            for(i in sorted){
                var d = sorted[i].length - 1
                d *= 50
                var data = navigate(tree, sorted[i])
                
                var parent = data.path
                if(parent.length === 1) {
                    parent = 0
                } else {
                    parent = parent[parent.length-2]
                }
                var TH = sorted[i].length - 1
                if(TH > max_threshold) {
                    max_threshold = TH
                }
                var end_slash_div = ""
                
                if(lastThreshold >= TH) {
                    var difference = (lastThreshold - TH) + 1
                    
                    if(i == 0) {
                        difference--
                    }
                    
                    for(var q = 0; q < difference; q++){
                        end_slash_div += "</div>"
                    }
                }
                
                posts.push({
                    indent: d,
                    title: data.title,
                    body: escapeBody(data.body),
                    reply_url: "/reply/" + data.id,
                    id: data.id,
                    parent: parent,
                    threshold: TH,
                    index: PostIndex,
                    user: data.user,
                    username: "",
                    post_date: data.post_date,
                    children_count: data.children_count,
                    end_slash_div: end_slash_div
                })
                PostIndex++
                lastThreshold = TH
            }
            
            var remaining_end_slash_div = ""
            for(var r = 0; r < lastThreshold + 1; r++){ // + 1 for the current post
                remaining_end_slash_div += "</div>"
            }

            for(var i = 0; i < posts.length; i++) {
                var username = await db.get("select username from users where id=?", posts[i].user)
                posts[i].username = username.username;
            }

            var output = tmp(Object.assign({
                forum_name: sf.name,
                thread_title: b.title,
                posts: 0,
                nextThread: 0,
                prevThread: 0,
                displayMode: displayMode,
                posts: posts,
                max_threshold: max_threshold,
                sortOrder: sortOrder,
                f_g: f_g,
                tracked: tracked,
                remaining_end_slash_div: remaining_end_slash_div
            }, userinfo));
            ThreadedCookie(res, displayMode, cookie)
            serve(output)
        }
    } else {
        //return module.exports.GET(req, serve, vars, evars, params);
    }
}

module.exports.DELETE = async function(req, serve, vars, evars) {
    var urlSegmentIndex = vars.urlSegmentIndex;
    var db = vars.db;
    var userinfo = evars.userinfo;
    
    var id = urlSegmentIndex(req.url, 1);
    if(userinfo.top_rank){
        var b = await db.get("select * from threads where id=? and deleted = 0", id)
        if(!b){
            serve();
            return
        }
        var forum = b.forum
        var userid = b.user
        await db.run("update threads set deleted = 1 where id=?", b.id)
        if(b.type === 0){
            await db.run("update forums set thread_count=thread_count-1 where id=?", forum)
            await db.run("update forums set post_count=post_count-1 where id=?", forum)
        } else if(b.type === 1) {
            await db.run("update forums set post_count=post_count-1 where id=?", forum)
        }
        
        await db.run("update users set posts=posts-1 where id=?", userid)
        serve()
    } else {
        serve()
    }
}

module.exports.POST = async function(req, serve, vars, evars) {
    var querystring = vars.querystring;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var res = evars.res;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var data = evars.pdata;
    
    var id = urlSegmentIndex(req.url, 1);
    if(data.command == "") {
        var sortOrder = 0; // 0 = oldest to newest
        if(data.sortOrder == "newest_to_oldest") {
            sortOrder = 1 // 1 = newest to oldest
        }
        if(data.displayMode == "threaded") {
            return await module.exports.GET(req, serve, vars, evars, {
                displayMode: 1, change: 1, sortOrder
            });
        } else {
            return await module.exports.GET(req, serve, vars, evars, {
                change: 1, sortOrder
            });
        }
    } else if(data.command == "track_thread") {
        if(userinfo.logged_in) {
            var thread = await db.get("select * from threads where id=?", id)
            if(thread){
                var tracked = await db.get("select * from tracking where user=? and thread=?", [userinfo.user_id, id])
                var args = querystring.parse(decodeURIComponent(data.arguments))
                if(args.tracking == "true") {
                    if(!tracked) {
                        await db.run("insert into tracking values(?, ?, ?)", [userinfo.user_id, id, Date.now()])
                        res.writeHead(302, {
                            "Location": req.url
                        });
                        return serve();
                    }
                } else if(args.tracking == "false") {
                    if(tracked) {
                        await db.run("delete from tracking where thread=? and user=?", [id, userinfo.user_id])
                        res.writeHead(302, {
                            "Location": req.url
                        })
                    }
                    return serve();
                }
            }
        }
    }
    return serve();
}

function escapeBody(body){
	return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n/g, "<br>").replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;")
}

function navigate(nav, path) {
	for(var i = 1; i < path.length; i++){
		var ch = nav.children;
		if(!ch) {
			return false
		} else {
			for(z in ch){
				if(ch[z].id == path[i]) {
					nav = ch[z]
					break
				}
			}
		}
	}
	return nav
}

function ThreadedCookie(res, displayMode, cookie) {
	if(displayMode == 1) {
		if(cookie.displayMode !== 1){
			res.writeHead(200, {
				"Set-Cookie": "displayMode=" + displayMode + "; expires=" + cookieExpireDate(Date.now() + (1000*60*60*24*365)) + ";"
			})
		}
	} else {
		if(cookie.displayMode !== undefined) {
			res.writeHead(200, {
				"Set-Cookie": "displayMode=; expires=" + cookieExpireDate(0) + ";"
			})
		}
	}
}

function cookieExpireDate(timestamp) {
	var dayWeekList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	var monthList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	var _DayOfWeek = dayWeekList[new Date(timestamp).getDay()];
	var _Day = new Date(timestamp).getDate();
	var _Month = monthList[new Date(timestamp).getMonth()];
	var _Year = new Date(timestamp).getFullYear();
	var _Hour = new Date(timestamp).getHours();
	var _Minute = new Date(timestamp).getMinutes();
	var _Second = new Date(timestamp).getSeconds();

	var compile = _DayOfWeek + ", " + _Day + " " + _Month + " " + _Year + " " + _Hour + ":" + _Minute + ":" + _Second + " UTC";
	return compile
}

function comparePaths(a,b) {
	for(var i = 0, total = Math.max(a.length, b.length); i < total; i++){
		var c1 = a[i]
		var c2 = b[i]
		if(c1 === undefined) {
			return "<" // a < b
		}
		if(c2 === undefined) {
			return ">" // a > b
		}
		if(c1 > c2) {
			return ">" // a > b
		}
		if(c1 < c2) {
			return "<" // a < b
		}
	}
	return "=" // a = b
}

function sort_comment_paths(list) { // Looks like selection sort
	var newList = []
	
	var least = list[0];
	for(var i = 0; i < list.length; i++){
		if(comparePaths(list[i], least) == "<") {
			least = list[i]
		}
	}
	
	var current = least
	newList.push(current)
	for(var i = 0; i < list.length; i++){
		var lst = current
		var changes = false;
		for(var t = 0; t < list.length; t++){
			if(comparePaths(list[t], current) == ">") {
				if(!(changes && comparePaths(list[t], lst) == ">")) {
					lst = list[t]
					changes = true
				}
			}
		}
		if(changes) {
			current = lst
			newList.push(current)
		}
	}
	return newList
}