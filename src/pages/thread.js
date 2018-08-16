function escapeBody(body){
	return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n/g, "<br>").replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;")
}

var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
var _data_ago = ["minute", "hour", "day", "month", "year"]
function joindate_label(timestamp){
	timestamp = parseInt(timestamp)
	timestamp = new Date(timestamp)
	
	var mth = Month[timestamp.getMonth()]
	var day = ("0" + timestamp.getDate()).slice(-2)
	var yer = timestamp.getFullYear()
	
	
	return mth + " " + day + ", " + yer
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
		res.writeHead(200, {
			"Set-Cookie": "displayMode=" + displayMode + "; expires=" + cookieExpireDate(Date.now() + (1000*60*60*24*365)) + ";"
		})
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

var postsPerPage = 30;

module.exports = function(req, res, swig, database, id, parseCookie, userinfo, date_created, querystring, online_users, displayMode, change, sortOrder) {
	var cookie = userinfo.cookie
	if(cookie.displayMode && !change) {
		displayMode = 1
	}
	id=id.toString()
	var method = req.method.toLowerCase()
	if(method == "get"){
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
		
		var tmp = swig.compileFile("./src/html/thread.html")
		
		database.get("select * from threads where id=? and deleted = 0", [id], function(a, b){
			if(typeof a === "object" && a !== null || b === undefined) {
				res.write("Thread not found")
				res.end()
			} else {
				var next_thread_id;
				var prev_thread_id;
				
				database.get("select * from threads where forum = ? and type = 0 and deleted = 0 and _order < ? order by _order desc limit 1", [b.forum, b._order], function(a,next){
					if(!next) {
						next_thread_id = id
					} else {
						next_thread_id = next.id
					}
					database.get("select * from threads where forum = ? and type = 0 and deleted = 0 and _order > ? order by _order limit 1", [b.forum, b._order], function(a, prev){
						if(!prev) {
							prev_thread_id = id
						} else {
							prev_thread_id = prev.id
						}
						if(b.type == 0){
							database.run("update threads set views=views+1 where id=?",[id],function(){
								if(userinfo.loggedin) {
									database.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, id], function(er,cont){
										if(er || !cont) {
											database.run("insert into views values(?, ?, 0, null, ?, ?)", [userinfo.user_id, Date.now(), id, b.forum], function(){
												threadPage()
											})
										} else {
											database.run("update views set date=? where user=? and post_id=? and type=0", [Date.now(), userinfo.user_id, id], function(){
												threadPage()
											})
										}
									})
								} else {
									threadPage()
								}
							})
						} else {
							threadPage()
						}
					})
				})
				
				var alternate = 0;
				
				
				function threadPage(){
					if(b.type == 0){
						database.get("select name from forums where id=?", [b.forum], function(err, sf){
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
									owner: false,
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
									if(b.user == userinfo.user_id){
										posts[0].owner = true
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
								
								database.get("select count(*) as cnt from threads where thread=? and deleted = 0", [id], function(er, cnt){
									database.all("select * from threads where type=1 and thread=? and deleted = 0" + post_sort_order_text + " limit ?,?", [id, postStartingPoint, tempThreadTotalPosts], function(a,replies){ // includes a string (post_sort_order_text)
										for(i in replies){
											var owner = replies[i].user == userinfo.user_id
											posts.push({
												username: replies[i].user,
												title: replies[i].title,
												post_date: date_created(replies[i].date_created),
												body: escapeBody(replies[i].body),
												replyurl: "/reply/" + replies[i].id,
												postcount: 0,
												consolas: !!replies[i].font,
												owner: owner,
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
										var indx = 0;
										function getall(){
											database.get("select * from users where id=?", [posts[indx].username], function(a,usr){
												indx++;
												usernames.push(usr.username)
												postcounts.push(usr.posts)
												joindates.push(usr.date_joined)
												if(posts.length > indx){
													getall()
												} else {
													complete()
												}
											})
										}
										if(posts.length > 0){
											getall()
										} else {
											complete()
										}
										function complete(){
											for(i in usernames){
												posts[i].username = usernames[i]
												posts[i].postcount = postcounts[i]
												posts[i].joindate = joindate_label(joindates[i])
											}
											var output = tmp(Object.assign({
												forum_name: sf.name,
												logged_in: userinfo.loggedin,
												thread_title: b.title,
												posts: posts,
												nextThread: next_thread_id,
												prevThread: prev_thread_id,
												displayMode: displayMode,
												sortOrder: sortOrder,
												pagebar: pagebar
											}, userinfo));
											
											ThreadedCookie(res, displayMode, cookie)
											res.write(output)
											res.end()
										}
									})
								})
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
								database.all("select * from threads where type = 1 and deleted=0 and parent=?", [b.id], function(e, childs){
									for(i in childs){
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
									
									
									function tree_data(){
										var latest = []
										var found = false;
										for(i in paths){
											var length = paths[i].length
											if(length === level-1) {
												latest.push(paths[i])
												found = true
											}
										}
										if(found){
											var index = 0
											function step(){
												database.all("select * from threads where type=1 and deleted=0 and parent=?", [latest[index][latest[index].length-1]], function(e, chd) {
													if(chd.length > 0){
														for(c in chd){
															var par = navigate(tree, latest[index])
															par.children_count++
															par.children.push({
																id: chd[c].id,
																path: latest[index].concat(chd[c].id),
																title: chd[c].title,
																body: chd[c].body,
																children: [],
																user: chd[c].user,
																post_date: date_created(chd[c].date_created)
															})
															paths.push(latest[index].concat(chd[c].id))
														}
													}
													
													
													index++;
													if(index >= latest.length) {
														level++
														tree_data()
													} else {
														step()
													}
												})
											}
											step()
										} else {
											_cont()
										}
									}
									tree_data()
									
								})
								var max_threshold = 0
								function _cont(){
									var dumped = []
									function dmp(tr) {
										dumped.push(tr.path)
										for(i in tr.children){
											dmp(tr.children[i])
										}
									}
									dmp(tree)
									var PostIndex = 0;
									for(i in dumped){
										var d = dumped[i].length - 1
										d *= 50
										var data = navigate(tree, dumped[i])
										
										var parent = data.path
										if(parent.length === 1) {
											parent = 0
										} else {
											parent = parent[parent.length-2]
										}
										var TH = dumped[i].length - 1
										if(TH > max_threshold) {
											max_threshold = TH
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
											children_count: data.children_count
										})
										PostIndex++
									}
									var usernameIndex = 0;
									function usernameStep(){
										database.get("select username from users where id=?", [posts[usernameIndex].user], function(e, username){
											posts[usernameIndex].username = username.username;
											usernameIndex++;
											if(usernameIndex >= posts.length) {
												usernameFinished()
											} else {
												usernameStep()
											}
										})
									}
									usernameStep()
									function usernameFinished(){
										var output = tmp(Object.assign({
											forum_name: sf.name,
											logged_in: userinfo.loggedin,
											thread_title: b.title,
											posts: 0,
											nextThread: 0,
											prevThread: 0,
											displayMode: displayMode,
											posts: posts,
											max_threshold: max_threshold,
											sortOrder: sortOrder
										}, userinfo));
										ThreadedCookie(res, displayMode, cookie)
										res.write(output)
										res.end()
									}
								}
								
							}
						})
					} else {
						module.exports(req, res, swig, database, b.thread, parseCookie, userinfo, date_created, querystring, online_users, undefined, undefined, 0)
					}
				}
			}
		})
	}
	if(method == "delete"){
		database.get("select * from threads where id=? and deleted = 0", [id], function(a, b){
			if(!b){
				res.end()
				return
			}
			if(userinfo.user_id == b.user) {
				var forum = b.forum
				var userid = b.user
				database.run("update threads set deleted = 1 where id=?", [b.id], function(){
					if(b.type === 0){
						database.run("update forums set thread_count=thread_count-1 where id=?", [forum], function(){
							complete()
						})
					} else if(b.type === 1) {
						database.run("update forums set post_count=post_count-1 where id=?", [forum], function(){
							complete()
						})
					} else {
						complete()
					}
					
					function complete(){
						database.run("update users set posts=posts-1 where id=?",[userid], function(){
							res.end()
						})
					}
				})
			} else {
				res.end()
			}
		})
	}
	if(method == "post"){
		var queryData = "";
		var error = false;
		req.on('data', function(data) {
            queryData += data;
            if (queryData.length > 1000000) {
                queryData = "";
				res.end("")
                error = true
                req.connection.destroy();
            }
        });
		if(!error){
			req.on('end', function(){
				var data = querystring.parse(queryData)
				var sortOrder = 0; // 0 = oldest to newest
				if(data.sortOrder == "newest_to_oldest") {
					sortOrder = 1 // 1 = newest to oldest
				}
				if(data.displayMode == "threaded") {
					module.exports({method: "GET"}, res, swig, database, id, parseCookie, userinfo, date_created, querystring, online_users, 1, 1, sortOrder)
				} else {
					module.exports({method: "GET"}, res, swig, database, id, parseCookie, userinfo, date_created, querystring, online_users, undefined, 1, sortOrder)
				}
			});
		}
	}
}