var threadsPerPage = 30;

module.exports = function(req, res, swig, database, id, parseCookie, userinfo, querystring) {
	var method = req.method.toLowerCase()
	var page = 1;
	
	id = id.split("/")
	if(typeof id == "object" && id.length == 1){
		id = id[0]
	}
	if(typeof id == "object" && id.length > 1){
		page = id[1];
		id = id[0];
	}
	if(method == "get") {
		var tmp = swig.compileFile("./src/html/sf.html")
		
		database.get("select name from subforums where id=?", [id], function(a, b){
			if(typeof a === "object" && a !== null || b === undefined) {
				res.write("Subforum not found")
				res.end()
			} else {
				var sfName = b.name;
				database.get("select count(*) as cnt from threads where subforum=? and type=0 and deleted=0 order by _order desc", [id], function(a, cnt){
					var pageCount = Math.ceil(cnt.cnt / threadsPerPage)
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
					
					database.all("select * from threads where subforum=? and type=0 and deleted=0 order by _order desc limit ?,?", [id, (page-1)*threadsPerPage, threadsPerPage], function(a, b){
						var threads = [];
						for(i in b){
							threads.push({
								id: b[i].id,
								title: b[i].title,
								postedby: "",
								userid: b[i].user,
								views: b[i].views,
								read: false
							})
						}
						var usernames = [];
						var indx = 0;
						var threadViews = []
						function getall(){
							database.get("select username from users where id=?", [threads[indx].userid], function(a,b){
								var viewed = false;
								if(userinfo.loggedin){
									database.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, threads[indx].id], function(a, v){
										viewed = v
										cont()
									})
								} else {
									cont()
								}
								function cont(){
									if(viewed) {
										threadViews.push(indx)
									}
									indx++;
									usernames.push(b.username)
									if(threads.length > indx){
										getall()
									} else {
										complete()
									}
								}
							})
						}
						if(threads.length > 0){
							getall()
						} else {
							complete()
						}
						var max_readAll_id = null;
						function complete() {
							if(userinfo.loggedin) {
								database.get("select max_readAll_id as id from views where user=? and type=2 and subforum_id=?", [userinfo.user_id, id], function(a,range){
									if(range) {
										max_readAll_id = range.id
										serve()
									} else {
										serve()
									}
								})
							} else {
								serve()
							}
						}
						function serve() {
							for(i in threadViews){
								threads[threadViews[i]].read = true
							}
							if(max_readAll_id) {
								for(i in threads){
									var tid = threads[i].id
									if(tid <= max_readAll_id) {
										threads[i].read = true
									}
								}
							}
							if(userinfo.loggedin) {
								database.get("select * from views where user=? and type=1 and subforum_id=?", [userinfo.user_id, id], function(er,cont){
									if(er || !cont) {
										database.run("insert into views values(?, ?, 1, null, null, ?)", [userinfo.user_id, Date.now(), id], function(){
											renderSubforums()
										})
									} else {
										database.run("update views set date=? where user=? and subforum_id=? and type=1", [Date.now(), userinfo.user_id, id], function(){
											renderSubforums()
										})
									}
								})
							} else {
								renderSubforums()
							}
						}
						function renderSubforums(){
							for(var i = 0; i < usernames.length; i++){
								threads[i].postedby = usernames[i]
							}
							var output = tmp(Object.assign({
								subforum_id: id,
								subforum_name: sfName,
								threads: threads,
								logged_in: userinfo.loggedin,
								pagebar: pagebar
							}, userinfo));
							
							res.write(output)
							res.end()
						}
					})
				})
			}
		})
	}
	if(method == "post") {
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
			/*
				views types:
				0: Post views
				1: Subforum views
				2: Range of threads marked as read in subforums
			*/
			req.on('end', function(){
				var data = querystring.parse(queryData)
				if(data.command == "mark_all_as_read" && userinfo.loggedin) {
					database.get("select name from subforums where id=?", [id], function(a, b){
						if(a || !b) {
							res.end()
						} else {
							database.get("select * from views where user=? and type=2 and subforum_id=?", [userinfo.user_id, id], function(a,b){
								if(a || !b) {
									database.run("insert into views values(?, ?, 2, (select id from threads where subforum = ? order by id desc limit 1), null, ?)", [userinfo.user_id, Date.now(), id, id], function(){
										database.run("delete from views where user=? and type=0 and subforum_id=?", [userinfo.user_id, id], function(){
											res.writeHead(302, {
												"Location": req.url
											})
											res.end()
										})
									})
								} else {
									database.run("update views set date=?, max_readAll_id=(select id from threads where subforum = ? order by id desc limit 1) where user=? and type=2 and subforum_id=?", [Date.now(), id, userinfo.user_id, id], function(){
										database.run("delete from views where user=? and type=0 and subforum_id=?", [userinfo.user_id, id], function(){
											res.writeHead(302, {
												"Location": req.url
											})
											res.end()
										})
									})
								}
							})
						}
					})
				} else {
					res.end()
				}
			});
		}
	}
}