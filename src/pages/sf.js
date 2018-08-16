module.exports = function(req, res, swig, database, id, parseCookie, userinfo) {
	var tmp = swig.compileFile("./src/html/sf.html")
	
	database.get("select name from subforums where id=?", [id], function(a, b){
		if(typeof a === "object" && a !== null || b === undefined) {
			res.write("Subforum not found")
			res.end()
		} else {
			var sfName = b.name;
			database.all("select * from threads where subforum=? and type=0 order by _order desc", [id], function(a, b){
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
						logged_in: userinfo.loggedin
					}, userinfo));
					
					res.write(output)
					res.end()
				}
			})
		}
	})
}