var threadsPerPage = 30;

module.exports = function(req, res, swig, database, id, parseCookie, userinfo) {
	var tmp = swig.compileFile("./src/html/sf.html")
	var page = 1;
	
	id = id.split("/")
	if(typeof id == "object" && id.length == 1){
		id = id[0]
	}
	if(typeof id == "object" && id.length > 1){
		page = id[1];
		id = id[0];
	}
	
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
							userid: b[i].user
						})
					}
					var usernames = [];
					var indx = 0;
					function getall(){
						database.get("select username from users where id=?", [threads[indx].userid], function(a,b){
							indx++;
							usernames.push(b.username)
							if(threads.length > indx){
								getall()
							} else {
								complete()
							}
						})
					}
					if(threads.length > 0){
						getall()
					} else {
						complete()
					}
					function complete(){
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