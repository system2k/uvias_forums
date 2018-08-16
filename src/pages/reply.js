module.exports = function(req, res, id, userinfo){
	if(userinfo.logged_in == false){
		res.end("You need to be logged in")
		return
	}
	var thread;
	
	database.get("select * from threads where id=? and deleted=0", [id], function(a, post){
		if(post){
			thread = post
			thread_retrieved()
		} else {
			res.end("Cannot reply to non-existant thread")
		}
	})
	
	
	var method = req.method.toLowerCase()
	
	function thread_retrieved(){
		if(method == "get"){
			var tmp = swig.compileFile("./src/html/reply.html")
			
			database.get("select * from forums where id=?", [thread.forum], function(a, b){
				if(typeof a === "object" && a !== null || b === undefined) {
					res.write("Forum not found")
					res.end()
				} else {
					database.get("select * from forum_groups where id=?", b.forum_group, function(e, f_g){
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
						res.write(output)
						res.end()
					})
				}
			})
		}
		if(method == "post") {
			if(userinfo.logged_in){
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
							database.run("insert into threads values(null, ?, ?, ?, ?, ?, 1, ?, ?, ?, null, 0, null)", [thread.forum, args.title, args.body, Date.now(), userinfo.user_id, id, thread.thread, consolas], function(a,b) {
								var reply_id = this.lastID
								database.run("update users set posts = posts + 1 where id=?", [userinfo.user_id], function(a,b){
									database.run("update threads set _order = (select _order+1 as ord from threads where forum=(select forum from threads where id=?) and type = 0 order by _order desc limit 1) where id=? and type=0", [id, id], function(){
										database.run("update forums set post_count=post_count+1 where id=?", [thread.forum], function(){
											res.writeHead(302, {
												"Location": "/thread/" + thread.thread + "#" + reply_id
											})
											res.end()
										})
									})
								})
							})
						} else {
							res.end("Invalid command")
						}
					});
				}
			} else {
				res.end("You need to be logged in")
			}
		}
	}
}