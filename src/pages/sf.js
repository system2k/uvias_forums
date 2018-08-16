var threadsPerPage = 30;

module.exports = async function(req, res, id, userinfo) {
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
		
		var b = await get("select * from forums where id=?", id)
		if(b === undefined) {
			res.write("Forum not found")
			res.end()
		} else {
			var f_g = await get("select * from forum_groups where id=?", b.forum_group)
			var sfName = b.name;
			var cnt = await get("select count(*) as cnt from threads where forum=? and type=0 and deleted=0 order by _order desc", id)
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
			
			var b = await all("select * from threads where forum=? and type=0 and deleted=0 order by _order desc limit ?,?", [id, (page-1)*threadsPerPage, threadsPerPage])
			var threads = [];
			for(i in b){
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
			var usernames = [];
			var indx = 0;
			var threadViews = []
			async function getall(){
				var b = await get("select username from users where id=?", threads[indx].userid)
				var viewed = false;
				if(userinfo.logged_in){
					var v = await get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, threads[indx].id])
					var totalPosts = await get("select count(*) as cnt from threads where thread=?", threads[indx].id)
					var totalPages = Math.ceil(totalPosts.cnt/postsPerPage)
					threads[indx].total_pages = totalPages
					threads[indx].replies = (totalPosts.cnt-1)
					if(totalPages > 1) {
						threads[indx].mini_page_bar = true
						
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

						threads[indx].mini_page_bar_pages = pages;
					}
					viewed = v
					cont()
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
			}
			if(threads.length > 0){
				getall()
			} else {
				complete()
			}
			var max_readAll_id = null;
			async function complete() {
				if(userinfo.logged_in) {
					var range = await get("select max_readAll_id as id from views where user=? and type=2 and forum_id=?", [userinfo.user_id, id])
					if(range) {
						max_readAll_id = range.id
						serve()
					} else {
						serve()
					}
				} else {
					serve()
				}
			}
			async function serve() {
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
				if(userinfo.logged_in) {
					var cont = await get("select * from views where user=? and type=1 and forum_id=?", [userinfo.user_id, id])
					if(!cont) {
						await run("insert into views values(?, ?, 1, null, null, ?, null)", [userinfo.user_id, Date.now(), id])
						renderForums()
					} else {
						await run("update views set date=? where user=? and forum_id=? and type=1", [Date.now(), userinfo.user_id, id])
						renderForums()
					}
				} else {
					renderForums()
				}
			}
			function renderForums(){
				for(var i = 0; i < usernames.length; i++){
					threads[i].postedby = usernames[i]
				}
				var output = tmp(Object.assign({
					forum_id: id,
					forum_name: sfName,
					threads: threads,
					pagebar: pagebar,
					f_g: f_g
				}, userinfo));
				
				res.write(output)
				res.end()
			}
		}
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
				1: Forum views
				2: Range of threads marked as read in forums
				3: Inbox messages viewed
			*/
			req.on('end', async function(){
				var data = querystring.parse(queryData)
				if(data.command == "mark_all_as_read" && userinfo.logged_in) {
					var b = await get("select name from forums where id=?", id)
					if(!b) {
						res.end()
					} else {
						var b = await get("select * from views where user=? and type=2 and forum_id=?", [userinfo.user_id, id])
						if(!b) {
							await run("insert into views values(?, ?, 2, (select id from threads where forum = ? order by id desc limit 1), null, ?, null)", [userinfo.user_id, Date.now(), id, id])
							
							await run("delete from views where user=? and type=0 and forum_id=?", [userinfo.user_id, id])
							res.writeHead(302, {
								"Location": req.url
							})
							res.end()
						} else {
							await run("update views set date=?, max_readAll_id=(select id from threads where forum = ? order by id desc limit 1) where user=? and type=2 and forum_id=?", [Date.now(), id, userinfo.user_id, id])
							
							await run("delete from views where user=? and type=0 and forum_id=?", [userinfo.user_id, id])
							res.writeHead(302, {
								"Location": req.url
							})
							res.end()
						}
					}
				} else {
					res.end()
				}
			});
		}
	}
}