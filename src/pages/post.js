module.exports = function(req, res, swig, database, querystring, id, parseCookie, userinfo) {
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/post.html")
		
		database.get("select * from subforums where id=?", [id], function(a, b){
			if(typeof a === "object" && a !== null || b === undefined) {
				res.write("Subforum not found")
				res.end()
			} else {
				var output = tmp(Object.assign({
					subforum_name: b.name,
					logged_in: userinfo.loggedin
				}, userinfo));
				res.write(output)
				res.end()
			}
		})
	}
	if(method == "post") {
		if(userinfo.loggedin){
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
					var consolas = data.consolas;
					if(consolas == "false") {
						consolas = 0;
					} else if(consolas == "true") {
						consolas = 1
					} else {
						consolas = 0;
					}
					database.get("select count(*) as cnt from threads where subforum=?", [id], function(a,cnt){
						database.run("insert into threads values(null, ?, ?, ?, ?, ?, 0, null, ?, ?)", [id, data.title, data.body, Date.now(), userinfo.user_id, consolas, parseInt(cnt.cnt)+1], function(a,b) {
							database.get("select post_count from subforums where id=?", [id], function(a,b){
								database.run("update subforums set post_count=? where id=?", [parseInt(b.post_count)+1, id], function(a,b){
									database.run("update users set posts = posts + 1 where id=?", [userinfo.user_id], function(a,b){
										res.write("thread/" + this.lastID)
										res.end()
									})
								})
							})
						})
					})
				});
			}
		} else {
			res.end("You need to be logged in")
		}
	}
}